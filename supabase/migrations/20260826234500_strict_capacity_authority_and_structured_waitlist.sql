-- Migration: Strict capacity authority repair, non-destructive waitlist persistence, and claim release protection
-- 1. release_capacity_checkout_claim: Strict transaction ID matching
drop function if exists public.release_capacity_checkout_claim(uuid, text, text);
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

  -- If paddle_transaction_id is stored, require non-null and exact match
  if v_claim.paddle_transaction_id is not null then
    if p_transaction_id is null or v_claim.paddle_transaction_id <> p_transaction_id then
      return false;
    end if;
  else
    -- Unbound pending claim must not be released with a mismatched transaction_id
    if p_transaction_id is not null then
      return false;
    end if;
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

-- 2. release_founder_checkout_claim: Strict transaction ID matching
drop function if exists public.release_founder_checkout_claim(uuid, text, text);
create or replace function public.release_founder_checkout_claim(
  p_claim_id uuid,
  p_transaction_id text,
  p_release_reason text
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_claim private_generation.founder_checkout_claims%rowtype;
begin
  if p_claim_id is null then return false; end if;

  select * into v_claim
  from private_generation.founder_checkout_claims
  where id = p_claim_id
  for update;

  if v_claim.id is null then return false; end if;
  if v_claim.status in ('completed', 'released') then return false; end if;

  -- If paddle_transaction_id is stored, require non-null and exact match
  if v_claim.paddle_transaction_id is not null then
    if p_transaction_id is null or v_claim.paddle_transaction_id <> p_transaction_id then
      return false;
    end if;
  else
    if p_transaction_id is not null then
      return false;
    end if;
  end if;

  update private_generation.founder_checkout_claims
  set status = 'released',
      released_at = now(),
      release_reason = coalesce(p_release_reason, 'transaction_canceled')
  where id = p_claim_id;

  return true;
end;
$$;
revoke all on function public.release_founder_checkout_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.release_founder_checkout_claim(uuid, text, text) to service_role;

-- 3. Update prepare_paddle_checkout_v2:
-- Persists waitlist row on capacity exhaustion without rolling back via exception, returning structured status
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
  capacity_transaction_id text,
  checkout_allowed boolean,
  rejection_reason text
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
        -- Capacity full: actually upsert child into normal waiting lifecycle WITHOUT raising exception (persists row!)
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
  )
  returning id into live_claim.id;

  return query select true, 'eligible'::text, live_claim.id, null::text, out_capacity_claim_id, out_capacity_transaction_id, true, null::text;
end;
$$;
revoke all on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) to service_role;
