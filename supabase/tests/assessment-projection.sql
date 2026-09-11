-- ============================================================================
-- Assessment Learner State Projection Test Suite (Phase 5)
-- Verifies:
-- 1. Atomic completion and compact projection in child_assessment_state
-- 2. Compact schema enforcement (only level + confidence, no metadata leaks)
-- 3. Idempotent replay of same completed session
-- 4. Latest-wins semantics (newer session updates, older cannot overwrite)
-- 5. Fail-closed validation on malformed final_result
-- 6. Atomic rollback when projection fails
-- 7. Backfill scenarios (single, multiple, never-started)
-- 8. Security boundaries (no authenticated direct table or helper access)
-- ============================================================================

begin;

-- Setup test fixtures
insert into auth.users (id, email)
values
  ('c1111111-1111-1111-1111-111111111111', 'proj_parent_a@example.com'),
  ('c2222222-2222-2222-2222-222222222222', 'proj_parent_b@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('c1111111-1111-1111-1111-111111111111', 'Projection Parent A'),
  ('c2222222-2222-2222-2222-222222222222', 'Projection Parent B')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Child Projection A', 7, 'grade_7', true),
  ('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Child Projection B', 7, 'grade_7', true),
  ('d3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Child Never Started', 7, 'grade_7', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Test 1: Helper projects valid completed session into compact learner state
-- ----------------------------------------------------------------------------
do $$
declare
  v_session_id uuid := 'e1111111-1111-1111-1111-111111111111';
  v_child_id uuid := 'd1111111-1111-1111-1111-111111111111';
  v_completed_time timestamptz := '2026-09-12 02:00:00+00';
  v_final_res jsonb;
  v_state public.child_assessment_state%rowtype;
  v_skill record;
  v_domain record;
  v_ok boolean;
begin
  v_final_res := jsonb_build_object(
    'sessionId', v_session_id,
    'childId', v_child_id,
    'completedAt', v_completed_time,
    'totalItems', 18,
    'correctCount', 12,
    'skipCount', 2,
    'overallNarrativeZh', '這是一段不應進入 compact state 的摘要敘述。',
    'skillEvaluations', jsonb_build_object(
      'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4, 'itemsAttempted', 3, 'itemsCorrect', 3, 'notes', '內部評註'),
      'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 3, 'itemsAttempted', 2, 'itemsCorrect', 1),
      'word_form_usage', jsonb_build_object('skill', 'word_form_usage', 'domain', 'vocabulary', 'result', 'needs_support', 'confidence', 'low', 'estimatedDifficulty', 1, 'itemsAttempted', 1, 'itemsCorrect', 0),
      'basic_sentence_structure', jsonb_build_object('skill', 'basic_sentence_structure', 'domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4, 'itemsAttempted', 2, 'itemsCorrect', 2),
      'verb_tense_agreement', jsonb_build_object('skill', 'verb_tense_agreement', 'domain', 'grammar', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 3, 'itemsAttempted', 2, 'itemsCorrect', 1),
      'questions_and_negatives', jsonb_build_object('skill', 'questions_and_negatives', 'domain', 'grammar', 'result', 'secure', 'confidence', 'medium', 'estimatedDifficulty', 3, 'itemsAttempted', 1, 'itemsCorrect', 1),
      'modifiers_and_relations', jsonb_build_object('skill', 'modifiers_and_relations', 'domain', 'grammar', 'result', 'needs_support', 'confidence', 'low', 'estimatedDifficulty', 1, 'itemsAttempted', 1, 'itemsCorrect', 0),
      'complex_structures', jsonb_build_object('skill', 'complex_structures', 'domain', 'grammar', 'result', 'developing', 'confidence', 'low', 'estimatedDifficulty', 2, 'itemsAttempted', 1, 'itemsCorrect', 0),
      'explicit_information', jsonb_build_object('skill', 'explicit_information', 'domain', 'reading', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4, 'itemsAttempted', 3, 'itemsCorrect', 3),
      'main_idea', jsonb_build_object('skill', 'main_idea', 'domain', 'reading', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 3, 'itemsAttempted', 2, 'itemsCorrect', 1),
      'vocabulary_in_context', jsonb_build_object('skill', 'vocabulary_in_context', 'domain', 'reading', 'result', 'secure', 'confidence', 'medium', 'estimatedDifficulty', 3, 'itemsAttempted', 1, 'itemsCorrect', 1),
      'inference', jsonb_build_object('skill', 'inference', 'domain', 'reading', 'result', 'needs_support', 'confidence', 'medium', 'estimatedDifficulty', 2, 'itemsAttempted', 2, 'itemsCorrect', 0),
      'information_integration', jsonb_build_object('skill', 'information_integration', 'domain', 'reading', 'result', 'developing', 'confidence', 'low', 'estimatedDifficulty', 2, 'itemsAttempted', 1, 'itemsCorrect', 0)
    ),
    'domainSummaries', jsonb_build_object(
      'vocabulary', jsonb_build_object('domain', 'vocabulary', 'result', 'developing', 'confidence', 'medium', 'summaryZh', '字彙評述'),
      'grammar', jsonb_build_object('domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'summaryZh', '文法評述'),
      'reading', jsonb_build_object('domain', 'reading', 'result', 'needs_support', 'confidence', 'medium', 'summaryZh', '閱讀評述')
    )
  );

  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    v_session_id, v_child_id, 'completed', 18, 18, v_completed_time, v_final_res
  );

  v_ok := public.project_assessment_session_to_learner_state(v_session_id);
  if not v_ok then
    raise exception 'Expected projection helper to return true for first projection';
  end if;

  select * into v_state
  from public.child_assessment_state
  where child_id = v_child_id;

  if v_state.child_id is null then
    raise exception 'child_assessment_state row was not created';
  end if;

  if v_state.last_session_id != v_session_id then
    raise exception 'Expected last_session_id %, got %', v_session_id, v_state.last_session_id;
  end if;

  if v_state.status != 'completed' then
    raise exception 'Expected status completed, got %', v_state.status;
  end if;

  if v_state.projection_version != 'assessment-projection-v1' then
    raise exception 'Expected projection_version assessment-projection-v1, got %', v_state.projection_version;
  end if;

  if v_state.assessed_at != v_completed_time then
    raise exception 'Expected assessed_at %, got %', v_completed_time, v_state.assessed_at;
  end if;

  -- Verify skill_results contains strictly level and confidence for each skill
  for v_skill in select * from jsonb_each(v_state.skill_results) loop
    if (select count(*) from jsonb_object_keys(v_skill.value)) != 2 then
      raise exception 'Skill % has keys other than level and confidence: %', v_skill.key, v_skill.value;
    end if;
    if v_skill.value->>'level' is null or v_skill.value->>'confidence' is null then
      raise exception 'Skill % missing level or confidence: %', v_skill.key, v_skill.value;
    end if;
    if v_skill.value ? 'estimatedDifficulty' or v_skill.value ? 'notes' or v_skill.value ? 'itemsAttempted' or v_skill.value ? 'itemsCorrect' or v_skill.value ? 'skill' or v_skill.value ? 'domain' then
      raise exception 'Skill % contains unauthorized diagnostic metadata: %', v_skill.key, v_skill.value;
    end if;
  end loop;

  -- Verify domain_summaries contains strictly level and confidence
  for v_domain in select * from jsonb_each(v_state.domain_summaries) loop
    if (select count(*) from jsonb_object_keys(v_domain.value)) != 2 then
      raise exception 'Domain % has keys other than level and confidence: %', v_domain.key, v_domain.value;
    end if;
    if v_domain.value->>'level' is null or v_domain.value->>'confidence' is null then
      raise exception 'Domain % missing level or confidence: %', v_domain.key, v_domain.value;
    end if;
    if v_domain.value ? 'summaryZh' or v_domain.value ? 'domain' then
      raise exception 'Domain % contains unauthorized summaryZh or domain key: %', v_domain.key, v_domain.value;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Test 2: Idempotent replay of the exact same session
-- ----------------------------------------------------------------------------
do $$
declare
  v_session_id uuid := 'e1111111-1111-1111-1111-111111111111';
  v_child_id uuid := 'd1111111-1111-1111-1111-111111111111';
  v_ok boolean;
  v_count integer;
begin
  v_ok := public.project_assessment_session_to_learner_state(v_session_id);
  if not v_ok then
    raise exception 'Replaying same session projection must return true';
  end if;

  select count(*) into v_count
  from public.child_assessment_state
  where child_id = v_child_id;

  if v_count != 1 then
    raise exception 'Duplicate child_assessment_state rows created: %', v_count;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 3: Latest-wins semantics
-- Newer session replaces older projection; older session cannot overwrite newer
-- ----------------------------------------------------------------------------
do $$
declare
  v_older_id uuid := 'e1111111-1111-1111-1111-111111111111';
  v_newer_id uuid := 'e2222222-2222-2222-2222-222222222222';
  v_child_id uuid := 'd1111111-1111-1111-1111-111111111111';
  v_newer_time timestamptz := '2026-09-12 03:00:00+00';
  v_final_res jsonb;
  v_state public.child_assessment_state%rowtype;
  v_ok boolean;
begin
  -- Create newer session with modified skill results
  v_final_res := jsonb_build_object(
    'sessionId', v_newer_id,
    'childId', v_child_id,
    'completedAt', v_newer_time,
    'totalItems', 18,
    'correctCount', 16,
    'skipCount', 0,
    'overallNarrativeZh', '進步顯著。',
    'skillEvaluations', jsonb_build_object(
      'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 5),
      'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 5),
      'word_form_usage', jsonb_build_object('skill', 'word_form_usage', 'domain', 'vocabulary', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 3),
      'basic_sentence_structure', jsonb_build_object('skill', 'basic_sentence_structure', 'domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 5),
      'verb_tense_agreement', jsonb_build_object('skill', 'verb_tense_agreement', 'domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4),
      'questions_and_negatives', jsonb_build_object('skill', 'questions_and_negatives', 'domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4),
      'modifiers_and_relations', jsonb_build_object('skill', 'modifiers_and_relations', 'domain', 'grammar', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 3),
      'complex_structures', jsonb_build_object('skill', 'complex_structures', 'domain', 'grammar', 'result', 'secure', 'confidence', 'medium', 'estimatedDifficulty', 4),
      'explicit_information', jsonb_build_object('skill', 'explicit_information', 'domain', 'reading', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 5),
      'main_idea', jsonb_build_object('skill', 'main_idea', 'domain', 'reading', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 5),
      'vocabulary_in_context', jsonb_build_object('skill', 'vocabulary_in_context', 'domain', 'reading', 'result', 'secure', 'confidence', 'high', 'estimatedDifficulty', 4),
      'inference', jsonb_build_object('skill', 'inference', 'domain', 'reading', 'result', 'developing', 'confidence', 'medium', 'estimatedDifficulty', 3),
      'information_integration', jsonb_build_object('skill', 'information_integration', 'domain', 'reading', 'result', 'secure', 'confidence', 'medium', 'estimatedDifficulty', 4)
    ),
    'domainSummaries', jsonb_build_object(
      'vocabulary', jsonb_build_object('domain', 'vocabulary', 'result', 'secure', 'confidence', 'high', 'summaryZh', '精熟'),
      'grammar', jsonb_build_object('domain', 'grammar', 'result', 'secure', 'confidence', 'high', 'summaryZh', '精熟'),
      'reading', jsonb_build_object('domain', 'reading', 'result', 'secure', 'confidence', 'medium', 'summaryZh', '精熟')
    )
  );

  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    v_newer_id, v_child_id, 'completed', 18, 18, v_newer_time, v_final_res
  );

  -- Project newer session -> should update
  v_ok := public.project_assessment_session_to_learner_state(v_newer_id);
  if not v_ok then
    raise exception 'Projecting newer session must succeed';
  end if;

  select * into v_state
  from public.child_assessment_state
  where child_id = v_child_id;

  if v_state.last_session_id != v_newer_id then
    raise exception 'Expected state to be updated to newer session %, got %', v_newer_id, v_state.last_session_id;
  end if;
  if v_state.skill_results->'contextual_meaning'->>'level' != 'secure' then
    raise exception 'Expected contextual_meaning level secure in newer state';
  end if;

  -- Attempt to project older session again -> must be rejected (returns false) and NOT overwrite
  v_ok := public.project_assessment_session_to_learner_state(v_older_id);
  if v_ok then
    raise exception 'Projecting older historical session over newer projection must return false';
  end if;

  select * into v_state
  from public.child_assessment_state
  where child_id = v_child_id;

  if v_state.last_session_id != v_newer_id then
    raise exception 'Older session overwrote newer session state!';
  end if;
  if v_state.assessed_at != v_newer_time then
    raise exception 'assessed_at was reverted by older session!';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 4: Fail-closed on malformed final_result
-- ----------------------------------------------------------------------------
do $$
declare
  v_bad_session_id uuid := 'e3333333-3333-3333-3333-333333333333';
  v_child_id uuid := 'd2222222-2222-2222-2222-222222222222';
  v_caught boolean := false;
begin
  -- Unknown skill key
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    v_bad_session_id, v_child_id, 'completed', 18, 18, now(),
    jsonb_build_object(
      'sessionId', v_bad_session_id,
      'childId', v_child_id,
      'completedAt', now(),
      'skillEvaluations', jsonb_build_object('unauthorized_skill', jsonb_build_object('result', 'secure', 'confidence', 'high')),
      'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high'))
    )
  );

  begin
    perform public.project_assessment_session_to_learner_state(v_bad_session_id);
  exception when others then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'Failed to reject unknown skill key in final_result';
  end if;

  -- Mismatched childId
  v_caught := false;
  update public.assessment_sessions
  set final_result = jsonb_build_object(
    'sessionId', v_bad_session_id,
    'childId', '99999999-9999-9999-9999-999999999999',
    'completedAt', now(),
    'skillEvaluations', jsonb_build_object('core_vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high')),
    'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high'))
  )
  where id = v_bad_session_id;

  begin
    perform public.project_assessment_session_to_learner_state(v_bad_session_id);
  exception when others then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'Failed to reject childId mismatch';
  end if;

  -- Invalid level value
  v_caught := false;
  update public.assessment_sessions
  set final_result = jsonb_build_object(
    'sessionId', v_bad_session_id,
    'childId', v_child_id,
    'completedAt', now(),
    'skillEvaluations', jsonb_build_object('core_vocabulary', jsonb_build_object('result', 'flawless', 'confidence', 'high')),
    'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high'))
  )
  where id = v_bad_session_id;

  begin
    perform public.project_assessment_session_to_learner_state(v_bad_session_id);
  exception when others then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'Failed to reject invalid skill result level string';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 5: Child never completed receives no row
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.child_assessment_state
    where child_id = 'd3333333-3333-3333-3333-333333333333'
  ) then
    raise exception 'Never-started child should not have a child_assessment_state row';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 6: Atomic completion & projection via submit_assessment_response
