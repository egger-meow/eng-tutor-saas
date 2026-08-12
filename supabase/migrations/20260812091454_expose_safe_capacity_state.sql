create or replace function public.get_enrollment_state()
returns table (status text, capacity integer, active_count integer, remaining integer, founding_limit integer)
language sql stable security definer set search_path = ''
as $$
  select settings.status, settings.capacity,
    count(subscription.id)::integer,
    greatest(settings.capacity - count(subscription.id)::integer, 0),
    settings.founding_limit
  from public.enrollment_settings as settings
  left join public.subscriptions as subscription
    on subscription.status in ('trialing', 'active', 'past_due')
  left join public.children as child
    on child.id = subscription.child_id and child.is_active
  where settings.key = 'default' and (subscription.id is null or child.id is not null)
  group by settings.status, settings.capacity, settings.founding_limit;
$$;

comment on function public.get_enrollment_state() is
  'Anonymous-safe enrollment aggregate. Returns no child or parent identifiers.';
revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated;
