-- Migration: 20260906180000_two_stage_history_retrieval_and_rel_1_8_0.sql
-- Two-stage cross-week history retrieval, context compaction (strip 40 bulk rows from stage 1),
-- and advance generation release to rel_1.8.0.

-- 1. Advance release defaults in claim and submit functions to rel_1.8.0
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
      old_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.7.0')$binding$;
      new_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.0')$binding$;
    else
      old_binding := $binding$'targetReleaseId', 'rel_1.7.0'$binding$;
      new_binding := $binding$'targetReleaseId', 'rel_1.8.0'$binding$;
    end if;
    if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
      raise exception 'Expected exactly one previous release binding in %', signature;
    end if;
    execute replace(definition, old_binding, new_binding);
  end loop;
end;
$migration$;

-- 2. Update worker_generation_context to strip indiscriminate 40 bulk evidence rows
-- and attach immutable cutoffTimestamp, claimSnapshotId, and two-stage-v1 policy.
create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  base jsonb;
  child_value uuid;
  lifetime jsonb;
  v_format_memory jsonb;
  v_recent_forms jsonb;
  v_recent_delivery_memory jsonb;
  v_cutoff timestamptz := now();
begin
  base := public.worker_generation_context_before_student_library(job_id, worker_id);
  select child_id into child_value from public.generation_jobs where id = job_id;

  select jsonb_build_object(
    'vocabulary', jsonb_build_object('total', count(*), 'dueTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where review_due), '[]'::jsonb), 'verifiedWeakTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where weakness_reason is not null), '[]'::jsonb), 'uncertainTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where status in ('new', 'learning')), '[]'::jsonb), 'masteredTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where status = 'mastered'), '[]'::jsonb), 'regressionTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)),
    'grammar', (select jsonb_build_object('total', count(*), 'dueTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where review_due), '[]'::jsonb), 'verifiedWeakTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where weakness_reason is not null), '[]'::jsonb), 'uncertainTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where status in ('new', 'learning')), '[]'::jsonb), 'masteredTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where status = 'mastered'), '[]'::jsonb), 'regressionTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)) from public.child_grammar_progress where child_id = child_value),
    'communication', (select jsonb_build_object('total', count(*), 'dueTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where review_due), '[]'::jsonb), 'verifiedWeakTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where weakness_reason is not null), '[]'::jsonb), 'uncertainTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where status in ('new', 'learning')), '[]'::jsonb), 'masteredTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where status = 'mastered'), '[]'::jsonb), 'regressionTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)) from public.child_communication_progress where child_id = child_value)
  ) into lifetime from public.child_vocab_progress where child_id = child_value;

  -- Canonical format memory extraction
  v_format_memory := public.aggregate_format_memory(child_value, 4);
  v_recent_delivery_memory := coalesce(v_format_memory -> 'recentDeliveryMemory', '[]'::jsonb);
  v_recent_forms := coalesce(v_format_memory -> 'recentResponseForms', '[]'::jsonb);

  if base ? 'diversityCapsule' then
    base := jsonb_set(base, '{diversityCapsule,recentResponseForms}', v_recent_forms, true);
    base := jsonb_set(base, '{diversityCapsule,recentDeliveryMemory}', v_recent_delivery_memory, true);
  end if;

  return base || jsonb_build_object(
    'lifetimeLearningMemory', lifetime,
    'targetedOlderEvidence', '[]'::jsonb,
    'cutoffTimestamp', v_cutoff,
    'claimSnapshotId', job_id,
    'recentDeliveryMemory', v_recent_delivery_memory,
    'memoryPolicyVersion', 'two-stage-v1'
  );
end;
$$;

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;

-- 3. RPC: private_generation.fetch_targeted_student_history
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
  v_snapshot_claimed_at timestamptz;
  v_snapshot_context jsonb;
  v_effective_cutoff timestamptz;
  v_evidence jsonb;
  v_evidence_count integer;
  v_manifest_hash text;
