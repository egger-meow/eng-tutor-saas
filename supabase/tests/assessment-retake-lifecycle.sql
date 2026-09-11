-- ============================================================================
-- Direct Assessment Retake Lifecycle Regression Tests
-- ============================================================================

begin;

-- Seed Parent and Children
insert into auth.users (id, email)
values
  ('a1000000-0000-0000-0000-000000000001', 'retake-parent-1@example.com'),
  ('a2000000-0000-0000-0000-000000000002', 'retake-parent-2@example.com')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Retake Child 1', 7, 'grade_7', true),
  ('c2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Retake Child 2', 8, 'grade_8', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Scenario 1: Overview and Cooldown Check
-- ----------------------------------------------------------------------------
do $$
declare
  v_child_1 uuid := 'c1000000-0000-0000-0000-000000000001';
  v_session_old uuid := 'd1000000-0000-0000-0000-000000000001';
  v_overview jsonb;
  v_retake_session jsonb;
  v_err_caught boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- 1. Child with no session: overview reports not_started and retakeEligible = false
  v_overview := public.get_child_assessment_overview(v_child_1);
  if (v_overview->>'status') <> 'not_started' or (v_overview->>'retakeEligible')::boolean <> false then
    raise exception 'Scenario 1 failed: not_started overview mismatch: %', v_overview;
  end if;

  -- 2. Complete an assessment 30 days ago (< 90 days cooldown)
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result, provisional_state
  ) values (
    v_session_old, v_child_1, 'completed', 18, 18,
    now() - interval '30 days',
    jsonb_build_object(
      'overallNarrativeZh', '舊的診斷結果',
      'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'developing', 'confidence', 'medium', 'summaryZh', '單字正在建立')),
      'skillEvaluations', jsonb_build_object('core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'result', 'developing', 'confidence', 'medium'))
    ),
    '{"current_item_id": null}'::jsonb
  );

  insert into public.child_assessment_state (
    child_id, last_session_id, status, skill_results, domain_summaries, assessed_at, projection_version
  ) values (
    v_child_1, v_session_old, 'completed',
    jsonb_build_object('core_vocabulary', jsonb_build_object('level', 'developing', 'confidence', 'medium')),
    jsonb_build_object('vocabulary', jsonb_build_object('level', 'developing', 'confidence', 'medium')),
    now() - interval '30 days', 'assessment-projection-v1'
  );

  -- 3. Overview at 30 days: status = completed, retakeEligible = false
  v_overview := public.get_child_assessment_overview(v_child_1);
  if (v_overview->>'status') <> 'completed' or (v_overview->>'retakeEligible')::boolean <> false then
    raise exception 'Scenario 1 failed: 30 days completed overview should not be retake eligible: %', v_overview;
  end if;
  if (v_overview->>'daysSinceCompleted')::integer < 29 or (v_overview->>'cooldownDays')::integer <> 90 then
    raise exception 'Scenario 1 failed: daysSinceCompleted or cooldownDays mismatch: %', v_overview;
  end if;

  -- 4. Attempt retake at 30 days: must FAIL closed with cooldown error
  v_err_caught := false;
  begin
    perform public.start_assessment_retake(v_child_1);
  exception when others then
    if sqlerrm like 'Assessment retake cooldown active%' then
      v_err_caught := true;
    else
      raise exception 'Unexpected error during cooldown check: %', sqlerrm;
    end if;
  end;

  if not v_err_caught then
    raise exception 'Scenario 1 failed: retake did not fail closed on active cooldown';
  end if;

  -- 5. start_or_resume_assessment_session on completed child returns completed session, not a new retake
  v_retake_session := public.start_or_resume_assessment_session(v_child_1);
  if (v_retake_session->>'status') <> 'completed' or (v_retake_session->>'sessionId')::uuid <> v_session_old then
    raise exception 'Scenario 1 failed: start_or_resume did not return completed session: %', v_retake_session;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 2: Eligible Retake Lifecycle & Question Repetition Tie-Break
-- ----------------------------------------------------------------------------
do $$
declare
  v_child_1 uuid := 'c1000000-0000-0000-0000-000000000001';
  v_session_old uuid := 'd1000000-0000-0000-0000-000000000001';
  v_session_new uuid;
  v_overview jsonb;
  v_retake_res jsonb;
  v_first_item_id text;
  v_used_item_in_prev text;
  v_old_completed_at timestamptz;
  v_old_final_result jsonb;
  v_err_caught boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- Record previous completed session's state and record a response
  select completed_at, final_result into v_old_completed_at, v_old_final_result
  from public.assessment_sessions where id = v_session_old;

  -- Insert a mock response in the old session for core_vocabulary
  v_used_item_in_prev := 'voc_core_03';
  insert into public.assessment_responses (
    session_id, child_id, item_id, sequence_number, response_type, raw_answer, outcome
  ) values (
    v_session_old, v_child_1, v_used_item_in_prev, 1, 'single_choice', 'A', 'correct'
  );

  -- Fast-forward completion date to 95 days ago (> 90 days cooldown)
  update public.assessment_sessions
  set completed_at = now() - interval '95 days'
  where id = v_session_old;

  update public.child_assessment_state
  set assessed_at = now() - interval '95 days'
  where child_id = v_child_1;

  -- Verify overview now reports retakeEligible = true
  v_overview := public.get_child_assessment_overview(v_child_1);
  if (v_overview->>'retakeEligible')::boolean <> true then
    raise exception 'Scenario 2 failed: overview should be retakeEligible at 95 days: %', v_overview;
  end if;

  -- Cross-parent retake attempt denied
  perform set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);
  v_err_caught := false;
  begin
    perform public.start_assessment_retake(v_child_1);
  exception when others then
    if sqlerrm like '%not owned by user%' then
      v_err_caught := true;
    end if;
  end;
  if not v_err_caught then
    raise exception 'Scenario 2 failed: cross-parent retake was not denied';
  end if;

  -- Reset back to authorized parent
  perform set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);

  -- Start retake
  v_retake_res := public.start_assessment_retake(v_child_1);
  v_session_new := (v_retake_res->>'sessionId')::uuid;

  if v_session_new is null or v_session_new = v_session_old then
    raise exception 'Scenario 2 failed: retake did not create a new distinct session: %', v_retake_res;
  end if;

  if (v_retake_res->>'status') <> 'in_progress' or (v_retake_res->>'itemsCompleted')::integer <> 0 then
    raise exception 'Scenario 2 failed: retake initial status mismatch: %', v_retake_res;
  end if;

  -- Verify initial item in retake prefers item NOT in previous session
  v_first_item_id := v_retake_res->'currentItem'->>'id';
  if v_first_item_id = v_used_item_in_prev then
    raise exception 'Scenario 2 failed: retake chose previous session item % instead of alternative candidate', v_used_item_in_prev;
  end if;

  -- Verify previous session remains completely immutable
  if not exists (
    select 1 from public.assessment_sessions
    where id = v_session_old
      and status = 'completed'
      and final_result = v_old_final_result
  ) then
    raise exception 'Scenario 2 failed: previous completed session was mutated!';
  end if;

  -- Calling start_assessment_retake when in_progress session exists safely resumes that authoritative session
  v_retake_res := public.start_assessment_retake(v_child_1);
  if (v_retake_res->>'sessionId')::uuid <> v_session_new or (v_retake_res->>'status') <> 'in_progress' then
    raise exception 'Scenario 2 failed: retake did not resume existing in_progress session: %', v_retake_res;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 3: Complete Retake & Projection Invariants with Generation Snapshots
