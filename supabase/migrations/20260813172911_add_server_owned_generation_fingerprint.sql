create table private_generation.generation_claim_snapshots (
  job_id uuid primary key references public.generation_jobs(id) on delete cascade,
  generation_worker_id text not null,
  generation_context jsonb not null,
  input_fingerprint text not null,
  claimed_at timestamptz not null default now(),
  constraint generation_claim_snapshots_context_object
    check (jsonb_typeof(generation_context) = 'object'),
  constraint generation_claim_snapshots_sha256
    check (input_fingerprint ~ '^sha256:[0-9a-f]{64}$')
);

alter table private_generation.generation_claim_snapshots enable row level security;

comment on table private_generation.generation_claim_snapshots is
  'Server-owned generation context snapshot and SHA-256 provenance for the active ChatGPT Work claim.';

revoke all on table private_generation.generation_claim_snapshots
from public, anon, authenticated, service_role;

create or replace function private_generation.chatgpt_claim_generation_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  generation_context jsonb;
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

    generation_context := public.worker_generation_context(claimed_job.id, worker_id);
    generation_context := generation_context || jsonb_build_object(
      'qualityTrends', public.worker_quality_trends(claimed_job.child_id)
    );
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
        claimed_at = excluded.claimed_at
    where not exists (
      select 1
      from private_generation.curriculum_submissions as submission
      where submission.job_id = excluded.job_id
    );

    if not found then
      raise exception 'job already has an immutable curriculum submission';
    end if;

    claimed_contexts := claimed_contexts || jsonb_build_array(
      generation_context || jsonb_build_object('inputFingerprint', fingerprint)
    );
  end loop;

  select min(job.generation_due_at) into oldest_deadline
  from public.generation_jobs as job
  where job.status in ('pending', 'claimed', 'failed')
    and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.1.0',
    'claimed', claimed_contexts,
    'claimedCount', jsonb_array_length(claimed_contexts),
    'normalCapacity', normal_limit,
    'mandatoryCapacityOverride', jsonb_array_length(claimed_contexts) > coalesce(normal_limit, 0),
    'oldestOutstandingDeadline', oldest_deadline
  );
end;
$$;

revoke all on function private_generation.chatgpt_claim_generation_batch(text)
from public, anon, authenticated, service_role;

create or replace function private_generation.chatgpt_submit_curriculum_package(
  job_id uuid,
  worker_id text,
  canonical_source jsonb
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
begin
  if jsonb_typeof(canonical_source) <> 'object'
    or canonical_source #>> '{metadata,schemaVersion}' <> '2.0.0' then
    raise exception 'canonical_source must be a Curriculum Package 2.0.0 object';
  end if;
  if pg_column_size(canonical_source) > 2097152 then
    raise exception 'canonical_source exceeds the 2 MiB bridge limit';
  end if;

  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
  for update;

  if claimed_job.id is null
    or claimed_job.status <> 'claimed'
    or claimed_job.claimed_by <> $2
    or claimed_job.lease_expires_at <= now() then
    raise exception 'job is not actively claimed by this worker';
  end if;
  if canonical_source #>> '{metadata,jobId}' <> claimed_job.id::text
    or canonical_source #>> '{metadata,childId}' <> claimed_job.child_id::text then
    raise exception 'curriculum package metadata does not match the claimed job';
  end if;

  select * into claim_snapshot
  from private_generation.generation_claim_snapshots as snapshot
  where snapshot.job_id = $1
  for update;

  if claim_snapshot.job_id is null
    or claim_snapshot.generation_worker_id <> $2 then
    raise exception 'server-owned generation claim snapshot is missing';
  end if;
  if canonical_source #>> '{metadata,inputFingerprint}' is distinct from claim_snapshot.input_fingerprint then
    raise exception 'curriculum package input fingerprint does not match the claimed context';
  end if;

  select * into existing_submission
  from private_generation.curriculum_submissions as submission
  where submission.job_id = $1;

  if existing_submission.job_id is not null then
    if existing_submission.generation_worker_id <> $2
      or existing_submission.canonical_source <> $3 then
      raise exception 'a different immutable curriculum submission already exists for this job';
    end if;
    return jsonb_build_object('jobId', existing_submission.job_id, 'status', existing_submission.status, 'idempotent', true);
  end if;

  insert into private_generation.curriculum_submissions (
    job_id, generation_worker_id, canonical_source
  ) values ($1, $2, $3);

  return jsonb_build_object('jobId', $1, 'status', 'pending', 'idempotent', false);
end;
$$;

revoke all on function private_generation.chatgpt_submit_curriculum_package(uuid, text, jsonb)
from public, anon, authenticated, service_role;

-- Recover only jobs failed by the missing-fingerprint bridge defect. Preserve the
-- attempt count for auditability and let the normal claim path perform the retry.
update public.generation_jobs
set status = 'pending',
    claimed_by = null,
    lease_expires_at = null,
    scheduled_for = least(scheduled_for, now()),
    error_code = null,
    error_message = null
where status = 'failed'
  and completed_at is null
  and material_id is null
  and claimed_by = 'chatgpt-work-daily'
  and error_code = 'TECHNICAL_FAILED'
  and attempt_count < max_attempts
  and lower(error_message) like '%fingerprint%';
