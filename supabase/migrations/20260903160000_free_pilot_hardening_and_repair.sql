-- ==============================================================================
-- Migration: 20260903160000_free_pilot_hardening_and_repair.sql
-- Description: Adversarial review hardening and repairs for Paper English Free Pilot:
--   1. Immutability trigger & revoked UPDATE/DELETE on historical_pilot_admissions
--   2. Hard ceiling check constraint (admission_sequence between 1 and 100)
--   3. Monotonic cutover trigger on enrollment_settings (pilot cannot be reopened)
--   4. Repair admin_release_waitlist_children local state across 100 threshold
--   5. Canonical locked_capacity_count preservation
--   6. Refine claim_due_generation_jobs for strict cutover job boundaries
-- ==============================================================================

-- 1. Hardened check constraint on historical_pilot_admissions (never allow sequence > 100)
alter table private_generation.historical_pilot_admissions
  drop constraint if exists chk_historical_pilot_admissions_seq;

alter table private_generation.historical_pilot_admissions
  add constraint chk_historical_pilot_admissions_seq
  check (admission_sequence >= 1 and admission_sequence <= 100);

-- 2. Ledger immutability trigger: prevent UPDATE and direct DELETE on historical_pilot_admissions
create or replace function private_generation.prevent_pilot_admissions_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'private_generation.historical_pilot_admissions is immutable; UPDATE is prohibited';
  elsif tg_op = 'DELETE' then
    -- If the referenced child still exists, this is an illegal direct deletion on the historical ledger
    if exists (select 1 from public.children where id = old.child_id) then
      raise exception 'Direct DELETE on private_generation.historical_pilot_admissions is prohibited';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_pilot_admissions_mutation
  on private_generation.historical_pilot_admissions;

create trigger trg_prevent_pilot_admissions_mutation
before update or delete on private_generation.historical_pilot_admissions
for each row
execute function private_generation.prevent_pilot_admissions_mutation();

-- Revoke direct mutation privileges from all roles including service_role
revoke update, delete, truncate on table private_generation.historical_pilot_admissions
  from public, anon, authenticated, service_role;

grant select, insert on table private_generation.historical_pilot_admissions
  to service_role;

-- 3. Monotonic cutover invariant trigger on public.enrollment_settings
create or replace function public.prevent_pilot_reopening()
returns trigger
language plpgsql
as $$
begin
  if old.free_pilot_ended_at is not null and (new.free_pilot_ended_at is null or new.free_pilot_enabled = true) then
    if (select count(*) from private_generation.historical_pilot_admissions) >= coalesce(old.free_pilot_historical_limit, 100) then
      raise exception 'Free Pilot has ended and cannot be reopened (monotonic cutover invariant)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_pilot_reopening
  on public.enrollment_settings;

create trigger trg_prevent_pilot_reopening
before update on public.enrollment_settings
for each row
execute function public.prevent_pilot_reopening();

-- 4. Canonical locked_capacity_count:
-- Counts active Paddle (including paused and past_due), active unexpired beta/pilot trialers,
-- released waitlist entries, and active checkout claims. Canceled Paddle and expired beta are excluded.
create or replace function private_generation.locked_capacity_count()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_pilot_ended timestamptz;
begin
  select free_pilot_ended_at into v_pilot_ended
  from public.enrollment_settings
  where key = 'default';

  with occupied_children as (
    -- 1. Active Paddle subscriptions (including paused and past_due; canceled excluded)
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due', 'paused')

    union

    -- 2. Free Pilot active children or unexpired beta trials
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'beta' and sub.status = 'trialing'
      and (
        sub.current_period_end is null
        or sub.current_period_end > now()
      )
      and (
        -- While pilot is active: all unexpired beta children count
        v_pilot_ended is null
        -- When pilot has ended: only children with in-flight unmaterialized jobs or unexpired trial period
        or exists (
          select 1 from public.generation_jobs as job
          where job.child_id = child.id
            and job.created_at <= v_pilot_ended
            and job.status in ('pending', 'claimed')
        )
        or coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()
      )

    union

    -- 3. Released waitlist entries
    select child.id as child_id
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where not child.is_internal_test
      and entry.status = 'released'

    union

    -- 4. Unresolved capacity checkout claims
    select claim.child_id as child_id
    from private_generation.capacity_checkout_claims as claim
    join public.children as child on child.id = claim.child_id
    where not child.is_internal_test
      and (
        (claim.status = 'pending' and claim.reservation_expires_at > now())
        or claim.status in ('bound', 'release_pending')
      )
  )
  select count(distinct child_id)::integer into v_count from occupied_children;
  return coalesce(v_count, 0);
