-- Week 1 Fast Lane publication hardening.
-- 1) Every Week 1 publish outbox row is dispatchable regardless of which approved author wrote it.
-- 2) Fast completion preserves the immutable submission source and releases at actual completion time.

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
      on submission.job_id = outbox.job_id
     and submission.authoring_attempt = outbox.authoring_attempt
    join public.generation_jobs as job
      on job.id = submission.job_id
    where (
        outbox.status in ('pending', 'failed')
        or (outbox.status = 'processing' and outbox.processing_lease_expires_at < now())
      )
      and submission.publication_path = 'week1_fast'
      and submission.status in ('pending', 'technical_failed', 'processing')
      and job.source_material_id is null
      and job.material_id is null
      and job.status = 'claimed'
      and job.claimed_by = submission.generation_worker_id
    order by outbox.created_at
    for update of outbox skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  )
  update private_generation.week1_publish_outbox as outbox
  set status = 'processing',
      attempt_count = outbox.attempt_count + 1,
      processing_lease_expires_at = now() + interval '2 minutes',
      updated_at = now()
  from selected
  where outbox.id = selected.id
  returning outbox.id;
end;
$$;

revoke all on function public.worker_claim_week1_publish_outbox(integer)
from public, anon, authenticated;
grant execute on function public.worker_claim_week1_publish_outbox(integer)
to service_role;

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

  if v_job.id is null then
    raise exception 'generation job not found';
  end if;

  if v_job.status = 'completed' and v_job.material_id is not null then
    return v_job.material_id;
  end if;

  select * into v_submission
  from private_generation.curriculum_submissions
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt
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

  if p_prompt_version is distinct from (p_canonical_source #>> '{metadata,promptVersion}')
     or p_generator_version is distinct from (p_canonical_source #>> '{metadata,curriculumVersion}')
     or p_model_name is distinct from (p_canonical_source #>> '{metadata,model}') then
    raise exception 'Week 1 publication metadata does not match immutable canonical source';
  end if;

  v_expected_prefix := v_job.child_id::text || '/' || v_job.id::text || '/';
  if p_student_pdf_path <> v_expected_prefix || 'student.pdf'
     or p_parent_answer_pdf_path <> v_expected_prefix || 'parent-answer.pdf' then
    raise exception 'artifact paths do not match the Week 1 job';
  end if;

  select coalesce(timezone, 'Asia/Taipei')
  into v_child_tz
  from public.children
  where id = v_job.child_id
    and is_active;

  if v_child_tz is null then
    raise exception 'active child not found';
  end if;

  -- Week 1 is released at the actual successful publication instant. Never retain an old
  -- next-day placeholder or another stale scheduling anchor as the real parent-visible release.
  v_release_at := now();

  insert into public.materials (
    child_id,
    material_week,
    revision,
    rule_version,
    input_snapshot,
    student_pdf_path,
    parent_answer_pdf_path,
    generation_summary,
    canonical_source,
    prompt_version,
    generator_version,
    model_name
  ) values (
    v_job.child_id,
    v_job.material_week,
    1,
    v_job.rule_version,
    jsonb_build_object(
      'sourceMaterialId', null,
      'feedbackCutoffAt', v_job.feedback_cutoff_at,
      'feedbackMissing', false,
      'publicationPath', 'week1_fast'
    ),
    p_student_pdf_path,
    p_parent_answer_pdf_path,
    p_generation_summary,
    p_canonical_source,
    p_prompt_version,
    p_generator_version,
    p_model_name
  )
  returning id into v_material_id;

  update public.generation_jobs
  set status = 'completed',
      material_id = v_material_id,
      release_at = v_release_at,
      feedback_cutoff_at = v_release_at - interval '48 hours',
      generation_due_at = v_release_at - interval '24 hours',
      completed_at = v_release_at,
      claimed_by = null,
      lease_expires_at = null,
      error_code = null,
      error_message = null
  where id = v_job.id;

  update private_generation.curriculum_submissions
  set status = 'completed',
      publication_path = 'week1_fast',
      processed_at = v_release_at,
      processor_lease_expires_at = null,
      error_code = null,
      error_message = null,
      failure_evidence = null,
      updated_at = v_release_at
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt;

  update private_generation.week1_publish_outbox
  set status = 'sent',
      sent_at = coalesce(sent_at, v_release_at),
      processing_lease_expires_at = null,
      last_error_code = null,
      updated_at = v_release_at
  where job_id = p_job_id
    and authoring_attempt = p_authoring_attempt;

  v_next_release_at := v_release_at + interval '7 days';
  v_next_material_week := (v_next_release_at at time zone v_child_tz)::date;

  insert into public.generation_jobs (
    child_id,
    material_week,
    rule_version,
    idempotency_key,
    status,
    scheduled_for,
    source_material_id,
    release_at,
    feedback_cutoff_at,
    generation_due_at
  ) values (
    v_job.child_id,
    v_next_material_week,
    v_job.rule_version,
    v_job.child_id::text || ':' || v_next_material_week::text || ':r1',
    'pending',
    v_release_at,
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

comment on function public.worker_claim_week1_publish_outbox(integer)
is 'Claims dispatchable Week 1 publication doorbells for every approved author identity; no dedicated-author filter.';
comment on function public.worker_complete_week1_fast_submission(uuid, integer, text, text, text, jsonb, jsonb, text, text, text)
is 'Completes an immutable Week 1 submission at the actual publication instant and anchors Week 2 exactly seven days later.';
