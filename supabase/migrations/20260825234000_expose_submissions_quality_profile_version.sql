-- Migration: Hardening release identity in claim snapshots, bridge submission, and admin RPC
-- 1. Update chatgpt_claim_generation_batch preserving Scheduled Work API contract and adding targetReleaseId & retryContext
create or replace function private_generation.chatgpt_claim_generation_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  generation_context jsonb;
  retry_context jsonb;
  fingerprint text;
  claimed_contexts jsonb := '[]'::jsonb;
  normal_limit integer;
  oldest_deadline timestamptz;
begin
  if worker_id is null or char_length(worker_id) < 3 then
    raise exception 'worker_id is required';
  end if;

  select integer_value into normal_limit
  from public.operational_settings
  where key = 'daily_generation_limit';

  for claimed_job in
    select * from private_generation.claim_due_generation_jobs(worker_id)
  loop
    update public.generation_jobs
    set lease_expires_at = now() + interval '6 hours'
    where id = claimed_job.id
      and status = 'claimed'
      and claimed_by = worker_id;

    generation_context := public.worker_generation_context(claimed_job.id, worker_id)
      || jsonb_build_object(
        'qualityTrends', public.worker_quality_trends(claimed_job.child_id),
        'targetReleaseId', 'rel_1.3.0'
      );

    select jsonb_build_object(
      'previousAttemptNumber', submission.authoring_attempt,
      'previousCanonicalPackage', submission.canonical_source,
      'failureType', submission.error_code,
      'findings', coalesce(submission.failure_evidence -> 'findings', '[]'::jsonb),
      'failureEvidence', coalesce(submission.failure_evidence, '{}'::jsonb),
      'repairInstructions', jsonb_build_array(
        'Do not regenerate the entire lesson unless dependency changes require it.',
        'Preserve already-approved content.',
        'Preserve stable question IDs and target mappings when possible.',
        'Repair only rejected sections plus dependent fragments.',
        'Update answers and tracking references when a changed question requires it.',
        'Do not repeat plan or author work that is already valid.'
      )
    ) into retry_context
    from private_generation.curriculum_submissions as submission
    where submission.job_id = claimed_job.id
      and submission.status = 'quality_rejected'
    order by submission.authoring_attempt desc
    limit 1;

    if retry_context is not null then
      generation_context := generation_context || jsonb_build_object('retryContext', retry_context);
    end if;

    fingerprint := 'sha256:' || encode(
      extensions.digest(convert_to(generation_context::text, 'UTF8'), 'sha256'),
      'hex'
    );

    insert into private_generation.generation_claim_snapshots (
      job_id,
      generation_worker_id,
      generation_context,
      input_fingerprint,
      claimed_at
    ) values (
      claimed_job.id,
      worker_id,
      generation_context,
      fingerprint,
      now()
    )
    on conflict (job_id) do update
    set generation_worker_id = excluded.generation_worker_id,
        generation_context = excluded.generation_context,
        input_fingerprint = excluded.input_fingerprint,
        claimed_at = excluded.claimed_at;

    claimed_contexts := claimed_contexts || jsonb_build_array(
      generation_context || jsonb_build_object('inputFingerprint', fingerprint)
    );
  end loop;

  select min(job.generation_due_at) into oldest_deadline
  from public.generation_jobs as job
  where job.status in ('pending', 'claimed', 'failed')
    and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.2.0',
    'claimed', claimed_contexts,
    'claimedCount', jsonb_array_length(claimed_contexts),
    'normalCapacity', normal_limit,
    'mandatoryCapacityOverride', jsonb_array_length(claimed_contexts) > coalesce(normal_limit, 0),
    'oldestOutstandingDeadline', oldest_deadline
  );
end;
$$;

-- 2. Update chatgpt_submit_curriculum_package to deterministically stamp canonical_source.metadata.releaseId
create or replace function private_generation.chatgpt_submit_curriculum_package(
  job_id uuid, worker_id text, canonical_source jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  claim_snapshot private_generation.generation_claim_snapshots;
  existing_submission private_generation.curriculum_submissions;
  schema_ver text;
  target_rel_id text;
  stamped_source jsonb;
begin
  schema_ver := canonical_source #>> '{metadata,schemaVersion}';
  if jsonb_typeof(canonical_source) <> 'object'
    or schema_ver <> '2.3.0' then
    raise exception 'canonical_source must be a Curriculum Package 2.3.0 object';
  end if;
  if pg_column_size(canonical_source) > 2097152 then
    raise exception 'canonical_source exceeds the 2 MiB bridge limit';
  end if;

  select * into claimed_job from public.generation_jobs as job where job.id = $1 for update;
  if claimed_job.id is null or claimed_job.status <> 'claimed'
    or claimed_job.claimed_by <> $2 or claimed_job.lease_expires_at <= now() then
    raise exception 'job is not actively claimed by this worker';
  end if;
  if canonical_source #>> '{metadata,jobId}' <> claimed_job.id::text
    or canonical_source #>> '{metadata,childId}' <> claimed_job.child_id::text then
    raise exception 'curriculum package metadata does not match the claimed job';
  end if;

  select * into claim_snapshot
  from private_generation.generation_claim_snapshots as snapshot
  where snapshot.job_id = $1 for update;
  if claim_snapshot.job_id is null or claim_snapshot.generation_worker_id <> $2 then
    raise exception 'server-owned generation claim snapshot is missing';
  end if;
  if canonical_source #>> '{metadata,inputFingerprint}' is distinct from claim_snapshot.input_fingerprint then
    raise exception 'curriculum package input fingerprint does not match the claimed context';
  end if;

  -- Deterministically stamp canonical_source.metadata.releaseId from claim snapshot
  target_rel_id := coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.3.0');
  stamped_source := jsonb_set(
    canonical_source,
    '{metadata,releaseId}',
    to_jsonb(target_rel_id),
    true
  );

  select * into existing_submission
  from private_generation.curriculum_submissions as submission
  where submission.job_id = $1 and submission.authoring_attempt = claimed_job.attempt_count;

  if existing_submission.job_id is not null then
    if existing_submission.generation_worker_id <> $2
       or existing_submission.canonical_source <> stamped_source then
      raise exception 'a different immutable curriculum submission already exists for this authoring attempt';
    end if;

    return jsonb_build_object(
      'jobId', $1,
      'status', existing_submission.status,
      'authoringAttempt', existing_submission.authoring_attempt,
      'schemaVersion', schema_ver,
      'deduplicated', true
    );
  end if;

  insert into private_generation.curriculum_submissions (
    job_id, authoring_attempt, generation_worker_id, canonical_source, input_fingerprint, status
  ) values (
    $1, claimed_job.attempt_count, $2, stamped_source, claim_snapshot.input_fingerprint, 'pending'
  );

  return jsonb_build_object(
    'jobId', $1,
    'status', 'pending',
    'authoringAttempt', claimed_job.attempt_count,
    'schemaVersion', schema_ver
  );
end;
$$;

-- 3. Expose quality_profile_version & release_id in admin_get_curriculum_submissions RPC
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
  status text,
  error_code text,
  error_message text,
  failure_evidence jsonb,
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
      sub.status,
      sub.error_code,
      sub.error_message,
      sub.failure_evidence as stored_failure_evidence,
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
    e.status,
    e.error_code,
    e.error_message,
    case
      -- 1. Malformed / Incomplete Provenance (Check present but passed != true or incomplete evidence)
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
      -- 2. Missing Provenance (No passing valid model-quality-profile criticalCheck present, including metadata-only)
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
