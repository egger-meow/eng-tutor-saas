-- Migration: 20260816223500_server_side_context_capsule.sql
-- Wave 1 Cut 2: Server-side Decision-Complete Context Capsule

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
