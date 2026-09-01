-- Migration: Transaction-scoped serialized production authoring start
-- Introduces a shared PostgreSQL advisory-lock boundary for ALL authoring claim paths
-- (local Codex, online manual POST /start, ChatGPT Scheduled Work pg_cron, local runner).
-- Guarantees:
-- 1. Lock acquired BEFORE checking active leases or claiming.
-- 2. If another worker holds an active lease: fails closed with ACTIVE_AUTHORING_LEASE_CONFLICT.
-- 3. If the same worker holds an active lease: recovers the existing batch (idempotent, no second claim).
-- 4. If no active lease: performs exactly one authoritative claim.
-- 5. Eliminates all cross-executor and intra-executor claim race conditions (no capacity * 2, no skip locked duplicate batches).

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

  -- 2. Inspect active leases under the serialization lock
  select claimed_by, count(*)
  into active_worker, active_count
  from public.generation_jobs
  where status = 'claimed'
    and lease_expires_at > now()
  group by claimed_by
  limit 1;

  -- 3. If an active lease exists for another worker: fail closed immediately.
  if active_count is not null and active_count > 0 and active_worker <> worker_id then
    raise exception 'ACTIVE_AUTHORING_LEASE_CONFLICT: An active authoring lease is currently held by worker % (% jobs in flight). Cannot start new batch.',
      active_worker, active_count;
  end if;

  -- 4. If an active lease exists for the same worker: recover that existing authoritative batch instead of claiming again.
  if active_count is not null and active_count > 0 and active_worker = worker_id then
    return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);
  end if;

  -- 5. Zero active authoring leases exist across the entire queue.
  -- Perform exactly one authoritative production batch claim.
  return private_generation.chatgpt_claim_generation_batch(worker_id);
end;
$$;

-- Delegate existing local and online manual wrappers to the shared serialized start primitive
create or replace function public.worker_start_online_manual_authoring_batch(worker_id text)
returns jsonb language sql security definer set search_path = ''
as $$ select public.worker_start_authoring_batch($1); $$;

create or replace function public.worker_claim_local_authoring_batch(worker_id text)
returns jsonb language sql security definer set search_path = ''
as $$ select public.worker_start_authoring_batch($1); $$;

-- Update worker_set_scheduler_mode to use the serialized start primitive for scheduled cron
create or replace function public.worker_set_scheduler_mode(mode text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(trim(mode));
  existing_job record;
begin
  if normalized not in ('local', 'online') then
    raise exception 'Invalid scheduler mode: % (expected local or online)', mode;
  end if;

  insert into private_generation.production_operational_settings (key, value, updated_at)
  values ('scheduler_mode', normalized, now())
  on conflict (key) do update
  set value = excluded.value, updated_at = now();

  -- Clean up existing daily claim cron job if pg_cron is installed
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for existing_job in
      select jobid from cron.job where jobname = 'paper-english-chatgpt-claim-daily'
    loop
      perform cron.unschedule(existing_job.jobid);
    end loop;

    -- If online, schedule the daily claim using the serialized start primitive
    if normalized = 'online' then
      perform cron.schedule(
        'paper-english-chatgpt-claim-daily',
        '10 16 * * *',
        $cron$select public.worker_start_authoring_batch('chatgpt-work-daily');$cron$
      );
    end if;
  end if;

  return normalized;
end;
$$;

-- If online cron is currently scheduled, update its command in place
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'paper-english-chatgpt-claim-daily') then
      update cron.job
      set command = 'select public.worker_start_authoring_batch(''chatgpt-work-daily'');'
      where jobname = 'paper-english-chatgpt-claim-daily';
    end if;
  end if;
end;
$$;

revoke all on function public.worker_start_authoring_batch(text) from public, anon, authenticated;
revoke all on function public.worker_start_online_manual_authoring_batch(text) from public, anon, authenticated;
revoke all on function public.worker_claim_local_authoring_batch(text) from public, anon, authenticated;

grant execute on function public.worker_start_authoring_batch(text) to service_role;
grant execute on function public.worker_start_online_manual_authoring_batch(text) to service_role;
grant execute on function public.worker_claim_local_authoring_batch(text) to service_role;

comment on function public.worker_start_authoring_batch(text)
is 'Transaction-serialized entry point for all authoring starts (local, online manual, scheduled). Acquires advisory lock, verifies leases, and performs or recovers authoritative batch.';
