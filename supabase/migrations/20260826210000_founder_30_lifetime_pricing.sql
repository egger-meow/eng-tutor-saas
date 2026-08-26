-- Founder 30 lifetime monthly pricing contract.
-- Lock order for every Founder-mutating path: enrollment_settings -> subscription -> waitlist.

alter table public.subscriptions
  add column founding_reserved_until timestamptz,
  add column founding_redeemed_at timestamptz,
  add column founding_forfeited_at timestamptz;

alter table public.subscriptions drop constraint subscriptions_founding_status_check;

-- Deterministic backfill: reservations are anchored to the original child/subscription
-- enrollment, never to migration execution time.
update public.subscriptions as subscription
set founding_reserved_until = coalesce(subscription.created_at, child.created_at) + interval '14 days',
    founding_status = case
      when coalesce(subscription.created_at, child.created_at) + interval '14 days' > now() then 'eligible'
      else 'expired'
    end
from public.children as child
where child.id = subscription.child_id
  and subscription.founding_status = 'eligible';

update public.subscriptions as subscription
set founding_redeemed_at = coalesce(
  subscription.current_period_start,
  subscription.provider_event_at,
  subscription.updated_at,
  subscription.created_at,
  child.created_at
)
from public.children as child
where child.id = subscription.child_id
  and subscription.founding_status = 'redeemed';

alter table public.subscriptions
  add constraint subscriptions_founding_status_check
    check (founding_status in ('none', 'eligible', 'redeemed', 'expired', 'forfeited')),
  add constraint subscriptions_founding_lifecycle_check check (
    (founding_status <> 'eligible' or (founding_reserved_until is not null and founding_redeemed_at is null and founding_forfeited_at is null))
    and (founding_status not in ('redeemed', 'forfeited') or founding_redeemed_at is not null)
    and (founding_status <> 'forfeited' or founding_forfeited_at is not null)
    and (founding_forfeited_at is null or founding_redeemed_at is not null)
  );

create index subscriptions_active_founding_reservation_idx
  on public.subscriptions (founding_reserved_until)
  where founding_status = 'eligible';

comment on column public.subscriptions.founding_reserved_until is 'Exclusive expiry of the one-time 14-day Founder reservation.';
comment on column public.subscriptions.founding_redeemed_at is 'First verified activation of the continuing monthly subscription with the configured forever-recurring Founder discount.';
comment on column public.subscriptions.founding_forfeited_at is 'Verified actual cancellation after redemption; the historical Founder seat remains permanently consumed.';

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
  reservation_until timestamptz;
  parent_email text;
begin
  -- Canonical allocation lock is always first.
  select * into settings from public.enrollment_settings
  where key = 'default' for update;
  if settings.key is null then return new; end if;

  select count(*)::integer into active_child_count
  from public.subscriptions as subscription
  join public.children as child on child.id = subscription.child_id
  where subscription.status in ('trialing', 'active', 'past_due')
    and child.is_active and not child.is_internal_test;

  select count(*)::integer into released_child_count
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;

  if active_child_count + released_child_count < settings.capacity then
    if not new.is_internal_test then
      -- Expired reservations do not count; redeemed and forfeited seats always do.
      select count(*)::integer into founding_count
      from public.subscriptions as subscription
      join public.children as child on child.id = subscription.child_id
      where not child.is_internal_test and (
        (subscription.founding_status = 'eligible' and subscription.founding_reserved_until > now())
        or subscription.founding_status in ('redeemed', 'forfeited')
      );
      if founding_count < settings.founding_limit then
        init_founding_status := 'eligible';
        reservation_until := new.created_at + interval '14 days';
      end if;
    end if;

    insert into public.subscriptions (
      child_id, provider, status, founding_status, founding_reserved_until
    ) values (
      new.id, 'beta', 'trialing', init_founding_status, reservation_until
    );
  else
    select email into parent_email from auth.users where id = new.parent_id;
    insert into public.waitlist (parent_id, child_id, email, status)
    values (new.parent_id, new.id, coalesce(parent_email, ''), 'waiting')
    on conflict (child_id) do nothing;
  end if;
  return new;
