-- Migration: 20260911133000_unify_pilot_entitlement_authority_and_release_safety.sql
-- Description:
--   1. Unifies Free Pilot service eligibility across rolling_active_service_child_count,
--      locked_capacity_count, and claim_due_generation_jobs rooted in historical_pilot_admissions
--      (active, non-waiting child while pilot is active), preventing mutable subscription status from
--      diverging Free Pilot entitlement.
--   2. Updates locked_capacity_count() so waitlist 'released' entries only hold capacity reservations
--      if the child does NOT already hold service entitlement (Paddle or Free Pilot admission),
--      ensuring dormant capacity replacement remains fully effective and never double counts.
--   3. Hardens admin_release_waitlist_children() to query and lock ONLY waitlist rows where status = 'waiting',
--      preventing caller-provided non-waiting IDs from receiving ledger or subscription side effects.
--   4. Updates get_enrollment_state() to compute and return authoritative dormant_service_children_count.

-- 0. Clean up any Free Pilot admitted child who had a stale pre-pilot beta trial current_period_end
update public.subscriptions s
set current_period_end = null,
    updated_at = now()
where s.provider = 'beta'
  and s.current_period_end is not null
  and exists (
    select 1 from private_generation.historical_pilot_admissions h
    where h.child_id = s.child_id
  )
  and exists (
    select 1 from public.enrollment_settings e
    where e.key = 'default' and e.free_pilot_ended_at is null and coalesce(e.free_pilot_enabled, true)
  );

-- 1. private_generation.rolling_active_service_child_count(interval)
drop function if exists private_generation.rolling_active_service_child_count(interval);

