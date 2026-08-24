create table public.subscription_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  event_type text not null check (event_type in ('trial_started', 'activated', 'renewed', 'cancel_scheduled', 'resumed', 'past_due', 'paused', 'canceled', 'expired')),
  source text not null check (source in ('paddle_webhook', 'internal_beta', 'internal_billing_action')),
  source_event_id text,
  effective_at timestamptz not null,
  observed_status public.subscription_status not null,
  plan_code text,
  billing_interval text,
  price_twd integer check (price_twd is null or price_twd >= 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create unique index subscription_lifecycle_events_source_event_type_uidx
  on public.subscription_lifecycle_events(source, source_event_id, event_type) where source_event_id is not null;
create index subscription_lifecycle_events_effective_at_idx on public.subscription_lifecycle_events(effective_at desc);
create index subscription_lifecycle_events_child_effective_idx on public.subscription_lifecycle_events(child_id, effective_at desc);

alter table public.subscription_lifecycle_events enable row level security;
revoke all on table public.subscription_lifecycle_events from public, anon, authenticated;
grant select, insert on table public.subscription_lifecycle_events to service_role;

create function private_generation.capture_subscription_lifecycle_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lifecycle_type text;
  lifecycle_source text;
  lifecycle_source_event_id text;
  lifecycle_effective_at timestamptz;
begin
  if new.provider = 'internal_test' then return new; end if;
  if tg_op = 'INSERT' then
    lifecycle_type := case new.status when 'trialing' then 'trial_started' when 'active' then 'activated'
      when 'past_due' then 'past_due' when 'paused' then 'paused' when 'canceled' then 'canceled' else null end;
  elsif not coalesce(old.cancel_at_period_end, false) and coalesce(new.cancel_at_period_end, false) then
    lifecycle_type := 'cancel_scheduled';
  elsif old.status is distinct from new.status then
    lifecycle_type := case when new.status = 'trialing' then 'trial_started'
      when new.status = 'active' and old.status = 'trialing' then 'activated'
      when new.status = 'active' then 'resumed' when new.status = 'past_due' then 'past_due'
      when new.status = 'paused' then 'paused' when new.status = 'canceled' then 'canceled' else null end;
  elsif new.status = 'active' and new.current_period_end is not null
    and (old.current_period_end is null or new.current_period_end > old.current_period_end) then
    lifecycle_type := 'renewed';
  end if;
  if lifecycle_type is null then return new; end if;
  if new.provider = 'paddle' and (tg_op = 'INSERT' or new.provider_event_at is distinct from old.provider_event_at) then
    lifecycle_source := 'paddle_webhook';
    lifecycle_effective_at := coalesce(new.provider_event_at, now());
    select event.event_id into lifecycle_source_event_id from public.billing_webhook_events as event
    where event.child_id = new.child_id and event.provider_subscription_id = new.provider_subscription_id
      and event.occurred_at = new.provider_event_at order by event.occurred_at desc, event.event_id desc limit 1;
  elsif new.provider = 'beta' then
    lifecycle_source := 'internal_beta';
    lifecycle_effective_at := now();
    lifecycle_source_event_id := 'subscription:' || new.id::text || ':' || lifecycle_type;
  else
    lifecycle_source := 'internal_billing_action';
    lifecycle_effective_at := now();
    lifecycle_source_event_id := null;
  end if;
  insert into public.subscription_lifecycle_events (
    subscription_id, child_id, event_type, source, source_event_id, effective_at, observed_status,
    plan_code, billing_interval, price_twd, current_period_start, current_period_end, cancel_at_period_end
  ) values (
    new.id, new.child_id, lifecycle_type, lifecycle_source, lifecycle_source_event_id, lifecycle_effective_at,
    new.status, new.plan_code, new.billing_interval, new.price_twd, new.current_period_start,
    new.current_period_end, coalesce(new.cancel_at_period_end, false)
  ) on conflict do nothing;
  return new;
end;
$$;
revoke all on function private_generation.capture_subscription_lifecycle_event() from public, anon, authenticated;
create trigger capture_subscription_lifecycle_event after insert or update on public.subscriptions
for each row execute function private_generation.capture_subscription_lifecycle_event();

comment on table public.subscription_lifecycle_events is
  'Append-only observed subscription lifecycle truth. No historical events are fabricated before instrumentation.';
