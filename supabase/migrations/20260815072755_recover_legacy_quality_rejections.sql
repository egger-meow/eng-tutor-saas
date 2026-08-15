-- One-time bridge for quality rejections created before immutable authoring attempts.
-- The candidate CTE is deliberately narrower than the normal retry transition so
-- unrelated failures and exhausted jobs remain available for manual review.
with recovery_candidates as materialized (
  select
    job.id as job_id,
    coalesce(submission.error_message, job.error_message, 'Legacy quality rejection') as legacy_error_message
  from public.generation_jobs as job
  join private_generation.curriculum_submissions as submission
    on submission.job_id = job.id
  where job.status = 'failed'
    and job.error_code = 'QUALITY_REJECTED'
    and job.attempt_count < job.max_attempts
    and job.completed_at is null
    and job.material_id is null
    and submission.status = 'quality_rejected'
    and not exists (
      select 1
      from private_generation.curriculum_submissions as other_submission
      where other_submission.job_id = job.id
        and other_submission.authoring_attempt <> submission.authoring_attempt
    )
), recovered_submissions as (
  update private_generation.curriculum_submissions as submission
  set authoring_attempt = 1,
      failure_evidence = coalesce(
        submission.failure_evidence,
        jsonb_build_object(
          'failureType', 'QUALITY_REJECTED',
          'findings', jsonb_build_array(jsonb_build_object(
            'source', 'legacy-validator',
            'path', '$',
            'dimension', 'legacy-quality-rejection',
            'message', candidate.legacy_error_message
          )),
          'legacyErrorMessage', candidate.legacy_error_message
        )
      ),
      updated_at = now()
  from recovery_candidates as candidate
  where submission.job_id = candidate.job_id
    and submission.status = 'quality_rejected'
  returning submission.job_id
)
update public.generation_jobs as job
set status = 'pending',
    claimed_by = null,
    lease_expires_at = null,
    scheduled_for = least(job.scheduled_for, now()),
    updated_at = now()
where job.id in (select submission.job_id from recovered_submissions as submission)
  and job.status = 'failed'
  and job.error_code = 'QUALITY_REJECTED'
  and job.attempt_count < job.max_attempts
  and job.completed_at is null
  and job.material_id is null;
