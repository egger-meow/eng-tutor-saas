-- Migration: Require valid model-quality-profile provenance (passed=true + complete evidence) and surface INVALID / MISSING provenance
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
  engine_version text
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
      ) as resolved_engine_version
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
      when e.resolved_schema_version like '2.2%'
        and (e.resolved_prompt_version like '2.4%' or e.resolved_prompt_version = 'prompt/2.4.0')
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
      -- 2. Missing Provenance (No check and no resolved quality profile)
      when e.resolved_schema_version like '2.2%'
        and (e.resolved_prompt_version like '2.4%' or e.resolved_prompt_version = 'prompt/2.4.0')
        and e.resolved_quality_profile is null
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
    e.resolved_engine_version as engine_version
  from enriched as e
  order by e.submitted_at desc, e.authoring_attempt desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

revoke all on function public.admin_get_curriculum_submissions(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_curriculum_submissions(uuid, integer) to service_role;
