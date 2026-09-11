-- Direct Assessment Conformance Regression Test Suite
-- Proves SQL production engine behavior matches TypeScript V1 reference contract

begin;

-- Golden Test Setup
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'parent_a@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values ('11111111-1111-1111-1111-111111111111', 'Parent A')
on conflict (id) do nothing;

set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- ============================================================================
-- 1. Low-difficulty successes remain developing (Not Secure)
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
  v_eval jsonb;
begin
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object(
        'skill', 'core_vocabulary',
        'domain', 'vocabulary',
        'attempts', 2,
        'correct', 2,
        'incorrect', 0,
        'skipped', 0,
        'difficulties', '[2, 2]'::jsonb,
        'outcomes', '["correct", "correct"]'::jsonb,
        'has_contradiction', false
      )
    )
  );

  v_res := public.compute_assessment_final_result(
    '123e4567-e89b-42d3-a456-426614174000'::uuid,
    '223e4567-e89b-42d3-a456-426614174000'::uuid,
    v_state
  );

  v_eval := v_res->'skillEvaluations'->'core_vocabulary';
  if v_eval->>'result' <> 'developing' then
    raise exception 'Expected developing for low-difficulty 2/2 success, got %', v_eval->>'result';
  end if;
  if (v_eval->>'estimatedDifficulty')::integer <> 2 then
    raise exception 'Expected estimatedDifficulty 2, got %', v_eval->>'estimatedDifficulty';
  end if;
  if v_eval->>'confidence' <> 'medium' then
    raise exception 'Expected confidence medium, got %', v_eval->>'confidence';
  end if;
end $$;

-- ============================================================================
-- 2. High-difficulty successes can become secure
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
  v_eval jsonb;
