alter table private_generation.curriculum_submissions
  drop constraint curriculum_submissions_pkey;

alter table private_generation.curriculum_submissions
  add column authoring_attempt integer,
  add column input_fingerprint text,
  add column failure_evidence jsonb;

update private_generation.curriculum_submissions as submission
set authoring_attempt = greatest(job.attempt_count, 1),
    input_fingerprint = snapshot.input_fingerprint
from public.generation_jobs as job
left join private_generation.generation_claim_snapshots as snapshot
  on snapshot.job_id = job.id
where submission.job_id = job.id;

alter table private_generation.curriculum_submissions
  alter column authoring_attempt set not null,
  add constraint curriculum_submissions_pkey primary key (job_id, authoring_attempt),
  add constraint curriculum_submissions_authoring_attempt_positive check (authoring_attempt > 0),
  add constraint curriculum_submissions_failure_evidence_object
    check (failure_evidence is null or jsonb_typeof(failure_evidence) = 'object');

drop index private_generation.curriculum_submissions_pending_idx;
create index curriculum_submissions_finisher_queue_idx
  on private_generation.curriculum_submissions (submitted_at, job_id, authoring_attempt)
  where status in ('pending', 'processing', 'technical_failed');

comment on column private_generation.curriculum_submissions.authoring_attempt is
  'Immutable ChatGPT authoring attempt number copied from generation_jobs.attempt_count.';
comment on column private_generation.curriculum_submissions.failure_evidence is
  'Privacy-safe structured deterministic validation/audit evidence for targeted repair.';

create or replace function private_generation.claim_due_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql security definer set search_path = ''
as $$
declare claim_limit integer;
begin
  if worker_id is null or char_length(worker_id) < 3 then raise exception 'worker_id is required'; end if;
  select least(integer_value, 100) into claim_limit
  from public.operational_settings where key = 'daily_generation_limit';
  if claim_limit is null then raise exception 'daily_generation_limit is not configured'; end if;

  return query
  with mandatory as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.subscriptions as subscription on subscription.child_id = child.id
      and subscription.status in ('trialing', 'active')
    where job.scheduled_for <= now() and job.generation_due_at <= now()
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and active_submission.status in ('pending', 'processing', 'technical_failed')
      )
      and (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
        select 1 from public.feedback as source_feedback
        where source_feedback.child_id = job.child_id
          and source_feedback.material_id = job.source_material_id
          and source_feedback.created_at <= job.feedback_cutoff_at
      ))
    order by job.generation_due_at, job.created_at
    for update of job skip locked
  ), normal as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.subscriptions as subscription on subscription.child_id = child.id
      and subscription.status in ('trialing', 'active')
    where job.scheduled_for <= now() and job.generation_due_at > now()
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and active_submission.status in ('pending', 'processing', 'technical_failed')
      )
      and (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
        select 1 from public.feedback as source_feedback
        where source_feedback.child_id = job.child_id
          and source_feedback.material_id = job.source_material_id
          and source_feedback.created_at <= job.feedback_cutoff_at
      ))
    order by job.generation_due_at, job.created_at
    for update of job skip locked
    limit greatest(claim_limit - (select count(*)::integer from mandatory), 0)
  ), selected as (
    select id from mandatory union all select id from normal
  )
  update public.generation_jobs as job
  set status = 'claimed', claimed_by = worker_id,
      lease_expires_at = now() + interval '45 minutes',
      attempt_count = job.attempt_count + 1,
      feedback_missing = not exists (
        select 1 from public.feedback as source_feedback
        where source_feedback.child_id = job.child_id
          and source_feedback.material_id = job.source_material_id
          and source_feedback.created_at <= job.feedback_cutoff_at
      ), error_code = null, error_message = null
  from selected where job.id = selected.id returning job.*;
end;
$$;

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
  from public.operational_settings where key = 'daily_generation_limit';

  for claimed_job in select * from private_generation.claim_due_generation_jobs(worker_id)
  loop
    update public.generation_jobs
    set lease_expires_at = now() + interval '6 hours'
    where id = claimed_job.id and status = 'claimed' and claimed_by = worker_id;

    generation_context := public.worker_generation_context(claimed_job.id, worker_id)
      || jsonb_build_object('qualityTrends', public.worker_quality_trends(claimed_job.child_id));

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
      extensions.digest(convert_to(generation_context::text, 'UTF8'), 'sha256'), 'hex'
    );

    insert into private_generation.generation_claim_snapshots (
      job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
    ) values (claimed_job.id, worker_id, generation_context, fingerprint, now())
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
  where job.status in ('pending', 'claimed', 'failed') and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.2.0', 'claimed', claimed_contexts,
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
begin
  if jsonb_typeof(canonical_source) <> 'object'
    or canonical_source #>> '{metadata,schemaVersion}' <> '2.0.0' then
    raise exception 'canonical_source must be a Curriculum Package 2.0.0 object';
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
    if existing_submission.generation_worker_id <> $2 or existing_submission.canonical_source <> $3 then
      raise exception 'a different immutable curriculum submission already exists for this authoring attempt';
    end if;
    return jsonb_build_object('jobId', $1, 'authoringAttempt', claimed_job.attempt_count,
      'status', existing_submission.status, 'idempotent', true);
  end if;

  insert into private_generation.curriculum_submissions (
    job_id, authoring_attempt, generation_worker_id, canonical_source, input_fingerprint
  ) values ($1, claimed_job.attempt_count, $2, $3, claim_snapshot.input_fingerprint);

  return jsonb_build_object('jobId', $1, 'authoringAttempt', claimed_job.attempt_count,
    'status', 'pending', 'idempotent', false);
