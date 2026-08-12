create or replace function public.worker_quality_trends(child_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'dimension', dimension,
    'severity', severity,
    'count', count,
    'lastObservedAt', last_observed_at
  ) order by count desc, last_observed_at desc), '[]'::jsonb)
  from (
    select dimension, severity, count(*)::integer as count, max(created_at) as last_observed_at
    from public.curriculum_quality_observations
    where worker_quality_trends.child_id = curriculum_quality_observations.child_id
      and created_at >= now() - interval '90 days'
    group by dimension, severity
  ) as trends;
$$;

revoke all on function public.worker_quality_trends(uuid) from public, anon, authenticated;
grant execute on function public.worker_quality_trends(uuid) to service_role;
