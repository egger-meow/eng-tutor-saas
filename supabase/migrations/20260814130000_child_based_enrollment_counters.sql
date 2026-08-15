drop function if exists public.get_enrollment_state();

create function public.get_enrollment_state()
returns table (status text, capacity integer, active_count integer, remaining integer, founding_limit integer, founding_count integer)
language sql stable security definer set search_path = ''
as $$
  select settings.status, settings.capacity,
    count(child.id)::integer,
    greatest(settings.capacity - count(child.id)::integer, 0),
    settings.founding_limit,
    count(child.id) filter (where subscription.founding_status in ('eligible', 'redeemed'))::integer
  from public.enrollment_settings as settings
  left join public.subscriptions as subscription on subscription.status in ('trialing', 'active', 'past_due')
  left join public.children as child on child.id = subscription.child_id and child.is_active
  where settings.key = 'default'
  group by settings.status, settings.capacity, settings.founding_limit;
$$;

comment on function public.get_enrollment_state() is 'Anonymous-safe enrollment aggregate counted by active child, including founding child count.';
revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated;
