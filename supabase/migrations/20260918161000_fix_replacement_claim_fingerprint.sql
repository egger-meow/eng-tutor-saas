-- Fix replacement claim fingerprint format to match immutable claim snapshot constraint.
create or replace function public.worker_claim_material_replacement_batch(
  p_worker_id text,
  p_job_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract jsonb;
  v_claimed jsonb := '[]'::jsonb;
  v_row record;
  v_context jsonb;
  v_fingerprint text;
begin
  if nullif(trim(p_worker_id), '') is null or char_length(trim(p_worker_id)) < 3 then
    raise exception 'worker id is required';
  end if;
  if p_job_ids is null or cardinality(p_job_ids) = 0 then
    raise exception 'replacement job ids are required';
  end if;
  if cardinality(p_job_ids) > 10 then
    raise exception 'replacement claim limit is 10';
  end if;

  v_contract := public.worker_current_authoring_contract();

  for v_row in
    select
      job.id as job_id,
      replacement.source_material_id,
      replacement.target_revision,
      replacement.reason,
      source.canonical_source as previous_canonical_source
    from public.generation_jobs job
    join private_generation.material_replacement_jobs replacement on replacement.job_id = job.id
    join public.materials source on source.id = replacement.source_material_id
    where job.id = any(p_job_ids)
      and replacement.completed_material_id is null
      and (
        job.status = 'pending'
        or (job.status = 'claimed' and job.lease_expires_at < now())
      )
    order by job.created_at, job.id
    for update of job skip locked
  loop
    update public.generation_jobs
    set status = 'claimed',
        claimed_by = p_worker_id,
        lease_expires_at = now() + interval '6 hours',
        attempt_count = attempt_count + 1,
        error_code = null,
        error_message = null,
        updated_at = now()
    where id = v_row.job_id;

    v_context := public.worker_generation_context(v_row.job_id, p_worker_id)
      || jsonb_build_object(
        'qualityTrends', public.worker_quality_trends(
          (select child_id from public.generation_jobs where id = v_row.job_id)
        ),
        'targetReleaseId', v_contract->>'releaseId',
        'activeAuthoringContract', v_contract,
        'replacementContext', jsonb_build_object(
          'sourceMaterialId', v_row.source_material_id,
          'targetRevision', v_row.target_revision,
          'reason', v_row.reason,
          'previousCanonicalPackage', v_row.previous_canonical_source,
          'repairInstructions', jsonb_build_array(
            'This is an audited quality replacement for an already released packet.',
            'Preserve the valid topic, learning targets, research, and stable existing question IDs.',
            'Repair deterministic workload honestly against immutable weekly_minutes. Handle underfill or overfill with useful dependent learning work; never copy targetMinutes into estimatedMinutes, pad with filler, or fake duration metadata.',
            'Verify metadata grade and gradeStage against the immutable claimed child snapshot, and use the current active authoring contract metadata plus the new replacement job identity.',
            'Review hidden vocabulary across reading, questions, options, examples, practice, and homework. Teach, context-support, or simplify genuinely difficult learner-relevant words; do not substitute a fixed word-list heuristic for semantic review.',
            'Run the normal Author, independent Critic, targeted repair, and pre-submit validation contract.',
            'Do not treat this replacement as a new learning week.'
          )
        )
      );

    v_fingerprint := 'sha256:' || encode(
      extensions.digest(convert_to(v_context::text, 'UTF8'), 'sha256'),
      'hex'
    );

    v_context := v_context || jsonb_build_object('inputFingerprint', v_fingerprint);

    insert into private_generation.generation_claim_snapshots (
      job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
    ) values (
      v_row.job_id, p_worker_id, v_context, v_fingerprint, now()
    )
    on conflict (job_id) do update set
      generation_worker_id = excluded.generation_worker_id,
      generation_context = excluded.generation_context,
      input_fingerprint = excluded.input_fingerprint,
      claimed_at = excluded.claimed_at;

    v_claimed := v_claimed || jsonb_build_array(v_context);
  end loop;

  return jsonb_build_object(
    'workerId', p_worker_id,
    'claimedCount', jsonb_array_length(v_claimed),
    'claimed', v_claimed,
    'activeAuthoringContract', v_contract
  );
end;
$$;

revoke all on function public.worker_claim_material_replacement_batch(text, uuid[])
from public, anon, authenticated;
grant execute on function public.worker_claim_material_replacement_batch(text, uuid[]) to service_role;