end;
$$;

create or replace function private_generation.chatgpt_curriculum_submission_status(job_id uuid, worker_id text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'jobId', submission.job_id, 'authoringAttempt', submission.authoring_attempt,
    'status', submission.status, 'finisherAttemptCount', submission.attempt_count,
    'processedAt', submission.processed_at, 'materialId', job.material_id,
    'errorCode', submission.error_code
  )
  from private_generation.curriculum_submissions as submission
  join public.generation_jobs as job on job.id = submission.job_id
  where submission.job_id = $1 and submission.generation_worker_id = $2
  order by submission.authoring_attempt desc limit 1;
$$;

drop function public.worker_claim_curriculum_submissions(text, integer);
create function public.worker_claim_curriculum_submissions(processor_id text, claim_limit integer default 5)
returns table (job_id uuid, authoring_attempt integer, generation_worker_id text, canonical_source jsonb)
language plpgsql security definer set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then raise exception 'processor_id is required'; end if;
  if claim_limit < 1 or claim_limit > 25 then raise exception 'claim_limit must be between 1 and 25'; end if;
  return query
  with selected as (
    select submission.job_id, submission.authoring_attempt
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where (submission.status in ('pending', 'technical_failed')
      or (submission.status = 'processing' and submission.processor_lease_expires_at < now()))
      and job.status in ('claimed', 'completed')
    order by submission.submitted_at, submission.job_id, submission.authoring_attempt
    for update of submission skip locked limit claim_limit
  ), renewed_jobs as (
    update public.generation_jobs as job
    set lease_expires_at = case when job.status = 'claimed' then now() + interval '45 minutes' else job.lease_expires_at end
    from selected where job.id = selected.job_id returning job.id
  )
  update private_generation.curriculum_submissions as submission
  set status = 'processing', processor_id = $1,
      processor_lease_expires_at = now() + interval '30 minutes',
      attempt_count = submission.attempt_count + 1, updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;
revoke all on function public.worker_claim_curriculum_submissions(text, integer) from public, anon, authenticated;
grant execute on function public.worker_claim_curriculum_submissions(text, integer) to service_role;

drop function public.worker_finish_curriculum_submission(uuid, text, text, text, text);
create function public.worker_finish_curriculum_submission(
  job_id uuid, authoring_attempt integer, processor_id text, outcome text,
  error_code text default null, error_message text default null, failure_evidence jsonb default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  affected integer;
begin
  if outcome not in ('completed', 'quality_rejected', 'technical_failed') then
    raise exception 'invalid curriculum submission outcome';
  end if;
  if failure_evidence is not null and jsonb_typeof(failure_evidence) <> 'object' then
    raise exception 'failure_evidence must be an object';
  end if;

  update private_generation.curriculum_submissions as submission
  set status = outcome, processed_at = now(), processor_lease_expires_at = null,
      error_code = left($5, 100), error_message = left($6, 2000),
      failure_evidence = $7, updated_at = now()
  where submission.job_id = $1 and submission.authoring_attempt = $2
    and submission.status = 'processing' and submission.processor_id = $3;
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;

  if outcome = 'quality_rejected' then
    update public.generation_jobs as job
    set status = case when job.attempt_count < job.max_attempts then 'pending'::public.generation_job_status else 'failed'::public.generation_job_status end,
        claimed_by = null, lease_expires_at = null, scheduled_for = least(job.scheduled_for, now()),
        error_code = case when job.attempt_count < job.max_attempts then left($5, 100) else 'HUMAN_REVIEW_REQUIRED' end,
        error_message = left($6, 2000)
    where job.id = $1 and job.status = 'claimed' and job.attempt_count = $2;
  end if;
  return true;
end;
$$;
revoke all on function public.worker_finish_curriculum_submission(uuid, integer, text, text, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.worker_finish_curriculum_submission(uuid, integer, text, text, text, text, jsonb)
to service_role;
