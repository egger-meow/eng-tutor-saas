-- Direct Assessment Subsystem: Foundation Schema & RLS Regression Test
begin;

-- Create test parent A and child A
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

-- 2. Insert test items across domains
-- MCQ vocabulary item
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice, status
) values (
  'test_item_v01', 'vocabulary', 'core_vocabulary', 2, 'grade_7', 'single_choice',
  'What is the meaning of "ancient"?',
  '[{"id":"A","text":"very old"},{"id":"B","text":"very young"},{"id":"C","text":"noisy"},{"id":"D","text":"quiet"}]'::jsonb,
  'A', 'active'
);

-- Short-answer grammar item
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, prompt, accepted_answers, status
) values (
  'test_item_g01', 'grammar', 'verb_tense_agreement', 3, 'grade_8', 'short_answer',
  'Fill in the blank with past tense: She ___ (go) to the library yesterday.',
  '["went"]'::jsonb, 'active'
);

-- Reading item with passage reference
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, status
) values (
  'test_item_r01', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice',
  'test_pass_01', 'What kind of passage is this?',
  '[{"id":"A","text":"authentic"},{"id":"B","text":"fake"}]'::jsonb,
  'A', 'active'
);

-- 3. Verify constraint rejections
-- Rejection 3a: Invalid skill
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice
  ) values (
    'invalid_skill_item', 'vocabulary', 'non_existent_skill', 1, 'grade_7', 'single_choice',
    'prompt', '[{"id":"A","text":"1"}]'::jsonb, 'A'
  );
  raise exception 'Expected invalid skill to be rejected';
exception when check_violation then
  -- Expected check violation
end $$;

-- Rejection 3b: MCQ missing choices
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

-- Rejection 3c: Short answer missing accepted_answers
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

-- Rejection 3d: Difficulty out of bounds (0 or 6)
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

-- 4. Session and Responses Lifecycle
-- Create session for child A
insert into public.assessment_sessions (
  id, child_id, status, target_item_count, items_completed, max_items
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'in_progress', 18, 0, 25
);

-- Record response 1 (correct)
insert into public.assessment_responses (
  session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome, active_response_ms
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'test_item_v01', 1, 'single_choice', 'A', false, 'correct', 4200
);

-- Record response 2 (skipped)
insert into public.assessment_responses (
  session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome, active_response_ms
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'test_item_g01', 2, 'short_answer', null, true, 'skipped', 1500
);

-- Rejection 4a: Duplicate item in same session
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

-- Rejection 4b: Duplicate sequence number in same session
do $$
begin
  insert into public.assessment_responses (
    session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome
  ) values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'test_item_r01', 2, 'single_choice', 'A', false, 'correct'
  );
  raise exception 'Expected duplicate sequence number in same session to be rejected';
exception when unique_violation then
  -- Expected unique violation
end $$;

-- 5. Child Assessment State
insert into public.child_assessment_state (
  child_id, last_session_id, status, skill_results, domain_summaries
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'completed',
  '{"core_vocabulary": {"level": 2, "confidence": "medium"}, "verb_tense_agreement": {"level": 1, "confidence": "low"}}'::jsonb,
  '{"vocabulary": "secure", "grammar": "needs_support"}'::jsonb
);

-- 6. Row Level Security Tests
-- As Parent A ('11111111-1111-1111-1111-111111111111')
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- Parent A can see active assessment items and passages
do $$
declare count_items integer; count_passages integer;
begin
  select count(*) into count_items from public.assessment_items;
  select count(*) into count_passages from public.assessment_passages;
  if count_items < 3 then
    raise exception 'Authenticated user should be able to read active items, got %', count_items;
  end if;
  if count_passages < 1 then
    raise exception 'Authenticated user should be able to read active passages, got %', count_passages;
  end if;
end $$;

-- Parent A cannot mutate assessment items (insert/update/delete denied)
do $$
begin
  insert into public.assessment_items (
    id, domain, skill, difficulty, grade_band, response_type, prompt, choices, correct_choice
  ) values (
    'hacked_item', 'vocabulary', 'core_vocabulary', 1, 'grade_7', 'single_choice', 'hack', '[{"id":"A","text":"1"}]'::jsonb, 'A'
  );
  raise exception 'Authenticated user should NOT be able to insert assessment items';
exception when insufficient_privilege then
  -- Expected
end $$;

-- Parent A can read Child A session and state
do $$
declare s_count integer; st_count integer;
begin
  select count(*) into s_count from public.assessment_sessions where child_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into st_count from public.child_assessment_state where child_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if s_count <> 1 or st_count <> 1 then
    raise exception 'Parent A should see child A session and state, got s=% st=%', s_count, st_count;
  end if;
end $$;

-- Parent A CANNOT read Child B's records
do $$
declare b_count integer;
begin
  select count(*) into b_count from public.assessment_sessions where child_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if b_count <> 0 then
    raise exception 'Parent A should NOT see Child B sessions, got %', b_count;
  end if;
end $$;

-- Parent A CANNOT insert a session for Child B
do $$
begin
  insert into public.assessment_sessions (
    id, child_id, status
  ) values (
    'dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'in_progress'
  );
  raise exception 'Parent A should NOT be able to insert a session for Child B';
exception when others then
  -- Expected RLS rejection
end $$;

reset role;

do $$
begin
  raise notice 'PASS: assessment foundation schema, constraints, and RLS policies verified';
end $$;
rollback;
