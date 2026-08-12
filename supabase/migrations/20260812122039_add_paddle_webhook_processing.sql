alter table public.subscriptions
  add column provider_event_at timestamptz;

-- One Paddle customer (the parent payer) may own several independent child subscriptions.
drop index if exists public.subscriptions_provider_customer_idx;
create index subscriptions_provider_customer_idx
  on public.subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;

create table public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz not null,
  provider_subscription_id text,
  child_id uuid references public.children (id) on delete set null,
  ignored_as_stale boolean not null default false,
  processed_at timestamptz not null default now(),
  check (char_length(event_id) between 1 and 120),
  check (char_length(event_type) between 1 and 120)
);

alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from public, anon, authenticated;
grant select, insert on public.billing_webhook_events to service_role;

create function public.process_paddle_subscription_event(
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
    child_id,
    provider,
    provider_customer_id,
    provider_subscription_id,
    status,
    plan_code,
    price_twd,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    provider_event_at
  ) values (
    p_child_id,
    'paddle',
    p_provider_customer_id,
    p_provider_subscription_id,
    p_status,
    'standard_monthly',
    499,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_occurred_at
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
    provider_event_at = excluded.provider_event_at;

  return query select true, false;
end;
$$;

revoke all on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  timestamptz, timestamptz, boolean
) to service_role;
