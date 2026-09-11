-- ============================================================================
-- Assessment Curated RPCs Test Suite
-- Verifies get_child_assessment_overview, get_assessment_session_result,
-- and completed session protection.
-- ============================================================================

begin;

-- 1. Setup fixture parents & children
insert into auth.users (id, email)
values
  ('a1111111-1111-1111-1111-111111111111', 'curated_parent_a@example.com'),
  ('a2222222-2222-2222-2222-222222222222', 'curated_parent_b@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('a1111111-1111-1111-1111-111111111111', 'Curated Parent A'),
  ('a2222222-2222-2222-2222-222222222222', 'Curated Parent B')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Child Curated A', 7, 'grade_7', true),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Child Curated B', 7, 'grade_7', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Test 1: get_child_assessment_overview when never started
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111"}';

do $$
declare
  v_overview jsonb;
begin
  v_overview := public.get_child_assessment_overview('b1111111-1111-1111-1111-111111111111'::uuid);
  if v_overview->>'status' != 'not_started' then
    raise exception 'Expected not_started, got %', v_overview->>'status';
  end if;
  if (v_overview->>'itemsCompleted')::integer != 0 then
    raise exception 'Expected itemsCompleted 0, got %', v_overview->>'itemsCompleted';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 2: start_or_resume creates in_progress session & overview reflects it
-- ----------------------------------------------------------------------------
do $$
declare
  v_session jsonb;
  v_overview jsonb;
  v_session_id uuid;
begin
  v_session := public.start_or_resume_assessment_session('b1111111-1111-1111-1111-111111111111'::uuid);
  v_session_id := (v_session->>'sessionId')::uuid;

  if v_session->>'status' != 'in_progress' then
    raise exception 'Expected in_progress session, got %', v_session->>'status';
  end if;

  v_overview := public.get_child_assessment_overview('b1111111-1111-1111-1111-111111111111'::uuid);
  if v_overview->>'status' != 'in_progress' then
    raise exception 'Expected overview in_progress, got %', v_overview->>'status';
  end if;
  if v_overview->>'sessionId' != v_session_id::text then
    raise exception 'Expected overview sessionId match, got % vs %', v_overview->>'sessionId', v_session_id;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 3: Unauthorized parent cannot access child overview
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222"}';

do $$
declare
  v_threw boolean := false;
begin
  begin
    perform public.get_child_assessment_overview('b1111111-1111-1111-1111-111111111111'::uuid);
  exception when others then
    v_threw := true;
  end;
  if not v_threw then
    raise exception 'Expected cross-parent overview read to throw';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 4: get_assessment_session_result on in_progress session throws
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a1111111-1111-1111-1111-111111111111"}';

do $$
declare
  v_session_id uuid;
  v_threw boolean := false;
begin
  select id into v_session_id
  from public.assessment_sessions
  where child_id = 'b1111111-1111-1111-1111-111111111111' and status = 'in_progress'
  limit 1;

  begin
    perform public.get_assessment_session_result(v_session_id);
  exception when others then
    v_threw := true;
  end;

  if not v_threw then
    raise exception 'Expected get_assessment_session_result on in_progress session to throw';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 5: Complete session & verify overview returns completed
-- ----------------------------------------------------------------------------
do $$
declare
  v_session_id uuid;
  v_overview jsonb;
  v_res jsonb;
begin
  select id into v_session_id
  from public.assessment_sessions
  where child_id = 'b1111111-1111-1111-1111-111111111111' and status = 'in_progress'
  limit 1;

  update public.assessment_sessions
  set status = 'completed',
      items_completed = 18,
      completed_at = now(),
      final_result = jsonb_build_object(
        'sessionId', v_session_id,
        'childId', 'b1111111-1111-1111-1111-111111111111'::uuid,
        'completedAt', now(),
        'totalItems', 18,
        'correctCount', 14,
        'skipCount', 0,
        'overallNarrativeZh', '整體掌握穩固，閱讀與文法表現良好。',
        'domainSummaries', jsonb_build_object(
          'vocabulary', jsonb_build_object('domain', 'vocabulary', 'result', 'secure', 'confidence', 'high', 'summaryZh', '詞彙量豐富且能靈活運用'),
          'grammar', jsonb_build_object('domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'summaryZh', '句型結構與文法規則掌握良好'),
          'reading', jsonb_build_object('domain', 'reading', 'result', 'developing', 'confidence', 'medium', 'summaryZh', '需提升閱讀理解與關鍵訊息掌握度')
        ),
        'skillEvaluations', jsonb_build_object(
          'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4, 'notes', 'internal note'),
          'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 2, 'notes', 'internal note'),
          'word_form_usage', jsonb_build_object('skill', 'word_form_usage', 'domain', 'vocabulary', 'result', 'secure', 'confidence', 'low', 'estimatedDifficulty', 3, 'notes', 'internal note')
        )
      )
  where id = v_session_id;

  v_overview := public.get_child_assessment_overview('b1111111-1111-1111-1111-111111111111'::uuid);
  if v_overview->>'status' != 'completed' then
    raise exception 'Expected overview status completed, got %', v_overview->>'status';
  end if;

  -- Test 6: get_assessment_session_result returns sanitized payload
  v_res := public.get_assessment_session_result(v_session_id);
  if v_res->>'overallNarrativeZh' != '整體掌握穩固，閱讀與文法表現良好。' then
    raise exception 'Expected overallNarrativeZh, got %', v_res->>'overallNarrativeZh';
  end if;
  if v_res->'domainSummaries'->'vocabulary'->>'result' != 'secure' then
    raise exception 'Expected domainSummaries vocabulary secure, got %', v_res->'domainSummaries'->'vocabulary'->>'result';
  end if;
  if v_res->'skillEvaluations'->'core_vocabulary'->>'result' != 'secure' then
    raise exception 'Expected skillEvaluations core_vocabulary secure, got %', v_res->'skillEvaluations'->'core_vocabulary'->>'result';
  end if;

  -- Assert diagnostic secrets are stripped
  if (v_res->'skillEvaluations'->'core_vocabulary') ? 'estimatedDifficulty' then
    raise exception 'Sanitized result must NOT include estimatedDifficulty';
  end if;
  if (v_res->'skillEvaluations'->'core_vocabulary') ? 'notes' then
    raise exception 'Sanitized result must NOT include internal notes';
  end if;

  -- Test 7: get_child_latest_assessment_result matches
  v_res := public.get_child_latest_assessment_result('b1111111-1111-1111-1111-111111111111'::uuid);
  if v_res->>'overallNarrativeZh' != '整體掌握穩固，閱讀與文法表現良好。' then
    raise exception 'Latest assessment result overallNarrativeZh mismatch';
  end if;

  -- Test 8: start_or_resume does not recreate session when completed
  v_res := public.start_or_resume_assessment_session('b1111111-1111-1111-1111-111111111111'::uuid);
  if v_res->>'status' != 'completed' then
    raise exception 'start_or_resume must return completed when already completed, got %', v_res->>'status';
  end if;
  if v_res->>'sessionId' != v_session_id::text then
    raise exception 'start_or_resume must return existing completed sessionId';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 9: Unauthorized parent cannot access session result
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "a2222222-2222-2222-2222-222222222222"}';

do $$
declare
  v_session_id uuid;
  v_threw boolean := false;
begin
  select id into v_session_id
  from public.assessment_sessions
  where child_id = 'b1111111-1111-1111-1111-111111111111'
  limit 1;

  begin
    perform public.get_assessment_session_result(v_session_id);
  exception when others then
    v_threw := true;
  end;

  if not v_threw then
    raise exception 'Expected Parent B reading Child A session result to throw';
  end if;

  v_threw := false;
  begin
    perform public.get_child_latest_assessment_result('b1111111-1111-1111-1111-111111111111'::uuid);
  exception when others then
    v_threw := true;
  end;

  if not v_threw then
    raise exception 'Expected Parent B reading Child A latest assessment result to throw';
  end if;
end $$;

do $$
begin
  raise notice 'PASS: all curated assessment overview, result sanitization, and protection tests passed';
end $$;

rollback;
