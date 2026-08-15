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
    '00000000-0000-0000-0000-000000000002'
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
      'family-a/student.pdf', 'family-a/answer.pdf'
    ),
    (
      '00000000-0000-0000-0000-000000000032',
      '00000000-0000-0000-0000-000000000023', current_date, 'test-v1', '{}'::jsonb,
      'family-b/student.pdf', 'family-b/answer.pdf'
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
    'observation-idempotency-test', 'completed', now(), 'observation-test',
    '00000000-0000-0000-0000-000000000031', now(),
    now() + interval '24 hours', now() - interval '24 hours', now()
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
    ('weekly-materials', 'family-a/student.pdf'),
    ('weekly-materials', 'family-b/student.pdf');

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

do $$
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
  if has_function_privilege('anon', 'public.prepare_paddle_checkout(uuid,uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.prepare_paddle_checkout(uuid,uuid)', 'execute') then
    raise exception 'browser roles can execute Paddle checkout preparation RPC';
  end if;
  if not has_function_privilege('service_role', 'public.prepare_paddle_checkout(uuid,uuid)', 'execute') then
    raise exception 'service role cannot prepare Paddle checkout';
  end if;
end;
$$;
