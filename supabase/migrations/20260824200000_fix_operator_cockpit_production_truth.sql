drop function if exists public.worker_record_quality_override(uuid, integer, uuid, text, text, jsonb, text);

create function public.worker_complete_generation_job_with_quality_override(
  job_id uuid,
  worker_id text,
  student_pdf_path text,
  parent_answer_pdf_path text,
  canonical_source jsonb,
  generation_summary jsonb,
  prompt_version text,
  generator_version text,
  model_name text,
  authoring_attempt integer,
  processor_id text,
  override_reason text,
  rejection_evidence jsonb,
  rejection_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_material_id uuid;
  affected integer;
begin
  if authoring_attempt <> 5 then
    raise exception 'quality override requires attempt 5';
  end if;
  if nullif(trim(override_reason), '') is null then
    raise exception 'override reason is required';
  end if;
  if rejection_evidence is null
    or jsonb_typeof(rejection_evidence) <> 'object'
    or jsonb_typeof(rejection_evidence->'findings') <> 'array'
    or jsonb_array_length(rejection_evidence->'findings') = 0 then
    raise exception 'rejection evidence must contain findings';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(rejection_evidence->'findings') as finding
    where finding->>'source' is distinct from 'audit'
      or finding->>'dimension' is null
      or finding->>'dimension' not in ('cognitive-load', 'lexical-unit-mix', 'evidence-plan')
  ) then
    raise exception 'quality override evidence contains a non-bypassable finding';
  end if;

  perform 1
  from private_generation.curriculum_submissions as submission
  where submission.job_id = $1
    and submission.authoring_attempt = $10
    and submission.status = 'processing'
    and submission.processor_id = $11
  for update;
  if not found then
    raise exception 'active Finisher submission lease is missing';
  end if;

  completed_material_id := public.worker_complete_generation_job(
    $1, $2, $3, $4, $5, $6, $7, $8, $9
  );

  update private_generation.curriculum_submissions as submission
  set status = 'quality_rejected',
      processed_at = now(),
      processor_lease_expires_at = null,
      error_code = 'QUALITY_REJECTED',
      error_message = left($14, 2000),
      failure_evidence = $13,
      updated_at = now()
  where submission.job_id = $1
    and submission.authoring_attempt = $10
    and submission.status = 'processing'
    and submission.processor_id = $11;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'immutable rejection could not be committed';
  end if;

  insert into public.material_quality_overrides (
    job_id, authoring_attempt, material_id, processor_id, override_reason, rejection_evidence
  ) values ($1, $10, completed_material_id, $11, $12, $13);

  return completed_material_id;
end;
$$;

revoke all on function public.worker_complete_generation_job_with_quality_override(
  uuid, text, text, text, jsonb, jsonb, text, text, text, integer, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.worker_complete_generation_job_with_quality_override(
  uuid, text, text, text, jsonb, jsonb, text, text, text, integer, text, text, jsonb, text
) to service_role;

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
      and subscription.status in ('trialing', 'active')
    where (child.is_internal_test or subscription.child_id is not null)
      and job.scheduled_for <= now() and job.generation_due_at <= now()
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
    left join public.subscriptions as subscription on subscription.child_id = child.id
      and subscription.status in ('trialing', 'active')
    where (child.is_internal_test or subscription.child_id is not null)
      and job.scheduled_for <= now() and job.generation_due_at > now()
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

create or replace function public.admin_set_internal_test_entitlement(p_child_id uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.children set is_internal_test = p_enabled where id = p_child_id;
  if not found then raise exception 'child not found'; end if;

  if p_enabled then
    insert into public.subscriptions(child_id, provider, status, founding_status)
    select p_child_id, 'internal_test', 'trialing', 'none'
    where not exists (select 1 from public.subscriptions where child_id = p_child_id);
  else
    delete from public.subscriptions
    where child_id = p_child_id and provider = 'internal_test';
  end if;
  return true;
end;
$$;

revoke all on function public.admin_set_internal_test_entitlement(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_internal_test_entitlement(uuid, boolean) to service_role;

drop function if exists public.get_enrollment_state();
create function public.get_enrollment_state()
returns table (
  status text,
  capacity integer,
  active_count integer,
  remaining integer,
  founding_limit integer,
  founding_count integer,
  waiting_count integer,
  released_count integer,
  total_demand integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with released_state as (
    select count(*)::integer as released_cnt
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where entry.status = 'released' and not child.is_internal_test
  ), waiting_state as (
    select count(*)::integer as waiting_cnt
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where entry.status = 'waiting' and not child.is_internal_test
  ), service_state as (
    select
      count(child.id)::integer as active_cnt,
      count(child.id) filter (where subscription.founding_status in ('eligible', 'redeemed'))::integer as founding_cnt
    from public.subscriptions as subscription
    join public.children as child on child.id = subscription.child_id
    where subscription.status in ('trialing', 'active', 'past_due')
      and child.is_active
      and not child.is_internal_test
  )
  select
    settings.status,
    settings.capacity,
    service.active_cnt,
    greatest(settings.capacity - service.active_cnt - released.released_cnt, 0),
    settings.founding_limit,
    service.founding_cnt,
    waiting.waiting_cnt,
    released.released_cnt,
    service.active_cnt + waiting.waiting_cnt + released.released_cnt
  from public.enrollment_settings as settings
  cross join service_state as service
  cross join waiting_state as waiting
  cross join released_state as released
  where settings.key = 'default';
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;
