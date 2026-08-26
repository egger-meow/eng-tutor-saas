-- Migration: Harden webhook capacity authority for expired-beta activation
-- Requires exact bound/release_pending capacity claim matching p_originating_transaction_id for fresh capacity activations.

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
  v_matching_capacity_claim private_generation.capacity_checkout_claims%rowtype;
  v_needs_capacity_claim boolean := false;
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

  -- Verify capacity authority for fresh activations:
  -- Expired-beta child requires an unresolved capacity claim bound to exact p_originating_transaction_id.
  -- Released waitlist children already own capacity through their released waitlist row.
  if p_status in ('trialing', 'active') then
    if coalesce(v_waitlist_status, '') <> 'released' and (
      existing_subscription.id is null
      or (
        existing_subscription.provider = 'beta'
        and coalesce(existing_subscription.current_period_end, existing_subscription.created_at + interval '14 days') <= p_occurred_at
      )
    ) then
      v_needs_capacity_claim := true;
    end if;

    if v_needs_capacity_claim then
      if p_originating_transaction_id is null then
        raise exception 'Paddle subscription activation for expired-beta child requires originating transaction ID';
      end if;

      select * into v_matching_capacity_claim
      from private_generation.capacity_checkout_claims
      where child_id = p_child_id
        and paddle_transaction_id is not null
        and paddle_transaction_id = p_originating_transaction_id
        and status in ('bound', 'release_pending')
      for update;

      if v_matching_capacity_claim.id is null then
        raise exception 'No matching bound capacity claim found for transaction % (child %)', p_originating_transaction_id, p_child_id;
      end if;

      -- Complete ONLY the exact matching capacity claim
      update private_generation.capacity_checkout_claims
      set status = 'completed',
          completed_at = now()
      where id = v_matching_capacity_claim.id;
    end if;
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