end;
$$;

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
  if p_user_id is null or p_child_id is null then raise exception 'Authentication and child_id are required'; end if;
  if p_plan_code not in ('standard_monthly', 'standard_annual') then raise exception 'Unsupported subscription plan'; end if;
  if not exists (
    select 1 from public.children where id = p_child_id and parent_id = p_user_id and is_active
  ) then raise exception 'Child not found or not owned by user'; end if;

  -- Canonical lock order: settings -> subscription -> waitlist.
  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then raise exception 'Enrollment settings are missing'; end if;

  -- Locked cleanup is allowed here; get_enrollment_state remains read-only.
  update public.subscriptions as stale_subscription
  set founding_status = 'expired'
  where stale_subscription.founding_status = 'eligible'
    and stale_subscription.founding_reserved_until <= now();

  select * into child_subscription from public.subscriptions where child_id = p_child_id for update;
  select * into waitlist_entry from public.waitlist where child_id = p_child_id for update;

  if waitlist_entry.id is not null and waitlist_entry.status = 'waiting' then
    raise exception '這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。';
  end if;
  if child_subscription.id is null and (waitlist_entry.id is null or waitlist_entry.status not in ('released', 'converted')) then
    raise exception 'Child has no service entitlement';
  end if;
  if child_subscription.provider = 'paddle' and child_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a Paddle subscription';
  end if;

  if p_plan_code = 'standard_annual' then
    return query select false, coalesce(child_subscription.founding_status, 'none');
    return;
  end if;

  -- Only a never-reserved child may obtain its first reservation at checkout.
  if child_subscription.id is not null
    and child_subscription.founding_status = 'none'
    and child_subscription.founding_reserved_until is null
    and child_subscription.founding_redeemed_at is null
    and waitlist_entry.id is null
    and not exists (select 1 from public.children where id = p_child_id and is_internal_test)
  then
    select count(*)::integer into founding_count
    from public.subscriptions as subscription
    join public.children as child on child.id = subscription.child_id
    where not child.is_internal_test and (
      (subscription.founding_status = 'eligible' and subscription.founding_reserved_until > now())
      or subscription.founding_status in ('redeemed', 'forfeited')
    );
    if founding_count < settings.founding_limit then
      update public.subscriptions
      set founding_status = 'eligible', founding_reserved_until = now() + interval '14 days'
      where id = child_subscription.id;
      child_subscription.founding_status := 'eligible';
      child_subscription.founding_reserved_until := now() + interval '14 days';
    end if;
  end if;

  return query select
    child_subscription.founding_status = 'eligible'
      and child_subscription.founding_reserved_until > now(),
    child_subscription.founding_status;
end;
$$;

revoke all on function public.prepare_paddle_checkout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout(uuid, uuid, text) to service_role;

drop function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean
);

