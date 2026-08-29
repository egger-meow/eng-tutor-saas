begin;

do $$
declare
  claimed_count integer;
  visible_count integer;
  changed_count integer;
  blocked boolean := false;
  observation_first boolean;
  observation_second boolean;
  bridge_job_id uuid;
  bridge_child_id uuid;
  bridge_claim_result jsonb;
  bridge_context jsonb;
  progression_context jsonb;
  bridge_fingerprint text;
  bridge_submit_result jsonb;
  bridge_attempt_before integer;
  bridge_submission_count integer;
  first_package jsonb;
  second_package jsonb;
  completed_material_id uuid;
  recovery_job_id uuid;
  recovery_child_id uuid;
  recovery_status_result jsonb;
  recovery_release_result jsonb;
  founder_claim_id uuid;
begin
  insert into auth.users (id, raw_user_meta_data)
  values (
    '00000000-0000-0000-0000-000000000001',
    '{"display_name":"Migration Test"}'::jsonb
  );
  update public.profiles
  set terms_version = '2026-08-26-v2', privacy_version = '2026-08-16-v1', legal_accepted_at = now()
  where id = '00000000-0000-0000-0000-000000000001';

  insert into public.children (id, parent_id, display_name, grade)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Test Student',
    7
  );

  if not exists (
    select 1
    from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000002'
      and provider = 'beta'
      and status = 'trialing'
  ) then
    raise exception 'new child did not receive a beta trial entitlement';
  end if;

  select founding_claim_id into founder_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'standard_monthly',
    '2026-08-26-v2'
  );
  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    founder_claim_id,
    'txn_checkout_smoke'
  );
  if (
    select founding_status from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000002'
  ) <> 'none' then
    raise exception 'new child had non-none founding status before checkout';
  end if;

  perform public.process_paddle_subscription_event_v2(
    'evt_checkout_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000002',
    'sub_checkout_smoke', 'ctm_checkout_smoke', 'active',
    'standard_monthly', 'month', 499,
    now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, true,
    founder_claim_id, 'txn_checkout_smoke'
  );
  if not exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000002'
      and provider = 'paddle'
      and status = 'active'
      and founding_status = 'redeemed'
  ) then
    raise exception 'Paddle webhook did not activate and redeem founding subscription';
  end if;

  if not exists (
    select 1 from public.subscription_lifecycle_events
    where child_id = '00000000-0000-0000-0000-000000000002'
      and event_type = 'trial_started' and source = 'internal_beta'
  ) then
    raise exception 'subscription lifecycle did not record the internal beta trial';
  end if;
  if not exists (
    select 1 from public.subscription_lifecycle_events
    where child_id = '00000000-0000-0000-0000-000000000002'
      and event_type = 'activated' and source = 'paddle_webhook'
      and source_event_id = 'evt_checkout_smoke'
  ) then
    raise exception 'subscription lifecycle did not record the Paddle activation';
  end if;
  if has_table_privilege('authenticated', 'public.subscription_lifecycle_events', 'select')
    or has_table_privilege('service_role', 'public.subscription_lifecycle_events', 'update')
    or has_table_privilege('service_role', 'public.subscription_lifecycle_events', 'delete') then
    raise exception 'subscription lifecycle append-only grants are incorrect';
  end if;
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Annual Test Student',
    8,
    'grade_8'
  );

  if (
    select founding_status from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
  ) <> 'none' then
    raise exception 'new trial student was incorrectly allocated founding status on creation';
  end if;

  perform public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'standard_annual',
    '2026-08-26-v2'
  );

  -- Annual subscription with Founder discount passed does NOT receive Founder redemption (remains none).
  perform public.process_paddle_subscription_event_v2(
    'evt_annual_founder_discount_rejected', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', false,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, false,
    null, null
  );
  if (
    select founding_status from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
  ) <> 'none' then
    raise exception 'annual subscription accepted the configured Founder discount';
  end if;

  perform public.process_paddle_subscription_event_v2(
    'evt_annual_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', false,
    'dsc_founder', null, null, null, null, false,
    null, null
  );
  if not exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
      and plan_code = 'standard_annual'
      and billing_interval = 'year'
      and price_twd = 4999
      and founding_status = 'none'
  ) then
    raise exception 'annual Paddle webhook did not persist canonical plan data';
  end if;

  perform public.process_paddle_subscription_event_v2(
    'evt_annual_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', false,
    'dsc_founder', null, null, null, null, false,
    null, null
  );
  if (
    select count(*) from public.billing_webhook_events
    where event_id = 'evt_annual_smoke'
  ) <> 1 then
    raise exception 'duplicate Paddle event was not idempotent';
  end if;

  blocked := false;
  begin
    perform public.process_paddle_subscription_event(
      'evt_second_subscription_smoke', 'subscription.created', now(),
      '00000000-0000-0000-0000-000000000004',
      'sub_annual_duplicate', 'ctm_checkout_smoke', 'active',
      'standard_annual', 'year', 4999,
      now(), now() + interval '1 year', false,
    'dsc_founder', null, null, null, null, false
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'second active Paddle subscription replaced the child subscription';
  end if;

  blocked := false;
  begin
    perform public.process_paddle_subscription_event(
      'evt_invalid_annual_smoke', 'subscription.updated', now(),
      '00000000-0000-0000-0000-000000000004',
      'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
      'standard_annual', 'month', 499,
      now(), now() + interval '1 month', false,
    'dsc_founder', null, null, null, null, false
    );
  exception when others then
    blocked := true;
  end;
  perform public.process_paddle_subscription_event(
    'evt_cancel_smoke', 'subscription.updated', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', true,
    'dsc_founder', null, null, null, null, false
  );
  if (
    select cancel_at_period_end from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
  ) <> true then
    raise exception 'cancel webhook did not set cancel_at_period_end to true';
  end if;

  perform public.process_paddle_subscription_event(
    'evt_resume_smoke', 'subscription.updated', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', false,
    'dsc_founder', null, null, null, null, false
  );
  if (
    select cancel_at_period_end from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
  ) <> false then
    raise exception 'resume webhook did not reset cancel_at_period_end to false';
  end if;

  update public.enrollment_settings set founding_limit = 1 where key = 'default';
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'Over Limit Student',
    7,
    'grade_7'
  );
  if (
    select founding_status from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000005'
  ) <> 'none' then
    raise exception 'student created after founding limit reached was incorrectly marked eligible';
  end if;
  delete from public.children where id = '00000000-0000-0000-0000-000000000005';
  update public.enrollment_settings set founding_limit = 30 where key = 'default';

  delete from public.children
  where id = '00000000-0000-0000-0000-000000000004';

  if not exists (
    select 1 from public.child_profiles
    where child_id = '00000000-0000-0000-0000-000000000002'
  ) or not exists (
    select 1 from public.child_learning_state
    where child_id = '00000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'new child did not receive learning memory records';
  end if;

  insert into public.materials (
    id, child_id, material_week, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path
  ) values (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    current_date - 7,
    'test-v1',
    '{}'::jsonb,
    'migration-test/student.pdf',
    'migration-test/answer.pdf'
  );

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    source_material_id, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000002',
    current_date + 7,
    'test-v1',
    'waiting-feedback',
    now() - interval '1 minute',
    '00000000-0000-0000-0000-000000000003',
    now() + interval '4 days',
    now() + interval '2 days',
    now() + interval '3 days'
  );

  insert into public.generation_jobs (
    child_id,
    material_week,
    rule_version,
    idempotency_key,
    scheduled_for,
    release_at,
    feedback_cutoff_at,
    generation_due_at
  )
  select
    '00000000-0000-0000-0000-000000000002',
    current_date + n,
    'test-v1',
    'test-' || n,
    now() - interval '1 minute',
    now() + interval '4 days',
    now() + interval '2 days',
    now() + interval '3 days'
  from generate_series(1, 16) as n;

  select count(*)
  into claimed_count
  from private_generation.claim_due_generation_jobs('migration-test');

  if claimed_count <> 15 then
    raise exception 'expected 15 claims, got %', claimed_count;
  end if;

  if (
    select status
    from public.generation_jobs
    where idempotency_key = 'waiting-feedback'
  ) <> 'pending' then
    raise exception 'job waiting for feedback was claimed to fill spare capacity';
  end if;

  insert into public.feedback (child_id, material_id, completion_rate)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    100
  );

  perform private_generation.claim_due_generation_jobs('feedback-test');

  if not exists (
    select 1
    from public.generation_jobs
    where idempotency_key = 'waiting-feedback'
      and status = 'claimed'
      and feedback_missing = false
  ) then
    raise exception 'qualifying feedback did not unlock its next job';
  end if;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    source_material_id, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000002',
    current_date + 14,
    'test-v1',
    'cutoff-with-late-feedback',
    now() - interval '1 minute',
    '00000000-0000-0000-0000-000000000003',
    now() + interval '47 hours',
    now() - interval '1 hour',
    now() + interval '23 hours'
  );

  perform private_generation.claim_due_generation_jobs('cutoff-test');

  if not exists (
    select 1
    from public.generation_jobs
    where idempotency_key = 'cutoff-with-late-feedback'
      and status = 'claimed'
      and feedback_missing = true
  ) then
    raise exception 'cutoff did not unlock job or late feedback was applied';
  end if;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    release_at, feedback_cutoff_at, generation_due_at
  )
  select
    '00000000-0000-0000-0000-000000000002',
    current_date + 100 + n,
    'test-v1',
    'mandatory-' || n,
    now() - interval '1 minute',
    now() + interval '12 hours',
    now() - interval '36 hours',
    now() - interval '12 hours'
  from generate_series(1, 18) as n;

  select count(*)
  into claimed_count
  from private_generation.claim_due_generation_jobs('mandatory-test');

  if claimed_count <> 18 then
    raise exception 'expected all 18 mandatory claims, got %', claimed_count;
  end if;

  if exists (
    select 1
    from public.generation_jobs
    where idempotency_key like 'mandatory-%'
      and feedback_missing = false
  ) then
    raise exception 'mandatory jobs without feedback were not marked feedback_missing';
  end if;

  if (
    select integer_value
    from public.operational_settings
    where key = 'daily_generation_limit'
  ) <> 15 then
    raise exception 'daily generation limit mismatch';
  end if;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000002',
    current_date + 250,
    'test-v1',
    'bridge-fingerprint-test',
    now() - interval '1 minute',
    now() + interval '12 hours',
    now() - interval '36 hours',
    now() - interval '12 hours'
  );

  select private_generation.chatgpt_claim_generation_batch('bridge-smoke')
  into bridge_claim_result;
  if bridge_claim_result ->> 'bridgeVersion' <> '1.3.0'
    or not (bridge_claim_result ? 'claimed')
    or not (bridge_claim_result ? 'claimedCount')
    or not (bridge_claim_result ? 'normalCapacity')
    or not (bridge_claim_result ? 'mandatoryCapacityOverride')
    or not (bridge_claim_result ? 'oldestOutstandingDeadline') then
    raise exception 'chatgpt_claim_generation_batch response violates Scheduled Work API contract: %', bridge_claim_result;
  end if;
  bridge_context := bridge_claim_result #> '{claimed,0}';
  if bridge_context ->> 'targetReleaseId' <> 'rel_1.4.0' then
    raise exception 'claim context missing server-owned targetReleaseId rel_1.4.0: %', bridge_context;
  end if;
  bridge_job_id := (bridge_context #>> '{job,id}')::uuid;
  bridge_child_id := (bridge_context #>> '{job,childId}')::uuid;
  bridge_fingerprint := bridge_context ->> 'inputFingerprint';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'Grammar Progression Test Student',
    7,
    'grade_7'
  );

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, lease_expires_at,
    release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000061',
    '00000000-0000-0000-0000-000000000006',
    current_date + 300,
    'test-v1',
    'grammar-progression-smoke',
    'claimed',
    now(),
    'grammar-progression-smoke',
    now() + interval '30 minutes',
    now() + interval '48 hours',
    now(),
    now() + interval '24 hours'
  );

  progression_context := public.worker_generation_context(
    '00000000-0000-0000-0000-000000000061',
    'grammar-progression-smoke'
  );
  if progression_context #> '{capCoverageCapsule,recommendedGrammar}'
    <> '["g7-be-verbs-pronouns", "g7-imperatives"]'::jsonb then
    raise exception 'initial grammar recommendation did not follow eligible canonical order: %',
      progression_context #> '{capCoverageCapsule,recommendedGrammar}';
  end if;

  insert into public.child_grammar_progress (
    child_id, grammar_id, status, mastery_score, exposure_count, correct_count, last_seen_at
  ) values
    ('00000000-0000-0000-0000-000000000006', 'g7-be-verbs-pronouns', 'mastered', 100, 2, 2, now()),
    ('00000000-0000-0000-0000-000000000006', 'g7-imperatives', 'learning', null, 1, 0, now());

  progression_context := public.worker_generation_context(
    '00000000-0000-0000-0000-000000000061',
    'grammar-progression-smoke'
  );
  if progression_context #> '{capCoverageCapsule,recommendedGrammar}'
    <> '["g7-present-simple-verbs", "g7-present-continuous"]'::jsonb then
    raise exception 'grammar recommendation did not unlock mastered prerequisites or prioritize new targets: %',
      progression_context #> '{capCoverageCapsule,recommendedGrammar}';
  end if;

  insert into public.child_grammar_progress (
    child_id, grammar_id, status, mastery_score, exposure_count, correct_count, last_seen_at
  ) values
    ('00000000-0000-0000-0000-000000000006', 'g7-present-simple-verbs', 'mastered', 100, 2, 2, now());

  progression_context := public.worker_generation_context(
    '00000000-0000-0000-0000-000000000061',
    'grammar-progression-smoke'
  );
  if progression_context #> '{capCoverageCapsule,recommendedGrammar}'
    <> '["g7-do-does-questions", "g7-modals-ability-permission"]'::jsonb then
    raise exception 'grammar recommendation did not follow canonical order after prerequisite mastery: %',
      progression_context #> '{capCoverageCapsule,recommendedGrammar}';
  end if;

  delete from public.children
  where id = '00000000-0000-0000-0000-000000000006';

  if bridge_claim_result ->> 'bridgeVersion' <> '1.3.0'
    or bridge_fingerprint !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'ChatGPT bridge did not return a server-owned SHA-256 fingerprint';
  end if;
  if bridge_fingerprint <> 'sha256:' || encode(
    extensions.digest(convert_to((bridge_context - 'inputFingerprint')::text, 'UTF8'), 'sha256'),
    'hex'
  ) then
    raise exception 'ChatGPT bridge fingerprint does not match the exact claimed context';
  end if;

  blocked := false;
  begin
    perform private_generation.chatgpt_submit_curriculum_package(
      bridge_job_id,
      'bridge-smoke',
      jsonb_build_object('metadata', jsonb_build_object(
        'schemaVersion', '2.3.0', 'jobId', bridge_job_id::text,
        'childId', bridge_child_id::text, 'inputFingerprint', 'sha256:' || repeat('0', 64)
      ))
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'ChatGPT bridge accepted a fabricated input fingerprint';
  end if;

  first_package := jsonb_build_object('metadata', jsonb_build_object(
      'schemaVersion', '2.3.0', 'jobId', bridge_job_id::text,
      'childId', bridge_child_id::text, 'inputFingerprint', bridge_fingerprint
    ));
  select attempt_count into bridge_attempt_before
  from public.generation_jobs where id = bridge_job_id;
  select count(*) into bridge_submission_count
  from private_generation.curriculum_submissions where job_id = bridge_job_id;

  select private_generation.chatgpt_submit_curriculum_package_v2(
    bridge_job_id, 'bridge-smoke', '{"metadata":'
  ) into bridge_submit_result;
  if bridge_submit_result <> jsonb_build_object(
      'accepted', false, 'persisted', false,
      'errorCode', 'INVALID_JSON_PAYLOAD', 'retryable', true
    ) then
    raise exception 'submit-v2 did not return structured invalid JSON recovery: %', bridge_submit_result;
  end if;
  if (select count(*) from private_generation.curriculum_submissions where job_id = bridge_job_id) <> bridge_submission_count
    or (select attempt_count from public.generation_jobs where id = bridge_job_id) <> bridge_attempt_before then
    raise exception 'malformed submit-v2 JSON persisted a submission or consumed retry budget';
  end if;

  select private_generation.chatgpt_submit_curriculum_package_v2(
    bridge_job_id, 'bridge-smoke', first_package::text
  ) into bridge_submit_result;
  if bridge_submit_result ->> 'status' <> 'pending' then
    raise exception 'valid submit-v2 payload did not persist: %', bridge_submit_result;
  end if;
  perform private_generation.chatgpt_submit_curriculum_package_v2(
    bridge_job_id, 'bridge-smoke', first_package::text
  );
  if (select count(*) from private_generation.curriculum_submissions where job_id = bridge_job_id) <> bridge_submission_count + 1 then
    raise exception 'submit-v2 idempotent retry persisted more than once';
  end if;

  blocked := false;
  begin
    perform private_generation.chatgpt_submit_curriculum_package_v2(
      bridge_job_id,
      'bridge-smoke',
      jsonb_set(first_package, '{metadata,semanticMutation}', 'true'::jsonb, true)::text
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'submit-v2 allowed semantic mutation within one authoring attempt';
  end if;
  select canonical_source into first_package
  from private_generation.curriculum_submissions
  where job_id = bridge_job_id and authoring_attempt = 1;
  if not exists (
    select 1 from private_generation.curriculum_submissions
    where job_id = bridge_job_id and status = 'pending'
  ) then
    raise exception 'ChatGPT bridge did not persist a pending curriculum submission';
  end if;

  perform public.worker_claim_curriculum_submissions('smoke-finisher', 5);
  if not exists (
    select 1 from private_generation.curriculum_submissions
    where job_id = bridge_job_id and status = 'processing' and processor_id = 'smoke-finisher'
  ) then
    raise exception 'deterministic finisher could not claim the curriculum submission';
  end if;
  if not public.worker_finish_curriculum_submission(
    bridge_job_id, 1, 'smoke-finisher', 'technical_failed', 'SMOKE_ONLY', 'rollback fixture',
    jsonb_build_object('failureType', 'TECHNICAL_FAILURE')
  ) then
    raise exception 'deterministic finisher could not record the submission outcome';
  end if;
  if exists (
    select 1 from private_generation.claim_due_generation_jobs('must-not-reauthor-technical')
    where id = bridge_job_id
  ) then
    raise exception 'technical finisher failure became an unnecessary LLM authoring claim';
  end if;

  perform public.worker_claim_curriculum_submissions('smoke-finisher-retry', 5);
  if not exists (
    select 1 from private_generation.curriculum_submissions
    where job_id = bridge_job_id and authoring_attempt = 1
      and status = 'processing' and processor_id = 'smoke-finisher-retry'
  ) then
    raise exception 'technical failure incorrectly required LLM re-authoring';
  end if;

  if not public.worker_finish_curriculum_submission(
    bridge_job_id, 1, 'smoke-finisher-retry', 'quality_rejected', 'QUALITY_REJECTED',
    'reading.answer: deterministic mismatch',
    jsonb_build_object('failureType', 'QUALITY_REJECTED', 'findings', jsonb_build_array(
      jsonb_build_object('source', 'validation', 'path', 'reading.answer',
        'dimension', 'answer-integrity', 'message', 'deterministic mismatch')
    ))
  ) then
    raise exception 'quality rejection was not recorded';
  end if;
  if not exists (
    select 1 from public.generation_jobs
    where id = bridge_job_id and status = 'pending' and attempt_count = 1
  ) then
    raise exception 'retryable quality rejection did not return to the authoring queue';
  end if;

  select private_generation.chatgpt_claim_generation_batch('bridge-smoke') into bridge_claim_result;
  if bridge_claim_result ->> 'bridgeVersion' <> '1.3.0'
    or not (bridge_claim_result ? 'claimed')
    or not (bridge_claim_result ? 'claimedCount')
    or not (bridge_claim_result ? 'normalCapacity')
    or not (bridge_claim_result ? 'mandatoryCapacityOverride')
    or not (bridge_claim_result ? 'oldestOutstandingDeadline') then
    raise exception 'retry claim response violates Scheduled Work API contract: %', bridge_claim_result;
  end if;
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = bridge_job_id::text;
  if bridge_context is null then
    raise exception 'second claim failed to return claimed job after quality rejection';
  end if;
  if bridge_context ->> 'targetReleaseId' <> 'rel_1.4.0' then
    raise exception 'retry claim context missing server-owned targetReleaseId rel_1.4.0: %', bridge_context;
  end if;
  if bridge_context #>> '{retryContext,previousAttemptNumber}' <> '1'
    or bridge_context #>> '{retryContext,failureType}' <> 'QUALITY_REJECTED'
    or bridge_context #>> '{retryContext,findings,0,path}' <> 'reading.answer'
    or bridge_context #> '{retryContext,previousCanonicalPackage}' <> first_package
    or jsonb_array_length(bridge_context #> '{retryContext,repairInstructions}') = 0 then
    raise exception 'retry claim omitted the immutable package, repair instructions, or exact failure evidence';
  end if;

  bridge_fingerprint := bridge_context ->> 'inputFingerprint';
  second_package := jsonb_build_object('metadata', jsonb_build_object(
    'schemaVersion', '2.3.0', 'jobId', bridge_job_id::text,
    'childId', bridge_child_id::text, 'inputFingerprint', bridge_fingerprint,
    'repairMarker', 'targeted-attempt-2'
  ));
  perform private_generation.chatgpt_submit_curriculum_package_v2(bridge_job_id, 'bridge-smoke', second_package::text);
  if (select canonical_source from private_generation.curriculum_submissions
      where job_id = bridge_job_id and authoring_attempt = 1) <> first_package then
    raise exception 'attempt 1 was mutated while submitting attempt 2';
  end if;

  perform public.worker_claim_curriculum_submissions('smoke-finisher-2', 5);
  select count(*) into claimed_count
  from public.worker_claim_curriculum_submissions('concurrent-finisher', 5)
  where job_id = bridge_job_id and authoring_attempt = 2;
  if claimed_count <> 0 then
    raise exception 'concurrent finisher claimed the same immutable attempt twice';
  end if;
  select public.worker_complete_generation_job(
    bridge_job_id, 'bridge-smoke',
    bridge_child_id::text || '/' || bridge_job_id::text || '/student.pdf',
    bridge_child_id::text || '/' || bridge_job_id::text || '/parent-answer.pdf',
    second_package, '{}'::jsonb, 'test-prompt', 'test-generator', 'test-model'
  ) into completed_material_id;
  if public.worker_complete_generation_job(
    bridge_job_id, 'bridge-smoke',
    bridge_child_id::text || '/' || bridge_job_id::text || '/student.pdf',
    bridge_child_id::text || '/' || bridge_job_id::text || '/parent-answer.pdf',
    second_package, '{}'::jsonb, 'test-prompt', 'test-generator', 'test-model'
  ) <> completed_material_id then
    raise exception 'idempotent completion returned a duplicate material';
  end if;
  if (select count(*) from public.materials where id = completed_material_id) <> 1 then
    raise exception 'attempt 2 did not complete exactly one material';
  end if;
  if not exists (
    select 1
    from public.generation_jobs as week_one
    join public.generation_jobs as week_two
      on week_two.source_material_id = week_one.material_id
    where week_one.id = bridge_job_id
      and week_one.release_at <= now()
      and week_one.feedback_cutoff_at = week_one.release_at - interval '48 hours'
      and week_one.generation_due_at = week_one.release_at - interval '24 hours'
      and week_two.release_at = week_one.release_at + interval '7 days'
      and week_two.feedback_cutoff_at = week_one.release_at + interval '7 days' - interval '48 hours'
      and week_two.generation_due_at = week_one.release_at + interval '7 days' - interval '24 hours'
  ) then
    raise exception 'completed Week 1 did not release immediately or anchor Week 2 at actual release + 7 days';
  end if;
  perform public.worker_finish_curriculum_submission(
    bridge_job_id, 2, 'smoke-finisher-2', 'completed', null, null, null
  );

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, attempt_count, max_attempts, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000071', bridge_child_id, current_date + 300,
    'test-v1', 'max-authoring-attempts', 'pending', now() - interval '1 minute', 2, 3,
    now() + interval '12 hours', now() - interval '36 hours', now() - interval '12 hours'
  );
  select private_generation.chatgpt_claim_generation_batch('max-attempt-smoke') into bridge_claim_result;
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = '00000000-0000-0000-0000-000000000071';
  bridge_fingerprint := bridge_context ->> 'inputFingerprint';
  perform private_generation.chatgpt_submit_curriculum_package(
    '00000000-0000-0000-0000-000000000071', 'max-attempt-smoke',
    jsonb_build_object('metadata', jsonb_build_object(
      'schemaVersion', '2.3.0', 'jobId', '00000000-0000-0000-0000-000000000071',
      'childId', bridge_child_id::text, 'inputFingerprint', bridge_fingerprint
    ))
  );
  perform public.worker_claim_curriculum_submissions('max-attempt-finisher', 5);
  perform public.worker_finish_curriculum_submission(
    '00000000-0000-0000-0000-000000000071', 3, 'max-attempt-finisher',
    'quality_rejected', 'QUALITY_REJECTED', 'sanitized final rejection',
    jsonb_build_object('failureType', 'QUALITY_REJECTED', 'findings', jsonb_build_array(
      jsonb_build_object('path', 'studentLesson.reading', 'dimension', 'quality', 'message', 'sanitized')
    ))
  );
  if not exists (
    select 1 from public.generation_jobs
    where id = '00000000-0000-0000-0000-000000000071'
      and status = 'failed' and attempt_count = 3 and error_code = 'HUMAN_REVIEW_REQUIRED'
  ) then
    raise exception 'max attempts did not produce permanent human review failure';
  end if;
  if exists (
    select 1 from private_generation.claim_due_generation_jobs('forbidden-fourth-attempt')
    where id = '00000000-0000-0000-0000-000000000071'
  ) then
    raise exception 'max_attempts allowed a fourth authoring attempt';
  end if;

  -- =========================================================================
  -- Submit-Transport Recovery & Read-After-Write Verification (Scenarios A–G)
  -- =========================================================================
  recovery_child_id := '00000000-0000-0000-0000-000000000088';
  recovery_job_id := '00000000-0000-0000-0000-000000000081';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    recovery_child_id,
    '00000000-0000-0000-0000-000000000001',
    'Transport Recovery Test Student',
    7,
    'grade_7'
  );

  update public.subscriptions set status = 'active' where child_id = recovery_child_id;

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, attempt_count, max_attempts, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    recovery_job_id,
    recovery_child_id,
    current_date + 350,
    'test-v1',
    'transport-recovery-smoke-job',
    'pending',
    now() - interval '1 minute',
    0,
    3,
    now() + interval '12 hours',
    now() - interval '36 hours',
    now() - interval '12 hours'
  );

  -- 1. Initial claim for Attempt 1
  select private_generation.chatgpt_claim_generation_batch('transport-recovery-worker')
  into bridge_claim_result;
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = recovery_job_id::text;
  bridge_fingerprint := bridge_context ->> 'inputFingerprint';

  first_package := jsonb_build_object('metadata', jsonb_build_object(
    'schemaVersion', '2.3.0', 'jobId', recovery_job_id::text,
    'childId', recovery_child_id::text, 'inputFingerprint', bridge_fingerprint
  ));
  perform private_generation.chatgpt_submit_curriculum_package(
    recovery_job_id, 'transport-recovery-worker', first_package
  );
  select canonical_source into first_package
  from private_generation.curriculum_submissions
  where job_id = recovery_job_id and authoring_attempt = 1;

  -- 2. Quality rejection for Attempt 1
  perform public.worker_claim_curriculum_submissions('recovery-finisher-1', 5);
  if not public.worker_finish_curriculum_submission(
    recovery_job_id, 1, 'recovery-finisher-1', 'quality_rejected', 'QUALITY_REJECTED',
    'reading: needs targeted repair',
    jsonb_build_object('failureType', 'QUALITY_REJECTED', 'findings', jsonb_build_array(
      jsonb_build_object('source', 'audit', 'path', 'reading', 'dimension', 'quality', 'message', 'needs repair')
    ))
  ) then
    raise exception 'failed to record quality rejection for attempt 1';
  end if;

  -- Verify job returned to pending with attempt_count = 1
  if not exists (
    select 1 from public.generation_jobs
    where id = recovery_job_id and status = 'pending' and attempt_count = 1
  ) then
    raise exception 'quality rejection attempt 1 did not return job to pending attempt 1';
  end if;

  -- 3. Claim Attempt 2
  select private_generation.chatgpt_claim_generation_batch('transport-recovery-worker')
  into bridge_claim_result;
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = recovery_job_id::text;

  if (bridge_context #>> '{job,attemptCount}')::integer <> 2
    or bridge_context #>> '{retryContext,previousAttemptNumber}' <> '1' then
    raise exception 'attempt 2 claim context mismatch: %', bridge_context;
  end if;

  -- Test Status RPC before attempt 2 submission (read-after-write uncertainty check)
  select private_generation.chatgpt_curriculum_submission_status(
    recovery_job_id, 'transport-recovery-worker'
  ) into recovery_status_result;
  if recovery_status_result ->> 'jobAttemptCount' <> '2'
    or (recovery_status_result ->> 'submissionFound')::boolean <> true
    or recovery_status_result ->> 'authoringAttempt' <> '1' then
    raise exception 'status check before attempt 2 submit did not reflect attempt 2 unsubmitted state: %', recovery_status_result;
  end if;

  -- Test C: Wrong worker cannot release claim
  blocked := false;
  begin
    perform private_generation.chatgpt_release_unsubmitted_claim(
      recovery_job_id, 'wrong-worker', 'SUBMIT_TRANSPORT_FAILED', 'wrong worker test'
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'Test C failed: wrong worker was allowed to release claim';
  end if;

  -- Test A: Claimed attempt 2 + no submission for attempt 2 -> release succeeds
  select private_generation.chatgpt_release_unsubmitted_claim(
    recovery_job_id, 'transport-recovery-worker', 'SUBMIT_TRANSPORT_FAILED', 'Connector safety filter blocked payload'
  ) into recovery_release_result;

  if (recovery_release_result ->> 'released')::boolean <> true
    or recovery_release_result ->> 'status' <> 'pending'
    or (recovery_release_result ->> 'attemptCount')::integer <> 1 then
    raise exception 'Test A failed: release result did not match expected structure: %', recovery_release_result;
  end if;

  if not exists (
    select 1 from public.generation_jobs
    where id = recovery_job_id
      and status = 'pending'
      and claimed_by is null
      and lease_expires_at is null
      and attempt_count = 1
      and error_code = 'SUBMIT_TRANSPORT_FAILED'
  ) then
    raise exception 'Test A failed: generation_jobs state was not properly restored after release';
  end if;

  -- Test E: Repeated release call fails closed without decrementing again
  blocked := false;
  begin
    perform private_generation.chatgpt_release_unsubmitted_claim(
      recovery_job_id, 'transport-recovery-worker', 'SUBMIT_TRANSPORT_FAILED', 'duplicate release test'
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'Test E failed: repeated release did not fail closed';
  end if;
  if (select attempt_count from public.generation_jobs where id = recovery_job_id) <> 1 then
    raise exception 'Test E failed: repeated release mutated attempt_count';
  end if;

  -- Test D: Cannot release pending / completed / failed job
  -- (Job is currently pending, calling release is blocked above)

  -- Test F: Next claim after successful release increments back to attempt 2 and preserves retryContext
  select private_generation.chatgpt_claim_generation_batch('transport-recovery-worker')
  into bridge_claim_result;
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = recovery_job_id::text;

  if (bridge_context #>> '{job,attemptCount}')::integer <> 2
    or bridge_context #>> '{retryContext,previousAttemptNumber}' <> '1'
    or bridge_context #> '{retryContext,previousCanonicalPackage}' <> first_package then
    raise exception 'Test F failed: reclaim after release did not reuse attempt 2 or preserve retryContext: %', bridge_context;
  end if;

  bridge_fingerprint := bridge_context ->> 'inputFingerprint';
  second_package := jsonb_build_object('metadata', jsonb_build_object(
    'schemaVersion', '2.3.0', 'jobId', recovery_job_id::text,
    'childId', recovery_child_id::text, 'inputFingerprint', bridge_fingerprint,
    'repaired', true
  ));

  -- Test G: Ambiguous submit result where attempt 2 actually persisted -> discovered by status check
  perform private_generation.chatgpt_submit_curriculum_package(
    recovery_job_id, 'transport-recovery-worker', second_package
  );
  select private_generation.chatgpt_curriculum_submission_status(
    recovery_job_id, 'transport-recovery-worker'
  ) into recovery_status_result;

  if recovery_status_result ->> 'jobAttemptCount' <> '2'
    or (recovery_status_result ->> 'submissionFound')::boolean <> true
    or recovery_status_result ->> 'authoringAttempt' <> '2'
    or recovery_status_result ->> 'status' <> 'pending' then
    raise exception 'Test G failed: status check did not discover persisted attempt 2: %', recovery_status_result;
  end if;

  -- Test B: Claimed attempt 2 + submission attempt 2 exists -> release rejected, zero state mutation
  blocked := false;
  begin
    perform private_generation.chatgpt_release_unsubmitted_claim(
      recovery_job_id, 'transport-recovery-worker', 'SUBMIT_TRANSPORT_FAILED', 'illegal release on persisted submission'
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'Test B failed: release was allowed on a job with a persisted submission';
  end if;

  -- Verify no mutation on Test B rejection
  if not exists (
    select 1 from public.generation_jobs
    where id = recovery_job_id and status = 'claimed' and attempt_count = 2 and claimed_by = 'transport-recovery-worker'
  ) or not exists (
    select 1 from private_generation.curriculum_submissions
    where job_id = recovery_job_id and authoring_attempt = 2 and status = 'pending'
  ) then
    raise exception 'Test B failed: state mutated despite release rejection';
  end if;

  -- Clean up recovery fixture
  delete from public.subscriptions where child_id = recovery_child_id;
  delete from public.children where id = recovery_child_id;



  if exists (
    select 1
    from public.generation_jobs as legacy_job
    join private_generation.curriculum_submissions as legacy_submission
      on legacy_submission.job_id = legacy_job.id
    where legacy_job.status = 'failed'
      and legacy_job.error_code = 'QUALITY_REJECTED'
      and legacy_job.attempt_count < legacy_job.max_attempts
      and legacy_job.completed_at is null
      and legacy_job.material_id is null
      and legacy_submission.status = 'quality_rejected'
  ) then
    raise exception 'retryable legacy quality rejection was not recovered by migration';
  end if;

  if not exists (
    select 1 from public.enrollment_settings
    where key = 'default' and status = 'open' and capacity = 100 and founding_limit = 30
  ) then
    raise exception 'typed enrollment settings mismatch';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'weekly-materials'
      and public = false
      and file_size_limit = 20971520
  ) then
    raise exception 'private PDF bucket mismatch';
  end if;

  insert into auth.users (id, raw_user_meta_data)
  values
    ('00000000-0000-0000-0000-000000000011', '{"display_name":"Family A"}'::jsonb),
    ('00000000-0000-0000-0000-000000000012', '{"display_name":"Family B"}'::jsonb);

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'Sibling A1', 7, 'grade_7'),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', 'Sibling A2', 8, 'grade_8'),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000012', 'Family B Child', 9, 'grade_9');

  insert into public.materials (
    id, child_id, material_week, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path
  ) values
    (
      '00000000-0000-0000-0000-000000000031',
      '00000000-0000-0000-0000-000000000021', current_date, 'test-v1', '{}'::jsonb,
      '00000000-0000-0000-0000-000000000021/student.pdf',
      '00000000-0000-0000-0000-000000000021/answer.pdf'
    ),
    (
      '00000000-0000-0000-0000-000000000032',
      '00000000-0000-0000-0000-000000000023', current_date, 'test-v1', '{}'::jsonb,
      '00000000-0000-0000-0000-000000000023/student.pdf',
      '00000000-0000-0000-0000-000000000023/answer.pdf'
    );

  update public.materials
  set canonical_source = '{
    "studentLesson":{
      "vocabulary":[{"id":"v-book","word":"book","status":"new"}],
      "practice":[{"id":"guided","stage":"guided","questions":[{"id":"q1","targetIds":["v-book","g-present-simple-statements"]}]}],
      "homework":{"questions":[{"id":"h1","targetIds":["v-book"]}]}
    },
    "learningPlan":{"targets":[{"id":"v-book"},{"id":"g-present-simple-statements"}]},
    "trackingDelta":{
      "introducedVocabularyIds":["v-book"],
      "reviewedVocabularyIds":[],
      "exposedGrammarTargetIds":["g-present-simple-statements"],
      "exposedCommunicationFunctionIds":["comm-ask-for-and-give-information"],
      "hypothesesToVerify":["Student completes practice independently"]
    },
    "qualityEvidence":{"feedbackApplied":[],"criticFindings":[]},
    "learnerSnapshot":{"feedbackSummary":"smoke","readingLevel":"國一適中"},
    "metadata":{"curriculumVersion":"test-v1","schemaVersion":"2.3.0","inputFingerprint":"fp-smoke-1"}
  }'::jsonb
  where id = '00000000-0000-0000-0000-000000000031';

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, material_id, completed_at,
    release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000021', current_date, 'test-v1',
    'observation-idempotency-test', 'completed', now() - interval '4 days', 'observation-test',
    '00000000-0000-0000-0000-000000000031', now(),
    now() - interval '1 minute', now() - interval '48 hours 1 minute', now() - interval '24 hours 1 minute'
  );

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, claimed_by, material_id, completed_at,
    release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000023', current_date, 'test-v1',
    'family-b-release-schedule', 'completed', now(), 'ownership-test',
    '00000000-0000-0000-0000-000000000032', now(),
    now() + interval '24 hours', now() - interval '24 hours', now()
  );

  select public.worker_record_curriculum_observations(
    '00000000-0000-0000-0000-000000000031', 'observation-test', '{}'::jsonb
  ) into observation_first;
  select public.worker_record_curriculum_observations(
    '00000000-0000-0000-0000-000000000031', 'observation-test', '{}'::jsonb
  ) into observation_second;
  if observation_first is distinct from true or observation_second is distinct from false then
    raise exception 'curriculum observations were not idempotent by material';
  end if;
  if (select observations_recorded_at from public.materials where id = '00000000-0000-0000-0000-000000000031') is null then
    raise exception 'curriculum observation marker was not recorded';
  end if;
  if not exists (select 1 from public.child_vocab_progress where child_id = '00000000-0000-0000-0000-000000000021' and vocabulary_id = 'v-book') then
    raise exception 'child vocab progress was not recorded';
  end if;
  if not exists (select 1 from public.child_grammar_progress where child_id = '00000000-0000-0000-0000-000000000021' and grammar_id = 'g-present-simple-statements') then
    raise exception 'child grammar progress was not recorded';
  end if;
  if not exists (select 1 from public.child_communication_progress where child_id = '00000000-0000-0000-0000-000000000021' and communication_function_id = 'comm-ask-for-and-give-information') then
    raise exception 'child communication progress was not recorded';
  end if;
  if not exists (select 1 from public.child_weekly_learning_snapshots where material_id = '00000000-0000-0000-0000-000000000031') then
    raise exception 'child weekly learning snapshot was not recorded';
  end if;
  if (select jsonb_array_length(compact_weekly_history) from public.child_learning_state where child_id = '00000000-0000-0000-0000-000000000021') <> 1 then
    raise exception 'curriculum observation history was applied more than once';
  end if;

  update public.materials
  set observations_recorded_at = null
  where id = '00000000-0000-0000-0000-000000000031';
  update public.materials as material
  set observations_recorded_at = material.created_at
  where material.id = '00000000-0000-0000-0000-000000000031'
    and exists (
      select 1
      from public.child_learning_state as state
      cross join lateral jsonb_array_elements(state.compact_weekly_history) as history(entry)
      where state.child_id = material.child_id
        and history.entry->>'materialId' = material.id::text
    );
  if (select observations_recorded_at from public.materials where id = '00000000-0000-0000-0000-000000000031') is null then
    raise exception 'existing curriculum observation history was not backfilled';
  end if;

  insert into public.feedback (id, child_id, material_id, completion_rate)
  values (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000031', 100
  );

  insert into storage.objects (bucket_id, name)
  values
    ('weekly-materials', '00000000-0000-0000-0000-000000000021/student.pdf'),
    ('weekly-materials', '00000000-0000-0000-0000-000000000023/student.pdf');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
  perform set_config('role', 'authenticated', true);

  select count(*) into visible_count from public.children;
  if visible_count <> 2 then
    raise exception 'family A should see exactly its two siblings, saw %', visible_count;
  end if;

  insert into public.product_feedback (parent_id, category, message)
  values ('00000000-0000-0000-0000-000000000011', 'flow', 'Smoke feedback');
  select count(*) into visible_count from public.product_feedback;
  if visible_count <> 1 then
    raise exception 'family A should see its own product feedback, saw %', visible_count;
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
  select count(*) into visible_count from public.product_feedback;
  if visible_count <> 0 then
    raise exception 'family B could read family A product feedback';
  end if;
  blocked := false;
  begin
    insert into public.product_feedback (parent_id, category, message)
    values ('00000000-0000-0000-0000-000000000011', 'bug', 'Cross-family feedback');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'family B could submit product feedback as family A';
  end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

  select count(*) into visible_count from public.child_profiles;
  if visible_count <> 2 then
    raise exception 'family A should see exactly two child profiles, saw %', visible_count;
  end if;

  select count(*) into visible_count
  from public.generation_jobs
  where material_id in (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000032'
  );
  if visible_count <> 1 then
    raise exception 'family A should see exactly one owned material release schedule, saw %', visible_count;
  end if;

  select count(*) into visible_count
  from public.get_owned_released_materials_page(
    '00000000-0000-0000-0000-000000000021', 5, 0, now()
  );
  if visible_count <> 1 then
    raise exception 'family A should see its released material through the history page, saw %', visible_count;
  end if;

  select count(*) into visible_count
  from public.get_owned_released_materials_page(
    '00000000-0000-0000-0000-000000000023', 5, 0, now() + interval '2 days'
  );
  if visible_count <> 0 then
    raise exception 'family A could read family B material through released history RPC';
  end if;

  select count(*) into visible_count
  from storage.objects
  where bucket_id = 'weekly-materials';
  if visible_count <> 1 then
    raise exception 'family A should see exactly one owned storage object, saw %', visible_count;
  end if;

  update public.children
  set display_name = 'Cross-family mutation'
  where id = '00000000-0000-0000-0000-000000000023';
  get diagnostics changed_count = row_count;
  if changed_count <> 0 then
    raise exception 'cross-family update bypassed RLS';
  end if;

  begin
    insert into public.children (parent_id, display_name, grade)
    values ('00000000-0000-0000-0000-000000000012', 'Forbidden child', 7);
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'cross-family insert bypassed RLS';
  end if;

  blocked := false;
  begin
    delete from public.children
    where id = '00000000-0000-0000-0000-000000000021';
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'authenticated parent retained hard-delete access';
  end if;

  blocked := false;
  begin
    update public.feedback
    set child_id = '00000000-0000-0000-0000-000000000023',
        material_id = '00000000-0000-0000-0000-000000000032'
    where id = '00000000-0000-0000-0000-000000000041';
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'feedback source identity was mutable';
  end if;

  update public.children
  set is_active = false
  where id = '00000000-0000-0000-0000-000000000021';
  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'owner could not archive child';
  end if;

  perform set_config('role', 'none', true);

  delete from auth.users
  where id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012'
  );
