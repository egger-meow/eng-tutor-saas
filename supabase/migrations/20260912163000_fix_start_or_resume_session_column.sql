-- Forward-only migration: Fix column reference in start_or_resume_assessment_session
-- In previous migration 20260912160000, subquery used s.session_id instead of s.id on public.assessment_sessions

create or replace function public.start_or_resume_assessment_session(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_child public.children%rowtype;
  v_session public.assessment_sessions%rowtype;
  v_item_payload jsonb;
  v_grade_stage text;
  v_onboarding_level text;
  v_baseline integer;
  v_adj integer;
  v_starting_diff integer;
  v_broad_probe_skills text[];
  v_first_skill text;
  v_first_skill_idx integer;
  v_first_item_id text;
  v_remaining_skills_json jsonb;
  v_provisional jsonb;
  v_prev_items jsonb := '[]'::jsonb;
  v_k integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_child_id is null then
    raise exception 'Child id is required';
  end if;

  -- 1. Serialize session creation by locking the owned child row
  select * into v_child
  from public.children
  where id = p_child_id and parent_id = v_user_id and is_active
  for update;

  if not found then
    raise exception 'Child not found or not owned by user';
  end if;

  -- 2. Check for existing in_progress session
  select * into v_session
  from public.assessment_sessions
  where child_id = p_child_id and status = 'in_progress'
  order by created_at desc
  limit 1;

  if v_session.id is not null then
    v_first_item_id := v_session.provisional_state->>'current_item_id';

    -- If existing in_progress session is missing current_item_id, initialize it
    if v_first_item_id is null then
      v_grade_stage := coalesce(v_child.grade_stage, 'grade_7');
      select coalesce(baseline_level, 'on-level') into v_onboarding_level
      from public.child_profiles
      where child_id = p_child_id;

      v_baseline := case
        when v_grade_stage = 'grade_8' then 3
        when v_grade_stage = 'grade_9' then 4
        else 2
      end;

      v_adj := case
        when v_onboarding_level = 'needs-support' then -1
        when v_onboarding_level = 'advanced' then 1
        else 0
      end;

      v_starting_diff := greatest(1, least(5, v_baseline + v_adj));

      v_broad_probe_skills := array[
        'core_vocabulary', 'contextual_meaning', 'word_form_usage',
        'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
        'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
      ];

      v_first_skill_idx := 1;
      while v_first_skill_idx <= array_length(v_broad_probe_skills, 1) and v_first_item_id is null loop
        v_first_skill := v_broad_probe_skills[v_first_skill_idx];
        select i.id into v_first_item_id
        from public.assessment_items i
        where i.skill = v_first_skill
          and i.status = 'active'
        order by
          abs(i.difficulty - v_starting_diff) asc,
          random()
        limit 1;

        if v_first_item_id is null then
          v_first_skill_idx := v_first_skill_idx + 1;
        end if;
      end loop;

      if v_first_item_id is null then
        raise exception 'No active items available in question bank';
      end if;

      v_remaining_skills_json := '[]'::jsonb;
      for v_k in (v_first_skill_idx + 1)..array_length(v_broad_probe_skills, 1) loop
        v_remaining_skills_json := v_remaining_skills_json || to_jsonb(v_broad_probe_skills[v_k]);
      end loop;

      v_provisional := jsonb_build_object(
        'engine_version', 'v1.0.0',
        'phase', 'broad_probe',
        'starting_difficulty', v_starting_diff,
        'broad_probe_remaining_skills', v_remaining_skills_json,
        'skill_evidence', '{}'::jsonb,
        'current_item_id', v_first_item_id,
        'item_history', jsonb_build_array(v_first_item_id)
      );

      update public.assessment_sessions
      set provisional_state = v_provisional
      where id = v_session.id
      returning * into v_session;
    end if;

    select jsonb_build_object(
      'id', i.id,
      'responseType', i.response_type,
      'prompt', i.prompt,
      'choices', i.choices,
      'passage', case when p.id is not null then jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'content', p.content
      ) else null end
    ) into v_item_payload
    from public.assessment_items i
    left join public.assessment_passages p on p.id = i.passage_id
    where i.id = v_first_item_id;

    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', v_session.status,
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'currentItem', v_item_payload
    );
  end if;

  -- 3. If child already has a completed session, do not start retake here (must use start_assessment_retake)
  select * into v_session
  from public.assessment_sessions
  where child_id = p_child_id and status = 'completed'
  order by completed_at desc nulls last, created_at desc
  limit 1;

  if v_session.id is not null then
    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'completed',
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'currentItem', null
    );
  end if;

  -- 4. Initial session creation
  v_grade_stage := coalesce(v_child.grade_stage, 'grade_7');
  select coalesce(baseline_level, 'on-level') into v_onboarding_level
  from public.child_profiles
  where child_id = p_child_id;

  v_baseline := case
    when v_grade_stage = 'grade_8' then 3
    when v_grade_stage = 'grade_9' then 4
    else 2
  end;

  v_adj := case
    when v_onboarding_level = 'needs-support' then -1
    when v_onboarding_level = 'advanced' then 1
    else 0
  end;

  v_starting_diff := greatest(1, least(5, v_baseline + v_adj));

  v_broad_probe_skills := array[
    'core_vocabulary', 'contextual_meaning', 'word_form_usage',
    'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
    'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
  ];

  -- Check if any historical completed session exists to avoid repeat items
  select coalesce(jsonb_agg(r.item_id), '[]'::jsonb) into v_prev_items
  from (
    select id
    from public.assessment_sessions
    where child_id = p_child_id and status = 'completed'
    order by completed_at desc nulls last, created_at desc
    limit 1
  ) s
  join public.assessment_responses r on r.session_id = s.id;

  v_first_item_id := null;
  v_first_skill_idx := 1;
  while v_first_skill_idx <= array_length(v_broad_probe_skills, 1) and v_first_item_id is null loop
    v_first_skill := v_broad_probe_skills[v_first_skill_idx];
    select i.id into v_first_item_id
    from public.assessment_items i
    where i.skill = v_first_skill
      and i.status = 'active'
    order by
      abs(i.difficulty - v_starting_diff) asc,
      case when v_prev_items is not null and v_prev_items ? i.id then 1 else 0 end asc,
      random()
    limit 1;

    if v_first_item_id is null then
      v_first_skill_idx := v_first_skill_idx + 1;
    end if;
  end loop;

  if v_first_item_id is null then
    raise exception 'No active items available in question bank';
  end if;

  v_remaining_skills_json := '[]'::jsonb;
  for v_k in (v_first_skill_idx + 1)..array_length(v_broad_probe_skills, 1) loop
    v_remaining_skills_json := v_remaining_skills_json || to_jsonb(v_broad_probe_skills[v_k]);
  end loop;

  v_provisional := jsonb_build_object(
    'engine_version', 'v1.0.0',
    'phase', 'broad_probe',
    'starting_difficulty', v_starting_diff,
    'broad_probe_remaining_skills', v_remaining_skills_json,
    'skill_evidence', '{}'::jsonb,
    'current_item_id', v_first_item_id,
    'item_history', jsonb_build_array(v_first_item_id),
    'previous_session_item_ids', coalesce(v_prev_items, '[]'::jsonb)
  );

  insert into public.assessment_sessions (
    child_id, status, target_item_count, items_completed, max_items, provisional_state
  ) values (
    p_child_id, 'in_progress', 18, 0, 25, v_provisional
  ) returning * into v_session;

  select jsonb_build_object(
    'id', i.id,
    'responseType', i.response_type,
    'prompt', i.prompt,
    'choices', i.choices,
    'passage', case when p.id is not null then jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'content', p.content
    ) else null end
  ) into v_item_payload
  from public.assessment_items i
  left join public.assessment_passages p on p.id = i.passage_id
  where i.id = v_first_item_id;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'status', v_session.status,
    'itemsCompleted', v_session.items_completed,
    'targetItemCount', v_session.target_item_count,
    'currentItem', v_item_payload
  );
end;
$$;

revoke all on function public.start_or_resume_assessment_session(uuid) from public, anon;
grant execute on function public.start_or_resume_assessment_session(uuid) to authenticated, service_role;