begin
  if p_job_id is null then
    raise exception 'JOB_ID_REQUIRED';
  end if;
  if p_worker_id is null or char_length(trim(p_worker_id)) < 3 then
    raise exception 'WORKER_ID_REQUIRED';
  end if;

  -- 1. Validate active claim & lease for this job
  select child_id, claimed_by, lease_expires_at
  into v_child_id, v_claimed_by, v_lease_expires_at
  from public.generation_jobs
  where id = p_job_id;

  if v_child_id is null then
    raise exception 'JOB_NOT_FOUND: Job % does not exist', p_job_id;
  end if;

  if v_claimed_by <> p_worker_id then
    raise exception 'WORKER_MISMATCH: Job % is claimed by %, not %', p_job_id, v_claimed_by, p_worker_id;
  end if;

  if v_lease_expires_at is not null and v_lease_expires_at < now() then
    raise exception 'LEASE_EXPIRED: Lease on job % expired at %', p_job_id, v_lease_expires_at;
  end if;

  -- 2. Resolve immutable cutoff timestamp from claim snapshot
  select claimed_at, generation_context
  into v_snapshot_claimed_at, v_snapshot_context
  from private_generation.generation_claim_snapshots
  where job_id = p_job_id;

  v_effective_cutoff := coalesce(
    (v_snapshot_context->>'cutoffTimestamp')::timestamptz,
    v_snapshot_claimed_at,
    p_cutoff_timestamp,
    now()
  );

  -- Never permit a query cutoff after the claim cutoff
  if p_cutoff_timestamp is not null and p_cutoff_timestamp < v_effective_cutoff then
    v_effective_cutoff := p_cutoff_timestamp;
  end if;

  -- 3. If no specific targets requested, return empty bounded set
  if p_target_ids is null or array_length(p_target_ids, 1) is null or array_length(p_target_ids, 1) = 0 then
    return jsonb_build_object(
      'jobId', p_job_id,
      'childId', v_child_id,
      'cutoffTimestamp', v_effective_cutoff,
      'targetIds', '[]'::jsonb,
      'evidence', '[]'::jsonb,
      'evidenceCount', 0,
      'manifestHash', 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  end if;

  -- 4. Query targeted older evidence strictly bounded by targets, cutoff, and limit
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'targetType', e.target_type,
        'targetId', e.target_id,
        'result', e.result,
        'observedAt', e.observed_at
      ) order by e.observed_at desc
    ), '[]'::jsonb),
    count(*)
  into v_evidence, v_evidence_count
  from (
    select e.*
    from public.child_learning_evidence e
    left join public.feedback_memory_processing p on p.id = e.feedback_processing_id
    where e.child_id = v_child_id
      and e.target_id = any(p_target_ids)
      and e.observed_at <= v_effective_cutoff
      and (e.feedback_processing_id is null or p.status = 'effective')
    order by e.observed_at desc
    limit greatest(1, least(coalesce(p_evidence_limit, 10), 40))
  ) e;

  -- 5. Calculate deterministic manifest hash
  v_manifest_hash := 'sha256:' || encode(
    extensions.digest(convert_to(v_evidence::text, 'UTF8'), 'sha256'),
    'hex'
  );

  return jsonb_build_object(
    'jobId', p_job_id,
    'childId', v_child_id,
    'cutoffTimestamp', v_effective_cutoff,
    'targetIds', to_jsonb(p_target_ids),
    'evidence', v_evidence,
    'evidenceCount', v_evidence_count,
    'manifestHash', v_manifest_hash
  );
end;
$$;

revoke all on function private_generation.fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) from public, anon, authenticated;
grant execute on function private_generation.fetch_targeted_student_history(uuid, text, uuid, timestamptz, text[], integer) to service_role;

-- 4. Public worker wrapper for client.rpc
create or replace function public.worker_fetch_targeted_student_history(
  job_id uuid,
  worker_id text,
  target_ids text[],
  cutoff_timestamp timestamptz default null,
  claim_snapshot_id uuid default null,
  evidence_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private_generation.fetch_targeted_student_history(
    job_id,
    worker_id,
    claim_snapshot_id,
    cutoff_timestamp,
    target_ids,
    evidence_limit
  );
end;
$$;

revoke all on function public.worker_fetch_targeted_student_history(uuid, text, text[], timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.worker_fetch_targeted_student_history(uuid, text, text[], timestamptz, uuid, integer) to service_role;
