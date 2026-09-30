-- ============================================================================
-- Student Material Projection & Drafts Test Suite
-- ============================================================================

begin;

do $$
begin
  if has_column_privilege('authenticated', 'public.materials', 'canonical_source', 'select')
    or has_column_privilege('authenticated', 'public.materials', 'input_snapshot', 'select')
    or has_table_privilege('authenticated', 'public.student_material_drafts', 'insert')
    or has_table_privilege('authenticated', 'public.student_material_drafts', 'update')
    or has_table_privilege('authenticated', 'public.student_material_drafts', 'delete') then
    raise exception 'Student projection or draft privileges bypass the scoped RPCs';
  end if;
end $$;

-- 1. Setup fixture parents & children
insert into auth.users (id, email)
values
  ('c1111111-1111-1111-1111-111111111111', 'student_parent_a@example.com'),
  ('c2222222-2222-2222-2222-222222222222', 'student_parent_b@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('c1111111-1111-1111-1111-111111111111', 'Parent A'),
  ('c2222222-2222-2222-2222-222222222222', 'Parent B')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Child A', 7, 'grade_7', true),
  ('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Child B', 7, 'grade_7', true)
on conflict (id) do nothing;

insert into public.subscriptions(child_id, provider, status, current_period_end)
values('d1111111-1111-1111-1111-111111111111', 'test', 'active', now()+interval '1 month')
on conflict(child_id) do nothing;

-- 2. Setup fixture materials (one released, one unreleased)
-- Released material for Child A
insert into public.materials (
  id, child_id, material_week, revision, rule_version, input_snapshot,
  student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary
) values (
  'e1111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111',
  current_date,
  1,
  'weekly-material/1.0.0',
  '{}'::jsonb,
  'students/d1/w1/r1/student.pdf',
  'students/d1/w1/r1/answer.pdf',
  jsonb_build_object(
    'metadata', jsonb_build_object('weekNumber', 1, 'title', 'The Space Station Mystery'),
    'studentLesson', jsonb_build_object(
      'opening', jsonb_build_object('goalsZh', jsonb_build_array('目標 1', '目標 2'), 'howToUseZh', '使用方式說明'),
      'vocabulary', jsonb_build_array(
        jsonb_build_object('id', 'v1', 'word', 'satellite', 'meaningZh', '衛星', 'status', 'new')
      ),
      'reading', jsonb_build_object(
        'title', 'The Space Station Mystery',
        'blocks', jsonb_build_array(
          jsonb_build_object('type', 'paragraph', 'text', 'Astronauts noticed an unusual sound.')
        )
      ),
      'instruction', jsonb_build_array(
        jsonb_build_object(
          'id', 'inst-1',
          'titleZh', '現在進行式',
          'blocks', jsonb_build_array(
            jsonb_build_object('type', 'prose', 'textZh', '表示當下正在進行的動作。')
          )
        )
      ),
      'practice', jsonb_build_array(
        jsonb_build_object(
          'id', 'sec-1',
          'titleZh', '精準練習',
          'questions', jsonb_build_array(
            jsonb_build_object('id', 'q1', 'prompt', 'What did they hear?', 'itemType', 'inference', 'options', jsonb_build_array('A sound', 'Music', 'Silence', 'Nothing'), 'correctAnswer', 'SECRET_NESTED_ANSWER'),
            jsonb_build_object('id', 'q2', 'prompt', 'Write a sentence.', 'writingLines', 2),
            jsonb_build_object('id', 'q3', 'prompt', 'Explain in your own words.', 'writingLines', 2),
            jsonb_build_object('id', 'q4', 'prompt', 'Choose again.', 'options', jsonb_build_array('First', 'Second')),
            jsonb_build_object('id', 'q5', 'prompt', 'Fill the table.', 'responseLayout',
              jsonb_build_object('type','table','rows',jsonb_build_array(jsonb_build_object('cells',
                jsonb_build_array(jsonb_build_object('responseUnitId','q5-cell'))))))
          )
        )
      ),
      'homework', jsonb_build_object('purposeZh', '延遲複習', 'estimatedMinutes', 15, 'questions', '[]'::jsonb)
    ),
    'answers', jsonb_build_array(
      jsonb_build_object('questionId', 'q1', 'answer', 'A sound', 'explanationZh', '秘密解答'),
      jsonb_build_object('questionId', 'q4', 'answer', 'A. First', 'explanationZh', '另一個解答')
    ),
    'parentSummary', jsonb_build_object('focusZh', '家長專屬摘要'),
    'grounding', jsonb_build_object('facts', jsonb_build_array('內部事實')),
    'qualityEvidence', jsonb_build_object('passed', true)
  ),
  jsonb_build_object('weekNumber', 1, 'title', 'The Space Station Mystery')
) on conflict (id) do nothing;

-- Job for released material
insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key,
  scheduled_for, release_at, feedback_cutoff_at, generation_due_at,
  status, completed_at
) values (
  'f1111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  current_date,
  'weekly-material/1.0.0',
  'test-proj-rel',
  now() - interval '3 days',
  now() - interval '30 minutes',
  (now() - interval '30 minutes') - interval '48 hours',
  (now() - interval '30 minutes') - interval '24 hours',
  'completed',
  now() - interval '1 hour'
) on conflict (id) do nothing;

