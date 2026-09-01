-- Recover the server-staged Scheduled Work batch without mutating generation jobs.
-- Scheduled Work uses this after Supabase Cron has performed the authoritative claim.

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
    and snapshot.generation_worker_id = worker_id;

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
is 'Read-only recovery of active Scheduled Work claims and server-owned snapshots after server-side claim staging.';
