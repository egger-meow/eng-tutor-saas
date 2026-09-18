-- Parallel authoring batches with one configurable per-invocation batch limit.
--
-- Goals:
-- 1. One authoritative operational setting controls authoring batch size.
-- 2. Different workers may author concurrently.
-- 3. Claim start remains transaction-serialized, while row ownership stays atomic through
--    FOR UPDATE SKIP LOCKED inside the queue claim functions.
-- 4. Re-entering with the same worker recovers its existing batch instead of double-claiming.

-- Rename the historical setting to match its actual semantics.
insert into public.operational_settings (key, integer_value, description, updated_at)
select
  'authoring_batch_limit',
  integer_value,
  'Maximum jobs claimed by one authoring invocation.',
  now()
from public.operational_settings
where key = 'daily_generation_limit'
on conflict (key) do update
set integer_value = excluded.integer_value,
    description = excluded.description,
    updated_at = excluded.updated_at;

delete from public.operational_settings
where key = 'daily_generation_limit';

-- Current normal claim/recovery functions must read the canonical setting.
do $migration$
declare
  signature text;
  definition text;
  patched text;
begin
  foreach signature in array array[
    'private_generation.claim_due_generation_jobs(text)',
    'private_generation.chatgpt_claim_generation_batch(text)',
    'private_generation.chatgpt_recover_claimed_generation_batch(text)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    patched := replace(definition, 'daily_generation_limit', 'authoring_batch_limit');
    if patched = definition then
      raise exception 'authoring batch setting patch did not match %', signature;
    end if;
    execute patched;
  end loop;
end
$migration$;

-- Week 1 uses the exact same configurable batch-size authority.
create or replace function private_generation.claim_week1_fast_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_limit integer;
begin
  if worker_id <> 'chatgpt-week1-fast' then
    raise exception 'worker_id <> ''chatgpt-week1-fast'': dedicated Week 1 worker required';
  end if;

  select least(integer_value, 100)
  into claim_limit
  from public.operational_settings
  where key = 'authoring_batch_limit';

  if claim_limit is null or claim_limit < 1 then
    raise exception 'authoring_batch_limit is not configured';
  end if;

  return query
  with selected as (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    where job.source_material_id is null
      and job.material_id is null
      and job.scheduled_for <= now()
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (select 1 from public.materials as material where material.child_id = job.child_id)
      and not exists (
        select 1
        from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and active_submission.status in ('pending', 'processing')
      )
    order by job.created_at, job.id
    for update of job skip locked
    limit claim_limit
  )
  update public.generation_jobs as job
  set status = 'claimed',
      claimed_by = worker_id,
      lease_expires_at = now() + interval '6 hours',
      attempt_count = job.attempt_count + 1,
      feedback_missing = false,
      error_code = null,
      error_message = null
  from selected
  where job.id = selected.id
  returning job.*;
end;
$$;

-- The advisory lock now protects only the short start/claim critical section.
-- Active work owned by another worker is not a conflict.
create or replace function public.worker_start_authoring_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_active_count integer;
  authoring_lock_id constant bigint := 782941038592184719;
begin
  if worker_id is null or char_length(trim(worker_id)) < 3 then
    raise exception 'worker_id is required';
  end if;

  perform pg_advisory_xact_lock(authoring_lock_id);

  select count(*)
  into owned_active_count
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

  if owned_active_count > 0 then
    return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);
  end if;

  return private_generation.chatgpt_claim_generation_batch(worker_id);
end;
$$;

revoke all on function public.worker_start_authoring_batch(text)
from public, anon, authenticated;
grant execute on function public.worker_start_authoring_batch(text) to service_role;

comment on function public.worker_start_authoring_batch(text)
is 'Serializes only the claim critical section. Different worker IDs may hold active authoring batches concurrently; same-worker re-entry recovers its owned batch.';

comment on function private_generation.claim_week1_fast_generation_jobs(text)
is 'Atomically claims Week 1 jobs up to operational_settings.authoring_batch_limit using SKIP LOCKED.';
