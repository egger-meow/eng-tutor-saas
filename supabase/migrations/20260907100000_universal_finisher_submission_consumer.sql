-- Universal curriculum finisher & Fast Publisher failure hardening
-- 1. Normal Finisher is a universal curriculum submission consumer (Week 1 and Week 2+).
-- 2. Fast Publisher is an optimized Week 1 consumer on the same queue without isolation.
-- 3. worker_fail_week1_fast_submission supports all author workers and structured diagnostics.
-- 4. worker_complete_week1_fast_submission delegates to worker_complete_generation_job.
-- 5. worker_finish_curriculum_submission stamps publication_path and resolves Week 1 outbox.
-- 6. admin_get_curriculum_submissions exposes publication_path, lease expiry, and material_id.

-- ---------------------------------------------------------------------------
-- 1. Universal Normal Finisher Claim (All valid pending submissions, Week 1 & Week 2+)
-- ---------------------------------------------------------------------------

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
        submission.status = 'pending'
        or (submission.status = 'technical_failed' and coalesce(submission.error_code, '') <> 'RELEASE_MISMATCH')
        or (submission.status = 'processing' and submission.processor_lease_expires_at < now())
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

revoke all on function public.worker_claim_curriculum_submissions(text, integer) from public, anon, authenticated;
grant execute on function public.worker_claim_curriculum_submissions(text, integer) to service_role;

comment on function public.worker_claim_curriculum_submissions(text, integer)
is 'Universal deterministic Finisher claim. Claims all valid pending curriculum submissions, including Week 1 and Week 2+.';

-- ---------------------------------------------------------------------------
-- 2. Week 1 Fast Publisher Claim (Shared queue, non-exclusive)
-- ---------------------------------------------------------------------------

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
      and (
        submission.status in ('pending', 'technical_failed')
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
      publication_path = 'week1_fast',
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

revoke all on function public.worker_claim_week1_fast_submissions(text, integer) from public, anon, authenticated;
grant execute on function public.worker_claim_week1_fast_submissions(text, integer) to service_role;

comment on function public.worker_claim_week1_fast_submissions(text, integer)
is 'Claims eligible Week 1 curriculum submissions for lower-latency Fast Publisher processing from the shared submission queue.';

-- ---------------------------------------------------------------------------
-- 3. Week 1 Fast Publisher Failure Handling (Universal author identity & diagnostics)
-- ---------------------------------------------------------------------------

create or replace function public.worker_fail_week1_fast_submission(
  p_job_id uuid,
  p_authoring_attempt integer,
  p_processor_id text,
  p_error_code text,
  p_error_message text,
  p_failure_evidence jsonb default null,
  p_outcome text default 'technical_failed'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if p_outcome not in ('technical_failed', 'quality_rejected') then
    raise exception 'invalid failure outcome: %', p_outcome;
  end if;

  update private_generation.curriculum_submissions
  set status = p_outcome,
      processor_lease_expires_at = null,
      error_code = left(coalesce(p_error_code, 'WEEK1_FAST_PUBLISH_FAILED'), 100),
      error_message = left(coalesce(p_error_message, 'Week 1 fast publication failed'), 2000),
      failure_evidence = coalesce(p_failure_evidence, failure_evidence),
      processed_at = now(),
      updated_at = now()
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt
    and status = 'processing'
    and processor_id = p_processor_id;
  get diagnostics affected = row_count;

  if affected = 1 then
    update private_generation.week1_publish_outbox
    set status = 'failed',
        last_error_code = left(coalesce(p_error_code, 'WEEK1_FAST_PUBLISH_FAILED'), 100),
        processing_lease_expires_at = null,
        updated_at = now()
    where job_id = p_job_id and authoring_attempt = p_authoring_attempt;

    if p_outcome = 'quality_rejected' then
      update public.generation_jobs as job
      set status = case when job.attempt_count < job.max_attempts then 'pending'::public.generation_job_status else 'failed'::public.generation_job_status end,
          claimed_by = null,
          lease_expires_at = null,
          scheduled_for = least(job.scheduled_for, now()),
          error_code = case when job.attempt_count < job.max_attempts then left(p_error_code, 100) else 'HUMAN_REVIEW_REQUIRED' end,
          error_message = left(p_error_message, 2000)
      where job.id = p_job_id and job.status = 'claimed' and job.attempt_count = p_authoring_attempt;
    end if;
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text, jsonb, text) to service_role;

comment on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text, jsonb, text)
is 'Records a failure for an actively leased Week 1 fast publisher submission regardless of author worker identity.';