-- Unreleased material for Child A (release_at in future)
insert into public.materials (
  id, child_id, material_week, revision, rule_version, input_snapshot,
  student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary
) values (
  'e2222222-2222-2222-2222-222222222222',
  'd1111111-1111-1111-1111-111111111111',
  current_date + 7,
  1,
  'weekly-material/1.0.0',
  '{}'::jsonb,
  'students/d1/w2/r1/student.pdf',
  'students/d1/w2/r1/answer.pdf',
  jsonb_build_object('metadata', jsonb_build_object('weekNumber', 2)),
  jsonb_build_object('weekNumber', 2)
) on conflict (id) do nothing;

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key,
  scheduled_for, release_at, feedback_cutoff_at, generation_due_at,
  status, completed_at
) values (
  'f2222222-2222-2222-2222-222222222222',
  'd1111111-1111-1111-1111-111111111111',
  'e2222222-2222-2222-2222-222222222222',
  current_date + 7,
  'weekly-material/1.0.0',
  'test-proj-unrel',
  now() + interval '1 day',
  now() + interval '3 days',
  (now() + interval '3 days') - interval '48 hours',
  (now() + interval '3 days') - interval '24 hours',
  'completed',
  now()
) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Test 1: Parent A successfully reads released material projection
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

do $$
declare
  v_rec record;
begin
  select * into v_rec
  from public.get_student_material_projection('e1111111-1111-1111-1111-111111111111'::uuid);

  if v_rec.material_id is null then
    raise exception 'Expected projection for released material, got null';
  end if;

  if v_rec.child_name != 'Child A' then
    raise exception 'Expected child_name Child A, got %', v_rec.child_name;
  end if;

  if v_rec.week_number != 1 then
    raise exception 'Expected week_number 1, got %', v_rec.week_number;
  end if;

  -- Verify absolute zero answers leakage
  if v_rec.student_lesson ? 'answers' then
    raise exception 'LEAK: student_lesson contains answers field';
  end if;
  if v_rec.student_lesson ? 'parentSummary' then
    raise exception 'LEAK: student_lesson contains parentSummary field';
  end if;
  if v_rec.student_lesson ? 'grounding' then
    raise exception 'LEAK: student_lesson contains grounding field';
  end if;
  if v_rec.student_lesson ? 'qualityEvidence' then
    raise exception 'LEAK: student_lesson contains qualityEvidence field';
  end if;
  if (v_rec.student_lesson::text) like '%秘密解答%' then
    raise exception 'LEAK: answer explanation leaked in projection body';
  end if;
  if (v_rec.student_lesson::text) like '%SECRET_NESTED_ANSWER%' then
    raise exception 'LEAK: nested answer leaked in projection body';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 2: Unreleased material cannot be projected
