-- Direct Assessment Subsystem: Foundation Schema, Boundary Hardening & RLS Regression Test
begin;

-- Create test parent A and child A, and parent B and child B
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'parent_a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'parent_b@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'Parent A'),
  ('22222222-2222-2222-2222-222222222222', 'Parent B')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Child A', 7, 'grade_7'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Child B', 8, 'grade_8');

-- 1. Insert test passage
insert into public.assessment_passages (id, title, content, word_count, grade_band, status)
values ('test_pass_01', 'Test Reading Passage', 'This is a sample authentic passage for testing.', 8, 'grade_7', 'active');

-- 2. Insert test items across valid domain/skill mappings
-- 2a. Vocabulary item with valid skill
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice, status
) values (
  'test_item_v01', 'vocabulary', 'core_vocabulary', 2, 'grade_7', 'single_choice',
  'What is the meaning of "ancient"?',
  '[{"id":"A","text":"very old"},{"id":"B","text":"very young"},{"id":"C","text":"noisy"},{"id":"D","text":"quiet"}]'::jsonb,
  'A', 'active'
);

-- 2b. Grammar item with valid skill
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, prompt, accepted_answers, status
) values (
  'test_item_g01', 'grammar', 'verb_tense_agreement', 3, 'grade_8', 'short_answer',
  'Fill in the blank with past tense: She ___ (go) to the library yesterday.',
  '["went"]'::jsonb, 'active'
);

-- 2c. Reading item with valid skill and passage reference
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, status
) values (
  'test_item_r01', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice',
  'test_pass_01', 'What kind of passage is this?',
  '[{"id":"A","text":"authentic"},{"id":"B","text":"fake"}]'::jsonb,
  'A', 'active'
);

-- 3. Verify Domain <-> Skill Consistency check constraint
-- 3a. Rejection: vocabulary domain with reading skill (e.g. inference)
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice
  ) values (
    'mismatch_v_inf', 'vocabulary', 'inference', 2, 'grade_7', 'single_choice',
    'prompt', '[{"id":"A","text":"1"}]'::jsonb, 'A'
  );
  raise exception 'Expected domain=vocabulary with skill=inference to fail';
exception when check_violation then
  -- Expected check violation
end $$;

-- 3b. Rejection: grammar domain with vocabulary skill (e.g. core_vocabulary)
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice
  ) values (
    'mismatch_g_voc', 'grammar', 'core_vocabulary', 2, 'grade_7', 'single_choice',
    'prompt', '[{"id":"A","text":"1"}]'::jsonb, 'A'
  );
  raise exception 'Expected domain=grammar with skill=core_vocabulary to fail';
exception when check_violation then
  -- Expected check violation
end $$;

-- 3c. Rejection: reading domain with grammar skill (e.g. verb_tense_agreement)
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice
  ) values (
    'mismatch_r_grm', 'reading', 'verb_tense_agreement', 2, 'grade_7', 'single_choice',
    'prompt', '[{"id":"A","text":"1"}]'::jsonb, 'A'
  );
  raise exception 'Expected domain=reading with skill=verb_tense_agreement to fail';
exception when check_violation then
  -- Expected check violation
end $$;

-- 3d. Rejection: MCQ missing choices
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice
  ) values (
    'invalid_mcq_item', 'vocabulary', 'core_vocabulary', 1, 'grade_7', 'single_choice',
    'prompt', null, 'A'
  );
  raise exception 'Expected MCQ without choices to be rejected';
exception when check_violation then
  -- Expected check violation
end $$;

-- 3e. Rejection: Short answer missing accepted_answers
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, accepted_answers
  ) values (
    'invalid_sa_item', 'grammar', 'verb_tense_agreement', 1, 'grade_7', 'short_answer',
    'prompt', null
  );
  raise exception 'Expected short answer without accepted_answers to be rejected';
exception when check_violation then
  -- Expected check violation
end $$;

-- 3f. Rejection: Difficulty out of bounds (0 or 6)
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, accepted_answers
  ) values (
    'invalid_diff_item', 'grammar', 'verb_tense_agreement', 6, 'grade_7', 'short_answer',
    'prompt', '["went"]'::jsonb
  );
  raise exception 'Expected difficulty 6 to be rejected';
exception when check_violation then
  -- Expected check violation
end $$;

-- 4. Service/Backend Authority Inserts Session, Responses, and Compact State
-- 4a. Create session for child A
insert into public.assessment_sessions (
  id, child_id, status, target_item_count, items_completed, max_items
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'in_progress', 18, 0, 25
);