create function public.process_paddle_subscription_event(
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
  p_discount_id text,
  p_discount_status text,
  p_discount_type text,
  p_discount_ends_at timestamptz,
  p_discount_ends_at_present boolean
)
returns table (processed boolean, ignored_as_stale boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  existing_subscription public.subscriptions%rowtype;
  child_tz text;
  local_now timestamp;
  next_day_local date;
  release_anchor timestamptz;
  first_material_week date;
  v_waitlist_status text;
  founder_discount_valid boolean;
  next_founding_status text;
  next_redeemed_at timestamptz;
  next_forfeited_at timestamptz;
begin
  if p_event_id is null or p_event_type is null or p_child_id is null
    or p_provider_subscription_id is null or p_provider_customer_id is null
    or nullif(trim(p_expected_founding_discount_id), '') is null then
    raise exception 'Missing required Paddle subscription event fields';
  end if;
  if not (
    (p_plan_code = 'standard_monthly' and p_billing_interval = 'month' and p_price_twd = 499)
    or (p_plan_code = 'standard_annual' and p_billing_interval = 'year' and p_price_twd = 4999)
  ) then raise exception 'Invalid Paddle plan configuration'; end if;
  if not exists (select 1 from public.children where id = p_child_id) then raise exception 'Unknown child_id'; end if;

  founder_discount_valid := p_plan_code = 'standard_monthly'
    and p_discount_id = p_expected_founding_discount_id
    and coalesce(p_discount_status, 'active') = 'active'
    and p_discount_ends_at_present
    and p_discount_ends_at is null
    and (p_discount_type is null or p_discount_type in ('recurring', 'subscription'));

  -- Canonical lock order also covers expiry cleanup and annual release.
  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then raise exception 'Enrollment settings are missing'; end if;
  update public.subscriptions set founding_status = 'expired'
  where founding_status = 'eligible' and founding_reserved_until <= now();
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

  next_founding_status := coalesce(existing_subscription.founding_status, 'none');
  next_redeemed_at := existing_subscription.founding_redeemed_at;
  next_forfeited_at := existing_subscription.founding_forfeited_at;

  if next_founding_status = 'eligible' and p_plan_code = 'standard_annual' and p_status in ('trialing', 'active') then
    next_founding_status := 'expired';
  elsif next_founding_status = 'eligible' and p_status in ('trialing', 'active') then
    if not founder_discount_valid then raise exception 'Founder redemption requires the configured forever-recurring subscription discount'; end if;
    next_founding_status := 'redeemed';
    next_redeemed_at := coalesce(existing_subscription.founding_redeemed_at, p_occurred_at);
  elsif next_founding_status = 'redeemed' and p_status in ('trialing', 'active', 'past_due', 'paused') then
    if not founder_discount_valid then raise exception 'Founder billing integrity failure: expected discount is missing or mismatched'; end if;
  elsif next_founding_status = 'redeemed' and p_status = 'canceled' then
    next_founding_status := 'forfeited';
    next_forfeited_at := coalesce(existing_subscription.founding_forfeited_at, p_occurred_at);
  elsif next_founding_status = 'eligible' and p_status = 'canceled' then
    next_founding_status := 'expired';
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
    founding_forfeited_at = excluded.founding_forfeited_at;

  -- Preserve the current entitlement/job creation contract.
  if p_status in ('trialing', 'active')
    and v_waitlist_status is distinct from 'waiting'
    and not exists (select 1 from public.materials where child_id = p_child_id)
    and not exists (select 1 from public.generation_jobs where child_id = p_child_id) then
    select coalesce(timezone, 'Asia/Taipei') into child_tz
    from public.children where id = p_child_id and is_active;
    if child_tz is not null then
      local_now := now() at time zone child_tz;
      next_day_local := local_now::date + 1;
      first_material_week := next_day_local;
      release_anchor := next_day_local::timestamp at time zone child_tz;
      insert into public.generation_jobs (
        child_id, material_week, rule_version, idempotency_key, status,
        scheduled_for, source_material_id, release_at, feedback_cutoff_at, generation_due_at
      ) values (
        p_child_id, first_material_week, 'curriculum-rules/1.0.0',
        p_child_id::text || ':' || first_material_week::text || ':r1', 'pending',
        date_trunc('second', now()), null, release_anchor,
        release_anchor - interval '48 hours', release_anchor - interval '24 hours'
      ) on conflict (idempotency_key) do nothing;
      update public.children set next_generation_at = release_anchor - interval '24 hours' where id = p_child_id;
    end if;
  end if;
  return query select true, false;
end;
$$;

revoke all on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text, text, text, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text, text, text, timestamptz, boolean
) to service_role;

drop function public.get_enrollment_state();
create function public.get_enrollment_state()
returns table (
  status text, capacity integer, active_count integer, remaining integer,
  founding_limit integer, founding_count integer, waiting_count integer,
  released_count integer, total_demand integer
)
language sql stable security definer set search_path = ''
as $$
  with released_state as (
    select count(*)::integer as released_cnt from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where entry.status = 'released' and not child.is_internal_test
  ), waiting_state as (
    select count(*)::integer as waiting_cnt from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where entry.status = 'waiting' and not child.is_internal_test
  ), service_state as (
    select count(child.id)::integer as active_cnt
    from public.subscriptions as subscription
    join public.children as child on child.id = subscription.child_id
    where subscription.status in ('trialing', 'active', 'past_due') and child.is_active and not child.is_internal_test
  ), founder_state as (
    select count(*)::integer as founding_cnt
    from public.subscriptions as subscription
    join public.children as child on child.id = subscription.child_id
    where not child.is_internal_test and (
      (subscription.founding_status = 'eligible' and subscription.founding_reserved_until > now())
      or subscription.founding_status in ('redeemed', 'forfeited')
    )
  )
  select settings.status, settings.capacity, service.active_cnt,
    greatest(settings.capacity - service.active_cnt - released.released_cnt, 0),
    settings.founding_limit, founder.founding_cnt, waiting.waiting_cnt,
    released.released_cnt, service.active_cnt + waiting.waiting_cnt + released.released_cnt
  from public.enrollment_settings as settings
  cross join service_state as service cross join founder_state as founder
  cross join waiting_state as waiting cross join released_state as released
  where settings.key = 'default';
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;

