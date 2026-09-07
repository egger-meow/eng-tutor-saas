-- Week 1 Fast Publisher -> normal Finisher fallback.
-- Fresh Week 1 submissions remain exclusive to the Fast Publisher. Only an explicit
-- Fast Publisher failure is handed to the normal deterministic Finisher, preventing
-- a live fast/normal publication race while preserving a deterministic recovery path.

-- 1. Fast Publisher claims fresh Week 1 work and crashed/expired processing leases only.
-- Once the publisher explicitly records WEEK1_FAST_PUBLISH_FAILED, ownership moves to
-- the normal Finisher fallback rather than being re-claimed by the Fast Publisher.
create or replace function public.worker_claim_week1_fast_submissions(processor_id text, claim_limit integer default 5)
returns table (job_id uuid, authoring_attempt integer, generation_worker_id text, canonical_source jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then raise exception 'processor_id is required'; end if;
  if claim_limit < 1 or claim_limit > 25 then raise exception 'claim_limit must be between 1 and 25'; end if;

  return query
  with selected as (
    select submission.job_id, submission.authoring_attempt
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where job.source_material_id is null
      and job.material_id is null
      and job.status = 'claimed'
      and job.claimed_by = submission.generation_worker_id
      and submission.publication_path = 'week1_fast'
      and (
        submission.status = 'pending'
        or (submission.status = 'processing' and submission.processor_lease_expires_at < now())
      )
    order by submission.submitted_at, submission.job_id, submission.authoring_attempt
    for update of submission skip locked
    limit claim_limit
  ), renewed_jobs as (
    update public.generation_jobs as job
    set lease_expires_at = now() + interval '2 hours'
    from selected
    where job.id = selected.job_id
    returning job.id
  )
  update private_generation.curriculum_submissions as submission
  set status = 'processing',
      processor_id = $1,
      processor_lease_expires_at = now() + interval '30 minutes',
      attempt_count = submission.attempt_count + 1,
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;

revoke all on function public.worker_claim_week1_fast_submissions(text, integer)
from public, anon, authenticated;
grant execute on function public.worker_claim_week1_fast_submissions(text, integer)
to service_role;

-- 2. Record Fast Publisher failure for any approved production author.
-- The old implementation incorrectly required generation_worker_id = chatgpt-week1-fast,
-- even though Week 1 publication had already been generalized to submissions authored by
-- normal/manual production workers. Preserve the authoritative job/author binding instead.
create or replace function public.worker_fail_week1_fast_submission(
  p_job_id uuid,
  p_authoring_attempt integer,
  p_processor_id text,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update private_generation.curriculum_submissions as submission
  set status = 'technical_failed',
      processor_lease_expires_at = null,
      error_code = left(coalesce(p_error_code, 'WEEK1_FAST_PUBLISH_FAILED'), 100),
      error_message = left(coalesce(p_error_message, 'Week 1 fast publication failed'), 2000),
      processed_at = now(),
      updated_at = now()
  where submission.job_id = p_job_id
    and submission.authoring_attempt = p_authoring_attempt
    and submission.publication_path = 'week1_fast'
    and submission.status = 'processing'
    and submission.processor_id = p_processor_id
    and exists (
      select 1
      from public.generation_jobs as job
      where job.id = submission.job_id
        and job.source_material_id is null
        and job.material_id is null
        and job.status = 'claimed'
        and job.claimed_by = submission.generation_worker_id
    );
  get diagnostics affected = row_count;

  if affected = 1 then
    update private_generation.week1_publish_outbox
    set status = 'failed',
        last_error_code = left(coalesce(p_error_code, 'WEEK1_FAST_PUBLISH_FAILED'), 100),
        processing_lease_expires_at = null,
        updated_at = now()
    where job_id = p_job_id
      and authoring_attempt = p_authoring_attempt;
  end if;

  return affected = 1;
end;
$$;

revoke all on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text)
from public, anon, authenticated;
grant execute on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text)
to service_role;

-- 3. Normal Finisher continues to own all Week 2+ work and additionally accepts only
-- Week 1 submissions whose Fast Publisher has explicitly failed. Fresh pending or live
-- processing Week 1 submissions remain invisible to this claim function.
create or replace function public.worker_claim_curriculum_submissions(processor_id text, claim_limit integer default 5)
returns table (job_id uuid, authoring_attempt integer, generation_worker_id text, canonical_source jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then raise exception 'processor_id is required'; end if;
  if claim_limit < 1 or claim_limit > 25 then raise exception 'claim_limit must be between 1 and 25'; end if;

  return query
  with selected as (
    select submission.job_id, submission.authoring_attempt
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where (
        (
          job.source_material_id is not null
          and (
            submission.status = 'pending'
            or (submission.status = 'technical_failed' and coalesce(submission.error_code, '') <> 'RELEASE_MISMATCH')
            or (submission.status = 'processing' and submission.processor_lease_expires_at < now())
          )
        )
        or (
          job.source_material_id is null
          and job.material_id is null
          and job.status = 'claimed'
          and job.claimed_by = submission.generation_worker_id
          and submission.publication_path = 'week1_fast'
          and submission.status = 'technical_failed'
          and coalesce(submission.error_code, '') = 'WEEK1_FAST_PUBLISH_FAILED'
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
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;

revoke all on function public.worker_claim_curriculum_submissions(text, integer)
from public, anon, authenticated;
grant execute on function public.worker_claim_curriculum_submissions(text, integer)
to service_role;

comment on function public.worker_claim_week1_fast_submissions(text, integer)
is 'Claims fresh Week 1 Fast Publisher work and expired publisher leases only. Explicit WEEK1_FAST_PUBLISH_FAILED submissions are handed to the normal Finisher fallback.';

comment on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text)
is 'Records Week 1 Fast Publisher failure for an immutable Week 1 submission authored by any approved production worker while preserving the authoritative job/author binding.';

comment on function public.worker_claim_curriculum_submissions(text, integer)
is 'Claims normal Week 2+ Finisher work plus Week 1 submissions explicitly failed by the Fast Publisher. Fresh/live Week 1 work remains exclusive to the Fast Publisher.';
