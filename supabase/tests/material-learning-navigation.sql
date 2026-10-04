-- ============================================================================
-- Material Learning Navigation & Day Signals Test Suite
-- ============================================================================

begin;

-- 1. Setup fixture parents & children
insert into auth.users (id, email)
values
  ('a1111111-1111-1111-1111-111111111111', 'nav_parent_a@example.com'),
  ('a2222222-2222-2222-2222-222222222222', 'nav_parent_b@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('a1111111-1111-1111-1111-111111111111', 'Nav Parent A'),
  ('a2222222-2222-2222-2222-222222222222', 'Nav Parent B')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active, is_internal_test)
values
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Nav Child A', 7, 'grade_7', true, false),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Nav Child B', 7, 'grade_7', true, false),
  ('b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Nav Child Internal', 7, 'grade_7', true, true)
on conflict (id) do nothing;

-- 2. Setup fixture materials (one released for Child A, one unreleased for Child A, one released for Child B)
insert into public.materials (
  id, child_id, material_week, revision, rule_version, input_snapshot,
  student_pdf_path, parent_answer_pdf_path
) values
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', current_date, 1, '1.0.0', '{}'::jsonb, 's1.pdf', 'p1.pdf'),
  ('c2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', current_date + 7, 1, '1.0.0', '{}'::jsonb, 's2.pdf', 'p2.pdf'),
  ('c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', current_date, 1, '1.0.0', '{}'::jsonb, 's3.pdf', 'p3.pdf'),
  ('c4444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', current_date, 1, '1.0.0', '{}'::jsonb, 's4.pdf', 'p4.pdf')
on conflict (id) do nothing;

insert into public.generation_jobs (
  id, child_id, material_id, material_week, rule_version, scheduled_for, feedback_cutoff_at, generation_due_at, idempotency_key, status, completed_at, release_at
) values
  ('d1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', current_date, '1.0.0', (now() - interval '1 hour') - interval '72 hours', (now() - interval '1 hour') - interval '48 hours', (now() - interval '1 hour') - interval '24 hours', 'job-1', 'completed', now(), now() - interval '1 hour'),
  ('d2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', current_date + 7, '1.0.0', (now() + interval '2 days') - interval '72 hours', (now() + interval '2 days') - interval '48 hours', (now() + interval '2 days') - interval '24 hours', 'job-2', 'completed', now(), now() + interval '2 days'),
  ('d3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', current_date, '1.0.0', (now() - interval '1 hour') - interval '72 hours', (now() - interval '1 hour') - interval '48 hours', (now() - interval '1 hour') - interval '24 hours', 'job-3', 'completed', now(), now() - interval '1 hour'),
  ('d4444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', current_date, '1.0.0', (now() - interval '1 hour') - interval '72 hours', (now() - interval '1 hour') - interval '48 hours', (now() - interval '1 hour') - interval '24 hours', 'job-4', 'completed', now(), now() - interval '1 hour')
on conflict (id) do nothing;

-- 3. Anonymous caller test
set local role anon;
do $$
begin
  perform public.get_material_learning_navigation('c1111111-1111-1111-1111-111111111111');
  raise exception 'Anon should not be permitted to execute get_material_learning_navigation';
exception
  when insufficient_privilege then null;
end $$;

-- 4. Authenticated Parent A test
set local role authenticated;
set local "request.jwt.claim.sub" = 'a1111111-1111-1111-1111-111111111111';

-- Initial get navigation should return null
do $$
declare v_res jsonb;
begin
  v_res := public.get_material_learning_navigation('c1111111-1111-1111-1111-111111111111');
  if v_res is not null then
    raise exception 'Expected null navigation for new material, got %', v_res;
  end if;
end $$;

-- Unreleased material should return null
do $$
declare v_res jsonb;
begin
  v_res := public.get_material_learning_navigation('c2222222-2222-2222-2222-222222222222');
  if v_res is not null then
    raise exception 'Unreleased material should return null navigation';
  end if;
end $$;

-- Another parent's material should return null
do $$
declare v_res jsonb;
begin
  v_res := public.get_material_learning_navigation('c3333333-3333-3333-3333-333333333333');
  if v_res is not null then
    raise exception 'Other parent material should return null navigation';
  end if;
end $$;

-- Invalid chapter should fail
do $$
begin
  perform public.save_material_learning_navigation('c1111111-1111-1111-1111-111111111111', 'invalid_chapter', null, 0);
  raise exception 'Expected error for invalid chapter';
exception
  when others then
    if sqlerrm not like '%INVALID_CHAPTER_ID%' then raise; end if;
end $$;

