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
