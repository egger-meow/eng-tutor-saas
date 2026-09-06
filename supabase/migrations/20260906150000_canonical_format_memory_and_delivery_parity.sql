-- Migration: 20260906150000_canonical_format_memory_and_delivery_parity.sql
-- Canonical format memory extraction joining completed delivery snapshots with deterministic sequence ordering

create or replace function public.aggregate_format_memory(
  p_child_id uuid,
  p_limit integer default 4
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery_projections jsonb;
  v_recent_forms jsonb;
begin
  -- Extract structured delivery memory projections joining completed canonical delivery snapshots
  with delivery_source as (
    select
      m.id as material_id,
      m.material_week,
      m.canonical_source,
      s.id as snapshot_id,
      coalesce(s.sequence_number, (m.canonical_source #>> '{metadata,weekNumber}')::int, 1) as sequence_number,
      s.introduced_vocabulary_ids,
      s.grammar_target_ids,
      s.communication_function_ids
    from public.materials as m
    left join public.child_weekly_learning_snapshots as s
      on s.material_id = m.id and s.child_id = m.child_id
    where m.child_id = p_child_id
    order by coalesce(s.sequence_number, (m.canonical_source #>> '{metadata,weekNumber}')::int, 1) desc, m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 4), 20))
  ),
  material_questions as (
    select
      d.material_id,
      d.snapshot_id,
      d.sequence_number,
      d.material_week,
      d.canonical_source,
      d.introduced_vocabulary_ids,
      d.grammar_target_ids,
      d.communication_function_ids,
      q.question
    from delivery_source d
    left join lateral (
      select jsonb_array_elements(coalesce(d.canonical_source #> '{studentLesson,reading,questions}', '[]'::jsonb)) as question
      union all
      select jsonb_array_elements(stage -> 'questions') as question
      from jsonb_array_elements(coalesce(d.canonical_source #> '{studentLesson,practice}', '[]'::jsonb)) as stage
      union all
      select jsonb_array_elements(coalesce(d.canonical_source #> '{studentLesson,homework,questions}', '[]'::jsonb)) as question
    ) as q on true
  ),
  per_material_summary as (
    select
      d.material_id,
      d.snapshot_id,
      d.sequence_number,
      d.material_week,
      coalesce(d.canonical_source #>> '{studentLesson,reading,genre}', 'article') as reading_genre,
      coalesce(d.canonical_source #>> '{studentLesson,reading,title}', '') as reading_title,
      coalesce(d.canonical_source #>> '{studentLesson,reading,hook}', '') as reading_hook,
      coalesce(d.canonical_source #> '{studentLesson,reading,entities}', d.canonical_source #> '{grounding,entities}', '[]'::jsonb) as reading_entities,
      coalesce(to_jsonb(d.introduced_vocabulary_ids), d.canonical_source #> '{trackingDelta,introducedVocabularyIds}', '[]'::jsonb) as introduced_vocabulary,
      coalesce(to_jsonb(d.grammar_target_ids), '[]'::jsonb) as grammar_targets,
      coalesce(to_jsonb(d.communication_function_ids), '[]'::jsonb) as communication_functions,
      coalesce((
        select jsonb_agg(distinct layout_type)
        from (
          select coalesce(
            mq.question -> 'responseLayout' ->> 'type',
            case when (mq.question ->> 'writingLines')::int > 0 then 'lines' else null end
          ) as layout_type
          from material_questions mq
          where mq.material_id = d.material_id
        ) as lt
        where layout_type in ('lines', 'table', 'organizer', 'sequence')
      ), '[]'::jsonb) as response_layout_types,
      coalesce((
        select jsonb_agg(distinct fmt)
        from (
          select case
            when mq.question -> 'responseLayout' ->> 'type' = 'table' then 'table:grid'
            when mq.question -> 'responseLayout' ->> 'type' = 'organizer' then 'table:organizer'
            when mq.question -> 'responseLayout' ->> 'type' = 'sequence' then
              case when mq.question -> 'responseLayout' ->> 'layoutDirection' = 'horizontal' then 'sequence:horizontal' else 'sequence:vertical' end
            when mq.question -> 'responseLayout' ->> 'type' = 'lines' or (mq.question ->> 'writingLines')::int > 0 then 'written:lines'
            else null
          end as fmt
          from material_questions mq
          where mq.material_id = d.material_id
          union all
          select case
            when jsonb_array_length(coalesce(mq.question -> 'options', '[]'::jsonb)) = 4 then 'mcq:4-option'
            when jsonb_array_length(coalesce(mq.question -> 'options', '[]'::jsonb)) > 0 then 'mcq:multi-option'
            else null
          end as fmt
          from material_questions mq
          where mq.material_id = d.material_id
          union all
          select case
            when mq.question ->> 'itemType' is not null then 'itemType:' || (mq.question ->> 'itemType')
            else null
          end as fmt
          from material_questions mq
          where mq.material_id = d.material_id
        ) as f
        where fmt is not null
      ), '[]'::jsonb) as pedagogical_formats,
      coalesce((
        select jsonb_agg(distinct mq.question ->> 'difficulty')
        from material_questions mq
        where mq.material_id = d.material_id and mq.question ->> 'difficulty' is not null
      ), '[]'::jsonb) as scaffold_levels,
      coalesce((
        select jsonb_agg(distinct coalesce(mq.question ->> 'reasoningOperation', mq.question ->> 'cognitiveDepth', mq.question ->> 'itemType'))
        from material_questions mq
        where mq.material_id = d.material_id and coalesce(mq.question ->> 'reasoningOperation', mq.question ->> 'cognitiveDepth', mq.question ->> 'itemType') is not null
      ), '[]'::jsonb) as reasoning_operations
    from delivery_source d
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'snapshotId', p.snapshot_id,
      'materialId', p.material_id,
      'weekNumber', p.sequence_number,
      'materialWeek', p.material_week::text,
      'readingGenre', p.reading_genre,
      'readingTitle', p.reading_title,
      'readingHook', p.reading_hook,
      'readingEntities', p.reading_entities,
      'introducedVocabulary', p.introduced_vocabulary,
      'grammarTargets', p.grammar_targets,
      'communicationFunctions', p.communication_functions,
      'responseLayoutTypes', p.response_layout_types,
      'pedagogicalFormats', p.pedagogical_formats,
      'scaffoldLevels', p.scaffold_levels,
      'reasoningOperations', p.reasoning_operations
    ) order by p.sequence_number desc
  ), '[]'::jsonb)
  into v_delivery_projections
  from per_material_summary p;

  -- Collect all recent response forms across the delivery projections
  select coalesce(jsonb_agg(distinct form), '[]'::jsonb)
  into v_recent_forms
  from (
    select jsonb_array_elements_text(proj -> 'responseLayoutTypes') as form
    from jsonb_array_elements(v_delivery_projections) as proj
    union all
    select jsonb_array_elements_text(proj -> 'pedagogicalFormats') as form
    from jsonb_array_elements(v_delivery_projections) as proj
  ) as forms
  where form is not null and form <> '';

  return jsonb_build_object(
    'recentDeliveryMemory', v_delivery_projections,
    'recentResponseForms', v_recent_forms
  );
end;
$$;

revoke all on function public.aggregate_format_memory(uuid, integer) from public, anon, authenticated;
grant execute on function public.aggregate_format_memory(uuid, integer) to service_role;

-- Update worker_generation_context to use aggregate_format_memory
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
  v_format_memory jsonb;
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

  -- Canonical format memory extraction
  v_format_memory := public.aggregate_format_memory(child_value, 4);
  v_recent_delivery_memory := coalesce(v_format_memory -> 'recentDeliveryMemory', '[]'::jsonb);
  v_recent_forms := coalesce(v_format_memory -> 'recentResponseForms', '[]'::jsonb);

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
