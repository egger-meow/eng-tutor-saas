-- Ensure feedback-requested follow-up jobs can never exclude the feedback that created them.
-- Legacy cadence jobs keep their historical 48h/24h offsets. Request-driven jobs use an
-- immediate feedback snapshot/due time and a +24h parent-visible release target.

alter table public.generation_jobs
drop constraint generation_jobs_schedule_order_check;

do $migration$
declare
  definition text;
  patched text;
begin
  definition := pg_get_functiondef(
    'public.submit_feedback_and_request_next_material(uuid,uuid,smallint,integer,text,text,text,text)'::regprocedure
  );

  patched := replace(
    definition,
    '''pending'', now(), p_material_id, now() + interval ''24 hours'', now() - interval ''24 hours'', now()',
    '''pending'', now(), p_material_id, now() + interval ''24 hours'', now(), now()'
  );

  if patched = definition then
    raise exception 'submit_feedback_and_request_next_material definition drifted';
  end if;

  execute patched;
end
$migration$;

create or replace function private_generation.require_feedback_request_for_followup_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_feedback_created_at timestamptz;
begin
  if new.source_material_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.material_generation_requests request
    where request.child_id = new.child_id
      and request.source_material_id = new.source_material_id
  ) then
    select feedback.created_at
    into source_feedback_created_at
    from public.feedback as feedback
    where feedback.child_id = new.child_id
      and feedback.material_id = new.source_material_id;

    if source_feedback_created_at is null then
      raise exception 'FEEDBACK_REQUEST_SOURCE_FEEDBACK_MISSING';
    end if;

    if new.feedback_cutoff_at is null
       or source_feedback_created_at > new.feedback_cutoff_at then
      raise exception 'FEEDBACK_REQUEST_SOURCE_FEEDBACK_EXCLUDED';
    end if;

    return new;
  end if;

  if exists (
    select 1
    from public.children child
    where child.id = new.child_id
      and child.is_internal_test
  ) or exists (
    select 1
    from public.generation_test_mode_sessions session
    where session.child_id = new.child_id
      and session.is_enabled
  ) then
    return new;
  end if;

  -- Completion and billing code use the legacy child:date:r1 key. Suppress
  -- only that automatic cadence insert so audited manual recovery remains possible.
  if new.idempotency_key ~ '^[0-9a-f-]+:[0-9]{4}-[0-9]{2}-[0-9]{2}:r1$' then
    return null;
  end if;

  return new;
end
$$;

-- Repair any request-driven job created while the bad -24h cutoff was live.
-- Do not mutate materialized jobs or jobs with immutable submission history.
update public.generation_jobs as job
set feedback_cutoff_at = feedback.created_at,
    feedback_missing = false,
    updated_at = now()
from public.material_generation_requests as request
join public.feedback as feedback
  on feedback.child_id = request.child_id
 and feedback.material_id = request.source_material_id
where request.generation_job_id = job.id
  and request.child_id = job.child_id
  and request.source_material_id = job.source_material_id
  and job.material_id is null
  and job.feedback_cutoff_at < feedback.created_at
  and not exists (
    select 1
    from private_generation.curriculum_submissions as submission
    where submission.job_id = job.id
  );

alter table public.generation_jobs
add constraint generation_jobs_schedule_order_check
check (
  (
    idempotency_key like '%:feedback-next'
    and feedback_cutoff_at = generation_due_at
    and release_at = generation_due_at + interval '24 hours'
  )
  or
  (
    idempotency_key not like '%:feedback-next'
    and feedback_cutoff_at = release_at - interval '48 hours'
    and generation_due_at = release_at - interval '24 hours'
  )
);

do $verify$
begin
  if exists (
    select 1
    from public.material_generation_requests as request
    join public.generation_jobs as job
      on job.id = request.generation_job_id
    join public.feedback as feedback
      on feedback.child_id = request.child_id
     and feedback.material_id = request.source_material_id
    where job.material_id is null
      and not exists (
        select 1
        from private_generation.curriculum_submissions as submission
        where submission.job_id = job.id
      )
      and (
        job.feedback_cutoff_at is null
        or feedback.created_at > job.feedback_cutoff_at
      )
  ) then
    raise exception 'feedback-requested job still excludes its source feedback';
  end if;
end
$verify$;
