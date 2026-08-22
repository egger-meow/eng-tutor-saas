-- Migration: 20260822163000_add_chatgpt_release_unsubmitted_claim.sql
-- Wave 4.3: Submit-Transport Recovery & Authoritative Read-After-Write Verification Bridge

-- 1. Extend chatgpt_curriculum_submission_status to return job_attempt_count and submission_found
create or replace function private_generation.chatgpt_curriculum_submission_status(
  job_id uuid,
  worker_id text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'jobId', job.id,
    'jobStatus', job.status,
    'jobAttemptCount', job.attempt_count,
    'submissionFound', submission.authoring_attempt is not null,
    'authoringAttempt', submission.authoring_attempt,
    'status', submission.status,
    'finisherAttemptCount', submission.attempt_count,
    'processedAt', submission.processed_at,
    'materialId', job.material_id,
    'errorCode', submission.error_code
  )
  from public.generation_jobs as job
  left join lateral (
    select sub.*
    from private_generation.curriculum_submissions as sub
    where sub.job_id = job.id
      and sub.generation_worker_id = $2
    order by sub.authoring_attempt desc
    limit 1
  ) as submission on true
  where job.id = $1
    and (job.claimed_by = $2 or submission.job_id is not null);
$$;

revoke all on function private_generation.chatgpt_curriculum_submission_status(uuid, text)
from public, anon, authenticated, service_role;

-- 2. Add SECURITY DEFINER RPC to safely release an unsubmitted claim upon transport/connector failure
create or replace function private_generation.chatgpt_release_unsubmitted_claim(
  job_id uuid,
  worker_id text,
  error_code text,
  error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  has_current_submission boolean;
  sanitized_code text;
  sanitized_message text;
begin
  if worker_id is null or char_length(worker_id) < 3 then
    raise exception 'worker_id is required';
  end if;

  -- Lock the target job row
  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
  for update;

  if claimed_job.id is null
    or claimed_job.status <> 'claimed'
    or claimed_job.claimed_by <> $2
    or claimed_job.lease_expires_at <= now() then
    raise exception 'job is not actively claimed by this worker';
  end if;

  -- Verify no submission exists for the current authoring attempt
  select exists (
    select 1
    from private_generation.curriculum_submissions as submission
    where submission.job_id = $1
      and submission.authoring_attempt = claimed_job.attempt_count
  ) into has_current_submission;

  if has_current_submission then
    raise exception 'cannot release claim: an immutable curriculum submission exists for authoring attempt %', claimed_job.attempt_count;
  end if;

  sanitized_code := left(coalesce($3, 'SUBMIT_TRANSPORT_FAILED'), 100);
  sanitized_message := left(coalesce($4, 'Unsubmitted claim released for immediate reclaim'), 2000);

  -- Invalidate any server-owned snapshot created during this claim
  delete from private_generation.generation_claim_snapshots as snapshot
  where snapshot.job_id = $1
    and snapshot.generation_worker_id = $2;

  -- Restore job to pending, decrement attempt_count by exactly 1, and clear lease/worker
  update public.generation_jobs as target_job
  set status = 'pending',
      claimed_by = null,
      lease_expires_at = null,
      attempt_count = greatest(claimed_job.attempt_count - 1, 0),
      error_code = sanitized_code,
      error_message = sanitized_message,
      updated_at = now()
  where target_job.id = $1;

  return jsonb_build_object(
    'jobId', $1,
    'status', 'pending',
    'released', true,
    'attemptCount', greatest(claimed_job.attempt_count - 1, 0),
    'errorCode', sanitized_code
  );
end;
$$;

revoke all on function private_generation.chatgpt_release_unsubmitted_claim(uuid, text, text, text)
from public, anon, authenticated, service_role;
