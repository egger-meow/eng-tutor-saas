-- Migration: Restore Scheduled Work claim bridge API contract, targetReleaseId hardening, and retryContext construction
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
