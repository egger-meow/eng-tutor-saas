-- Forward-only migration: Paper English Free Pilot Phase
-- Up to 100 historical real-child admissions receive free weekly personalized materials without requiring a Paddle subscription.
-- Monotonic transition: once 100 historical real-child admissions are reached, free pilot ends permanently.
-- Operational capacity is capped at 100 and not auto-raised.
-- Founder 30 and Paddle pricing/discounts remain intact.

-- 1. Table for durable historical real-child admissions
create table if not exists private_generation.historical_pilot_admissions (
  child_id uuid primary key,
  admission_sequence integer not null unique,
  admitted_at timestamptz not null default now()
);

revoke all on table private_generation.historical_pilot_admissions from public, anon, authenticated;
grant all on table private_generation.historical_pilot_admissions to service_role;

-- 2. Add durable pilot columns to public.enrollment_settings
alter table public.enrollment_settings
  add column if not exists free_pilot_enabled boolean not null default true,
  add column if not exists free_pilot_ended_at timestamptz default null,
  add column if not exists free_pilot_historical_limit integer not null default 100;

-- 3. Backfill any existing real children into historical admissions if table is empty
do $$
declare
  v_existing_count integer;
begin
  select count(*) into v_existing_count from private_generation.historical_pilot_admissions;
  if v_existing_count = 0 then
    insert into private_generation.historical_pilot_admissions (child_id, admission_sequence, admitted_at)
    select
      child.id,
      row_number() over (order by sub.created_at asc, child.id asc)::integer as admission_sequence,
      sub.created_at as admitted_at
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where not child.is_internal_test
      and sub.provider in ('beta', 'paddle')
    order by sub.created_at asc, child.id asc
    on conflict (child_id) do nothing;

    -- If existing real children already reached or exceeded the pilot limit, close the pilot
    select count(*) into v_existing_count from private_generation.historical_pilot_admissions;
    if v_existing_count >= 100 then
      update public.enrollment_settings
      set free_pilot_ended_at = now(),
          free_pilot_enabled = false,
          updated_at = now()
      where key = 'default' and free_pilot_ended_at is null;
    end if;
  end if;
end;
$$;

-- 4. Canonical locked capacity counter
-- Counts deduplicated active service occupants:
-- 1) Active Paddle subscriptions
-- 2) Real active children holding Free Pilot entitlement or in-flight jobs
-- 3) Released waitlist entries
-- 4) Unresolved capacity checkout claims (pending unexpired, bound, release_pending)
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
    -- 1. Active Paddle subscriptions (including paused)
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

-- 5. Child insertion trigger: atomically manage capacity, historical admissions, and pilot status
create or replace function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  locked_count integer;
  current_admissions integer;
  parent_email text;
begin
  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if not found then
    raise exception 'Enrollment settings missing';
  end if;

  if new.is_internal_test then
    -- Operator internal test child: bypass capacity, public waitlist, and pilot admissions
    insert into public.subscriptions (
      child_id,
      provider,
      status,
      plan_code,
      billing_interval,
      current_period_end
    ) values (
      new.id,
      'beta',
      'trialing',
      'standard_monthly',
      'month',
      now() + interval '100 years'
    )
    on conflict (child_id) do nothing;
    return new;
  end if;

  locked_count := private_generation.locked_capacity_count();

  if locked_count >= settings.capacity then
    -- Operational capacity full: place child in waitlist
    select email into parent_email from auth.users where id = new.parent_id;
    insert into public.waitlist (parent_id, child_id, email, status)
    values (new.parent_id, new.id, coalesce(parent_email, ''), 'waiting')
    on conflict (child_id) do update set
      parent_id = excluded.parent_id,
      email = excluded.email,
      status = 'waiting',
      released_at = null,
      converted_at = null;
    return new;
  end if;

  -- Operational capacity available: admit child
  if settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true) then
    select count(*)::integer into current_admissions
    from private_generation.historical_pilot_admissions;

    if current_admissions < settings.free_pilot_historical_limit then
      -- Record historical real-child admission
      insert into private_generation.historical_pilot_admissions (
        child_id,
        admission_sequence,
        admitted_at
      ) values (
        new.id,
        current_admissions + 1,
        now()
      )
      on conflict (child_id) do nothing;

      -- If this is the 100th real child, conclude the Free Pilot atomically
      if current_admissions + 1 >= settings.free_pilot_historical_limit then
        update public.enrollment_settings
        set free_pilot_ended_at = now(),
            free_pilot_enabled = false,
            updated_at = now()
        where key = 'default'
          and free_pilot_ended_at is null;
      end if;
    end if;
  end if;

  -- Create beta/trial subscription row for the admitted child
  insert into public.subscriptions (
    child_id,
    provider,
    status,
    plan_code,
    billing_interval,
    current_period_end
  ) values (
    new.id,
    'beta',
    'trialing',
    'standard_monthly',
    'month',
    case
      when settings.free_pilot_ended_at is null then null
      else now() + interval '14 days'
    end
  )
  on conflict (child_id) do nothing;

  return new;
