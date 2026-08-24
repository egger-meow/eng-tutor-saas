-- Accept only the new canonical production authoring schema at the submission
-- bridge. All claim, immutable-attempt, fingerprint, insertion, and status
-- semantics are copied unchanged from the preceding function definition.
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

  select * into existing_submission
  from private_generation.curriculum_submissions as submission
  where submission.job_id = $1 and submission.authoring_attempt = claimed_job.attempt_count;

  if existing_submission.job_id is not null then
    if existing_submission.generation_worker_id <> $2
       or existing_submission.canonical_source <> $3 then
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
    $1, claimed_job.attempt_count, $2, $3, claim_snapshot.input_fingerprint, 'pending'
  );

  return jsonb_build_object(
    'jobId', $1,
    'status', 'pending',
    'authoringAttempt', claimed_job.attempt_count,
    'schemaVersion', schema_ver
  );
end;
$$;