-- ----------------------------------------------------------------------------
do $$
declare
  v_rec record;
begin
  select * into v_rec
  from public.get_student_material_projection('e2222222-2222-2222-2222-222222222222'::uuid);

  if v_rec.material_id is not null then
    raise exception 'Unreleased material must not be projected before release_at';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 3: Parent B cannot read Parent A's material projection
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "c2222222-2222-2222-2222-222222222222"}';

do $$
declare
  v_rec record;
begin
  select * into v_rec
  from public.get_student_material_projection('e1111111-1111-1111-1111-111111111111'::uuid);

  if v_rec.material_id is not null then
    raise exception 'Cross-family projection read must return empty';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 4: Draft saving, optimistic concurrency & cross-device retrieval
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';

-- Device 1: Save initial draft
do $$
declare
  v_res jsonb;
  v_draft record;
begin
  v_res := public.save_material_draft(
    'e1111111-1111-1111-1111-111111111111'::uuid,
    '{"q1": "A sound", "q3": "I noticed the sound.", "q4": "B", "q5-cell": "A table answer", "open-1": "My reflection"}'::jsonb,
    '["chk-1"]'::jsonb,
    0
  );

  if not (v_res->>'success')::boolean then
    raise exception 'Initial save failed: %', v_res;
  end if;

  if (v_res->>'version')::integer != 1 then
    raise exception 'Expected version 1, got %', v_res->>'version';
  end if;

  -- Device 2: Read draft
  select * into v_draft
  from public.get_material_draft('e1111111-1111-1111-1111-111111111111'::uuid);

  if v_draft.answers->>'q1' != 'A sound' then
    raise exception 'Expected answers.q1 = A sound, got %', v_draft.answers;
  end if;
  if v_draft.version != 1 then
    raise exception 'Expected version 1, got %', v_draft.version;
  end if;
end $$;

-- Device 1: Save update with version 1 -> advances to version 2
do $$
declare
  v_res jsonb;
begin
  v_res := public.save_material_draft(
    'e1111111-1111-1111-1111-111111111111'::uuid,
    '{"q1": "A sound", "q3": "I noticed the sound.", "q4": "B", "q5-cell": "A table answer", "open-1": "Updated reflection"}'::jsonb,
    '["chk-1", "chk-2"]'::jsonb,
    1
  );

  if not (v_res->>'success')::boolean then
    raise exception 'Version 1 save failed: %', v_res;
  end if;

  if (v_res->>'version')::integer != 2 then
    raise exception 'Expected version 2, got %', v_res->>'version';
  end if;
end $$;

-- Device 2 (stale): Attempts to save with obsolete client_version 1 -> conflict detected!
do $$
declare
  v_res jsonb;
begin
  v_res := public.save_material_draft(
    'e1111111-1111-1111-1111-111111111111'::uuid,
    '{"q1": "Conflict value"}'::jsonb,
    '[]'::jsonb,
    1
  );

  if (v_res->>'conflict')::boolean != true then
    raise exception 'Expected conflict = true, got %', v_res;
  end if;
  if (v_res->>'version')::integer != 2 then
    raise exception 'Expected server version 2 returned, got %', v_res;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Test 5: Cross-family draft protection
-- ----------------------------------------------------------------------------
set local "request.jwt.claims" = '{"sub": "c2222222-2222-2222-2222-222222222222"}';

-- Parent B reading Parent A draft -> empty
do $$
declare
  v_draft record;
begin
  select * into v_draft
  from public.get_material_draft('e1111111-1111-1111-1111-111111111111'::uuid);

  if v_draft.answers is not null then
    raise exception 'Parent B must not read Parent A draft';
  end if;
end $$;

