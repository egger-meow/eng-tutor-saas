-- ============================================================================
-- Direct Assessment Phase 4: Curated Overview & Result RPCs
-- Forward-only migration adding safe curated client projections for assessment
-- status and completed result presentation, and protecting completed sessions.
-- ============================================================================

-- 1. Curated Child Assessment Overview RPC
create or replace function public.get_child_assessment_overview(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.assessment_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_child_id is null then
    raise exception 'Child id is required';
  end if;

  if not exists (
    select 1 from public.children
    where id = p_child_id and parent_id = v_user_id and is_active
  ) then
    raise exception 'Child not found or not owned by user';
  end if;

  -- Check for in_progress session
  select * into v_session
  from public.assessment_sessions
  where child_id = p_child_id and status = 'in_progress'
  order by created_at desc
  limit 1;

  if v_session.id is not null then
    return jsonb_build_object(
      'childId', p_child_id,
      'status', 'in_progress',
      'sessionId', v_session.id,
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'completedAt', null
    );
  end if;

  -- Check for completed session
  select * into v_session
  from public.assessment_sessions
  where child_id = p_child_id and status = 'completed'
  order by completed_at desc nulls last, created_at desc
  limit 1;

  if v_session.id is not null then
    return jsonb_build_object(
      'childId', p_child_id,
      'status', 'completed',
      'sessionId', v_session.id,
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'completedAt', v_session.completed_at
    );
  end if;

  -- Never started
  return jsonb_build_object(
    'childId', p_child_id,
    'status', 'not_started',
    'sessionId', null,
    'itemsCompleted', 0,
    'targetItemCount', 18,
    'completedAt', null
  );
end;
$$;

-- 2. Curated Assessment Session Result RPC
-- Returns only sanitized client-safe fields: overall narrative, 3 domain summaries,
-- and 13 skill evaluations (skill, domain, result, confidence).
-- Strictly omits estimatedDifficulty, internal notes, raw scores, answer history, and provisional state.
create or replace function public.get_assessment_session_result(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.assessment_sessions%rowtype;
  v_skill_evals jsonb := '{}'::jsonb;
  v_domain_summaries jsonb := '{}'::jsonb;
  v_raw_skills jsonb;
  v_raw_domains jsonb;
  v_skill text;
  v_domain text;
  v_skill_obj jsonb;
  v_domain_obj jsonb;
  v_skills text[] := array[
    'core_vocabulary', 'contextual_meaning', 'word_form_usage',
    'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
    'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
  ];
  v_domains text[] := array['vocabulary', 'grammar', 'reading'];
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_session_id is null then
    raise exception 'Session id is required';
  end if;

  select * into v_session
  from public.assessment_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Assessment session not found';
  end if;

  if not exists (
    select 1 from public.children
    where id = v_session.child_id and parent_id = v_user_id and is_active
  ) then
    raise exception 'Assessment session not owned by user';
  end if;

  if v_session.status != 'completed' or v_session.final_result is null then
    raise exception 'Assessment session is not completed';
  end if;

  v_raw_skills := v_session.final_result->'skillEvaluations';
  v_raw_domains := v_session.final_result->'domainSummaries';

  -- Sanitize domain summaries (domain, result, confidence, summaryZh)
  foreach v_domain in array v_domains loop
    v_domain_obj := v_raw_domains->v_domain;
    if v_domain_obj is not null then
      v_domain_summaries := jsonb_set(
        v_domain_summaries,
        array[v_domain],
        jsonb_build_object(
          'domain', v_domain,
          'result', v_domain_obj->>'result',
          'confidence', v_domain_obj->>'confidence',
          'summaryZh', v_domain_obj->>'summaryZh'
        )
      );
    end if;
  end loop;

  -- Sanitize skill evaluations (skill, domain, result, confidence)
  foreach v_skill in array v_skills loop
    v_skill_obj := v_raw_skills->v_skill;
    if v_skill_obj is not null then
      v_skill_evals := jsonb_set(
        v_skill_evals,
        array[v_skill],
        jsonb_build_object(
          'skill', v_skill,
          'domain', v_skill_obj->>'domain',
          'result', v_skill_obj->>'result',
          'confidence', v_skill_obj->>'confidence'
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'childId', v_session.child_id,
    'completedAt', v_session.completed_at,
    'totalItems', coalesce((v_session.final_result->>'totalItems')::integer, v_session.items_completed),
    'overallNarrativeZh', v_session.final_result->>'overallNarrativeZh',
    'domainSummaries', v_domain_summaries,
    'skillEvaluations', v_skill_evals
  );
end;
$$;

-- 3. Curated Child Latest Assessment Result RPC
create or replace function public.get_child_latest_assessment_result(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_child_id is null then
    raise exception 'Child id is required';
  end if;

  if not exists (
    select 1 from public.children
    where id = p_child_id and parent_id = v_user_id and is_active
  ) then
    raise exception 'Child not found or not owned by user';
  end if;

  select id into v_session_id
  from public.assessment_sessions
  where child_id = p_child_id and status = 'completed'
  order by completed_at desc nulls last, created_at desc
  limit 1;

  if v_session_id is null then
    return null;
  end if;

  return public.get_assessment_session_result(v_session_id);
end;
$$;

-- 4. Start or Resume Session: Update to protect completed sessions from accidental retake
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
  v_current_item_id text;
  v_item_payload jsonb;
  v_starting_diff integer;
  v_grade_stage text;
  v_onboarding_level text;
  v_baseline integer;
  v_adj integer;
  v_broad_probe_skills text[];
  v_first_skill text;
  v_first_item_id text;
  v_remaining_skills_json jsonb;
  v_provisional jsonb;
  v_first_skill_idx integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_child_id is null then
    raise exception 'Child id is required';
  end if;

  select * into v_child
  from public.children
  where id = p_child_id
    and parent_id = v_user_id
    and is_active;

  if not found then
    raise exception 'Child not found or not owned by user';
  end if;

  -- 1. Check for existing in_progress session
  select * into v_session
  from public.assessment_sessions
  where child_id = p_child_id
    and status = 'in_progress'
  order by created_at desc
  limit 1
  for update;

  if v_session.id is not null then
    v_current_item_id := v_session.provisional_state->>'current_item_id';
    if v_current_item_id is not null then
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
      where i.id = v_current_item_id;

      return jsonb_build_object(
        'sessionId', v_session.id,
        'status', v_session.status,
        'itemsCompleted', v_session.items_completed,
        'targetItemCount', v_session.target_item_count,
        'currentItem', v_item_payload
      );
    end if;
  end if;

  -- 2. Check for existing completed session (prevent accidental retake / duplicate session)
  select * into v_session
  from public.assessment_sessions
  where child_id = p_child_id
    and status = 'completed'
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

  -- 3. Create new session
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

-- 5. Access Control: Revoke from public, anon; grant to authenticated, service_role
revoke execute on function public.get_child_assessment_overview(uuid) from public, anon;
grant execute on function public.get_child_assessment_overview(uuid) to authenticated, service_role;

revoke execute on function public.get_assessment_session_result(uuid) from public, anon;
grant execute on function public.get_assessment_session_result(uuid) to authenticated, service_role;

revoke execute on function public.get_child_latest_assessment_result(uuid) from public, anon;
grant execute on function public.get_child_latest_assessment_result(uuid) to authenticated, service_role;

revoke execute on function public.start_or_resume_assessment_session(uuid) from public, anon;
grant execute on function public.start_or_resume_assessment_session(uuid) to authenticated, service_role;
