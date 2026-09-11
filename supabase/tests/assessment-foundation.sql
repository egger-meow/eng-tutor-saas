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

-- 5b. Authenticated CANNOT read question bank projection (broad enumeration revoked in Phase 3)
do $$
begin
  perform id from public.assessment_client_items;
  raise exception 'Authenticated user should NOT be able to select from assessment_client_items';
exception when insufficient_privilege then
  -- Expected: broad enumeration revoked
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

-- 5f. Authenticated user CANNOT directly SELECT from internal assessment tables or passages
do $$
begin
  perform id from public.assessment_sessions;
  raise exception 'Authenticated user should NOT be able to select from assessment_sessions';
exception when insufficient_privilege then
  -- Expected: select revoked
end $$;

do $$
begin
  perform id from public.assessment_responses;
  raise exception 'Authenticated user should NOT be able to select from assessment_responses';
exception when insufficient_privilege then
  -- Expected: select revoked
end $$;

do $$
begin
  perform child_id from public.child_assessment_state;
  raise exception 'Authenticated user should NOT be able to select from child_assessment_state';
exception when insufficient_privilege then
  -- Expected: select revoked
end $$;

do $$
begin
  perform id from public.assessment_passages;
  raise exception 'Authenticated user should NOT be able to select from assessment_passages';
exception when insufficient_privilege then
  -- Expected: select revoked
end $$;

reset role;

-- 6. Canonical Assessment Bank Verification
do $$
declare
  passage_cnt integer;
  item_cnt integer;
  vocab_cnt integer;
  grammar_cnt integer;
  reading_cnt integer;
  client_cnt integer;
  skill_rec record;
begin
  -- 6a. Verify passages
  select count(*) into passage_cnt from public.assessment_passages where id like 'pass_%' and status = 'active';
  if passage_cnt < 16 then
    raise exception 'Expected at least 16 canonical passages, got %', passage_cnt;
  end if;

  -- 6b. Verify total items
  select count(*) into item_cnt from public.assessment_items where id not like 'test_%' and status = 'active';
  if item_cnt < 108 then
    raise exception 'Expected at least 108 canonical items, got %', item_cnt;
  end if;

  -- 6c. Verify domain counts
  select count(*) into vocab_cnt from public.assessment_items where domain = 'vocabulary' and id not like 'test_%' and status = 'active';
  select count(*) into grammar_cnt from public.assessment_items where domain = 'grammar' and id not like 'test_%' and status = 'active';
  select count(*) into reading_cnt from public.assessment_items where domain = 'reading' and id not like 'test_%' and status = 'active';

  if vocab_cnt <> 24 then
    raise exception 'Expected 24 canonical vocabulary items, got %', vocab_cnt;
  end if;
  if grammar_cnt <> 44 then
    raise exception 'Expected 44 canonical grammar items, got %', grammar_cnt;
  end if;
  if reading_cnt <> 40 then
    raise exception 'Expected 40 canonical reading items, got %', reading_cnt;
  end if;

  -- 6d. Verify each of the 13 coarse skills has at least 6 active items
  for skill_rec in
    select skill, count(*) as cnt
    from public.assessment_items
    where id not like 'test_%' and status = 'active'
    group by skill
  loop
    if skill_rec.cnt < 6 then
      raise exception 'Expected skill % to have at least 6 items, got %', skill_rec.skill, skill_rec.cnt;
    end if;
  end loop;

  -- 6e. Verify reading items all link to valid passages
  if exists (
    select 1 from public.assessment_items
    where domain = 'reading' and id not like 'test_%' and (passage_id is null or passage_id not in (select id from public.assessment_passages))
  ) then
    raise exception 'Found reading items without valid passage link';
  end if;

  -- 6f. Verify client projection contains all active items
  select count(*) into client_cnt from public.assessment_client_items where id not like 'test_%';
  if client_cnt < 108 then
    raise exception 'Expected at least 108 items in assessment_client_items view, got %', client_cnt;
  end if;
end $$;

-- 7. Historical Assessment Immutability Verification
-- 7a. Ensure test_pass_01 has an item with responses
insert into public.assessment_responses (
  session_id, child_id, item_id, sequence_number, response_type, raw_answer, is_skipped, outcome, active_response_ms
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'test_item_r01', 3, 'single_choice', 'A', false, 'correct', 2500
);

-- 7b. Attempt to modify semantic field (prompt) of test_item_v01
do $$
begin
  update public.assessment_items
  set prompt = 'Tampered prompt'
  where id = 'test_item_v01';
  raise exception 'Expected modifying prompt of used item to fail';
exception when others then
  if sqlerrm not like '%Cannot modify semantic fields of assessment item%' then
    raise;
  end if;
end $$;

-- 7c. Attempt to modify semantic field (difficulty) of test_item_v01
do $$
begin
  update public.assessment_items
  set difficulty = 4
  where id = 'test_item_v01';
  raise exception 'Expected modifying difficulty of used item to fail';
exception when others then
  if sqlerrm not like '%Cannot modify semantic fields of assessment item%' then
    raise;
  end if;
end $$;

-- 7d. Attempt to delete used item
do $$
begin
  delete from public.assessment_items where id = 'test_item_v01';
  raise exception 'Expected deleting used item to fail';
exception when others then
  -- Expected rejection by trigger or foreign key
end $$;

-- 7e. Modifying non-semantic field (status) is allowed for archival lifecycle
do $$
begin
  update public.assessment_items set status = 'archived' where id = 'test_item_v01';
  update public.assessment_items set status = 'active' where id = 'test_item_v01';
end $$;

