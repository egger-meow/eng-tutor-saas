-- Migration: 20260819143000_fix_weak_recent_and_progression_authority.sql
-- Description: Fixes weakRecent distillation so unverified exposure is never classified as weakness,
-- and fixes recommended gap query ordering to prioritize unexposed units for forward progression.

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  child_rec record;
  result jsonb;
  v_vocab_due jsonb;
  v_vocab_weak jsonb;
  v_vocab_uncertain jsonb;
  v_vocab_mastered jsonb;
  v_vocab_count integer;
  v_grammar_due jsonb;
  v_grammar_weak jsonb;
  v_grammar_uncertain jsonb;
  v_grammar_mastered jsonb;
  v_grammar_count integer;
  v_comm_due jsonb;
  v_comm_weak jsonb;
  v_comm_uncertain jsonb;
  v_comm_mastered jsonb;
  v_comm_count integer;
  v_vocab_exp_count integer;
  v_vocab_mastered_count integer;
  v_vocab_due_count integer;
  v_grammar_exp_count integer;
  v_grammar_mastered_count integer;
  v_grammar_due_count integer;
  v_comm_exp_count integer;
  v_comm_mastered_count integer;
  v_comm_due_count integer;
  v_rec_vocab jsonb;
  v_rec_grammar jsonb;
  v_rec_comm jsonb;
  v_recent_genres jsonb;
  v_recent_contexts jsonb;
  v_recent_families jsonb;
  child_rank integer;
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

  select child.*
  into child_rec
  from public.children as child
  where child.id = claimed_job.child_id;

  child_rank := coalesce(
    public.grade_stage_rank(child_rec.grade_stage),
    public.grade_stage_rank(child_rec.grade::text),
    7
  );

  -- 1. Distill vocabulary into decision categories
  -- Hard Invariant: weakRecent MUST have actual failure evidence (mastery_score < 60).
  -- Unassessed exposure belongs in uncertain, never weakRecent.
  select
    coalesce(jsonb_agg(vocabulary_id) filter (where status = 'reviewing' or (last_seen_at < now() - interval '6 days' and status != 'mastered')), '[]'::jsonb),
    coalesce(jsonb_agg(vocabulary_id) filter (where mastery_score is not null and mastery_score < 60), '[]'::jsonb),
    coalesce(jsonb_agg(vocabulary_id) filter (where status in ('new', 'learning') and (mastery_score is null or mastery_score >= 60)), '[]'::jsonb),
    coalesce(jsonb_agg(vocabulary_id) filter (where status = 'mastered'), '[]'::jsonb),
    count(*)
  into v_vocab_due, v_vocab_weak, v_vocab_uncertain, v_vocab_mastered, v_vocab_count
  from public.child_vocab_progress
  where child_id = claimed_job.child_id;

  -- 2. Distill grammar into decision categories
  -- Hard Invariant: weakRecent MUST have actual failure evidence. Exposure without failure is learning/uncertain, not weakness.
  select
    coalesce(jsonb_agg(grammar_id) filter (where status = 'reviewing' or (last_seen_at < now() - interval '6 days' and status != 'mastered')), '[]'::jsonb),
    coalesce(jsonb_agg(grammar_id) filter (where mastery_score is not null and mastery_score < 60), '[]'::jsonb),
    coalesce(jsonb_agg(grammar_id) filter (where status in ('new', 'learning') and (mastery_score is null or mastery_score >= 60)), '[]'::jsonb),
    coalesce(jsonb_agg(grammar_id) filter (where status = 'mastered'), '[]'::jsonb),
    count(*)
  into v_grammar_due, v_grammar_weak, v_grammar_uncertain, v_grammar_mastered, v_grammar_count
  from public.child_grammar_progress
  where child_id = claimed_job.child_id;

  -- 3. Distill communication functions into decision categories
  select
    coalesce(jsonb_agg(communication_function_id) filter (where status = 'reviewing' or (last_seen_at < now() - interval '14 days' and status != 'mastered')), '[]'::jsonb),
    coalesce(jsonb_agg(communication_function_id) filter (where (miss_count > 0) or (assessed_count > 0 and correct_count < assessed_count)), '[]'::jsonb),
    coalesce(jsonb_agg(communication_function_id) filter (where status = 'new' or (exposure_count > 0 and (assessed_count = 0 or assessed_count is null))), '[]'::jsonb),
    coalesce(jsonb_agg(communication_function_id) filter (where status = 'mastered'), '[]'::jsonb),
    count(*)
  into v_comm_due, v_comm_weak, v_comm_uncertain, v_comm_mastered, v_comm_count
  from public.child_communication_progress
  where child_id = claimed_job.child_id;

  -- Factual counts
  v_vocab_exp_count := coalesce(v_vocab_count, 0);
  v_vocab_mastered_count := jsonb_array_length(coalesce(v_vocab_mastered, '[]'::jsonb));
  v_vocab_due_count := jsonb_array_length(coalesce(v_vocab_due, '[]'::jsonb));

  v_grammar_exp_count := coalesce(v_grammar_count, 0);
  v_grammar_mastered_count := jsonb_array_length(coalesce(v_grammar_mastered, '[]'::jsonb));
  v_grammar_due_count := jsonb_array_length(coalesce(v_grammar_due, '[]'::jsonb));

  v_comm_exp_count := coalesce(v_comm_count, 0);
  v_comm_mastered_count := jsonb_array_length(coalesce(v_comm_mastered, '[]'::jsonb));
  v_comm_due_count := jsonb_array_length(coalesce(v_comm_due, '[]'::jsonb));

  -- 1. Recommended Vocabulary Gap Fill: Prioritize UNEXPOSED vocabulary for forward progression
  select coalesce(jsonb_agg(sub.id), '[]'::jsonb)
  into v_rec_vocab
  from (
    select ccv.id
    from public.canonical_curriculum_vocabulary as ccv
    left join public.child_vocab_progress as cvp
      on cvp.child_id = claimed_job.child_id and cvp.vocabulary_id = ccv.id
    where (cvp.vocabulary_id is null or cvp.status in ('learning', 'reviewing'))
      and public.grade_stage_rank(ccv.grade_stage) <= child_rank
    order by (cvp.vocabulary_id is null) desc, ccv.id asc
    limit 8
  ) as sub;

  -- 2. Recommended Grammar Gap Fill: Prioritize UNEXPOSED canonical grammar units for forward progression
  select coalesce(jsonb_agg(sub.unit_id), '[]'::jsonb)
  into v_rec_grammar
  from (
    select cgu.unit_id
    from public.canonical_grammar_units as cgu
    left join public.child_grammar_progress as cgp
      on cgp.child_id = claimed_job.child_id and cgp.grammar_id = cgu.unit_id
    where (cgp.grammar_id is null or cgp.status in ('learning', 'reviewing'))
      and public.grade_stage_rank(cgu.grade_stage) <= child_rank
    order by (cgp.grammar_id is null) desc, cgu.unit_id asc
    limit 2
  ) as sub;

  -- 3. Recommended Communication Function Gap Fill: Prioritize UNEXPOSED functions
  select coalesce(jsonb_agg(sub.id), '[]'::jsonb)
  into v_rec_comm
  from (
    select ccf.id
    from public.canonical_communication_functions as ccf
    left join public.child_communication_progress as ccp
      on ccp.child_id = claimed_job.child_id and ccp.communication_function_id = ccf.id
    where (ccp.communication_function_id is null or ccp.status in ('learning', 'reviewing'))
    order by (ccp.communication_function_id is null) desc, ccf.id asc
    limit 2
  ) as sub;

  -- 4. Diversity Capsule: Recent genres, scenario context keys, and question item families (last 2-4 weeks)
  select coalesce(jsonb_agg(distinct g.genre), '[]'::jsonb)
  into v_recent_genres
  from (
    select coalesce(m.canonical_source #>> '{studentLesson,reading,genre}', 'article') as genre
    from public.materials as m
    where m.child_id = claimed_job.child_id
    order by m.material_week desc
    limit 4
  ) as g where g.genre is not null;

  select coalesce(jsonb_agg(distinct k.context_key), '[]'::jsonb)
  into v_recent_contexts
  from (
    select coalesce(
      m.canonical_source #>> '{studentLesson,reading,contextKey}',
      m.canonical_source #>> '{studentLesson,reading,title}',
      m.generation_summary ->> 'theme'
    ) as context_key
    from public.materials as m
    where m.child_id = claimed_job.child_id
    order by m.material_week desc
    limit 4
  ) as k where k.context_key is not null;

  select coalesce(jsonb_agg(distinct it.item_type), '[]'::jsonb)
  into v_recent_families
  from (
    select question ->> 'itemType' as item_type
    from (
      select m.canonical_source
      from public.materials as m
      where m.child_id = claimed_job.child_id
      order by m.material_week desc
      limit 4
    ) as recent_m
    cross join lateral (
      select jsonb_array_elements(stage -> 'questions') as question
      from jsonb_array_elements(coalesce(recent_m.canonical_source #> '{studentLesson,practice}', '[]'::jsonb)) as stage
      union all
      select jsonb_array_elements(coalesce(recent_m.canonical_source #> '{studentLesson,homework,questions}', '[]'::jsonb))
    ) as q
  ) as it where it.item_type is not null;

  select jsonb_build_object(
    'job', jsonb_build_object(
      'id', claimed_job.id, 'childId', claimed_job.child_id,
      'materialWeek', claimed_job.material_week, 'ruleVersion', claimed_job.rule_version,
      'releaseAt', claimed_job.release_at, 'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing, 'sourceMaterialId', claimed_job.source_material_id
    ),
    'child', jsonb_build_object(
      'grade', child_rec.grade, 'gradeStage', child_rec.grade_stage,
      'textbookVersion', child_rec.textbook_version, 'preferences', child_rec.preferences
    ),
    'profile', to_jsonb(profile) - 'child_id' - 'created_at' - 'updated_at',
    'learningState', to_jsonb(state) - 'child_id' - 'updated_at',
    'vocabularyCapsule', jsonb_build_object(
      'dueForReview', v_vocab_due,
      'weakRecent', v_vocab_weak,
      'uncertain', v_vocab_uncertain,
      'recentlyMastered', v_vocab_mastered,
      'historicalCount', v_vocab_exp_count
    ),
    'grammarCapsule', jsonb_build_object(
      'dueForReview', v_grammar_due,
      'weakRecent', v_grammar_weak,
      'uncertain', v_grammar_uncertain,
      'recentlyMastered', v_grammar_mastered,
      'historicalCount', v_grammar_exp_count
    ),
    'communicationCapsule', jsonb_build_object(
      'dueForReview', v_comm_due,
      'weakRecent', v_comm_weak,
      'uncertain', v_comm_uncertain,
      'recentlyMastered', v_comm_mastered,
      'historicalCount', v_comm_exp_count
    ),
    'capCoverageCapsule', jsonb_build_object(
      'dueReviewVocabulary', v_vocab_due,
      'dueReviewGrammar', v_grammar_due,
      'dueReviewCommunication', v_comm_due,
      'recommendedVocabulary', v_rec_vocab,
      'recommendedGrammar', v_rec_grammar,
      'recommendedCommunicationFunctions', v_rec_comm,
      'coverage', jsonb_build_object(
        'vocabulary', jsonb_build_object(
          'totalUniverse', 2000,
          'exposedCount', v_vocab_exp_count,
          'masteredCount', v_vocab_mastered_count,
          'dueReviewCount', v_vocab_due_count,
          'exposurePct', round((v_vocab_exp_count::numeric / 2000.0) * 100.0, 1),
          'masteryPct', round((v_vocab_mastered_count::numeric / 2000.0) * 100.0, 1)
        ),
        'grammar', jsonb_build_object(
          'totalUniverse', 24,
          'exposedCount', v_grammar_exp_count,
          'masteredCount', v_grammar_mastered_count,
          'dueReviewCount', v_grammar_due_count,
          'exposurePct', round((v_grammar_exp_count::numeric / 24.0) * 100.0, 1),
          'masteryPct', round((v_grammar_mastered_count::numeric / 24.0) * 100.0, 1)
        ),
        'communication', jsonb_build_object(
          'totalUniverse', 16,
          'exposedCount', v_comm_exp_count,
          'masteredCount', v_comm_mastered_count,
          'dueReviewCount', v_comm_due_count,
          'exposurePct', round((v_comm_exp_count::numeric / 16.0) * 100.0, 1),
          'masteryPct', round((v_comm_mastered_count::numeric / 16.0) * 100.0, 1)
        )
      )
    ),
    'diversityCapsule', jsonb_build_object(
      'recentGenres', v_recent_genres,
      'recentContextKeys', v_recent_contexts,
      'recentItemFamilies', v_recent_families
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

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;
