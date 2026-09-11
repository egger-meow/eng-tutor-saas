-- ============================================================================
-- Direct Assessment Phase 6 Test Suite: Generation Context & Snapshot Boundary
-- Verifies:
-- 1. Scenario 1: Assessment exists before claim -> assessment capsule included
-- 2. Scenario 2: No assessment exists before claim -> capsule absent
-- 3. Scenario 3: Assessment completed after claim -> current claim/retry context unchanged
-- 4. Scenario 4: Next generation job claimed after assessment completion -> new assessment capsule is present
-- 5. Scenario 5: Assessment projection changes -> newly claimed job receives newer projection
-- 6. Security boundaries: worker_generation_context revoked from anon/authenticated
-- ============================================================================

begin;

-- 1. Fixture setup
insert into auth.users (id, email)
values
  ('a1000000-0000-0000-0000-000000000001', 'gen_test_parent@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('a1000000-0000-0000-0000-000000000001', 'Generation Test Parent')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Gen Child 1', 7, 'grade_7', true),
  ('c2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Gen Child 2 (No Assessment)', 7, 'grade_7', true)
on conflict (id) do nothing;

-- Ensure child profiles and enrollment exist
insert into public.child_profiles (child_id, baseline_level, reading_level, vocabulary_level, grammar_level, weekly_minutes)
values
  ('c1000000-0000-0000-0000-000000000001', 'intermediate', 'intermediate', 'intermediate', 'intermediate', 60),
  ('c2000000-0000-0000-0000-000000000002', 'intermediate', 'intermediate', 'intermediate', 'intermediate', 60)
on conflict (child_id) do nothing;

-- ----------------------------------------------------------------------------
-- Scenario 2: No assessment exists before claim -> capsule absent
-- ----------------------------------------------------------------------------
do $$
declare
  v_job_id uuid := 'b2000000-0000-0000-0000-000000000002';
  v_child_id uuid := 'c2000000-0000-0000-0000-000000000002';
  v_context jsonb;
begin
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id, v_child_id, '2026-09-15', '2.0.0',
    'idemp-gen-scenario-2', 'claimed',
    now(), 'worker-scenario-test', now() + interval '30 minutes',
    now() + interval '48 hours', now(), now() + interval '24 hours'
  );

  v_context := public.worker_generation_context(v_job_id, 'worker-scenario-test');

  if v_context ? 'assessmentEvidence' then
    raise exception 'Scenario 2 failed: assessmentEvidence should be absent when child has no assessment';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 1: Assessment exists before claim -> assessment capsule included
-- ----------------------------------------------------------------------------
do $$
declare
  v_job_id uuid := 'b1000000-0000-0000-0000-000000000001';
  v_child_id uuid := 'c1000000-0000-0000-0000-000000000001';
  v_context jsonb;
  v_evidence jsonb;
  v_fingerprint text;
  v_session_id uuid := 'e1000000-0000-0000-0000-000000000001';
