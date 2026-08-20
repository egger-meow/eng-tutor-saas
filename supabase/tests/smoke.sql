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
  first_package jsonb;
  second_package jsonb;
  completed_material_id uuid;
begin
  insert into auth.users (id, raw_user_meta_data)
  values (
    '00000000-0000-0000-0000-000000000001',
    '{"display_name":"Migration Test"}'::jsonb
  );

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

  perform public.prepare_paddle_checkout(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'standard_monthly'
  );
  if (
    select founding_status from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000002'
  ) <> 'eligible' then
    raise exception 'checkout preparation did not reserve founding eligibility';
  end if;

  perform public.process_paddle_subscription_event(
    'evt_checkout_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000002',
    'sub_checkout_smoke', 'ctm_checkout_smoke', 'active',
    'standard_monthly', 'month', 499,
    now(), now() + interval '1 month', false
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
  ) <> 'eligible' then
    raise exception 'new trial student was not allocated founding eligibility when under limit';
  end if;

  perform public.prepare_paddle_checkout(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'standard_annual'
  );

  perform public.process_paddle_subscription_event(
    'evt_annual_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', false
  );
  if not exists (
    select 1 from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
      and plan_code = 'standard_annual'
      and billing_interval = 'year'
      and price_twd = 4999
      and founding_status = 'eligible'
  ) then
    raise exception 'annual Paddle webhook did not persist canonical plan data';
  end if;

  perform public.process_paddle_subscription_event(
    'evt_annual_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', false
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
      now(), now() + interval '1 year', false
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
      now(), now() + interval '1 month', false
    );
  exception when others then
    blocked := true;
  end;
  perform public.process_paddle_subscription_event(
    'evt_cancel_smoke', 'subscription.updated', now(),
    '00000000-0000-0000-0000-000000000004',
    'sub_annual_smoke', 'ctm_checkout_smoke', 'active',
    'standard_annual', 'year', 4999,
    now(), now() + interval '1 year', true
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
    now(), now() + interval '1 year', false
  );
  if (
    select cancel_at_period_end from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000004'
  ) <> false then
    raise exception 'resume webhook did not reset cancel_at_period_end to false';
  end if;

  update public.enrollment_settings set founding_limit = 2 where key = 'default';
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
  bridge_context := bridge_claim_result #> '{claimed,0}';
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

  if bridge_claim_result ->> 'bridgeVersion' <> '1.2.0'
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
        'schemaVersion', '2.0.0', 'jobId', bridge_job_id::text,
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
      'schemaVersion', '2.0.0', 'jobId', bridge_job_id::text,
      'childId', bridge_child_id::text, 'inputFingerprint', bridge_fingerprint
    ));
  perform private_generation.chatgpt_submit_curriculum_package(bridge_job_id, 'bridge-smoke', first_package);
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
  select item into bridge_context
  from jsonb_array_elements(bridge_claim_result -> 'claimed') as claimed(item)
  where item #>> '{job,id}' = bridge_job_id::text;
  if bridge_context #>> '{retryContext,previousAttemptNumber}' <> '1'
    or bridge_context #>> '{retryContext,findings,0,path}' <> 'reading.answer'
    or bridge_context #> '{retryContext,previousCanonicalPackage}' <> first_package then
    raise exception 'retry claim omitted the immutable package or exact failure evidence';
  end if;

  bridge_fingerprint := bridge_context ->> 'inputFingerprint';
  second_package := jsonb_build_object('metadata', jsonb_build_object(
    'schemaVersion', '2.0.0', 'jobId', bridge_job_id::text,
    'childId', bridge_child_id::text, 'inputFingerprint', bridge_fingerprint,
    'repairMarker', 'targeted-attempt-2'
  ));
  perform private_generation.chatgpt_submit_curriculum_package(bridge_job_id, 'bridge-smoke', second_package);
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
      'schemaVersion', '2.0.0', 'jobId', '00000000-0000-0000-0000-000000000071',
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
  set canonical_source = '{"studentLesson":{"vocabulary":[]},"learningPlan":{"targets":[]},"trackingDelta":{"hypothesesToVerify":[]},"qualityEvidence":{"feedbackApplied":[],"criticFindings":[]},"learnerSnapshot":{"feedbackSummary":"smoke"},"metadata":{"curriculumVersion":"test-v1"}}'::jsonb
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
  blocked boolean := false;
begin
  if not has_column_privilege('authenticated', 'public.generation_jobs', 'material_id', 'select')
    or not has_column_privilege('authenticated', 'public.generation_jobs', 'child_id', 'select')
    or not has_column_privilege('authenticated', 'public.generation_jobs', 'release_at', 'select') then
    raise exception 'authenticated parents cannot read the safe material release schedule';
  end if;
  if has_column_privilege('authenticated', 'public.generation_jobs', 'status', 'select')
    or has_column_privilege('authenticated', 'public.generation_jobs', 'error_message', 'select')
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
  if has_function_privilege('anon', 'public.prepare_paddle_checkout(uuid,uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.prepare_paddle_checkout(uuid,uuid,text)', 'execute') then
    raise exception 'browser roles can execute Paddle checkout preparation RPC';
  end if;
  if not has_function_privilege('service_role', 'public.prepare_paddle_checkout(uuid,uuid,text)', 'execute') then
    raise exception 'service role cannot prepare Paddle checkout';
  end if;
  if has_function_privilege(
    'anon',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean)',
    'execute'
  ) then
    raise exception 'browser roles can execute Paddle webhook processing RPC';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.process_paddle_subscription_event(text,text,timestamptz,uuid,text,text,public.subscription_status,text,text,integer,timestamptz,timestamptz,boolean)',
    'execute'
  ) then
    raise exception 'service role cannot execute Paddle webhook processing RPC';
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
  perform private_generation.chatgpt_submit_curriculum_package(
    test_job_id,
    'chatgpt-test-worker',
    jsonb_build_object(
      'metadata', jsonb_build_object(
        'schemaVersion', '2.2.0',
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
  if (select count(*) from public.generation_jobs where child_id = '00000000-0000-0000-0000-000000000099' and status = 'pending') <> 1 then
    raise exception 'did not recreate exactly one fresh pending job on reset';
  end if;
  if not exists (select 1 from public.children where id = '00000000-0000-0000-0000-000000000099' and grade = 8 and textbook_version = 'hanlin') then
    raise exception 'child profile data was corrupted on reset';
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
  blocked := false;
  begin
    perform public.prepare_paddle_checkout(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000077',
      'standard_monthly'
    );
  exception
    when others then
      blocked := true;
  end;

  if not blocked then
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
  perform public.prepare_paddle_checkout(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000077',
    'standard_monthly'
  );

  -- Process Paddle webhook payment event for released waitlist child
  perform public.process_paddle_subscription_event(
    'evt_waitlist_smoke', 'subscription.created', now(),
    '00000000-0000-0000-0000-000000000077',
    'sub_waitlist_smoke', 'ctm_waitlist_smoke', 'active',
    'standard_monthly', 'month', 499,
    now(), now() + interval '1 month', false
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
      now(), now() + interval '1 month', false
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
    now(), now() + interval '1 month', false
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
    from generate_series(1, 6) as series(n)
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
  ) <> 6 then
    raise exception 'REGRESSION: released history count must exclude the future prepared material';
  end if;

  -- Clean up
  delete from auth.users where id = '00000000-0000-0000-0000-000000000001';
end;
$$;

rollback;
