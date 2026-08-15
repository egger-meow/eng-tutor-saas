alter table public.subscriptions
  add column billing_interval text;

alter table public.subscriptions
  add constraint subscriptions_billing_interval_check
  check (billing_interval is null or billing_interval in ('month', 'year'));

update public.subscriptions
set billing_interval = 'month'
where plan_code = 'standard_monthly';

drop function public.prepare_paddle_checkout(uuid, uuid);

create function public.prepare_paddle_checkout(
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

  if child_subscription.id is null then
    raise exception 'Child has no service entitlement';
  end if;

  if child_subscription.provider = 'paddle'
    and child_subscription.status in ('active', 'past_due', 'paused') then
    raise exception 'Child already has a Paddle subscription';
  end if;

  if p_plan_code = 'standard_annual' then
    return query select false, child_subscription.founding_status;
    return;
  end if;

  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is null then
    raise exception 'Enrollment settings are missing';
  end if;

  if child_subscription.founding_status = 'none' then
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
    child_subscription.founding_status = 'eligible',
    child_subscription.founding_status;
end;
$$;

revoke all on function public.prepare_paddle_checkout(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout(uuid, uuid, text)
to service_role;

drop function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  timestamptz, timestamptz, boolean
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
  p_cancel_at_period_end boolean
)
returns table (processed boolean, ignored_as_stale boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_event_at timestamptz;
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

  -- Serialize all subscription events for one child before checking whether a
  -- different Paddle subscription may replace the current provider identity.
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