-- Durable Founder checkout claims close the reservation/Paddle transaction race.
-- Live claims remain counted until completion or verified Paddle neutralization.
create table private_generation.founder_checkout_claims (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  paddle_transaction_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'bound', 'release_pending', 'completed', 'released')),
  reservation_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  bound_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  check (status <> 'pending' or paddle_transaction_id is null),
  check (status not in ('bound', 'release_pending', 'completed') or paddle_transaction_id is not null),
  check (status <> 'completed' or completed_at is not null),
  check (status <> 'released' or released_at is not null)
);

create unique index founder_checkout_claims_one_live_per_child_idx
  on private_generation.founder_checkout_claims(child_id)
  where status in ('pending', 'bound', 'release_pending');
create index founder_checkout_claims_cleanup_idx
  on private_generation.founder_checkout_claims(reservation_expires_at, created_at)
  where status in ('pending', 'bound', 'release_pending');

comment on table private_generation.founder_checkout_claims is
  'Server-only Founder seat claims bound to discounted Paddle checkout transactions. Live claims remain counted until completion or verified Paddle neutralization.';
revoke all on table private_generation.founder_checkout_claims from public, anon, authenticated;

create or replace function private_generation.founding_seat_count()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(distinct seat.child_id)::integer
  from (
    select subscription.child_id
    from public.subscriptions as subscription
    join public.children as child on child.id = subscription.child_id
    where not child.is_internal_test and (
      (subscription.founding_status = 'eligible' and subscription.founding_reserved_until > now())
      or subscription.founding_status in ('redeemed', 'forfeited')
    )
    union
    select claim.child_id
    from private_generation.founder_checkout_claims as claim
    join public.children as child on child.id = claim.child_id
    where not child.is_internal_test
      and claim.status in ('pending', 'bound', 'release_pending')
  ) as seat;
$$;
revoke all on function private_generation.founding_seat_count() from public, anon, authenticated;

