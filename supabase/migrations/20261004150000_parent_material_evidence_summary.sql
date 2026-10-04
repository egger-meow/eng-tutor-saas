-- Authoritative parent-safe material evidence summary RPC
-- Provides objective submission counts, parent report progress, safe adjustment notes, and authoritative skill targets.
-- Strict owner-only access and released material gate.

create or replace function public.get_parent_material_evidence_summary(p_material_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_material public.materials%rowtype;
  v_submission public.student_material_submissions%rowtype;
  v_feedback public.feedback%rowtype;
  v_source text := 'none';
  v_submitted_at timestamptz := null;
  v_reported_completion_rate smallint := null;
  v_objective_correct integer := 0;
  v_objective_incorrect integer := 0;
  v_unanswered integer := 0;
  v_open_review integer := 0;
  v_adjustment_notes jsonb := '[]'::jsonb;
  v_targets jsonb := '[]'::jsonb;
begin
  -- 1. Security & ownership check: material must belong to a child owned by authenticated user,
  -- and must be attached to a released completed generation job.
  select m.* into v_material
  from public.materials m
  join public.children c on c.id = m.child_id and c.parent_id = (select auth.uid())
  join public.generation_jobs j on j.material_id = m.id and j.child_id = c.id
  where m.id = p_material_id
    and j.status = 'completed'
    and j.completed_at is not null
    and j.release_at <= now();

  if not found then
    return null;
  end if;

  -- 2. Check student submission
  select * into v_submission
  from public.student_material_submissions
  where material_id = p_material_id and child_id = v_material.child_id;

  -- 3. Check parent feedback
  select * into v_feedback
  from public.feedback
  where material_id = p_material_id and child_id = v_material.child_id;

  -- 4. Determine authoritative source
  if v_submission.material_id is not null then
    v_source := 'student_submission';
    v_submitted_at := v_submission.submitted_at;
    if v_feedback.material_id is not null then
      v_reported_completion_rate := v_feedback.completion_rate;
    end if;

    -- Aggregate objective counts from results
    if v_submission.results is not null and jsonb_typeof(v_submission.results) = 'array' then
      select
        count(*) filter (where r.value->>'status' = 'correct'),
        count(*) filter (where r.value->>'status' = 'incorrect'),
        count(*) filter (where r.value->>'status' = 'unanswered'),
        count(*) filter (where r.value->>'status' = 'open_review')
      into
        v_objective_correct,
        v_objective_incorrect,
        v_unanswered,
        v_open_review
      from jsonb_array_elements(v_submission.results) r;
    end if;
  elsif v_feedback.material_id is not null then
    v_source := 'parent_report';
    v_submitted_at := v_feedback.created_at;
    v_reported_completion_rate := v_feedback.completion_rate;
  else
    v_source := 'none';
    v_submitted_at := null;
  end if;

  -- 5. Safe adjustment notes (up to 3 items from generation summary, no canonical source / prompt leaks)
  if v_material.generation_summary ? 'personalizationReasons' and jsonb_typeof(v_material.generation_summary->'personalizationReasons') = 'array' then
    select coalesce(jsonb_agg(elem.value), '[]'::jsonb) into v_adjustment_notes
    from (
      select elem.value
      from jsonb_array_elements_text(v_material.generation_summary->'personalizationReasons') elem(value)
      where trim(elem.value) <> ''
      limit 3
    ) elem;
  elsif v_material.generation_summary ? 'learningAdjustmentSummary' and nullif(trim(v_material.generation_summary->>'learningAdjustmentSummary'), '') is not null then
    select coalesce(jsonb_agg(elem.elem), '[]'::jsonb) into v_adjustment_notes
    from (
      select trim(elem) as elem
      from regexp_split_to_table(v_material.generation_summary->>'learningAdjustmentSummary', '[；;]') elem
      where trim(elem) <> ''
      limit 3
    ) elem;
  elsif v_material.generation_summary ? 'focusAreas' and jsonb_typeof(v_material.generation_summary->'focusAreas') = 'array' then
    select coalesce(jsonb_agg(elem.value), '[]'::jsonb) into v_adjustment_notes
    from (
      select elem.value
      from jsonb_array_elements_text(v_material.generation_summary->'focusAreas') elem(value)
      where trim(elem.value) <> ''
      limit 3
    ) elem;
  end if;

  -- If empty and Week 1, provide truthful starter rationale
  if jsonb_array_length(v_adjustment_notes) = 0 then
    if not exists(
      select 1 from public.materials prev
      where prev.child_id = v_material.child_id
        and prev.material_week < v_material.material_week
    ) then
      v_adjustment_notes := jsonb_build_array('這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。');
    end if;
  end if;

  -- 6. Authoritative targets: only include known existing skill attribution from child_learning_evidence.
  -- Unknown skills are never guessed or inferred from free-form prompt text.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'label', sub.target_id,
      'state', case
        when sub.result in ('incorrect', 'partial') then 'needs_review'
        when sub.result = 'correct' then 'observed_correct'
        else 'ungraded'
      end
    )
  ), '[]'::jsonb) into v_targets
  from (
    select distinct on (e.target_type, e.target_id)
      e.target_type, e.target_id, e.result
    from public.child_learning_evidence e
    where e.material_id = p_material_id
      and e.child_id = v_material.child_id
      and e.target_id is not null
      and trim(e.target_id) <> ''
      and e.target_type in ('vocabulary', 'grammar', 'communication', 'reading')
    order by e.target_type, e.target_id, e.observed_at desc
    limit 8
  ) sub;

  return jsonb_build_object(
    'source', v_source,
    'submittedAt', v_submitted_at,
    'objectiveCorrect', coalesce(v_objective_correct, 0),
    'objectiveIncorrect', coalesce(v_objective_incorrect, 0),
    'unanswered', coalesce(v_unanswered, 0),
    'openReview', coalesce(v_open_review, 0),
    'reportedCompletionRate', v_reported_completion_rate,
    'adjustmentNotes', coalesce(v_adjustment_notes, '[]'::jsonb),
    'targets', coalesce(v_targets, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_parent_material_evidence_summary(uuid) from public, anon;
grant execute on function public.get_parent_material_evidence_summary(uuid) to authenticated;

comment on function public.get_parent_material_evidence_summary(uuid) is
  'Authoritative parent-safe summary of student submission or paper feedback, objective grading counts, safe adjustment rationale, and known target skills.';
