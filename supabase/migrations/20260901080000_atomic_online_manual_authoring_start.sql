-- Atomic Online Manual Authoring Start RPC
-- Atomically checks for conflicting active authoring leases across the production queue.
-- If any active lease exists (status = 'claimed' and lease_expires_at > now()):
--   fails closed by raising an exception, preventing dual-executor collisions.
-- Otherwise, performs exactly one authoritative production batch claim under the pinned worker identity.

create or replace function public.worker_start_online_manual_authoring_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_worker text;
  active_count integer;
begin
  if worker_id is null or char_length(trim(worker_id)) < 3 then
    raise exception 'worker_id is required';
  end if;

  -- 1. Atomic lease collision check across all generation jobs
  select claimed_by, count(*)
  into active_worker, active_count
  from public.generation_jobs
  where status = 'claimed'
    and lease_expires_at > now()
  group by claimed_by
  limit 1;

  if active_count is not null and active_count > 0 then
    raise exception 'ACTIVE_AUTHORING_LEASE_CONFLICT: An active authoring lease is currently held by worker % (% jobs in flight). Cannot start new batch.',
      active_worker, active_count;
  end if;

  -- 2. Zero active authoring leases exist across the entire queue.
  -- Perform exactly one authoritative production batch claim.
  return private_generation.chatgpt_claim_generation_batch(worker_id);
end;
$$;

revoke all on function public.worker_start_online_manual_authoring_batch(text) from public, anon, authenticated;
grant execute on function public.worker_start_online_manual_authoring_batch(text) to service_role;

comment on function public.worker_start_online_manual_authoring_batch(text)
is 'Atomically verifies zero active authoring leases exist across the queue before performing exactly one authoritative batch claim for online manual authoring.';