begin
  -- Setup completed assessment session 5 days ago
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    v_session_id, v_child_id, 'completed', 18, 18, now() - interval '5 days', '{}'::jsonb
  );

  insert into public.child_assessment_state (
    child_id, last_session_id, status, skill_results, domain_summaries,
    assessed_at, projection_version, created_at, updated_at
  ) values (
    v_child_id, v_session_id, 'completed',
    jsonb_build_object(
      'inference', jsonb_build_object('level', 'needs_support', 'confidence', 'high'),
      'main_idea', jsonb_build_object('level', 'developing', 'confidence', 'medium'),
      'core_vocabulary', jsonb_build_object('level', 'secure', 'confidence', 'high')
    ),
    jsonb_build_object(
      'vocabulary', jsonb_build_object('level', 'secure', 'confidence', 'high'),
      'grammar', jsonb_build_object('level', 'developing', 'confidence', 'medium'),
      'reading', jsonb_build_object('level', 'needs_support', 'confidence', 'high')
    ),
    now() - interval '5 days',
    'assessment-projection-v1',
    now() - interval '5 days',
    now() - interval '5 days'
  );

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id, v_child_id, '2026-09-15', '2.0.0',
    'idemp-gen-scenario-1', 'claimed',
    now(), 'worker-scenario-test', now() + interval '30 minutes',
    now() + interval '48 hours', now(), now() + interval '24 hours'
  );

  v_context := public.worker_generation_context(v_job_id, 'worker-scenario-test');

  if not (v_context ? 'assessmentEvidence') then
    raise exception 'Scenario 1 failed: assessmentEvidence capsule must be present';
  end if;

  v_evidence := v_context->'assessmentEvidence';
  if v_evidence->>'projectionVersion' <> 'assessment-projection-v1' then
    raise exception 'Scenario 1 failed: unexpected projectionVersion %', v_evidence->>'projectionVersion';
  end if;

  if v_evidence->>'freshness' <> 'fresh' then
    raise exception 'Scenario 1 failed: freshness must be fresh for 5-day old assessment, got %', v_evidence->>'freshness';
  end if;

  if (v_evidence->'skills'->'inference'->>'level') <> 'needs_support' then
    raise exception 'Scenario 1 failed: inference skill missing or wrong level: %', v_evidence->'skills';
  end if;

  if (v_evidence->'domains'->'reading'->>'level') <> 'needs_support' then
    raise exception 'Scenario 1 failed: reading domain missing or wrong level: %', v_evidence->'domains';
  end if;

  -- Store snapshot as done by job claiming
  v_fingerprint := 'sha256:' || encode(extensions.digest(convert_to(v_context::text, 'UTF8'), 'sha256'), 'hex');
  insert into private_generation.generation_claim_snapshots (
    job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
  ) values (
    v_job_id, 'worker-scenario-test', v_context, v_fingerprint, now()
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 3: Assessment completed after claim -> current claim context unchanged
-- Scenario 4: Next generation job claimed after assessment -> new capsule present
-- ----------------------------------------------------------------------------
do $$
declare
  v_job_id_1 uuid := 'b3000000-0000-0000-0000-000000000003';
  v_job_id_2 uuid := 'b4000000-0000-0000-0000-000000000004';
  v_child_id uuid := 'c3000000-0000-0000-0000-000000000003';
  v_context_1 jsonb;
  v_context_1_replay jsonb;
  v_context_2 jsonb;
  v_fingerprint_1 text;
  v_claim_time timestamptz := now() - interval '2 hours';
begin
  insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
  values (v_child_id, 'a1000000-0000-0000-0000-000000000001', 'Gen Child 3', 7, 'grade_7', true);

  -- Step 1: Claim Job 1 at T1 (2 hours ago) when NO assessment exists
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id_1, v_child_id, '2026-09-15', '2.0.0',
    'idemp-gen-scenario-3-job1', 'claimed',
    v_claim_time, 'worker-scenario-test', now() + interval '30 minutes',
    v_claim_time + interval '48 hours', v_claim_time, v_claim_time + interval '24 hours'
  );

  v_context_1 := public.worker_generation_context(v_job_id_1, 'worker-scenario-test');
  if v_context_1 ? 'assessmentEvidence' then
    raise exception 'Scenario 3 setup failed: assessmentEvidence must be absent at claim time';
  end if;

  -- Freeze cutoff timestamp to claim time in snapshot
  v_context_1 := jsonb_set(v_context_1, '{cutoffTimestamp}', to_jsonb(v_claim_time));
  v_fingerprint_1 := 'sha256:' || encode(extensions.digest(convert_to(v_context_1::text, 'UTF8'), 'sha256'), 'hex');
  insert into private_generation.generation_claim_snapshots (
    job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
  ) values (
    v_job_id_1, 'worker-scenario-test', v_context_1, v_fingerprint_1, v_claim_time
  );

  -- Step 2: Assessment completed at T2 (1 hour ago, AFTER Job 1 was claimed!)
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    'e3000000-0000-0000-0000-000000000003', v_child_id, 'completed', 18, 18, now() - interval '1 hour', '{}'::jsonb
  );

  insert into public.child_assessment_state (
    child_id, last_session_id, status, skill_results, domain_summaries,
    assessed_at, projection_version, created_at, updated_at
  ) values (
    v_child_id, 'e3000000-0000-0000-0000-000000000003', 'completed',
    jsonb_build_object('inference', jsonb_build_object('level', 'needs_support', 'confidence', 'high')),
    jsonb_build_object('reading', jsonb_build_object('level', 'needs_support', 'confidence', 'high'), 'grammar', jsonb_build_object('level', 'developing', 'confidence', 'medium'), 'vocabulary', jsonb_build_object('level', 'developing', 'confidence', 'medium')),
    now() - interval '1 hour',
    'assessment-projection-v1',
    now() - interval '1 hour',
    now() - interval '1 hour'
  );

  -- Step 3: Replay / re-read Job 1 context (retry or pipeline context load)
  v_context_1_replay := public.worker_generation_context(v_job_id_1, 'worker-scenario-test');

  -- Scenario 3 Assertion: Context 1 MUST NOT see the assessment completed after claim!
  if v_context_1_replay ? 'assessmentEvidence' then
    raise exception 'Scenario 3 failed: post-claim assessment leaked into claimed job context!';
  end if;

  if (v_context_1_replay->>'cutoffTimestamp') <> (v_context_1->>'cutoffTimestamp') then
    raise exception 'Scenario 3 failed: cutoffTimestamp changed on replay: expected %, got %',
      v_context_1->>'cutoffTimestamp', v_context_1_replay->>'cutoffTimestamp';
  end if;

  -- Step 4: Claim Job 2 at T3 (now, AFTER assessment was completed!)
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id_2, v_child_id, '2026-09-22', '2.0.0',
    'idemp-gen-scenario-4-job2', 'claimed',
    now(), 'worker-scenario-test', now() + interval '30 minutes',
    now() + interval '48 hours', now(), now() + interval '24 hours'
  );

  v_context_2 := public.worker_generation_context(v_job_id_2, 'worker-scenario-test');

  -- Scenario 4 Assertion: Newly claimed job observes the completed assessment!
  if not (v_context_2 ? 'assessmentEvidence') then
    raise exception 'Scenario 4 failed: newly claimed job must observe the completed assessment';
  end if;
  if (v_context_2->'assessmentEvidence'->'skills'->'inference'->>'level') <> 'needs_support' then
    raise exception 'Scenario 4 failed: newly claimed job missing expected skill evaluation: %', v_context_2->'assessmentEvidence';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 5: Assessment projection changes -> newly claimed job receives newer projection