-- ----------------------------------------------------------------------------
insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('d4444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 'Child Auto Project', 7, 'grade_7', true)
on conflict (id) do nothing;

do $$
declare
  v_session jsonb;
  v_session_id uuid;
  v_submit_res jsonb;
  v_first_item_id text;
  v_state public.child_assessment_state%rowtype;
begin
  -- Set parent A context
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

  v_session := public.start_or_resume_assessment_session('d4444444-4444-4444-4444-444444444444'::uuid);
  v_session_id := (v_session->>'sessionId')::uuid;
  v_first_item_id := v_session->'currentItem'->>'id';

  -- Switch back to superuser to set items_completed = 17, target_item_count = 18, and clear broad_probe_remaining_skills so next answer triggers completion
  reset role;
  update public.assessment_sessions
  set items_completed = 17,
      target_item_count = 18,
      provisional_state = jsonb_set(provisional_state, '{broad_probe_remaining_skills}', '[]'::jsonb)
  where id = v_session_id;



  -- Switch back to parent A to submit
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

  v_submit_res := public.submit_assessment_response(v_session_id, v_first_item_id, 'A', false, 1200);

  if v_submit_res->>'status' != 'completed' then
    raise exception 'Expected status completed on reaching target_item_count, got %', v_submit_res->>'status';
  end if;

  -- Switch back to inspect child_assessment_state
  reset role;
  select * into v_state
  from public.child_assessment_state
  where child_id = 'd4444444-4444-4444-4444-444444444444'::uuid;

  if v_state.child_id is null then
    raise exception 'submit_assessment_response completion did not atomically create child_assessment_state';
  end if;

  if v_state.last_session_id != v_session_id then
    raise exception 'child_assessment_state last_session_id mismatch';
  end if;

  if v_state.projection_version != 'assessment-projection-v1' then
    raise exception 'child_assessment_state projection_version mismatch: %', v_state.projection_version;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 7: Security boundary check
-- Authenticated client cannot directly SELECT, INSERT, UPDATE, DELETE child_assessment_state
-- Authenticated client cannot execute project_assessment_session_to_learner_state
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

do $$
declare
  v_caught boolean := false;
begin
  begin
    perform * from public.child_assessment_state;
  exception when insufficient_privilege then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'Authenticated user should not be able to SELECT child_assessment_state directly';
  end if;
end $$;

do $$
declare
  v_caught boolean := false;
begin
  begin
    insert into public.child_assessment_state (child_id, last_session_id, status, skill_results, domain_summaries)
    values ('d1111111-1111-1111-1111-111111111111', null, 'completed', '{}', '{}');
  exception when insufficient_privilege then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'Authenticated user should not be able to INSERT child_assessment_state directly';
  end if;
end $$;

do $$
declare
  v_caught boolean := false;
begin
  begin
    perform public.project_assessment_session_to_learner_state('e1111111-1111-1111-1111-111111111111'::uuid);
  exception when insufficient_privilege then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'Authenticated user should not be able to execute project_assessment_session_to_learner_state';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 8: Atomic rollback when projection fails during submit_assessment_response
-- If projection fails, the session must NOT remain durably completed
-- ----------------------------------------------------------------------------
insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('d5555555-5555-4555-8555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'Child Rollback Test', 7, 'grade_7', true)
on conflict (id) do nothing;

do $$
declare
  v_session jsonb;
  v_session_id uuid;
  v_first_item_id text;
  v_caught boolean := false;
  v_sess public.assessment_sessions%rowtype;
  v_state public.child_assessment_state%rowtype;
begin
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

  v_session := public.start_or_resume_assessment_session('d5555555-5555-4555-8555-555555555555'::uuid);
  v_session_id := (v_session->>'sessionId')::uuid;
  v_first_item_id := v_session->'currentItem'->>'id';

  -- Create a temporary trigger on child_assessment_state to simulate failure during projection
  reset role;
  create or replace function public._test_fail_projection()
  returns trigger language plpgsql as $trig$
  begin
    if new.child_id = 'd5555555-5555-4555-8555-555555555555'::uuid then
      raise exception 'Simulated storage failure on child_assessment_state';
    end if;
    return new;
  end;
  $trig$;

  create trigger _test_fail_projection_trigger
    before insert on public.child_assessment_state
    for each row execute function public._test_fail_projection();

  update public.assessment_sessions
  set items_completed = 17,
      target_item_count = 18,
      provisional_state = jsonb_set(provisional_state, '{broad_probe_remaining_skills}', '[]'::jsonb)
  where id = v_session_id;

  -- Switch back to parent A to submit
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

  begin
    perform public.submit_assessment_response(v_session_id, v_first_item_id, 'A', false, 1000);
  exception when others then
    v_caught := true;
  end;

  -- Drop temporary test trigger
  reset role;
  drop trigger if exists _test_fail_projection_trigger on public.child_assessment_state;
  drop function if exists public._test_fail_projection();


  if not v_caught then
    raise exception 'submit_assessment_response should have raised exception when projection failed';
  end if;

  -- Verify atomic rollback: assessment_sessions must NOT be left completed!
  reset role;
  select * into v_sess
  from public.assessment_sessions
  where id = v_session_id;

  if v_sess.status = 'completed' then
    raise exception 'Session was left completed after projection failure! Transaction atomicity violated';
  end if;

  select * into v_state
  from public.child_assessment_state
  where child_id = 'd5555555-5555-4555-8555-555555555555'::uuid;

  if v_state.child_id is not null then
    raise exception 'child_assessment_state row exists despite projection failure!';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 9: Backfill test fixtures & deterministic resolution
-- ----------------------------------------------------------------------------
insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('d6666666-6666-4666-8666-666666666666', 'c1111111-1111-1111-1111-111111111111', 'Child Backfill Single', 7, 'grade_7', true),
  ('d7777777-7777-4777-8777-777777777777', 'c1111111-1111-1111-1111-111111111111', 'Child Backfill Multi', 7, 'grade_7', true)
on conflict (id) do nothing;

do $$
declare
  v_s_single uuid := 'f1111111-1111-1111-1111-111111111111';
  v_s_multi_1 uuid := 'f2222222-2222-2222-2222-222222222222';
  v_s_multi_2 uuid := 'f3333333-3333-3333-3333-333333333333';
  v_state public.child_assessment_state%rowtype;
  v_rec record;
begin
  -- Child 6: single completed session
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values (
    v_s_single, 'd6666666-6666-4666-8666-666666666666'::uuid, 'completed', 18, 18, '2026-09-10 12:00:00+00',
    jsonb_build_object(
      'sessionId', v_s_single,
      'childId', 'd6666666-6666-4666-8666-666666666666',
      'completedAt', '2026-09-10 12:00:00+00',
      'skillEvaluations', jsonb_build_object('core_vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high')),
      'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high'))
    )
  );

  -- Child 7: multiple completed sessions (multi_1 older, multi_2 newer)
  insert into public.assessment_sessions (
    id, child_id, status, items_completed, target_item_count, completed_at, final_result
  ) values
    (
      v_s_multi_1, 'd7777777-7777-4777-8777-777777777777'::uuid, 'completed', 18, 18, '2026-09-08 12:00:00+00',
      jsonb_build_object(
        'sessionId', v_s_multi_1,
        'childId', 'd7777777-7777-4777-8777-777777777777',
        'completedAt', '2026-09-08 12:00:00+00',
        'skillEvaluations', jsonb_build_object('core_vocabulary', jsonb_build_object('result', 'needs_support', 'confidence', 'low')),
        'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'needs_support', 'confidence', 'low'))
      )
    ),
    (
      v_s_multi_2, 'd7777777-7777-4777-8777-777777777777'::uuid, 'completed', 18, 18, '2026-09-11 12:00:00+00',
      jsonb_build_object(
        'sessionId', v_s_multi_2,
        'childId', 'd7777777-7777-4777-8777-777777777777',
        'completedAt', '2026-09-11 12:00:00+00',
        'skillEvaluations', jsonb_build_object('core_vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high')),
        'domainSummaries', jsonb_build_object('vocabulary', jsonb_build_object('result', 'secure', 'confidence', 'high'))
      )
    );

  -- Run backfill logic exactly as in migration
  for v_rec in (
    select distinct on (child_id) id, child_id, completed_at
    from public.assessment_sessions
    where status = 'completed' and final_result is not null
      and child_id in ('d6666666-6666-4666-8666-666666666666'::uuid, 'd7777777-7777-4777-8777-777777777777'::uuid)
    order by child_id, completed_at desc nulls last, created_at desc
  ) loop
    perform public.project_assessment_session_to_learner_state(v_rec.id);
  end loop;

  -- Verify Child 6
  select * into v_state
  from public.child_assessment_state
  where child_id = 'd6666666-6666-4666-8666-666666666666'::uuid;

  if v_state.last_session_id != v_s_single or v_state.assessed_at != '2026-09-10 12:00:00+00' then
    raise exception 'Child 6 backfill state mismatch';
  end if;

  -- Verify Child 7 has newest session
  select * into v_state
  from public.child_assessment_state
  where child_id = 'd7777777-7777-4777-8777-777777777777'::uuid;

  if v_state.last_session_id != v_s_multi_2 or v_state.assessed_at != '2026-09-11 12:00:00+00' then
    raise exception 'Child 7 backfill state did not select newest session';
  end if;
  if v_state.skill_results->'core_vocabulary'->>'level' != 'secure' then
    raise exception 'Child 7 skill level mismatch';
  end if;
end $$;

do $$
begin
  raise notice 'PASS: all Phase 5 assessment learner state projection tests passed';
end $$;

rollback;


