-- Migration: 20260911140000_gate_rolling_active_to_pilot_active.sql
-- Description:
--   Gates private_generation.rolling_active_service_child_count(interval) Free Pilot branch
--   to strictly require that Free Pilot is active (v_pilot_ended IS NULL AND v_pilot_enabled).
--   This ensures post-cutover historical unpaid children whose parents log in do NOT count as
--   active service children, preserving strict semantic symmetry between rolling active count,
--   operational occupancy, and generation entitlement.

drop function if exists private_generation.rolling_active_service_child_count(interval);

create or replace function private_generation.rolling_active_service_child_count(
  p_window_interval interval default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interval interval;
  v_pilot_ended timestamptz;
  v_pilot_enabled boolean;
  v_count integer;
begin
  select
    free_pilot_ended_at,
    coalesce(free_pilot_enabled, true),
    case
      when p_window_interval is not null then p_window_interval
      else (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
    end
  into v_pilot_ended, v_pilot_enabled, v_interval
  from public.enrollment_settings
  where key = 'default';

  with active_service_children as (
    -- 1. Free Pilot service eligible children whose parent engaged within the rolling window
    -- Authority: rooted solely in historical_pilot_admissions while pilot is active, independent of mutable subscription row.
    select child.id as child_id
    from public.children as child
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    where child.is_active
      and not child.is_internal_test
      and v_pilot_ended is null
      and v_pilot_enabled
      and exists (
        select 1 from private_generation.historical_pilot_admissions as h
        where h.child_id = child.id
      )
      and not exists (
        select 1 from public.waitlist as w
        where w.child_id = child.id and w.status = 'waiting'
      )
      and parent_profile.last_active_at is not null
      and parent_profile.last_active_at >= now() - v_interval

    union

    -- 2. Active Paddle subscriptions whose parent engaged within the rolling window
    select child.id as child_id
    from public.children as child
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    join public.subscriptions as sub on sub.child_id = child.id
    where child.is_active
      and not child.is_internal_test
      and sub.provider = 'paddle'
      and sub.status in ('trialing', 'active', 'past_due')
      and parent_profile.last_active_at is not null
      and parent_profile.last_active_at >= now() - v_interval
  )
  select count(distinct child_id)::integer into v_count
  from active_service_children;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function private_generation.rolling_active_service_child_count(interval) from public, anon, authenticated;
grant execute on function private_generation.rolling_active_service_child_count(interval) to service_role;
