-- Migration: 20260817020000_wire_production_schema_220_and_cap_loop.sql
-- Wave 4.2: Production Schema 2.2.0 Wiring, Context Capsule CAP Metrics, and Closed Exposure Loop

-- 1. Update submit bridge to accept Schema 2.2.0 (alongside backward-compatible 2.0.0 and 2.1.0)
create or replace function private_generation.chatgpt_submit_curriculum_package(
  job_id uuid, worker_id text, canonical_source jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  claim_snapshot private_generation.generation_claim_snapshots;
  existing_submission private_generation.curriculum_submissions;
  schema_ver text;
begin
  schema_ver := canonical_source #>> '{metadata,schemaVersion}';
  if jsonb_typeof(canonical_source) <> 'object'
    or schema_ver not in ('2.0.0', '2.1.0', '2.2.0') then
    raise exception 'canonical_source must be a Curriculum Package 2.0.0, 2.1.0, or 2.2.0 object';
  end if;
  if pg_column_size(canonical_source) > 2097152 then
    raise exception 'canonical_source exceeds the 2 MiB bridge limit';
  end if;

  select * into claimed_job from public.generation_jobs as job where job.id = $1 for update;
  if claimed_job.id is null or claimed_job.status <> 'claimed'
    or claimed_job.claimed_by <> $2 or claimed_job.lease_expires_at <= now() then
    raise exception 'job is not actively claimed by this worker';
  end if;
  if canonical_source #>> '{metadata,jobId}' <> claimed_job.id::text
    or canonical_source #>> '{metadata,childId}' <> claimed_job.child_id::text then
    raise exception 'curriculum package metadata does not match the claimed job';
  end if;

  select * into claim_snapshot
  from private_generation.generation_claim_snapshots as snapshot
  where snapshot.job_id = $1 for update;
  if claim_snapshot.job_id is null or claim_snapshot.generation_worker_id <> $2 then
    raise exception 'server-owned generation claim snapshot is missing';
  end if;
  if canonical_source #>> '{metadata,inputFingerprint}' is distinct from claim_snapshot.input_fingerprint then
    raise exception 'curriculum package input fingerprint does not match the claimed context';
  end if;

  select * into existing_submission
  from private_generation.curriculum_submissions as submission
  where submission.job_id = $1 and submission.authoring_attempt = claimed_job.attempt_count;
  if existing_submission.job_id is not null then
    return jsonb_build_object('jobId', $1, 'status', existing_submission.status, 'authoringAttempt', existing_submission.authoring_attempt);
  end if;

  insert into private_generation.curriculum_submissions (
    job_id, authoring_attempt, generation_worker_id, canonical_source, status
  ) values (
    $1, claimed_job.attempt_count, $2, $3, 'submitted'
  );

  return jsonb_build_object(
    'jobId', $1,
    'status', 'submitted',
    'authoringAttempt', claimed_job.attempt_count,
    'schemaVersion', schema_ver
  );
end;
$$;

-- 2. Update context builder to include communicationCapsule and compact capCoverageCapsule
create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  result jsonb;
  v_vocab_due jsonb;
  v_vocab_weak jsonb;
  v_vocab_uncertain jsonb;
  v_vocab_mastered jsonb;
  v_vocab_count integer;
  v_grammar_due jsonb;
  v_grammar_weak jsonb;
  v_grammar_uncertain jsonb;
  v_grammar_count integer;
  v_comm_due jsonb;
  v_comm_weak jsonb;
  v_comm_count integer;
begin
  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
    and job.status = 'claimed'
    and job.claimed_by = $2
    and job.lease_expires_at > now();

  if claimed_job.id is null then
    raise exception 'job is not actively claimed by this worker';
  end if;

  -- Distill vocabulary into decision categories
  select
    coalesce(jsonb_agg(vocabulary_id) filter (where status = 'reviewing' or (last_seen_at < now() - interval '6 days' and status != 'mastered')), '[]'::jsonb),
    coalesce(jsonb_agg(vocabulary_id) filter (where (mastery_score is not null and mastery_score < 60) or (exposure_count > 1 and correct_count < exposure_count / 2)), '[]'::jsonb),
    coalesce(jsonb_agg(vocabulary_id) filter (where status = 'new' or (exposure_count = 1 and correct_count = 0)), '[]'::jsonb),
    coalesce(jsonb_agg(vocabulary_id) filter (where status = 'mastered'), '[]'::jsonb),
    count(*)
  into v_vocab_due, v_vocab_weak, v_vocab_uncertain, v_vocab_mastered, v_vocab_count
  from public.child_vocab_progress
  where child_id = claimed_job.child_id;

  -- Distill grammar into decision categories
  select
    coalesce(jsonb_agg(grammar_id) filter (where status = 'reviewing' or (last_seen_at < now() - interval '6 days' and status != 'mastered')), '[]'::jsonb),
    coalesce(jsonb_agg(grammar_id) filter (where (mastery_score is not null and mastery_score < 60) or (exposure_count > 1 and correct_count < exposure_count / 2)), '[]'::jsonb),
    coalesce(jsonb_agg(grammar_id) filter (where status in ('new', 'learning')), '[]'::jsonb),
    count(*)
  into v_grammar_due, v_grammar_weak, v_grammar_uncertain, v_grammar_count
  from public.child_grammar_progress
  where child_id = claimed_job.child_id;

  -- Distill communication functions into decision categories
  select
    coalesce(jsonb_agg(communication_function_id) filter (where mastery_status = 'reviewing' or (last_seen_at < now() - interval '14 days' and mastery_status != 'mastered')), '[]'::jsonb),
    coalesce(jsonb_agg(communication_function_id) filter (where (exposure_count > 1 and miss_count > 0) or mastery_status = 'learning'), '[]'::jsonb),
    count(*)
  into v_comm_due, v_comm_weak, v_comm_count
  from public.child_communication_progress
  where child_id = claimed_job.child_id;

  select jsonb_build_object(
    'job', jsonb_build_object(
      'id', claimed_job.id, 'childId', claimed_job.child_id,
      'materialWeek', claimed_job.material_week, 'ruleVersion', claimed_job.rule_version,
      'releaseAt', claimed_job.release_at, 'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing, 'sourceMaterialId', claimed_job.source_material_id
    ),
    'child', jsonb_build_object(
      'grade', child.grade, 'gradeStage', child.grade_stage,
      'textbookVersion', child.textbook_version, 'preferences', child.preferences
    ),
    'profile', to_jsonb(profile) - 'child_id' - 'created_at' - 'updated_at',
    'learningState', to_jsonb(state) - 'child_id' - 'updated_at',
    'vocabularyCapsule', jsonb_build_object(
      'dueForReview', v_vocab_due,
      'weakRecent', v_vocab_weak,
      'uncertain', v_vocab_uncertain,
      'recentlyMastered', v_vocab_mastered,
      'historicalCount', coalesce(v_vocab_count, 0)
    ),
    'grammarCapsule', jsonb_build_object(
      'dueForReview', v_grammar_due,
      'weakRecent', v_grammar_weak,
      'uncertain', v_grammar_uncertain,
      'historicalCount', coalesce(v_grammar_count, 0)
    ),
    'communicationCapsule', jsonb_build_object(
      'dueForReview', coalesce(v_comm_due, '[]'::jsonb),
      'weakRecent', coalesce(v_comm_weak, '[]'::jsonb),
      'historicalCount', coalesce(v_comm_count, 0)
    ),
    'capCoverageCapsule', jsonb_build_object(
      'vocabulary', jsonb_build_object(
        'exposurePct', least(100, round((coalesce(v_vocab_count, 0)::numeric / 2000.0) * 100)),
        'masteryEvidencePct', least(100, round((jsonb_array_length(coalesce(v_vocab_mastered, '[]'::jsonb))::numeric / 2000.0) * 100)),
        'dueReviewCount', jsonb_array_length(coalesce(v_vocab_due, '[]'::jsonb))
      ),
      'grammar', jsonb_build_object(
        'exposurePct', least(100, round((coalesce(v_grammar_count, 0)::numeric / 24.0) * 100)),
        'masteryEvidencePct', least(100, round((coalesce(v_grammar_count, 0)::numeric / 24.0) * 40)),
        'dueReviewCount', jsonb_array_length(coalesce(v_grammar_due, '[]'::jsonb))
      ),
      'communication', jsonb_build_object(
        'exposurePct', least(100, round((coalesce(v_comm_count, 0)::numeric / 16.0) * 100)),
        'masteryEvidencePct', 0,
        'dueReviewCount', jsonb_array_length(coalesce(v_comm_due, '[]'::jsonb))
      )
    ),
    'sourceMaterial', case when source_material.id is null then null else jsonb_build_object(
      'id', source_material.id, 'materialWeek', source_material.material_week,
      'generationSummary', source_material.generation_summary
    ) end,
    'feedback', case when feedback.id is null then null else to_jsonb(feedback) - 'child_id' - 'updated_at' end
  ) into result
  from public.children as child
  join public.child_profiles as profile on profile.child_id = child.id
  join public.child_learning_state as state on state.child_id = child.id
  left join public.materials as source_material on source_material.id = claimed_job.source_material_id
  left join public.feedback as feedback
    on feedback.child_id = claimed_job.child_id
    and feedback.material_id = claimed_job.source_material_id
    and feedback.created_at <= claimed_job.feedback_cutoff_at
  where child.id = claimed_job.child_id;

  return result;
end;
$$;

-- 3. Update observation recording to close the exposure loop across vocab, grammar, and communication
create or replace function public.worker_record_curriculum_observations(
  material_id uuid,
  worker_id text,
  canonical_source jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  material_row public.materials;
  source jsonb;
  child_id_value uuid;
  vocabulary_item jsonb;
  vocab_id_text text;
  target_id text;
  target_domain text;
  comm_func_id text;
  quality_item jsonb;
  history_entry jsonb;
  target_evidence jsonb;
begin
  perform $3;
  select material.* into material_row
  from public.materials as material
  join public.generation_jobs as job on job.material_id = material.id
  where material.id = $1
    and job.status = 'completed'
    and job.claimed_by = $2
  for update of material;

  if material_row.id is null then raise exception 'completed material is not owned by this worker'; end if;
  if material_row.observations_recorded_at is not null then return false; end if;

  source := material_row.canonical_source;
  child_id_value := material_row.child_id;

  -- 1. Vocabulary exposure recording
  for vocabulary_item in
    select value from jsonb_array_elements(coalesce(source #> '{studentLesson,vocabulary}', '[]'::jsonb))
  loop
    vocab_id_text := left(coalesce(vocabulary_item->>'id', vocabulary_item->>'word'), 160);
    insert into public.child_vocab_progress (
      child_id, vocabulary_id, status, exposure_count, last_seen_at, last_material_id
    ) values (
      child_id_value,
      vocab_id_text,
      case vocabulary_item->>'status'
        when 'repeated-miss' then 'learning'
        when 'review' then 'reviewing'
        else 'new'
      end,
      1, now(), $1
    )
    on conflict (child_id, vocabulary_id) do update
    set exposure_count = public.child_vocab_progress.exposure_count + 1,
        last_seen_at = now(),
        last_material_id = excluded.last_material_id,
        status = case when public.child_vocab_progress.status = 'mastered' then 'mastered' else excluded.status end,
        updated_at = now();
  end loop;

  -- 2. Grammar target exposure recording
  for target_id, target_domain in
    select target->>'id', target->>'domain'
    from jsonb_array_elements(coalesce(source #> '{learningPlan,targets}', '[]'::jsonb)) as target
  loop
    if target_domain = 'grammar' then
      insert into public.child_grammar_progress (
        child_id, grammar_id, status, exposure_count, last_seen_at, last_material_id
      ) values (child_id_value, left(target_id, 160), 'learning', 1, now(), $1)
      on conflict (child_id, grammar_id) do update
      set exposure_count = public.child_grammar_progress.exposure_count + 1,
          last_seen_at = now(),
          last_material_id = excluded.last_material_id,
          updated_at = now();
    end if;
  end loop;

  -- 3. Communication function exposure recording (Hard Invariant: Exposure does NOT grant mastery)
  for comm_func_id in
    select jsonb_array_elements_text(coalesce(source #> '{trackingDelta,exposedCommunicationFunctionIds}', '[]'::jsonb))
    union
    select target->>'id'
    from jsonb_array_elements(coalesce(source #> '{learningPlan,targets}', '[]'::jsonb)) as target
    where target->>'domain' = 'communication'
  loop
    if comm_func_id is not null and length(comm_func_id) > 0 then
      insert into public.child_communication_progress (
        child_id, communication_function_id, mastery_status, exposure_count, last_seen_at, last_material_id
      ) values (
        child_id_value, left(comm_func_id, 160), 'learning', 1, now(), $1
      )
      on conflict (child_id, communication_function_id) do update
      set exposure_count = public.child_communication_progress.exposure_count + 1,
          last_seen_at = now(),
          last_material_id = excluded.last_material_id,
          updated_at = now();
    end if;
  end loop;

  -- 4. Target Evidence Aggregation
  select coalesce(jsonb_agg(jsonb_build_object(
    'targetId', evidence.target_id,
    'checks', evidence.checks
  ) order by evidence.target_id), '[]'::jsonb)
  into target_evidence
  from (
    select item.target_id,
           jsonb_agg(jsonb_build_object('questionId', item.question_id, 'stage', item.stage)
             order by item.stage, item.question_id) as checks
    from (
      select target.value as target_id, question->>'id' as question_id, stage->>'stage' as stage
      from jsonb_array_elements(coalesce(source #> '{studentLesson,practice}', '[]'::jsonb)) as stage
      cross join lateral jsonb_array_elements(coalesce(stage->'questions', '[]'::jsonb)) as question
      cross join lateral jsonb_array_elements_text(coalesce(question->'targetIds', '[]'::jsonb)) as target(value)
      union all
      select target.value, question->>'id', 'homework'
      from jsonb_array_elements(coalesce(source #> '{studentLesson,homework,questions}', '[]'::jsonb)) as question
      cross join lateral jsonb_array_elements_text(coalesce(question->'targetIds', '[]'::jsonb)) as target(value)
    ) as item
    group by item.target_id
  ) as evidence;

  history_entry := jsonb_build_object(
    'materialId', $1,
    'week', material_row.material_week,
    'curriculumVersion', source #>> '{metadata,curriculumVersion}',
    'theme', source #>> '{studentLesson,reading,title}',
    'targets', coalesce(source #> '{learningPlan,targets}', '[]'::jsonb),
    'targetEvidence', target_evidence,
    'hypotheses', coalesce(source #> '{trackingDelta,hypothesesToVerify}', '[]'::jsonb),
    'nextReviewCandidates', coalesce(source #> '{trackingDelta,nextReviewCandidates}', '[]'::jsonb),
    'feedbackApplied', coalesce(source #> '{qualityEvidence,feedbackApplied}', '[]'::jsonb),
    'improvements', coalesce(source #> '{qualityEvidence,improvementComparedToPrevious}', '[]'::jsonb),
    'recordedAt', now()
  );
  update public.child_learning_state
  set compact_weekly_history = (
        (case when jsonb_array_length(compact_weekly_history) >= 11 then compact_weekly_history - 0 else compact_weekly_history end)
        || jsonb_build_array(history_entry)
      ),
      recent_feedback_summary = left(coalesce(source #>> '{learnerSnapshot,feedbackSummary}', recent_feedback_summary), 4000),
      updated_at = now()
  where child_id = child_id_value;

  for quality_item in
    select value from jsonb_array_elements(coalesce(source #> '{qualityEvidence,criticFindings}', '[]'::jsonb))
  loop
    insert into public.curriculum_quality_observations (
      child_id, material_id, dimension, severity, evidence
    ) values (
      child_id_value, $1, left(quality_item->>'dimension', 160), quality_item->>'severity',
      left(coalesce(quality_item->>'finding', ''), 4000)
    );
  end loop;

  update public.materials set observations_recorded_at = now() where id = material_row.id;
  return true;
end;
$$;

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;

revoke all on function public.worker_record_curriculum_observations(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.worker_record_curriculum_observations(uuid, text, jsonb) to service_role;
