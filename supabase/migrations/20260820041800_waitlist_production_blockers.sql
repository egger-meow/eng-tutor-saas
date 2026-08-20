-- Migration: Waitlist Production Blockers
--
-- Fix 1: Admission gate counts released children toward capacity
-- Fix 2: Notification tracking columns + release RPCs set notification_status = 'pending'
-- Fix 3: process_paddle_subscription_event rejects waiting children, only released→converted on activated status
-- Fix 4: get_enrollment_state remaining subtracts released count

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Add notification tracking columns to waitlist
-- ────────────────────────────────────────────────────────────────────────────

alter table public.waitlist
  add column if not exists notification_status text not null default 'none',
  add column if not exists notification_error text,
  add column if not exists notification_attempts integer not null default 0,
  add column if not exists notified_at timestamptz;

-- Add check constraint for notification_status
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'waitlist_notification_status_check'
  ) then
    alter table public.waitlist
      add constraint waitlist_notification_status_check
      check (notification_status in ('none', 'pending', 'sent', 'failed', 'manual'));
  end if;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Fix create_beta_trial_subscription: count released toward capacity
-- ────────────────────────────────────────────────────────────────────────────

create or replace function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  founding_count integer;
  active_child_count integer;
  released_child_count integer;
  init_founding_status text := 'none';
  parent_email text;
