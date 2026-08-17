-- Admin observability functions for service_role to query curriculum submissions and finisher telemetry

create or replace function public.admin_get_curriculum_submissions(
  p_job_id uuid default null,
  p_limit integer default 200
)
returns table (
  job_id uuid,
  authoring_attempt integer,
  generation_worker_id text,
  processor_id text,
  status text,
  error_code text,
  error_message text,
  failure_evidence jsonb,
  submitted_at timestamptz,
  processed_at timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    sub.job_id,
    sub.authoring_attempt,
    sub.generation_worker_id,
    sub.processor_id,
    sub.status,
    sub.error_code,
    sub.error_message,
    sub.failure_evidence,
    sub.submitted_at,
    sub.processed_at,
    sub.attempt_count
  from private_generation.curriculum_submissions as sub
  where (p_job_id is null or sub.job_id = p_job_id)
  order by sub.submitted_at desc, sub.authoring_attempt desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

revoke all on function public.admin_get_curriculum_submissions(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_curriculum_submissions(uuid, integer) to service_role;

create or replace function public.admin_get_finisher_stats()
returns table (
  pending_count integer,
  processing_count integer,
  completed_count integer,
  quality_rejected_count integer,
  technical_failed_count integer,
  total_submissions integer
)
language sql
security definer
set search_path = ''
as $$
  select
    count(*) filter (where status = 'pending')::integer as pending_count,
    count(*) filter (where status = 'processing')::integer as processing_count,
    count(*) filter (where status = 'completed')::integer as completed_count,
    count(*) filter (where status = 'quality_rejected')::integer as quality_rejected_count,
    count(*) filter (where status = 'technical_failed')::integer as technical_failed_count,
    count(*)::integer as total_submissions
  from private_generation.curriculum_submissions;
$$;

revoke all on function public.admin_get_finisher_stats() from public, anon, authenticated;
grant execute on function public.admin_get_finisher_stats() to service_role;
