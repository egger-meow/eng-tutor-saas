-- LOCAL TEST ONLY: Verify get_parent_material_evidence_summary RPC
begin;

-- 1. Security privileges: anon forbidden, authenticated allowed
do $$
begin
  if has_function_privilege('anon', 'public.get_parent_material_evidence_summary(uuid)', 'execute') then
    raise exception 'Anonymous must not execute get_parent_material_evidence_summary';
  end if;
  if not has_function_privilege('authenticated', 'public.get_parent_material_evidence_summary(uuid)', 'execute') then
    raise exception 'Authenticated must be granted get_parent_material_evidence_summary';
  end if;
end $$;

-- 2. Setup test data
insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'evidence_p1@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'evidence_p2@example.com')
on conflict do nothing;

insert into public.profiles (id, display_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Parent 1'),
  ('22222222-2222-4222-8222-222222222222', 'Parent 2')
on conflict do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Child P1-A', 7, 'grade_7', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Child P2-B', 8, 'grade_8', true)
on conflict do nothing;

-- Material 1: Released, No submission, No feedback
insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary)
values (
  '10000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  current_date,
  1,
  '1.0.0',
  '{}'::jsonb,
  's1.pdf',
  'p1.pdf',
  '{"answers": []}'::jsonb,
  '{"personalizationReasons": ["重點加強過去式動詞", "配合自然科興趣設計"]}'::jsonb
);

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, feedback_cutoff_at, generation_due_at, completed_at, release_at
) values (
  '10000000-0000-4000-8000-000000000011',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '10000000-0000-4000-8000-000000000001',
  current_date,
  '1.0.0',
  'job_ev_1',
  'completed',
  (now() - interval '1 hour') - interval '72 hours',
  (now() - interval '1 hour') - interval '48 hours',
  (now() - interval '1 hour') - interval '24 hours',
  now() - interval '30 minutes',
  now() - interval '1 hour'
);

-- Material 2: Unreleased (release_at in future)
insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary)
values (
  '20000000-0000-4000-8000-000000000002',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  current_date + interval '7 days',
  1,
  '1.0.0',
  '{}'::jsonb,
  's2.pdf',
  'p2.pdf',
  '{"answers": []}'::jsonb,
  '{"personalizationReasons": ["未開放教材"]}'::jsonb
);

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, feedback_cutoff_at, generation_due_at, completed_at, release_at
) values (
  '20000000-0000-4000-8000-000000000022',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '20000000-0000-4000-8000-000000000002',
  current_date + interval '7 days',
  '1.0.0',
  'job_ev_2',
  'completed',
  (now() + interval '2 days') - interval '72 hours',
  (now() + interval '2 days') - interval '48 hours',
  (now() + interval '2 days') - interval '24 hours',
  now() - interval '5 minutes',
  now() + interval '2 days'
);

-- Material 3: Released, has student_material_submissions (2 correct, 1 incorrect, 1 unanswered, 1 open_review)
insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary)
values (
  '30000000-0000-4000-8000-000000000003',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  current_date - interval '7 days',
  1,
  '1.0.0',
  '{}'::jsonb,
  's3.pdf',
  'p3.pdf',
  '{"answers": []}'::jsonb,
  '{"personalizationReasons": ["延續動詞練習"]}'::jsonb
);

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, feedback_cutoff_at, generation_due_at, completed_at, release_at
) values (
  '30000000-0000-4000-8000-000000000033',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '30000000-0000-4000-8000-000000000003',
  current_date - interval '7 days',
  '1.0.0',
  'job_ev_3',
  'completed',
  (now() - interval '7 days') - interval '72 hours',
  (now() - interval '7 days') - interval '48 hours',
  (now() - interval '7 days') - interval '24 hours',
  now() - interval '7 days',
  now() - interval '7 days'
);

insert into public.student_material_submissions (material_id, child_id, answers, self_check, results, submitted_at)
values (
  '30000000-0000-4000-8000-000000000003',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '{"q1": "A", "q2": "B", "q4": "Free response"}'::jsonb,
  '[]'::jsonb,
  '[
    {"question_id": "q1", "status": "correct"},
    {"question_id": "q2", "status": "correct"},
    {"question_id": "q3", "status": "incorrect"},
    {"question_id": "q4", "status": "open_review"},
    {"question_id": "q5", "status": "unanswered"}
  ]'::jsonb,
  now() - interval '6 days'
);

-- Material 4: Released, paper feedback only (completion_rate = 75, difficulty = 3)
insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary)
values (
  '40000000-0000-4000-8000-000000000004',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  current_date - interval '14 days',
  1,
  '1.0.0',
  '{}'::jsonb,
  's4.pdf',
  'p4.pdf',
  '{"answers": []}'::jsonb,
  '{"personalizationReasons": ["首週評估"]}'::jsonb
);

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, feedback_cutoff_at, generation_due_at, completed_at, release_at
) values (
  '40000000-0000-4000-8000-000000000044',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '40000000-0000-4000-8000-000000000004',
  current_date - interval '14 days',
  '1.0.0',
  'job_ev_4',
  'completed',
  (now() - interval '14 days') - interval '72 hours',
  (now() - interval '14 days') - interval '48 hours',
  (now() - interval '14 days') - interval '24 hours',
  now() - interval '14 days',
  now() - interval '14 days'
);

