-- Add format diversity memory without changing claims or historical material.
-- Counts are response items, not minutes; MCQ and written layout can overlap.
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
      coalesce(d.canonical_source #>> '{studentLesson,opening,activity,type}',
        case when jsonb_typeof(d.canonical_source #> '{studentLesson,opening,warmUp}') = 'string'
          then 'legacy-warmup' end) as opening_mode,
      coalesce((
        select jsonb_agg(mode order by first_section, first_block)
        from (
          select distinct on (mode) mode, section_no as first_section, block_no as first_block
          from jsonb_array_elements(coalesce(d.canonical_source #> '{studentLesson,instruction}', '[]'::jsonb))
            with ordinality as sections(section, section_no)
          cross join lateral (
            select block ->> 'type' as mode, block_no
            from jsonb_array_elements(case when jsonb_typeof(section -> 'blocks') = 'array'
              then section -> 'blocks' else '[]'::jsonb end) with ordinality as blocks(block, block_no)
            where jsonb_typeof(block -> 'type') = 'string'
            union all
            select 'legacy-explanation', 0::bigint
            where jsonb_typeof(section -> 'blocks') is distinct from 'array'
          ) as modes
          order by mode, section_no, block_no
        ) as distinct_modes
      ), '[]'::jsonb) as instruction_modes,
      coalesce((
        select jsonb_object_agg(format, item_count)
        from (
          select format, count(*) as item_count
          from material_questions mq
          cross join lateral (
            select case
              when mq.question #>> '{responseLayout,type}' = 'table' then 'table:grid'
              when mq.question #>> '{responseLayout,type}' = 'organizer' then 'table:organizer'
              when mq.question #>> '{responseLayout,type}' = 'sequence' then
                case when mq.question #>> '{responseLayout,layoutDirection}' = 'horizontal'
                  then 'sequence:horizontal' else 'sequence:vertical' end
              when mq.question #>> '{responseLayout,type}' = 'lines'
                or (coalesce(mq.question -> 'responseLayout', 'null'::jsonb) = 'null'::jsonb
                  and (mq.question ->> 'writingLines')::int > 0) then 'written:lines'
            end as format
            union all
            select case
              when jsonb_array_length(coalesce(mq.question -> 'options', '[]'::jsonb)) = 4 then 'mcq:4-option'
              when jsonb_array_length(coalesce(mq.question -> 'options', '[]'::jsonb)) > 0 then 'mcq:multi-option'
            end
          ) as item_formats
          where mq.material_id = d.material_id and format is not null
          group by format
        ) as counts
      ), '{}'::jsonb) as response_format_counts,
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
      'openingMode', p.opening_mode,
      'instructionModes', p.instruction_modes,
      'responseFormatCounts', p.response_format_counts,
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