end;
$$;

-- 6. Update admin waitlist release to respect Free Pilot admissions
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
      -- If free pilot is active, record historical admission if not already recorded
      if settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true) then
        if not exists (select 1 from private_generation.historical_pilot_admissions where child_id = v_child_id) then
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

            if v_current_admissions + 1 >= settings.free_pilot_historical_limit then
              update public.enrollment_settings
              set free_pilot_ended_at = now(),
                  free_pilot_enabled = false,
                  updated_at = now()
              where key = 'default' and free_pilot_ended_at is null;
            end if;
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
          when settings.free_pilot_ended_at is null then null
          else now() + interval '14 days'
        end
      ) on conflict (child_id) do nothing;
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

-- 7. Update claim_due_generation_jobs to enforce Free Pilot entitlement and cutover safety
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
      -- 3. Free Pilot Entitlement (all admitted children while pilot active, or cutover in-flight jobs)
      or (
        (
          exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
          or (subscription.provider = 'beta' and subscription.status in ('trialing', 'active'))
        )
        and (
          (v_pilot_ended is null and v_pilot_enabled)
          or (v_pilot_ended is not null and job.created_at <= v_pilot_ended)
        )
      )
      -- 4. Unexpired beta trial (if applicable post-pilot for Week 1)
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
          exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
          or (subscription.provider = 'beta' and subscription.status in ('trialing', 'active'))
        )
        and (
          (v_pilot_ended is null and v_pilot_enabled)
          or (v_pilot_ended is not null and job.created_at <= v_pilot_ended)
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

-- 8. Drop and recreate get_enrollment_state to expose Free Pilot status
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
  free_pilot_admissions integer,
  free_pilot_limit integer
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  occupied_count integer;
  founder_count integer;
  v_waiting integer;
  v_released integer;
  v_pilot_admissions integer;
begin
  select * into settings from public.enrollment_settings where key = 'default';
  if settings.key is null then raise exception 'Enrollment settings not found'; end if;

  occupied_count := private_generation.locked_capacity_count();
  founder_count := private_generation.founding_seat_count();

  select count(*)::integer into v_waiting
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'waiting' and not child.is_internal_test;

  select count(*)::integer into v_released
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;

  select count(*)::integer into v_pilot_admissions
  from private_generation.historical_pilot_admissions;

  return query select
    settings.status,
    settings.capacity,
    occupied_count,
    greatest(settings.capacity - occupied_count, 0) as remaining,
    settings.founding_limit,
    founder_count,
    v_waiting,
    v_released,
    occupied_count + v_waiting + v_released as total_demand,
    (settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true)) as free_pilot_active,
    v_pilot_admissions as free_pilot_admissions,
    coalesce(settings.free_pilot_historical_limit, 100) as free_pilot_limit;
end;
$$;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;

-- 9. Update prepare_paddle_checkout_v2: free pilot admitted children already occupy capacity unless expired
drop function if exists public.prepare_paddle_checkout_v2(uuid, text);

