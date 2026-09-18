-- Fix replacement completion ambiguity without changing the public RPC signature.
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
  claimed_job public.generation_jobs%rowtype;
  replacement_job private_generation.material_replacement_jobs%rowtype;
  v_completed_material_id uuid;
  expected_prefix text;
  effective_release_at timestamptz;
  next_release_at timestamptz;
  next_material_week date;
  child_tz text;
begin
  if $1 is null then raise exception 'job_id is required'; end if;
  if $2 is null or char_length($2) < 3 then raise exception 'worker_id is required'; end if;

  select generation_job.* into claimed_job
  from public.generation_jobs as generation_job
  where generation_job.id = $1
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

  select replacement.* into replacement_job
  from private_generation.material_replacement_jobs as replacement
  where replacement.job_id = claimed_job.id
  for update;

  expected_prefix := claimed_job.child_id::text || '/' || claimed_job.id::text || '/';
  if $3 <> expected_prefix || 'student.pdf'
    or $4 <> expected_prefix || 'parent-answer.pdf' then
    raise exception 'artifact paths do not match the claimed job';
  end if;

  select coalesce(child.timezone, 'Asia/Taipei') into child_tz
  from public.children as child
  where child.id = claimed_job.child_id and child.is_active;

  if replacement_job.job_id is not null then
    select least(coalesce(max(source_job.release_at), now()), now())
    into effective_release_at
    from public.generation_jobs as source_job
    where source_job.material_id = replacement_job.source_material_id;
  else
    effective_release_at := case
      when claimed_job.source_material_id is null
        then least(coalesce(claimed_job.release_at, now()), now())
      else claimed_job.release_at
    end;
  end if;

  insert into public.materials (
    child_id, material_week, revision, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path, generation_summary,
    canonical_source, prompt_version, generator_version, model_name
  ) values (
    claimed_job.child_id,
    claimed_job.material_week,
    case when replacement_job.job_id is null then 1 else replacement_job.target_revision end,
    claimed_job.rule_version,
    jsonb_build_object(
      'sourceMaterialId', claimed_job.source_material_id,
      'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing,
      'replacementForMaterialId', replacement_job.source_material_id,
      'replacementRevision', replacement_job.target_revision
    ),
    $3, $4, $6,
    $5, $7, $8, $9
  ) returning id into v_completed_material_id;

  update public.generation_jobs as generation_job
  set status = 'completed', material_id = v_completed_material_id,
      release_at = effective_release_at,
      feedback_cutoff_at = effective_release_at - interval '48 hours',
      generation_due_at = effective_release_at - interval '24 hours',
      completed_at = now(), lease_expires_at = null,
      error_code = null, error_message = null
  where generation_job.id = claimed_job.id;

  if replacement_job.job_id is not null then
    update private_generation.material_replacement_jobs as replacement
    set completed_material_id = v_completed_material_id,
        completed_at = now()
    where replacement.job_id = claimed_job.id;
    return v_completed_material_id;
  end if;

  next_release_at := greatest(
    effective_release_at + interval '7 days',
    ((now() at time zone coalesce(child_tz, 'Asia/Taipei'))::date + 1)::timestamp at time zone coalesce(child_tz, 'Asia/Taipei')
  );
  next_material_week := (next_release_at at time zone coalesce(child_tz, 'Asia/Taipei'))::date;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    claimed_job.child_id,
    next_material_week,
    claimed_job.rule_version,
    claimed_job.child_id::text || ':' || next_material_week::text || ':r1',
    'pending', now(), v_completed_material_id,
    next_release_at,
    next_release_at - interval '48 hours',
    next_release_at - interval '24 hours'
  ) on conflict (idempotency_key) do nothing;

  update public.children as child
  set next_generation_at = next_release_at - interval '24 hours'
  where child.id = claimed_job.child_id;

  return v_completed_material_id;
end;
$$;

revoke all on function public.worker_complete_generation_job(uuid, text, text, text, jsonb, jsonb, text, text, text)
from public, anon, authenticated;
grant execute on function public.worker_complete_generation_job(uuid, text, text, text, jsonb, jsonb, text, text, text)
to service_role;