create or replace function private_generation.rolling_active_service_child_count(
  p_window_interval interval default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interval interval;
  v_pilot_ended timestamptz;
  v_pilot_enabled boolean;
  v_count integer;
begin
  select
    free_pilot_ended_at,
    coalesce(free_pilot_enabled, true),
    case
      when p_window_interval is not null then p_window_interval
      else (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
    end
  into v_pilot_ended, v_pilot_enabled, v_interval
  from public.enrollment_settings
  where key = 'default';

  with active_service_children as (
    -- 1. Free Pilot service eligible children whose parent engaged within the rolling window
    -- Authority: rooted solely in historical_pilot_admissions while pilot is active, independent of mutable subscription row.
    select child.id as child_id
    from public.children as child
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    where child.is_active
      and not child.is_internal_test
      and exists (
        select 1 from private_generation.historical_pilot_admissions as h
        where h.child_id = child.id
      )
      and not exists (
        select 1 from public.waitlist as w
        where w.child_id = child.id and w.status = 'waiting'
      )
      and parent_profile.last_active_at is not null
      and parent_profile.last_active_at >= now() - v_interval

    union

    -- 2. Active Paddle subscriptions whose parent engaged within the rolling window
    select child.id as child_id
    from public.children as child
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    join public.subscriptions as sub on sub.child_id = child.id
    where child.is_active
      and not child.is_internal_test
      and sub.provider = 'paddle'
      and sub.status in ('trialing', 'active', 'past_due')
      and parent_profile.last_active_at is not null
      and parent_profile.last_active_at >= now() - v_interval
  )
  select count(distinct child_id)::integer into v_count
  from active_service_children;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function private_generation.rolling_active_service_child_count(interval) from public, anon, authenticated;
grant execute on function private_generation.rolling_active_service_child_count(interval) to service_role;

-- 2. private_generation.locked_capacity_count()
create or replace function private_generation.locked_capacity_count()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_pilot_ended timestamptz;
  v_pilot_enabled boolean;
  v_window interval;
begin
  select
    free_pilot_ended_at,
    coalesce(free_pilot_enabled, true),
    (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
  into v_pilot_ended, v_pilot_enabled, v_window
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

    -- 2. Free Pilot service eligible children (while pilot is active)
    -- Authority: rooted solely in historical_pilot_admissions, independent of mutable subscription row.
    -- Active if parent engaged within rolling window OR holding an actively claimed in-flight job
    select child.id as child_id
    from public.children as child
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    where child.is_active and not child.is_internal_test
      and v_pilot_ended is null and v_pilot_enabled
      and exists (
        select 1 from private_generation.historical_pilot_admissions as h
        where h.child_id = child.id
      )
      and not exists (
        select 1 from public.waitlist as w
        where w.child_id = child.id and w.status = 'waiting'
      )
      and (
        (parent_profile.last_active_at is not null and parent_profile.last_active_at >= now() - v_window)
        or exists (
          select 1 from public.generation_jobs as job
          where job.child_id = child.id
            and job.status = 'claimed'
            and job.lease_expires_at > now()
        )
      )

    union

    -- 3. Post-cutover pilot legacy or unexpired beta trials
    select child.id as child_id
    from public.children as child
    left join public.subscriptions as sub on sub.child_id = child.id
    where child.is_active and not child.is_internal_test
      and v_pilot_ended is not null
      and (
        -- in-flight job created before cutover for admitted child
        exists (
          select 1 from public.generation_jobs as job
          where job.child_id = child.id
            and job.created_at <= v_pilot_ended
            and job.status in ('pending', 'claimed')
        )
        -- or unexpired 14-day beta trial
        or (
          sub.provider = 'beta' and sub.status = 'trialing'
          and coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()
        )
      )

    union

    -- 4. Released waitlist entries that do not yet hold service entitlement
    -- Hardened: Once a child holds service entitlement (active Paddle or Free Pilot admission),
    -- they must never be double-counted or sneak back in as a waitlist reservation.
    select child.id as child_id
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where not child.is_internal_test
      and entry.status = 'released'
      and not exists (
        -- Exclude if child already has an active Paddle subscription
        select 1 from public.subscriptions s
        where s.child_id = child.id
          and s.provider = 'paddle'
          and s.status in ('trialing', 'active', 'past_due', 'paused')
      )
      and not (
        -- Exclude if child has Free Pilot admission during active pilot
        v_pilot_ended is null and v_pilot_enabled
        and exists (
          select 1 from private_generation.historical_pilot_admissions h
          where h.child_id = child.id
        )
      )

    union

    -- 5. Unresolved capacity checkout claims
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

-- 3. private_generation.claim_due_generation_jobs(text)
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
  v_window interval;
begin
  if worker_id is null or char_length(worker_id) < 3 then raise exception 'worker_id is required'; end if;
  select least(integer_value, 100) into claim_limit
  from public.operational_settings where key = 'daily_generation_limit';
  if claim_limit is null then raise exception 'daily_generation_limit is not configured'; end if;

  select
    free_pilot_ended_at,
    coalesce(free_pilot_enabled, true),
    (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
  into v_pilot_ended, v_pilot_enabled, v_window
  from public.enrollment_settings
  where key = 'default';

  return query
  with mandatory as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
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
      -- 3. Free Pilot Entitlement (rooted solely in historical_pilot_admissions, not waiting):
      --    While pilot active: Week 1 always claimable; Week 2+ requires active parent in 14-day rolling window
      --    After cutover: only jobs created <= free_pilot_ended_at for historically admitted children
      or (
        (
          (
            v_pilot_ended is null and v_pilot_enabled
            and exists (select 1 from private_generation.historical_pilot_admissions as h where h.child_id = child.id)
            and not exists (select 1 from public.waitlist as w where w.child_id = child.id and w.status = 'waiting')
            and (
              job.source_material_id is null
              or (parent_profile.last_active_at is not null and parent_profile.last_active_at >= now() - v_window)
            )
          )
          or (
            v_pilot_ended is not null
            and job.created_at <= v_pilot_ended
            and exists (select 1 from private_generation.historical_pilot_admissions as h where h.child_id = child.id)
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
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
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
      -- 3. Free Pilot Entitlement (rooted solely in historical_pilot_admissions, not waiting):
      --    While pilot active: Week 1 always claimable; Week 2+ requires active parent in 14-day rolling window
      --    After cutover: only jobs created <= free_pilot_ended_at for historically admitted children
      or (
        (
          (
            v_pilot_ended is null and v_pilot_enabled
            and exists (select 1 from private_generation.historical_pilot_admissions as h where h.child_id = child.id)
            and not exists (select 1 from public.waitlist as w where w.child_id = child.id and w.status = 'waiting')
            and (
              job.source_material_id is null
              or (parent_profile.last_active_at is not null and parent_profile.last_active_at >= now() - v_window)
            )
          )
          or (
            v_pilot_ended is not null
            and job.created_at <= v_pilot_ended
            and exists (select 1 from private_generation.historical_pilot_admissions as h where h.child_id = child.id)
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
  set status = 'claimed',
      claimed_by = worker_id,
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
      updated_at = now()
  from selected
  where job.id = selected.id
  returning job.*;
end;
$$;

revoke all on function private_generation.claim_due_generation_jobs(text) from public, anon, authenticated;
grant execute on function private_generation.claim_due_generation_jobs(text) to service_role;

-- 4. public.admin_release_waitlist_children(uuid[])
create or replace function public.admin_release_waitlist_children(p_child_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
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

  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is null then
    raise exception 'Enrollment settings are missing';
  end if;

  v_locked := private_generation.locked_capacity_count();

  -- Count ONLY genuinely waiting children among input array
  select count(distinct id)::integer into v_to_release
  from public.waitlist
  where child_id = any(p_child_ids)
    and status = 'waiting';

  if v_to_release = 0 then
    return 0;
  end if;

  if (v_locked + v_to_release) > settings.capacity then
    raise exception 'Cannot release % children: exceeds available capacity (locked: %, capacity: %)',
      v_to_release, v_locked, settings.capacity;
  end if;

  -- Strictly loop over genuinely waiting waitlist rows only
  for v_child_id in
    select w.child_id
    from public.waitlist as w
    where w.status = 'waiting'
      and w.child_id = any(p_child_ids)
    for update
  loop
    select * into v_child
    from public.children
    where id = v_child_id;

    if v_child.id is not null and not v_child.is_internal_test then
      v_is_pilot_admitted := exists (
        select 1 from private_generation.historical_pilot_admissions where child_id = v_child_id
      );

      if not v_is_pilot_admitted and settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true) then
        select count(*)::integer into v_current_admissions
        from private_generation.historical_pilot_admissions;

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
      end if;

      -- Update existing subscription ONLY if provider is 'beta' (preserve Paddle subscriptions)
      update public.subscriptions
      set status = 'trialing',
          current_period_end = case
            when settings.free_pilot_ended_at is null then null
            else now() + interval '14 days'
          end,
          updated_at = now()
      where child_id = v_child_id
        and provider = 'beta';

      if not found and not exists (select 1 from public.subscriptions where child_id = v_child_id) then
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
            when settings.free_pilot_ended_at is null then null
            else now() + interval '14 days'
          end
        ) on conflict (child_id) do nothing;
      end if;

      update public.waitlist
      set status = 'released',
          released_at = now(),
          notification_status = 'pending',
          notification_attempts = 0,
          notification_error = null,
          notified_at = null
      where child_id = v_child_id and status = 'waiting';

      v_released_now := v_released_now + 1;
    end if;
  end loop;

  -- If children were released, evaluate whether cutover condition is met
  if v_released_now > 0 then
    perform private_generation.check_and_execute_free_pilot_cutover();
  end if;

  return v_released_now;
end;
$$;

revoke all on function public.admin_release_waitlist_children(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_release_waitlist_children(uuid[]) to service_role;

-- 5. public.get_enrollment_state()
drop function if exists public.get_enrollment_state();

create or replace function public.get_enrollment_state()
returns table (
  status text,
  capacity integer,
  active_count integer,
  remaining integer,
  founding_limit integer,
  founding_count integer,
  waiting_count integer,
  released_count integer,
  total_demand integer,
  free_pilot_active boolean,
  free_pilot_admissions integer, -- Historical pilot ledger admissions
  free_pilot_limit integer,      -- Configured free pilot active limit (100)
  rolling_active_count integer,  -- Authoritative rolling 14-day active service children
  operational_occupancy integer, -- Authoritative locked_capacity_count()
  total_real_children integer,   -- Total real children in the database (where not is_internal_test)
  activity_window_days integer,  -- Configured window days (14)
  dormant_service_children_count integer, -- Authoritative dormant Free Pilot service children
  free_pilot_ended_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_occupancy integer;
  v_rolling_active integer;
  v_dormant_count integer;
  v_pilot_admissions integer;
  v_total_real_children integer;
  v_waiting integer;
  v_released integer;
  v_founding integer;
  v_remaining integer;
  v_window_interval interval;
  v_free_pilot_active boolean;
begin
  select * into settings from public.enrollment_settings where key = 'default';
  if settings.key is null then
    raise exception 'Enrollment settings are missing';
  end if;

  v_occupancy := private_generation.locked_capacity_count();
  v_founding := private_generation.founding_seat_count();
  v_window_interval := (coalesce(settings.free_pilot_activity_window_days, 14) || ' days')::interval;
  v_rolling_active := private_generation.rolling_active_service_child_count(v_window_interval);

  select count(*)::integer into v_pilot_admissions
  from private_generation.historical_pilot_admissions;

  select count(*)::integer into v_total_real_children
  from public.children
  where not is_internal_test;

  select count(*)::integer into v_waiting
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'waiting' and not child.is_internal_test;

  select count(*)::integer into v_released
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;

  v_free_pilot_active := (settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true));
  v_remaining := greatest(settings.capacity - v_occupancy, 0);

  -- Authoritative dormant Free Pilot children during active pilot:
  -- Eligible real child whose parent has not engaged within the rolling window
  if v_free_pilot_active then
    select count(distinct child.id)::integer into v_dormant_count
    from public.children as child
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    where child.is_active and not child.is_internal_test
      and exists (
        select 1 from private_generation.historical_pilot_admissions as h
        where h.child_id = child.id
      )
      and not exists (
        select 1 from public.waitlist as w
        where w.child_id = child.id and w.status = 'waiting'
      )
      and (
        parent_profile.last_active_at is null
        or parent_profile.last_active_at < now() - v_window_interval
      );
  else
    v_dormant_count := 0;
  end if;

  return query
  select
    settings.status,
    settings.capacity,
    v_occupancy,          -- active_count: permanent alias to operational_occupancy
    v_remaining,          -- remaining
    settings.founding_limit,
    v_founding,
    v_waiting,
    v_released,
    v_occupancy + v_waiting + v_released,
    v_free_pilot_active,
    v_pilot_admissions,   -- free_pilot_admissions
    coalesce(settings.free_pilot_active_limit, 100),
    v_rolling_active,
    v_occupancy,          -- operational_occupancy
    v_total_real_children, -- total_real_children
    coalesce(settings.free_pilot_activity_window_days, 14),
    coalesce(v_dormant_count, 0),
    settings.free_pilot_ended_at;
end;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;