-- Parent B saving Parent A draft -> exception
do $$
begin
  if public.can_open_parent_answer('e1111111-1111-1111-1111-111111111111'::uuid) then
    raise exception 'Cross-family parent answer unlocked';
  end if;
  perform public.save_material_draft(
    'e1111111-1111-1111-1111-111111111111'::uuid,
    '{"q1": "Hacked"}'::jsonb,
    '[]'::jsonb,
    0
  );
  raise exception 'Parent B write to Parent A draft should have raised an exception';
exception
  when others then
    if sqlerrm not like '%MATERIAL_NOT_FOUND_OR_FORBIDDEN%' then
      raise;
    end if;
end $$;

-- S2: only the owner can submit; a stale version cannot close the packet.
do $$
begin
  perform public.submit_student_material('e1111111-1111-1111-1111-111111111111'::uuid, 2);
  raise exception 'Cross-family submission should fail';
exception when others then
  if sqlerrm not like '%MATERIAL_NOT_FOUND_OR_FORBIDDEN%' then raise; end if;
end $$;

set local "request.jwt.claims" = '{"sub": "c1111111-1111-1111-1111-111111111111"}';
do $$
declare v_result jsonb; v_repeated jsonb;
begin
  begin
    perform public.submit_feedback_and_request_next_material(
      'd1111111-1111-1111-1111-111111111111'::uuid,
      'e1111111-1111-1111-1111-111111111111'::uuid,
      3::smallint, 75, 'reading', '', '', '');
    raise exception 'Legacy feedback bypassed submission gate';
  exception when others then
    if sqlerrm not like '%MATERIAL_SUBMISSION_REQUIRED%' then raise; end if;
  end;
  begin
    insert into public.feedback(child_id,material_id,difficulty,completion_rate)
    values('d1111111-1111-1111-1111-111111111111'::uuid,
      'e1111111-1111-1111-1111-111111111111'::uuid,3,75);
    raise exception 'Direct feedback bypassed submission gate';
  exception when others then
    if sqlerrm not like '%MATERIAL_SUBMISSION_REQUIRED%' then raise; end if;
  end;
  if public.can_open_parent_answer('e1111111-1111-1111-1111-111111111111'::uuid) then
    raise exception 'Answer PDF unlocked before submission';
  end if;
  v_result := public.submit_student_material('e1111111-1111-1111-1111-111111111111'::uuid, 1);
  if v_result->>'conflict' != 'true' then raise exception 'Stale submission version accepted'; end if;
  v_result := public.submit_student_material('e1111111-1111-1111-1111-111111111111'::uuid, 2);
  if v_result->'results'->0->>'status' != 'correct'
    or v_result->'results'->1->>'status' != 'unanswered'
    or v_result->'results'->2->>'status' != 'open_review'
    or v_result->'results'->3->>'status' != 'incorrect'
    or v_result->'results'->4->>'status' != 'open_review' then
    raise exception 'Incorrect grading or unanswered classification: %', v_result;
  end if;
  if not public.can_open_parent_answer('e1111111-1111-1111-1111-111111111111'::uuid) then
    raise exception 'Answer PDF did not unlock after submission';
  end if;
  v_repeated := public.submit_student_material('e1111111-1111-1111-1111-111111111111'::uuid, 2);
  if v_repeated is distinct from v_result then raise exception 'Repeated submission changed snapshot'; end if;
  begin
    perform public.save_material_draft('e1111111-1111-1111-1111-111111111111'::uuid,
      '{"q1":"Music"}'::jsonb, '[]'::jsonb, 2);
    raise exception 'Submitted draft was editable';
  exception when others then
    if sqlerrm not like '%MATERIAL_ALREADY_SUBMITTED%' then raise; end if;
  end;
  if (select count(*) from public.feedback where material_id='e1111111-1111-1111-1111-111111111111'::uuid) <> 0 then
    raise exception 'Parent feedback was fabricated';
  end if;
  v_result := public.request_next_after_student_submission('e1111111-1111-1111-1111-111111111111'::uuid);
  if v_result->>'requested' != 'true' then raise exception 'Explicit request failed: %',v_result; end if;
  v_repeated := public.request_next_after_student_submission('e1111111-1111-1111-1111-111111111111'::uuid);
  if v_repeated->>'alreadyRequested' != 'true' then raise exception 'Repeated request not idempotent: %',v_repeated; end if;
  if public.get_student_material_submission('e1111111-1111-1111-1111-111111111111'::uuid)->>'next_requested' != 'true' then
    raise exception 'Reloaded submission omitted the requested state';
  end if;
  if not public.save_student_parent_feedback('e1111111-1111-1111-1111-111111111111'::uuid,
    3::smallint, 75, 'reading', '', '', '需要再練閱讀') then
    raise exception 'Optional feedback save failed';
  end if;
