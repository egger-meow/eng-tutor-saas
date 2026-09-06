-- Migration: 20260906230000_advance_generation_release_to_1_8_1_and_tighten_history_rpc.sql
-- Advance generation release to rel_1.8.1, create targeted history manifest audit table,
-- and tighten fetch_targeted_student_history RPC security and consistency invariants.

-- 1. Advance release defaults in claim and submit functions to rel_1.8.1
do $migration$
declare
  signature text;
  definition text;
  old_binding text;
  new_binding text;
begin
  foreach signature in array array[
    'private_generation.chatgpt_claim_generation_batch(text)',
    'private_generation.claim_week1_fast_generation_batch(text)',
    'private_generation.chatgpt_submit_curriculum_package(uuid,text,jsonb)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if signature like '%chatgpt_submit_curriculum_package%' then
      old_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.0')$binding$;
      new_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.1')$binding$;
    else
      old_binding := $binding$'targetReleaseId', 'rel_1.8.0'$binding$;
      new_binding := $binding$'targetReleaseId', 'rel_1.8.1'$binding$;
    end if;
    if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
      raise exception 'Expected exactly one previous release binding in %', signature;
    end if;
    execute replace(definition, old_binding, new_binding);
  end loop;
end;
$migration$;

-- 2. Create targeted history manifest table for immutable boundary audit
create table if not exists private_generation.targeted_history_manifests (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  claim_snapshot_id uuid not null,
  worker_id text not null,
  manifest_hash text not null,
  cutoff_timestamp timestamptz not null,
  target_ids text[] not null default '{}'::text[],
  evidence_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table if exists private_generation.targeted_history_manifests enable row level security;
revoke all on table private_generation.targeted_history_manifests from public, anon, authenticated;
grant all on table private_generation.targeted_history_manifests to service_role;

create index if not exists idx_targeted_history_manifests_job_id
  on private_generation.targeted_history_manifests (job_id, created_at desc);
create index if not exists idx_targeted_history_manifests_hash
  on private_generation.targeted_history_manifests (manifest_hash);

-- 3. Replace private_generation.fetch_targeted_student_history with hardened boundary checks
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
  if p_target_ids is not null and array_length(p_target_ids, 1) > 0 then
    select array_agg(distinct trim(t))
    into v_clean_targets
    from unnest(p_target_ids) as t
    where t is not null and trim(t) <> '';
  else
    v_clean_targets := array[]::text[];
  end if;

  -- 4. Query targeted older evidence strictly bounded by targets, cutoff, and limit
  if v_clean_targets is null or array_length(v_clean_targets, 1) is null or array_length(v_clean_targets, 1) = 0 then
    v_evidence := '[]'::jsonb;
    v_evidence_count := 0;
  else
    select
      coalesce(jsonb_agg(
        jsonb_build_object(
          'targetType', e.target_type,
          'targetId', e.target_id,
          'result', e.result,
          'observedAt', e.observed_at
        ) order by e.observed_at desc, e.id desc
      ), '[]'::jsonb),
      count(*)
    into v_evidence, v_evidence_count
    from (
      select e.*
      from public.child_learning_evidence e
      left join public.feedback_memory_processing p on p.id = e.feedback_processing_id
      where e.child_id = v_child_id
        and e.target_id = any(v_clean_targets)
        and e.observed_at <= v_effective_cutoff
        and (e.feedback_processing_id is null or p.status = 'effective')
      order by e.observed_at desc, e.id desc
      limit greatest(1, least(coalesce(p_evidence_limit, 10), 40))
    ) e;
  end if;

  -- 5. Calculate deterministic manifest hash covering canonical payload
  v_manifest_doc := jsonb_build_object(
    'jobId', p_job_id,
    'childId', v_child_id,
    'claimSnapshotId', p_job_id,
    'inputFingerprint', coalesce(v_snapshot_fingerprint, ''),
    'cutoffTimestamp', to_char(v_effective_cutoff at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'targetIds', coalesce(to_jsonb(v_clean_targets), '[]'::jsonb),
    'evidence', v_evidence
  );

  v_manifest_hash := 'sha256:' || encode(
    extensions.digest(convert_to(v_manifest_doc::text, 'UTF8'), 'sha256'),
    'hex'
  );

  -- 6. Persist manifest for auditability and verification
  insert into private_generation.targeted_history_manifests (
    job_id,
    child_id,
    claim_snapshot_id,
    worker_id,
    manifest_hash,
    cutoff_timestamp,
    target_ids,
    evidence_count
  ) values (
    p_job_id,
    v_child_id,
    p_job_id,
    p_worker_id,
    v_manifest_hash,
    v_effective_cutoff,
    coalesce(v_clean_targets, array[]::text[]),
    v_evidence_count
  );

  return jsonb_build_object(
    'jobId', p_job_id,
    'childId', v_child_id,
    'claimSnapshotId', p_job_id,
    'cutoffTimestamp', v_effective_cutoff,
    'targetIds', coalesce(to_jsonb(v_clean_targets), '[]'::jsonb),
    'evidence', v_evidence,
    'evidenceCount', v_evidence_count,
    'manifestHash', v_manifest_hash
  );
end;
$$;

revoke all on function private_generation.fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) from public, anon, authenticated;
grant execute on function private_generation.fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) to service_role;

-- 4. Replace public.worker_fetch_targeted_student_history wrapper
create or replace function public.worker_fetch_targeted_student_history(
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
begin
  return private_generation.fetch_targeted_student_history(
    p_job_id := p_job_id,
    p_worker_id := p_worker_id,
    p_claim_snapshot_id := p_claim_snapshot_id,
    p_cutoff_timestamp := p_cutoff_timestamp,
    p_target_ids := p_target_ids,
    p_evidence_limit := p_evidence_limit
  );
end;
$$;

revoke all on function public.worker_fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) from public, anon, authenticated;
grant execute on function public.worker_fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) to service_role;