end;
$$;
revoke all on function private_generation.locked_capacity_count() from public, anon, authenticated;
grant execute on function private_generation.locked_capacity_count() to service_role;

-- 5. Repair admin_release_waitlist_children to immediately refresh local settings state across threshold
create or replace function public.admin_release_waitlist_children(p_child_ids uuid[])
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_locked integer;
  v_to_release integer;
  v_released_now integer := 0;
  v_child_id uuid;
  v_child public.children%rowtype;
  v_current_admissions integer;
  v_is_pilot_admitted boolean;
begin
  if p_child_ids is null or array_length(p_child_ids, 1) is null or array_length(p_child_ids, 1) = 0 then
    return 0;
  end if;

  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then raise exception 'Enrollment settings are missing'; end if;

  v_locked := private_generation.locked_capacity_count();

  select count(distinct id)::integer into v_to_release
  from public.waitlist
  where child_id = any(p_child_ids) and status = 'waiting';

  if (v_locked + v_to_release) > settings.capacity then
    raise exception 'Cannot release % children: exceeds available capacity (locked: %, capacity: %)',
      v_to_release, v_locked, settings.capacity;
  end if;

  foreach v_child_id in array p_child_ids loop
    select * into v_child from public.children where id = v_child_id;
    if found and not v_child.is_internal_test then
      v_is_pilot_admitted := exists (
        select 1 from private_generation.historical_pilot_admissions where child_id = v_child_id
      );

      -- If free pilot is active and child not yet admitted, attempt admission
      if not v_is_pilot_admitted and settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true) then
        select count(*)::integer into v_current_admissions
        from private_generation.historical_pilot_admissions;

        if v_current_admissions < settings.free_pilot_historical_limit then
          insert into private_generation.historical_pilot_admissions (
            child_id,
            admission_sequence,
            admitted_at
          ) values (
            v_child_id,
            v_current_admissions + 1,
            now()
          ) on conflict (child_id) do nothing;

          v_is_pilot_admitted := true;

          -- If this was the 100th child, end pilot atomically and update local settings variable
          if v_current_admissions + 1 >= settings.free_pilot_historical_limit then
            update public.enrollment_settings
            set free_pilot_ended_at = now(),
                free_pilot_enabled = false,
                updated_at = now()
            where key = 'default' and free_pilot_ended_at is null;

            -- Crucial repair: update local settings record so subsequent batch iterations see pilot ended
            settings.free_pilot_ended_at := now();
            settings.free_pilot_enabled := false;
          end if;
        end if;
      end if;

      -- Ensure child has a subscription row
      insert into public.subscriptions (
        child_id,
        provider,
        status,
        plan_code,
        billing_interval,
        current_period_end
      ) values (
        v_child_id,
        'beta',
        'trialing',
        'standard_monthly',
        'month',
        case
          when v_is_pilot_admitted then null
          else now() + interval '14 days'
        end
      ) on conflict (child_id) do update set
        current_period_end = case
          when v_is_pilot_admitted and excluded.provider = 'beta' then null
          else public.subscriptions.current_period_end
        end;
    end if;
  end loop;

  with released_rows as (
    update public.waitlist
    set status = 'released', released_at = now(), notification_status = 'pending'
    where child_id = any(p_child_ids) and status = 'waiting'
    returning id
  )
  select count(*)::integer into v_released_now from released_rows;

  return v_released_now;
