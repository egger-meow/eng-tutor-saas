-- Migration: Add admin_requeue_curriculum_submission RPC for Finisher reprocessing of immutable submissions

create or replace function public.admin_requeue_curriculum_submission(
  p_job_id uuid,
  p_authoring_attempt integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub private_generation.curriculum_submissions%rowtype;
  v_job public.generation_jobs%rowtype;
  v_now timestamptz := now();
  v_attempt integer;
begin
  if p_job_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'INVALID_JOB_ID',
      'message', 'Job ID is required'
    );
  end if;

  -- 1. Identify target submission
  if p_authoring_attempt is not null then
    select * into v_sub
    from private_generation.curriculum_submissions
    where job_id = p_job_id and authoring_attempt = p_authoring_attempt
    for update;
  else
    select * into v_sub
    from private_generation.curriculum_submissions
    where job_id = p_job_id
    order by authoring_attempt desc
    limit 1
    for update;
  end if;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'SUBMISSION_NOT_FOUND',
      'message', 'Curriculum submission not found for given job'
    );
  end if;

  v_attempt := v_sub.authoring_attempt;

  -- 2. Lock and validate the generation job
  select * into v_job
  from public.generation_jobs
  where id = p_job_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'JOB_NOT_FOUND',
      'message', 'Generation job not found'
    );
  end if;

  if v_job.status = 'completed' then
    return jsonb_build_object(
      'success', false,
      'error', 'JOB_ALREADY_COMPLETED',
      'message', 'Completed job cannot be requeued'
    );
  end if;

  -- 3. Reset submission to pending for finisher pickup
  update private_generation.curriculum_submissions
  set status = 'pending',
      processor_id = null,
      processor_lease_expires_at = null,
      error_code = null,
      error_message = null,
      failure_evidence = null,
      processed_at = null,
      updated_at = v_now
  where job_id = p_job_id and authoring_attempt = v_attempt;

  -- 4. Set job to claimed with valid lease so worker_claim_curriculum_submissions can claim it
  update public.generation_jobs
  set status = 'claimed',
      claimed_by = coalesce(v_sub.generation_worker_id, 'chatgpt-work-daily'),
      lease_expires_at = v_now + interval '45 minutes',
      error_code = null,
      error_message = null,
      updated_at = v_now
  where id = p_job_id;

  return jsonb_build_object(
    'success', true,
    'jobId', p_job_id,
    'authoringAttempt', v_attempt,
    'submissionStatus', 'pending',
    'jobStatus', 'claimed',
    'attemptCount', v_job.attempt_count,
    'maxAttempts', v_job.max_attempts,
    'timestamp', v_now
  );
end;
$$;

revoke all on function public.admin_requeue_curriculum_submission(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_requeue_curriculum_submission(uuid, integer) to service_role;