exception
  when others then
    perform set_config('role', 'none', true);
    delete from auth.users
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000012'
    );
    raise;
end;
$$;

rollback;

begin;

do $$
declare
  test_mode_res jsonb;
  test_advance_res jsonb;
  test_feedback_res jsonb;
  test_reset_res jsonb;
  test_status_res jsonb;
  test_job_id uuid;
  test_mat_id uuid;
  bridge_claim_result jsonb;
  bridge_context jsonb;
  bridge_fingerprint text;
  email_released_material_id uuid;
  email_future_material_id uuid;
  visible_count integer;
  test_founding_status text;
  founder_count_before integer;
  founder_count_after integer;
  founder_forfeited_at timestamptz;
  active_count_before integer;
  race_claim_id uuid;
  test_claim_id uuid;
  founder_lifetime_claim_id uuid;
  blocked boolean := false;
begin
  if not has_column_privilege('authenticated', 'public.generation_jobs', 'material_id', 'select')
    or not has_column_privilege('authenticated', 'public.generation_jobs', 'child_id', 'select')
    or not has_column_privilege('authenticated', 'public.generation_jobs', 'release_at', 'select')
    or not has_column_privilege('authenticated', 'public.generation_jobs', 'status', 'select')
    or not has_column_privilege('authenticated', 'public.generation_jobs', 'completed_at', 'select') then
    raise exception 'authenticated material RPC is missing required generation job columns';
  end if;
  if has_column_privilege('authenticated', 'public.generation_jobs', 'error_message', 'select')
    or has_column_privilege('authenticated', 'public.generation_jobs', 'claimed_by', 'select') then
    raise exception 'authenticated parents can read server-only generation job state';
  end if;
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_jobs'
      and policyname = 'generation_jobs_owner_release_select'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'generation job release schedule ownership policy is missing';
  end if;
  if has_function_privilege('anon', 'public.worker_claim_generation_jobs(text)', 'execute')
    or has_function_privilege('authenticated', 'public.worker_claim_generation_jobs(text)', 'execute') then
    raise exception 'browser roles can execute worker claim RPC';
  end if;
  if not has_function_privilege('service_role', 'public.worker_claim_generation_jobs(text)', 'execute') then
    raise exception 'service role cannot execute worker claim RPC';
  end if;
  if has_function_privilege('authenticated', 'public.worker_complete_generation_job(uuid,text,text,text,jsonb,jsonb,text,text,text)', 'execute') then
    raise exception 'authenticated role can execute worker completion RPC';
  end if;
  if has_function_privilege('anon', 'public.worker_completed_generation_context(uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.worker_completed_generation_context(uuid,text)', 'execute') then
    raise exception 'browser roles can execute completed generation recovery RPC';
  end if;
  if not has_function_privilege('service_role', 'public.worker_completed_generation_context(uuid,text)', 'execute') then
    raise exception 'service role cannot execute completed generation recovery RPC';
  end if;
  if has_function_privilege('anon', 'public.worker_record_curriculum_observations(uuid,text,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.worker_record_curriculum_observations(uuid,text,jsonb)', 'execute') then
    raise exception 'browser roles can record curriculum observations';
  end if;
  if not has_function_privilege('service_role', 'public.worker_record_curriculum_observations(uuid,text,jsonb)', 'execute') then
    raise exception 'service role cannot record compact curriculum evidence';
  end if;
  if has_function_privilege('anon', 'public.worker_claim_curriculum_submissions(text,integer)', 'execute')
    or has_function_privilege('authenticated', 'public.worker_claim_curriculum_submissions(text,integer)', 'execute') then
    raise exception 'browser roles can execute curriculum submission claim RPC';
  end if;
  if not has_function_privilege('service_role', 'public.worker_claim_curriculum_submissions(text,integer)', 'execute') then
    raise exception 'service role cannot claim curriculum submissions';
  end if;
  if has_function_privilege('service_role', 'private_generation.chatgpt_submit_curriculum_package(uuid,text,jsonb)', 'execute') then
    raise exception 'service role can bypass the app-only ChatGPT bridge';
  end if;
  if has_function_privilege('anon', 'private_generation.chatgpt_submit_curriculum_package_v2(uuid,text,text)', 'execute')
    or has_function_privilege('authenticated', 'private_generation.chatgpt_submit_curriculum_package_v2(uuid,text,text)', 'execute')
    or has_function_privilege('service_role', 'private_generation.chatgpt_submit_curriculum_package_v2(uuid,text,text)', 'execute') then
    raise exception 'unauthorized role can execute chatgpt_submit_curriculum_package_v2 RPC';
  end if;
  if has_function_privilege('anon', 'private_generation.chatgpt_release_unsubmitted_claim(uuid,text,text,text)', 'execute')
    or has_function_privilege('authenticated', 'private_generation.chatgpt_release_unsubmitted_claim(uuid,text,text,text)', 'execute')
    or has_function_privilege('service_role', 'private_generation.chatgpt_release_unsubmitted_claim(uuid,text,text,text)', 'execute') then
    raise exception 'unauthorized role can execute chatgpt_release_unsubmitted_claim RPC';
  end if;
  if has_function_privilege('anon', 'public.prepare_paddle_checkout(uuid,uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.prepare_paddle_checkout(uuid,uuid,text)', 'execute') then
    raise exception 'browser roles can execute Paddle checkout preparation RPC';
  end if;
  if not has_function_privilege('service_role', 'public.prepare_paddle_checkout(uuid,uuid,text)', 'execute') then
    raise exception 'service role cannot prepare Paddle checkout';
  end if;
  if has_function_privilege('anon', 'public.prepare_paddle_checkout_v2(uuid,uuid,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.prepare_paddle_checkout_v2(uuid,uuid,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.bind_founder_checkout_transaction(uuid,uuid,uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.release_founder_checkout_claim(uuid,text,text)', 'execute')
    or has_table_privilege('authenticated', 'private_generation.founder_checkout_claims', 'select') then
    raise exception 'Founder checkout claims are exposed to browser roles';
  end if;
  if not has_function_privilege('service_role', 'public.prepare_paddle_checkout_v2(uuid,uuid,text,text)', 'execute')
    or not has_function_privilege('service_role', 'public.bind_founder_checkout_transaction(uuid,uuid,uuid,text)', 'execute')
    or not has_function_privilege('service_role', 'public.release_founder_checkout_claim(uuid,text,text)', 'execute') then
    raise exception 'service role cannot manage Founder checkout claims';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean)',
    'execute'
  ) then
    raise exception 'deployed webhook compatibility signature was removed';
  end if;
  if has_function_privilege(
    'anon',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean,text,text,text,text,timestamptz,boolean)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean,text,text,text,text,timestamptz,boolean)',
    'execute'
  ) then
    raise exception 'browser roles can execute Paddle webhook processing RPC';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean,text,text,text,text,timestamptz,boolean)',
    'execute'
  ) then
    raise exception 'service role cannot execute Paddle webhook processing RPC';
  end if;
  if has_function_privilege(
    'anon',
    'public.process_paddle_subscription_event_v2(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean,text,text,text,text,timestamptz,boolean,uuid,text)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.process_paddle_subscription_event_v2(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean,text,text,text,text,timestamptz,boolean,uuid,text)',
    'execute'
  ) then
    raise exception 'browser roles can execute Paddle webhook processing v2 RPC';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.process_paddle_subscription_event_v2(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean,text,text,text,text,timestamptz,boolean,uuid,text)',
    'execute'
  ) then
    raise exception 'service role cannot execute Paddle webhook processing v2 RPC';
  end if;
  if has_function_privilege('anon', 'public.accept_legal_terms(text,text)', 'execute') then
    raise exception 'anon role can execute accept_legal_terms RPC';
  end if;
  if not has_function_privilege('authenticated', 'public.accept_legal_terms(text,text)', 'execute') then
    raise exception 'authenticated role cannot execute accept_legal_terms RPC';
  end if;
  if not has_function_privilege('service_role', 'public.accept_legal_terms(text,text)', 'execute') then
    raise exception 'service role cannot execute accept_legal_terms RPC';
  end if;

  if has_function_privilege('anon', 'public.accept_current_terms(text)', 'execute') then
    raise exception 'anon role can execute accept_current_terms RPC';
  end if;
  if not has_function_privilege('authenticated', 'public.accept_current_terms(text)', 'execute') then
    raise exception 'authenticated role cannot execute accept_current_terms RPC';
  end if;
  if not has_function_privilege('service_role', 'public.accept_current_terms(text)', 'execute') then
    raise exception 'service role cannot execute accept_current_terms RPC';
  end if;

  -- Verify required public.profiles columns exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'terms_version'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'privacy_version'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'legal_accepted_at'
  ) then
    raise exception 'public.profiles is missing required legal columns (terms_version, privacy_version, legal_accepted_at)';
  end if;

  -- Verify accept_legal_terms and accept_current_terms state recording
  insert into auth.users (id, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000099', '{"display_name":"Legal RPC Test"}'::jsonb);

  -- Set auth context to simulate authenticated parent
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);

  perform public.accept_legal_terms('2026-08-16-v1', '2026-08-16-v1');
  if not exists (
    select 1 from public.profiles
    where id = '00000000-0000-0000-0000-000000000099'
      and terms_version = '2026-08-16-v1'
      and privacy_version = '2026-08-16-v1'
      and legal_accepted_at is not null
  ) then
    raise exception 'accept_legal_terms did not record stated terms/privacy versions';
  end if;

  perform public.accept_current_terms('2026-08-26-v2');
  if not exists (
    select 1 from public.profiles
    where id = '00000000-0000-0000-0000-000000000099'
      and terms_version = '2026-08-26-v2'
      and privacy_version = '2026-08-16-v1'
      and legal_accepted_at is not null
  ) then
    raise exception 'accept_current_terms did not update terms_version to 2026-08-26-v2';
  end if;

  delete from auth.users where id = '00000000-0000-0000-0000-000000000099';
  perform set_config('request.jwt.claim.sub', '', true);

  -- =========================================================================
  -- Longitudinal Generation Test Mode Operational Tests
  -- =========================================================================

  -- 1. Security & Privilege checks
  if has_function_privilege('anon', 'public.admin_get_test_mode_status(uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.admin_get_test_mode_status(uuid)', 'execute') then
    raise exception 'browser roles can execute admin_get_test_mode_status RPC';
  end if;
  if not has_function_privilege('service_role', 'public.admin_get_test_mode_status(uuid)', 'execute') then
    raise exception 'service role cannot execute admin_get_test_mode_status RPC';
  end if;

  if has_function_privilege('anon', 'public.admin_set_test_mode(uuid,boolean,integer,boolean)', 'execute')
    or has_function_privilege('authenticated', 'public.admin_set_test_mode(uuid,boolean,integer,boolean)', 'execute') then
    raise exception 'browser roles can execute admin_set_test_mode RPC';
  end if;
  if not has_function_privilege('service_role', 'public.admin_set_test_mode(uuid,boolean,integer,boolean)', 'execute') then
    raise exception 'service role cannot execute admin_set_test_mode RPC';
  end if;

  if has_function_privilege('anon', 'public.admin_advance_test_week(uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.admin_advance_test_week(uuid)', 'execute') then
    raise exception 'browser roles can execute admin_advance_test_week RPC';
  end if;
  if not has_function_privilege('service_role', 'public.admin_advance_test_week(uuid)', 'execute') then
    raise exception 'service role cannot execute admin_advance_test_week RPC';
  end if;

  if has_function_privilege('anon', 'public.admin_record_test_feedback(uuid,uuid,smallint,smallint,text,text,text,text,text,text,text,integer)', 'execute')
    or has_function_privilege('authenticated', 'public.admin_record_test_feedback(uuid,uuid,smallint,smallint,text,text,text,text,text,text,text,integer)', 'execute') then
    raise exception 'browser roles can execute admin_record_test_feedback RPC';
  end if;
  if not has_function_privilege('service_role', 'public.admin_record_test_feedback(uuid,uuid,smallint,smallint,text,text,text,text,text,text,text,integer)', 'execute') then
    raise exception 'service role cannot execute admin_record_test_feedback RPC';
  end if;

  if has_function_privilege('anon', 'public.admin_reset_test_child_to_onboarding(uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.admin_reset_test_child_to_onboarding(uuid)', 'execute') then
    raise exception 'browser roles can execute admin_reset_test_child_to_onboarding RPC';
  end if;
  if not has_function_privilege('service_role', 'public.admin_reset_test_child_to_onboarding(uuid)', 'execute') then
    raise exception 'service role cannot execute admin_reset_test_child_to_onboarding RPC';
  end if;

  -- 2. Create test user and child
  insert into auth.users (id, raw_user_meta_data)
  values (
    '00000000-0000-0000-0000-000000000001',
    '{"display_name":"Migration Test"}'::jsonb
  );
  update public.profiles
  set terms_version = '2026-08-26-v2', privacy_version = '2026-08-16-v1', legal_accepted_at = now()
  where id = '00000000-0000-0000-0000-000000000001';

  insert into public.children (id, parent_id, display_name, grade, grade_stage, textbook_version)
  values (
    '00000000-0000-0000-0000-000000000099',
    '00000000-0000-0000-0000-000000000001',
    'Longitudinal Test Child',
    8,
    'grade_8',
    'hanlin'
  );

  -- 3. Check initial disabled status
  test_status_res := public.admin_get_test_mode_status('00000000-0000-0000-0000-000000000099');
  if (test_status_res->>'isEnabled')::boolean is not false then
    raise exception 'new child had test mode enabled unexpectedly';
  end if;
  if (test_status_res->'advanceEligibility'->>'canAdvance')::boolean is not false then
    raise exception 'non-test child was eligible to advance';
  end if;

  -- 4. Enable Test Mode with target week 8
  test_mode_res := public.admin_set_test_mode('00000000-0000-0000-0000-000000000099', true, 8, false);
  if (test_mode_res->>'success')::boolean is not true or (test_mode_res->>'targetWeek')::integer <> 8 then
    raise exception 'failed to enable test mode: %', test_mode_res;
  end if;

  test_status_res := public.admin_get_test_mode_status('00000000-0000-0000-0000-000000000099');
  if (test_status_res->>'isEnabled')::boolean is not true or (test_status_res->>'targetWeek')::integer <> 8 then
    raise exception 'test mode status did not reflect enabled state';
  end if;

  -- 5. Advance Week 1 (accelerates initial pending job)
  test_advance_res := public.admin_advance_test_week('00000000-0000-0000-0000-000000000099');
  if (test_advance_res->>'success')::boolean is not true then
    raise exception 'failed to advance week 1: %', test_advance_res;
  end if;
  test_job_id := (test_advance_res->>'jobId')::uuid;

  -- Verify job schedule constraint is satisfied
  if not exists (
    select 1 from public.generation_jobs
    where id = test_job_id
      and scheduled_for <= now()
      and feedback_cutoff_at <= now()
      and feedback_cutoff_at = release_at - interval '48 hours'
      and generation_due_at = release_at - interval '24 hours'
  ) then
    raise exception 'accelerated job schedule violates ordering invariants';
  end if;

  -- 6. Claim accelerated job via production claim bridge
  select private_generation.chatgpt_claim_generation_batch('chatgpt-test-worker') into bridge_claim_result;
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = test_job_id::text;

  if bridge_context is null then
    raise exception 'production claim bridge did not claim accelerated test job: %', bridge_claim_result;
  end if;
  bridge_fingerprint := bridge_context ->> 'inputFingerprint';

  -- 7. Submit curriculum package and complete material
  begin
    perform private_generation.chatgpt_submit_curriculum_package(
      test_job_id,
      'chatgpt-test-worker',
      jsonb_build_object('metadata', jsonb_build_object('schemaVersion', '2.2.0'))
    );
    raise exception 'legacy curriculum schema was accepted for new production submission';
  exception when others then
    if sqlerrm = 'legacy curriculum schema was accepted for new production submission' then
      raise;
    end if;
    if sqlerrm not like 'canonical_source must be a Curriculum Package 2.3.0 object%' then
      raise exception 'unexpected legacy schema rejection: %', sqlerrm;
    end if;
  end;

  perform private_generation.chatgpt_submit_curriculum_package(
    test_job_id,
    'chatgpt-test-worker',
    jsonb_build_object(
      'metadata', jsonb_build_object(
        'schemaVersion', '2.3.0',
        'jobId', test_job_id::text,
        'childId', '00000000-0000-0000-0000-000000000099',
        'inputFingerprint', bridge_fingerprint
      ),
      'studentMaterial', jsonb_build_object(
        'warmup', jsonb_build_object('activity', 'Vocab brainstorm', 'estimatedMinutes', 5),
        'reading', jsonb_build_object('passage', 'Space is vast and mysterious...', 'lexile', '750L'),
        'practice', jsonb_build_array(jsonb_build_object('type', 'multiple-choice', 'question', 'What is vast?'))
      ),
      'parentGuide', jsonb_build_object('tips', jsonb_build_array('Encourage asking questions')),
      'learningObservations', jsonb_build_object(
        'observedStrengths', jsonb_build_array('Astronomy vocabulary'),
        'observedGaps', jsonb_build_array('Past participle irregular forms'),
        'recommendedFocusNextWeek', 'Verbs in context'
      )
    )
  );

  -- Claim and complete the curriculum submission via Finisher
  perform public.worker_claim_curriculum_submissions('chatgpt-test-finisher', 5);
  perform public.worker_finish_curriculum_submission(
    test_job_id, 1, 'chatgpt-test-finisher', 'completed', null, null, null
  );

  test_mat_id := '00000000-0000-0000-0000-000000000088'::uuid;
  insert into public.materials (
    id, child_id, material_week, revision, rule_version,
    input_snapshot, student_pdf_path, parent_answer_pdf_path,
    observations_recorded_at
  ) values (
    test_mat_id,
    '00000000-0000-0000-0000-000000000099',
    '2026-08-17',
    1,
    '2.2.0',
    '{}'::jsonb,
    '00000000-0000-0000-0000-000000000099/2026-08-17_student.pdf',
    '00000000-0000-0000-0000-000000000099/2026-08-17_parent.pdf',
    now()
  );

  update public.generation_jobs
  set status = 'completed', material_id = test_mat_id
  where id = test_job_id;

  -- 8. Record test feedback
  test_feedback_res := public.admin_record_test_feedback(
    p_child_id := '00000000-0000-0000-0000-000000000099'::uuid,
    p_material_id := test_mat_id,
    p_difficulty := 4::smallint,
    p_completion_rate := 100::smallint,
    p_weak_area := 'vocabulary',
    p_mistakes_text := 'Struggled with irregular verbs',
    p_child_comments := 'Liked the space theme',
    p_parent_comments := 'Needs gentle grammar review',
    p_school_progress_update := 'Unit 3 started at school',
    p_interest_update := 'Interested in rocketry'
  );
  if (test_feedback_res->>'success')::boolean is not true then
    raise exception 'failed to record test feedback: %', test_feedback_res;
  end if;

  -- 9. Create next pending job for Week 2
  insert into public.generation_jobs (
    child_id, source_material_id, material_week, rule_version, idempotency_key, scheduled_for,
    feedback_cutoff_at, generation_due_at, release_at, status
  ) values (
    '00000000-0000-0000-0000-000000000099',
    test_mat_id,
    '2026-08-24',
    '2.2.0',
    'test-child-week-2',
    now() + interval '5 days',
    now() + interval '5 days',
    now() + interval '6 days',
    now() + interval '7 days',
    'pending'
  );

  -- 10. Advance Week 2
  test_advance_res := public.admin_advance_test_week('00000000-0000-0000-0000-000000000099');
  if (test_advance_res->>'success')::boolean is not true then
    raise exception 'failed to advance week 2: %', test_advance_res;
  end if;

  -- 11. Test Reset to Onboarding
  select founding_status into test_founding_status from public.subscriptions
  where child_id = '00000000-0000-0000-0000-000000000099';
  test_reset_res := public.admin_reset_test_child_to_onboarding('00000000-0000-0000-0000-000000000099');
  if (test_reset_res->>'success')::boolean is not true then
    raise exception 'failed to reset test child: %', test_reset_res;
  end if;

  -- Verify all history cleared but child profile preserved
  if exists (select 1 from public.materials where child_id = '00000000-0000-0000-0000-000000000099') then
    raise exception 'materials were not cleared on reset';
  end if;
  if exists (select 1 from public.feedback where child_id = '00000000-0000-0000-0000-000000000099') then
    raise exception 'feedback was not cleared on reset';
  end if;
  if exists (select 1 from public.child_learning_evidence where child_id = '00000000-0000-0000-0000-000000000099') then
    raise exception 'child learning evidence was not cleared on reset';
  end if;
  if exists (select 1 from public.child_weekly_learning_snapshots where child_id = '00000000-0000-0000-0000-000000000099') then
    raise exception 'child snapshots were not cleared on reset';
  end if;
  if exists (select 1 from public.feedback_memory_processing where child_id = '00000000-0000-0000-0000-000000000099') then
    raise exception 'feedback memory processing was not cleared on reset';
  end if;
  if (select count(*) from public.generation_jobs where child_id = '00000000-0000-0000-0000-000000000099' and status = 'pending') <> 1 then
    raise exception 'did not recreate exactly one fresh pending job on reset';
  end if;
  if not exists (select 1 from public.children where id = '00000000-0000-0000-0000-000000000099' and grade = 8 and textbook_version = 'hanlin') then
    raise exception 'child profile data was corrupted on reset';
  end if;
  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000099') is distinct from test_founding_status then
    raise exception 'test-mode reset changed or regranted Founder state';
  end if;

  -- 12. Scaling Gate Waitlist Lifecycle (>100 child) verification
  -- Set capacity to 1 (which matches current 1 active child 00000000-0000-0000-0000-000000000099)
  -- so that the next child triggers the scaling gate.
  update public.enrollment_settings
  set capacity = 1, founding_limit = 1
  where key = 'default';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    '00000000-0000-0000-0000-000000000077',
    '00000000-0000-0000-0000-000000000001',
    'Waitlist Student',
    7,
    'grade_7'
  );

  -- Verify child is in waitlist in 'waiting' state, no subscription or jobs created
  if not exists (
    select 1 from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000077'
      and status = 'waiting'
  ) then
    raise exception 'child #101 was not added to waitlist in waiting state when capacity is full';
  end if;

  if exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000077'
  ) then
    raise exception 'child on waitlist must not receive a subscription';
  end if;

  if exists (
    select 1 from public.generation_jobs
    where child_id = '00000000-0000-0000-0000-000000000077'
  ) then
    raise exception 'child on waitlist must not receive initial generation job';
  end if;

  -- Verify prepare_paddle_checkout is strictly blocked for waiting child
  if (
    select checkout_allowed from public.prepare_paddle_checkout_v2(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000077',
      'standard_monthly',
      '2026-08-26-v2'
    )
  ) is not false then
    raise exception 'prepare_paddle_checkout should have blocked waiting child';
  end if;

  -- Test admin_raise_capacity_and_release rejection when capacity is insufficient
  blocked := false;
  begin
    perform public.admin_raise_capacity_and_release(1, true);
  exception
    when others then
      blocked := true;
  end;

  if not blocked then
    raise exception 'admin_raise_capacity_and_release should reject when capacity does not cover active + waiting';
  end if;

  -- Test atomic raise capacity and release all waiting
  perform public.admin_raise_capacity_and_release(2, true);

  if (
    select status from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000077'
  ) <> 'released' then
    raise exception 'waitlist child was not transitioned to released after cohort release';
  end if;

  -- Verify prepare_paddle_checkout now succeeds for released child
  perform public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000077',
    'standard_monthly',
    '2026-08-26-v2'
  );

  -- Process Paddle webhook payment event for released waitlist child
  perform public.process_paddle_subscription_event(
    'evt_waitlist_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000077',
    'sub_waitlist_smoke', 'ctm_waitlist_smoke', 'active',
    'standard_monthly', 'month', 499,
    now(), now() + interval '1 month', false,
    'dsc_founder', null, null, null, null, false
  );

  if (
    select status from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000077'
  ) <> 'converted' then
    raise exception 'waitlist status was not converted after paid webhook';
  end if;

  if not exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000077'
      and status = 'active'
  ) then
    raise exception 'subscription was not activated after paid webhook';
  end if;

  if not exists (
    select 1 from public.generation_jobs
    where child_id = '00000000-0000-0000-0000-000000000077'
      and status = 'pending'
  ) then
    raise exception 'initial generation job was not enqueued for converted child';
  end if;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 13. Production Blocker Regressions
  -- ══════════════════════════════════════════════════════════════════════════

  -- 13a. Admission gate must count released children toward capacity.
  -- Currently capacity=2, active=1 (test child 99, but child 77 is now also active via subscription)
  -- Let's set capacity=2 and already have 2 active subscriptions, then try adding another child.
  -- Reset: child 77 is now 'converted' with active subscription, child 99 has subscription.
  -- capacity=2, active=2 → new child should go to waitlist even without any released children.
  update public.enrollment_settings set capacity = 2 where key = 'default';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    '00000000-0000-0000-0000-000000000088',
    '00000000-0000-0000-0000-000000000001',
    'Blocker Test Student',
    7,
    'grade_7'
  );

  -- Child 88 should be waitlisted since active=2 (children 99+77) fills capacity=2
  if not exists (
    select 1 from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000088'
      and status = 'waiting'
  ) then
    raise exception 'REGRESSION: child was not waitlisted when active count equals capacity';
  end if;

  -- 13b. Now test released children consuming capacity:
  -- Raise capacity to 3 and release child 88 → active=2, released=1, remaining should be 0
  perform public.admin_raise_capacity_and_release(3, true);

  if (
    select status from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000088'
  ) <> 'released' then
    raise exception 'REGRESSION: child 88 was not released after capacity raise';
  end if;

  -- Verify notification_status was set to 'pending' on release
  if (
    select notification_status from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000088'
  ) <> 'pending' then
    raise exception 'REGRESSION: notification_status was not set to pending on release';
  end if;

  -- Now capacity=3, active=2, released=1 → remaining should be 0
  -- Adding another child should go to waitlist
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values (
    '00000000-0000-0000-0000-000000000066',
    '00000000-0000-0000-0000-000000000001',
    'Released Cap Test Student',
    9,
    'grade_9'
  );

  if not exists (
    select 1 from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000066'
      and status = 'waiting'
  ) then
    raise exception 'REGRESSION: child was NOT waitlisted when active+released fills capacity (released children must count toward capacity)';
  end if;

  -- 13c. Verify get_enrollment_state remaining accounts for released children
  declare
    v_remaining integer;
  begin
    select remaining into v_remaining from public.get_enrollment_state();
    if v_remaining <> 0 then
      raise exception 'REGRESSION: get_enrollment_state remaining should be 0 when active+released=capacity, got %', v_remaining;
    end if;
  end;

  -- 13d. Webhook must reject subscription for child in 'waiting' status
  blocked := false;
  begin
    perform public.process_paddle_subscription_event(
      'evt_block_waiting_01', 'subscription.created', now(),
      '00000000-0000-0000-0000-000000000066',
      'sub_block_waiting_01', 'ctm_block_waiting_01', 'active',
      'standard_monthly', 'month', 499,
      now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'recurring', null, true
    );
  exception
    when others then
      blocked := true;
  end;

  if not blocked then
    raise exception 'REGRESSION: process_paddle_subscription_event must reject subscription for child in waiting status';
  end if;

  -- Verify waiting child has no subscription and no generation job
  if exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000066'
  ) then
    raise exception 'REGRESSION: waiting child must not have a subscription after rejected webhook';
  end if;

  if exists (
    select 1 from public.generation_jobs
    where child_id = '00000000-0000-0000-0000-000000000066'
  ) then
    raise exception 'REGRESSION: waiting child must not have a generation job after rejected webhook';
  end if;

  -- 13e. Webhook with canceled status should NOT convert released child or create job
  -- Release child 66 first to test
  perform public.admin_raise_capacity_and_release(4, true);

  if (
    select status from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000066'
  ) <> 'released' then
    raise exception 'REGRESSION: child 66 was not released for canceled-webhook test';
  end if;

  -- Send a canceled subscription event → should NOT convert or create job
  perform public.process_paddle_subscription_event(
    'evt_cancel_test_01', 'subscription.canceled', now(),
    '00000000-0000-0000-0000-000000000066',
    'sub_cancel_test_01', 'ctm_cancel_test_01', 'canceled',
    'standard_monthly', 'month', 499,
    now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'recurring', null, true
  );

  -- Status should remain 'released' (not converted) because canceled is not an activated status
  if (
    select status from public.waitlist
    where child_id = '00000000-0000-0000-0000-000000000066'
  ) <> 'released' then
    raise exception 'REGRESSION: released child should NOT be converted on a canceled subscription webhook';
  end if;

  -- No generation job should exist for this child
  if exists (
    select 1 from public.generation_jobs
    where child_id = '00000000-0000-0000-0000-000000000066'
  ) then
    raise exception 'REGRESSION: generation job should not be created for canceled subscription webhook';
  end if;

  -- 14. Released material history pagination excludes future prepared materials.
  with inserted_materials as (
    insert into public.materials (
      child_id, material_week, revision, rule_version, input_snapshot,
      student_pdf_path, parent_answer_pdf_path
    )
    select
      '00000000-0000-0000-0000-000000000099',
      current_date - ((series.n + 2) * 7),
      1,
      'history-pagination-test',
      '{}'::jsonb,
      'history/' || series.n || '/student.pdf',
      'history/' || series.n || '/parent.pdf'
    from generate_series(1, 19) as series(n)
    returning id, child_id, material_week
  )
  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, material_id, release_at, feedback_cutoff_at, generation_due_at
  )
  select
    inserted_materials.child_id,
    inserted_materials.material_week,
    'history-pagination-test',
    'history-released-' || inserted_materials.id,
    'completed',
    now() - interval '30 days',
    inserted_materials.id,
    now() - interval '1 day',
    now() - interval '3 days',
    now() - interval '2 days'
  from inserted_materials;

  with future_material as (
    insert into public.materials (
      child_id, material_week, revision, rule_version, input_snapshot,
      student_pdf_path, parent_answer_pdf_path
    ) values (
      '00000000-0000-0000-0000-000000000099',
      current_date + 14,
      1,
      'history-pagination-test',
      '{}'::jsonb,
      'history/future/student.pdf',
      'history/future/parent.pdf'
    ) returning id, child_id, material_week
  )
  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, material_id, release_at, feedback_cutoff_at, generation_due_at
  )
  select
    future_material.child_id,
    future_material.material_week,
    'history-pagination-test',
    'history-future-' || future_material.id,
    'completed',
    now(),
    future_material.id,
    now() + interval '7 days',
    now() + interval '5 days',
    now() + interval '6 days'
  from future_material;

  if (
    select count(*)
    from public.get_owned_released_materials_page(
      '00000000-0000-0000-0000-000000000099', 5, 0, now()
    )
  ) <> 5 then
    raise exception 'REGRESSION: released material page should contain exactly five rows';
  end if;

  if (
    select max(total_count)
    from public.get_owned_released_materials_page(
      '00000000-0000-0000-0000-000000000099', 5, 0, now()
    )
  ) <> 19 then
    raise exception 'REGRESSION: released history count must exclude the future prepared material';
  end if;

  -- 15. Permanent Student Library backfill, retry, parent read model, and grants.
  if (public.worker_backfill_student_library('00000000-0000-0000-0000-000000000099', 100)->>'created')::integer <> 20 then
    raise exception 'REGRESSION: backfill should create one snapshot per completed material';
  end if;
  if (select count(*) from public.child_weekly_learning_snapshots where child_id='00000000-0000-0000-0000-000000000099') <> 20 then
    raise exception 'REGRESSION: Student Library snapshot count is not durable';
  end if;
  if (public.worker_backfill_student_library('00000000-0000-0000-0000-000000000099', 100)->>'created')::integer <> 0 then
    raise exception 'REGRESSION: repeated backfill must not duplicate snapshots';
  end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  if jsonb_array_length(public.parent_child_learning_timeline('00000000-0000-0000-0000-000000000099',null,5)) <> 5 then
    raise exception 'REGRESSION: Student Library timeline limit/cursor page is incorrect';
  end if;
  if (public.parent_child_learning_summary('00000000-0000-0000-0000-000000000099')->>'totalWeeks')::integer <> 20 then
    raise exception 'REGRESSION: Student Library summary week count is incorrect';
  end if;
  if has_function_privilege('authenticated','public.worker_backfill_student_library(uuid,integer)','execute')
    or has_function_privilege('anon','private.process_feedback_memory(uuid)','execute') then
    raise exception 'REGRESSION: browser roles can execute Student Library mutation functions';
  end if;
  if has_table_privilege('authenticated','public.child_weekly_learning_snapshots','insert')
    or has_table_privilege('authenticated','public.child_learning_evidence','update')
    or has_table_privilege('authenticated','public.feedback_memory_processing','delete') then
    raise exception 'REGRESSION: browser roles can mutate Student Library tables';
  end if;

  -- 16. Release-time material email delivery is independent, idempotent, and scoped.
  update auth.users set email = 'login-parent@example.com' where id = '00000000-0000-0000-0000-000000000001';
  with released_material as (
    insert into public.materials (child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path)
    values ('00000000-0000-0000-0000-000000000099', current_date + 100, 1, 'email-test', '{}', 'email-test/student.pdf', 'email-test/parent.pdf')
    returning id, child_id, material_week
  ) insert into public.generation_jobs (child_id, material_week, rule_version, idempotency_key, status, scheduled_for, material_id, release_at, feedback_cutoff_at, generation_due_at, completed_at)
    select child_id, material_week, 'email-test', 'email-eligible', 'completed', now() - interval '3 days', id, now() - interval '1 minute', now() - interval '48 hours 1 minute', now() - interval '24 hours 1 minute', now() - interval '2 minutes' from released_material;
  with future_material as (
    insert into public.materials (child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path)
    values ('00000000-0000-0000-0000-000000000099', current_date + 107, 1, 'email-test', '{}', 'email-future/student.pdf', 'email-future/parent.pdf') returning id, child_id, material_week
  ) insert into public.generation_jobs (child_id, material_week, rule_version, idempotency_key, status, scheduled_for, material_id, release_at, feedback_cutoff_at, generation_due_at, completed_at)
    select child_id, material_week, 'email-test', 'email-future', 'completed', now(), id, now() + interval '3 days', now() + interval '1 day', now() + interval '2 days', now() from future_material;
  insert into public.generation_jobs (child_id, material_week, rule_version, idempotency_key, status, scheduled_for, release_at, feedback_cutoff_at, generation_due_at)
    values ('00000000-0000-0000-0000-000000000099', current_date + 114, 'email-test', 'email-unfinished', 'pending',
      now() - interval '3 days', now() - interval '1 minute', now() - interval '48 hours 1 minute', now() - interval '24 hours 1 minute');

  if (select count(*) from public.worker_claim_material_email_deliveries('email-worker-a', 10, 300, 5)) <> 1 then
    raise exception 'REGRESSION: only completed and released material should be claimed for email';
  end if;
  if (select count(*) from public.worker_claim_material_email_deliveries('email-worker-b', 10, 300, 5)) <> 0 then
    raise exception 'REGRESSION: concurrent dispatcher claim duplicated an active delivery';
  end if;
  if not public.worker_set_material_email_token((select id from public.material_email_deliveries where claimed_by='email-worker-a'), 'email-worker-a', repeat('a',64)) then
    raise exception 'REGRESSION: initial attempt could not persist hashed scoped token';
  end if;
  if (select count(*) from public.resolve_material_email_access(repeat('a',64), null)) <> 1 then
    raise exception 'REGRESSION: provisioned scoped token must survive a crash after SMTP acceptance before sent_at';
  end if;
  if not public.worker_begin_material_email_send((select id from public.material_email_deliveries where claimed_by='email-worker-a'), 'email-worker-a') then
    raise exception 'REGRESSION: claimed delivery could not durably enter SMTP send state';
  end if;
  if not public.worker_fail_material_email_delivery((select id from public.material_email_deliveries where claimed_by='email-worker-a'), 'email-worker-a', 'temporary smtp outage', 5) then
    raise exception 'REGRESSION: transient email failure was not recorded';
  end if;
  if not exists (select 1 from public.materials where student_pdf_path='email-test/student.pdf') then
    raise exception 'REGRESSION: email failure reverted released material';
  end if;
  if (select count(*) from public.worker_claim_material_email_deliveries('email-worker-b', 10, 300, 5)) <> 1 then
    raise exception 'REGRESSION: failed email was not safely retryable';
  end if;
  if (select count(*) from public.worker_claim_material_email_deliveries('email-worker-c', 10, 300, 5)) <> 0 then
    raise exception 'REGRESSION: retried delivery was concurrently claimed twice';
  end if;
  if not public.worker_set_material_email_token((select id from public.material_email_deliveries where claimed_by='email-worker-b'), 'email-worker-b', repeat('a',64)) then
    raise exception 'REGRESSION: worker could not persist hashed scoped token';
  end if;
  if not public.worker_begin_material_email_send((select id from public.material_email_deliveries where claimed_by='email-worker-b'), 'email-worker-b') then
    raise exception 'REGRESSION: retry could not durably enter SMTP send state';
  end if;
  if not public.worker_complete_material_email_delivery((select id from public.material_email_deliveries where claimed_by='email-worker-b'), 'email-worker-b', 'provider-1') then
    raise exception 'REGRESSION: worker could not mark email sent';
  end if;
  if (select count(*) from public.worker_claim_material_email_deliveries('email-worker-c', 10, 300, 5)) <> 0 then
    raise exception 'REGRESSION: successful material notification was claimed twice';
  end if;
  if (select count(*) from public.resolve_material_email_access(repeat('a',64), null)) <> 1 then
    raise exception 'REGRESSION: valid scoped link did not resolve without login';
  end if;

  select id into email_released_material_id from public.materials where student_pdf_path = 'email-test/student.pdf';
  select id into email_future_material_id from public.materials where student_pdf_path = 'email-future/student.pdf';

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  if (
    select count(*)
    from public.get_owned_released_material(email_released_material_id)
  ) <> 1 then
    raise exception 'REGRESSION: authenticated owner could not retrieve released material';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
  if exists (
    select 1
    from public.get_owned_released_material(email_released_material_id)
  ) then
    raise exception 'REGRESSION: another authenticated parent retrieved released material';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  if exists (
    select 1
    from public.get_owned_released_material(email_future_material_id)
  ) then
    raise exception 'REGRESSION: authenticated owner retrieved unreleased material';
  end if;

  perform set_config('role', 'anon', true);
  blocked := false;
  begin
    perform public.get_owned_released_material(email_released_material_id);
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'REGRESSION: anon could execute authenticated material RPC';
  end if;
  perform set_config('role', 'none', true);

  if exists (select 1 from public.resolve_material_email_access(repeat('b',64), null)) then
    raise exception 'REGRESSION: invalid scoped token resolved';
  end if;
  insert into public.material_email_deliveries (material_id, parent_id, child_id, recipient_email, status, sent_at, access_token_hash, access_expires_at)
    select material.id, child.parent_id, child.id, 'login-parent@example.com', 'sent', now(), repeat('b',64), now()+interval '90 days'
    from public.materials as material join public.children as child on child.id=material.child_id
    where material.student_pdf_path='email-future/student.pdf';
  if exists (select 1 from public.resolve_material_email_access(repeat('b',64), null)) then
    raise exception 'REGRESSION: unreleased material resolved through a valid token';
  end if;
  if (select student_pdf_path from public.resolve_material_email_access(repeat('a',64), null)) <> 'email-test/student.pdf' then
    raise exception 'REGRESSION: scoped link exposed a different material artifact';
  end if;
  update public.material_email_deliveries set access_revoked_at=now() where access_token_hash=repeat('a',64);
  if exists (select 1 from public.resolve_material_email_access(repeat('a',64), null)) then raise exception 'REGRESSION: revoked scoped token resolved'; end if;
  update public.material_email_deliveries set access_revoked_at=null, access_expires_at=now()-interval '1 second' where access_token_hash=repeat('a',64);
  if exists (select 1 from public.resolve_material_email_access(repeat('a',64), null)) then raise exception 'REGRESSION: expired scoped token resolved'; end if;
  if has_table_privilege('anon','public.material_email_deliveries','select')
    or has_function_privilege('anon','public.resolve_material_email_access(text,uuid)','execute')
    or has_function_privilege('authenticated','public.worker_claim_material_email_deliveries(text,integer,integer,integer)','execute') then
    raise exception 'REGRESSION: scoped delivery internals are exposed to browser roles';
  end if;

  if (select column_default from information_schema.columns where table_schema='public' and table_name='generation_jobs' and column_name='max_attempts') <> '5' then
    raise exception 'REGRESSION: generation jobs do not default to five authoring attempts';
  end if;
  if exists (
    select requested.column_name
    from unnest(array[
      'id','child_id','material_week','revision','rule_version','prompt_version',
      'generator_version','model_name','student_pdf_path','parent_answer_pdf_path',
      'canonical_source','created_at'
    ]) as requested(column_name)
    where not exists (
      select 1 from information_schema.columns as actual
      where actual.table_schema='public' and actual.table_name='materials'
        and actual.column_name=requested.column_name
    )
  ) then
    raise exception 'REGRESSION: Admin materials select contract references a nonexistent production column';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='materials'
      and column_name in ('release_at','released_at')
  ) then
    raise exception 'REGRESSION: release truth drifted from generation_jobs.release_at';
  end if;

  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status, scheduled_for,
    attempt_count, max_attempts, claimed_by, lease_expires_at, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000088',
    '00000000-0000-0000-0000-000000000099', current_date + 200,
    'override-atomicity-test', 'override-atomicity-test', 'claimed', now(),
    5, 5, 'override-author', now() + interval '1 hour', now() + interval '3 days',
    now() + interval '1 day', now() + interval '2 days'
  );
  insert into private_generation.curriculum_submissions (
    job_id, authoring_attempt, generation_worker_id, canonical_source, status,
    processor_id, processor_lease_expires_at, input_fingerprint
  ) values (
    '00000000-0000-0000-0000-000000000088', 5, 'override-author',
    '{"metadata":{"schemaVersion":"2.3.0"}}', 'processing',
    'override-finisher', now() + interval '30 minutes', 'sha256:override-test'
  );
  perform public.worker_complete_generation_job_with_quality_override(
    '00000000-0000-0000-0000-000000000088', 'override-author',
    '00000000-0000-0000-0000-000000000099/00000000-0000-0000-0000-000000000088/student.pdf',
    '00000000-0000-0000-0000-000000000099/00000000-0000-0000-0000-000000000088/parent-answer.pdf',
    '{"metadata":{"schemaVersion":"2.3.0"}}', '{}', '2.5.0', 'curriculum/2.3.0', 'test-model',
    5, 'override-finisher', 'Only allowlisted soft gates remain.',
    '{"failureType":"QUALITY_REJECTED","findings":[{"source":"audit","dimension":"cognitive-load","message":"Too dense."}]}',
    'Curriculum quality rejected: cognitive load'
  );
  if not exists (
      select 1 from public.generation_jobs
      where id='00000000-0000-0000-0000-000000000088' and status='completed' and material_id is not null
    ) or not exists (
      select 1 from private_generation.curriculum_submissions
      where job_id='00000000-0000-0000-0000-000000000088' and authoring_attempt=5
        and status='quality_rejected' and failure_evidence->>'failureType'='QUALITY_REJECTED'
    ) or not exists (
      select 1 from public.material_quality_overrides
      where job_id='00000000-0000-0000-0000-000000000088' and authoring_attempt=5
        and outcome='delivered_with_quality_override'
    ) then
    raise exception 'REGRESSION: quality override finalization did not commit all terminal records together';
  end if;
  if to_regprocedure('public.worker_record_quality_override(uuid,integer,uuid,text,text,jsonb,text)') is not null then
    raise exception 'REGRESSION: obsolete non-atomic quality override RPC remains callable';
  end if;

  if not public.admin_set_internal_test_entitlement('00000000-0000-0000-0000-000000000099', true) then
    raise exception 'REGRESSION: internal test entitlement could not be enabled';
  end if;
  if not exists (select 1 from public.children where id='00000000-0000-0000-0000-000000000099' and is_internal_test)
    or not exists (select 1 from public.subscriptions where child_id='00000000-0000-0000-0000-000000000099' and provider <> 'internal_test') then
    raise exception 'REGRESSION: internal test entitlement replaced a real subscription';
  end if;
  if not public.admin_set_internal_test_entitlement('00000000-0000-0000-0000-000000000077', true) then
    raise exception 'REGRESSION: waitlisted internal test child could not be enabled';
  end if;
  if (select waiting_count from public.get_enrollment_state()) <> 0 then
    raise exception 'REGRESSION: internal test child remains in public waiting demand';
  end if;
  if (select total_demand from public.get_enrollment_state()) <>
     (select active_count + waiting_count + released_count from public.get_enrollment_state()) then
    raise exception 'REGRESSION: total demand omits service, waiting, or released-not-converted children';
  end if;
  if has_function_privilege('authenticated','public.admin_set_internal_test_entitlement(uuid,boolean)','execute')
    or has_table_privilege('authenticated','public.material_quality_overrides','select') then
    raise exception 'REGRESSION: internal entitlement or quality overrides are exposed to browser roles';
  end if;

  -- Founder 30 reservation, permanent consumption, cancellation, and integrity regressions.
  update public.enrollment_settings set capacity = 1000, founding_limit = 30, status = 'open' where key = 'default';
  select founding_count into founder_count_before from public.get_enrollment_state();

  -- Decision 7 & 8: Child creation does not allocate Founder status.
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000001', 'Founder In Flight', 7, 'grade_7');

  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000109') <> 'none' then
    raise exception 'new child was incorrectly allocated founding status on creation';
  end if;
  if (select founding_count from public.get_enrollment_state()) <> founder_count_before then
    raise exception 'new child creation consumed a Founder seat before checkout';
  end if;

  -- 30-minute checkout hold acquired atomically at monthly checkout.
  select founding_claim_id into race_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000109',
    'standard_monthly',
    '2026-08-26-v2'
  );
  if race_claim_id is null then raise exception 'checkout preparation did not create a founder claim'; end if;
  if (select founding_count from public.get_enrollment_state()) <> founder_count_before + 1 then
    raise exception 'active checkout hold was not counted in founding_count';
  end if;

  -- Repeated checkout does not create multiple holds for the same child.
  select founding_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000109',
    'standard_monthly',
    '2026-08-26-v2'
  );
  if test_claim_id <> race_claim_id then raise exception 'repeated checkout created duplicate claim'; end if;
  if (select founding_count from public.get_enrollment_state()) <> founder_count_before + 1 then
    raise exception 'repeated checkout inflated founding_count';
  end if;

  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000109',
    race_claim_id,
    'txn_founder_race'
  );

  -- Concurrency limit test: when founding_limit reached, prepare_paddle_checkout_v2 returns founding_applies = false.
  update public.enrollment_settings set founding_limit = founder_count_before + 1 where key = 'default';
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000001', 'Founder Boundary Competitor', 7, 'grade_7');

  if (select founding_applies from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000112', 'standard_monthly', '2026-08-26-v2'
  )) <> false then
    raise exception 'checkout allowed Founder hold when limit reached';
  end if;

  -- Complete redemption of the bound claim.
  perform public.process_paddle_subscription_event_v2(
    'evt_founder_race_complete', 'subscription.created', clock_timestamp(),
    '00000000-0000-0000-0000-000000000109', 'sub_founder_race', 'ctm_founder_race', 'active',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, true,
    race_claim_id, 'txn_founder_race'
  );
  if not exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000109'
      and founding_status = 'redeemed'
  ) or (select founding_count from public.get_enrollment_state()) > founder_count_before + 1 then
    raise exception 'Founder checkout completion failed or exceeded boundary';
  end if;

  update public.enrollment_settings set founding_limit = 30 where key = 'default';
  select founding_count into founder_count_before from public.get_enrollment_state();

  -- Test expired checkout claim release:
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000001', 'Founder Expiry', 7, 'grade_7');
  select founding_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000110', 'standard_monthly', '2026-08-26-v2'
  );
  if (select founding_count from public.get_enrollment_state()) <> founder_count_before + 1 then
    raise exception 'active Founder hold did not consume a seat';
  end if;

  -- Expire the hold and verify that founding_seat_count drops it.
  update private_generation.founder_checkout_claims set reservation_expires_at = now() - interval '1 second'
  where id = test_claim_id;
  if (select founding_count from public.get_enrollment_state()) <> founder_count_before then
    raise exception 'expired hold was still counted in public state';
  end if;

  -- Late completion with unbound/expired claim does not redeem Founder (remains none).
  perform public.process_paddle_subscription_event_v2(
    'evt_founder_expired_late', 'subscription.created', clock_timestamp(),
    '00000000-0000-0000-0000-000000000110', 'sub_founder_expired', 'ctm_founder', 'active',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, false,
    test_claim_id, 'txn_founder_expired'
  );
  if (
    select founding_status from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000110'
  ) <> 'none' then
    raise exception 'late completion on expired claim unexpectedly redeemed Founder';
  end if;

  -- Lifetime Founder Subscription & Cancellation Lifecycle:
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000001', 'Founder Lifetime', 7, 'grade_7');
  select founding_claim_id into founder_lifetime_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000111',
    'standard_monthly',
    '2026-08-26-v2'
  );
  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000111',
    founder_lifetime_claim_id,
    'txn_founder_lifetime'
  );
  perform public.process_paddle_subscription_event_v2(
    'evt_founder_redeem', 'subscription.created', clock_timestamp(),
    '00000000-0000-0000-0000-000000000111', 'sub_founder_lifetime', 'ctm_founder', 'active',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, true,
    founder_lifetime_claim_id, 'txn_founder_lifetime'
  );
  if not exists (
    select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000111'
      and founding_status = 'redeemed' and founding_redeemed_at is not null
  ) then raise exception 'verified recurring-forever discount did not redeem Founder'; end if;
  select founding_count into founder_count_after from public.get_enrollment_state();

  blocked := false;
  begin
    perform public.process_paddle_subscription_event_v2(
      'evt_founder_wrong_discount', 'subscription.updated', clock_timestamp() + interval '1 second',
      '00000000-0000-0000-0000-000000000111', 'sub_founder_lifetime', 'ctm_founder', 'active',
      'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
      'dsc_founder', 'dsc_wrong', 'active', 'flat', null, false,
      null, null
    );
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'redeemed active Founder accepted a missing or wrong discount'; end if;

  perform public.process_paddle_subscription_event_v2(
    'evt_founder_cancel_scheduled', 'subscription.updated', clock_timestamp() + interval '2 seconds',
    '00000000-0000-0000-0000-000000000111', 'sub_founder_lifetime', 'ctm_founder', 'active',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', true,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, true,
    null, null
  );
  perform public.process_paddle_subscription_event_v2(
    'evt_founder_resumed', 'subscription.resumed', clock_timestamp() + interval '3 seconds',
    '00000000-0000-0000-0000-000000000111', 'sub_founder_lifetime', 'ctm_founder', 'active',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', 'dsc_founder', 'active', 'flat', null, true,
    null, null
  );
  if not exists (
    select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000111'
      and founding_status = 'redeemed' and not cancel_at_period_end
  ) then raise exception 'scheduled cancellation or resume forfeited Founder'; end if;

  perform public.process_paddle_subscription_event_v2(
    'evt_founder_canceled', 'subscription.canceled', clock_timestamp() + interval '4 seconds',
    '00000000-0000-0000-0000-000000000111', 'sub_founder_lifetime', 'ctm_founder', 'canceled',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', null, null, null, null, false,
    null, null
  );
  select founding_forfeited_at into founder_forfeited_at from public.subscriptions
  where child_id = '00000000-0000-0000-0000-000000000111';
  perform public.process_paddle_subscription_event_v2(
    'evt_founder_canceled', 'subscription.canceled', clock_timestamp() + interval '5 seconds',
    '00000000-0000-0000-0000-000000000111', 'sub_founder_lifetime', 'ctm_founder', 'canceled',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', null, null, null, null, false,
    null, null
  );
  if not exists (
    select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000111'
      and founding_status = 'forfeited' and founding_forfeited_at = founder_forfeited_at
  ) then raise exception 'actual cancellation did not forfeit Founder exactly once'; end if;
  if (select founding_count from public.get_enrollment_state()) <> founder_count_after then
    raise exception 'forfeited Founder seat was returned to the public pool';
  end if;
  perform public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000111', 'standard_monthly', '2026-08-26-v2'
  );
  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000111') <> 'forfeited' then
    raise exception 'forfeited child regained Founder pricing';
  end if;

  -- Decision 11: Free trial strictly Week 1 only (unpaid beta cannot claim Week 2).
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000001', 'Trial Gen Limit Student', 7, 'grade_7');

  -- Insert dummy Week 1 material so the child has received Week 1.
  insert into public.materials (id, child_id, material_week, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path)
  values (
    '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000113', current_date, '1.0.0',
    '{}'::jsonb, 'materials/student.pdf', 'materials/parent.pdf'
  );

  -- Schedule Week 2 job referencing Week 1 material as source_material_id.
  insert into public.generation_jobs (
    id, child_id, material_week, rule_version, idempotency_key, status, scheduled_for, source_material_id, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000113', current_date + 7, 'curriculum-rules/1.0.0',
    '00000000-0000-0000-0000-000000000113:w2', 'pending', now() - interval '1 hour', '00000000-0000-0000-0000-000000000201',
    now() + interval '12 hours', now() - interval '36 hours', now() - interval '12 hours'
  );

  -- Unpaid beta child cannot claim Week 2 job.
  if exists (
    select 1 from private_generation.claim_due_generation_jobs('test_worker_smoke') where id = '00000000-0000-0000-0000-000000000202'
  ) then
    raise exception 'unpaid beta trial was able to claim Week 2 generation job';
  end if;

  -- Paid activation unlocks Week 2 job.
  perform public.process_paddle_subscription_event_v2(
    'evt_unlock_w2', 'subscription.created', clock_timestamp(),
    '00000000-0000-0000-0000-000000000113', 'sub_unlock_w2', 'ctm_unlock_w2', 'active',
    'standard_monthly', 'month', 499, now(), now() + interval '1 month', false,
    'dsc_founder', null, null, null, null, false,
    null, null
  );

  if not exists (
    select 1 from private_generation.claim_due_generation_jobs('test_worker_smoke') where id = '00000000-0000-0000-0000-000000000202'
  ) then
    raise exception 'paid activation did not unlock Week 2 generation job';
  end if;

  -- Decision 12: 14-day beta window capacity release test.
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000001', 'Beta Expiry Capacity', 7, 'grade_7');

  select active_count into active_count_before from public.get_enrollment_state();

  -- Expire the beta trial window.
  update public.subscriptions
  set current_period_end = now() - interval '1 second'
  where child_id = '00000000-0000-0000-0000-000000000114';

  if (select active_count from public.get_enrollment_state()) <> active_count_before - 1 then
    raise exception 'expired beta trial was not released from service active capacity';
  end if;

  -- Item 1: Deployed webhook payload -> actual production RPC signature resolves with exact named arguments.
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000115', '00000000-0000-0000-0000-000000000001', 'Signature Named Args Test', 7, 'grade_7');

  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_sig_test_named_args_01',
    p_event_type := 'subscription.created',
    p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000115',
    p_provider_subscription_id := 'sub_sig_test_named_args_01',
    p_provider_customer_id := 'ctm_sig_test_named_args_01',
    p_status := 'active',
    p_plan_code := 'standard_monthly',
    p_billing_interval := 'month',
    p_price_twd := 499,
    p_current_period_start := now(),
    p_current_period_end := now() + interval '1 month',
    p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected',
    p_discount_id := null,
    p_discount_status := null,
    p_discount_type := null,
    p_discount_ends_at := null,
    p_discount_ends_at_present := false,
    p_founder_claim_id := null,
    p_originating_transaction_id := null
  );

  -- Item 2: Strict Founder redemption rules:
  -- Monthly + wrong discount / no claim / wrong txn -> cannot redeem Founder.
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000116', '00000000-0000-0000-0000-000000000001', 'Founder Strict Test', 7, 'grade_7');

  select founding_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000116', 'standard_monthly', '2026-08-26-v2'
  );

  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000116', test_claim_id, 'txn_correct_founder_116'
  );

  -- 2a: Wrong discount ID -> cannot redeem Founder
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000117', '00000000-0000-0000-0000-000000000001', 'Wrong Discount Test', 7, 'grade_7');
  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_wrong_dsc_01', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000117', p_provider_subscription_id := 'sub_wrong_dsc_01',
    p_provider_customer_id := 'ctm_wrong_dsc_01', p_status := 'active', p_plan_code := 'standard_monthly',
    p_billing_interval := 'month', p_price_twd := 499, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 month', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := 'dsc_wrong_attacker',
    p_discount_status := 'active', p_discount_type := 'flat', p_discount_ends_at := null,
    p_discount_ends_at_present := false, p_founder_claim_id := null, p_originating_transaction_id := null
  );
  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000117') <> 'none' then
    raise exception 'wrong discount ID incorrectly redeemed Founder';
  end if;

  -- 2b: Correct discount but missing claim -> cannot redeem Founder (no unclaimed redemption)
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'No Claim Test', 7, 'grade_7');
  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_no_claim_01', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000018', p_provider_subscription_id := 'sub_no_claim_01',
    p_provider_customer_id := 'ctm_no_claim_01', p_status := 'active', p_plan_code := 'standard_monthly',
    p_billing_interval := 'month', p_price_twd := 499, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 month', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := 'dsc_founder_expected',
    p_discount_status := 'active', p_discount_type := 'flat', p_discount_ends_at := null,
    p_discount_ends_at_present := false, p_founder_claim_id := null, p_originating_transaction_id := 'txn_some_unbound'
  );
  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000018') <> 'none' then
    raise exception 'unclaimed transaction incorrectly redeemed Founder';
  end if;

  -- 2c: Correct discount + valid claim but wrong originating transaction -> cannot redeem Founder
  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_wrong_txn_01', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000116', p_provider_subscription_id := 'sub_wrong_txn_01',
    p_provider_customer_id := 'ctm_wrong_txn_01', p_status := 'active', p_plan_code := 'standard_monthly',
    p_billing_interval := 'month', p_price_twd := 499, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 month', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := 'dsc_founder_expected',
    p_discount_status := 'active', p_discount_type := 'flat', p_discount_ends_at := null,
    p_discount_ends_at_present := false, p_founder_claim_id := test_claim_id, p_originating_transaction_id := 'txn_wrong_attacker'
  );
  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000116') <> 'none' then
    raise exception 'mismatched transaction ID incorrectly redeemed Founder';
  end if;

  -- 2d: Verified redemption with exact bound claim + exact transaction -> successfully redeems and records monotonic authority
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000118', '00000000-0000-0000-0000-000000000001', 'Founder Verified Test', 7, 'grade_7');

  select founding_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000118', 'standard_monthly', '2026-08-26-v2'
  );

  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000118', test_claim_id, 'txn_correct_founder_118'
  );

  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_correct_redemption_01', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000118', p_provider_subscription_id := 'sub_correct_founder_118',
    p_provider_customer_id := 'ctm_correct_founder_118', p_status := 'active', p_plan_code := 'standard_monthly',
    p_billing_interval := 'month', p_price_twd := 499, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 month', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := 'dsc_founder_expected',
    p_discount_status := 'active', p_discount_type := 'flat', p_discount_ends_at := null,
    p_discount_ends_at_present := true, p_founder_claim_id := test_claim_id, p_originating_transaction_id := 'txn_correct_founder_118'
  );
  if (select founding_status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000118') <> 'redeemed' then
    raise exception 'verified Founder subscription was not marked redeemed';
  end if;
  if not exists (
    select 1 from private_generation.founder_redemptions where child_id = '00000000-0000-0000-0000-000000000118' and provider_subscription_id = 'sub_correct_founder_118'
  ) then
    raise exception 'verified Founder redemption was not recorded in founder_redemptions authority table';
  end if;

  -- Item 3: Final seat race:
  -- A has unresolved transaction after 30 min -> B cannot get Founder -> only verified neutralization frees seat.
  select founding_count into founder_count_before from public.get_enrollment_state();
  update public.enrollment_settings set founding_limit = founder_count_before + 1 where key = 'default';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000119', '00000000-0000-0000-0000-000000000001', 'Child A Final Seat', 7, 'grade_7');
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000120', '00000000-0000-0000-0000-000000000001', 'Child B Final Seat', 7, 'grade_7');

  -- Child A prepares checkout and binds transaction
  select founding_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000119', 'standard_monthly', '2026-08-26-v2'
  );
  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000119', test_claim_id, 'txn_child_a_held'
  );

  -- 30 minutes elapse
  update private_generation.founder_checkout_claims set reservation_expires_at = now() - interval '1 second'
  where id = test_claim_id;

  -- Child B tries to checkout -> MUST NOT get Founder because A's transaction is unresolved!
  if (
    select founding_applies
    from public.prepare_paddle_checkout_v2(
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000120', 'standard_monthly', '2026-08-26-v2'
    )
  ) is true then
    raise exception 'Child B received Founder seat while Child A held an unresolved expired bound transaction';
  end if;

  -- Neutralize Child A's transaction
  perform public.release_founder_checkout_claim(test_claim_id, 'txn_child_a_held', 'transaction_canceled');

  -- Now Child B checks out -> receives Founder seat!
  if (
    select founding_applies
    from public.prepare_paddle_checkout_v2(
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000120', 'standard_monthly', '2026-08-26-v2'
    )
  ) is not true then
    raise exception 'Child B failed to receive Founder seat after Child A was verified neutralized';
  end if;
  update public.enrollment_settings set founding_limit = 30 where key = 'default';

  -- Regressions: Transaction-safe capacity and waitlist lifecycle
  -- 1) active=99 + returning-beta capacity claim + new-child creation cannot exceed 100
  select private_generation.locked_capacity_count() into active_count_before;
  update public.enrollment_settings set founding_limit = least(10, active_count_before + 1), capacity = active_count_before + 1 where key = 'default';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000130', '00000000-0000-0000-0000-000000000001', 'Beta Returning Capacity', 7, 'grade_7');
  update public.subscriptions set current_period_end = now() - interval '1 second' where child_id = '00000000-0000-0000-0000-000000000130';

  select capacity_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000130', 'standard_annual', '2026-08-26-v2'
  );
  if test_claim_id is null then
    raise exception 'returning beta child did not receive a capacity claim';
  end if;

  if (select private_generation.locked_capacity_count()) <> active_count_before + 1 then
    raise exception 'live capacity claim did not lock capacity';
  end if;

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000131', '00000000-0000-0000-0000-000000000001', 'Child Over Capacity', 7, 'grade_7');

  if exists (
    select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000131'
  ) then
    raise exception 'new child creation exceeded capacity by creating a trial subscription';
  end if;

  if not exists (
    select 1 from public.waitlist where child_id = '00000000-0000-0000-0000-000000000131' and status = 'waiting'
  ) then
    raise exception 'new child creation at capacity was not added to waitlist in waiting status';
  end if;

  if (select private_generation.locked_capacity_count()) > active_count_before + 1 then
    raise exception 'locked capacity count exceeded capacity threshold';
  end if;

  -- 2) expired capacity claim with still-payable transaction cannot free capacity
  perform public.bind_capacity_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000130', test_claim_id, 'txn_payable_cap_130'
  );

  update private_generation.capacity_checkout_claims set reservation_expires_at = now() - interval '1 second'
  where id = test_claim_id;

  perform public.claim_expired_capacity_checkouts(10);
  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'release_pending' then
    raise exception 'expired bound capacity claim was not marked release_pending';
  end if;

  if (select remaining from public.get_enrollment_state()) <> 0 then
    raise exception 'expired bound capacity claim prematurely freed available capacity';
  end if;

  -- 3) late payment cannot produce 101
  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_late_payment_130', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000130', p_provider_subscription_id := 'sub_late_payment_130',
    p_provider_customer_id := 'ctm_late_payment_130', p_status := 'active', p_plan_code := 'standard_annual',
    p_billing_interval := 'year', p_price_twd := 4999, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 year', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := null,
    p_discount_status := null, p_discount_type := null, p_discount_ends_at := null,
    p_discount_ends_at_present := false, p_founder_claim_id := null, p_originating_transaction_id := 'txn_payable_cap_130'
  );

  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'completed' then
    raise exception 'capacity claim was not completed upon payment activation';
  end if;

  if (select private_generation.locked_capacity_count()) <> active_count_before + 1 then
    raise exception 'late payment over-counted capacity (produced 101)';
  end if;

  -- 4) full returning-beta path creates real waiting row
  -- Create child while capacity is open so they get a real beta trial and no waitlist row
  update public.enrollment_settings set capacity = 100, founding_limit = 30 where key = 'default';

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000132', '00000000-0000-0000-0000-000000000001', 'Beta Full Returning Waitlist', 7, 'grade_7');
  update public.subscriptions set current_period_end = now() - interval '1 second' where child_id = '00000000-0000-0000-0000-000000000132';

  -- Verify child starts with real expired beta subscription and NO pre-existing waitlist row
  if not exists (select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000132' and provider = 'beta') then
    raise exception 'child 132 does not have a beta subscription';
  end if;
  if exists (select 1 from public.waitlist where child_id = '00000000-0000-0000-0000-000000000132') then
    raise exception 'child 132 unexpectedly already has a waitlist row';
  end if;

  -- Now fill capacity completely
  select private_generation.locked_capacity_count() into active_count_before;
  update public.enrollment_settings set founding_limit = least(10, active_count_before), capacity = active_count_before where key = 'default';

  if (
    select checkout_allowed from public.prepare_paddle_checkout_v2(
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000132', 'standard_annual', '2026-08-26-v2'
    )
  ) is not false then
    raise exception 'checkout for returning beta was allowed while capacity was full';
  end if;

  if (
    select rejection_reason from public.prepare_paddle_checkout_v2(
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000132', 'standard_annual', '2026-08-26-v2'
    )
  ) <> 'capacity_full_waitlisted' then
    raise exception 'checkout for returning beta did not return capacity_full_waitlisted rejection reason';
  end if;

  if not exists (
    select 1 from public.waitlist where child_id = '00000000-0000-0000-0000-000000000132' and status = 'waiting'
  ) then
    raise exception 'full returning-beta path did not create a real persisted waiting row in waitlist';
  end if;

  update public.enrollment_settings set capacity = 100, founding_limit = 30 where key = 'default';

  -- 5) Strict transaction matching for capacity and Founder claim release:
  -- A bound claim cannot be released with null or mismatched transaction ID.
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000133', '00000000-0000-0000-0000-000000000001', 'Strict Capacity Claim Test', 7, 'grade_7');
  update public.subscriptions set current_period_end = now() - interval '1 second' where child_id = '00000000-0000-0000-0000-000000000133';

  select capacity_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000133', 'standard_annual', '2026-08-26-v2'
  );
  perform public.bind_capacity_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000133', test_claim_id, 'txn_strict_cap_133'
  );

  -- release with null => false, still bound
  if public.release_capacity_checkout_claim(test_claim_id, null, 'transaction_canceled') is true then
    raise exception 'bound capacity claim was erroneously released with null transaction ID';
  end if;
  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'bound' then
    raise exception 'bound capacity claim changed status after null transaction release attempt';
  end if;

  -- release with wrong transaction => false, still bound
  if public.release_capacity_checkout_claim(test_claim_id, 'txn_wrong_id', 'transaction_canceled') is true then
    raise exception 'bound capacity claim was erroneously released with mismatched transaction ID';
  end if;
  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'bound' then
    raise exception 'bound capacity claim changed status after mismatched transaction release attempt';
  end if;

  -- release with exact matching transaction => true
  if public.release_capacity_checkout_claim(test_claim_id, 'txn_strict_cap_133', 'transaction_canceled') is not true then
    raise exception 'bound capacity claim was not released with exact matching transaction ID';
  end if;
  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'released' then
    raise exception 'capacity claim was not marked released';
  end if;

  -- Strict transaction matching for Founder claim release:
  select founding_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000133', 'standard_monthly', '2026-08-26-v2'
  );
  perform public.bind_founder_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000133', test_claim_id, 'txn_strict_founder_133'
  );

  -- release with null => false, still bound
  if public.release_founder_checkout_claim(test_claim_id, null, 'discount_removed') is true then
    raise exception 'bound founder claim was erroneously released with null transaction ID';
  end if;
  if (select status from private_generation.founder_checkout_claims where id = test_claim_id) <> 'bound' then
    raise exception 'bound founder claim changed status after null transaction release attempt';
  end if;

  -- release with wrong transaction => false, still bound
  if public.release_founder_checkout_claim(test_claim_id, 'txn_wrong_id', 'discount_removed') is true then
    raise exception 'bound founder claim was erroneously released with mismatched transaction ID';
  end if;
  if (select status from private_generation.founder_checkout_claims where id = test_claim_id) <> 'bound' then
    raise exception 'bound founder claim changed status after mismatched transaction release attempt';
  end if;

  -- release with exact matching transaction => true
  if public.release_founder_checkout_claim(test_claim_id, 'txn_strict_founder_133', 'discount_removed') is not true then
    raise exception 'bound founder claim was not released with exact matching transaction ID';
  end if;
  if (select status from private_generation.founder_checkout_claims where id = test_claim_id) <> 'released' then
    raise exception 'founder claim was not marked released';
  end if;

  -- 6) Hard-cap authority regressions A through G:
  -- A. capacity=100, locked=99
  -- B. returning beta obtains final claim
  -- C. Paddle transaction is created
  -- D. capacity binding fails and transaction cancellation is unconfirmed (claim remains pending/unresolved in DB)
  -- E. another child must not gain a usable 100th seat while the first transaction remains unresolved
  -- F. webhook from an unbound/released/mismatched transaction must not activate the expired-beta child
  -- G. exact bound transaction webhook activates normally

  -- Step A: Set capacity so remaining capacity is exactly 1
  select private_generation.locked_capacity_count() into active_count_before;
  update public.enrollment_settings set founding_limit = least(10, active_count_before + 1), capacity = active_count_before + 1 where key = 'default';

  -- Step B: Returning beta child obtains final claim
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000134', '00000000-0000-0000-0000-000000000001', 'Returning Beta Hard Cap Test', 7, 'grade_7');
  update public.subscriptions set current_period_end = now() - interval '1 second' where child_id = '00000000-0000-0000-0000-000000000134';

  select capacity_claim_id into test_claim_id
  from public.prepare_paddle_checkout_v2(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000134', 'standard_annual', '2026-08-26-v2'
  );
  if test_claim_id is null then
    raise exception 'returning beta child did not receive capacity claim';
  end if;

  -- Steps C & D: Capacity claim remains pending/unresolved (e.g. binding failed and cancellation unconfirmed)
  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'pending' then
    raise exception 'capacity claim is not in pending state';
  end if;

  -- Step E: Another child tries to create profile or checkout; must not gain the 100th seat
  if (select remaining from public.get_enrollment_state()) <> 0 then
    raise exception 'unresolved pending capacity claim failed to consume capacity seat';
  end if;

  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000135', '00000000-0000-0000-0000-000000000001', 'Child Blocked By Unresolved Claim', 7, 'grade_7');

  if exists (
    select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000135'
  ) then
    raise exception 'child 135 was erroneously granted a trial subscription while capacity was consumed by unresolved claim';
  end if;

  if not exists (
    select 1 from public.waitlist where child_id = '00000000-0000-0000-0000-000000000135' and status = 'waiting'
  ) then
    raise exception 'child 135 was not placed in waiting status';
  end if;

  -- Step F: Webhook from unbound/mismatched transaction must not activate expired-beta child
  blocked := false;
  begin
    perform public.process_paddle_subscription_event_v2(
      p_event_id := 'evt_unbound_hard_cap_134', p_event_type := 'subscription.created', p_occurred_at := now(),
      p_child_id := '00000000-0000-0000-0000-000000000134', p_provider_subscription_id := 'sub_unbound_hard_cap_134',
      p_provider_customer_id := 'ctm_unbound_hard_cap_134', p_status := 'active', p_plan_code := 'standard_annual',
      p_billing_interval := 'year', p_price_twd := 4999, p_current_period_start := now(),
      p_current_period_end := now() + interval '1 year', p_cancel_at_period_end := false,
      p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := null,
      p_discount_status := null, p_discount_type := null, p_discount_ends_at := null,
      p_discount_ends_at_present := false, p_founder_claim_id := null, p_originating_transaction_id := 'txn_unbound_mismatched_134'
    );
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'webhook with unbound/mismatched transaction activated expired-beta child';
  end if;

  if (select provider from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000134') <> 'beta' then
    raise exception 'child 134 subscription was altered by rejected webhook';
  end if;

  -- Step G: Exact bound transaction webhook activates normally
  perform public.bind_capacity_checkout_transaction(
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000134', test_claim_id, 'txn_exact_bound_134'
  );

  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_exact_bound_134', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000134', p_provider_subscription_id := 'sub_exact_bound_134',
    p_provider_customer_id := 'ctm_exact_bound_134', p_status := 'active', p_plan_code := 'standard_annual',
    p_billing_interval := 'year', p_price_twd := 4999, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 year', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := null,
    p_discount_status := null, p_discount_type := null, p_discount_ends_at := null,
    p_discount_ends_at_present := false, p_founder_claim_id := null, p_originating_transaction_id := 'txn_exact_bound_134'
  );

  if (select status from private_generation.capacity_checkout_claims where id = test_claim_id) <> 'completed' then
    raise exception 'capacity claim was not completed by exact bound webhook';
  end if;

  if (select status from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000134') <> 'active' then
    raise exception 'exact bound webhook did not activate subscription';
  end if;

  update public.enrollment_settings set capacity = 100, founding_limit = 30 where key = 'default';

  -- 7) Soft capacity operational gate regressions:
  -- - 99 active + 1 paused => occupancy 100.
  -- - paused -> active does not increase occupancy above what was already reserved.
  -- - 100 active + canceled former customer can successfully re-subscribe, producing 101.
  -- - at 101/100, a genuinely new child is still waitlisted.
  -- - admin/enrollment state reports 101/100 truthfully.

  select private_generation.locked_capacity_count() into active_count_before;
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000136', '00000000-0000-0000-0000-000000000001', 'Paused Customer', 7, 'grade_7');
  update public.subscriptions
  set provider = 'paddle', status = 'paused', provider_subscription_id = 'sub_paused_136'
  where child_id = '00000000-0000-0000-0000-000000000136';

  -- Paused subscription counts toward occupancy
  if (select private_generation.locked_capacity_count()) <> active_count_before + 1 then
    raise exception 'paused subscription was not counted in locked_capacity_count';
  end if;

  -- Paused -> active does not increase occupancy
  update public.subscriptions set status = 'active' where child_id = '00000000-0000-0000-0000-000000000136';
  if (select private_generation.locked_capacity_count()) <> active_count_before + 1 then
    raise exception 'transitioning paused to active erroneously increased locked_capacity_count';
  end if;

  -- Canceled former customer is excluded from occupancy
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000137', '00000000-0000-0000-0000-000000000001', 'Canceled Customer', 7, 'grade_7');
  update public.subscriptions
  set provider = 'paddle', status = 'canceled', provider_subscription_id = 'sub_canceled_137'
  where child_id = '00000000-0000-0000-0000-000000000137';

  if (select private_generation.locked_capacity_count()) <> active_count_before + 1 then
    raise exception 'canceled subscription was erroneously counted in locked_capacity_count';
  end if;

  -- Set capacity to active_count_before + 1 (i.e. capacity full)
  update public.enrollment_settings set founding_limit = least(10, active_count_before + 1), capacity = active_count_before + 1 where key = 'default';

  -- Canceled former customer can successfully re-subscribe without capacity claim
  if (
    select checkout_allowed from public.prepare_paddle_checkout_v2(
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000137', 'standard_annual', '2026-08-26-v2'
    )
  ) is not true then
    raise exception 'canceled customer was blocked from checkout when capacity was full';
  end if;

  perform public.process_paddle_subscription_event_v2(
    p_event_id := 'evt_resub_canceled_137', p_event_type := 'subscription.created', p_occurred_at := now(),
    p_child_id := '00000000-0000-0000-0000-000000000137', p_provider_subscription_id := 'sub_resub_137',
    p_provider_customer_id := 'ctm_resub_137', p_status := 'active', p_plan_code := 'standard_annual',
    p_billing_interval := 'year', p_price_twd := 4999, p_current_period_start := now(),
    p_current_period_end := now() + interval '1 year', p_cancel_at_period_end := false,
    p_expected_founding_discount_id := 'dsc_founder_expected', p_discount_id := null,
    p_discount_status := null, p_discount_type := null, p_discount_ends_at := null,
    p_discount_ends_at_present := false, p_founder_claim_id := null, p_originating_transaction_id := 'txn_resub_137'
  );

  -- Now occupancy is active_count_before + 2 (producing 101/100)
  if (select private_generation.locked_capacity_count()) <> active_count_before + 2 then
    raise exception 're-subscribed customer did not update locked_capacity_count to over-cap value';
  end if;

  -- Enrollment state truthfully reports over-cap count without clamping
  if (select active_count from public.get_enrollment_state()) <> active_count_before + 2
     or (select remaining from public.get_enrollment_state()) <> 0
     or (select capacity from public.get_enrollment_state()) <> active_count_before + 1 then
    raise exception 'enrollment state failed to report truthful over-cap counts';
  end if;

  -- Genuinely new child at 101/100 is still waitlisted
  insert into public.children (id, parent_id, display_name, grade, grade_stage)
  values ('00000000-0000-0000-0000-000000000138', '00000000-0000-0000-0000-000000000001', 'New Child At 101', 7, 'grade_7');

  if exists (
    select 1 from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000138'
  ) then
    raise exception 'genuinely new child at 101/100 was erroneously granted a trial subscription';
  end if;

  if not exists (
    select 1 from public.waitlist where child_id = '00000000-0000-0000-0000-000000000138' and status = 'waiting'
  ) then
    raise exception 'genuinely new child at 101/100 was not placed on waitlist';
  end if;

  update public.enrollment_settings set capacity = 100, founding_limit = 30 where key = 'default';

  -- Monotonic Founder authority test: hard deletion does not decrease founding_count
  select founding_count into founder_count_before from public.get_enrollment_state();
  delete from public.subscriptions where child_id = '00000000-0000-0000-0000-000000000118';
  if (select founding_count from public.get_enrollment_state()) <> founder_count_before then
    raise exception 'hard deletion of redeemed subscription decreased founding_count (monotonic authority violated)';
  end if;

  -- Announcement Center Tests
  insert into public.announcements (id, title, body, category, status, published_at)
  values
    ('00000000-0000-0000-0000-000000000101', 'Published 1', 'Content 1', 'feature', 'published', now() - interval '2 days'),
    ('00000000-0000-0000-0000-000000000102', 'Published 2', 'Content 2', 'material', 'published', now() - interval '1 day'),
    ('00000000-0000-0000-0000-000000000103', 'Future Notice', 'Content 3', 'notice', 'published', now() + interval '1 day'),
    ('00000000-0000-0000-0000-000000000104', 'Draft Maintenance', 'Content 4', 'maintenance', 'draft', null),
    ('00000000-0000-0000-0000-000000000105', 'Archived Notice', 'Content 5', 'notice', 'archived', now() - interval '10 days');

  if has_table_privilege('anon', 'public.announcements', 'select') then
    raise exception 'REGRESSION: anon role has select privilege on announcements';
  end if;

  if has_table_privilege('authenticated', 'public.announcements', 'insert')
     or has_table_privilege('authenticated', 'public.announcements', 'update')
     or has_table_privilege('authenticated', 'public.announcements', 'delete') then
    raise exception 'REGRESSION: authenticated role has mutating privileges on announcements';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform set_config('role', 'authenticated', true);

  select count(*) into visible_count from public.announcements;
  if visible_count <> 2 then
    raise exception 'authenticated user should see exactly 2 published announcements, saw %', visible_count;
  end if;

  if (select id from public.announcements order by published_at desc, id desc limit 1) <> '00000000-0000-0000-0000-000000000102'::uuid then
    raise exception 'announcements not returned in deterministic published_at desc order';
  end if;

  perform set_config('role', 'none', true);

  -- Clean up
  delete from public.announcements
  where id in (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000105'
  );
  delete from public.material_quality_overrides
  where job_id = '00000000-0000-0000-0000-000000000088';
  delete from auth.users where id = '00000000-0000-0000-0000-000000000001';
end;
$$;

rollback;
