-- Migration: 20260827120000_test_mode_immediate_claim_and_single_tester.sql
-- Enforce single active test mode child and allow immediate claiming for test mode children once feedback is submitted.

-- 1. Ensure at most 1 active test session exists before adding the unique partial index
with ranked as (
  select child_id, row_number() over (order by updated_at desc) as rn
  from public.generation_test_mode_sessions
  where is_enabled = true
)
update public.generation_test_mode_sessions
set is_enabled = false, updated_at = now()
where child_id in (select child_id from ranked where rn > 1);

create unique index if not exists idx_single_active_test_mode_session
on public.generation_test_mode_sessions ((1))
where is_enabled = true;

-- 2. Update admin_set_test_mode to enforce single active tester
create or replace function public.admin_set_test_mode(
  p_child_id uuid,
  p_is_enabled boolean,
  p_target_week integer default 9,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.children%rowtype;
  v_materials_count integer := 0;
  v_target integer := coalesce(p_target_week, 9);
begin
  if p_child_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CHILD_ID', 'message', 'Child ID is required');
  end if;

  select * into v_child from public.children where id = p_child_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'CHILD_NOT_FOUND', 'message', 'Child not found');
  end if;

  if v_target < 1 or v_target > 16 then
    return jsonb_build_object('success', false, 'error', 'INVALID_TARGET_WEEK', 'message', 'Target week must be between 1 and 16');
  end if;

  if p_is_enabled then
    -- Restrict to at most one active test child at a time by deactivating any existing sessions
    update public.generation_test_mode_sessions
    set is_enabled = false,
        updated_at = now()
    where child_id <> p_child_id and is_enabled = true;

    insert into public.generation_test_mode_sessions (child_id, is_enabled, target_week, updated_at)
    values (p_child_id, true, v_target, now())
    on conflict (child_id) do update
    set is_enabled = true,
        target_week = excluded.target_week,
        updated_at = now();

    return jsonb_build_object(
      'success', true,
      'childId', p_child_id,
      'isEnabled', true,
      'targetWeek', v_target
    );
  else
    -- Disabling test mode
    select count(*)::integer into v_materials_count
    from public.materials
    where child_id = p_child_id;

    if v_materials_count > 0 and not p_force then
      return jsonb_build_object(
        'success', false,
        'error', 'RESET_REQUIRED_BEFORE_END_TEST_MODE',
        'message', '學員已有測試生成教材紀錄，為確保正式排程時序一致，結束測試模式前請先執行「重設回開通起點 (Reset to Onboarding)」。'
      );
    end if;

    update public.generation_test_mode_sessions
    set is_enabled = false,
        updated_at = now()
    where child_id = p_child_id;

    return jsonb_build_object(
      'success', true,
      'childId', p_child_id,
      'isEnabled', false
    );
  end if;
end;
$$;

