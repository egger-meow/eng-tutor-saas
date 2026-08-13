create table private_generation.curriculum_submissions (
  job_id uuid primary key references public.generation_jobs(id) on delete cascade,
  generation_worker_id text not null,
  canonical_source jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'quality_rejected', 'technical_failed')),
  processor_id text,
  processor_lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text,
  error_message text,
  updated_at timestamptz not null default now(),
  constraint curriculum_submissions_source_object check (jsonb_typeof(canonical_source) = 'object')
);

alter table private_generation.curriculum_submissions enable row level security;

create index curriculum_submissions_pending_idx
  on private_generation.curriculum_submissions (submitted_at, job_id)
  where status in ('pending', 'processing');

comment on table private_generation.curriculum_submissions is
  'Private handoff from ChatGPT Scheduled Work to the deterministic GitHub Actions finisher.';

revoke all on table private_generation.curriculum_submissions from public, anon, authenticated, service_role;

create function private_generation.chatgpt_claim_generation_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  context jsonb;
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

    context := public.worker_generation_context(claimed_job.id, worker_id);
    context := context || jsonb_build_object(
      'qualityTrends', public.worker_quality_trends(claimed_job.child_id)
    );
    claimed_contexts := claimed_contexts || jsonb_build_array(context);
  end loop;

  select min(job.generation_due_at) into oldest_deadline
  from public.generation_jobs as job
  where job.status in ('pending', 'claimed', 'failed')
    and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.0.0',
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

create function private_generation.chatgpt_submit_curriculum_package(
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

create function private_generation.chatgpt_fail_generation_job(
  job_id uuid,
  worker_id text,
  error_code text,
  error_message text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.worker_fail_generation_job($1, $2, left($3, 100), left($4, 2000));
$$;

revoke all on function private_generation.chatgpt_fail_generation_job(uuid, text, text, text)
from public, anon, authenticated, service_role;

create function private_generation.chatgpt_curriculum_submission_status(
  job_id uuid,
  worker_id text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'jobId', submission.job_id,
    'status', submission.status,
    'attemptCount', submission.attempt_count,
    'processedAt', submission.processed_at,
    'materialId', job.material_id,
    'errorCode', submission.error_code
  )
  from private_generation.curriculum_submissions as submission
  join public.generation_jobs as job on job.id = submission.job_id
  where submission.job_id = $1
    and submission.generation_worker_id = $2;
$$;

revoke all on function private_generation.chatgpt_curriculum_submission_status(uuid, text)
from public, anon, authenticated, service_role;

create function public.worker_claim_curriculum_submissions(
  processor_id text,
  claim_limit integer default 5
)
returns table (job_id uuid, generation_worker_id text, canonical_source jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then
    raise exception 'processor_id is required';
  end if;
  if claim_limit < 1 or claim_limit > 25 then
    raise exception 'claim_limit must be between 1 and 25';
  end if;

  return query
  with selected as (
    select submission.job_id
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where (
      submission.status = 'pending'
      or (
        submission.status = 'processing'
        and submission.processor_lease_expires_at < now()
      )
    )
      and job.status in ('claimed', 'completed')
    order by submission.submitted_at, submission.job_id
    for update of submission skip locked
    limit claim_limit
  ), renewed_jobs as (
    update public.generation_jobs as job
    set lease_expires_at = case
      when job.status = 'claimed' then now() + interval '45 minutes'
      else job.lease_expires_at
    end
    from selected
    where job.id = selected.job_id
    returning job.id
  )
  update private_generation.curriculum_submissions as submission
  set status = 'processing',
      processor_id = $1,
      processor_lease_expires_at = now() + interval '30 minutes',
      attempt_count = submission.attempt_count + 1,
      error_code = null,
      error_message = null,
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.generation_worker_id, submission.canonical_source;
end;
$$;

revoke all on function public.worker_claim_curriculum_submissions(text, integer)
from public, anon, authenticated;
grant execute on function public.worker_claim_curriculum_submissions(text, integer)
to service_role;

create function public.worker_finish_curriculum_submission(
  job_id uuid,
  processor_id text,
  outcome text,
  error_code text default null,
  error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if outcome not in ('completed', 'quality_rejected', 'technical_failed') then
    raise exception 'invalid curriculum submission outcome';
  end if;

  update private_generation.curriculum_submissions as submission
  set status = outcome,
      processed_at = now(),
      processor_lease_expires_at = null,
      error_code = left($4, 100),
      error_message = left($5, 2000),
      updated_at = now()
  where submission.job_id = $1
    and submission.status = 'processing'
    and submission.processor_id = $2;
  return found;
end;
$$;

revoke all on function public.worker_finish_curriculum_submission(uuid, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.worker_finish_curriculum_submission(uuid, text, text, text, text)
to service_role;
