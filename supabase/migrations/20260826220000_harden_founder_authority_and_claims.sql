-- Migration: Harden Founder 30 claims, capacity reservation, and monotonic authority

-- 1. Monotonic historical Founder redemptions authority: hard deletion cannot reopen seat 31.
create table if not exists private_generation.founder_redemptions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null,
  provider_subscription_id text not null unique,
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
revoke all on table private_generation.founder_redemptions from public, anon, authenticated;

-- Backfill any existing redeemed non-internal subscriptions into founder_redemptions.
insert into private_generation.founder_redemptions (child_id, provider_subscription_id, redeemed_at)
select sub.child_id, sub.provider_subscription_id, coalesce(sub.founding_redeemed_at, sub.created_at, now())
from public.subscriptions as sub
join public.children as child on child.id = sub.child_id
where sub.founding_status in ('redeemed', 'forfeited')
  and not child.is_internal_test
  and sub.provider_subscription_id is not null
on conflict (provider_subscription_id) do nothing;

-- 2. Update founding_seat_count to use monotonic authority and count bound/release_pending claims until neutralized.
create or replace function private_generation.founding_seat_count()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(distinct seat.child_id)::integer
  from (
    select redemption.child_id
    from private_generation.founder_redemptions as redemption
    union
    select subscription.child_id
    from public.subscriptions as subscription
    join public.children as child on child.id = subscription.child_id
    where not child.is_internal_test
      and subscription.founding_status in ('redeemed', 'forfeited')
    union
    select claim.child_id
    from private_generation.founder_checkout_claims as claim
    join public.children as child on child.id = claim.child_id
    where not child.is_internal_test
      and (
        (claim.status = 'pending' and claim.reservation_expires_at > now())
        or claim.status in ('bound', 'release_pending')
      )
  ) as seat;
$$;
revoke all on function private_generation.founding_seat_count() from public, anon, authenticated;

-- 3. Update prepare_paddle_checkout_v2 to atomically reserve capacity for returning expired beta checkout.
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
  founding_transaction_id text
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  child_subscription public.subscriptions%rowtype;
  waitlist_entry public.waitlist%rowtype;
  live_claim private_generation.founder_checkout_claims%rowtype;
  founding_count integer;
  active_child_count integer;
  released_child_count integer;
  parent_email text;
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

  if waitlist_entry.id is not null and waitlist_entry.status = 'waiting' then
    raise exception '這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。';
  end if;
  if child_subscription.id is null and (waitlist_entry.id is null or waitlist_entry.status not in ('released', 'converted')) then
    raise exception 'Child has no service entitlement';
  end if;
  if child_subscription.provider = 'paddle' and child_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a Paddle subscription';
  end if;

  -- If returning expired beta child, atomically check and reserve service capacity, or enter waitlist.
  if child_subscription.provider = 'beta'
    and coalesce(child_subscription.current_period_end, child_subscription.created_at + interval '14 days') <= now()
  then
    select count(*)::integer into active_child_count
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and (
        (sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due'))
        or (
          sub.provider = 'beta'
          and sub.status = 'trialing'
          and coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()
        )
      );
    select count(*)::integer into released_child_count
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where entry.status = 'released' and not child.is_internal_test;

    -- If not already holding a released seat and capacity is full, block with waitlist notice.
    if coalesce(waitlist_entry.status, '') <> 'released' and active_child_count + released_child_count >= settings.capacity then
      raise exception '這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。';
    end if;

    -- Atomically reserve service capacity slot for returning expired beta checkout.
    if coalesce(waitlist_entry.status, '') <> 'released' then
      select email into parent_email from auth.users where id = p_user_id;
      insert into public.waitlist (parent_id, child_id, email, status, released_at)
      values (p_user_id, p_child_id, coalesce(parent_email, ''), 'released', now())
      on conflict (child_id) do update
      set status = 'released', released_at = now()
      where waitlist.status not in ('released', 'converted');
    end if;
  end if;

  -- Annual checkout never receives Founder discount.
  if p_plan_code = 'standard_annual' then
    return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text;
    return;
  end if;

  -- Existing redeemed Founder continues at Founder pricing without acquiring new claims.
  if child_subscription.founding_status = 'redeemed' then
    return query select true, 'redeemed'::text, null::uuid, null::text;
    return;
  end if;

  -- Forfeited Founder status cannot receive Founder pricing again.
  if child_subscription.founding_status = 'forfeited' then
    return query select false, 'forfeited'::text, null::uuid, null::text;
    return;
  end if;

  -- If child holds an unexpired pending claim, return it.
  if live_claim.id is not null and live_claim.status = 'pending' and live_claim.reservation_expires_at > now() then
    return query select true, 'eligible'::text, live_claim.id, null::text;
    return;
  end if;

  -- If child holds a bound claim, return it with bound transaction id.
  if live_claim.id is not null and live_claim.status in ('bound', 'release_pending') then
    return query select true, 'eligible'::text, live_claim.id, live_claim.paddle_transaction_id;
    return;
  end if;

  -- Check global Founder limit.
  founding_count := private_generation.founding_seat_count();
  if founding_count >= settings.founding_limit then
    return query select false, 'none'::text, null::uuid, null::text;
    return;
  end if;

  -- Insert a durable pending claim holding the Founder seat.
  insert into private_generation.founder_checkout_claims (
    child_id, status, reservation_expires_at
  )
  values (
    p_child_id, 'pending', now() + interval '30 minutes'
  )
  returning * into live_claim;

  return query select true, 'eligible'::text, live_claim.id, null::text;
end;
$$;
revoke all on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) to service_role;

