-- Migration: Scaling Gate & Cohort Release Waitlist Lifecycle (>100 Children)
-- 
-- 1. Create public.waitlist table with RLS and unique constraint per child.
-- 2. Update private_generation.create_beta_trial_subscription() to gate child #101+ into waitlist in 'waiting' state without trialing subscription or generation jobs.
-- 3. Update public.prepare_paddle_checkout() to block 'waiting' children and permit 'released' children.
-- 4. Update public.process_paddle_subscription_event() to convert waitlist entries to 'converted' upon paid subscription.
-- 5. Update public.get_enrollment_state() to return waiting_count and released_count.
-- 6. Add admin RPCs: admin_get_waitlist, admin_raise_capacity_and_release, admin_release_waitlist_children.

-- 1. Create public.waitlist table
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  email text not null,
  status text not null default 'waiting' 
    check (status in ('waiting', 'released', 'converted', 'canceled')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  converted_at timestamptz,
  notes text,
  constraint waitlist_child_id_unique unique (child_id)
);

create index if not exists waitlist_parent_id_idx on public.waitlist (parent_id);
create index if not exists waitlist_status_idx on public.waitlist (status);

alter table public.waitlist enable row level security;

drop policy if exists waitlist_parent_select on public.waitlist;
create policy waitlist_parent_select on public.waitlist
  for select to authenticated
  using (parent_id = auth.uid());

grant select on public.waitlist to authenticated;
grant all on public.waitlist to service_role;

-- 2. Update child creation trigger: create_beta_trial_subscription
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

  -- Capacity Gating:
  if active_child_count < settings.capacity then
    -- Under capacity (1-100): regular entry with trial subscription
    insert into public.subscriptions (child_id, provider, status, founding_status)
    values (new.id, 'beta', 'trialing', init_founding_status);
  else
    -- At/over capacity (101+): Scaling gate holds child in waiting state
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

-- 3. Update public.prepare_paddle_checkout
create or replace function public.prepare_paddle_checkout(
  p_user_id uuid,
  p_child_id uuid,
  p_plan_code text
)
returns table (founding_applies boolean, founding_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  child_subscription public.subscriptions%rowtype;
  waitlist_entry public.waitlist%rowtype;
  founding_count integer;
begin
  if p_user_id is null or p_child_id is null then
    raise exception 'Authentication and child_id are required';
  end if;

  if p_plan_code not in ('standard_monthly', 'standard_annual') then
    raise exception 'Unsupported subscription plan';
  end if;

  if not exists (
    select 1
    from public.children
    where id = p_child_id
      and parent_id = p_user_id
      and is_active
  ) then
    raise exception 'Child not found or not owned by user';
  end if;

  select * into child_subscription
  from public.subscriptions
  where child_id = p_child_id
  for update;

  select * into waitlist_entry
  from public.waitlist
  where child_id = p_child_id
  for update;

  -- Block checkout if child is on waitlist in 'waiting' state
  if waitlist_entry.id is not null and waitlist_entry.status = 'waiting' then
    raise exception '這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。';
  end if;

  -- Verify entitlement
  if child_subscription.id is null and (waitlist_entry.id is null or waitlist_entry.status not in ('released', 'converted')) then
    raise exception 'Child has no service entitlement';
  end if;

  if child_subscription.provider = 'paddle'
    and child_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a Paddle subscription';
  end if;

  if p_plan_code = 'standard_annual' then
    return query select false, coalesce(child_subscription.founding_status, 'none');
    return;
  end if;

  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is null then
    raise exception 'Enrollment settings are missing';
  end if;

  if child_subscription.id is not null and child_subscription.founding_status = 'none' and waitlist_entry.id is null then
    select count(*)::integer into founding_count
    from public.subscriptions
    where public.subscriptions.founding_status in ('eligible', 'redeemed');

    if founding_count < settings.founding_limit then
      update public.subscriptions
      set founding_status = 'eligible'
      where id = child_subscription.id;
      child_subscription.founding_status := 'eligible';
    end if;
  end if;

  return query select
    coalesce(child_subscription.founding_status, 'none') = 'eligible',
    coalesce(child_subscription.founding_status, 'none');
end;
$$;

revoke all on function public.prepare_paddle_checkout(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout(uuid, uuid, text)
to service_role;

-- 4. Update public.process_paddle_subscription_event
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

  -- If child was in waitlist, mark as converted
  update public.waitlist
  set status = 'converted',
      converted_at = now()
  where child_id = p_child_id
    and status in ('waiting', 'released');

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

  -- If no initial generation job exists, enqueue it now for next calendar day delivery
  if not exists (select 1 from public.materials where child_id = p_child_id)
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

-- 5. Update public.get_enrollment_state()
drop function if exists public.get_enrollment_state();

create function public.get_enrollment_state()
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
  select settings.status, settings.capacity,
    count(child.id)::integer as active_count,
    greatest(settings.capacity - count(child.id)::integer, 0) as remaining,
    settings.founding_limit,
    count(child.id) filter (where subscription.founding_status in ('eligible', 'redeemed'))::integer as founding_count,
    (select count(*)::integer from public.waitlist where status = 'waiting') as waiting_count,
    (select count(*)::integer from public.waitlist where status = 'released') as released_count
  from public.enrollment_settings as settings
  left join public.subscriptions as subscription on subscription.status in ('trialing', 'active', 'past_due')
  left join public.children as child on child.id = subscription.child_id and child.is_active
  where settings.key = 'default'
  group by settings.status, settings.capacity, settings.founding_limit;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated;

-- 6. Admin RPCs
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
  notes text
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
    w.notes
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
          released_at = now()
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
        released_at = now()
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
