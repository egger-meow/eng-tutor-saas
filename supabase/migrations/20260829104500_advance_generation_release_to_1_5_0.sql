-- Migration: Advance generation release to rel_1.5.0 and establish formal RELEASE_MISMATCH recovery path

-- 1. Update chatgpt_claim_generation_batch to emit targetReleaseId rel_1.5.0
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

    generation_context := public.worker_generation_context(claimed_job.id, worker_id)
      || jsonb_build_object(
        'qualityTrends', public.worker_quality_trends(claimed_job.child_id),
        'targetReleaseId', 'rel_1.5.0'
      );

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
  where job.status in ('pending', 'claimed', 'failed')
    and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.3.0',
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

-- 2. Update chatgpt_submit_curriculum_package default target_rel_id to rel_1.5.0
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
  target_rel_id text;
  stamped_source jsonb;
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

  -- Deterministically stamp canonical_source.metadata.releaseId from claim snapshot
  target_rel_id := coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.5.0');
  stamped_source := jsonb_set(
    canonical_source,
    '{metadata,releaseId}',
    to_jsonb(target_rel_id),
    true
  );

  select * into existing_submission
  from private_generation.curriculum_submissions as submission
  where submission.job_id = $1 and submission.authoring_attempt = claimed_job.attempt_count;

  if existing_submission.job_id is not null then
    if existing_submission.generation_worker_id <> $2
       or existing_submission.canonical_source <> stamped_source then
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
    job_id, authoring_attempt, generation_worker_id, canonical_source, status, submitted_at, updated_at
  ) values (
    $1, claimed_job.attempt_count, $2, stamped_source, 'pending', now(), now()
  );

  return jsonb_build_object(
    'jobId', $1,
    'status', 'pending',
    'authoringAttempt', claimed_job.attempt_count,
    'schemaVersion', schema_ver,
    'deduplicated', false
  );
end;
$$;

revoke all on function private_generation.chatgpt_submit_curriculum_package(uuid, text, jsonb)
from public, anon, authenticated, service_role;

-- 3. Update worker_finish_curriculum_submission to formally handle RELEASE_MISMATCH recovery
create or replace function public.worker_finish_curriculum_submission(
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
  elsif outcome = 'technical_failed' and $5 = 'RELEASE_MISMATCH' then
    -- Release mismatch recovery: unlock generation job back to pending with cleared lease so next authoring attempt can claim under newest target release
    update public.generation_jobs as job
    set status = case when job.attempt_count < job.max_attempts then 'pending'::public.generation_job_status else 'failed'::public.generation_job_status end,
        claimed_by = null, lease_expires_at = null, scheduled_for = least(job.scheduled_for, now()),
        error_code = 'RELEASE_MISMATCH',
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

-- 4. Update claim_due_generation_jobs to allow re-claiming after a RELEASE_MISMATCH technical_failed submission
create or replace function private_generation.claim_due_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
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
    left join public.subscriptions as subscription on subscription.child_id = child.id
    left join public.generation_test_mode_sessions as test_session on test_session.child_id = child.id and test_session.is_enabled
    where (
      child.is_internal_test
      or test_session.child_id is not null
      or (
        subscription.provider = 'paddle'
        and subscription.status in ('trialing', 'active')
      )
      or (
        subscription.provider = 'beta'
        and subscription.status in ('trialing', 'active')
        and coalesce(subscription.current_period_end, subscription.created_at + interval '14 days') > now()
        and job.source_material_id is null
        and not exists (select 1 from public.materials where child_id = job.child_id)
      )
    )
      and (
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at <= now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and (
            active_submission.status in ('pending', 'processing')
            or (active_submission.status = 'technical_failed' and coalesce(active_submission.error_code, '') <> 'RELEASE_MISMATCH')
          )
      )
      and (
        case
          when (child.is_internal_test or test_session.child_id is not null) then
            (job.source_material_id is null or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
            ))
          else
            (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
                and source_feedback.created_at <= job.feedback_cutoff_at
            ))
        end
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
  ), normal as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    left join public.subscriptions as subscription on subscription.child_id = child.id
    left join public.generation_test_mode_sessions as test_session on test_session.child_id = child.id and test_session.is_enabled
    where (
      child.is_internal_test
      or test_session.child_id is not null
      or (
        subscription.provider = 'paddle'
        and subscription.status in ('trialing', 'active')
      )
      or (
        subscription.provider = 'beta'
        and subscription.status in ('trialing', 'active')
        and coalesce(subscription.current_period_end, subscription.created_at + interval '14 days') > now()
        and job.source_material_id is null
        and not exists (select 1 from public.materials where child_id = job.child_id)
      )
    )
      and (
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at > now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and (
            active_submission.status in ('pending', 'processing')
            or (active_submission.status = 'technical_failed' and coalesce(active_submission.error_code, '') <> 'RELEASE_MISMATCH')
          )
      )
      and (
        case
          when (child.is_internal_test or test_session.child_id is not null) then
            (job.source_material_id is null or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
            ))
          else
            (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
                and source_feedback.created_at <= job.feedback_cutoff_at
            ))
        end
      )
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
      feedback_missing = case
        when exists (select 1 from public.generation_test_mode_sessions s where s.child_id = job.child_id and s.is_enabled)
          or exists (select 1 from public.children c where c.id = job.child_id and c.is_internal_test) then
          (job.source_material_id is not null and not exists (
            select 1 from public.feedback as source_feedback
            where source_feedback.child_id = job.child_id
              and source_feedback.material_id = job.source_material_id
          ))
        else
          not exists (
            select 1 from public.feedback as source_feedback
            where source_feedback.child_id = job.child_id
              and source_feedback.material_id = job.source_material_id
              and source_feedback.created_at <= job.feedback_cutoff_at
          )
      end,
      error_code = null, error_message = null
  from selected
  where job.id = selected.id
  returning job.*;
end;
$$;

revoke all on function private_generation.claim_due_generation_jobs(text) from public, anon, authenticated;
grant execute on function private_generation.claim_due_generation_jobs(text) to service_role;

-- 5. Update worker_claim_curriculum_submissions to skip technical_failed submissions with RELEASE_MISMATCH
create or replace function public.worker_claim_curriculum_submissions(processor_id text, claim_limit integer default 5)
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
    where (
      submission.status = 'pending'
      or (submission.status = 'technical_failed' and coalesce(submission.error_code, '') <> 'RELEASE_MISMATCH')
      or (submission.status = 'processing' and submission.processor_lease_expires_at < now())
    )
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

-- 6. Reset any currently stuck jobs due to release mismatch to pending with cleared lease
update public.generation_jobs as job
set status = 'pending',
    claimed_by = null,
    lease_expires_at = null,
    scheduled_for = least(job.scheduled_for, now()),
    error_code = 'RELEASE_MISMATCH'
where job.status in ('claimed', 'failed')
  and exists (
    select 1 from private_generation.curriculum_submissions as sub
    where sub.job_id = job.id
      and (sub.error_code = 'RELEASE_MISMATCH' or sub.error_message like '%Release mismatch%')
  );

update private_generation.curriculum_submissions
set error_code = 'RELEASE_MISMATCH'
where status = 'technical_failed'
  and (error_code is null or error_code = 'CURRICULUM_PIPELINE_FAILED')
  and error_message like '%Release mismatch%';