-- 4. Never auto-release orphan pending claims based purely on age.
create or replace function public.claim_expired_founder_checkouts(p_limit integer default 20)
returns table (claim_id uuid, child_id uuid, paddle_transaction_id text)
language plpgsql security definer set search_path = ''
as $$
declare settings public.enrollment_settings%rowtype;
begin
  select * into settings from public.enrollment_settings where key = 'default' for update;
  update private_generation.founder_checkout_claims as claim
  set status = 'release_pending'
  where claim.id in (
    select candidate.id
    from private_generation.founder_checkout_claims as candidate
    where candidate.status = 'bound' and candidate.reservation_expires_at <= now()
    order by candidate.reservation_expires_at, candidate.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  );
  return query
  select claim.id, claim.child_id, claim.paddle_transaction_id
  from private_generation.founder_checkout_claims as claim
  where claim.status = 'release_pending'
  order by claim.reservation_expires_at, claim.created_at
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;
revoke all on function public.claim_expired_founder_checkouts(integer) from public, anon, authenticated;
grant execute on function public.claim_expired_founder_checkouts(integer) to service_role;

-- 5. Record monotonic founder redemption in process_paddle_subscription_event_v2_base.
drop function if exists public.process_paddle_subscription_event_v2;
drop function if exists private_generation.process_paddle_subscription_event_v2_base;

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
  p_discount_id text,
  p_discount_description text,
  p_discount_status text,
  p_discount_type text,
  p_discount_ends_at timestamptz,
  p_discount_recurring boolean,
  p_founder_claim_id uuid default null,
  p_founder_transaction_id text default null
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
  settings public.enrollment_settings%rowtype;
  v_waitlist_status text;
  v_claim private_generation.founder_checkout_claims%rowtype;
  next_founding_status text;
  next_redeemed_at timestamptz;
  next_forfeited_at timestamptz;
  founder_discount_valid boolean;
  active_child_count integer;
  released_child_count integer;
