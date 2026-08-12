create or replace function public.prepare_paddle_checkout(
  p_user_id uuid,
  p_child_id uuid
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

revoke all on function public.prepare_paddle_checkout(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.prepare_paddle_checkout(uuid, uuid)
to service_role;

create or replace function public.process_paddle_subscription_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_child_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_status public.subscription_status,
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

  if not exists (select 1 from public.children where id = p_child_id) then
    raise exception 'Unknown child_id';
  end if;

  if exists (
    select 1 from public.subscriptions
    where provider_subscription_id = p_provider_subscription_id
      and child_id <> p_child_id
  ) then
    raise exception 'Paddle subscription is already assigned to another child';
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

  select provider_event_at into existing_event_at
  from public.subscriptions
  where child_id = p_child_id
  for update;

  if existing_event_at is not null and p_occurred_at < existing_event_at then
    update public.billing_webhook_events
    set ignored_as_stale = true
    where event_id = p_event_id;
    return query select true, true;
    return;
  end if;

  insert into public.subscriptions (
    child_id, provider, provider_customer_id, provider_subscription_id, status,
    plan_code, price_twd, current_period_start, current_period_end,
    cancel_at_period_end, provider_event_at
  ) values (
    p_child_id, 'paddle', p_provider_customer_id, p_provider_subscription_id,
    p_status, 'standard_monthly', 499, p_current_period_start,
    p_current_period_end, p_cancel_at_period_end, p_occurred_at
  )
  on conflict (child_id) do update set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    status = excluded.status,
    plan_code = excluded.plan_code,
    price_twd = excluded.price_twd,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider_event_at = excluded.provider_event_at,
    founding_status = case
      when public.subscriptions.founding_status = 'eligible'
        and excluded.status in ('trialing', 'active')
      then 'redeemed'
      else public.subscriptions.founding_status
    end;

  return query select true, false;
end;
$$;