end $$;

reset role;
do $$ begin
  if private_generation.single_choice_letter('["One","Two"]', 'C') is not null
    or private_generation.single_choice_letter('["One","One"]', 'One') is not null
    or private_generation.single_choice_letter('["One","Two"]', 'A. Two') is not null
    or private_generation.single_choice_letter('["One","Two"]', 'B. Two') <> 'B' then
    raise exception 'Ambiguous single-choice grading';
  end if;
  if (select count(*) from public.material_generation_requests where source_material_id='e1111111-1111-1111-1111-111111111111'::uuid) <> 1 then
    raise exception 'Duplicate next-material request';
  end if;
  if (select count(*) from public.feedback where material_id='e1111111-1111-1111-1111-111111111111'::uuid) <> 1 then
    raise exception 'Optional feedback was not persisted';
  end if;
end $$;
-- S3 real context/normal claim boundaries, using the synthetic packet above.
do $$
declare capsule jsonb; batch jsonb; context jsonb; replay jsonb; v_job_id uuid; fingerprint text;
begin
  capsule := private_generation.student_performance_capsule(
    'd1111111-1111-1111-1111-111111111111',now(),'e1111111-1111-1111-1111-111111111111');
  if capsule->>'projectionVersion'<>'student-performance-v1'
    or capsule#>>'{recentSubmissions,0,counts,correct}'<>'1'
    or capsule#>>'{recentSubmissions,0,counts,incorrect}'<>'1'
    or capsule#>>'{recentSubmissions,0,counts,unanswered}'<>'1'
    or capsule#>>'{recentSubmissions,0,counts,ungraded}'<>'2'
    or jsonb_array_length(capsule->'items')<>3 then
    raise exception 'S3 status/context mismatch: %',capsule;
  end if;
  if capsule->'items' @> '[{"questionId":"q1"}]'
    or capsule->'items' @> '[{"questionId":"q2"}]'
    or not capsule->'items' @> '[{"questionId":"q5","responseUnitNotes":[{"responseUnitId":"q5-cell","responseNote":"A table answer"}],"status":"open_review"}]'
    or capsule->>'skillAttribution'<>'unknown_without_verified_mapping' then
    raise exception 'S3 fabricated weakness or lost structured response';
  end if;
  if capsule is distinct from private_generation.student_performance_capsule(
      'd1111111-1111-1111-1111-111111111111',now(),'e1111111-1111-1111-1111-111111111111') then
    raise exception 'S3 duplicate reading changes evidence';
  end if;
  if jsonb_array_length(private_generation.student_performance_capsule(
    'd2222222-2222-2222-2222-222222222222',now(),null)->'recentSubmissions')<>0
    or jsonb_array_length(private_generation.student_performance_capsule(
      'd1111111-1111-1111-1111-111111111111',now()-interval '1 second',null)->'recentSubmissions')<>0 then
    raise exception 'S3 crossed family or cutoff';
  end if;
  select r.generation_job_id into v_job_id from public.material_generation_requests r
    where r.source_material_id='e1111111-1111-1111-1111-111111111111';
  update public.profiles set last_active_at=now()
    where id='c1111111-1111-1111-1111-111111111111';
  batch := public.worker_claim_local_authoring_batch('synthetic-s3-normal');
  select s.generation_context,s.input_fingerprint into context,fingerprint
    from private_generation.generation_claim_snapshots s where s.job_id=v_job_id;
  if context is null or context#>'{learningMemory,studentPerformanceEvidence}' is distinct from capsule then
    raise exception 'S3 real normal claim did not freeze evidence: %',batch;
  end if;
  update public.feedback set parent_comments='Edited after claim'
    where material_id='e1111111-1111-1111-1111-111111111111';
  replay := public.worker_generation_context(v_job_id,'synthetic-s3-normal');
  if replay is distinct from context or fingerprint is distinct from
      'sha256:'||encode(extensions.digest(convert_to(context::text,'UTF8'),'sha256'),'hex') then
    raise exception 'S3 replay changed frozen feedback/evidence/fingerprint';
  end if;
  update private_generation.generation_claim_snapshots set generation_context=context-'learningMemory'
    where generation_claim_snapshots.job_id=v_job_id;
  replay := public.worker_generation_context(v_job_id,'synthetic-s3-normal');
  if replay ? 'learningMemory' then raise exception 'S3 injected into old in-flight claim'; end if;
  if has_function_privilege('authenticated','public.worker_generation_context(uuid,text)','execute')
    or has_function_privilege('anon','private_generation.student_performance_capsule(uuid,timestamptz,uuid)','execute') then
    raise exception 'S3 private evidence is browser callable';
  end if;
