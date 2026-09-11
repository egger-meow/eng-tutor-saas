-- ============================================================================
-- Direct Assessment Single Active Session & Concurrency Regression Tests
-- ============================================================================

begin;

-- Seed Parent and Children
insert into auth.users (id, email)
values
  ('b1000000-0000-0000-0000-000000000001', 'concurrency-parent-1@example.com'),
  ('b2000000-0000-0000-0000-000000000002', 'concurrency-parent-2@example.com')
on conflict (id) do nothing;

insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
values
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Concurrent Child 1', 7, 'grade_7', true),
  ('f2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Concurrent Child 2', 8, 'grade_8', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Scenario 1: Partial Unique Index Enforces Single Active Session
-- ----------------------------------------------------------------------------
do $$
declare
  v_child_1 uuid := 'f1000000-0000-0000-0000-000000000001';
  v_session_1 uuid := 'e1000000-0000-0000-0000-000000000001';
  v_session_2 uuid := 'e2000000-0000-0000-0000-000000000002';
  v_err_caught boolean := false;
  v_sqlstate text;
begin
  -- 1. First in_progress session insert succeeds
  insert into public.assessment_sessions (
    id, child_id, status, target_item_count, items_completed, max_items, provisional_state
  ) values (
    v_session_1, v_child_1, 'in_progress', 18, 0, 25, '{"current_item_id": "voc_core_01"}'::jsonb
  );

  -- 2. Second in_progress session insert for the same child MUST fail closed with unique_violation (23505)
  v_err_caught := false;
  begin
    insert into public.assessment_sessions (
      id, child_id, status, target_item_count, items_completed, max_items, provisional_state
    ) values (
      v_session_2, v_child_1, 'in_progress', 18, 0, 25, '{"current_item_id": "voc_core_02"}'::jsonb
    );
  exception when unique_violation then
    v_err_caught := true;
  end;

  if not v_err_caught then
    raise exception 'Scenario 1 failed: DB permitted duplicate in_progress session for the same child!';
  end if;

  -- 3. Transition session 1 to completed
  update public.assessment_sessions
  set status = 'completed',
      completed_at = now(),
      final_result = '{"overallNarrativeZh": "完成"}'::jsonb
  where id = v_session_1;

  -- 4. Now inserting a new in_progress session succeeds (only one active session)
  insert into public.assessment_sessions (
    id, child_id, status, target_item_count, items_completed, max_items, provisional_state
  ) values (
    v_session_2, v_child_1, 'in_progress', 18, 0, 25, '{"current_item_id": "voc_core_02"}'::jsonb
  );

  -- 5. Attempting to update completed session back to in_progress while session 2 is in_progress fails
  v_err_caught := false;
  begin
    update public.assessment_sessions
    set status = 'in_progress', completed_at = null, final_result = null
    where id = v_session_1;
  exception when unique_violation then
    v_err_caught := true;
  end;

  if not v_err_caught then
    raise exception 'Scenario 1 failed: DB permitted update that created duplicate in_progress session!';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 2: Two Simultaneous Initial Start Calls Return the Same Session
-- ----------------------------------------------------------------------------
do $$
declare
  v_child_2 uuid := 'f2000000-0000-0000-0000-000000000002';
  v_call_1 jsonb;
  v_call_2 jsonb;
  v_active_count integer;
begin
  perform set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- Call start_or_resume_assessment_session twice consecutively/concurrently
  v_call_1 := public.start_or_resume_assessment_session(v_child_2);
  v_call_2 := public.start_or_resume_assessment_session(v_child_2);

  -- Both calls must return valid in_progress payloads with the EXACT same session ID
  if (v_call_1->>'status') <> 'in_progress' or (v_call_2->>'status') <> 'in_progress' then
    raise exception 'Scenario 2 failed: start calls did not return in_progress: call1=%, call2=%', v_call_1, v_call_2;
  end if;

  if (v_call_1->>'sessionId') <> (v_call_2->>'sessionId') then
    raise exception 'Scenario 2 failed: duplicate sessions created! id1=%, id2=%', v_call_1->>'sessionId', v_call_2->>'sessionId';
  end if;

  -- DB must have exactly ONE in_progress session for this child
  select count(*) into v_active_count
  from public.assessment_sessions
  where child_id = v_child_2 and status = 'in_progress';

  if v_active_count <> 1 then
    raise exception 'Scenario 2 failed: expected 1 active session, found %', v_active_count;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Scenario 3: Two Simultaneous Eligible Retake Calls Return the Same Session
-- ----------------------------------------------------------------------------
do $$
declare
  v_child_2 uuid := 'f2000000-0000-0000-0000-000000000002';
  v_initial_session_id uuid;
  v_retake_1 jsonb;
  v_retake_2 jsonb;
  v_resume_call jsonb;
  v_active_count integer;
begin
  perform set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- Complete initial session 95 days ago (> 90 days cooldown)
  select id into v_initial_session_id
  from public.assessment_sessions
  where child_id = v_child_2 and status = 'in_progress';

  update public.assessment_sessions
  set status = 'completed',
      completed_at = now() - interval '95 days',
      items_completed = 18,
      final_result = '{"overallNarrativeZh": "Initial completed"}'::jsonb
  where id = v_initial_session_id;

  -- Call start_assessment_retake twice
  v_retake_1 := public.start_assessment_retake(v_child_2);
  v_retake_2 := public.start_assessment_retake(v_child_2);

  -- Both calls must return in_progress status with the exact same new session ID
  if (v_retake_1->>'status') <> 'in_progress' or (v_retake_2->>'status') <> 'in_progress' then
    raise exception 'Scenario 3 failed: retake calls did not return in_progress: r1=%, r2=%', v_retake_1, v_retake_2;
  end if;

  if (v_retake_1->>'sessionId') <> (v_retake_2->>'sessionId') then
    raise exception 'Scenario 3 failed: duplicate retake sessions created! id1=%, id2=%', v_retake_1->>'sessionId', v_retake_2->>'sessionId';
  end if;

  if (v_retake_1->>'sessionId')::uuid = v_initial_session_id then
    raise exception 'Scenario 3 failed: retake returned initial completed session instead of a new retake session';
  end if;

  -- DB must have exactly ONE in_progress session for this child
  select count(*) into v_active_count
  from public.assessment_sessions
  where child_id = v_child_2 and status = 'in_progress';

  if v_active_count <> 1 then
    raise exception 'Scenario 3 failed: expected 1 active retake session, found %', v_active_count;
  end if;

  -- Calling normal start_or_resume_assessment_session also safely resumes this retake session
  v_resume_call := public.start_or_resume_assessment_session(v_child_2);
  if (v_resume_call->>'sessionId') <> (v_retake_1->>'sessionId') or (v_resume_call->>'status') <> 'in_progress' then
    raise exception 'Scenario 3 failed: start_or_resume did not resume active retake: %', v_resume_call;
  end if;

  -- Verify initial completed session remains immutable
  if not exists (
    select 1 from public.assessment_sessions
    where id = v_initial_session_id
      and status = 'completed'
      and final_result = '{"overallNarrativeZh": "Initial completed"}'::jsonb
  ) then
    raise exception 'Scenario 3 failed: initial completed session was mutated!';
  end if;

  raise notice 'PASS: all Direct Assessment single active session and concurrency scenarios verified';
end;
$$;

rollback;