-- Paper material allows direct feedback
update public.materials set answer_unlock_requires_submission = false where id = '40000000-0000-4000-8000-000000000004';

insert into public.feedback (child_id, material_id, difficulty, completion_rate, notes, created_at)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '40000000-0000-4000-8000-000000000004',
  3,
  75,
  '紙筆完成約七成',
  now() - interval '13 days'
);

-- Add learning evidence for Material 3
insert into public.child_learning_evidence (
  child_id, material_id, target_type, target_id, evidence_type, result, assessed, source, evidence_strength, observed_at, processor_version, idempotency_key
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '30000000-0000-4000-8000-000000000003',
  'grammar',
  'past-tense-regular',
  'captured_exercise_result',
  'correct',
  true,
  'submission',
  'primary',
  now() - interval '6 days',
  '1.0.0',
  'ev_target_1'
), (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '30000000-0000-4000-8000-000000000003',
  'grammar',
  'past-tense-irregular',
  'captured_exercise_result',
  'incorrect',
  true,
  'submission',
  'primary',
  now() - interval '6 days',
  '1.0.0',
  'ev_target_2'
);

-- 3. Execute tests under Parent 1 authenticated role
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';

-- Test Case A: Material 1 (no submission, no feedback)
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_parent_material_evidence_summary('10000000-0000-4000-8000-000000000001');
  if v_res is null then raise exception 'Expected non-null summary for released material 1'; end if;
  if v_res->>'source' <> 'none' then raise exception 'Expected source none, got %', v_res->>'source'; end if;
  if v_res->>'submittedAt' is not null then raise exception 'Expected submittedAt null'; end if;
  if (v_res->>'objectiveCorrect')::int <> 0 or (v_res->>'objectiveIncorrect')::int <> 0 then raise exception 'Expected 0 counts'; end if;
  if v_res->>'reportedCompletionRate' is not null then raise exception 'Expected reportedCompletionRate null'; end if;
  if jsonb_array_length(v_res->'adjustmentNotes') <> 2 then raise exception 'Expected 2 adjustmentNotes'; end if;
end $$;

-- Test Case B: Material 2 (unreleased)
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_parent_material_evidence_summary('20000000-0000-4000-8000-000000000002');
  if v_res is not null then raise exception 'Expected null for unreleased material'; end if;
end $$;

-- Test Case C: Material 3 (has submission + targets)
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_parent_material_evidence_summary('30000000-0000-4000-8000-000000000003');
  if v_res is null then raise exception 'Expected non-null summary for material 3'; end if;
  if v_res->>'source' <> 'student_submission' then raise exception 'Expected source student_submission, got %', v_res->>'source'; end if;
  if v_res->>'submittedAt' is null then raise exception 'Expected submittedAt to be set'; end if;
  if (v_res->>'objectiveCorrect')::int <> 2 then raise exception 'Expected 2 correct, got %', v_res->>'objectiveCorrect'; end if;
  if (v_res->>'objectiveIncorrect')::int <> 1 then raise exception 'Expected 1 incorrect, got %', v_res->>'objectiveIncorrect'; end if;
  if (v_res->>'unanswered')::int <> 1 then raise exception 'Expected 1 unanswered, got %', v_res->>'unanswered'; end if;
  if (v_res->>'openReview')::int <> 1 then raise exception 'Expected 1 openReview, got %', v_res->>'openReview'; end if;
  if jsonb_array_length(v_res->'targets') <> 2 then raise exception 'Expected 2 targets, got %', jsonb_array_length(v_res->'targets'); end if;
end $$;

-- Test Case D: Material 4 (paper feedback only)
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_parent_material_evidence_summary('40000000-0000-4000-8000-000000000004');
  if v_res is null then raise exception 'Expected non-null summary for material 4'; end if;
  if v_res->>'source' <> 'parent_report' then raise exception 'Expected source parent_report, got %', v_res->>'source'; end if;
  if (v_res->>'reportedCompletionRate')::int <> 75 then raise exception 'Expected reportedCompletionRate 75, got %', v_res->>'reportedCompletionRate'; end if;
  if (v_res->>'objectiveCorrect')::int <> 0 then raise exception 'Expected 0 objective correct for paper report'; end if;
end $$;

-- Test Case E: Cross-parent isolation (Parent 2 cannot access Parent 1 material)
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_parent_material_evidence_summary('30000000-0000-4000-8000-000000000003');
  if v_res is not null then raise exception 'Cross-parent access must return null'; end if;
end $$;

reset role;
rollback;