end $$;
-- Bounded detail and disjoint older aggregates; every fixture is rolled back.
do $$
declare packet_id uuid; questions jsonb; answers jsonb; results jsonb; capsule jsonb;
begin
  select jsonb_agg(jsonb_build_object('id','bounded-'||n,'prompt',repeat('長',1000),'itemType','single_choice','options',jsonb_build_array('One','Two'))),
    jsonb_object_agg('bounded-'||n,repeat('答',1000)),
    jsonb_agg(jsonb_build_object('question_id','bounded-'||n,'status','incorrect','correct_answer','One'))
    into questions,answers,results from generate_series(1,15) n;
  for i in 1..4 loop
    packet_id := extensions.gen_random_uuid();
    insert into public.materials(id,child_id,material_week,revision,rule_version,input_snapshot,
      student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary)
    values(packet_id,'d2222222-2222-2222-2222-222222222222',current_date-i,1,'synthetic-s3','{}',
      'synthetic/student.pdf','synthetic/answer.pdf',jsonb_build_object('studentLesson',jsonb_build_object(
        'practice',jsonb_build_array(jsonb_build_object('questions',questions)),
        'opening',jsonb_build_object('activity',jsonb_build_object('type','question','prompt','Reflect')))), '{}');
    insert into public.student_material_submissions(material_id,child_id,answers,self_check,results,submitted_at)
    values(packet_id,'d2222222-2222-2222-2222-222222222222',answers||'{"opening-reflection":"My reflection"}',
      '[]',results,now()-i*interval '1 hour');
  end loop;
  capsule := private_generation.student_performance_capsule('d2222222-2222-2222-2222-222222222222',now(),null);
  if jsonb_array_length(capsule->'recentSubmissions')<>3
    or jsonb_array_length(capsule->'items')>12
    or octet_length((capsule->'items')::text)>44000
    or (capsule->>'omittedDetailCount')::int<1
    or capsule#>>'{olderCounts,submissions}'<>'1'
    or capsule#>>'{olderCounts,incorrect}'<>'15' then
    raise exception 'S3 bounds or older aggregation failed';
  end if;
  -- Isolate answered opening reflection without inventing automatic grading.
  update public.student_material_submissions set results='[]',answers='{"opening-reflection":"My reflection"}'
    where material_id=packet_id;
  capsule := private_generation.student_performance_capsule('d2222222-2222-2222-2222-222222222222',now(),packet_id);
  if not capsule->'items' @> '[{"questionId":"opening-reflection","status":"open_review","responseNote":"My reflection","gradingBasis":"ungraded"}]' then
    raise exception 'S3 opening reflection evidence lost';
  end if;
end $$;
rollback;
