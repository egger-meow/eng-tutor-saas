create function public.worker_completed_generation_context(
  job_id uuid,
  worker_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_job public.generation_jobs;
begin
  select * into completed_job
  from public.generation_jobs as job
  where job.id = $1
    and job.status = 'completed'
    and job.claimed_by = $2
    and job.material_id is not null;

  if completed_job.id is null then
    raise exception 'completed job is not recoverable by this worker';
  end if;

  return jsonb_build_object(
    'job', jsonb_build_object(
      'id', completed_job.id,
      'childId', completed_job.child_id,
      'materialWeek', completed_job.material_week,
      'ruleVersion', completed_job.rule_version,
      'releaseAt', completed_job.release_at,
      'recoveryCompleted', true
    ),
    'completedMaterialId', completed_job.material_id
  );
end;
$$;

revoke all on function public.worker_completed_generation_context(uuid, text)
from public, anon, authenticated;
grant execute on function public.worker_completed_generation_context(uuid, text)
to service_role;
