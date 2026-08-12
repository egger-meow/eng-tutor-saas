drop function if exists public.worker_fail_generation_job(uuid, text, text, text);

create function public.worker_fail_generation_job(
  job_id uuid,
  worker_id text,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generation_jobs as job
  set status = 'failed',
      lease_expires_at = null,
      error_code = left(p_error_code, 100),
      error_message = left(p_error_message, 2000)
  where job.id = $1
    and job.status = 'claimed'
    and job.claimed_by = $2;
  return found;
end;
$$;

revoke all on function public.worker_fail_generation_job(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.worker_fail_generation_job(uuid, text, text, text) to service_role;