begin
  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is null then
    return new;
  end if;

  -- Permanent Founding 30 cap: count all historical allocations
  select count(*)::integer into founding_count
  from public.subscriptions
  where founding_status in ('eligible', 'redeemed');

  if founding_count < settings.founding_limit then
    init_founding_status := 'eligible';
  end if;

  -- Count current active service children
  select count(child.id)::integer into active_child_count
  from public.subscriptions as subscription
  join public.children as child on child.id = subscription.child_id
  where subscription.status in ('trialing', 'active', 'past_due')
    and child.is_active;

  -- Count released waitlist children (pending conversion, still reserve capacity)
  select count(*)::integer into released_child_count
  from public.waitlist
  where status = 'released';

  -- Capacity Gating: active + released must be under capacity for normal entry
  if (active_child_count + released_child_count) < settings.capacity then
    -- Under capacity: regular entry with trial subscription
    insert into public.subscriptions (child_id, provider, status, founding_status)
    values (new.id, 'beta', 'trialing', init_founding_status);
  else
    -- At/over capacity: Scaling gate holds child in waiting state
    select email into parent_email
    from auth.users
    where id = new.parent_id;

    insert into public.waitlist (parent_id, child_id, email, status)
    values (new.parent_id, new.id, coalesce(parent_email, ''), 'waiting')
    on conflict (child_id) do nothing;
  end if;

  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Fix get_enrollment_state: remaining subtracts released
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.get_enrollment_state()
returns table (
  status text,
  capacity integer,
  active_count integer,
  remaining integer,
  founding_limit integer,
  founding_count integer,
  waiting_count integer,
  released_count integer
)
language sql stable security definer set search_path = ''
as $$
  with released_stats as (
    select count(*)::integer as released_cnt from public.waitlist where status = 'released'
  ),
  waiting_stats as (
    select count(*)::integer as waiting_cnt from public.waitlist where status = 'waiting'
  )
  select settings.status, settings.capacity,
    count(child.id)::integer as active_count,
    greatest(settings.capacity - count(child.id)::integer - rs.released_cnt, 0) as remaining,
    settings.founding_limit,
    count(child.id) filter (where subscription.founding_status in ('eligible', 'redeemed'))::integer as founding_count,
    ws.waiting_cnt as waiting_count,
    rs.released_cnt as released_count
  from public.enrollment_settings as settings
  cross join released_stats as rs
  cross join waiting_stats as ws
  left join public.subscriptions as subscription on subscription.status in ('trialing', 'active', 'past_due')
  left join public.children as child on child.id = subscription.child_id and child.is_active
  where settings.key = 'default'
  group by settings.status, settings.capacity, settings.founding_limit, rs.released_cnt, ws.waiting_cnt;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Fix process_paddle_subscription_event: reject waiting, guard Week 1
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.process_paddle_subscription_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_child_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_status public.subscription_status,
  p_plan_code text,
  p_billing_interval text,
  p_price_twd integer,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns table (processed boolean, ignored_as_stale boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_event_at timestamptz;
  child_tz text;
  local_now timestamp;
  next_day_local date;
  release_anchor timestamptz;
  first_material_week date;
  v_waitlist_status text;
begin
  if p_event_id is null or p_event_type is null or p_child_id is null
    or p_provider_subscription_id is null or p_provider_customer_id is null then
    raise exception 'Missing required Paddle subscription event fields';
  end if;

  if not (
    (p_plan_code = 'standard_monthly' and p_billing_interval = 'month' and p_price_twd = 499)
    or (p_plan_code = 'standard_annual' and p_billing_interval = 'year' and p_price_twd = 4999)
  ) then
    raise exception 'Invalid Paddle plan configuration';
  end if;

  if not exists (select 1 from public.children where id = p_child_id) then
    raise exception 'Unknown child_id';
  end if;

  -- Check waitlist status: reject if child is still 'waiting' (Admin release required first)
  select w.status into v_waitlist_status
  from public.waitlist as w
  where w.child_id = p_child_id;

  if v_waitlist_status = 'waiting' then
    raise exception 'Cannot process subscription for child still in waiting status — Admin release required first';
  end if;

  select provider_event_at into existing_event_at
  from public.subscriptions
  where child_id = p_child_id
  for update;

  if exists (
    select 1 from public.subscriptions
    where provider_subscription_id = p_provider_subscription_id
      and child_id <> p_child_id
  ) then
    raise exception 'Paddle subscription is already assigned to another child';
  end if;

  if exists (
    select 1 from public.subscriptions
    where child_id = p_child_id
      and provider = 'paddle'
      and provider_subscription_id is distinct from p_provider_subscription_id
      and status in ('active', 'past_due', 'paused')
  ) then
    raise exception 'Child already has a different active Paddle subscription';
  end if;

  insert into public.billing_webhook_events (
    event_id, event_type, occurred_at, provider_subscription_id, child_id
  ) values (
    p_event_id, p_event_type, p_occurred_at, p_provider_subscription_id, p_child_id
  ) on conflict (event_id) do nothing;

  if not found then
    return query select false, false;
    return;
  end if;

  if existing_event_at is not null and p_occurred_at < existing_event_at then
    update public.billing_webhook_events
    set ignored_as_stale = true
    where event_id = p_event_id;
    return query select true, true;
    return;
  end if;

  -- Convert waitlist entry only from 'released' state and only on activated subscription
  if v_waitlist_status = 'released' and p_status in ('trialing', 'active') then
    update public.waitlist
    set status = 'converted',
        converted_at = now()
    where child_id = p_child_id
      and status = 'released';
  end if;

  insert into public.subscriptions (
    child_id, provider, provider_customer_id, provider_subscription_id, status,
    plan_code, billing_interval, price_twd, current_period_start,
    current_period_end, cancel_at_period_end, provider_event_at
  ) values (
    p_child_id, 'paddle', p_provider_customer_id, p_provider_subscription_id,
    p_status, p_plan_code, p_billing_interval, p_price_twd, p_current_period_start,
    p_current_period_end, p_cancel_at_period_end, p_occurred_at
  )
  on conflict (child_id) do update set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    status = excluded.status,
    plan_code = excluded.plan_code,
    billing_interval = excluded.billing_interval,
    price_twd = excluded.price_twd,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider_event_at = excluded.provider_event_at,
    founding_status = case
      when public.subscriptions.founding_status = 'eligible'
        and excluded.plan_code = 'standard_monthly'
        and excluded.status in ('trialing', 'active')
      then 'redeemed'
      else public.subscriptions.founding_status
    end;

  -- Enqueue Week 1 generation job ONLY for activated subscriptions and NOT for waiting children
  if p_status in ('trialing', 'active')
     and v_waitlist_status is distinct from 'waiting'
     and not exists (select 1 from public.materials where child_id = p_child_id)
     and not exists (select 1 from public.generation_jobs where child_id = p_child_id) then
    select coalesce(child.timezone, 'Asia/Taipei')
    into child_tz
    from public.children as child
    where child.id = p_child_id and child.is_active;

    if child_tz is not null then
      local_now := now() at time zone child_tz;
      next_day_local := (local_now::date) + 1;
      first_material_week := next_day_local;
      release_anchor := (next_day_local::timestamp) at time zone child_tz;

      insert into public.generation_jobs (
        child_id, material_week, rule_version, idempotency_key, status,
        scheduled_for, source_material_id, release_at,
        feedback_cutoff_at, generation_due_at
      ) values (
        p_child_id,
        first_material_week,
        'curriculum-rules/1.0.0',
        p_child_id::text || ':' || first_material_week::text || ':r1',
        'pending',
        date_trunc('second', now()),
        null,
        release_anchor,
        release_anchor - interval '48 hours',
        release_anchor - interval '24 hours'
      ) on conflict (idempotency_key) do nothing;

      update public.children
      set next_generation_at = release_anchor - interval '24 hours'
      where id = p_child_id;
    end if;
  end if;

  return query select true, false;
end;
$$;

revoke all on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean
) to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Update release RPCs: set notification_status = 'pending' on release
-- ────────────────────────────────────────────────────────────────────────────

drop function if exists public.admin_get_waitlist();