-- ---------------------------------------------------------------------------
-- 4. Week 1 Fast Publisher Completion (Delegates to worker_complete_generation_job)
-- ---------------------------------------------------------------------------

create or replace function public.worker_complete_week1_fast_submission(
  p_job_id uuid,
  p_authoring_attempt integer,
  p_processor_id text,
  p_student_pdf_path text,
  p_parent_answer_pdf_path text,
  p_canonical_source jsonb,
  p_generation_summary jsonb,
  p_prompt_version text,
  p_generator_version text,
  p_model_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission private_generation.curriculum_submissions%rowtype;
  v_material_id uuid;
begin
  select * into v_submission
  from private_generation.curriculum_submissions
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt
  for update;

  if v_submission.job_id is null
     or v_submission.status <> 'processing'
     or v_submission.processor_id <> p_processor_id
     or v_submission.processor_lease_expires_at <= now() then
    raise exception 'active Week 1 fast publisher lease is missing';
  end if;

  if p_canonical_source is distinct from v_submission.canonical_source then
    raise exception 'Week 1 publisher cannot substitute immutable canonical source';
  end if;

  -- Reuses the authoritative generation job completion contract (creates material, sets release_at, schedules Week 2)
  v_material_id := public.worker_complete_generation_job(
    p_job_id,
    v_submission.generation_worker_id,
    p_student_pdf_path,
    p_parent_answer_pdf_path,
    p_canonical_source,
    p_generation_summary,
    p_prompt_version,
    p_generator_version,
    p_model_name
  );

  update private_generation.curriculum_submissions
  set status = 'completed',
      publication_path = 'week1_fast',
      processed_at = now(),
      processor_lease_expires_at = null,
      error_code = null,
      error_message = null,
      failure_evidence = null,
      updated_at = now()
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt;

  update private_generation.week1_publish_outbox
  set status = 'sent',
      sent_at = coalesce(sent_at, now()),
      processing_lease_expires_at = null,
      last_error_code = null,
      updated_at = now()
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt;

  return v_material_id;
end;
$$;

revoke all on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text) to service_role;

comment on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text)
is 'Completes an actively leased Week 1 fast publisher submission using the universal worker_complete_generation_job completion engine.';

-- ---------------------------------------------------------------------------
-- 5. Universal Finisher Finish / Resolution
-- ---------------------------------------------------------------------------