create or replace function public.prepare_paddle_checkout_v2(
  p_user_id uuid,
  p_child_id uuid,
  p_plan_code text,
  p_required_terms_version text
)
returns table (
  founding_applies boolean,
  founding_status text,
  founding_claim_id uuid,
  founding_transaction_id text,
  capacity_claim_id uuid,
  capacity_transaction_id text,
  checkout_allowed boolean,
  rejection_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  child_subscription public.subscriptions%rowtype;
  waitlist_entry public.waitlist%rowtype;
  live_claim private_generation.founder_checkout_claims%rowtype;
  live_capacity_claim private_generation.capacity_checkout_claims%rowtype;
  founding_count integer;
  locked_count integer;
  parent_email text;
  needs_capacity boolean := false;
  out_capacity_claim_id uuid := null;
  out_capacity_transaction_id text := null;
begin
  if p_user_id is null or p_child_id is null then raise exception 'Authentication and child_id are required'; end if;
  if p_plan_code not in ('standard_monthly', 'standard_annual') then raise exception 'Unsupported subscription plan'; end if;
  if p_required_terms_version <> '2026-08-26-v2' or not exists (
    select 1 from public.profiles
    where id = p_user_id and terms_version = p_required_terms_version
  ) then raise exception 'Current Terms acceptance is required before checkout'; end if;
  if not exists (
    select 1 from public.children where id = p_child_id and parent_id = p_user_id and is_active
  ) then raise exception 'Child not found or not owned by user'; end if;

  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then raise exception 'Enrollment settings are missing'; end if;

  select * into child_subscription from public.subscriptions where child_id = p_child_id for update;
  select * into waitlist_entry from public.waitlist where child_id = p_child_id for update;
  select * into live_claim
  from private_generation.founder_checkout_claims
  where child_id = p_child_id and status in ('pending', 'bound', 'release_pending')
  for update;

  select * into live_capacity_claim
  from private_generation.capacity_checkout_claims
  where child_id = p_child_id and status in ('pending', 'bound', 'release_pending')
  for update;

  if waitlist_entry.id is not null and waitlist_entry.status = 'waiting' then
    return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text, null::uuid, null::text, false, 'capacity_full_waitlisted'::text;
    return;
  end if;
  if child_subscription.id is null and (waitlist_entry.id is null or waitlist_entry.status not in ('released', 'converted')) then
    raise exception 'Child has no service entitlement';
  end if;
  if child_subscription.provider = 'paddle' and child_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a Paddle subscription';
  end if;

  -- Determine if child requires capacity allocation:
  -- Only required if child is an expired beta trial and not released in waitlist.
  -- Existing paid/canceled Paddle customers do not require capacity claims (continuity priority).
  -- While Free Pilot is active, an admitted beta child already holds capacity unless explicitly expired.
  if coalesce(waitlist_entry.status, '') <> 'released' and child_subscription.provider = 'beta' then
    if child_subscription.current_period_end is not null and child_subscription.current_period_end <= now() then
      needs_capacity := true;
    elsif settings.free_pilot_ended_at is not null and coalesce(child_subscription.current_period_end, child_subscription.created_at + interval '14 days') <= now() then
      needs_capacity := true;
    end if;
  end if;

  if needs_capacity then
    if live_capacity_claim.id is not null then
      update private_generation.capacity_checkout_claims
      set reservation_expires_at = now() + interval '30 minutes'
      where id = live_capacity_claim.id;
      out_capacity_claim_id := live_capacity_claim.id;
      out_capacity_transaction_id := live_capacity_claim.paddle_transaction_id;
    else
      locked_count := private_generation.locked_capacity_count();
      if locked_count >= settings.capacity then
        select email into parent_email from auth.users where id = p_user_id;
        insert into public.waitlist (parent_id, child_id, email, status)
        values (p_user_id, p_child_id, coalesce(parent_email, ''), 'waiting')
        on conflict (child_id) do update set
          parent_id = excluded.parent_id,
          email = excluded.email,
          status = 'waiting',
          released_at = null,
          converted_at = null;

        return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text, null::uuid, null::text, false, 'capacity_full_waitlisted'::text;
        return;
      end if;

      insert into private_generation.capacity_checkout_claims (
        child_id, status, reservation_expires_at
      ) values (
        p_child_id, 'pending', now() + interval '30 minutes'
      ) returning id into out_capacity_claim_id;
    end if;
  end if;

  -- Annual checkout never receives Founder discount
  if p_plan_code = 'standard_annual' then
    return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
    return;
  end if;

  -- Existing redeemed Founder continues at Founder pricing
  if child_subscription.founding_status = 'redeemed' then
    return query select true, 'redeemed'::text, null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
    return;
  end if;

  -- Forfeited Founder status cannot receive Founder pricing again
  if child_subscription.founding_status = 'forfeited' then
    return query select false, 'forfeited'::text, null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
    return;
  end if;

  -- If child already has a live Founder claim, reuse and refresh it
  if live_claim.id is not null then
    update private_generation.founder_checkout_claims
    set reservation_expires_at = now() + interval '30 minutes'
    where id = live_claim.id;
    return query select true, 'eligible'::text, live_claim.id, live_claim.paddle_transaction_id, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
    return;
  end if;

  -- Check available Founder seats
  founding_count := private_generation.founding_seat_count();
  if founding_count >= settings.founding_limit then
    return query select false, 'none'::text, null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
    return;
  end if;

  -- Acquire new 30-minute Founder hold
  insert into private_generation.founder_checkout_claims (
    child_id, status, reservation_expires_at
  ) values (
    p_child_id, 'pending', now() + interval '30 minutes'
  ) returning id into live_claim.id;

  return query select true, 'eligible'::text, live_claim.id, null::text, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
end;
$$;
revoke all on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) to service_role;
