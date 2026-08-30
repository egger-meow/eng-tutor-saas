-- 20260831020000_add_first_party_funnel_analytics.sql
-- First-party conversion funnel analytics store and RPC

create table public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (
    event_name in (
      'landing_view',
      'sample_click',
      'free_trial_click',
      'email_submit',
      'auth_complete',
      'child_form_start',
      'child_created',
      'onboarding_complete'
    )
  ),
  anonymous_id text not null check (char_length(anonymous_id) <= 64),
  user_id uuid references auth.users(id) on delete set null,
  child_id uuid references public.children(id) on delete set null,
  session_id text check (session_id is null or char_length(session_id) <= 64),
  path text check (path is null or char_length(path) <= 512),
  referrer text check (referrer is null or char_length(referrer) <= 1024),
  utm_source text check (utm_source is null or char_length(utm_source) <= 256),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 256),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 256),
  utm_content text check (utm_content is null or char_length(utm_content) <= 256),
  device_class text check (device_class is null or device_class in ('desktop', 'mobile', 'tablet', 'unknown')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index funnel_events_created_at_idx on public.funnel_events(created_at desc);
create index funnel_events_event_name_created_idx on public.funnel_events(event_name, created_at desc);
create index funnel_events_anonymous_id_idx on public.funnel_events(anonymous_id);
create index funnel_events_user_id_idx on public.funnel_events(user_id) where user_id is not null;
create index funnel_events_child_id_idx on public.funnel_events(child_id) where child_id is not null;

alter table public.funnel_events enable row level security;
revoke all on table public.funnel_events from public, anon, authenticated;
grant select, insert on table public.funnel_events to service_role;

create or replace function public.record_funnel_event(
  p_event_name text,
  p_anonymous_id text,
  p_path text default null,
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_device_class text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_session_id text default null,
  p_child_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_event_id uuid;
  v_clean_metadata jsonb;
  v_child_id uuid;
begin
  if p_event_name is null or p_event_name not in (
    'landing_view',
    'sample_click',
    'free_trial_click',
    'email_submit',
    'auth_complete',
    'child_form_start',
    'child_created',
    'onboarding_complete'
  ) then
    raise exception 'INVALID_EVENT_NAME';
  end if;

  if p_anonymous_id is null or trim(p_anonymous_id) = '' or char_length(trim(p_anonymous_id)) > 64 then
    raise exception 'INVALID_ANONYMOUS_ID';
  end if;

  -- Automatically bind authenticated user_id if present
  v_user_id := auth.uid();

  -- Verify child ownership if child_id is passed and user is authenticated
  if p_child_id is not null then
    if v_user_id is not null then
      select id into v_child_id from public.children
      where id = p_child_id and parent_id = v_user_id limit 1;
    else
      v_child_id := null;
    end if;
  else
    v_child_id := null;
  end if;

  -- Sanitize metadata: ensure json object, strip any accidental raw PII keys
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    v_clean_metadata := '{}'::jsonb;
  else
    v_clean_metadata := p_metadata - array['ip', 'email', 'name', 'phone', 'address', 'password', 'child_name', 'raw_ip'];
  end if;

  insert into public.funnel_events (
    event_name,
    anonymous_id,
    user_id,
    child_id,
    session_id,
    path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    device_class,
    metadata
  ) values (
    p_event_name,
    trim(p_anonymous_id),
    v_user_id,
    v_child_id,
    nullif(trim(p_session_id), ''),
    nullif(trim(p_path), ''),
    nullif(trim(p_referrer), ''),
    nullif(trim(p_utm_source), ''),
    nullif(trim(p_utm_medium), ''),
    nullif(trim(p_utm_campaign), ''),
    nullif(trim(p_utm_content), ''),
    case when p_device_class in ('desktop', 'mobile', 'tablet') then p_device_class else 'unknown' end,
    v_clean_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.record_funnel_event(
  text, text, text, text, text, text, text, text, text, jsonb, text, uuid
) from public;

grant execute on function public.record_funnel_event(
  text, text, text, text, text, text, text, text, text, jsonb, text, uuid
) to anon, authenticated, service_role;

comment on table public.funnel_events is
  'Privacy-safe first-party conversion funnel analytics store. Direct select is restricted to service_role.';
