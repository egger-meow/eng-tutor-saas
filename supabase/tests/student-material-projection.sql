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
            jsonb_build_object('id', 'q1', 'prompt', 'What did they hear?', 'itemType', 'inference', 'options', jsonb_build_array('A sound', 'Music', 'Silence', 'Nothing'), 'correctAnswer', 'SECRET_NESTED_ANSWER')
          )
        )
      ),
      'homework', jsonb_build_object('purposeZh', '延遲複習', 'estimatedMinutes', 15, 'questions', '[]'::jsonb)
    ),
    'answers', jsonb_build_array(
      jsonb_build_object('questionId', 'q1', 'answer', 'A sound', 'explanationZh', '秘密解答')
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
    '{"q1": "A sound", "open-1": "My reflection"}'::jsonb,
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
    '{"q1": "A sound", "open-1": "Updated reflection"}'::jsonb,
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

reset role;
rollback;