create or replace function public.admin_get_waitlist()
returns table (
  id uuid,
  parent_id uuid,
  child_id uuid,
  email text,
  child_name text,
  grade integer,
  grade_stage text,
  status text,
  created_at timestamptz,
  released_at timestamptz,
  converted_at timestamptz,
  notes text,
  notification_status text,
  notification_error text,
  notification_attempts integer,
  notified_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    w.id,
    w.parent_id,
    w.child_id,
    w.email,
    c.display_name as child_name,
    c.grade,
    c.grade_stage,
    w.status,
    w.created_at,
    w.released_at,
    w.converted_at,
    w.notes,
    w.notification_status,
    w.notification_error,
    w.notification_attempts,
    w.notified_at
  from public.waitlist as w
  join public.children as c on c.id = w.child_id
  order by w.created_at asc;
end;
$$;

revoke all on function public.admin_get_waitlist() from public, anon, authenticated;
grant execute on function public.admin_get_waitlist() to service_role;

create or replace function public.admin_raise_capacity_and_release(
  p_new_capacity integer,
  p_release_all boolean default false
)
returns table (
  new_capacity integer,
  active_count integer,
  released_count integer,
  waiting_count integer,
  released_in_this_run integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_active integer;
  v_released integer;
  v_waiting integer;
  v_released_now integer := 0;
begin
  if p_new_capacity is null or p_new_capacity < 1 then
    raise exception 'Capacity must be at least 1';
  end if;

  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is null then
    raise exception 'Enrollment settings not found';
  end if;

  select count(child.id)::integer into v_active
  from public.subscriptions as subscription
  join public.children as child on child.id = subscription.child_id
  where subscription.status in ('trialing', 'active', 'past_due')
    and child.is_active;

  select count(*)::integer into v_released
  from public.waitlist
  where status = 'released';

  select count(*)::integer into v_waiting
  from public.waitlist
  where status = 'waiting';

  if p_release_all then
    if p_new_capacity < (v_active + v_released + v_waiting) then
      raise exception 'New capacity (%) must be at least % to cover all active (%) and waiting (%) candidates',
        p_new_capacity, (v_active + v_released + v_waiting), (v_active + v_released), v_waiting;
    end if;

    update public.enrollment_settings
    set capacity = p_new_capacity,
        status = case when p_new_capacity > v_active then 'open' else status end,
        updated_at = now()
    where key = 'default';

    with released_rows as (
      update public.waitlist
      set status = 'released',
          released_at = now(),
          notification_status = 'pending'
      where status = 'waiting'
      returning id
    )
    select count(*)::integer into v_released_now from released_rows;

    v_released := v_released + v_released_now;
    v_waiting := 0;
  else
    if p_new_capacity < (v_active + v_released) then
      raise exception 'New capacity (%) cannot be lower than currently active + released (% + %)',
        p_new_capacity, v_active, v_released;
    end if;

    update public.enrollment_settings
    set capacity = p_new_capacity,
        status = case when p_new_capacity > v_active then 'open' else status end,
        updated_at = now()
    where key = 'default';
  end if;

  return query select p_new_capacity, v_active, v_released, v_waiting, v_released_now;
end;
$$;

revoke all on function public.admin_raise_capacity_and_release(integer, boolean) from public, anon, authenticated;
grant execute on function public.admin_raise_capacity_and_release(integer, boolean) to service_role;

create or replace function public.admin_release_waitlist_children(
  p_child_ids uuid[]
)
returns table (
  released_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_active integer;
  v_released integer;
  v_to_release integer;
  v_released_now integer := 0;
begin
  if p_child_ids is null or array_length(p_child_ids, 1) = 0 then
    return query select 0;
    return;
  end if;

  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  select count(child.id)::integer into v_active
  from public.subscriptions as subscription
  join public.children as child on child.id = subscription.child_id
  where subscription.status in ('trialing', 'active', 'past_due')
    and child.is_active;

  select count(*)::integer into v_released
  from public.waitlist
  where status = 'released';

  select count(*)::integer into v_to_release
  from public.waitlist
  where child_id = any(p_child_ids)
    and status = 'waiting';

  if (v_active + v_released + v_to_release) > settings.capacity then
    raise exception 'Cannot release % children: exceeds available capacity (active: %, released: %, capacity: %)',
      v_to_release, v_active, v_released, settings.capacity;
  end if;

  with updated_rows as (
    update public.waitlist
    set status = 'released',
        released_at = now(),
        notification_status = 'pending'
    where child_id = any(p_child_ids)
      and status = 'waiting'
    returning id
  )
  select count(*)::integer into v_released_now from updated_rows;

  return query select v_released_now;
end;
$$;

revoke all on function public.admin_release_waitlist_children(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_release_waitlist_children(uuid[]) to service_role;
