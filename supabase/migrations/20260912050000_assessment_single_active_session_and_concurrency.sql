-- Forward-only migration: Assessment Single Active Session Invariant & Concurrency Serialization
-- 1. Fail-closed check: verify no duplicate in_progress assessment sessions exist before creating unique index
-- 2. Partial unique index: ensure at most one in_progress assessment session per child at the DB level
-- 3. FOR UPDATE child locking on start_or_resume_assessment_session and start_assessment_retake
-- 4. Align start_assessment_retake to safely return/resume existing authoritative in_progress session instead of throwing
-- 5. Safe self-healing resumption: if an in_progress session exists, always resume it (never fall through to insert)

-- ============================================================================
-- 1. Fail-closed check & Canonical Partial Unique Index
-- ============================================================================

do $$
declare
  v_duplicate_count integer;
begin
  select count(*) into v_duplicate_count
  from (
    select child_id
    from public.assessment_sessions
    where status = 'in_progress'
    group by child_id
    having count(*) > 1
  ) dups;

  if v_duplicate_count > 0 then
    raise exception 'Cannot create unique index: found % child(ren) with duplicate in_progress assessment sessions', v_duplicate_count;
  end if;
end $$;

create unique index if not exists assessment_sessions_single_active_idx
  on public.assessment_sessions (child_id)
  where status = 'in_progress';

-- ============================================================================
-- 2. Hardened start_or_resume_assessment_session(p_child_id)
-- Locks child row with FOR UPDATE to serialize session creation
-- ============================================================================

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
        'main_idea', 'explicit_information', 'vocabulary_in_context', 'inference', 'information_integration'
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
          i.id asc
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
    'main_idea', 'explicit_information', 'vocabulary_in_context', 'inference', 'information_integration'
  ];

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
      i.id asc
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

-- ============================================================================
-- 3. Hardened start_assessment_retake(p_child_id)
-- Locks child row with FOR UPDATE
-- Safely resumes existing in_progress session if one already exists
-- ============================================================================

create or replace function public.start_assessment_retake(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_child public.children%rowtype;
  v_latest_completed public.assessment_sessions%rowtype;
  v_session public.assessment_sessions%rowtype;
  v_days_since integer;
  v_prev_items jsonb := '[]'::jsonb;
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
  v_k integer;
begin
  -- 1. Parent Authentication & Ownership with row-level serialization
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_child_id is null then
    raise exception 'Child id is required';
  end if;

  select * into v_child
  from public.children
  where id = p_child_id and parent_id = v_user_id and is_active
  for update;

  if not found then
    raise exception 'Child not found or not owned by user';
  end if;

  -- 2. If an in_progress session already exists, safely return/resume it
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
        'main_idea', 'explicit_information', 'vocabulary_in_context', 'inference', 'information_integration'
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
          i.id asc
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

  -- 3. Guard: A completed assessment must exist
  select * into v_latest_completed
  from public.assessment_sessions
  where child_id = p_child_id and status = 'completed'
  order by completed_at desc nulls last, created_at desc
  limit 1;

  if v_latest_completed.id is null then
    raise exception 'No completed assessment found for retake';
  end if;

  -- 4. Guard: Cooldown check (>= 90 days)
  v_days_since := greatest(0, floor(extract(epoch from (now() - v_latest_completed.completed_at)) / 86400)::integer);
  if v_days_since < 90 then
    raise exception 'Assessment retake cooldown active: % days remaining', (90 - v_days_since);
  end if;

  -- 5. Collect items used in immediately previous completed session for repetition tie-break
  select coalesce(jsonb_agg(item_id), '[]'::jsonb) into v_prev_items
  from public.assessment_responses
  where session_id = v_latest_completed.id;

  -- 6. Compute starting difficulty from current profile
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
    'main_idea', 'explicit_information', 'vocabulary_in_context', 'inference', 'information_integration'
  ];

  -- 7. Select initial item, preferring items NOT in v_prev_items
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
      case when v_prev_items ? i.id then 1 else 0 end asc,
      i.id asc
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
    'previous_session_item_ids', v_prev_items
  );

  -- 8. Create NEW session
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

revoke all on function public.start_assessment_retake(uuid) from public, anon;
grant execute on function public.start_assessment_retake(uuid) to authenticated, service_role;