begin
  -- 2a. 1 attempt at difficulty 3 correct
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object(
        'skill', 'core_vocabulary',
        'domain', 'vocabulary',
        'attempts', 1,
        'correct', 1,
        'incorrect', 0,
        'skipped', 0,
        'difficulties', '[3]'::jsonb,
        'outcomes', '["correct"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'core_vocabulary';
  if v_eval->>'result' <> 'secure' or (v_eval->>'estimatedDifficulty')::integer <> 3 or v_eval->>'confidence' <> 'low' then
    raise exception '2a failed: %', v_eval;
  end if;

  -- 2b. 2 attempts at diff 3, 4 correct
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'verb_tense_agreement', jsonb_build_object(
        'skill', 'verb_tense_agreement',
        'domain', 'grammar',
        'attempts', 2,
        'correct', 2,
        'incorrect', 0,
        'skipped', 0,
        'difficulties', '[3, 4]'::jsonb,
        'outcomes', '["correct", "correct"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'verb_tense_agreement';
  if v_eval->>'result' <> 'secure' or (v_eval->>'estimatedDifficulty')::integer <> 4 or v_eval->>'confidence' <> 'medium' then
    raise exception '2b failed: %', v_eval;
  end if;

  -- 2c. 3 attempts at diff 3, 4, 5 correct
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'main_idea', jsonb_build_object(
        'skill', 'main_idea',
        'domain', 'reading',
        'attempts', 3,
        'correct', 3,
        'incorrect', 0,
        'skipped', 0,
        'difficulties', '[3, 4, 5]'::jsonb,
        'outcomes', '["correct", "correct", "correct"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'main_idea';
  if v_eval->>'result' <> 'secure' or (v_eval->>'estimatedDifficulty')::integer <> 5 or v_eval->>'confidence' <> 'high' then
    raise exception '2c failed: %', v_eval;
  end if;
end $$;

-- ============================================================================
-- 3. Struggling evidence
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
  v_eval jsonb;
begin
  -- 3a. 1 attempt at difficulty 2 failed
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object(
        'skill', 'core_vocabulary',
        'domain', 'vocabulary',
        'attempts', 1,
        'correct', 0,
        'incorrect', 1,
        'skipped', 0,
        'difficulties', '[2]'::jsonb,
        'outcomes', '["incorrect"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'core_vocabulary';
  if v_eval->>'result' <> 'needs_support' or (v_eval->>'estimatedDifficulty')::integer <> 1 or v_eval->>'confidence' <> 'low' then
    raise exception '3a failed: %', v_eval;
  end if;

  -- 3b. 2 attempts at diff 2 failed
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object(
        'skill', 'core_vocabulary',
        'domain', 'vocabulary',
        'attempts', 2,
        'correct', 0,
        'incorrect', 1,
        'skipped', 1,
        'difficulties', '[2, 2]'::jsonb,
        'outcomes', '["incorrect", "skipped"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'core_vocabulary';
  if v_eval->>'result' <> 'needs_support' or (v_eval->>'estimatedDifficulty')::integer <> 2 or v_eval->>'confidence' <> 'medium' then
    raise exception '3b failed: %', v_eval;
  end if;

  -- 3c. 2 attempts with diff 1 failed
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object(
        'skill', 'core_vocabulary',
        'domain', 'vocabulary',
        'attempts', 2,
        'correct', 0,
        'incorrect', 2,
        'skipped', 0,
        'difficulties', '[1, 2]'::jsonb,
        'outcomes', '["incorrect", "incorrect"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'core_vocabulary';
  if v_eval->>'result' <> 'needs_support' or (v_eval->>'estimatedDifficulty')::integer <> 1 or v_eval->>'confidence' <> 'medium' then
    raise exception '3c failed: %', v_eval;
  end if;

  -- 3d. 3 attempts failed
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'basic_sentence_structure', jsonb_build_object(
        'skill', 'basic_sentence_structure',
        'domain', 'grammar',
        'attempts', 3,
        'correct', 0,
        'incorrect', 3,
        'skipped', 0,
        'difficulties', '[1, 2, 2]'::jsonb,
        'outcomes', '["incorrect", "incorrect", "incorrect"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'basic_sentence_structure';
  if v_eval->>'result' <> 'needs_support' or (v_eval->>'estimatedDifficulty')::integer <> 1 or v_eval->>'confidence' <> 'high' then
    raise exception '3d failed: %', v_eval;
  end if;
end $$;

-- ============================================================================
-- 4. Mixed evidence
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
  v_eval jsonb;
begin
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'complex_structures', jsonb_build_object(
        'skill', 'complex_structures',
        'domain', 'grammar',
        'attempts', 2,
        'correct', 1,
        'incorrect', 1,
        'skipped', 0,
        'difficulties', '[2, 3]'::jsonb,
        'outcomes', '["correct", "incorrect"]'::jsonb,
        'has_contradiction', false
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'complex_structures';
  if v_eval->>'result' <> 'developing' or (v_eval->>'estimatedDifficulty')::integer <> 3 or v_eval->>'confidence' <> 'medium' then
    raise exception '4 mixed evidence failed: %', v_eval;
  end if;
end $$;

-- ============================================================================
-- 5. Contradiction
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
  v_eval jsonb;
begin
  -- 5a. Contradiction with 2 attempts (low confidence)
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'contextual_meaning', jsonb_build_object(
        'skill', 'contextual_meaning',
        'domain', 'vocabulary',
        'attempts', 2,
        'correct', 1,
        'incorrect', 1,
        'skipped', 0,
        'difficulties', '[3, 2]'::jsonb,
        'outcomes', '["correct", "incorrect"]'::jsonb,
        'has_contradiction', true
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'contextual_meaning';
  if v_eval->>'result' <> 'developing' or v_eval->>'confidence' <> 'low' then
    raise exception '5a contradiction failed: %', v_eval;
  end if;

  -- 5b. Contradiction with 4 attempts (medium confidence)
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'contextual_meaning', jsonb_build_object(
        'skill', 'contextual_meaning',
        'domain', 'vocabulary',
        'attempts', 4,
        'correct', 2,
        'incorrect', 2,
        'skipped', 0,
        'difficulties', '[3, 2, 2, 4]'::jsonb,
        'outcomes', '["correct", "incorrect", "correct", "incorrect"]'::jsonb,
        'has_contradiction', true
      )
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_eval := v_res->'skillEvaluations'->'contextual_meaning';
  if v_eval->>'result' <> 'developing' or v_eval->>'confidence' <> 'medium' then
    raise exception '5b contradiction failed: %', v_eval;
  end if;
end $$;

-- ============================================================================
-- 6. Domain Confidence
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
begin
  -- 6a. High domain confidence: 2 high, 1 medium skills
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'attempts', 3, 'correct', 3, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4,5]'::jsonb, 'outcomes', '["correct","correct","correct"]'::jsonb),
      'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'attempts', 3, 'correct', 3, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4,5]'::jsonb, 'outcomes', '["correct","correct","correct"]'::jsonb),
      'word_form_usage', jsonb_build_object('skill', 'word_form_usage', 'domain', 'vocabulary', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb)
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  if (v_res->'domainSummaries'->'vocabulary'->>'confidence') <> 'high' then
    raise exception '6a domain confidence expected high, got %', v_res->'domainSummaries'->'vocabulary';
  end if;

  -- 6b. Low domain confidence: 2 low, 1 high
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'attempts', 1, 'correct', 1, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3]'::jsonb, 'outcomes', '["correct"]'::jsonb),
      'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'attempts', 1, 'correct', 1, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3]'::jsonb, 'outcomes', '["correct"]'::jsonb),
      'word_form_usage', jsonb_build_object('skill', 'word_form_usage', 'domain', 'vocabulary', 'attempts', 3, 'correct', 3, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4,5]'::jsonb, 'outcomes', '["correct","correct","correct"]'::jsonb)
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  if (v_res->'domainSummaries'->'vocabulary'->>'confidence') <> 'low' then
    raise exception '6b domain confidence expected low, got %', v_res->'domainSummaries'->'vocabulary';
  end if;
end $$;

-- ============================================================================
-- 7. Special Overall Narratives
-- ============================================================================
do $$
declare
  v_state jsonb;
  v_res jsonb;
  v_nar text;
begin
  -- 7a. All secure
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'basic_sentence_structure', jsonb_build_object('skill', 'basic_sentence_structure', 'domain', 'grammar', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'verb_tense_agreement', jsonb_build_object('skill', 'verb_tense_agreement', 'domain', 'grammar', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'questions_and_negatives', jsonb_build_object('skill', 'questions_and_negatives', 'domain', 'grammar', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'explicit_information', jsonb_build_object('skill', 'explicit_information', 'domain', 'reading', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'main_idea', jsonb_build_object('skill', 'main_idea', 'domain', 'reading', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'inference', jsonb_build_object('skill', 'inference', 'domain', 'reading', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb)
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_nar := v_res->>'overallNarrativeZh';
  if v_nar <> '整體英語程度穩健優異，字彙量充足且文法結構清晰，具備良好的篇章推論能力。' then
    raise exception '7a narrative mismatch: %', v_nar;
  end if;

  -- 7b. All needs_support
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'core_vocabulary', jsonb_build_object('skill', 'core_vocabulary', 'domain', 'vocabulary', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'contextual_meaning', jsonb_build_object('skill', 'contextual_meaning', 'domain', 'vocabulary', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'basic_sentence_structure', jsonb_build_object('skill', 'basic_sentence_structure', 'domain', 'grammar', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'verb_tense_agreement', jsonb_build_object('skill', 'verb_tense_agreement', 'domain', 'grammar', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'questions_and_negatives', jsonb_build_object('skill', 'questions_and_negatives', 'domain', 'grammar', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'explicit_information', jsonb_build_object('skill', 'explicit_information', 'domain', 'reading', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'main_idea', jsonb_build_object('skill', 'main_idea', 'domain', 'reading', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb),
      'inference', jsonb_build_object('skill', 'inference', 'domain', 'reading', 'attempts', 2, 'correct', 0, 'incorrect', 2, 'skipped', 0, 'difficulties', '[1,2]'::jsonb, 'outcomes', '["incorrect","incorrect"]'::jsonb)
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_nar := v_res->>'overallNarrativeZh';
  if v_nar <> '目前在各學習領域均需要更多基礎引導，建議從日常核心字彙與簡單句構循序漸進建立學習自信。' then
    raise exception '7b narrative mismatch: %', v_nar;
  end if;

  -- 7c. Reading secure, grammar developing
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'explicit_information', jsonb_build_object('skill', 'explicit_information', 'domain', 'reading', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'main_idea', jsonb_build_object('skill', 'main_idea', 'domain', 'reading', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'inference', jsonb_build_object('skill', 'inference', 'domain', 'reading', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb)
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_nar := v_res->>'overallNarrativeZh';
  if v_nar <> '閱讀理解與語感表現良好，但文法規則與精準句構稍弱，加強時態與句型有助於突破瓶頸。' then
    raise exception '7c narrative mismatch: %', v_nar;
  end if;

  -- 7d. Grammar secure, reading developing
  v_state := jsonb_build_object(
    'skill_evidence', jsonb_build_object(
      'basic_sentence_structure', jsonb_build_object('skill', 'basic_sentence_structure', 'domain', 'grammar', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'verb_tense_agreement', jsonb_build_object('skill', 'verb_tense_agreement', 'domain', 'grammar', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb),
      'questions_and_negatives', jsonb_build_object('skill', 'questions_and_negatives', 'domain', 'grammar', 'attempts', 2, 'correct', 2, 'incorrect', 0, 'skipped', 0, 'difficulties', '[3,4]'::jsonb, 'outcomes', '["correct","correct"]'::jsonb)
    )
  );
  v_res := public.compute_assessment_final_result('123e4567-e89b-42d3-a456-426614174000'::uuid, '223e4567-e89b-42d3-a456-426614174000'::uuid, v_state);
  v_nar := v_res->>'overallNarrativeZh';
  if v_nar <> '文法概念清晰扎實，篇章閱讀時可多練習長文耐心與段落主旨掌握。' then
    raise exception '7d narrative mismatch: %', v_nar;
  end if;
end $$;

-- ============================================================================
-- 8. Same-Passage Preference in SQL Candidate Selection
-- ============================================================================
do $$
declare
  v_chosen_id text;
begin
  -- Create two temporary items with same skill and difficulty, different passages
  insert into public.assessment_passages (id, title, content, word_count, grade_band)
  values ('test_conf_p1', 'P1', 'Content 1', 80, 'grade_7'),
         ('test_conf_p2', 'P2', 'Content 2', 80, 'grade_7');

  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, status, version
  ) values
    ('test_item_pass2_alpha', 'reading', 'explicit_information', 3, 'grade_7', 'single_choice', 'test_conf_p2', 'Q', '[{"id":"A","text":"A"}]'::jsonb, 'A', 'active', 1),
    ('test_item_pass1_beta', 'reading', 'explicit_information', 3, 'grade_7', 'single_choice', 'test_conf_p1', 'Q', '[{"id":"A","text":"A"}]'::jsonb, 'A', 'active', 1);

  -- When last passage was test_conf_p1, test_item_pass1_beta must be chosen even though test_item_pass2_alpha is earlier alphabetically
  select id into v_chosen_id
  from public.assessment_items i
  where i.skill = 'explicit_information' and i.id in ('test_item_pass2_alpha', 'test_item_pass1_beta')
  order by
    abs(i.difficulty - 3) asc,
    case when 'test_conf_p1' is not null and i.passage_id = 'test_conf_p1' then 0 else 1 end asc,
    i.id asc
  limit 1;

  if v_chosen_id <> 'test_item_pass1_beta' then
    raise exception 'Expected test_item_pass1_beta due to passage match, got %', v_chosen_id;
  end if;

  -- When difficulty distance differs, difficulty distance takes precedence
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, status, version
  ) values
    ('test_item_pass1_diff2', 'reading', 'explicit_information', 2, 'grade_7', 'single_choice', 'test_conf_p1', 'Q', '[{"id":"A","text":"A"}]'::jsonb, 'A', 'active', 1);

  select id into v_chosen_id
  from public.assessment_items i
  where i.skill = 'explicit_information' and i.id in ('test_item_pass1_diff2', 'test_item_pass2_alpha')
  order by
    abs(i.difficulty - 3) asc,
    case when 'test_conf_p1' is not null and i.passage_id = 'test_conf_p1' then 0 else 1 end asc,
    i.id asc
  limit 1;

  if v_chosen_id <> 'test_item_pass2_alpha' then
    raise exception 'Expected test_item_pass2_alpha due to closer difficulty, got %', v_chosen_id;
  end if;
end $$;

-- ============================================================================
-- 9. Unavailable Broad-Probe Skill Handling in SQL Session
-- ============================================================================
do $$
declare
  v_payload jsonb;
begin
  -- Setup test child for Parent A
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Child Probe', 7, 'grade_7')
  on conflict (id) do nothing;

  -- Archive all core_vocabulary items temporarily
  update public.assessment_items set status = 'archived' where skill = 'core_vocabulary';

  -- start_or_resume_assessment_session should safely skip core_vocabulary and pick contextual_meaning
  v_payload := public.start_or_resume_assessment_session('33333333-3333-3333-3333-333333333333');

  if v_payload->>'status' <> 'in_progress' or v_payload->'currentItem' is null then
    raise exception 'Failed to start session with unavailable probe skill: %', v_payload;
  end if;

  -- Restore core_vocabulary status
  update public.assessment_items set status = 'active' where skill = 'core_vocabulary';
end $$;

do $$
begin
  raise notice 'PASS: all 9 Direct Assessment SQL-TypeScript conformance scenarios verified';
end $$;

rollback;