create or replace function public.accept_current_terms(p_terms_version text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required to accept current Terms'; end if;
  if trim(coalesce(p_terms_version, '')) <> '2026-08-26-v2' then
    raise exception 'Unsupported Terms version';
  end if;
  update public.profiles
  set terms_version = p_terms_version, legal_accepted_at = now(), updated_at = now()
  where id = v_user_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated, service_role;

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
  update public.subscriptions as stale_subscription
  set founding_status = 'expired'
  where stale_subscription.founding_status = 'eligible'
    and stale_subscription.founding_reserved_until <= now();

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

  if p_plan_code = 'standard_annual' then
    return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text;
    return;
  end if;
  if live_claim.id is not null then
    return query select true, child_subscription.founding_status, live_claim.id, live_claim.paddle_transaction_id;
    return;
  end if;

  if child_subscription.id is not null
    and child_subscription.founding_status = 'none'
    and child_subscription.founding_reserved_until is null
    and child_subscription.founding_redeemed_at is null
    and waitlist_entry.id is null
    and not exists (select 1 from public.children where id = p_child_id and is_internal_test)
  then
    founding_count := private_generation.founding_seat_count();
    if founding_count < settings.founding_limit then
      update public.subscriptions
      set founding_status = 'eligible', founding_reserved_until = now() + interval '14 days'
      where id = child_subscription.id
      returning * into child_subscription;
    end if;
  end if;

  if child_subscription.founding_status = 'eligible'
    and child_subscription.founding_reserved_until > now()
  then
    insert into private_generation.founder_checkout_claims(child_id, reservation_expires_at)
    values (p_child_id, child_subscription.founding_reserved_until)
    returning * into live_claim;
    return query select true, child_subscription.founding_status, live_claim.id, null::text;
    return;
  end if;
  return query select false, coalesce(child_subscription.founding_status, 'none'), null::uuid, null::text;
end;
$$;
revoke all on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout_v2(uuid, uuid, text, text) to service_role;

-- Compatibility entrypoint for the currently deployed checkout. Annual
-- checkout remains available; monthly fails closed until the claim-aware deploy.
create or replace function public.prepare_paddle_checkout(
  p_user_id uuid,
  p_child_id uuid,
  p_plan_code text
)
returns table (founding_applies boolean, founding_status text)
language plpgsql security definer set search_path = ''
as $$
declare prepared record;
begin
  if p_plan_code = 'standard_monthly' then
    raise exception 'Monthly checkout requires the Founder-claim-aware checkout deployment';
  end if;
  select * into prepared from public.prepare_paddle_checkout_v2(
    p_user_id, p_child_id, p_plan_code, '2026-08-26-v2'
  );
  return query select prepared.founding_applies, prepared.founding_status;
end;
$$;
revoke all on function public.prepare_paddle_checkout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout(uuid, uuid, text) to service_role;

create or replace function public.bind_founder_checkout_transaction(
  p_user_id uuid, p_child_id uuid, p_claim_id uuid, p_transaction_id text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare settings public.enrollment_settings%rowtype;
begin
  if trim(coalesce(p_transaction_id, '')) = '' then raise exception 'Paddle transaction_id is required'; end if;
  if not exists (
    select 1 from public.children where id = p_child_id and parent_id = p_user_id
  ) then raise exception 'Child not found or not owned by user'; end if;
  select * into settings from public.enrollment_settings where key = 'default' for update;
  perform 1 from public.subscriptions where child_id = p_child_id for update;
  update private_generation.founder_checkout_claims
  set paddle_transaction_id = p_transaction_id, status = 'bound', bound_at = now()
  where id = p_claim_id and child_id = p_child_id and status = 'pending';
  if not found then raise exception 'Founder checkout claim is not bindable'; end if;
end;
$$;
revoke all on function public.bind_founder_checkout_transaction(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.bind_founder_checkout_transaction(uuid, uuid, uuid, text) to service_role;

create or replace function public.release_founder_checkout_claim(
  p_claim_id uuid, p_transaction_id text, p_release_reason text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  claim private_generation.founder_checkout_claims%rowtype;
begin
  if p_release_reason not in ('not_created', 'discount_removed', 'transaction_canceled') then
    raise exception 'Unsafe Founder claim release reason';
  end if;
  select * into settings from public.enrollment_settings where key = 'default' for update;
  select * into claim from private_generation.founder_checkout_claims where id = p_claim_id for update;
  if claim.id is null or claim.status in ('completed', 'released') then return; end if;
  if claim.paddle_transaction_id is null then
    if p_release_reason = 'not_created' and p_transaction_id is null then
      null;
    elsif p_release_reason = 'discount_removed' and p_transaction_id is not null then
      null;
    else
      raise exception 'Pending claim release is not safely verified';
    end if;
  elsif claim.paddle_transaction_id is distinct from p_transaction_id
    or p_release_reason not in ('discount_removed', 'transaction_canceled') then
    raise exception 'Bound claim release requires verified Paddle neutralization';
  end if;
  update private_generation.founder_checkout_claims
  set status = 'released',
      paddle_transaction_id = coalesce(paddle_transaction_id, p_transaction_id),
      released_at = now(),
      release_reason = p_release_reason
  where id = p_claim_id;
end;
$$;
revoke all on function public.release_founder_checkout_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.release_founder_checkout_claim(uuid, text, text) to service_role;

create or replace function public.claim_expired_founder_checkouts(p_limit integer default 20)
returns table (claim_id uuid, child_id uuid, paddle_transaction_id text)
language plpgsql security definer set search_path = ''
as $$
declare settings public.enrollment_settings%rowtype;
begin
  select * into settings from public.enrollment_settings where key = 'default' for update;
  update private_generation.founder_checkout_claims
  set status = 'released', released_at = now(), release_reason = 'not_created'
  where status = 'pending' and created_at <= now() - interval '10 minutes';
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

-- Retain the 19-argument implementation as the reconciliation core.
alter function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean,
  text, text, text, text, timestamptz, boolean
) rename to process_paddle_subscription_event_v2_base;

create function public.process_paddle_subscription_event_v2(
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
  p_discount_id text,
  p_discount_status text,
  p_discount_type text,
  p_discount_ends_at timestamptz,
  p_discount_ends_at_present boolean,
  p_founder_claim_id uuid,
  p_originating_transaction_id text
)
returns table (processed boolean, ignored_as_stale boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  existing_subscription public.subscriptions%rowtype;
  founder_claim private_generation.founder_checkout_claims%rowtype;
  result record;
begin
  select * into settings from public.enrollment_settings where key = 'default' for update;
  select * into existing_subscription from public.subscriptions where child_id = p_child_id for update;

  if p_plan_code = 'standard_annual' and p_discount_id = p_expected_founding_discount_id then
    raise exception 'Annual subscription must not carry the Founder discount';
  end if;

  if p_founder_claim_id is not null then
    select * into founder_claim
    from private_generation.founder_checkout_claims
    where id = p_founder_claim_id and child_id = p_child_id
    for update;
  end if;

  if p_plan_code = 'standard_monthly'
    and p_status in ('trialing', 'active')
    and p_discount_id = p_expected_founding_discount_id
    and coalesce(existing_subscription.founding_status, 'none') in ('eligible', 'expired')
  then
    if founder_claim.id is null or founder_claim.status <> 'bound'
      or p_event_type <> 'subscription.created'
      or founder_claim.paddle_transaction_id is distinct from p_originating_transaction_id then
      raise exception 'Founder redemption requires the exact claimed Paddle transaction';
    end if;
    -- The claim, rather than wall-clock eligibility, is authoritative for this
    -- one transaction. Restore eligible only inside this locked transaction so
    -- the existing discount validator can perform the normal redeemed transition.
    update public.subscriptions
    set founding_status = 'eligible',
        founding_reserved_until = greatest(founding_reserved_until, now() + interval '1 minute')
    where child_id = p_child_id;
  elsif coalesce(existing_subscription.founding_status, 'none') in ('eligible', 'expired')
    and p_discount_id = p_expected_founding_discount_id
    and p_status in ('trialing', 'active')
  then
    raise exception 'Founder discount cannot be redeemed without its transaction claim';
  end if;

  select * into result from public.process_paddle_subscription_event_v2_base(
    p_event_id, p_event_type, p_occurred_at, p_child_id,
    p_provider_subscription_id, p_provider_customer_id, p_status,
    p_plan_code, p_billing_interval, p_price_twd,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_expected_founding_discount_id, p_discount_id, p_discount_status,
    p_discount_type, p_discount_ends_at, p_discount_ends_at_present
  );

  if founder_claim.id is not null and result.processed and not result.ignored_as_stale
    and p_plan_code = 'standard_monthly' and p_status in ('trialing', 'active')
  then
    update private_generation.founder_checkout_claims
    set status = 'completed', completed_at = coalesce(completed_at, p_occurred_at)
    where id = founder_claim.id and status = 'bound';
  end if;
  return query select result.processed, result.ignored_as_stale;
end;
$$;
revoke all on function public.process_paddle_subscription_event_v2(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean,
  text, text, text, text, timestamptz, boolean, uuid, text
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event_v2(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean,
  text, text, text, text, timestamptz, boolean, uuid, text
) to service_role;

-- Compatibility overload for code built from the first Founder branch revision.
-- It can reconcile non-claim events, but cannot redeem an expired/eligible
-- Founder because the v2 function receives no claim identity.
create function public.process_paddle_subscription_event(
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
  p_discount_id text,
  p_discount_status text,
  p_discount_type text,
  p_discount_ends_at timestamptz,
  p_discount_ends_at_present boolean
)
returns table (processed boolean, ignored_as_stale boolean)
language sql security definer set search_path = ''
as $$
  select * from public.process_paddle_subscription_event_v2(
    p_event_id, p_event_type, p_occurred_at, p_child_id,
    p_provider_subscription_id, p_provider_customer_id, p_status,
    p_plan_code, p_billing_interval, p_price_twd,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_expected_founding_discount_id, p_discount_id, p_discount_status,
    p_discount_type, p_discount_ends_at, p_discount_ends_at_present, null, null
  );
$$;
revoke all on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean,
  text, text, text, text, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean,
  text, text, text, text, timestamptz, boolean
) to service_role;

-- Compatibility path for the currently deployed 13-argument webhook.
-- Potential Founder redemptions and annual events fail closed for Paddle retry
-- after the v2 Edge Function deploy; safe standard-monthly and cancellation
-- reconciliation continues during the database-first cutover.
create function public.process_paddle_subscription_event(
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
language plpgsql security definer set search_path = ''
as $$
declare existing_subscription public.subscriptions%rowtype;
begin
  select * into existing_subscription from public.subscriptions where child_id = p_child_id;
  if p_plan_code = 'standard_annual'
    or (coalesce(existing_subscription.founding_status, 'none') in ('eligible', 'redeemed')
      and p_status <> 'canceled') then
    raise exception 'This event requires the claim-aware webhook deployment';
  end if;
  return query select * from public.process_paddle_subscription_event_v2_base(
    p_event_id, p_event_type, p_occurred_at, p_child_id,
    p_provider_subscription_id, p_provider_customer_id, p_status,
    p_plan_code, p_billing_interval, p_price_twd,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    'legacy-no-founder', null, null, null, null, false
  );
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

create or replace function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  founding_count integer;
  active_child_count integer;
  released_child_count integer;
  init_founding_status text := 'none';
  reservation_until timestamptz;
  parent_email text;
begin
  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then return new; end if;
  select count(*)::integer into active_child_count
  from public.subscriptions subscription join public.children child on child.id = subscription.child_id
  where subscription.status in ('trialing', 'active', 'past_due')
    and child.is_active and not child.is_internal_test;
  select count(*)::integer into released_child_count
  from public.waitlist entry join public.children child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;
  if active_child_count + released_child_count < settings.capacity then
    if not new.is_internal_test then
      founding_count := private_generation.founding_seat_count();
      if founding_count < settings.founding_limit then
        init_founding_status := 'eligible';
        reservation_until := new.created_at + interval '14 days';
      end if;
    end if;
    insert into public.subscriptions(child_id, provider, status, founding_status, founding_reserved_until)
    values (new.id, 'beta', 'trialing', init_founding_status, reservation_until);
  else
    select email into parent_email from auth.users where id = new.parent_id;
    insert into public.waitlist(parent_id, child_id, email, status)
    values (new.parent_id, new.id, coalesce(parent_email, ''), 'waiting')
    on conflict (child_id) do nothing;
  end if;
  return new;
end;
$$;

drop function public.get_enrollment_state();
create function public.get_enrollment_state()
returns table (
  status text, capacity integer, active_count integer, remaining integer,
  founding_limit integer, founding_count integer, waiting_count integer,
  released_count integer, total_demand integer
)
language sql stable security definer set search_path = ''
as $$
  with released_state as (
    select count(*)::integer released_cnt from public.waitlist entry
    join public.children child on child.id = entry.child_id
    where entry.status = 'released' and not child.is_internal_test
  ), waiting_state as (
    select count(*)::integer waiting_cnt from public.waitlist entry
    join public.children child on child.id = entry.child_id
    where entry.status = 'waiting' and not child.is_internal_test
  ), service_state as (
    select count(child.id)::integer active_cnt
    from public.subscriptions subscription join public.children child on child.id = subscription.child_id
    where subscription.status in ('trialing', 'active', 'past_due')
      and child.is_active and not child.is_internal_test
  )
  select settings.status, settings.capacity, service.active_cnt,
    greatest(settings.capacity - service.active_cnt - released.released_cnt, 0),
    settings.founding_limit, private_generation.founding_seat_count(),
    waiting.waiting_cnt, released.released_cnt,
    service.active_cnt + waiting.waiting_cnt + released.released_cnt
  from public.enrollment_settings settings
  cross join service_state service cross join waiting_state waiting cross join released_state released
  where settings.key = 'default';
$$;
revoke all on function public.get_enrollment_state() from public, anon;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;
