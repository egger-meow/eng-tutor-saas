-- Migration: Fix Paddle webhook Founder discount schema matching and forward repair falsely released claims

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

  -- Validate discount shape: Paddle API v2 subscription webhooks provide discount id and starts_at/ends_at.
  -- Valid forever discount requires matching expected ID and no ends_at date.
  founder_discount_valid := (
    p_discount_id is not null
    and p_expected_founding_discount_id is not null
    and p_discount_id = p_expected_founding_discount_id
    and (not coalesce(p_discount_ends_at_present, false) or p_discount_ends_at is null)
    and p_discount_ends_at is null
  );

  next_founding_status := coalesce(existing_subscription.founding_status, 'none');
  next_redeemed_at := existing_subscription.founding_redeemed_at;
  next_forfeited_at := existing_subscription.founding_forfeited_at;

  -- Attempting new Founder redemption:
  -- MUST be subscription.created, monthly, trialing/active, with valid discount AND exact matching bound claim
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

  -- Release capacity hold and convert waitlist if converting
  delete from private_generation.checkout_capacity_reservations where child_id = p_child_id;

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

  -- Reconcile founder claim status
  if p_founder_claim_id is not null then
    select * into v_claim from private_generation.founder_checkout_claims where id = p_founder_claim_id for update;
    if v_claim.id is not null then
      if p_status in ('trialing', 'active') and next_founding_status = 'redeemed' then
        update private_generation.founder_checkout_claims
        set status = 'completed', completed_at = now(), paddle_transaction_id = coalesce(paddle_transaction_id, p_originating_transaction_id)
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

-- Forward repair: recover legitimately redeemed Founder 30 monthly subscriptions that were misclassified due to discount schema mismatch
do $$
declare
  r record;
begin
  for r in
    select
      sub.child_id,
      sub.provider_subscription_id,
      sub.created_at as sub_created_at,
      claim.id as claim_id,
      claim.paddle_transaction_id
    from public.subscriptions sub
    join private_generation.founder_checkout_claims claim on claim.child_id = sub.child_id
    join public.children child on child.id = sub.child_id
    where sub.provider = 'paddle'
      and sub.plan_code = 'standard_monthly'
      and sub.status in ('trialing', 'active', 'past_due', 'paused')
      and sub.founding_status = 'none'
      and not child.is_internal_test
      and (claim.status in ('bound', 'release_pending') or (claim.status = 'released' and claim.release_reason = 'discount_removed'))
  loop
    -- 1. Insert monotonic historical authority record
    insert into private_generation.founder_redemptions (
      child_id, provider_subscription_id, redeemed_at
    ) values (
      r.child_id, r.provider_subscription_id, coalesce(r.sub_created_at, now())
    ) on conflict (provider_subscription_id) do nothing;

    -- 2. Repair subscription row to redeemed
    update public.subscriptions
    set
      founding_status = 'redeemed',
      founding_redeemed_at = coalesce(founding_redeemed_at, r.sub_created_at, now())
    where child_id = r.child_id;

    -- 3. Mark founder claim as completed
    update private_generation.founder_checkout_claims
    set
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      release_reason = null
    where id = r.claim_id;
  end loop;
end;
$$;