-- Save initial navigation position: reading chapter, client_version 0
do $$
declare v_save jsonb;
begin
  v_save := public.save_material_learning_navigation('c1111111-1111-1111-1111-111111111111', 'reading', null, 0);
  if (v_save->>'success')::boolean is not true or (v_save->>'version')::bigint <> 1 or (v_save->>'chapter_id') <> 'reading' then
    raise exception 'Initial navigation save failed: %', v_save;
  end if;
end $$;

-- Get navigation should now return chapter 'reading' and version 1
do $$
declare v_res jsonb;
begin
  v_res := public.get_material_learning_navigation('c1111111-1111-1111-1111-111111111111');
  if (v_res->>'chapter_id') <> 'reading' or (v_res->>'version')::bigint <> 1 then
    raise exception 'Unexpected saved navigation: %', v_res;
  end if;
end $$;

-- Outdated version conflict: trying to save with client_version 0 when current is 1
do $$
declare v_save jsonb;
begin
  v_save := public.save_material_learning_navigation('c1111111-1111-1111-1111-111111111111', 'practice', 'q1', 0);
  if (v_save->>'success')::boolean is not false or (v_save->>'conflict')::boolean is not true then
    raise exception 'Expected conflict on stale version: %', v_save;
  end if;
end $$;

-- Save next position with matching version 1 -> version 2
do $$
declare v_save jsonb;
begin
  v_save := public.save_material_learning_navigation('c1111111-1111-1111-1111-111111111111', 'practice', 'q1', 1);
  if (v_save->>'success')::boolean is not true or (v_save->>'version')::bigint <> 2 or (v_save->>'question_id') <> 'q1' then
    raise exception 'Second navigation save failed: %', v_save;
  end if;
end $$;

-- 5. Day signals test via save_material_draft
-- Save draft with answers -> should create day signal
do $$
declare v_draft jsonb;
begin
  v_draft := public.save_material_draft('c1111111-1111-1111-1111-111111111111', '{"q1": "answer A"}'::jsonb, '[]'::jsonb, 0);
  if (v_draft->>'success')::boolean is not true then
    raise exception 'Draft save failed: %', v_draft;
  end if;
end $$;

-- Check day signal row exists
set local role postgres;
do $$
declare v_count int;
begin
  select count(*) into v_count from public.material_learning_day_signals
  where material_id = 'c1111111-1111-1111-1111-111111111111' and signal_name = 'answer_changed';
  if v_count <> 1 then
    raise exception 'Expected 1 day signal, found %', v_count;
  end if;
end $$;

-- Save draft with same answers -> should NOT create duplicate signal
set local role authenticated;
set local "request.jwt.claim.sub" = 'a1111111-1111-1111-1111-111111111111';
do $$
declare v_draft jsonb;
begin
  v_draft := public.save_material_draft('c1111111-1111-1111-1111-111111111111', '{"q1": "answer A"}'::jsonb, '[]'::jsonb, 1);
  if (v_draft->>'success')::boolean is not true then
    raise exception 'Second draft save failed: %', v_draft;
  end if;
end $$;

set local role postgres;
do $$
declare v_count int;
begin
  select count(*) into v_count from public.material_learning_day_signals
  where material_id = 'c1111111-1111-1111-1111-111111111111' and signal_name = 'answer_changed';
  if v_count <> 1 then
    raise exception 'Expected still 1 day signal, found %', v_count;
  end if;
end $$;

-- Internal test child should NOT create day signal
set local role authenticated;
set local "request.jwt.claim.sub" = 'a1111111-1111-1111-1111-111111111111';
do $$
declare v_draft jsonb;
begin
  v_draft := public.save_material_draft('c4444444-4444-4444-4444-444444444444', '{"q1": "answer A"}'::jsonb, '[]'::jsonb, 0);
  if (v_draft->>'success')::boolean is not true then
    raise exception 'Internal child draft save failed: %', v_draft;
  end if;
end $$;

set local role postgres;
do $$
declare v_count int;
begin
  select count(*) into v_count from public.material_learning_day_signals
  where material_id = 'c4444444-4444-4444-4444-444444444444';
  if v_count <> 0 then
    raise exception 'Internal child should not have day signals, found %', v_count;
  end if;
end $$;

-- Purge function test
do $$
declare v_purged bigint;
begin
  -- Backdate a signal
  insert into public.material_learning_day_signals (material_id, signal_date, signal_name, created_at)
  values ('c3333333-3333-3333-3333-333333333333', '2026-01-01', 'answer_changed', now() - interval '100 days')
  on conflict do nothing;

  v_purged := public.purge_expired_material_learning_day_signals();
  if v_purged < 1 then
    raise exception 'Expected at least 1 purged day signal, got %', v_purged;
  end if;
end $$;

rollback;