begin
  if p_event_id is null or char_length(p_event_id) < 6 then raise exception 'Valid event_id is required'; end if;
  if p_occurred_at is null then raise exception 'Valid occurred_at is required'; end if;
  if p_child_id is null then raise exception 'Valid child_id is required'; end if;
  if p_provider_subscription_id is null or char_length(p_provider_subscription_id) < 4 then raise exception 'Valid provider_subscription_id is required'; end if;
  if p_status is null then raise exception 'Valid status is required'; end if;
  if p_plan_code not in ('standard_monthly', 'standard_annual') then raise exception 'Valid plan_code is required'; end if;
  if p_billing_interval not in ('month', 'year') then raise exception 'Valid billing_interval is required'; end if;
  if p_price_twd is null or p_price_twd < 0 then raise exception 'Valid price_twd is required'; end if;

  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then raise exception 'Enrollment settings are missing'; end if;

  select * into existing_subscription from public.subscriptions where child_id = p_child_id for update;
  select status into v_waitlist_status from public.waitlist where child_id = p_child_id for update;

  if v_waitlist_status = 'waiting' then
    raise exception 'Cannot process subscription for child still in waiting status — Admin release required first';
  end if;
  if exists (
    select 1 from public.subscriptions where provider_subscription_id = p_provider_subscription_id and child_id <> p_child_id
  ) then raise exception 'Paddle subscription is already assigned to another child'; end if;
  if existing_subscription.provider = 'paddle'
    and existing_subscription.provider_subscription_id is distinct from p_provider_subscription_id
    and existing_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a different active Paddle subscription';
  end if;

  insert into public.billing_webhook_events (event_id, event_type, occurred_at, provider_subscription_id, child_id)
  values (p_event_id, p_event_type, p_occurred_at, p_provider_subscription_id, p_child_id)
  on conflict (event_id) do nothing;
  if not found then return query select false, false; return; end if;

  if existing_subscription.provider_event_at is not null and p_occurred_at < existing_subscription.provider_event_at then
    update public.billing_webhook_events set ignored_as_stale = true where event_id = p_event_id;
    return query select true, true; return;
  end if;

  founder_discount_valid := (
    p_discount_id is not null
    and p_discount_status = 'active'
    and p_discount_type = 'flat'
    and p_discount_recurring = true
    and p_discount_ends_at is null
  );

  next_founding_status := coalesce(existing_subscription.founding_status, 'none');
  next_redeemed_at := existing_subscription.founding_redeemed_at;
  next_forfeited_at := existing_subscription.founding_forfeited_at;

  if next_founding_status in ('none', 'eligible', 'expired') and p_plan_code = 'standard_monthly' and p_status in ('trialing', 'active') and founder_discount_valid then
    next_founding_status := 'redeemed';
    next_redeemed_at := coalesce(existing_subscription.founding_redeemed_at, p_occurred_at);
  elsif next_founding_status = 'redeemed' and p_status in ('trialing', 'active', 'past_due', 'paused') then
    if not founder_discount_valid then raise exception 'Founder billing integrity failure: expected discount is missing or mismatched'; end if;
  elsif next_founding_status = 'redeemed' and p_status = 'canceled' then
    next_founding_status := 'forfeited';
    next_forfeited_at := coalesce(existing_subscription.founding_forfeited_at, p_occurred_at);
  end if;

  if next_founding_status = 'redeemed' and not exists (
    select 1 from public.children where id = p_child_id and is_internal_test
  ) then
    insert into private_generation.founder_redemptions (
      child_id, provider_subscription_id, redeemed_at
    ) values (
      p_child_id, p_provider_subscription_id, coalesce(next_redeemed_at, p_occurred_at, now())
    ) on conflict (provider_subscription_id) do nothing;
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
    founding_reserved_until = null;

  if p_status in ('trialing', 'active') then
    select count(child.id)::integer into active_child_count
    from public.subscriptions as sub join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and (
        (sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due'))
        or (sub.provider = 'beta' and sub.status = 'trialing' and coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now())
      );
    select count(*)::integer into released_child_count
    from public.waitlist as entry join public.children as child on child.id = entry.child_id
    where entry.status = 'released' and not child.is_internal_test;

    if active_child_count + released_child_count >= settings.capacity and settings.status = 'open' then
      update public.enrollment_settings set status = 'waitlist', updated_at = now() where key = 'default';
    end if;
  end if;

  if p_founder_claim_id is not null then
    select * into v_claim from private_generation.founder_checkout_claims where id = p_founder_claim_id for update;
    if v_claim.id is not null then
      if p_status in ('trialing', 'active') and next_founding_status = 'redeemed' then
        update private_generation.founder_checkout_claims
        set status = 'completed', completed_at = now(), paddle_transaction_id = coalesce(paddle_transaction_id, p_founder_transaction_id)
        where id = p_founder_claim_id;
      elsif p_status = 'canceled' or (not founder_discount_valid and next_founding_status <> 'redeemed') then
        update private_generation.founder_checkout_claims
        set status = 'released', released_at = now(), release_reason = case when p_status = 'canceled' then 'transaction_canceled' else 'discount_removed' end
        where id = p_founder_claim_id;
      end if;
    end if;
  end if;

  return query select true, false;
end;
$$;
revoke all on function private_generation.process_paddle_subscription_event_v2_base from public, anon, authenticated;

create or replace function public.process_paddle_subscription_event_v2(
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
  p_discount_id text,
  p_discount_description text,
  p_discount_status text,
  p_discount_type text,
  p_discount_ends_at timestamptz,
  p_discount_recurring boolean,
  p_founder_claim_id uuid default null,
  p_founder_transaction_id text default null
)
returns table (
  processed boolean,
  duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select * from private_generation.process_paddle_subscription_event_v2_base(
    p_event_id, p_event_type, p_occurred_at, p_child_id, p_provider_subscription_id,
    p_provider_customer_id, p_status, p_plan_code, p_billing_interval, p_price_twd,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_discount_id, p_discount_description, p_discount_status, p_discount_type,
    p_discount_ends_at, p_discount_recurring, p_founder_claim_id, p_founder_transaction_id
  );
end;
$$;
revoke all on function public.process_paddle_subscription_event_v2 from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event_v2 to service_role;
