-- Migration: Exclude submitted curriculum jobs from active authoring leases
-- Rationale:
-- When a worker submits an immutable curriculum package, authoring ownership ends.
-- The job remains status = 'claimed' solely for the downstream Finisher / Fast Publisher pipeline.
-- It must no longer be treated as an active authoring lease, block other workers,
-- or be returned during authoring claim recovery.

-- 1. Active authoring lease inspector
create or replace function public.worker_get_active_generation_leases()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'jobId', job.id,
    'workerId', job.claimed_by,
    'claimExpiresAt', job.lease_expires_at
  )), '[]'::jsonb)
  into result
  from public.generation_jobs as job
  where job.status = 'claimed'
    and job.lease_expires_at > now()
    and not exists (
      select 1
      from private_generation.curriculum_submissions as submission
      where submission.job_id = job.id
        and submission.authoring_attempt = job.attempt_count
    );

  return result;
end;
$$;

revoke all on function public.worker_get_active_generation_leases() from public, anon, authenticated;
grant execute on function public.worker_get_active_generation_leases() to service_role;

comment on function public.worker_get_active_generation_leases()
is 'Inspects active unsubmitted non-expired claimed generation jobs without mutating DB state.';

-- 2. Transaction-serialized authoring start entry point
create or replace function public.worker_start_authoring_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_worker text;
  active_count integer;
  authoring_lock_id constant bigint := 782941038592184719; -- hash key for production authoring claim serialization
begin
  if worker_id is null or char_length(trim(worker_id)) < 3 then
    raise exception 'worker_id is required';
  end if;

  -- 1. Acquire transaction-scoped advisory lock BEFORE inspecting leases or queue.
  -- Holds until the transaction ends (commit or rollback).
  perform pg_advisory_xact_lock(authoring_lock_id);

  -- 2. Inspect active unsubmitted leases under the serialization lock
  select job.claimed_by, count(*)
  into active_worker, active_count
  from public.generation_jobs as job
  where job.status = 'claimed'
    and job.lease_expires_at > now()
    and not exists (
      select 1
      from private_generation.curriculum_submissions as submission
      where submission.job_id = job.id
        and submission.authoring_attempt = job.attempt_count
    )
  group by job.claimed_by
  order by (case when job.claimed_by <> worker_id then 0 else 1 end), job.claimed_by
  limit 1;

  -- 3. If an active unsubmitted lease exists for another worker: fail closed immediately.
  if active_count is not null and active_count > 0 and active_worker <> worker_id then
    raise exception 'ACTIVE_AUTHORING_LEASE_CONFLICT: An active authoring lease is currently held by worker % (% jobs in flight). Cannot start new batch.',
      active_worker, active_count;
  end if;

  -- 4. If an active unsubmitted lease exists for the same worker: recover that existing authoritative batch instead of claiming again.
  if active_count is not null and active_count > 0 and active_worker = worker_id then
    return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);
  end if;

  -- 5. Zero active authoring leases exist across the entire queue.
  -- Perform exactly one authoritative production batch claim.
  return private_generation.chatgpt_claim_generation_batch(worker_id);
end;
$$;

revoke all on function public.worker_start_authoring_batch(text) from public, anon, authenticated;
grant execute on function public.worker_start_authoring_batch(text) to service_role;

comment on function public.worker_start_authoring_batch(text)
is 'Transaction-serialized entry point for all authoring starts. Acquires advisory lock, verifies unsubmitted leases, and performs or recovers authoritative batch.';

-- 3. Authoring batch recovery (excludes already submitted jobs from recovered contexts)
create or replace function private_generation.chatgpt_recover_claimed_generation_batch(worker_id text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  recovered_contexts jsonb := '[]'::jsonb;
  normal_limit integer;
  oldest_deadline timestamptz;
begin
  if worker_id is null or char_length(worker_id) < 3 then
    raise exception 'worker_id is required';
  end if;

  select integer_value into normal_limit
  from public.operational_settings
  where key = 'daily_generation_limit';

  select coalesce(
    jsonb_agg(
      snapshot.generation_context
      || jsonb_build_object('inputFingerprint', snapshot.input_fingerprint)
      order by job.generation_due_at, job.created_at, job.id
    ),
    '[]'::jsonb
  )
  into recovered_contexts
  from public.generation_jobs as job
  join private_generation.generation_claim_snapshots as snapshot
    on snapshot.job_id = job.id
  where job.status = 'claimed'
    and job.claimed_by = worker_id
    and job.lease_expires_at > now()
    and snapshot.generation_worker_id = worker_id
    and not exists (
      select 1
      from private_generation.curriculum_submissions as submission
      where submission.job_id = job.id
        and submission.authoring_attempt = job.attempt_count
    );

  select min(job.generation_due_at) into oldest_deadline
  from public.generation_jobs as job
  where job.status in ('pending', 'claimed', 'failed')
    and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.4.0',
    'source', 'active_claim_recovery',
    'claimed', recovered_contexts,
    'claimedCount', jsonb_array_length(recovered_contexts),
    'normalCapacity', normal_limit,
    'mandatoryCapacityOverride', jsonb_array_length(recovered_contexts) > coalesce(normal_limit, 0),
    'oldestOutstandingDeadline', oldest_deadline
  );
end;
$$;

revoke all on function private_generation.chatgpt_recover_claimed_generation_batch(text)
from public, anon, authenticated, service_role;

comment on function private_generation.chatgpt_recover_claimed_generation_batch(text)
is 'Read-only recovery of active unsubmitted Scheduled Work claims and server-owned snapshots.';

-- 4. Week 1 Fast lane authoring start (excludes already submitted Week 1 jobs)
create or replace function public.worker_start_week1_fast_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  week1_fast_lock_id constant bigint := 782941038592184720;
begin
  if worker_id <> 'chatgpt-week1-fast' then
    raise exception 'worker_id <> ''chatgpt-week1-fast'': dedicated Week 1 worker required';
  end if;

  perform pg_advisory_xact_lock(week1_fast_lock_id);

  select count(*) into active_count
  from public.generation_jobs as job
  where job.status = 'claimed'
    and job.claimed_by = worker_id
    and job.lease_expires_at > now()
    and not exists (
      select 1
      from private_generation.curriculum_submissions as submission
      where submission.job_id = job.id
        and submission.authoring_attempt = job.attempt_count
    );

  if active_count > 0 then
    return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);
  end if;

  return private_generation.claim_week1_fast_generation_batch(worker_id);
end;
$$;

revoke all on function public.worker_start_week1_fast_batch(text)
from public, anon, authenticated;
grant execute on function public.worker_start_week1_fast_batch(text)
to service_role;

comment on function public.worker_start_week1_fast_batch(text)
is 'Week 1 Fast lane authoring start. Acquires advisory lock, verifies unsubmitted Week 1 leases, and performs or recovers batch.';
