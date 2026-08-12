create or replace function public.worker_claim_generation_jobs(worker_id text)
returns setof public.generation_jobs
language sql
security definer
set search_path = ''
as $$
  select * from private_generation.claim_due_generation_jobs($1);
$$;

revoke all on function public.worker_claim_generation_jobs(text)
from public, anon, authenticated;
grant execute on function public.worker_claim_generation_jobs(text) to service_role;

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  result jsonb;
begin
  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
    and job.status = 'claimed'
    and job.claimed_by = $2
    and job.lease_expires_at > now();

  if claimed_job.id is null then
    raise exception 'job is not actively claimed by this worker';
  end if;

  select jsonb_build_object(
    'job', jsonb_build_object(
      'id', claimed_job.id,
      'childId', claimed_job.child_id,
      'materialWeek', claimed_job.material_week,
      'ruleVersion', claimed_job.rule_version,
      'releaseAt', claimed_job.release_at,
      'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing,
      'sourceMaterialId', claimed_job.source_material_id
    ),
    'child', jsonb_build_object(
      'grade', child.grade,
      'textbookVersion', child.textbook_version,
      'preferences', child.preferences
    ),
    'profile', to_jsonb(profile) - 'child_id' - 'created_at' - 'updated_at',
    'learningState', to_jsonb(state) - 'child_id' - 'updated_at',
    'vocabularyProgress', coalesce((
      select jsonb_agg(to_jsonb(vocab) - 'child_id' order by vocab.updated_at desc)
      from (
        select * from public.child_vocab_progress
        where child_id = claimed_job.child_id
        order by updated_at desc limit 100
      ) as vocab
    ), '[]'::jsonb),
    'grammarProgress', coalesce((
      select jsonb_agg(to_jsonb(grammar) - 'child_id' order by grammar.updated_at desc)
      from (
        select * from public.child_grammar_progress
        where child_id = claimed_job.child_id
        order by updated_at desc limit 100
      ) as grammar
    ), '[]'::jsonb),
    'sourceMaterial', case when source_material.id is null then null else
      jsonb_build_object(
        'id', source_material.id,
        'materialWeek', source_material.material_week,
        'generationSummary', source_material.generation_summary
      ) end,
    'feedback', case when feedback.id is null then null else
      to_jsonb(feedback) - 'child_id' - 'updated_at'
    end
  ) into result
  from public.children as child
  join public.child_profiles as profile on profile.child_id = child.id
  join public.child_learning_state as state on state.child_id = child.id
  left join public.materials as source_material on source_material.id = claimed_job.source_material_id
  left join public.feedback as feedback
    on feedback.child_id = claimed_job.child_id
    and feedback.material_id = claimed_job.source_material_id
    and feedback.created_at <= claimed_job.feedback_cutoff_at
  where child.id = claimed_job.child_id;

  return result;
end;
$$;

revoke all on function public.worker_generation_context(uuid, text)
from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;

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
    claimed_job.release_at + interval '7 days',
    claimed_job.release_at + interval '7 days' - interval '48 hours',
    claimed_job.release_at + interval '7 days' - interval '24 hours'
  ) on conflict (idempotency_key) do nothing;

  update public.children
  set next_generation_at = claimed_job.release_at + interval '7 days' - interval '24 hours'
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

create or replace function public.worker_fail_generation_job(
  job_id uuid,
  worker_id text,
  error_code text,
  error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generation_jobs as job
  set status = 'failed',
      lease_expires_at = null,
      error_code = left(error_code, 100),
      error_message = left(error_message, 2000)
  where job.id = $1
    and job.status = 'claimed'
    and job.claimed_by = $2;
  return found;
end;
$$;

revoke all on function public.worker_fail_generation_job(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.worker_fail_generation_job(uuid, text, text, text)
to service_role;