end;
$$;
revoke all on function public.admin_release_waitlist_children(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_release_waitlist_children(uuid[]) to service_role;

-- 6. Refine claim_due_generation_jobs for strict cutover job boundaries
create or replace function private_generation.claim_due_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_limit integer;
  v_pilot_ended timestamptz;
  v_pilot_enabled boolean;
begin
  if worker_id is null or char_length(worker_id) < 3 then raise exception 'worker_id is required'; end if;
  select least(integer_value, 100) into claim_limit
  from public.operational_settings where key = 'daily_generation_limit';
  if claim_limit is null then raise exception 'daily_generation_limit is not configured'; end if;

  select free_pilot_ended_at, coalesce(free_pilot_enabled, true)
  into v_pilot_ended, v_pilot_enabled
  from public.enrollment_settings
  where key = 'default';

  return query
  with mandatory as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    left join public.subscriptions as subscription on subscription.child_id = child.id
    left join public.generation_test_mode_sessions as test_session on test_session.child_id = child.id and test_session.is_enabled
    where (
      -- 1. Internal test child or test mode session
      child.is_internal_test
      or test_session.child_id is not null
      -- 2. Active Paddle subscription
      or (
        subscription.provider = 'paddle'
        and subscription.status in ('trialing', 'active')
      )
      -- 3. Free Pilot Entitlement:
      --    While pilot active: historically admitted children (or active beta subscription)
      --    After cutover: only jobs created <= free_pilot_ended_at for historically admitted children
      or (
        (
          (v_pilot_ended is null and v_pilot_enabled and (
            exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
            or (subscription.provider = 'beta' and subscription.status in ('trialing', 'active'))
          ))
          or (
            v_pilot_ended is not null
            and job.created_at <= v_pilot_ended
            and exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
          )
        )
      )
      -- 4. Unexpired beta trial (Week 1 only for post-pilot children)
      or (
        subscription.provider = 'beta'
        and subscription.status in ('trialing', 'active')
        and coalesce(subscription.current_period_end, subscription.created_at + interval '14 days') > now()
        and job.source_material_id is null
        and not exists (select 1 from public.materials where child_id = job.child_id)
      )
    )
      and (
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at <= now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and (
            active_submission.status in ('pending', 'processing')
            or (active_submission.status = 'technical_failed' and coalesce(active_submission.error_code, '') <> 'RELEASE_MISMATCH')
          )
      )
      and (
        case
          when (child.is_internal_test or test_session.child_id is not null) then
            (job.source_material_id is null or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
            ))
          else
            (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
                and source_feedback.created_at <= job.feedback_cutoff_at
            ))
        end
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
  ), normal as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    left join public.subscriptions as subscription on subscription.child_id = child.id
    left join public.generation_test_mode_sessions as test_session on test_session.child_id = child.id and test_session.is_enabled
    where (
      child.is_internal_test
      or test_session.child_id is not null
      or (
        subscription.provider = 'paddle'
        and subscription.status in ('trialing', 'active')
      )
      or (
        (
          (v_pilot_ended is null and v_pilot_enabled and (
            exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
            or (subscription.provider = 'beta' and subscription.status in ('trialing', 'active'))
          ))
          or (
            v_pilot_ended is not null
            and job.created_at <= v_pilot_ended
            and exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
          )
        )
      )
      or (
        subscription.provider = 'beta'
        and subscription.status in ('trialing', 'active')
        and coalesce(subscription.current_period_end, subscription.created_at + interval '14 days') > now()
        and job.source_material_id is null
        and not exists (select 1 from public.materials where child_id = job.child_id)
      )
    )
      and (
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at > now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and (
            active_submission.status in ('pending', 'processing')
            or (active_submission.status = 'technical_failed' and coalesce(active_submission.error_code, '') <> 'RELEASE_MISMATCH')
          )
      )
      and (
        case
          when (child.is_internal_test or test_session.child_id is not null) then
            (job.source_material_id is null or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
            ))
          else
            (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
                and source_feedback.created_at <= job.feedback_cutoff_at
            ))
        end
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
    limit greatest(claim_limit - (select count(*)::integer from mandatory), 0)
  ), selected as (
    select id from mandatory union all select id from normal
  )
  update public.generation_jobs as job
  set status = 'claimed', claimed_by = worker_id,
      lease_expires_at = now() + interval '45 minutes',
      attempt_count = job.attempt_count + 1,
      feedback_missing = case
        when exists (select 1 from public.generation_test_mode_sessions s where s.child_id = job.child_id and s.is_enabled)
          or exists (select 1 from public.children c where c.id = job.child_id and c.is_internal_test) then
          (job.source_material_id is not null and not exists (
            select 1 from public.feedback as source_feedback
            where source_feedback.child_id = job.child_id
              and source_feedback.material_id = job.source_material_id
          ))
        else
          not exists (
            select 1 from public.feedback as source_feedback
            where source_feedback.child_id = job.child_id
              and source_feedback.material_id = job.source_material_id
              and source_feedback.created_at <= job.feedback_cutoff_at
          )
      end,
      error_code = null, error_message = null
  from selected
  where job.id = selected.id
  returning job.*;
end;
$$;
revoke all on function private_generation.claim_due_generation_jobs(text) from public, anon, authenticated;
grant execute on function private_generation.claim_due_generation_jobs(text) to service_role;