create or replace function public.worker_finish_curriculum_submission(
  job_id uuid,
  authoring_attempt integer,
  processor_id text,
  outcome text,
  error_code text default null,
  error_message text default null,
  failure_evidence jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if outcome not in ('completed', 'quality_rejected', 'technical_failed') then
    raise exception 'invalid curriculum submission outcome';
  end if;
  if failure_evidence is not null and jsonb_typeof(failure_evidence) <> 'object' then
    raise exception 'failure_evidence must be an object';
  end if;

  update private_generation.curriculum_submissions as submission
  set status = outcome,
      processed_at = now(),
      processor_lease_expires_at = null,
      publication_path = 'normal_finisher',
      error_code = left($5, 100),
      error_message = left($6, 2000),
      failure_evidence = $7,
      updated_at = now()
  where submission.job_id = $1 and submission.authoring_attempt = $2
    and submission.status = 'processing' and submission.processor_id = $3;
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;

  if outcome = 'completed' then
    update private_generation.week1_publish_outbox as outbox
    set status = 'sent',
        sent_at = coalesce(outbox.sent_at, now()),
        processing_lease_expires_at = null,
        last_error_code = null,
        updated_at = now()
    where outbox.job_id = $1 and outbox.authoring_attempt = $2;
  elsif outcome in ('quality_rejected', 'technical_failed') then
    update private_generation.week1_publish_outbox as outbox
    set status = 'failed',
        last_error_code = left($5, 100),
        processing_lease_expires_at = null,
        updated_at = now()
    where outbox.job_id = $1 and outbox.authoring_attempt = $2;
  end if;

  if outcome = 'quality_rejected' then
    update public.generation_jobs as job
    set status = case when job.attempt_count < job.max_attempts then 'pending'::public.generation_job_status else 'failed'::public.generation_job_status end,
        claimed_by = null,
        lease_expires_at = null,
        scheduled_for = least(job.scheduled_for, now()),
        error_code = case when job.attempt_count < job.max_attempts then left($5, 100) else 'HUMAN_REVIEW_REQUIRED' end,
        error_message = left($6, 2000)
    where job.id = $1 and job.status = 'claimed' and job.attempt_count = $2;
  elsif outcome = 'technical_failed' and $5 = 'RELEASE_MISMATCH' then
    update public.generation_jobs as job
    set status = case when job.attempt_count < job.max_attempts then 'pending'::public.generation_job_status else 'failed'::public.generation_job_status end,
        claimed_by = null,
        lease_expires_at = null,
        scheduled_for = least(job.scheduled_for, now()),
        error_code = 'RELEASE_MISMATCH',
        error_message = left($6, 2000)
    where job.id = $1 and job.status = 'claimed' and job.attempt_count = $2;
  end if;
  return true;
end;
$$;

revoke all on function public.worker_finish_curriculum_submission(uuid, integer, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.worker_finish_curriculum_submission(uuid, integer, text, text, text, text, jsonb) to service_role;

comment on function public.worker_finish_curriculum_submission(uuid, integer, text, text, text, text, jsonb)
is 'Atomically records curriculum submission completion or failure, updates publication path, and resolves any associated publish outbox.';

-- ---------------------------------------------------------------------------
-- 6. Extended Admin Submissions Observability
-- ---------------------------------------------------------------------------

drop function if exists public.admin_get_curriculum_submissions(uuid, integer);

create or replace function public.admin_get_curriculum_submissions(
  p_job_id uuid default null,
  p_limit integer default 200
)
returns table (
  job_id uuid,
  child_id uuid,
  material_week text,
  authoring_attempt integer,
  generation_worker_id text,
  processor_id text,
  publication_path text,
  status text,
  processor_lease_expires_at timestamptz,
  error_code text,
  error_message text,
  failure_evidence jsonb,
  material_id uuid,
  submitted_at timestamptz,
  processed_at timestamptz,
  attempt_count integer,
  schema_version text,
  prompt_version text,
  model_name text,
  quality_profile text,
  engine_version text,
  quality_profile_version text,
  release_id text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with enriched as (
    select
      sub.job_id,
      job.child_id,
      job.material_week::text as material_week,
      sub.authoring_attempt,
      sub.generation_worker_id,
      sub.processor_id,
      sub.publication_path,
      sub.status,
      sub.processor_lease_expires_at,
      sub.error_code,
      sub.error_message,
      sub.failure_evidence as stored_failure_evidence,
      job.material_id,
      sub.submitted_at,
      sub.processed_at,
      sub.attempt_count,
      coalesce(
        sub.canonical_source->'metadata'->>'schemaVersion',
        sub.failure_evidence->>'schemaVersion',
        null
      ) as resolved_schema_version,
      coalesce(
        sub.canonical_source->'metadata'->>'promptVersion',
        sub.failure_evidence->>'promptVersion',
        null
      ) as resolved_prompt_version,
      coalesce(
        sub.canonical_source->'metadata'->>'modelName',
        sub.canonical_source->'metadata'->>'model',
        sub.canonical_source->'metadata'->'modelQualityProfile'->>'actualModel',
        sub.canonical_source->'metadata'->'modelQualityProfile'->>'modelName',
        sub.failure_evidence->'modelQualityProfile'->>'actualModel',
        sub.failure_evidence->>'modelName',
        sub.failure_evidence->>'actualModel',
        sub.failure_evidence->>'model',
        null
      ) as resolved_model_name,
      profile_check.has_check as profile_has_check,
      profile_check.is_valid as profile_is_valid,
      profile_check.passed as profile_passed,
      profile_check.evidence as profile_evidence,
      coalesce(
        case
          when profile_check.is_valid then substring(profile_check.evidence from 'resolvedQualityProfile=([^ |]+)')
          else null
        end,
        sub.canonical_source->'metadata'->'modelQualityProfile'->>'resolvedQualityProfile',
        sub.canonical_source->'metadata'->'modelQualityProfile'->>'profileName',
        sub.canonical_source->'metadata'->>'qualityProfile',
        sub.canonical_source->'metadata'->>'resolvedQualityProfile',
        sub.failure_evidence->'modelQualityProfile'->>'resolvedQualityProfile',
        sub.failure_evidence->'modelQualityProfile'->>'profileName',
        sub.failure_evidence->>'qualityProfile',
        sub.failure_evidence->>'resolvedQualityProfile',
        null
      ) as resolved_quality_profile,
      coalesce(
        sub.canonical_source->'metadata'->>'engineVersion',
        sub.canonical_source->'metadata'->'modelQualityProfile'->>'engineVersion',
        sub.failure_evidence->'modelQualityProfile'->>'engineVersion',
        sub.failure_evidence->>'engineVersion',
        null
      ) as resolved_engine_version,
      coalesce(
        case
          when profile_check.is_valid then substring(profile_check.evidence from 'qualityProfileVersion=([^ |]+)')
          else null
        end,
        sub.canonical_source->'metadata'->'modelQualityProfile'->>'qualityProfileVersion',
        sub.canonical_source->'metadata'->>'qualityProfileVersion',
        sub.failure_evidence->'modelQualityProfile'->>'qualityProfileVersion',
        sub.failure_evidence->>'qualityProfileVersion',
        null
      ) as resolved_quality_profile_version,
      coalesce(
        sub.canonical_source->'metadata'->>'releaseId',
        sub.failure_evidence->>'releaseId',
        null
      ) as resolved_release_id
    from private_generation.curriculum_submissions as sub
    left join public.generation_jobs as job on job.id = sub.job_id
    left join lateral (
      select
        true as has_check,
        coalesce((check_item->>'passed')::boolean, false) as passed,
        check_item->>'evidence' as evidence,
        (
          coalesce((check_item->>'passed')::boolean, false) = true
          and check_item->>'evidence' like '%actualModel=%'
          and check_item->>'evidence' like '%resolvedQualityProfile=%'
          and check_item->>'evidence' like '%qualityProfileVersion=%'
          and check_item->>'evidence' like '%engineVersion=%'
        ) as is_valid
      from jsonb_array_elements(coalesce(sub.canonical_source->'qualityEvidence'->'criticalChecks', '[]'::jsonb)) as check_item
      where check_item->>'id' = 'model-quality-profile'
      limit 1
    ) as profile_check on true
    where (p_job_id is null or sub.job_id = p_job_id)
  )
  select
    e.job_id,
    e.child_id,
    e.material_week,
    e.authoring_attempt,
    e.generation_worker_id,
    e.processor_id,
    e.publication_path,
    e.status,
    e.processor_lease_expires_at,
    e.error_code,
    e.error_message,
    case
      when (e.resolved_schema_version like '2.2%' or e.resolved_schema_version like '2.3%')
        and (e.resolved_prompt_version like '2.4%' or e.resolved_prompt_version like '2.5%' or e.resolved_prompt_version like '2.6%' or e.resolved_prompt_version like '2.7%' or e.resolved_prompt_version = 'prompt/2.4.0')
        and e.profile_has_check is true
        and e.profile_is_valid is not true
      then jsonb_set(
        coalesce(e.stored_failure_evidence, '{}'::jsonb),
        '{findings}',
        coalesce(e.stored_failure_evidence->'findings', '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
            'source', 'provenance',
            'rule', 'MODEL_QUALITY_PROFILE_PROVENANCE_INVALID',
            'message', 'Current schema/prompt submission contains malformed or incomplete model-profile provenance.'
          )),
        true
      )
      when (e.resolved_schema_version like '2.2%' or e.resolved_schema_version like '2.3%')
        and (e.resolved_prompt_version like '2.4%' or e.resolved_prompt_version like '2.5%' or e.resolved_prompt_version like '2.6%' or e.resolved_prompt_version like '2.7%' or e.resolved_prompt_version = 'prompt/2.4.0')
        and (e.profile_has_check is null or e.profile_has_check is false)
      then jsonb_set(
        coalesce(e.stored_failure_evidence, '{}'::jsonb),
        '{findings}',
        coalesce(e.stored_failure_evidence->'findings', '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
            'source', 'provenance',
            'rule', 'MODEL_QUALITY_PROFILE_PROVENANCE_MISSING',
            'message', 'Current schema/prompt submission is missing required model-profile provenance.'
          )),
        true
      )
      else e.stored_failure_evidence
    end as failure_evidence,
    e.material_id,
    e.submitted_at,
    e.processed_at,
    e.attempt_count,
    e.resolved_schema_version as schema_version,
    e.resolved_prompt_version as prompt_version,
    e.resolved_model_name as model_name,
    case
      when e.profile_has_check is true and e.profile_is_valid is not true then null
      else e.resolved_quality_profile
    end as quality_profile,
    e.resolved_engine_version as engine_version,
    case
      when e.profile_has_check is true and e.profile_is_valid is not true then null
      else e.resolved_quality_profile_version
    end as quality_profile_version,
    e.resolved_release_id as release_id
  from enriched as e
  order by e.submitted_at desc, e.authoring_attempt desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

revoke all on function public.admin_get_curriculum_submissions(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_curriculum_submissions(uuid, integer) to service_role;
