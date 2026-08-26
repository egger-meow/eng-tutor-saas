-- Migration: Reframe service capacity as a soft operational enrollment gate
-- 1. Count Paddle paused subscriptions in locked_capacity_count (paused customers retain service continuity)
-- 2. Keep canceled Paddle subscriptions excluded from occupancy
-- 3. Canceled Paddle customers can re-subscribe without requiring a capacity checkout claim

create or replace function private_generation.locked_capacity_count()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  with occupied_children as (
    -- 1. Active, trialing, past_due, or paused Paddle subscriptions
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due', 'paused')

    union

    -- 2. Valid unexpired beta trials
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'beta' and sub.status = 'trialing'
      and coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()

    union

    -- 3. Released waitlist entries
    select child.id as child_id
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where not child.is_internal_test
      and entry.status = 'released'

    union

    -- 4. Unresolved capacity checkout claims (pending unexpired, bound, release_pending)
    select child.id as child_id
    from private_generation.capacity_checkout_claims as claim
    join public.children as child on child.id = claim.child_id
    where not child.is_internal_test
      and (
        (claim.status = 'pending' and claim.reservation_expires_at > now())
        or claim.status in ('bound', 'release_pending')
      )
  )
  select count(distinct child_id)::integer into v_count from occupied_children;

  return coalesce(v_count, 0);
end;
$$;
revoke all on function private_generation.locked_capacity_count() from public, anon, authenticated;
grant execute on function private_generation.locked_capacity_count() to service_role;

-- Update get_enrollment_state to report honest unclamped active_count
drop function if exists public.get_enrollment_state();
create or replace function public.get_enrollment_state()
returns table (
  status text,
  capacity integer,
  active_count integer,
  remaining integer,
  founding_limit integer,
  founding_count integer,
  waiting_count integer,
  released_count integer,
  total_demand integer
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  occupied_count integer;
  founder_count integer;
  v_waiting integer;
  v_released integer;
begin
  select * into settings from public.enrollment_settings where key = 'default';
  if settings.key is null then raise exception 'Enrollment settings not found'; end if;

  occupied_count := private_generation.locked_capacity_count();
  founder_count := private_generation.founding_seat_count();

  select count(*)::integer into v_waiting
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'waiting' and not child.is_internal_test;

  select count(*)::integer into v_released
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;

  return query select
    settings.status,
    settings.capacity,
    occupied_count,
    greatest(settings.capacity - occupied_count, 0) as remaining,
    settings.founding_limit,
    founder_count,
    v_waiting,
    v_released,
    occupied_count + v_waiting + v_released as total_demand;
end;
$$;
revoke all on function public.get_enrollment_state() from public, anon, authenticated;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;
