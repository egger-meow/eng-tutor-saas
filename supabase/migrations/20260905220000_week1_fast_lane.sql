-- Week 1 Fast Lane
-- Dedicated first-packet authoring wake, publication dispatch, safe progress projection,
-- and atomic fast publication. Week 2+ continues through the normal Finisher path.

-- ---------------------------------------------------------------------------
-- 1. Private outboxes and short-lived pre-auth progress tokens
-- ---------------------------------------------------------------------------

create table if not exists private_generation.week1_wake_outbox (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.generation_jobs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  last_error_code text,
  processing_lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists week1_wake_outbox_dispatch_idx
  on private_generation.week1_wake_outbox (status, created_at)
  where status in ('pending', 'processing', 'failed');

create table if not exists private_generation.week1_publish_outbox (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  authoring_attempt integer not null check (authoring_attempt > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  last_error_code text,
  processing_lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (job_id, authoring_attempt)
);

create index if not exists week1_publish_outbox_dispatch_idx
  on private_generation.week1_publish_outbox (status, created_at)
  where status in ('pending', 'processing', 'failed');

create table if not exists private_generation.week1_progress_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (char_length(token_hash) = 64),
  child_id uuid not null references public.children(id) on delete cascade,
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists week1_progress_tokens_expiry_idx
  on private_generation.week1_progress_tokens (expires_at);

revoke all on table private_generation.week1_wake_outbox from public, anon, authenticated;
revoke all on table private_generation.week1_publish_outbox from public, anon, authenticated;
revoke all on table private_generation.week1_progress_tokens from public, anon, authenticated;
grant select, insert, update, delete on table private_generation.week1_wake_outbox to service_role;
grant select, insert, update, delete on table private_generation.week1_publish_outbox to service_role;
grant select, insert, update, delete on table private_generation.week1_progress_tokens to service_role;

alter table private_generation.curriculum_submissions
  add column if not exists publication_path text not null default 'normal_finisher';

alter table private_generation.curriculum_submissions
  drop constraint if exists curriculum_submissions_publication_path_check;
alter table private_generation.curriculum_submissions
  add constraint curriculum_submissions_publication_path_check
  check (publication_path in ('normal_finisher', 'week1_fast'));

-- ---------------------------------------------------------------------------
-- 2. Transactional/idempotent outbox creation from authoritative DB state
-- ---------------------------------------------------------------------------

create or replace function private_generation.enqueue_week1_wake_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_material_id is null and new.material_id is null and new.status in ('pending', 'claimed') then
    insert into private_generation.week1_wake_outbox(job_id)
    values (new.id)
    on conflict (job_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private_generation.enqueue_week1_wake_outbox() from public, anon, authenticated, service_role;

drop trigger if exists generation_jobs_enqueue_week1_wake on public.generation_jobs;
create trigger generation_jobs_enqueue_week1_wake
after insert on public.generation_jobs
for each row execute function private_generation.enqueue_week1_wake_outbox();

insert into private_generation.week1_wake_outbox(job_id)
select job.id
from public.generation_jobs as job
where job.source_material_id is null
  and job.material_id is null
  and job.status in ('pending', 'claimed')
on conflict (job_id) do nothing;

create or replace function private_generation.enqueue_week1_publish_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.generation_worker_id = 'chatgpt-week1-fast'
     and new.status = 'pending'
     and exists (
       select 1 from public.generation_jobs as job
       where job.id = new.job_id
         and job.source_material_id is null
         and job.material_id is null
     ) then
    insert into private_generation.week1_publish_outbox(job_id, authoring_attempt)
    values (new.job_id, new.authoring_attempt)
    on conflict (job_id, authoring_attempt) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private_generation.enqueue_week1_publish_outbox() from public, anon, authenticated, service_role;

drop trigger if exists curriculum_submissions_enqueue_week1_publish on private_generation.curriculum_submissions;
create trigger curriculum_submissions_enqueue_week1_publish
after insert on private_generation.curriculum_submissions
for each row execute function private_generation.enqueue_week1_publish_outbox();

-- ---------------------------------------------------------------------------
-- 3. Dedicated Week 1 authoring claim and recovery
-- ---------------------------------------------------------------------------

create or replace function private_generation.claim_week1_fast_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if worker_id <> 'chatgpt-week1-fast' then
    raise exception 'worker_id <> ''chatgpt-week1-fast'': dedicated Week 1 worker required';
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
    limit 15
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

revoke all on function private_generation.claim_week1_fast_generation_jobs(text) from public, anon, authenticated;
grant execute on function private_generation.claim_week1_fast_generation_jobs(text) to service_role;

create or replace function private_generation.claim_week1_fast_generation_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs%rowtype;
  generation_context jsonb;
  retry_context jsonb;
  fingerprint text;
  claimed_contexts jsonb := '[]'::jsonb;
  oldest_deadline timestamptz;
begin
  if worker_id <> 'chatgpt-week1-fast' then
    raise exception 'worker_id <> ''chatgpt-week1-fast'': dedicated Week 1 worker required';
  end if;

  for claimed_job in
    select * from private_generation.claim_week1_fast_generation_jobs(worker_id)
  loop
    generation_context := public.worker_generation_context(claimed_job.id, worker_id)
      || jsonb_build_object(
        'qualityTrends', public.worker_quality_trends(claimed_job.child_id),
        'targetReleaseId', 'rel_1.6.0',
        'week1FastLane', true
      );

    select jsonb_build_object(
      'previousAttemptNumber', submission.authoring_attempt,
      'previousCanonicalPackage', submission.canonical_source,
      'failureType', submission.error_code,
      'findings', coalesce(submission.failure_evidence -> 'findings', '[]'::jsonb),
      'failureEvidence', coalesce(submission.failure_evidence, '{}'::jsonb),
      'repairInstructions', jsonb_build_array(
        'Preserve already-valid Week 1 content.',
        'Repair only the failed section and dependent references.',
        'Keep stable question IDs and target mappings when possible.'
      )
    ) into retry_context
    from private_generation.curriculum_submissions as submission
    where submission.job_id = claimed_job.id
      and submission.status in ('quality_rejected', 'technical_failed')
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
      job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
    ) values (
      claimed_job.id, worker_id, generation_context, fingerprint, now()
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
  where job.source_material_id is null
    and job.material_id is null
    and job.status in ('pending', 'claimed', 'failed');

  return jsonb_build_object(
    'bridgeVersion', 'week1-fast/1.0.0',
    'claimed', claimed_contexts,
    'claimedCount', jsonb_array_length(claimed_contexts),
    'oldestOutstandingDeadline', oldest_deadline
  );
end;
$$;

revoke all on function private_generation.claim_week1_fast_generation_batch(text) from public, anon, authenticated;
grant execute on function private_generation.claim_week1_fast_generation_batch(text) to service_role;

create or replace function public.worker_start_week1_fast_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_worker text;
  active_count integer;
  authoring_lock_id constant bigint := 782941038592184719;
begin
  if worker_id <> 'chatgpt-week1-fast' then
    raise exception 'worker_id <> ''chatgpt-week1-fast'': dedicated Week 1 worker required';
  end if;

  perform pg_advisory_xact_lock(authoring_lock_id);

  select claimed_by, count(*)
  into active_worker, active_count
  from public.generation_jobs
  where status = 'claimed'
    and lease_expires_at > now()
  group by claimed_by
  order by claimed_by
  limit 1;

  if active_count is not null and active_count > 0 and active_worker <> worker_id then
    raise exception 'ACTIVE_AUTHORING_LEASE_CONFLICT: active authoring lease held by %', active_worker;
  end if;

  if active_count is not null and active_count > 0 and active_worker = worker_id then
    return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);
  end if;

  return private_generation.claim_week1_fast_generation_batch(worker_id);
end;
$$;

create or replace function public.worker_recover_week1_fast_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if worker_id <> 'chatgpt-week1-fast' then
    raise exception 'worker_id <> ''chatgpt-week1-fast'': dedicated Week 1 worker required';
  end if;
  return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);
end;
$$;

revoke all on function public.worker_start_week1_fast_batch(text) from public, anon, authenticated;
revoke all on function public.worker_recover_week1_fast_batch(text) from public, anon, authenticated;
grant execute on function public.worker_start_week1_fast_batch(text) to service_role;
grant execute on function public.worker_recover_week1_fast_batch(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Parent-safe progress projection and short-lived token API
-- ---------------------------------------------------------------------------

create or replace function private_generation.week1_progress_projection(p_job_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_submission private_generation.curriculum_submissions%rowtype;
  v_claimed_at timestamptz;
  v_stage text;
  v_stage_at timestamptz;
begin
  select * into v_job from public.generation_jobs where id = p_job_id;
  if v_job.id is null or v_job.source_material_id is not null then
    return null;
  end if;

  select * into v_submission
  from private_generation.curriculum_submissions
  where job_id = v_job.id
  order by authoring_attempt desc
  limit 1;

  select claimed_at into v_claimed_at
  from private_generation.generation_claim_snapshots
  where job_id = v_job.id;

  if v_job.status = 'completed' and v_job.material_id is not null then
    v_stage := 'ready';
    v_stage_at := coalesce(v_job.completed_at, now());
  elsif v_submission.job_id is not null and v_submission.status in ('pending', 'processing', 'technical_failed') then
    v_stage := 'publishing';
    v_stage_at := coalesce(v_submission.updated_at, v_submission.submitted_at, v_claimed_at, v_job.created_at);
  elsif v_job.status = 'claimed' then
    v_stage := 'authoring';
    v_stage_at := coalesce(v_claimed_at, v_job.created_at);
  else
    v_stage := 'queued';
    v_stage_at := v_job.created_at;
  end if;

  return jsonb_build_object(
    'stage', v_stage,
    'stageUpdatedAt', v_stage_at,
    'ready', (v_stage = 'ready'),
    'materialId', case when v_stage = 'ready' then v_job.material_id else null end
  );
end;
$$;

revoke all on function private_generation.week1_progress_projection(uuid) from public, anon, authenticated, service_role;

grant execute on function private_generation.week1_progress_projection(uuid) to service_role;

create or replace function public.get_owned_week1_progress(p_child_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.children
    where id = p_child_id and parent_id = auth.uid() and is_active
  ) then
    raise exception 'child not found';
  end if;

  select id into v_job_id
  from public.generation_jobs
  where child_id = p_child_id and source_material_id is null
  order by created_at asc
  limit 1;

  if v_job_id is null then
    return jsonb_build_object('stage', 'received', 'stageUpdatedAt', now(), 'ready', false, 'materialId', null);
  end if;

  return private_generation.week1_progress_projection(v_job_id);
end;
$$;

revoke all on function public.get_owned_week1_progress(uuid) from public, anon;
grant execute on function public.get_owned_week1_progress(uuid) to authenticated, service_role;

create or replace function public.worker_issue_week1_progress_token(p_child_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_token text;
  v_hash text;
begin
  select job.id into v_job_id
  from public.generation_jobs as job
  where job.child_id = p_child_id
    and job.source_material_id is null
    and job.material_id is null
    and job.status in ('pending', 'claimed')
  order by job.created_at asc
  limit 1;

  if v_job_id is null then return null; end if;

  delete from private_generation.week1_progress_tokens
  where child_id = p_child_id or expires_at <= now();

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into private_generation.week1_progress_tokens(token_hash, child_id, job_id, expires_at)
  values (v_hash, p_child_id, v_job_id, now() + interval '2 hours');

  return v_token;
end;
$$;

create or replace function public.worker_read_week1_progress_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_row private_generation.week1_progress_tokens%rowtype;
  v_progress jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select * into v_row
  from private_generation.week1_progress_tokens
  where token_hash = v_hash and expires_at > now()
  for update;

  if not found then return null; end if;

  update private_generation.week1_progress_tokens
  set last_used_at = now()
  where id = v_row.id;

  v_progress := private_generation.week1_progress_projection(v_row.job_id);
  if v_progress is null then return null; end if;

  -- Anonymous token projection intentionally strips material identity.
  return v_progress - 'materialId';
end;
$$;

revoke all on function public.worker_issue_week1_progress_token(uuid) from public, anon, authenticated;
revoke all on function public.worker_read_week1_progress_token(text) from public, anon, authenticated;
grant execute on function public.worker_issue_week1_progress_token(uuid) to service_role;
grant execute on function public.worker_read_week1_progress_token(text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Outbox dispatch leasing
-- ---------------------------------------------------------------------------

create or replace function public.worker_claim_week1_wake_outbox(p_limit integer default 10)
returns table(id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with selected as (
    select outbox.id
    from private_generation.week1_wake_outbox as outbox
    join public.generation_jobs as job on job.id = outbox.job_id
    where outbox.status in ('pending', 'failed')
       or (outbox.status = 'processing' and outbox.processing_lease_expires_at < now())
      and job.source_material_id is null
      and job.material_id is null
      and job.status in ('pending', 'claimed')
    order by outbox.created_at
    for update of outbox skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  )
  update private_generation.week1_wake_outbox as outbox
  set status = 'processing', attempt_count = outbox.attempt_count + 1,
      processing_lease_expires_at = now() + interval '2 minutes', updated_at = now()
  from selected
  where outbox.id = selected.id
  returning outbox.id;
end;
$$;

create or replace function public.worker_finish_week1_wake_outbox(p_id uuid, p_success boolean, p_error_code text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  update private_generation.week1_wake_outbox
  set status = case when p_success then 'sent' else 'failed' end,
      sent_at = case when p_success then now() else sent_at end,
      last_error_code = case when p_success then null else left(coalesce(p_error_code, 'DISPATCH_FAILED'), 100) end,
      processing_lease_expires_at = null,
      updated_at = now()
  where id = p_id and status = 'processing';
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.worker_claim_week1_publish_outbox(p_limit integer default 10)
returns table(id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with selected as (
    select outbox.id
    from private_generation.week1_publish_outbox as outbox
    join private_generation.curriculum_submissions as submission
      on submission.job_id = outbox.job_id and submission.authoring_attempt = outbox.authoring_attempt
    where (outbox.status in ('pending', 'failed')
       or (outbox.status = 'processing' and outbox.processing_lease_expires_at < now()))
      and submission.generation_worker_id = 'chatgpt-week1-fast'
      and submission.status in ('pending', 'technical_failed', 'processing')
    order by outbox.created_at
    for update of outbox skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  )
  update private_generation.week1_publish_outbox as outbox
  set status = 'processing', attempt_count = outbox.attempt_count + 1,
      processing_lease_expires_at = now() + interval '2 minutes', updated_at = now()
  from selected
  where outbox.id = selected.id
  returning outbox.id;
end;
$$;

create or replace function public.worker_finish_week1_publish_outbox(p_id uuid, p_success boolean, p_error_code text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  update private_generation.week1_publish_outbox
  set status = case when p_success then 'sent' else 'failed' end,
      sent_at = case when p_success then now() else sent_at end,
      last_error_code = case when p_success then null else left(coalesce(p_error_code, 'DISPATCH_FAILED'), 100) end,
      processing_lease_expires_at = null,
      updated_at = now()
  where id = p_id and status = 'processing';
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.worker_claim_week1_wake_outbox(integer) from public, anon, authenticated;
revoke all on function public.worker_finish_week1_wake_outbox(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.worker_claim_week1_publish_outbox(integer) from public, anon, authenticated;
revoke all on function public.worker_finish_week1_publish_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.worker_claim_week1_wake_outbox(integer) to service_role;
grant execute on function public.worker_finish_week1_wake_outbox(uuid, boolean, text) to service_role;
grant execute on function public.worker_claim_week1_publish_outbox(integer) to service_role;
grant execute on function public.worker_finish_week1_publish_outbox(uuid, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Dedicated Week 1 fast submission publisher claim / failure / completion
-- ---------------------------------------------------------------------------

create or replace function public.worker_claim_week1_fast_submissions(processor_id text, claim_limit integer default 5)
returns table (job_id uuid, authoring_attempt integer, generation_worker_id text, canonical_source jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then raise exception 'processor_id is required'; end if;
  if claim_limit < 1 or claim_limit > 25 then raise exception 'claim_limit must be between 1 and 25'; end if;

  return query
  with selected as (
    select submission.job_id, submission.authoring_attempt
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where submission.generation_worker_id = 'chatgpt-week1-fast'
      and job.source_material_id is null
      and job.material_id is null
      and job.status = 'claimed'
      and job.claimed_by = 'chatgpt-week1-fast'
      and (
        submission.status in ('pending', 'technical_failed')
        or (submission.status = 'processing' and submission.processor_lease_expires_at < now())
      )
    order by submission.submitted_at, submission.job_id, submission.authoring_attempt
    for update of submission skip locked
    limit claim_limit
  ), renewed_jobs as (
    update public.generation_jobs as job
    set lease_expires_at = now() + interval '2 hours'
    from selected
    where job.id = selected.job_id
    returning job.id
  )
  update private_generation.curriculum_submissions as submission
  set status = 'processing', processor_id = $1,
      processor_lease_expires_at = now() + interval '30 minutes',
      attempt_count = submission.attempt_count + 1,
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;

create or replace function public.worker_fail_week1_fast_submission(
  p_job_id uuid,
  p_authoring_attempt integer,
  p_processor_id text,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  update private_generation.curriculum_submissions
  set status = 'technical_failed',
      processor_lease_expires_at = null,
      error_code = left(coalesce(p_error_code, 'WEEK1_FAST_PUBLISH_FAILED'), 100),
      error_message = left(coalesce(p_error_message, 'Week 1 fast publication failed'), 2000),
      processed_at = now(),
      updated_at = now()
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt
    and status = 'processing'
    and processor_id = p_processor_id
    and generation_worker_id = 'chatgpt-week1-fast';
  get diagnostics affected = row_count;

  if affected = 1 then
    update private_generation.week1_publish_outbox
    set status = 'failed', last_error_code = left(coalesce(p_error_code, 'WEEK1_FAST_PUBLISH_FAILED'), 100),
        processing_lease_expires_at = null, updated_at = now()
    where job_id = p_job_id and authoring_attempt = p_authoring_attempt;
  end if;
  return affected = 1;
end;
$$;

create or replace function public.worker_complete_week1_fast_submission(
  p_job_id uuid,
  p_authoring_attempt integer,
  p_processor_id text,
  p_student_pdf_path text,
  p_parent_answer_pdf_path text,
  p_canonical_source jsonb,
  p_generation_summary jsonb,
  p_prompt_version text,
  p_generator_version text,
  p_model_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_submission private_generation.curriculum_submissions%rowtype;
  v_material_id uuid;
  v_expected_prefix text;
  v_release_at timestamptz;
  v_next_release_at timestamptz;
  v_next_material_week date;
  v_child_tz text;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'generation job not found'; end if;

  if v_job.status = 'completed' and v_job.material_id is not null then
    return v_job.material_id;
  end if;

  select * into v_submission
  from private_generation.curriculum_submissions
  where job_id = p_job_id and authoring_attempt = p_authoring_attempt
  for update;

  if v_submission.job_id is null
     or v_submission.generation_worker_id <> 'chatgpt-week1-fast'
     or v_submission.status <> 'processing'
     or v_submission.processor_id <> p_processor_id
     or v_submission.processor_lease_expires_at <= now() then
    raise exception 'active Week 1 fast publisher lease is missing';
  end if;

  if v_job.source_material_id is not null
     or v_job.material_id is not null
     or v_job.status <> 'claimed'
     or v_job.claimed_by <> 'chatgpt-week1-fast'
     or v_job.attempt_count <> p_authoring_attempt then
    raise exception 'job is not an actively claimed Week 1 fast-lane job';
  end if;

  if p_canonical_source #>> '{metadata,jobId}' <> v_job.id::text
     or p_canonical_source #>> '{metadata,childId}' <> v_job.child_id::text then
    raise exception 'curriculum package metadata does not match the Week 1 job';
  end if;

  v_expected_prefix := v_job.child_id::text || '/' || v_job.id::text || '/';
  if p_student_pdf_path <> v_expected_prefix || 'student.pdf'
     or p_parent_answer_pdf_path <> v_expected_prefix || 'parent-answer.pdf' then
    raise exception 'artifact paths do not match the Week 1 job';
  end if;

  select coalesce(timezone, 'Asia/Taipei') into v_child_tz
  from public.children where id = v_job.child_id and is_active;

  v_release_at := least(coalesce(v_job.release_at, now()), now());

  insert into public.materials (
    child_id, material_week, revision, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path, generation_summary,
    canonical_source, prompt_version, generator_version, model_name
  ) values (
    v_job.child_id, v_job.material_week, 1, v_job.rule_version,
    jsonb_build_object(
      'sourceMaterialId', null,
      'feedbackCutoffAt', v_job.feedback_cutoff_at,
      'feedbackMissing', false,
      'publicationPath', 'week1_fast'
    ),
    p_student_pdf_path, p_parent_answer_pdf_path, p_generation_summary,
    p_canonical_source, p_prompt_version, p_generator_version, p_model_name
  ) returning id into v_material_id;

  update public.generation_jobs
  set status = 'completed', material_id = v_material_id,
      release_at = v_release_at,
      feedback_cutoff_at = v_release_at - interval '48 hours',
      generation_due_at = v_release_at - interval '24 hours',
      completed_at = now(), claimed_by = null, lease_expires_at = null,
      error_code = null, error_message = null
  where id = v_job.id;

  update private_generation.curriculum_submissions
  set status = 'completed', publication_path = 'week1_fast',
      processed_at = now(), processor_lease_expires_at = null,
      error_code = null, error_message = null, failure_evidence = null,
      updated_at = now()
  where job_id = p_job_id and authoring_attempt = p_authoring_attempt;

  update private_generation.week1_publish_outbox
  set status = 'sent', sent_at = coalesce(sent_at, now()), processing_lease_expires_at = null,
      last_error_code = null, updated_at = now()
  where job_id = p_job_id and authoring_attempt = p_authoring_attempt;

  v_next_release_at := greatest(
    v_release_at + interval '7 days',
    ((now() at time zone coalesce(v_child_tz, 'Asia/Taipei'))::date + 1)::timestamp
      at time zone coalesce(v_child_tz, 'Asia/Taipei')
  );
  v_next_material_week := (v_next_release_at at time zone coalesce(v_child_tz, 'Asia/Taipei'))::date;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    v_job.child_id,
    v_next_material_week,
    v_job.rule_version,
    v_job.child_id::text || ':' || v_next_material_week::text || ':r1',
    'pending', now(), v_material_id, v_next_release_at,
    v_next_release_at - interval '48 hours',
    v_next_release_at - interval '24 hours'
  ) on conflict (idempotency_key) do nothing;

  update public.children
  set next_generation_at = v_next_release_at - interval '24 hours'
  where id = v_job.child_id;

  return v_material_id;
end;
$$;

revoke all on function public.worker_claim_week1_fast_submissions(text, integer) from public, anon, authenticated;
revoke all on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.worker_claim_week1_fast_submissions(text, integer) to service_role;
grant execute on function public.worker_fail_week1_fast_submission(uuid, integer, text, text, text) to service_role;
grant execute on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text) to service_role;

comment on function public.worker_start_week1_fast_batch(text)
is 'Serialized Week 1-only authoring start for chatgpt-week1-fast. Never claims Week 2+.';
comment on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text)
is 'Atomic Week 1 fast publication completion. Skips the normal independent Finisher semantic gate but preserves publication integrity.';
