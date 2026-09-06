-- Migration: 20260907000000_align_history_rpc_contract_and_immutable_evidence.sql
-- 1. Add evidence column to targeted_history_manifests for full immutable persistence
-- 2. Update private_generation.fetch_targeted_student_history for cached re-read immutability
-- 3. Update public.worker_fetch_targeted_student_history parameter names to match history-client.ts

-- 1. Add evidence column to private_generation.targeted_history_manifests
alter table if exists private_generation.targeted_history_manifests
  add column if not exists evidence jsonb not null default '[]'::jsonb;

-- 2. Update private_generation.fetch_targeted_student_history
create or replace function private_generation.fetch_targeted_student_history(
  p_job_id uuid,
  p_worker_id text,
  p_claim_snapshot_id uuid default null,
  p_cutoff_timestamp timestamptz default null,
  p_target_ids text[] default null,
  p_evidence_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child_id uuid;
  v_claimed_by text;
  v_lease_expires_at timestamptz;
  v_status text;
  v_snapshot_claimed_at timestamptz;
  v_snapshot_context jsonb;
  v_snapshot_worker_id text;
  v_snapshot_fingerprint text;
  v_effective_cutoff timestamptz;
  v_evidence jsonb;
  v_evidence_count integer;
  v_manifest_doc jsonb;
  v_manifest_hash text;
  v_clean_targets text[];
  v_cached_manifest record;
begin
  if p_job_id is null then
    raise exception 'JOB_ID_REQUIRED';
  end if;
  if p_worker_id is null or char_length(trim(p_worker_id)) < 3 then
    raise exception 'WORKER_ID_REQUIRED';
  end if;

  -- 1. Validate active claim & lease for this job
  select child_id, claimed_by, lease_expires_at, status
  into v_child_id, v_claimed_by, v_lease_expires_at, v_status
  from public.generation_jobs
  where id = p_job_id;

  if v_child_id is null then
    raise exception 'JOB_NOT_FOUND: job % does not exist', p_job_id;
  end if;
  if v_status <> 'claimed' then
    raise exception 'JOB_NOT_CLAIMED: job status is %', v_status;
  end if;
  if v_claimed_by is null or v_claimed_by <> p_worker_id then
    raise exception 'WORKER_MISMATCH: claimed_by % does not match caller %', v_claimed_by, p_worker_id;
  end if;
  if v_lease_expires_at is null or v_lease_expires_at <= now() then
    raise exception 'CLAIM_LEASE_EXPIRED: lease expired at %', v_lease_expires_at;
  end if;

  -- 2. Validate claim snapshot
  select claimed_at, generation_context, generation_worker_id, input_fingerprint
  into v_snapshot_claimed_at, v_snapshot_context, v_snapshot_worker_id, v_snapshot_fingerprint
  from private_generation.generation_claim_snapshots
  where job_id = p_job_id;

  if v_snapshot_claimed_at is null then
    raise exception 'CLAIM_SNAPSHOT_NOT_FOUND: no claim snapshot found for job %', p_job_id;
  end if;

  if p_claim_snapshot_id is not null and p_claim_snapshot_id <> p_job_id then
    raise exception 'CLAIM_SNAPSHOT_MISMATCH: requested snapshot % does not match job %', p_claim_snapshot_id, p_job_id;
  end if;

  if v_snapshot_worker_id is null or v_snapshot_worker_id <> p_worker_id then
    raise exception 'SNAPSHOT_WORKER_MISMATCH: snapshot worker % does not match caller %', v_snapshot_worker_id, p_worker_id;
  end if;

  -- 3. Resolve immutable cutoff timestamp from claim snapshot
  v_effective_cutoff := coalesce(
    (v_snapshot_context->>'cutoffTimestamp')::timestamptz,
    v_snapshot_claimed_at
  );

  -- Never permit a caller query cutoff after the snapshot cutoff
  if p_cutoff_timestamp is not null then
    if p_cutoff_timestamp > v_effective_cutoff then
      raise exception 'CUTOFF_TIMESTAMP_EXCEEDS_SNAPSHOT: caller cutoff % exceeds snapshot cutoff %', p_cutoff_timestamp, v_effective_cutoff;
    end if;
    v_effective_cutoff := p_cutoff_timestamp;
  end if;

  -- Clean target IDs
  if p_target_ids is not null then
    select array_agg(distinct t) into v_clean_targets
    from unnest(p_target_ids) as t
    where t is not null and char_length(trim(t)) > 0;
  end if;
  v_clean_targets := coalesce(v_clean_targets, array[]::text[]);

  -- 4. Check for existing immutable manifest for this (job_id, target_ids)
  select manifest_hash, evidence, evidence_count, cutoff_timestamp
  into v_cached_manifest
  from private_generation.targeted_history_manifests
  where job_id = p_job_id
    and target_ids = v_clean_targets
  order by created_at desc
  limit 1;

  if v_cached_manifest.manifest_hash is not null then
    return jsonb_build_object(
      'jobId', p_job_id,
      'childId', v_child_id,
      'claimSnapshotId', p_job_id,
      'cutoffTimestamp', v_cached_manifest.cutoff_timestamp,
      'targetIds', coalesce(to_jsonb(v_clean_targets), '[]'::jsonb),
      'evidence', v_cached_manifest.evidence,
      'evidenceCount', v_cached_manifest.evidence_count,
      'manifestHash', v_cached_manifest.manifest_hash,
      'cached', true
    );
  end if;

  -- 5. Query evidence strictly bounded by effective cutoff and requested target IDs
  with bounded_evidence as (
    select
      target_type as "targetType",
      target_id as "targetId",
      evidence_type as "evidenceType",
      result,
      assessed,
      evidence_strength as "evidenceStrength",
      observed_at as "observedAt",
      source
    from public.child_learning_evidence
    where child_id = v_child_id
      and observed_at <= v_effective_cutoff
      and (
        cardinality(v_clean_targets) = 0
        or target_id = any(v_clean_targets)
      )
    order by observed_at desc
    limit coalesce(p_evidence_limit, 10)
  )
  select
    coalesce(jsonb_agg(to_jsonb(be)), '[]'::jsonb),
    count(*)::integer
  into v_evidence, v_evidence_count
  from bounded_evidence be;

  -- 6. Construct deterministic manifest and calculate SHA-256
  v_manifest_doc := jsonb_build_object(
    'jobId', p_job_id,
    'childId', v_child_id,
    'cutoffTimestamp', to_char(v_effective_cutoff at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'targetIds', coalesce(to_jsonb(v_clean_targets), '[]'::jsonb),
    'evidence', v_evidence
  );

  v_manifest_hash := 'sha256:' || encode(
    extensions.digest(convert_to(v_manifest_doc::text, 'UTF8'), 'sha256'),
    'hex'
  );

  -- 7. Persist manifest and full evidence for auditability and verification
  insert into private_generation.targeted_history_manifests (
    job_id,
    child_id,
    claim_snapshot_id,
    worker_id,
    manifest_hash,
    cutoff_timestamp,
    target_ids,
    evidence_count,
    evidence
  ) values (
    p_job_id,
    v_child_id,
    p_job_id,
    p_worker_id,
    v_manifest_hash,
    v_effective_cutoff,
    coalesce(v_clean_targets, array[]::text[]),
    v_evidence_count,
    v_evidence
  );

  return jsonb_build_object(
    'jobId', p_job_id,
    'childId', v_child_id,
    'claimSnapshotId', p_job_id,
    'cutoffTimestamp', v_effective_cutoff,
    'targetIds', coalesce(to_jsonb(v_clean_targets), '[]'::jsonb),
    'evidence', v_evidence,
    'evidenceCount', v_evidence_count,
    'manifestHash', v_manifest_hash,
    'cached', false
  );
end;
$$;

revoke all on function private_generation.fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) from public, anon, authenticated;
grant execute on function private_generation.fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) to service_role;

-- 3. Replace public.worker_fetch_targeted_student_history with exact parameter names matching history-client.ts
drop function if exists public.worker_fetch_targeted_student_history(uuid, text, text[], timestamptz, uuid, integer);
drop function if exists public.worker_fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer);

create or replace function public.worker_fetch_targeted_student_history(
  job_id uuid,
  worker_id text,
  claim_snapshot_id uuid default null,
  cutoff_timestamp timestamptz default null,
  target_ids text[] default null,
  evidence_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private_generation.fetch_targeted_student_history(
    p_job_id := job_id,
    p_worker_id := worker_id,
    p_claim_snapshot_id := claim_snapshot_id,
    p_cutoff_timestamp := cutoff_timestamp,
    p_target_ids := target_ids,
    p_evidence_limit := evidence_limit
  );
end;
$$;

revoke all on function public.worker_fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) from public, anon, authenticated;
grant execute on function public.worker_fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) to service_role;
