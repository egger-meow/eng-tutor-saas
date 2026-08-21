create or replace function public.worker_complete_generation_job(
  job_id uuid,
  worker_id text,
  student_pdf_path text,
  parent_answer_pdf_path text,
  canonical_source jsonb,
  generation_summary jsonb,
  prompt_version text,
  generator_version text,
  model_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  completed_material_id uuid;
  expected_prefix text;
  effective_release_at timestamptz;
begin
  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
  for update;

  if claimed_job.status = 'completed' then
    return claimed_job.material_id;
  end if;

  if claimed_job.id is null
    or claimed_job.status <> 'claimed'
    or claimed_job.claimed_by <> $2
    or claimed_job.lease_expires_at <= now() then
    raise exception 'job is not actively claimed by this worker';
  end if;

  expected_prefix := claimed_job.child_id::text || '/' || claimed_job.id::text || '/';
  if $3 <> expected_prefix || 'student.pdf'
    or $4 <> expected_prefix || 'parent-answer.pdf' then
    raise exception 'artifact paths do not match the claimed job';
  end if;

  -- Week 1 is the only early-release exception. Once both artifacts pass the
  -- finisher, completion time becomes the actual release anchor when it is
  -- earlier than the original next-day expectation.
  effective_release_at := case
    when claimed_job.source_material_id is null
      then least(coalesce(claimed_job.release_at, now()), now())
    else claimed_job.release_at
  end;

  insert into public.materials (
    child_id, material_week, revision, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path, generation_summary,
    canonical_source, prompt_version, generator_version, model_name
  ) values (
    claimed_job.child_id, claimed_job.material_week, 1, claimed_job.rule_version,
    jsonb_build_object(
      'sourceMaterialId', claimed_job.source_material_id,
      'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing
    ),
    $3, $4, $6,
    $5, $7, $8, $9
  ) returning id into completed_material_id;

  update public.generation_jobs
  set status = 'completed', material_id = completed_material_id,
      release_at = effective_release_at,
      feedback_cutoff_at = effective_release_at - interval '48 hours',
      generation_due_at = effective_release_at - interval '24 hours',
      completed_at = now(), lease_expires_at = null,
      error_code = null, error_message = null
  where id = claimed_job.id;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    claimed_job.child_id,
    claimed_job.material_week + 7,
    claimed_job.rule_version,
    claimed_job.child_id::text || ':' || (claimed_job.material_week + 7)::text || ':r1',
    'pending', now(), completed_material_id,
    effective_release_at + interval '7 days',
    effective_release_at + interval '7 days' - interval '48 hours',
    effective_release_at + interval '7 days' - interval '24 hours'
  ) on conflict (idempotency_key) do nothing;

  update public.children
  set next_generation_at = effective_release_at + interval '7 days' - interval '24 hours'
  where id = claimed_job.child_id;

  return completed_material_id;
end;
$$;

revoke all on function public.worker_complete_generation_job(
  uuid, text, text, text, jsonb, jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.worker_complete_generation_job(
  uuid, text, text, text, jsonb, jsonb, text, text, text
) to service_role;

-- Release already-finished Week 1 packets that are still waiting on their
-- original next-day timestamp, then realign their existing Week 2 schedule.
with early_week_one as (
  update public.generation_jobs as week_one
  set release_at = least(week_one.release_at, week_one.completed_at, now()),
      feedback_cutoff_at = least(week_one.release_at, week_one.completed_at, now()) - interval '48 hours',
      generation_due_at = least(week_one.release_at, week_one.completed_at, now()) - interval '24 hours'
  where week_one.status = 'completed'
    and week_one.material_id is not null
    and week_one.source_material_id is null
    and week_one.release_at > now()
    and week_one.completed_at is not null
  returning week_one.child_id, week_one.material_id, week_one.release_at
), realigned_week_two as (
  update public.generation_jobs as week_two
  set release_at = week_one.release_at + interval '7 days',
      feedback_cutoff_at = week_one.release_at + interval '7 days' - interval '48 hours',
      generation_due_at = week_one.release_at + interval '7 days' - interval '24 hours'
  from early_week_one as week_one
  where week_two.child_id = week_one.child_id
    and week_two.source_material_id = week_one.material_id
    and week_two.status in ('pending', 'claimed')
  returning week_two.child_id, week_two.generation_due_at
)
update public.children as child
set next_generation_at = week_two.generation_due_at
from realigned_week_two as week_two
where child.id = week_two.child_id;
