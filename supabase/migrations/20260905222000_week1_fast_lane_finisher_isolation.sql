-- Week 1 Fast Lane: make the publication-path split absolute.
-- Every Week 1 submission (source_material_id IS NULL) bypasses the normal Finisher,
-- even when a normal production author becomes the fallback author.

-- 1. Route every newly inserted Week 1 submission to the fast publisher outbox.
create or replace function private_generation.enqueue_week1_publish_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending'
     and exists (
       select 1
       from public.generation_jobs as job
       where job.id = new.job_id
         and job.source_material_id is null
         and job.material_id is null
     ) then
    update private_generation.curriculum_submissions
    set publication_path = 'week1_fast', updated_at = now()
    where job_id = new.job_id
      and authoring_attempt = new.authoring_attempt;

    insert into private_generation.week1_publish_outbox(job_id, authoring_attempt)
    values (new.job_id, new.authoring_attempt)
    on conflict (job_id, authoring_attempt) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private_generation.enqueue_week1_publish_outbox()
from public, anon, authenticated, service_role;

-- Backfill any Week 1 submission created before this routing rule was installed.
update private_generation.curriculum_submissions as submission
set publication_path = 'week1_fast', updated_at = now()
from public.generation_jobs as job
where job.id = submission.job_id
  and job.source_material_id is null
  and job.material_id is null
  and submission.status in ('pending', 'processing', 'technical_failed')
  and submission.publication_path <> 'week1_fast';

insert into private_generation.week1_publish_outbox(job_id, authoring_attempt)
select submission.job_id, submission.authoring_attempt
from private_generation.curriculum_submissions as submission
join public.generation_jobs as job on job.id = submission.job_id
where job.source_material_id is null
  and job.material_id is null
  and submission.status in ('pending', 'processing', 'technical_failed')
on conflict (job_id, authoring_attempt) do nothing;

-- 2. Normal Finisher is Week 2+ only. It cannot claim a Week 1 submission.
create or replace function public.worker_claim_curriculum_submissions(processor_id text, claim_limit integer default 5)
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
    where job.source_material_id is not null
      and (
        submission.status = 'pending'
        or (submission.status = 'technical_failed' and coalesce(submission.error_code, '') <> 'RELEASE_MISMATCH')
        or (submission.status = 'processing' and submission.processor_lease_expires_at < now())
      )
      and job.status in ('claimed', 'completed')
    order by submission.submitted_at, submission.job_id, submission.authoring_attempt
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
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;

revoke all on function public.worker_claim_curriculum_submissions(text, integer)
from public, anon, authenticated;
grant execute on function public.worker_claim_curriculum_submissions(text, integer)
to service_role;

-- 3. Fast Publisher claims every Week 1 submission, independent of which production author wrote it.
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
    where job.source_material_id is null
      and job.material_id is null
      and job.status = 'claimed'
      and job.claimed_by = submission.generation_worker_id
      and submission.publication_path = 'week1_fast'
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
  set status = 'processing',
      processor_id = $1,
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

revoke all on function public.worker_claim_week1_fast_submissions(text, integer)
from public, anon, authenticated;
grant execute on function public.worker_claim_week1_fast_submissions(text, integer)
to service_role;

-- 4. Atomic Week 1 completion trusts the immutable submission's author identity,
-- not a hard-coded author worker. This lets daily/manual authoring be a safe fallback.
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
  select * into v_job
  from public.generation_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then raise exception 'generation job not found'; end if;
  if v_job.status = 'completed' and v_job.material_id is not null then return v_job.material_id; end if;

  select * into v_submission
  from private_generation.curriculum_submissions
  where job_id = p_job_id and authoring_attempt = p_authoring_attempt
  for update;

  if v_submission.job_id is null
     or v_submission.publication_path <> 'week1_fast'
     or v_submission.status <> 'processing'
     or v_submission.processor_id <> p_processor_id
     or v_submission.processor_lease_expires_at <= now() then
    raise exception 'active Week 1 fast publisher lease is missing';
  end if;

  if v_job.source_material_id is not null
     or v_job.material_id is not null
     or v_job.status <> 'claimed'
     or v_job.claimed_by is distinct from v_submission.generation_worker_id
     or v_job.attempt_count <> p_authoring_attempt then
    raise exception 'job is not an actively claimed Week 1 fast-lane job';
  end if;

  if p_canonical_source is distinct from v_submission.canonical_source then
    raise exception 'Week 1 publisher cannot substitute immutable canonical source';
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
  from public.children
  where id = v_job.child_id and is_active;

  if v_child_tz is null then raise exception 'active child not found'; end if;

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
  )
  returning id into v_material_id;

  update public.generation_jobs
  set status = 'completed',
      material_id = v_material_id,
      release_at = v_release_at,
      feedback_cutoff_at = v_release_at - interval '48 hours',
      generation_due_at = v_release_at - interval '24 hours',
      completed_at = now(),
      claimed_by = null,
      lease_expires_at = null,
      error_code = null,
      error_message = null
  where id = v_job.id;

  update private_generation.curriculum_submissions
  set status = 'completed',
      publication_path = 'week1_fast',
      processed_at = now(),
      processor_lease_expires_at = null,
      error_code = null,
      error_message = null,
      failure_evidence = null,
      updated_at = now()
  where job_id = p_job_id and authoring_attempt = p_authoring_attempt;

  update private_generation.week1_publish_outbox
  set status = 'sent',
      sent_at = coalesce(sent_at, now()),
      processing_lease_expires_at = null,
      last_error_code = null,
      updated_at = now()
  where job_id = p_job_id and authoring_attempt = p_authoring_attempt;

  v_next_release_at := greatest(
    v_release_at + interval '7 days',
    ((now() at time zone v_child_tz)::date + 1)::timestamp at time zone v_child_tz
  );
  v_next_material_week := (v_next_release_at at time zone v_child_tz)::date;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    v_job.child_id,
    v_next_material_week,
    v_job.rule_version,
    v_job.child_id::text || ':' || v_next_material_week::text || ':r1',
    'pending',
    now(),
    v_material_id,
    v_next_release_at,
    v_next_release_at - interval '48 hours',
    v_next_release_at - interval '24 hours'
  )
  on conflict (idempotency_key) do nothing;

  update public.children
  set next_generation_at = v_next_release_at - interval '24 hours'
  where id = v_job.child_id;

  return v_material_id;
end;
$$;

revoke all on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text)
from public, anon, authenticated;
grant execute on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text)
to service_role;

-- 5. Week 1 authoring gets its own start serialization lock. A normal authoring batch already
-- in flight must not delay a newly arrived Week 1 job. Row leases remain authoritative.
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
  from public.generation_jobs
  where status = 'claimed'
    and claimed_by = worker_id
    and lease_expires_at > now();

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

comment on function public.worker_claim_curriculum_submissions(text, integer)
is 'Normal deterministic Finisher claim. Week 1 is explicitly excluded and uses Week 1 Fast Publisher; this function is Week 2+ only.';
comment on function public.worker_claim_week1_fast_submissions(text, integer)
is 'Claims immutable Week 1 submissions for Fast Publisher regardless of which approved production author created them.';
