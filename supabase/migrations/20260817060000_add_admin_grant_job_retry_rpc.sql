-- Migration: Add admin_grant_job_retry RPC for human review operator controls

create or replace function public.admin_grant_job_retry(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_prev_max integer;
  v_new_max integer;
  v_now timestamptz := now();
begin
  if p_job_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'INVALID_JOB_ID',
      'message', 'Job ID is required'
    );
  end if;

  -- 1. Lock and validate the target generation job
  select * into v_job
  from public.generation_jobs
  where id = p_job_id
  for update;

  -- 2. Reject if job does not exist
  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'JOB_NOT_FOUND',
      'message', 'Generation job not found'
    );
  end if;

  -- 3. Reject if already completed
  if v_job.status = 'completed' then
    return jsonb_build_object(
      'success', false,
      'error', 'JOB_ALREADY_COMPLETED',
      'message', 'Completed job cannot be reopened for retry'
    );
  end if;

  -- 4. Reject if it currently has an active valid lease
  if v_job.status = 'claimed' and v_job.lease_expires_at is not null and v_job.lease_expires_at > v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'ACTIVE_LEASE_IN_PROGRESS',
      'message', 'Job currently has an active processing lease in progress. Please wait for lease expiry or worker completion.'
    );
  end if;

  v_prev_max := coalesce(v_job.max_attempts, 3);
  v_new_max := v_prev_max + 1;

  -- 5. Increment max_attempts by exactly 1, preserve attempt_count, and requeue to pending
  update public.generation_jobs
  set max_attempts = v_new_max,
      status = 'pending',
      claimed_by = null,
      lease_expires_at = null,
      error_code = null,
      error_message = null,
      updated_at = v_now
  where id = p_job_id;

  return jsonb_build_object(
    'success', true,
    'jobId', p_job_id,
    'previousMaxAttempts', v_prev_max,
    'newMaxAttempts', v_new_max,
    'attemptCount', v_job.attempt_count,
    'status', 'pending',
    'timestamp', v_now
  );
end;
$$;

revoke all on function public.admin_grant_job_retry(uuid) from public, anon, authenticated;
grant execute on function public.admin_grant_job_retry(uuid) to service_role;
