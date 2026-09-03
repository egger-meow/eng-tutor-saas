-- Extend first-party analytics for returning-parent landing flows and child lifecycle actions.

alter table public.funnel_events
  drop constraint if exists funnel_events_event_name_check;

alter table public.funnel_events
  add constraint funnel_events_event_name_check check (
    event_name in (
      'landing_view',
      'sample_click',
      'free_trial_click',
      'email_submit',
      'auth_complete',
      'child_form_start',
      'child_created',
      'onboarding_complete',
      'existing_parent_detected',
      'additional_child_confirmed',
      'pending_onboarding_discarded',
      'child_archived'
    )
  );

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
    'onboarding_complete',
    'existing_parent_detected',
    'additional_child_confirmed',
    'pending_onboarding_discarded',
    'child_archived'
  ) then
    raise exception 'INVALID_EVENT_NAME';
  end if;

  if p_anonymous_id is null or trim(p_anonymous_id) = '' or char_length(trim(p_anonymous_id)) > 64 then
    raise exception 'INVALID_ANONYMOUS_ID';
  end if;

  v_user_id := auth.uid();

  if p_child_id is not null then
    if v_user_id is not null then
      select id into v_child_id
      from public.children
      where id = p_child_id and parent_id = v_user_id
      limit 1;
    else
      v_child_id := null;
    end if;
  else
    v_child_id := null;
  end if;

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
