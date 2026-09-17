begin;

do $$
declare
  test_user_id constant uuid := '11111111-1111-1111-1111-111111111111';
  test_child_id constant uuid := '22222222-2222-2222-2222-222222222222';
  test_sub_id constant uuid := '33333333-3333-3333-3333-333333333333';
  test_job_id constant uuid := '44444444-4444-4444-4444-444444444444';
  leases_res jsonb;
  recovery_res jsonb;
  start_conflict_caught boolean := false;
  start_res jsonb;
begin
  -- 1. Setup minimal test fixture
  insert into auth.users (id, email, raw_user_meta_data)
  values (test_user_id, 'authoring-lease-test@example.com', '{"display_name":"Lease Tester"}'::jsonb);

  update public.profiles
  set terms_version = '2026-08-26-v2', privacy_version = '2026-08-16-v1', legal_accepted_at = now(),
      last_active_at = now()
  where id = test_user_id;

  insert into public.children (id, parent_id, display_name, grade, is_active)
  values (test_child_id, test_user_id, 'Student Lease Test', 7, true);

  update public.subscriptions
  set status = 'active', current_period_end = now() + interval '30 days'
  where child_id = test_child_id;

  -- Delete any automatically created initial generation jobs for this test child
  delete from public.generation_jobs where child_id = test_child_id and id <> test_job_id;

  -- Create job in claimed status for worker-A
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status, claimed_by, lease_expires_at, attempt_count, max_attempts,
    scheduled_for, release_at, generation_due_at, feedback_cutoff_at
  ) values (
    test_job_id, test_child_id, current_date, 'curriculum-rules/1.0.0', 'test-lease-idem-1',
    'claimed', 'worker-test-A', now() + interval '2 hours', 1, 3,
    now() - interval '2 hours', now() + interval '24 hours', (now() + interval '24 hours') - interval '24 hours', (now() + interval '24 hours') - interval '48 hours'
  );

  insert into private_generation.generation_claim_snapshots (
    job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
  ) values (
    test_job_id, 'worker-test-A', jsonb_build_object('jobId', test_job_id), 'sha256:' || repeat('a', 64), now()
  );

  -- -------------------------------------------------------------------------
  -- Scenario 1: Unsubmitted claimed job IS an active authoring lease
  -- -------------------------------------------------------------------------
  leases_res := public.worker_get_active_generation_leases();
  if jsonb_array_length(leases_res) <> 1 then
    raise exception 'Expected 1 active lease before submission, got: %', leases_res;
  end if;
  if leases_res->0->>'jobId' <> test_job_id::text or leases_res->0->>'workerId' <> 'worker-test-A' then
    raise exception 'Unexpected active lease payload before submission: %', leases_res;
  end if;

  recovery_res := private_generation.chatgpt_recover_claimed_generation_batch('worker-test-A');
  if (recovery_res->>'claimedCount')::integer <> 1 then
    raise exception 'Expected claimedCount = 1 before submission, got: %', recovery_res;
  end if;

  -- worker-test-B attempting to start must hit ACTIVE_AUTHORING_LEASE_CONFLICT
  begin
    perform public.worker_start_authoring_batch('worker-test-B');
  exception when others then
    if sqlerrm like '%ACTIVE_AUTHORING_LEASE_CONFLICT%' then
      start_conflict_caught := true;
    else
      raise exception 'Expected ACTIVE_AUTHORING_LEASE_CONFLICT, got: %', sqlerrm;
    end if;
  end;
  if not start_conflict_caught then
    raise exception 'Expected ACTIVE_AUTHORING_LEASE_CONFLICT was not thrown before submission';
  end if;

  -- -------------------------------------------------------------------------
  -- Scenario 2: Immutable submission submitted for attempt 1
  -- Job remains status = claimed, lease_expires_at > now()
  -- -------------------------------------------------------------------------
  insert into private_generation.curriculum_submissions (
    job_id, authoring_attempt, generation_worker_id, canonical_source, status, submitted_at, updated_at
  ) values (
    test_job_id, 1, 'worker-test-A', '{"metadata":{"schemaVersion":"2.4.0"}}'::jsonb, 'pending', now(), now()
  );

  -- -------------------------------------------------------------------------
  -- Scenario 3: After submission, job is NOT an active authoring lease
  -- -------------------------------------------------------------------------
  leases_res := public.worker_get_active_generation_leases();
  if jsonb_array_length(leases_res) <> 0 then
    raise exception 'Expected 0 active leases after submission, got: %', leases_res;
  end if;

  recovery_res := private_generation.chatgpt_recover_claimed_generation_batch('worker-test-A');
  if (recovery_res->>'claimedCount')::integer <> 0 then
    raise exception 'Expected claimedCount = 0 after submission, got: %', recovery_res;
  end if;

  -- worker-test-B starting a batch must NOT conflict (proceeds to claim, zero pending jobs)
  start_res := public.worker_start_authoring_batch('worker-test-B');
  if (start_res->>'claimedCount')::integer <> 0 then
    raise exception 'Expected claimedCount = 0 from new claim, got: %', start_res;
  end if;

  -- -------------------------------------------------------------------------
  -- Scenario 4: Re-authoring retry (attempt_count incremented to 2)
  -- Before attempt 2 submission, it must become active authoring lease again
  -- -------------------------------------------------------------------------
  update public.generation_jobs
  set attempt_count = 2, claimed_by = 'worker-test-A', lease_expires_at = now() + interval '2 hours'
  where id = test_job_id;

  leases_res := public.worker_get_active_generation_leases();
  if jsonb_array_length(leases_res) <> 1 then
    raise exception 'Expected 1 active lease on attempt 2 before submission, got: %', leases_res;
  end if;

  -- worker-test-B must conflict again
  start_conflict_caught := false;
  begin
    perform public.worker_start_authoring_batch('worker-test-B');
  exception when others then
    if sqlerrm like '%ACTIVE_AUTHORING_LEASE_CONFLICT%' then
      start_conflict_caught := true;
    else
      raise exception 'Expected ACTIVE_AUTHORING_LEASE_CONFLICT on retry, got: %', sqlerrm;
    end if;
  end;
  if not start_conflict_caught then
    raise exception 'Expected ACTIVE_AUTHORING_LEASE_CONFLICT was not thrown on attempt 2';
  end if;

  -- Now submit attempt 2
  insert into private_generation.curriculum_submissions (
    job_id, authoring_attempt, generation_worker_id, canonical_source, status, submitted_at, updated_at
  ) values (
    test_job_id, 2, 'worker-test-A', '{"metadata":{"schemaVersion":"2.4.0"}}'::jsonb, 'pending', now(), now()
  );

  leases_res := public.worker_get_active_generation_leases();
  if jsonb_array_length(leases_res) <> 0 then
    raise exception 'Expected 0 active leases after attempt 2 submission, got: %', leases_res;
  end if;

  raise notice 'PASS: all authoring unsubmitted lease exclusion invariants verified';
end $$;

rollback;