-- 7f. Attempt to modify semantic content of test_pass_01
do $$
begin
  update public.assessment_passages
  set content = 'Tampered reading text'
  where id = 'test_pass_01';
  raise exception 'Expected modifying content of used passage to fail';
exception when others then
  if sqlerrm not like '%Cannot modify semantic content of assessment passage%' then
    raise;
  end if;
end $$;

-- 7g. Attempt to delete used passage
do $$
begin
  delete from public.assessment_passages where id = 'test_pass_01';
  raise exception 'Expected deleting used passage to fail';
exception when others then
  if sqlerrm not like '%Cannot delete assessment passage%' then
    raise;
  end if;
end $$;

-- 8. Authoritative Session Engine & RPC Verification as Authenticated User
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- 8a. Parent A cannot start session for Child B (cross-parent boundary)
do $$
begin
  perform public.start_or_resume_assessment_session('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  raise exception 'Parent A should NOT be able to start session for Child B';
exception when others then
  if sqlerrm not like '%Child not found or not owned by user%' then
    raise;
  end if;
end $$;

-- 8b. Parent A starts or resumes session for Child A
do $$
declare
  v_payload jsonb;
  v_item jsonb;
  v_session_id uuid;
  v_item_id text;
  v_sub_payload jsonb;
  v_sub_dup jsonb;
begin
  v_payload := public.start_or_resume_assessment_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if v_payload->>'status' <> 'in_progress' then
    raise exception 'Expected status in_progress, got %', v_payload->>'status';
  end if;

  v_session_id := (v_payload->>'sessionId')::uuid;
  v_item := v_payload->'currentItem';

  if v_item is null then
    raise exception 'Expected currentItem in payload';
  end if;

  -- Verify no answer keys or internal tags leaked
  if v_item ? 'correctChoice' or v_item ? 'acceptedAnswers' or v_item ? 'domain' or v_item ? 'skill' or v_item ? 'difficulty' then
    raise exception 'Leaked grading secret or internal taxonomy in currentItem: %', v_item;
  end if;

  v_item_id := v_item->>'id';

  -- 8c. Negative active_response_ms rejected
  begin
    perform public.submit_assessment_response(v_session_id, v_item_id, 'A', false, -500);
    raise exception 'Expected negative active_response_ms to be rejected';
  exception when others then
    if sqlerrm not like '%Active response time must be non-negative%' then
      raise;
    end if;
  end;

  -- 8d. Submitting mismatched item ID rejected
  begin
    perform public.submit_assessment_response(v_session_id, 'arbitrary_fake_item', 'A', false, 2000);
    raise exception 'Expected mismatched item ID to be rejected';
  exception when others then
    if sqlerrm not like '%Submitted item does not match currently presented item%' then
      raise;
    end if;
  end;

  -- 8e. Valid response submission advances sequence
  v_sub_payload := public.submit_assessment_response(v_session_id, v_item_id, 'A', false, 3200);
  if (v_sub_payload->>'itemsCompleted')::integer <> 1 then
    raise exception 'Expected itemsCompleted = 1, got %', v_sub_payload->>'itemsCompleted';
  end if;

  -- 8f. Idempotency: re-submitting same response returns current state without advancing twice
  v_sub_dup := public.submit_assessment_response(v_session_id, v_item_id, 'A', false, 3200);
  if (v_sub_dup->>'itemsCompleted')::integer <> 1 then
    raise exception 'Duplicate submission advanced itemsCompleted: %', v_sub_dup->>'itemsCompleted';
  end if;

  -- 8g. get_assessment_session_state returns safe state
  v_payload := public.get_assessment_session_state(v_session_id);
  if (v_payload->>'itemsCompleted')::integer <> 1 or v_payload->>'status' <> 'in_progress' then
    raise exception 'Unexpected session state: %', v_payload;
  end if;

  -- 8h. Parent B cannot access or submit to Child A's session
  set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222"}';
  begin
    perform public.get_assessment_session_state(v_session_id);
    raise exception 'Parent B should NOT be able to read Child A session state';
  exception when others then
    if sqlerrm not like '%Assessment session not owned by user%' then
      raise;
    end if;
  end;
end $$;

-- 9. Anonymous Role Access Restrictions
set local role anon;

-- 9a. Anon CANNOT execute start_or_resume_assessment_session
do $$
begin
  perform public.start_or_resume_assessment_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  raise exception 'Anon should NOT be able to execute start_or_resume_assessment_session';
exception when insufficient_privilege then
  -- Expected: execute revoked
end $$;

-- 9b. Anon CANNOT execute submit_assessment_response
do $$
begin
  perform public.submit_assessment_response('cccccccc-cccc-cccc-cccc-cccccccccccc', 'test_item_v01', 'A', false, 1000);
  raise exception 'Anon should NOT be able to execute submit_assessment_response';
exception when insufficient_privilege then
  -- Expected: execute revoked
end $$;

-- 9c. Anon CANNOT execute get_assessment_session_state
do $$
begin
  perform public.get_assessment_session_state('cccccccc-cccc-cccc-cccc-cccccccccccc');
  raise exception 'Anon should NOT be able to execute get_assessment_session_state';
exception when insufficient_privilege then
  -- Expected: execute revoked
end $$;

-- 9d. Anon CANNOT execute compute_assessment_final_result
do $$
begin
  perform public.compute_assessment_final_result('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{}'::jsonb);
  raise exception 'Anon should NOT be able to execute compute_assessment_final_result';
exception when insufficient_privilege then
  -- Expected: execute revoked
end $$;

reset role;

do $$
begin
  raise notice 'PASS: assessment boundary hardening, canonical bank seeding, historical immutability, and authoritative engine RPCs verified';
end $$;
rollback;