revoke all on function public.admin_set_test_mode(uuid, boolean, integer, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_test_mode(uuid, boolean, integer, boolean) to service_role;

-- 3. Update admin_get_test_mode_status (bypass subscription check for test mode)
create or replace function public.admin_get_test_mode_status(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.children%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_session public.generation_test_mode_sessions%rowtype;
  v_completed_weeks integer := 0;
  v_latest_material public.materials%rowtype;
  v_latest_feedback public.feedback%rowtype;
  v_next_job public.generation_jobs%rowtype;
  v_active_lease_exists boolean := false;
  v_finisher_in_progress boolean := false;
  v_unresolved_failure boolean := false;
  v_unresolved_code text;
  v_non_completed_job_count integer := 0;
  v_can_advance boolean := true;
  v_advance_code text := null;
  v_advance_reason text := null;
  v_can_reset boolean := true;
  v_reset_code text := null;
  v_reset_reason text := null;
  v_is_already_advanced boolean := false;
begin
  if p_child_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CHILD_ID', 'message', 'Child ID is required');
  end if;

  -- 1. Load child
  select * into v_child
  from public.children
  where id = p_child_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'CHILD_NOT_FOUND', 'message', 'Child not found');
  end if;

  -- 2. Load subscription
  select * into v_subscription
  from public.subscriptions
  where child_id = p_child_id;

  -- 3. Load test mode session
  select * into v_session
  from public.generation_test_mode_sessions
  where child_id = p_child_id;

  -- 4. Count completed materials
  select count(*)::integer into v_completed_weeks
  from public.materials
  where child_id = p_child_id;

  -- 5. Load latest completed material
  select * into v_latest_material
  from public.materials
  where child_id = p_child_id
  order by material_week desc, revision desc
  limit 1;

  -- 6. Load feedback for latest material (if any)
  if v_latest_material.id is not null then
    select * into v_latest_feedback
    from public.feedback
    where child_id = p_child_id and material_id = v_latest_material.id;
  end if;

  -- 7. Load next non-completed job
  select count(*)::integer into v_non_completed_job_count
  from public.generation_jobs
  where child_id = p_child_id and status <> 'completed';

  select * into v_next_job
  from public.generation_jobs
  where child_id = p_child_id and status <> 'completed'
  order by scheduled_for asc, created_at asc
  limit 1;

  -- 8. Check active worker leases on non-completed jobs
  select exists (
    select 1 from public.generation_jobs
    where child_id = p_child_id
      and status = 'claimed'
      and lease_expires_at is not null
      and lease_expires_at > now()
  ) into v_active_lease_exists;

  -- 9. Check active submissions in finisher
  if v_next_job.id is not null then
    select exists (
      select 1 from private_generation.curriculum_submissions
      where job_id = v_next_job.id
        and status in ('pending', 'processing', 'technical_failed')
    ) into v_finisher_in_progress;

    -- Check if quality rejected and attempts exhausted
    if v_next_job.status = 'failed' or (
      v_next_job.attempt_count >= v_next_job.max_attempts and v_next_job.status <> 'completed'
    ) or v_next_job.error_code = 'HUMAN_REVIEW_REQUIRED' then
      v_unresolved_failure := true;
      v_unresolved_code := coalesce(v_next_job.error_code, 'UNRESOLVED_GENERATION_FAILURE');
    end if;
  end if;

  -- 10. Check if next job is already accelerated
  if v_next_job.id is not null and v_next_job.status = 'pending' then
    if v_next_job.scheduled_for <= now()
      and v_next_job.feedback_cutoff_at <= now()
      and v_next_job.release_at <= now() + interval '50 hours'
      and v_next_job.release_at >= now() + interval '46 hours' then
      v_is_already_advanced := true;
    end if;
  end if;

  -- 11. Evaluate advance eligibility
  if not coalesce(v_session.is_enabled, false) then
    v_can_advance := false;
    v_advance_code := 'TEST_MODE_NOT_ENABLED';
    v_advance_reason := '此學員尚未啟用 Generation Test Mode';
  elsif not v_child.is_active then
    v_can_advance := false;
    v_advance_code := 'CHILD_NOT_FOUND';
    v_advance_reason := '學員帳號已被停用';
  -- Note: Active test mode children bypass subscription requirements
  elsif not coalesce(v_session.is_enabled, false) and not v_child.is_internal_test and v_subscription.status not in ('trialing', 'active') then
    v_can_advance := false;
    v_advance_code := 'SUBSCRIPTION_NOT_ELIGIBLE';
    v_advance_reason := '學員訂閱狀態為 ' || coalesce(v_subscription.status, 'none') || '，不符合生成資格';
  elsif v_active_lease_exists then
    v_can_advance := false;
    v_advance_code := 'ACTIVE_AUTHORING_LEASE';
    v_advance_reason := '目前有 Worker 正在進行作者生成處理中';
  elsif v_finisher_in_progress then
    v_can_advance := false;
    v_advance_code := 'FINISHER_IN_PROGRESS';
    v_advance_reason := 'Finisher 正在進行 PDF 渲染或品質審核';
  elsif v_unresolved_failure then
    v_can_advance := false;
    v_advance_code := 'UNRESOLVED_GENERATION_FAILURE';
    v_advance_reason := '前次嘗試品質審核退回，需先由管理員授權重試 (Grant Retry)';
  elsif v_latest_material.id is not null and v_latest_material.observations_recorded_at is null then
    v_can_advance := false;
    v_advance_code := 'OBSERVATIONS_NOT_RECORDED';
    v_advance_reason := '前週教材之學習記憶與觀察數據 (Curriculum Observations) 尚未完成寫入';
  elsif v_next_job.id is null then
    v_can_advance := false;
    v_advance_code := 'NEXT_JOB_NOT_FOUND';
    v_advance_reason := '找不到下一週待生成任務 (Pending Generation Job)';
  elsif v_non_completed_job_count > 1 then
    v_can_advance := false;
    v_advance_code := 'MULTIPLE_NEXT_JOBS';
    v_advance_reason := '偵測到多個未完成任務，狀態不一致';
  elsif v_completed_weeks >= coalesce(v_session.target_week, 9) then
    v_can_advance := false;
    v_advance_code := 'TARGET_WEEK_REACHED';
    v_advance_reason := '已達目標測試週次 (Week ' || coalesce(v_session.target_week, 9) || ')，已停止自動推進';
  elsif v_is_already_advanced then
    v_can_advance := false;
    v_advance_code := 'WEEK_ALREADY_ADVANCED';
    v_advance_reason := '此週任務已完成時間加速排程，正等待 ChatGPT Worker 領取';
  end if;

  -- 12. Evaluate reset eligibility
  if not coalesce(v_session.is_enabled, false) then
    v_can_reset := false;
    v_reset_code := 'TEST_MODE_NOT_ENABLED';
    v_reset_reason := '僅測試模式學員可執行重設至開通狀態';
  elsif v_active_lease_exists or v_finisher_in_progress then
    v_can_reset := false;
    v_reset_code := 'RESET_BLOCKED_ACTIVE_WORK';
    v_reset_reason := '目前有生成或審核工作進行中，無法重設';
  end if;

  return jsonb_build_object(
    'success', true,
    'childId', p_child_id,
    'childPseudonym', v_child.display_name,
    'isEnabled', coalesce(v_session.is_enabled, false),
    'targetWeek', coalesce(v_session.target_week, 9),
    'completedWeeksCount', v_completed_weeks,
    'currentMaterialWeek', case when v_latest_material.id is not null then v_latest_material.material_week::text else null end,
    'nextJob', case when v_next_job.id is null then null else jsonb_build_object(
      'id', v_next_job.id,
      'materialWeek', v_next_job.material_week::text,
      'status', v_next_job.status,
      'attemptCount', v_next_job.attempt_count,
      'maxAttempts', v_next_job.max_attempts,
      'ruleVersion', v_next_job.rule_version,
      'scheduledFor', v_next_job.scheduled_for,
      'generationDueAt', v_next_job.generation_due_at,
      'releaseAt', v_next_job.release_at,
      'feedbackCutoffAt', v_next_job.feedback_cutoff_at,
      'feedbackMissing', v_next_job.feedback_missing,
      'isHumanReviewRequired', v_unresolved_failure,
      'leaseExpiresAt', v_next_job.lease_expires_at,
      'errorCode', v_next_job.error_code,
      'errorMessage', v_next_job.error_message,
      'isAlreadyAdvanced', v_is_already_advanced
    ) end,
    'latestMaterial', case when v_latest_material.id is null then null else jsonb_build_object(
      'id', v_latest_material.id,
      'materialWeek', v_latest_material.material_week::text,
      'revision', v_latest_material.revision,
      'ruleVersion', v_latest_material.rule_version,
      'modelName', v_latest_material.model_name,
      'promptVersion', v_latest_material.prompt_version,
      'studentPdfPath', v_latest_material.student_pdf_path,
      'parentAnswerPdfPath', v_latest_material.parent_answer_pdf_path,
      'observationsRecordedAt', v_latest_material.observations_recorded_at,
      'hasFeedback', (v_latest_feedback.id is not null)
    ) end,
    'latestFeedback', case when v_latest_feedback.id is null then null else jsonb_build_object(
      'id', v_latest_feedback.id,
      'difficulty', v_latest_feedback.difficulty,
      'completionRate', v_latest_feedback.completion_rate,
      'weakArea', v_latest_feedback.weak_area,
      'mistakesText', v_latest_feedback.mistakes_text,
      'childComments', v_latest_feedback.child_comments,
      'parentComments', v_latest_feedback.parent_comments,
      'schoolProgressUpdate', v_latest_feedback.school_progress_update,
      'interestUpdate', v_latest_feedback.interest_update,
      'notes', v_latest_feedback.notes,
      'createdAt', v_latest_feedback.created_at
    ) end,
    'advanceEligibility', jsonb_build_object(
      'canAdvance', v_can_advance,
      'blockingCode', v_advance_code,
      'blockingReason', v_advance_reason
    ),
    'resetEligibility', jsonb_build_object(
      'canReset', v_can_reset,
      'blockingCode', v_reset_code,
      'blockingReason', v_reset_reason
    )
  );
end;
$$;

revoke all on function public.admin_get_test_mode_status(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_test_mode_status(uuid) to service_role;

-- 4. Update admin_advance_test_week (bypass subscription check for test mode)
create or replace function public.admin_advance_test_week(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.children%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_session public.generation_test_mode_sessions%rowtype;
  v_completed_weeks integer := 0;
  v_latest_material public.materials%rowtype;
  v_pending_job public.generation_jobs%rowtype;
  v_non_completed_job_count integer := 0;
  v_active_lease_exists boolean := false;
  v_finisher_in_progress boolean := false;
  v_now timestamptz := now();
  v_accelerated_release timestamptz;
  v_accelerated_due timestamptz;
  v_accelerated_cutoff timestamptz;
begin
  if p_child_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CHILD_ID', 'message', 'Child ID is required');
  end if;

  -- 1. Lock and validate session
  select * into v_session
  from public.generation_test_mode_sessions
  where child_id = p_child_id
  for update;

  if not found or not coalesce(v_session.is_enabled, false) then
    return jsonb_build_object(
      'success', false,
      'error', 'TEST_MODE_NOT_ENABLED',
      'message', 'Child is not in active Generation Test Mode'
    );
  end if;

  -- 2. Lock and validate child
  select * into v_child
  from public.children
  where id = p_child_id
  for update;

  if not found or not v_child.is_active then
    return jsonb_build_object(
      'success', false,
      'error', 'CHILD_NOT_FOUND',
      'message', 'Child not found or is inactive'
    );
  end if;

  -- 3. Validate subscription (ignored for test mode children)
  select * into v_subscription
  from public.subscriptions
  where child_id = p_child_id;

  if not coalesce(v_session.is_enabled, false) and not v_child.is_internal_test and v_subscription.status not in ('trialing', 'active') then
    return jsonb_build_object(
      'success', false,
      'error', 'SUBSCRIPTION_NOT_ELIGIBLE',
      'message', 'Child subscription is not active or trialing'
    );
  end if;

  -- 4. Count completed materials
  select count(*)::integer into v_completed_weeks
  from public.materials
  where child_id = p_child_id;

  if v_completed_weeks >= coalesce(v_session.target_week, 9) then
    return jsonb_build_object(
      'success', false,
      'error', 'TARGET_WEEK_REACHED',
      'message', 'Target test week (' || coalesce(v_session.target_week, 9) || ') has been reached'
    );
  end if;

  -- 5. Validate previous material observations
  if v_completed_weeks > 0 then
    select * into v_latest_material
    from public.materials
    where child_id = p_child_id
    order by material_week desc, revision desc
    limit 1;

    if v_latest_material.observations_recorded_at is null then
      return jsonb_build_object(
        'success', false,
        'error', 'OBSERVATIONS_NOT_RECORDED',
        'message', 'Previous material observations have not been persisted'
      );
    end if;
  end if;

  -- 6. Lock and validate non-completed jobs
  select count(*)::integer into v_non_completed_job_count
  from public.generation_jobs
  where child_id = p_child_id and status <> 'completed';

  if v_non_completed_job_count = 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'NEXT_JOB_NOT_FOUND',
      'message', 'No pending generation job found for next week'
    );
  end if;

  if v_non_completed_job_count > 1 then
    return jsonb_build_object(
      'success', false,
      'error', 'MULTIPLE_NEXT_JOBS',
      'message', 'Multiple non-completed generation jobs found'
    );
  end if;

  select * into v_pending_job
  from public.generation_jobs
  where child_id = p_child_id and status <> 'completed'
  for update;

  -- 7. Reject if active lease
  if v_pending_job.status = 'claimed' and v_pending_job.lease_expires_at is not null and v_pending_job.lease_expires_at > v_now then
    return jsonb_build_object(
      'success', false,
      'error', 'ACTIVE_AUTHORING_LEASE',
      'message', 'Job is currently leased by an active authoring worker'
    );
  end if;

  -- 8. Reject if submission is active in finisher
  select exists (
    select 1 from private_generation.curriculum_submissions
    where job_id = v_pending_job.id
      and status in ('pending', 'processing', 'technical_failed')
  ) into v_finisher_in_progress;

  if v_finisher_in_progress then
    return jsonb_build_object(
      'success', false,
      'error', 'FINISHER_IN_PROGRESS',
      'message', 'A submission is currently pending or processing in the Finisher'
    );
  end if;

  -- 9. Reject if quality rejected / human review required without granted retry
  if v_pending_job.status = 'failed' or (
    v_pending_job.attempt_count >= v_pending_job.max_attempts and v_pending_job.status <> 'completed'
  ) or v_pending_job.error_code = 'HUMAN_REVIEW_REQUIRED' then
    return jsonb_build_object(
      'success', false,
      'error', 'UNRESOLVED_GENERATION_FAILURE',
      'message', 'Job has unresolved failure / HUMAN_REVIEW_REQUIRED. Must grant retry first.'
    );
  end if;

  -- 10. Check if already accelerated
  if v_pending_job.status = 'pending'
    and v_pending_job.scheduled_for <= v_now
    and v_pending_job.feedback_cutoff_at <= v_now
    and v_pending_job.release_at <= v_now + interval '50 hours'
    and v_pending_job.release_at >= v_now + interval '46 hours' then
    return jsonb_build_object(
      'success', false,
      'error', 'WEEK_ALREADY_ADVANCED',
      'message', 'Job is already accelerated and waiting for worker claim'
    );
  end if;

  -- 11. Compute accelerated schedule maintaining all constraints
  v_accelerated_release := v_now + interval '48 hours';
  v_accelerated_due := v_accelerated_release - interval '24 hours';
  v_accelerated_cutoff := v_accelerated_release - interval '48 hours';

  update public.generation_jobs
  set scheduled_for = v_accelerated_cutoff - interval '30 minutes',
      feedback_cutoff_at = v_accelerated_cutoff,
      generation_due_at = v_accelerated_due,
      release_at = v_accelerated_release,
      error_code = null,
      error_message = null,
      updated_at = v_now
  where id = v_pending_job.id;

  return jsonb_build_object(
    'success', true,
    'childId', p_child_id,
    'jobId', v_pending_job.id,
    'materialWeek', v_pending_job.material_week::text,
    'scheduledFor', (v_accelerated_cutoff - interval '30 minutes'),
    'feedbackCutoffAt', v_accelerated_cutoff,
    'generationDueAt', v_accelerated_due,
    'releaseAt', v_accelerated_release
  );
end;
$$;

revoke all on function public.admin_advance_test_week(uuid) from public, anon, authenticated;
grant execute on function public.admin_advance_test_week(uuid) to service_role;

-- 5. Authoritative generation claiming RPC: bypass subscription and timing release for test mode children
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
        -- For kids in test mode (or internal test), bypass scheduled_for and generation_due_at calendar gates
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at <= now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and active_submission.status in ('pending', 'processing', 'technical_failed')
      )
      and (
        -- For kids in test mode: claim immediately if Week 1 (source_material_id is null)
        -- or as soon as feedback is written for source_material_id (no feedback_cutoff_at delay)
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
        -- For kids in test mode (or internal test), bypass scheduled_for and generation_due_at
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at > now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and active_submission.status in ('pending', 'processing', 'technical_failed')
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
  from selected where job.id = selected.id returning job.*;
end;
$$;

revoke all on function private_generation.claim_due_generation_jobs(text) from public, anon, authenticated;
grant execute on function private_generation.claim_due_generation_jobs(text) to service_role;
