-- Migration: 20260829073000_allow_test_mode_reset_of_student_library.sql
-- Fix: Allow test mode Reset to Onboarding to clean up longitudinal student library records.

-- 1. Update reject_student_library_mutation to recognize session bypass flag
create or replace function private.reject_student_library_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and (
    pg_trigger_depth() > 1
    or nullif(current_setting('private.allow_student_library_mutation', true), '') = 'true'
  ) then
    return old;
  end if;
  raise exception 'student library rows are immutable';
end;
$$;

-- 2. Update protect_feedback_processing_revision to recognize session bypass flag
create or replace function private.protect_feedback_processing_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and (
    pg_trigger_depth() > 1
    or nullif(current_setting('private.allow_student_library_mutation', true), '') = 'true'
  ) then
    return old;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'feedback processing revisions are immutable';
  end if;
  if old.id <> new.id or old.feedback_id <> new.feedback_id or old.child_id <> new.child_id
     or old.material_id <> new.material_id or old.revision_fingerprint <> new.revision_fingerprint
     or old.processor_version <> new.processor_version or old.cutoff_classification <> new.cutoff_classification
     or old.sanitized_outcome <> new.sanitized_outcome or old.processed_at <> new.processed_at
     or old.created_at <> new.created_at or not (old.status = 'effective' and new.status = 'superseded') then
    raise exception 'feedback processing revision payload is immutable';
  end if;
  return new;
end;
$$;

-- 3. Update admin_reset_test_child_to_onboarding to delete student library rows cleanly
create or replace function public.admin_reset_test_child_to_onboarding(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.generation_test_mode_sessions%rowtype;
  v_child public.children%rowtype;
  v_active_lease_exists boolean := false;
  v_finisher_in_progress boolean := false;
  v_storage_paths jsonb := '[]'::jsonb;
  v_child_tz text;
  v_local_now timestamp;
  v_next_day_local date;
  v_release_anchor timestamptz;
  v_first_material_week date;
  v_new_job_id uuid;
  v_del_materials integer := 0;
  v_del_jobs integer := 0;
  v_del_feedback integer := 0;
  v_del_obs integer := 0;
  v_del_submissions integer := 0;
begin
  if p_child_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CHILD_ID', 'message', 'Child ID is required');
  end if;

  -- 1. Validate test mode session
  select * into v_session
  from public.generation_test_mode_sessions
  where child_id = p_child_id
  for update;

  if not found or not coalesce(v_session.is_enabled, false) then
    return jsonb_build_object('success', false, 'error', 'TEST_MODE_NOT_ENABLED', 'message', 'Only test mode children can be reset to onboarding');
  end if;

  -- 2. Validate child
  select * into v_child
  from public.children
  where id = p_child_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'CHILD_NOT_FOUND', 'message', 'Child not found');
  end if;

  -- 3. Reject if active leases or finisher work exist
  select exists (
    select 1 from public.generation_jobs
    where child_id = p_child_id
      and status = 'claimed'
      and lease_expires_at is not null
      and lease_expires_at > now()
  ) into v_active_lease_exists;

  select exists (
    select 1 from private_generation.curriculum_submissions as s
    join public.generation_jobs as j on j.id = s.job_id
    where j.child_id = p_child_id
      and s.status in ('pending', 'processing', 'technical_failed')
  ) into v_finisher_in_progress;

  if v_active_lease_exists or v_finisher_in_progress then
    return jsonb_build_object(
      'success', false,
      'error', 'RESET_BLOCKED_ACTIVE_WORK',
      'message', 'Active authoring lease or Finisher submission in progress; cannot reset'
    );
  end if;

  -- 4. Collect private PDF storage paths before deleting DB references
  select coalesce(jsonb_agg(path), '[]'::jsonb) into v_storage_paths
  from (
    select student_pdf_path as path from public.materials where child_id = p_child_id and student_pdf_path is not null
    union
    select parent_answer_pdf_path as path from public.materials where child_id = p_child_id and parent_answer_pdf_path is not null
  ) paths;

  -- 5. Enable transaction-local bypass for student library clean-up
  perform set_config('private.allow_student_library_mutation', 'true', true);

  -- 6. Delete derived curriculum lifecycle and student library state
  delete from public.child_learning_evidence where child_id = p_child_id;
  delete from public.child_weekly_learning_snapshots where child_id = p_child_id;
  delete from public.feedback_memory_processing where child_id = p_child_id;

  delete from public.feedback where child_id = p_child_id;
  get diagnostics v_del_feedback = row_count;

  delete from public.child_vocab_progress where child_id = p_child_id;
  delete from public.child_grammar_progress where child_id = p_child_id;
  delete from public.child_communication_progress where child_id = p_child_id;

  delete from public.curriculum_quality_observations where child_id = p_child_id;
  get diagnostics v_del_obs = row_count;

  delete from private_generation.curriculum_submissions where job_id in (select id from public.generation_jobs where child_id = p_child_id);
  get diagnostics v_del_submissions = row_count;

  delete from private_generation.generation_claim_snapshots where job_id in (select id from public.generation_jobs where child_id = p_child_id);
  delete from public.material_email_deliveries where child_id = p_child_id;

  delete from public.generation_jobs where child_id = p_child_id;
  get diagnostics v_del_jobs = row_count;

  delete from public.materials where child_id = p_child_id;
  get diagnostics v_del_materials = row_count;

  -- 7. Reset learning state to clean onboarding baseline
  update public.child_learning_state
  set compact_weekly_history = '[]'::jsonb,
      recent_feedback_summary = null,
      recurring_mistakes = '[]'::jsonb,
      comprehension_accuracy = null,
      difficulty_trend = null,
      updated_at = now()
  where child_id = p_child_id;

  -- 8. Recreate exactly one fresh Week 1 pending job using authoritative Week 1 scheduling logic
  v_child_tz := coalesce(v_child.timezone, 'Asia/Taipei');
  v_local_now := now() at time zone v_child_tz;
  v_next_day_local := (v_local_now::date) + 1;
  v_first_material_week := v_next_day_local;
  v_release_anchor := (v_next_day_local::timestamp) at time zone v_child_tz;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    p_child_id,
    v_first_material_week,
    'curriculum-rules/1.0.0',
    p_child_id::text || ':' || v_first_material_week::text || ':r1',
    'pending',
    date_trunc('second', now()),
    null,
    v_release_anchor,
    v_release_anchor - interval '48 hours',
    v_release_anchor - interval '24 hours'
  ) on conflict (idempotency_key) do update
  set scheduled_for = date_trunc('second', now()),
      status = 'pending',
      attempt_count = 0,
      claimed_by = null,
      lease_expires_at = null,
      error_code = null,
      error_message = null
  returning id into v_new_job_id;

  update public.children
  set next_generation_at = v_release_anchor - interval '24 hours'
  where id = p_child_id;

  return jsonb_build_object(
    'success', true,
    'childId', p_child_id,
    'newJobId', v_new_job_id,
    'materialWeek', v_first_material_week,
    'deletedMaterialsCount', v_del_materials,
    'deletedJobsCount', v_del_jobs,
    'deletedFeedbackCount', v_del_feedback,
    'deletedObservationsCount', v_del_obs,
    'deletedSubmissionsCount', v_del_submissions,
    'storagePathsToDelete', v_storage_paths
  );
end;
$$;

revoke all on function public.admin_reset_test_child_to_onboarding(uuid) from public, anon, authenticated;
grant execute on function public.admin_reset_test_child_to_onboarding(uuid) to service_role;
