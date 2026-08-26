-- Migration: Transaction-safe service capacity claims, unified locked capacity counter, and fail-safe billing authority
-- 1. Capacity checkout claims table
create table if not exists private_generation.capacity_checkout_claims (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  paddle_transaction_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'bound', 'release_pending', 'completed', 'released')),
  reservation_expires_at timestamptz not null,
  release_reason text default null
    check (release_reason is null or release_reason in ('transaction_canceled', 'expired_unbound', 'capacity_exhausted', 'superseded', 'subscription_activated')),
  created_at timestamptz not null default now(),
  bound_at timestamptz,
  released_at timestamptz,
  completed_at timestamptz
);

create index if not exists capacity_checkout_claims_live_idx
  on private_generation.capacity_checkout_claims (child_id, status)
  where status in ('pending', 'bound', 'release_pending');

create index if not exists capacity_checkout_claims_cleanup_idx
  on private_generation.capacity_checkout_claims (status, reservation_expires_at)
  where status in ('pending', 'bound');

revoke all on table private_generation.capacity_checkout_claims from public, anon, authenticated;
grant all on table private_generation.capacity_checkout_claims to service_role;

-- 2. Canonical locked capacity counter
-- Counts deduplicated active service occupants:
-- 1) Active Paddle subscriptions
-- 2) Valid unexpired Beta trials
-- 3) Released waitlist entries
-- 4) Unresolved capacity checkout claims (pending unexpired, bound, release_pending)
create or replace function private_generation.locked_capacity_count()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  with occupied_children as (
    -- 1. Active Paddle subscriptions
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due')

    union

    -- 2. Valid unexpired beta trials
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'beta' and sub.status = 'trialing'
      and coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()

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
  select count(*)::integer into v_count from occupied_children;
  return coalesce(v_count, 0);
end;
$$;
revoke all on function private_generation.locked_capacity_count() from public, anon, authenticated;
grant execute on function private_generation.locked_capacity_count() to service_role;

-- 3. Update create_beta_trial_subscription to use unified locked capacity counter
create or replace function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  locked_count integer;
  parent_email text;
begin
  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then return new; end if;

  locked_count := private_generation.locked_capacity_count();

  if locked_count < settings.capacity then
    insert into public.subscriptions (
      child_id, provider, status, founding_status, founding_reserved_until, current_period_end
    ) values (
      new.id, 'beta', 'trialing', 'none', null, new.created_at + interval '14 days'
    );
  else
    select email into parent_email from auth.users where id = new.parent_id;
    insert into public.waitlist (parent_id, child_id, email, status)
    values (new.parent_id, new.id, coalesce(parent_email, ''), 'waiting')
    on conflict (child_id) do update set
      parent_id = excluded.parent_id,
      email = excluded.email,
      status = 'waiting',
      released_at = null,
      converted_at = null;
  end if;
  return new;
end;
$$;

-- 4. Capacity claim RPCs
create or replace function public.bind_capacity_checkout_transaction(
  p_user_id uuid,
  p_child_id uuid,
  p_claim_id uuid,
  p_transaction_id text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_claim private_generation.capacity_checkout_claims%rowtype;
begin
  if p_user_id is null or p_child_id is null or p_claim_id is null or p_transaction_id is null then
    raise exception 'Missing required arguments for capacity transaction binding';
  end if;
  if not exists (
    select 1 from public.children where id = p_child_id and parent_id = p_user_id and is_active
  ) then
    raise exception 'Child not found or not owned by user';
  end if;

  select * into v_claim
  from private_generation.capacity_checkout_claims
  where id = p_claim_id and child_id = p_child_id
  for update;

  if v_claim.id is null then raise exception 'Capacity claim not found'; end if;
  if v_claim.status not in ('pending', 'bound', 'release_pending') then
    raise exception 'Capacity claim is not in a bindable status: %', v_claim.status;
  end if;
  if v_claim.paddle_transaction_id is not null and v_claim.paddle_transaction_id <> p_transaction_id then
    raise exception 'Capacity claim is already bound to a different transaction';
  end if;

  update private_generation.capacity_checkout_claims
  set status = 'bound',
      paddle_transaction_id = p_transaction_id,
      bound_at = coalesce(bound_at, now()),
      reservation_expires_at = greatest(reservation_expires_at, now() + interval '30 minutes')
  where id = p_claim_id;
end;
$$;
revoke all on function public.bind_capacity_checkout_transaction(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.bind_capacity_checkout_transaction(uuid, uuid, uuid, text) to service_role;

create or replace function public.release_capacity_checkout_claim(
  p_claim_id uuid,
  p_transaction_id text,
  p_release_reason text
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_claim private_generation.capacity_checkout_claims%rowtype;
begin
  if p_claim_id is null then return false; end if;

  select * into v_claim
  from private_generation.capacity_checkout_claims
  where id = p_claim_id
  for update;

  if v_claim.id is null then return false; end if;
  if v_claim.status in ('completed', 'released') then return false; end if;

  if v_claim.paddle_transaction_id is not null
    and p_transaction_id is not null
    and v_claim.paddle_transaction_id <> p_transaction_id
  then
    return false;
  end if;

  update private_generation.capacity_checkout_claims
  set status = 'released',
      released_at = now(),
      release_reason = coalesce(p_release_reason, 'transaction_canceled')
  where id = p_claim_id;

  return true;
end;
$$;
revoke all on function public.release_capacity_checkout_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.release_capacity_checkout_claim(uuid, text, text) to service_role;

create or replace function public.claim_expired_capacity_checkouts(p_limit integer default 20)
returns table (
  claim_id uuid,
  child_id uuid,
  paddle_transaction_id text,
  status text
)
language plpgsql security definer set search_path = ''
as $$
begin
  -- Auto-release unbound pending claims older than expiry
  update private_generation.capacity_checkout_claims as c
  set status = 'released', released_at = now(), release_reason = 'expired_unbound'
  where c.status = 'pending' and c.reservation_expires_at <= now() and c.paddle_transaction_id is null;

  -- Mark bound expired claims as release_pending for reconciliation
  return query
  with due_claims as (
    select c_inner.id
    from private_generation.capacity_checkout_claims as c_inner
    where c_inner.status = 'bound'
      and c_inner.reservation_expires_at <= now()
      and c_inner.paddle_transaction_id is not null
    order by c_inner.reservation_expires_at asc
    limit greatest(coalesce(p_limit, 20), 1)
    for update skip locked
  ),
  updated_claims as (
    update private_generation.capacity_checkout_claims as c
    set status = 'release_pending'
    from due_claims
    where c.id = due_claims.id
    returning c.id, c.child_id, c.paddle_transaction_id, c.status
  )
  select * from updated_claims;
end;
$$;
revoke all on function public.claim_expired_capacity_checkouts(integer) from public, anon, authenticated;
grant execute on function public.claim_expired_capacity_checkouts(integer) to service_role;

-- 5. Update prepare_paddle_checkout_v2:
-- Atomically manages both capacity claims (for returning beta / inactive) and Founder claims (for qualifying monthly).
-- If capacity full for returning beta, upserts child into normal waiting lifecycle and raises exception.
drop function if exists public.prepare_paddle_checkout_v2(uuid, uuid, text, text);
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
  capacity_transaction_id text
)
language plpgsql security definer set search_path = ''
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
    raise exception '這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。';
  end if;
  if child_subscription.id is null and (waitlist_entry.id is null or waitlist_entry.status not in ('released', 'converted')) then
    raise exception 'Child has no service entitlement';
  end if;
  if child_subscription.provider = 'paddle' and child_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a Paddle subscription';
  end if;

  -- Determine if child requires capacity allocation:
  -- Required if child is an expired beta trial, or has no active Paddle/beta subscription and not released in waitlist.
  if coalesce(waitlist_entry.status, '') <> 'released' and (
    child_subscription.provider = 'beta'
    and coalesce(child_subscription.current_period_end, child_subscription.created_at + interval '14 days') <= now()
  ) then
    needs_capacity := true;
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
        -- Capacity full: actually upsert child into normal waiting lifecycle
        select email into parent_email from auth.users where id = p_user_id;
        insert into public.waitlist (parent_id, child_id, email, status)
        values (p_user_id, p_child_id, coalesce(parent_email, ''), 'waiting')
        on conflict (child_id) do update set
          parent_id = excluded.parent_id,
          email = excluded.email,
          status = 'waiting',
          released_at = null,
          converted_at = null;
        raise exception '這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。';
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
    return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id;
    return;
  end if;

  -- Existing redeemed Founder continues at Founder pricing
  if child_subscription.founding_status = 'redeemed' then
    return query select true, 'redeemed'::text, null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id;
    return;
  end if;

  -- Forfeited Founder status cannot receive Founder pricing again
  if child_subscription.founding_status = 'forfeited' then
    return query select false, 'forfeited'::text, null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id;
    return;
  end if;

  -- If child already has a live Founder claim, reuse and refresh it
  if live_claim.id is not null then
    update private_generation.founder_checkout_claims
    set reservation_expires_at = now() + interval '30 minutes'
    where id = live_claim.id;
    return query select true, 'eligible'::text, live_claim.id, live_claim.paddle_transaction_id, out_capacity_claim_id, out_capacity_transaction_id;
    return;
  end if;

  -- Check available Founder seats
  founding_count := private_generation.founding_seat_count();
  if founding_count >= settings.founding_limit then
    return query select false, 'none'::text, null::uuid, null::text, out_capacity_claim_id, out_capacity_transaction_id;
    return;
  end if;

  -- Acquire new 30-minute Founder hold
  insert into private_generation.founder_checkout_claims (
    child_id, status, reservation_expires_at
  ) values (
    p_child_id, 'pending', now() + interval '30 minutes'
  )
  returning id into live_claim.id;

  return query select true, 'eligible'::text, live_claim.id, null::text, out_capacity_claim_id, out_capacity_transaction_id;
end;
$$;
revoke all on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) to service_role;

-- 6. Update get_enrollment_state to use canonical locked capacity count
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
  total_demand integer
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  occupied_count integer;
  founder_count integer;
  v_waiting integer;
  v_released integer;
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

  return query select
    settings.status,
    settings.capacity,
    occupied_count,
    greatest(settings.capacity - occupied_count, 0) as remaining,
    settings.founding_limit,
    founder_count,
    v_waiting,
    v_released,
    occupied_count + v_waiting + v_released as total_demand;
end;
$$;
revoke all on function public.get_enrollment_state() from public, anon, authenticated;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;

-- 7. Update admin waitlist functions to use canonical locked capacity count
drop function if exists public.admin_raise_capacity_and_release(integer, boolean);
create or replace function public.admin_raise_capacity_and_release(
  p_new_capacity integer,
  p_release_all_waiting boolean default false
)
returns table (
  new_capacity integer,
  active_count integer,
  released_count integer,
  waiting_count integer,
  released_now_count integer
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_active integer;
  v_released integer;
  v_waiting integer;
  v_released_now integer := 0;
  v_available integer;
  v_to_release integer;
begin
  if p_new_capacity is null or p_new_capacity < 1 then
    raise exception 'New capacity must be a positive integer';
  end if;

  v_active := private_generation.locked_capacity_count();

  select count(*)::integer into v_released
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;

  select count(*)::integer into v_waiting
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'waiting' and not child.is_internal_test;

  if p_release_all_waiting then
    if p_new_capacity < (v_active + v_waiting) then
      raise exception 'New capacity (%) must be at least % to cover all active (%) and waiting (%) candidates',
        p_new_capacity, (v_active + v_waiting), v_active, v_waiting;
    end if;

    update public.enrollment_settings
    set capacity = p_new_capacity,
        status = case when p_new_capacity > v_active then 'open' else status end,
        updated_at = now()
    where key = 'default';

    with to_release as (
      select id from public.waitlist
      where status = 'waiting'
      order by created_at asc
      for update
    ),
    released_rows as (
      update public.waitlist as w
      set status = 'released', released_at = now(), notification_status = 'pending'
      from to_release
      where w.id = to_release.id
      returning w.id
    )
    select count(*)::integer into v_released_now from released_rows;
  else
    if p_new_capacity < v_active then
      raise exception 'New capacity (%) cannot be lower than currently locked capacity (%)',
        p_new_capacity, v_active;
    end if;

    update public.enrollment_settings
    set capacity = p_new_capacity,
        status = case when p_new_capacity > v_active then 'open' else status end,
        updated_at = now()
    where key = 'default';
  end if;

  return query select p_new_capacity, v_active, v_released + v_released_now, v_waiting - v_released_now, v_released_now;
end;
$$;
revoke all on function public.admin_raise_capacity_and_release(integer, boolean) from public, anon, authenticated;
grant execute on function public.admin_raise_capacity_and_release(integer, boolean) to service_role;

drop function if exists public.admin_release_waitlist_children(uuid[]);
create or replace function public.admin_release_waitlist_children(p_child_ids uuid[])
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_locked integer;
  v_to_release integer;
  v_released_now integer := 0;
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

-- 8. Hardened process_paddle_subscription_event_v2_base
-- Webhook forever discount MUST require ends_at field present AND ends_at = null.
-- Completes capacity claims upon active subscription creation.
create or replace function private_generation.process_paddle_subscription_event_v2_base(
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
  p_cancel_at_period_end boolean,
  p_expected_founding_discount_id text,
  p_discount_id text default null,
  p_discount_status text default null,
  p_discount_type text default null,
  p_discount_ends_at timestamptz default null,
  p_discount_ends_at_present boolean default false,
  p_founder_claim_id uuid default null,
  p_originating_transaction_id text default null
)
returns table (
  processed boolean,
  duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_subscription public.subscriptions%rowtype;
  existing_event public.billing_webhook_events%rowtype;
  v_waitlist_status text;
  next_founding_status text;
  next_redeemed_at timestamptz;
  next_forfeited_at timestamptz;
  founder_discount_valid boolean;
  v_claim private_generation.founder_checkout_claims%rowtype;
begin
  if p_child_id is null then raise exception 'Webhook payload missing child_id in custom_data'; end if;
  if not exists (select 1 from public.children where id = p_child_id) then
    raise exception 'Child % not found for billing event %', p_child_id, p_event_id;
  end if;

  select status into v_waitlist_status from public.waitlist where child_id = p_child_id for update;
  if v_waitlist_status = 'waiting' then
    raise exception 'Cannot process subscription for child still in waiting status — Admin release required first';
  end if;

  if exists (
    select 1 from public.subscriptions where provider_subscription_id = p_provider_subscription_id and child_id <> p_child_id
  ) then raise exception 'Paddle subscription is already assigned to another child'; end if;

  select * into existing_subscription from public.subscriptions where child_id = p_child_id for update;

  if existing_subscription.id is not null
    and existing_subscription.provider = 'paddle'
    and existing_subscription.provider_subscription_id is distinct from p_provider_subscription_id
    and existing_subscription.status in ('trialing', 'active', 'past_due', 'paused')
  then
    raise exception 'Child already has a different active Paddle subscription';
  end if;

  insert into public.billing_webhook_events (
    event_id, event_type, occurred_at, provider_subscription_id, child_id
  ) values (
    p_event_id, p_event_type, p_occurred_at, p_provider_subscription_id, p_child_id
  ) on conflict (event_id) do nothing;
  if not found then
    return query select true, true;
    return;
  end if;

  if existing_subscription.provider_event_at is not null and p_occurred_at < existing_subscription.provider_event_at then
    update public.billing_webhook_events set ignored_as_stale = true where event_id = p_event_id;
    return query select true, true;
    return;
  end if;

  -- Forever discount requires expected discount ID, flat type, active status, ends_at field explicitly present, AND ends_at IS NULL
  founder_discount_valid := (
    p_expected_founding_discount_id is not null
    and p_discount_id is not null
    and p_discount_id = p_expected_founding_discount_id
    and coalesce(p_discount_status, 'active') = 'active'
    and coalesce(p_discount_type, 'flat') = 'flat'
    and p_discount_ends_at is null
    and p_discount_ends_at_present is true
  );

  next_founding_status := coalesce(existing_subscription.founding_status, 'none');
  next_redeemed_at := existing_subscription.founding_redeemed_at;
  next_forfeited_at := existing_subscription.founding_forfeited_at;

  if next_founding_status in ('none', 'eligible', 'expired')
    and p_plan_code = 'standard_monthly'
    and p_status in ('trialing', 'active')
  then
    if p_event_type = 'subscription.created' and p_founder_claim_id is not null and founder_discount_valid then
      select * into v_claim
      from private_generation.founder_checkout_claims
      where id = p_founder_claim_id for update;

      if v_claim.id is not null
        and v_claim.child_id = p_child_id
        and v_claim.status in ('bound', 'release_pending')
        and v_claim.paddle_transaction_id is not null
        and p_originating_transaction_id is not null
        and v_claim.paddle_transaction_id = p_originating_transaction_id
      then
        next_founding_status := 'redeemed';
        next_redeemed_at := coalesce(existing_subscription.founding_redeemed_at, p_occurred_at, now());
      end if;
    end if;
  elsif next_founding_status = 'redeemed' and p_status in ('trialing', 'active', 'past_due', 'paused') then
    if not founder_discount_valid then
      raise exception 'Founder billing integrity failure: expected discount is missing or mismatched';
    end if;
  elsif next_founding_status = 'redeemed' and p_status = 'canceled' then
    next_founding_status := 'forfeited';
    next_forfeited_at := coalesce(existing_subscription.founding_forfeited_at, p_occurred_at, now());
  end if;

  -- Record monotonic historical authority table ONLY after verified redemption
  if next_founding_status = 'redeemed' and not exists (
    select 1 from public.children where id = p_child_id and is_internal_test
  ) then
    insert into private_generation.founder_redemptions (
      child_id, provider_subscription_id, redeemed_at
    ) values (
      p_child_id, p_provider_subscription_id, coalesce(next_redeemed_at, p_occurred_at, now())
    ) on conflict (provider_subscription_id) do nothing;
  end if;

  -- Complete capacity checkout claim upon active subscription creation
  if p_status in ('trialing', 'active') then
    update private_generation.capacity_checkout_claims
    set status = 'completed', completed_at = now(), paddle_transaction_id = coalesce(paddle_transaction_id, p_originating_transaction_id)
    where child_id = p_child_id and status in ('pending', 'bound', 'release_pending');

    delete from private_generation.checkout_capacity_reservations where child_id = p_child_id;
  end if;

  if v_waitlist_status = 'released' and p_status in ('trialing', 'active') then
    update public.waitlist set status = 'converted', converted_at = now()
    where child_id = p_child_id and status = 'released';
  end if;

  insert into public.subscriptions (
    child_id, provider, provider_customer_id, provider_subscription_id, status,
    plan_code, billing_interval, price_twd, current_period_start, current_period_end,
    cancel_at_period_end, provider_event_at, founding_status, founding_redeemed_at, founding_forfeited_at
  ) values (
    p_child_id, 'paddle', p_provider_customer_id, p_provider_subscription_id, p_status,
    p_plan_code, p_billing_interval, p_price_twd, p_current_period_start, p_current_period_end,
    p_cancel_at_period_end, p_occurred_at, next_founding_status, next_redeemed_at, next_forfeited_at
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
    founding_status = excluded.founding_status,
    founding_redeemed_at = excluded.founding_redeemed_at,
    founding_forfeited_at = excluded.founding_forfeited_at,
    updated_at = now();

  -- Complete or release Founder checkout claim
  if p_founder_claim_id is not null then
    select * into v_claim
    from private_generation.founder_checkout_claims
    where id = p_founder_claim_id for update;

    if v_claim.id is not null then
      if p_status in ('trialing', 'active') and next_founding_status = 'redeemed' then
        update private_generation.founder_checkout_claims
        set status = 'completed',
            completed_at = now(),
            paddle_transaction_id = coalesce(paddle_transaction_id, p_originating_transaction_id)
        where id = p_founder_claim_id;
      elsif p_status = 'canceled' or (not founder_discount_valid and next_founding_status <> 'redeemed') then
        update private_generation.founder_checkout_claims
        set status = 'released',
            released_at = now(),
            release_reason = case when p_status = 'canceled' then 'transaction_canceled' else 'discount_removed' end
        where id = p_founder_claim_id;
      end if;
    end if;
  end if;

  return query select true, false;
end;
$$;