-- ----------------------------------------------------------------------------
do $$
declare
  v_child_1 uuid := 'c1000000-0000-0000-0000-000000000001';
  v_session_old uuid := 'd1000000-0000-0000-0000-000000000001';
  v_session_new uuid;
  v_job_id_1 uuid := 'e1000000-0000-0000-0000-000000000001';
  v_job_id_2 uuid := 'e2000000-0000-0000-0000-000000000002';
  v_context_1 jsonb;
  v_fingerprint_1 text;
  v_replay_1 jsonb;
  v_context_2 jsonb;
  v_t1 timestamptz := now() - interval '10 days';
  v_t4 timestamptz := now();
begin
  -- Find new in_progress retake session
  select id into v_session_new
  from public.assessment_sessions
  where child_id = v_child_1 and status = 'in_progress';

  -- 1. Generation Job 1 claimed at T1 (before retake was completed)
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id_1, v_child_1, '2026-09-01', '2.0.0',
    'idemp-retake-test-job-1', 'claimed',
    v_t1, 'worker-retake-test', now() + interval '30 minutes',
    v_t1 + interval '48 hours', v_t1, v_t1 + interval '24 hours'
  );

  v_context_1 := public.worker_generation_context(v_job_id_1, 'worker-retake-test');
  v_context_1 := jsonb_set(v_context_1, '{cutoffTimestamp}', to_jsonb(v_t1));
  v_fingerprint_1 := 'sha256:' || encode(extensions.digest(convert_to(v_context_1::text, 'UTF8'), 'sha256'), 'hex');

  insert into private_generation.generation_claim_snapshots (
    job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
  ) values (
    v_job_id_1, 'worker-retake-test', v_context_1, v_fingerprint_1, v_t1
  );

  -- 2. Retake session completes at T2 (now)
  update public.assessment_sessions
  set status = 'completed',
      items_completed = 18,
      completed_at = now(),
      final_result = jsonb_build_object(
        'overallNarrativeZh', '全新的重測診斷結果',
        'domainSummaries', jsonb_build_object(
          'vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high', 'summaryZh', '單字掌握穩定'),
          'reading', jsonb_build_object('result', 'secure', 'confidence', 'high', 'summaryZh', '閱讀掌握穩定')
        ),
        'skillEvaluations', jsonb_build_object(
          'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'result', 'secure', 'confidence', 'high')
        )
      )
  where id = v_session_new;

  -- Project into child_assessment_state (latest-wins)
  insert into public.child_assessment_state (
    child_id, last_session_id, status, skill_results, domain_summaries, assessed_at, projection_version, updated_at
  ) values (
    v_child_1, v_session_new, 'completed',
    jsonb_build_object('core_vocabulary', jsonb_build_object('level', 'secure', 'confidence', 'high')),
    jsonb_build_object(
      'vocabulary', jsonb_build_object('level', 'secure', 'confidence', 'high'),
      'reading', jsonb_build_object('level', 'secure', 'confidence', 'high')
    ),
    now(), 'assessment-projection-v1', now()
  )
  on conflict (child_id) do update set
    last_session_id = excluded.last_session_id,
    status = excluded.status,
    skill_results = excluded.skill_results,
    domain_summaries = excluded.domain_summaries,
    assessed_at = excluded.assessed_at,
    projection_version = excluded.projection_version,
    updated_at = excluded.updated_at;

  -- 3. Assert child_assessment_state now points to v_session_new
  if not exists (
    select 1 from public.child_assessment_state
    where child_id = v_child_1 and last_session_id = v_session_new
  ) then
    raise exception 'Scenario 3 failed: child_assessment_state was not updated to retake session';
  end if;

  -- 4. Replay Job 1 at T3: must STILL see original Assessment (developing), NOT the new retake result (secure)
  v_replay_1 := public.worker_generation_context(v_job_id_1, 'worker-retake-test');
  if (v_replay_1->'assessmentEvidence'->'domains'->'vocabulary'->>'level') <> 'developing' then
    raise exception 'Scenario 3 failed: Job 1 replay leaked new retake assessment!';
  end if;
  if (v_replay_1->'assessmentEvidence') <> (v_context_1->'assessmentEvidence') then
    raise exception 'Scenario 3 failed: Job 1 assessment capsule altered on replay';
  end if;

  -- 5. Job 2 claimed at T4 (after retake completed): receives the NEW retake assessment (secure)
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id_2, v_child_1, '2026-09-22', '2.0.0',
    'idemp-retake-test-job-2', 'claimed',
    now(), 'worker-retake-test', now() + interval '30 minutes',
    now() + interval '48 hours', now(), now() + interval '24 hours'
  );

  v_context_2 := public.worker_generation_context(v_job_id_2, 'worker-retake-test');
  if (v_context_2->'assessmentEvidence'->'domains'->'vocabulary'->>'level') <> 'secure' then
    raise exception 'Scenario 3 failed: Job 2 did not receive retake assessment: %', v_context_2->'assessmentEvidence';
  end if;

  raise notice 'PASS: all Direct Assessment retake lifecycle scenarios verified';
end;
$$;

rollback;
