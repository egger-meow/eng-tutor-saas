-- Migration: Add quality_profile column to admin_get_curriculum_submissions RPC for tightened quality era provenance
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
  quality_profile text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
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
    sub.failure_evidence,
    sub.submitted_at,
    sub.processed_at,
    sub.attempt_count,
    coalesce(
      sub.canonical_source->'metadata'->>'schemaVersion',
      sub.failure_evidence->>'schemaVersion',
      null
    ) as schema_version,
    coalesce(
      sub.canonical_source->'metadata'->>'promptVersion',
      sub.failure_evidence->>'promptVersion',
      null
    ) as prompt_version,
    coalesce(
      sub.canonical_source->'metadata'->>'modelName',
      sub.canonical_source->'metadata'->'modelQualityProfile'->>'actualModel',
      job.model_name,
      null
    ) as model_name,
    coalesce(
      sub.canonical_source->'metadata'->'modelQualityProfile'->>'resolvedQualityProfile',
      sub.canonical_source->'metadata'->'modelQualityProfile'->>'profileName',
      sub.canonical_source->'metadata'->>'qualityProfile',
      sub.canonical_source->'metadata'->>'resolvedQualityProfile',
      sub.failure_evidence->'modelQualityProfile'->>'resolvedQualityProfile',
      sub.failure_evidence->'modelQualityProfile'->>'profileName',
      sub.failure_evidence->>'qualityProfile',
      sub.failure_evidence->>'resolvedQualityProfile',
      case
        when sub.canonical_source->'qualityEvidence'->'criticalChecks' @> '[{"id":"model-quality-profile"}]'::jsonb then 'model-quality-profile'
        when sub.failure_evidence->'criticalChecks' @> '[{"id":"model-quality-profile"}]'::jsonb then 'model-quality-profile'
        else null
      end
    ) as quality_profile
  from private_generation.curriculum_submissions as sub
  left join public.generation_jobs as job on job.id = sub.job_id
  where (p_job_id is null or sub.job_id = p_job_id)
  order by sub.submitted_at desc, sub.authoring_attempt desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

revoke all on function public.admin_get_curriculum_submissions(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_curriculum_submissions(uuid, integer) to service_role;