-- ----------------------------------------------------------------------------
do $$
declare
  v_job_id_3 uuid := 'b5000000-0000-0000-0000-000000000005';
  v_child_id uuid := 'c3000000-0000-0000-0000-000000000003';
  v_session_id_2 uuid := 'e5000000-0000-0000-0000-000000000005';
  v_context_3 jsonb;
begin
  -- Setup session 2
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    v_session_id_2, v_child_id, 'completed', 18, 18, now() - interval '5 minutes', '{}'::jsonb
  );

  -- Update assessment state to new projection with reading secure
  update public.child_assessment_state
  set last_session_id = v_session_id_2,
      skill_results = jsonb_build_object('inference', jsonb_build_object('level', 'secure', 'confidence', 'high')),
      domain_summaries = jsonb_build_object('reading', jsonb_build_object('level', 'secure', 'confidence', 'high'), 'grammar', jsonb_build_object('level', 'secure', 'confidence', 'high'), 'vocabulary', jsonb_build_object('level', 'secure', 'confidence', 'high')),
      assessed_at = now() - interval '5 minutes',
      updated_at = now()
  where child_id = v_child_id;

  -- Claim Job 3
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    v_job_id_3, v_child_id, '2026-09-29', '2.0.0',
    'idemp-gen-scenario-5-job3', 'claimed',
    now(), 'worker-scenario-test', now() + interval '30 minutes',
    now() + interval '48 hours', now(), now() + interval '24 hours'
  );

  v_context_3 := public.worker_generation_context(v_job_id_3, 'worker-scenario-test');

  if not (v_context_3 ? 'assessmentEvidence') then
    raise exception 'Scenario 5 failed: assessmentEvidence missing in Job 3';
  end if;

  if (v_context_3->'assessmentEvidence'->'domains'->'reading'->>'level') <> 'secure' then
    raise exception 'Scenario 5 failed: Job 3 did not receive updated assessment projection: %', v_context_3->'assessmentEvidence';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Security: Anonymous & Authenticated clients must NOT execute worker_generation_context
-- ----------------------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon', 'public.worker_generation_context(uuid, text)', 'EXECUTE') then
    raise exception 'Security violation: anon must NOT have execute on worker_generation_context';
  end if;

  if has_function_privilege('authenticated', 'public.worker_generation_context(uuid, text)', 'EXECUTE') then
    raise exception 'Security violation: authenticated must NOT have execute on worker_generation_context';
  end if;

  raise notice 'PASS: all Direct Assessment generation context snapshot boundary scenarios verified';
end;
$$;

rollback;
