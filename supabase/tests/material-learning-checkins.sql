-- LOCAL TEST ONLY: Verify material_learning_checkins table and RPCs
begin;

-- 1. Security privileges: anon forbidden, authenticated allowed
do $$
begin
  if has_function_privilege('anon', 'public.get_material_learning_checkin(uuid)', 'execute') then
    raise exception 'Anonymous must not execute get_material_learning_checkin';
  end if;
  if has_function_privilege('anon', 'public.save_material_learning_checkin(uuid, text, text)', 'execute') then
    raise exception 'Anonymous must not execute save_material_learning_checkin';
  end if;
  if not has_function_privilege('authenticated', 'public.get_material_learning_checkin(uuid)', 'execute') then
    raise exception 'Authenticated must be granted get_material_learning_checkin';
  end if;
  if not has_function_privilege('authenticated', 'public.save_material_learning_checkin(uuid, text, text)', 'execute') then
    raise exception 'Authenticated must be granted save_material_learning_checkin';
  end if;
end $$;

-- 2. Setup test data
insert into auth.users (id, email)
values
  ('33333333-3333-4333-8333-333333333333', 'checkin_p1@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'checkin_p2@example.com')
on conflict do nothing;

insert into public.profiles (id, display_name)
values
  ('33333333-3333-4333-8333-333333333333', 'Parent C1'),
  ('44444444-4444-4444-8444-444444444444', 'Parent C2')
on conflict do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Child C1-A', 7, 'grade_7', true),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Child C2-B', 8, 'grade_8', true)
on conflict do nothing;

-- Online Material: Released, answer_unlock_requires_submission = true
insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, answer_unlock_requires_submission)
values (
  '50000000-0000-4000-8000-000000000005',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  current_date,
  1,
  '1.0.0',
  '{}'::jsonb,
  's5.pdf',
  'p5.pdf',
  '{}'::jsonb,
  true
);

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, feedback_cutoff_at, generation_due_at, completed_at, release_at
) values (
  '50000000-0000-4000-8000-000000000055',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '50000000-0000-4000-8000-000000000005',
  current_date,
  '1.0.0',
  'job_chk_1',
  'completed',
  (now() - interval '1 hour') - interval '72 hours',
  (now() - interval '1 hour') - interval '48 hours',
  (now() - interval '1 hour') - interval '24 hours',
  now() - interval '30 minutes',
  now() - interval '1 hour'
);

-- Paper Material: Released, answer_unlock_requires_submission = false
insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, answer_unlock_requires_submission)
values (
  '60000000-0000-4000-8000-000000000006',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  current_date - interval '7 days',
  1,
  '1.0.0',
  '{}'::jsonb,
  's6.pdf',
  'p6.pdf',
  '{}'::jsonb,
  false
);

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, feedback_cutoff_at, generation_due_at, completed_at, release_at
) values (
  '60000000-0000-4000-8000-000000000066',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '60000000-0000-4000-8000-000000000006',
  current_date - interval '7 days',
  '1.0.0',
  'job_chk_2',
  'completed',
  (now() - interval '7 days') - interval '72 hours',
  (now() - interval '7 days') - interval '48 hours',
  (now() - interval '7 days') - interval '24 hours',
  now() - interval '7 days',
  now() - interval '7 days'
);

-- 3. Execute tests under Parent 1
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';

-- Test Case A: Read empty checkin returns null
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_material_learning_checkin('50000000-0000-4000-8000-000000000005');
  if v_res is not null then raise exception 'Expected null for fresh checkin'; end if;
end $$;

-- Test Case B: Save barrier on online material
do $$
declare
  v_res jsonb;
begin
  v_res := public.save_material_learning_checkin('50000000-0000-4000-8000-000000000005', 'barrier', 'no_time');
  if v_res->>'barrier' <> 'no_time' then raise exception 'Expected barrier no_time, got %', v_res->>'barrier'; end if;
  
  v_res := public.get_material_learning_checkin('50000000-0000-4000-8000-000000000005');
  if v_res->>'barrier' <> 'no_time' then raise exception 'Expected get to return no_time'; end if;
end $$;

-- Test Case C: Invalid barrier rejected
do $$
begin
  perform public.save_material_learning_checkin('50000000-0000-4000-8000-000000000005', 'barrier', 'free_text_invalid');
  raise exception 'Invalid barrier should have been rejected';
exception
  when others then
    if sqlerrm not like '%INVALID_BARRIER%' then raise; end if;
end $$;

-- Test Case D: paper_started rejected on online material (answer_unlock_requires_submission = true)
do $$
begin
  perform public.save_material_learning_checkin('50000000-0000-4000-8000-000000000005', 'paper_started');
  raise exception 'paper_started should be rejected on online material';
exception
  when others then
    if sqlerrm not like '%PAPER_STARTED_NOT_PERMITTED%' then raise; end if;
end $$;

-- Test Case E: paper_started accepted on paper material (answer_unlock_requires_submission = false)
do $$
declare
  v_res jsonb;
  v_first_time timestamptz;
begin
  v_res := public.save_material_learning_checkin('60000000-0000-4000-8000-000000000006', 'paper_started');
  if v_res->>'paper_started_at' is null then raise exception 'Expected paper_started_at to be set'; end if;
  v_first_time := (v_res->>'paper_started_at')::timestamptz;

  -- Repeat call must not change initial timestamp
  perform pg_sleep(0.01);
  v_res := public.save_material_learning_checkin('60000000-0000-4000-8000-000000000006', 'paper_started');
  if (v_res->>'paper_started_at')::timestamptz <> v_first_time then
    raise exception 'Repeat paper_started must preserve original timestamp';
  end if;
end $$;

-- Test Case F: Dismiss sets 7 days
do $$
declare
  v_res jsonb;
  v_dismiss timestamptz;
begin
  v_res := public.save_material_learning_checkin('50000000-0000-4000-8000-000000000005', 'dismiss');
  if v_res->>'dismissed_until' is null then raise exception 'Expected dismissed_until set'; end if;
  v_dismiss := (v_res->>'dismissed_until')::timestamptz;
  if v_dismiss < now() + interval '6 days' or v_dismiss > now() + interval '8 days' then
    raise exception 'Expected dismissal approximately 7 days from now, got %', v_dismiss;
  end if;
end $$;

-- Test Case G: Foreign parent isolation
set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
do $$
declare
  v_res jsonb;
begin
  v_res := public.get_material_learning_checkin('50000000-0000-4000-8000-000000000005');
  if v_res is not null then raise exception 'Foreign parent must not read checkin'; end if;

  begin
    perform public.save_material_learning_checkin('50000000-0000-4000-8000-000000000005', 'dismiss');
    raise exception 'Foreign parent must not save checkin';
  exception
    when others then
      if sqlerrm not like '%MATERIAL_NOT_FOUND_OR_FORBIDDEN%' then raise; end if;
  end;
end $$;

reset role;
rollback;