-- 4b. Record response 1 (correct)
insert into public.assessment_responses (
  session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome, active_response_ms
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'test_item_v01', 1, 'single_choice', 'A', false, 'correct', 4200
);

-- 4c. Record response 2 (skipped)
insert into public.assessment_responses (
  session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome, active_response_ms
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'test_item_g01', 2, 'short_answer', null, true, 'skipped', 1500
);

-- 4d. Rejection: Duplicate item in same session
do $$
begin
  insert into public.assessment_responses (
    session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome
  ) values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'test_item_v01', 3, 'single_choice', 'B', false, 'incorrect'
  );
  raise exception 'Expected duplicate item in same session to be rejected';
exception when unique_violation then
  -- Expected unique violation
end $$;

-- 4e. Record compact child assessment state
insert into public.child_assessment_state (
  child_id, last_session_id, status, skill_results, domain_summaries
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'completed',
  '{"core_vocabulary": {"level": 2, "confidence": "medium"}, "verb_tense_agreement": {"level": 1, "confidence": "low"}}'::jsonb,
  '{"vocabulary": "secure", "grammar": "needs_support"}'::jsonb
);

-- 5. Security & Boundary Hardening Verification as Authenticated User
-- Switch role to authenticated Parent A ('11111111-1111-1111-1111-111111111111')
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- 5a. Authenticated CANNOT read canonical answer keys from assessment_items
do $$
begin
  perform correct_choice from public.assessment_items;
  raise exception 'Authenticated user should NOT be able to select from base assessment_items';
exception when insufficient_privilege then
  -- Expected: direct select revoked
end $$;

-- 5b. Authenticated CAN read question rendering projection (without grading secrets)
do $$
declare client_count integer;
begin
  select count(*) into client_count from public.assessment_client_items;
  if client_count < 3 then
    raise exception 'Authenticated user should be able to read assessment_client_items, got %', client_count;
  end if;
end $$;

-- 5c. Authenticated CANNOT forge response outcomes (direct insert into assessment_responses revoked)
do $$
begin
  insert into public.assessment_responses (
    session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome
  ) values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'test_item_r01', 3, 'single_choice', 'A', false, 'correct'
  );
  raise exception 'Authenticated user should NOT be able to insert responses directly';
exception when insufficient_privilege then
  -- Expected: mutation revoked
end $$;

-- 5d. Authenticated CANNOT directly mutate session diagnostic truth (insert/update revoked)
do $$
begin
  update public.assessment_sessions
  set final_result = '{"tampered": true}'::jsonb, status = 'completed'
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  raise exception 'Authenticated user should NOT be able to update assessment_sessions directly';
exception when insufficient_privilege then
  -- Expected: mutation revoked
end $$;

do $$
begin
  insert into public.assessment_sessions (
    id, child_id, status
  ) values (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'in_progress'
  );
  raise exception 'Authenticated user should NOT be able to insert assessment_sessions directly';
exception when insufficient_privilege then
  -- Expected: mutation revoked
end $$;

-- 5e. Authenticated CANNOT directly mutate compact child assessment results
do $$
begin
  update public.child_assessment_state
  set skill_results = '{"forged": true}'::jsonb
  where child_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  raise exception 'Authenticated user should NOT be able to update child_assessment_state directly';
exception when insufficient_privilege then
  -- Expected: mutation revoked
end $$;

do $$
begin
  insert into public.child_assessment_state (
    child_id, status
  ) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'completed'
  );
  raise exception 'Authenticated user should NOT be able to insert child_assessment_state directly';
exception when insufficient_privilege then
  -- Expected: mutation revoked
end $$;

-- 5f. Authenticated Parent A CAN read Child A records under RLS
do $$
declare s_count integer; st_count integer; r_count integer;
begin
  select count(*) into s_count from public.assessment_sessions where child_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into st_count from public.child_assessment_state where child_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into r_count from public.assessment_responses where child_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if s_count <> 1 or st_count <> 1 or r_count <> 2 then
    raise exception 'Parent A should see child A records, got s=% st=% r=%', s_count, st_count, r_count;
  end if;
end $$;

-- 5g. Authenticated Parent A CANNOT read Child B records (Parent isolation preserved)
do $$
declare b_count integer;
begin
  select count(*) into b_count from public.assessment_sessions where child_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if b_count <> 0 then
    raise exception 'Parent A should NOT see Child B sessions, got %', b_count;
  end if;
end $$;

reset role;

do $$
begin
  raise notice 'PASS: assessment boundary hardening, domain/skill consistency, and RLS verified';
end $$;
rollback;
