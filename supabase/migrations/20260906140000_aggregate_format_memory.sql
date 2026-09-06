-- Migration: 20260906140000_aggregate_format_memory.sql
-- Aggregate format memory and structured cross-week delivery memory into worker_generation_context

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  base jsonb;
  child_value uuid;
  lifetime jsonb;
  older jsonb;
  v_recent_forms jsonb;
  v_recent_delivery_memory jsonb;
begin
  base := public.worker_generation_context_before_student_library(job_id, worker_id);
  select child_id into child_value from public.generation_jobs where id = job_id;

  select jsonb_build_object(
    'vocabulary', jsonb_build_object('total', count(*), 'dueTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where review_due), '[]'::jsonb), 'verifiedWeakTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where weakness_reason is not null), '[]'::jsonb), 'uncertainTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where status in ('new', 'learning')), '[]'::jsonb), 'masteredTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where status = 'mastered'), '[]'::jsonb), 'regressionTargetIds', coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)),
    'grammar', (select jsonb_build_object('total', count(*), 'dueTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where review_due), '[]'::jsonb), 'verifiedWeakTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where weakness_reason is not null), '[]'::jsonb), 'uncertainTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where status in ('new', 'learning')), '[]'::jsonb), 'masteredTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where status = 'mastered'), '[]'::jsonb), 'regressionTargetIds', coalesce(jsonb_agg(grammar_id order by grammar_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)) from public.child_grammar_progress where child_id = child_value),
    'communication', (select jsonb_build_object('total', count(*), 'dueTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where review_due), '[]'::jsonb), 'verifiedWeakTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where weakness_reason is not null), '[]'::jsonb), 'uncertainTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where status in ('new', 'learning')), '[]'::jsonb), 'masteredTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where status = 'mastered'), '[]'::jsonb), 'regressionTargetIds', coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter (where weakness_reason = 'regression_after_mastery'), '[]'::jsonb)) from public.child_communication_progress where child_id = child_value)
  ) into lifetime from public.child_vocab_progress where child_id = child_value;

  select coalesce(jsonb_agg(jsonb_build_object('targetType', target_type, 'targetId', target_id, 'result', result, 'observedAt', observed_at) order by observed_at desc), '[]'::jsonb) into older
  from (
    select e.* from public.child_learning_evidence e
    left join public.feedback_memory_processing p on p.id = e.feedback_processing_id
    where e.child_id = child_value and (e.feedback_processing_id is null or p.status = 'effective') and (e.result = 'incorrect' or e.result = 'partial')
    order by e.observed_at desc limit 40
  ) evidence;

  -- Extract recent response forms from the recent 4 materials
  select coalesce(jsonb_agg(distinct rf.form), '[]'::jsonb)
  into v_recent_forms
  from (
    select coalesce(
      question -> 'responseLayout' ->> 'type',
      case when jsonb_array_length(coalesce(question -> 'options', '[]'::jsonb)) > 0 then 'choice' else 'lines' end
    ) as form
    from (
      select m.canonical_source
      from public.materials as m
      where m.child_id = child_value
      order by m.material_week desc
      limit 4
    ) as recent_m
    cross join lateral (
      select jsonb_array_elements(stage -> 'questions') as question
      from jsonb_array_elements(coalesce(recent_m.canonical_source #> '{studentLesson,practice}', '[]'::jsonb)) as stage
      union all
      select jsonb_array_elements(coalesce(recent_m.canonical_source #> '{studentLesson,homework,questions}', '[]'::jsonb))
    ) as q
  ) as rf where rf.form is not null;

  -- Extract structured recent delivery memory projections (last 4 materials)
  select coalesce(jsonb_agg(dm.projection), '[]'::jsonb)
  into v_recent_delivery_memory
  from (
    select jsonb_build_object(
      'materialWeek', m.material_week,
      'weekNumber', (m.canonical_source #>> '{metadata,weekNumber}')::int,
      'readingGenre', coalesce(m.canonical_source #>> '{studentLesson,reading,genre}', 'article'),
      'readingTitle', coalesce(m.canonical_source #>> '{studentLesson,reading,title}', ''),
      'introducedVocabulary', coalesce(m.canonical_source #> '{trackingDelta,introducedVocabularyIds}', '[]'::jsonb),
      'responseLayoutTypes', (
        select coalesce(jsonb_agg(distinct coalesce(q.question -> 'responseLayout' ->> 'type', case when (q.question ->> 'writingLines')::int > 0 then 'lines' else null end)), '[]'::jsonb)
        from (
          select jsonb_array_elements(stage -> 'questions') as question
          from jsonb_array_elements(coalesce(m.canonical_source #> '{studentLesson,practice}', '[]'::jsonb)) as stage
          union all
          select jsonb_array_elements(coalesce(m.canonical_source #> '{studentLesson,homework,questions}', '[]'::jsonb))
        ) as q
        where coalesce(q.question -> 'responseLayout' ->> 'type', case when (q.question ->> 'writingLines')::int > 0 then 'lines' else null end) is not null
      )
    ) as projection
    from public.materials as m
    where m.child_id = child_value
    order by m.material_week desc
    limit 4
  ) as dm;

  if base ? 'diversityCapsule' then
    base := jsonb_set(base, '{diversityCapsule,recentResponseForms}', v_recent_forms, true);
    base := jsonb_set(base, '{diversityCapsule,recentDeliveryMemory}', v_recent_delivery_memory, true);
  end if;

  return base || jsonb_build_object(
    'lifetimeLearningMemory', lifetime,
    'targetedOlderEvidence', older,
    'recentDeliveryMemory', v_recent_delivery_memory,
    'memoryPolicyVersion', 'evidence-v1'
  );
end;
$$;

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;
