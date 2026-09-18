-- Drain the universal Finisher queue safely within one workflow invocation.
-- A run-scoped processor_id lets the same invocation skip technical failures it
-- already attempted, while later invocations remain free to retry them.

create or replace function public.worker_claim_curriculum_submissions(
  processor_id text,
  claim_limit integer default 5
)
returns table (
  job_id uuid,
  authoring_attempt integer,
  generation_worker_id text,
  canonical_source jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then
    raise exception 'processor_id is required';
  end if;
  if claim_limit < 1 or claim_limit > 25 then
    raise exception 'claim_limit must be between 1 and 25';
  end if;

  return query
  with selected as (
    select submission.job_id, submission.authoring_attempt
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where (
        submission.status = 'pending'
        or (
          submission.status = 'technical_failed'
          and coalesce(submission.error_code, '') <> 'RELEASE_MISMATCH'
          and submission.processor_id is distinct from $1
        )
        or (
          submission.status = 'processing'
          and submission.processor_lease_expires_at < now()
        )
      )
      and job.status in ('claimed', 'completed')
    order by submission.submitted_at, submission.job_id, submission.authoring_attempt
    for update of submission skip locked
    limit claim_limit
  ), renewed_jobs as (
    update public.generation_jobs as job
    set lease_expires_at = case
      when job.status = 'claimed' then now() + interval '45 minutes'
      else job.lease_expires_at
    end
    from selected
    where job.id = selected.job_id
    returning job.id
  )
  update private_generation.curriculum_submissions as submission
  set status = 'processing',
      processor_id = $1,
      processor_lease_expires_at = now() + interval '30 minutes',
      attempt_count = submission.attempt_count + 1,
      publication_path = 'normal_finisher',
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;

comment on function public.worker_claim_curriculum_submissions(text, integer)
is 'Universal deterministic Finisher claim. Run-scoped processor IDs may drain successive bounded batches; retryable technical failures are not reclaimed by the same processor invocation.';
