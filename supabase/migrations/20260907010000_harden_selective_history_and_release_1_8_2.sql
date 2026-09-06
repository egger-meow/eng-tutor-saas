-- Legacy audit rows remain readable but cannot satisfy a v2 cache request.
alter table private_generation.targeted_history_manifests add column request_hash text;
create unique index targeted_history_request_unique
  on private_generation.targeted_history_manifests(job_id, request_hash)
  where request_hash is not null;

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
  v_attempt_count integer;
  v_limit integer := greatest(1, least(coalesce(p_evidence_limit, 10), 40));
  v_request_hash text;
begin
  if p_job_id is null then
    raise exception 'JOB_ID_REQUIRED';
  end if;
  if p_worker_id is null or char_length(trim(p_worker_id)) < 3 then
    raise exception 'WORKER_ID_REQUIRED';
  end if;

  -- 1. Validate active claim & lease for this job
  select child_id, claimed_by, lease_expires_at, status, attempt_count
  into v_child_id, v_claimed_by, v_lease_expires_at, v_status, v_attempt_count
  from public.generation_jobs
  where id = p_job_id
  for update; -- Serialize cache fill with claim/reclaim and concurrent fetches.

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
    select array_agg(distinct trim(t) order by trim(t)) into v_clean_targets
    from unnest(p_target_ids) as t
    where t is not null and char_length(trim(t)) > 0;
  end if;
  v_clean_targets := coalesce(v_clean_targets, array[]::text[]);

  -- Exact claim and complete normalized request; never reuse a legacy audit row.
  v_request_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'jobId', p_job_id, 'workerId', p_worker_id, 'attemptCount', v_attempt_count,
    'inputFingerprint', v_snapshot_fingerprint, 'claimedAt', v_snapshot_claimed_at,
    'cutoffTimestamp', v_effective_cutoff, 'targetIds', to_jsonb(v_clean_targets),
    'evidenceLimit', v_limit, 'policyVersion', 'targeted-history-v2'
  )::text, 'UTF8'), 'sha256'), 'hex');

  select manifest_hash, evidence, evidence_count, cutoff_timestamp
  into v_cached_manifest
  from private_generation.targeted_history_manifests
  where job_id = p_job_id and request_hash = v_request_hash
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

  -- Empty targets never load all history. Exposure remains distinct from assessment.
  with bounded_evidence as (
    select e.id, e.target_type as "targetType", e.target_id as "targetId",
      e.evidence_type as "evidenceType", e.result, e.assessed,
      e.evidence_strength as "evidenceStrength", e.observed_at as "observedAt", e.source
    from public.child_learning_evidence e
    left join public.feedback_memory_processing p on p.id = e.feedback_processing_id
    where e.child_id = v_child_id and e.target_id = any(v_clean_targets)
      and e.observed_at <= v_effective_cutoff
      and (e.feedback_processing_id is null or p.status = 'effective')
    order by e.observed_at desc, e.id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(to_jsonb(be) - 'id' order by be."observedAt" desc, be.id desc), '[]'::jsonb), count(*)::integer
  into v_evidence, v_evidence_count
  from bounded_evidence be;

  -- 6. Construct deterministic manifest and calculate SHA-256
  v_manifest_doc := jsonb_build_object(
    'requestHash', v_request_hash,
    'inputFingerprint', v_snapshot_fingerprint,
    'attemptCount', v_attempt_count,
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
    evidence,
    request_hash
  ) values (
    p_job_id,
    v_child_id,
    p_job_id,
    p_worker_id,
    v_manifest_hash,
    v_effective_cutoff,
    coalesce(v_clean_targets, array[]::text[]),
    v_evidence_count,
    v_evidence,
    v_request_hash
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


-- Advance defaults only; preserve in-flight snapshot release IDs.
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
      old_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.1')$binding$;
      new_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.2')$binding$;
    else
      old_binding := $binding$'targetReleaseId', 'rel_1.8.1'$binding$;
      new_binding := $binding$'targetReleaseId', 'rel_1.8.2'$binding$;
    end if;
    if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
      raise exception 'Expected exactly one previous release binding in %', signature;
    end if;
    execute replace(definition, old_binding, new_binding);
  end loop;
end;
$migration$;

