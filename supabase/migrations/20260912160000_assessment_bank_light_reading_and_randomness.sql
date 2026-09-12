-- Forward-only migration: Assessment Bank Light Reading Additions and Random Candidate Selection
-- 1. Insert 3 new canonical reading passages (pass_17, pass_18, pass_19)
-- 2. Insert 9 new reading items (read_exp_09..13, read_mid_09..10, read_inf_10, read_vic_07)
-- 3. Update start_or_resume_assessment_session with broad-probe reading order, previous-session retrieval, and random candidate tie-breaker
-- 4. Update start_assessment_retake with broad-probe reading order and random candidate tie-breaker
-- 5. Update submit_assessment_response with broad-probe reading order, targeted confirmation order, and random candidate tie-breaker

-- ============================================================================
-- 1. Passages (pass_17, pass_18, pass_19)
-- ============================================================================

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_17', 'Green Library Rules', 'Green Library is open from Monday to Friday, 9:00 AM to 5:00 PM. All students must keep quiet and put books back after reading. Food and sweet drinks are not allowed inside.', 32, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_18', 'Invitation: Leo’s 13th Birthday Party', 'Hi friends! Please come to my 13th birthday party this Saturday, October 18, from 2:00 PM to 5:00 PM at Sunshine Pizza House. We will make our own mini pizzas and play board games! Please text my sister Amy at 0912-333-888 before October 15.', 44, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

insert into public.assessment_passages (
  id, title, content, word_count, grade_band, status
) values (
  'pass_19', 'Junior Basketball Morning Camp', 'Join our summer basketball morning camp at Riverside Sports Center from July 10 to July 14, 8:30 AM to 11:30 AM daily. Coach David will teach basic dribbling, passing, and team defense. Fee: NT$1,200 (includes a camp T-shirt and water bottle). Please bring indoor sports shoes and a clean towel.', 50, 'grade_7', 'active'
) on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  word_count = excluded.word_count,
  grade_band = excluded.grade_band,
  status = excluded.status,
  updated_at = now();

-- ============================================================================
-- 2. Items (9 items)
-- ============================================================================

-- pass_17 (3 items)
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_09', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice', 'pass_17', 'According to the rules, what is NOT allowed inside the library?', '[{"id":"A","text":"Food and sweet drinks"},{"id":"B","text":"Reading books quietly"},{"id":"C","text":"Studying on Friday morning"},{"id":"D","text":"Returning books after reading"}]'::jsonb, 'A', null, array['explicit_detail', 'library_rules']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_10', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice', 'pass_17', 'When is Green Library open?', '[{"id":"A","text":"From Monday to Friday"},{"id":"B","text":"Only on Saturday afternoons"},{"id":"C","text":"Every day including weekends"},{"id":"D","text":"From Sunday to Thursday"}]'::jsonb, 'A', null, array['factual_scanning', 'opening_hours']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_09', 'reading', 'main_idea', 1, 'grade_7', 'single_choice', 'pass_17', 'What is this notice mainly about?', '[{"id":"A","text":"Rules and opening hours of Green Library"},{"id":"B","text":"How to buy cheap storybooks for school"},{"id":"C","text":"A student reading competition"},{"id":"D","text":"The history of an old library"}]'::jsonb, 'A', null, array['main_topic', 'short_notice']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

-- pass_18 (3 items)
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_11', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice', 'pass_18', 'Where will Leo’s birthday party take place?', '[{"id":"A","text":"At Sunshine Pizza House"},{"id":"B","text":"At Leo’s school classroom"},{"id":"C","text":"In Riverside Park"},{"id":"D","text":"At Amy’s house"}]'::jsonb, 'A', null, array['location_retrieval', 'party_invitation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_mid_10', 'reading', 'main_idea', 1, 'grade_7', 'single_choice', 'pass_18', 'Why did Leo write this message?', '[{"id":"A","text":"To invite friends to celebrate his 13th birthday"},{"id":"B","text":"To teach friends how to make pizza dough"},{"id":"C","text":"To sell tickets for a board game party"},{"id":"D","text":"To ask Amy to buy a birthday cake"}]'::jsonb, 'A', null, array['author_purpose', 'invitation']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_inf_10', 'reading', 'inference', 2, 'grade_7', 'single_choice', 'pass_18', 'What should friends do if they plan to attend the party?', '[{"id":"A","text":"Send a text message to Amy before October 15"},{"id":"B","text":"Bring their own mini pizza to the restaurant"},{"id":"C","text":"Arrive at the pizza house on Friday afternoon"},{"id":"D","text":"Call Leo on the morning of October 18"}]'::jsonb, 'A', null, array['action_inference', 'invitation_response']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

-- pass_19 (3 items)
insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_12', 'reading', 'explicit_information', 1, 'grade_7', 'single_choice', 'pass_19', 'What does the camp fee include?', '[{"id":"A","text":"A camp T-shirt and a water bottle"},{"id":"B","text":"A basketball and lunch every day"},{"id":"C","text":"Indoor sports shoes and a towel"},{"id":"D","text":"A bus ticket to Riverside Sports Center"}]'::jsonb, 'A', null, array['detail_retrieval', 'camp_inclusion']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_exp_13', 'reading', 'explicit_information', 2, 'grade_7', 'single_choice', 'pass_19', 'According to the flyer, what should participants bring?', '[{"id":"A","text":"Indoor sports shoes and a clean towel"},{"id":"B","text":"Their own basketball and whistle"},{"id":"C","text":"A permission letter from their school"},{"id":"D","text":"An extra NT$1,200 for Coach David"}]'::jsonb, 'A', null, array['detail_retrieval', 'required_items']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

insert into public.assessment_items (
  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version
) values (
  'read_vic_07', 'reading', 'vocabulary_in_context', 1, 'grade_7', 'single_choice', 'pass_19', 'In the flyer, what does the word "Fee" mean?', '[{"id":"A","text":"The money you pay to join the camp"},{"id":"B","text":"The coach who teaches the class"},{"id":"C","text":"The time when basketball practice starts"},{"id":"D","text":"The place where players meet"}]'::jsonb, 'A', null, array['vocabulary_in_context', 'practical_terms']::text[], 'active', 1
) on conflict (id) do update set
  domain = excluded.domain,
  skill = excluded.skill,
  difficulty = excluded.difficulty,
  grade_band = excluded.grade_band,
  response_type = excluded.response_type,
  passage_id = excluded.passage_id,
  prompt = excluded.prompt,
  choices = excluded.choices,
  correct_choice = excluded.correct_choice,
  accepted_answers = excluded.accepted_answers,
  analysis_tags = excluded.analysis_tags,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

-- ============================================================================
-- 3. Update start_or_resume_assessment_session
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

-- ============================================================================
-- 4. Update start_assessment_retake
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
    'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
  ];

  -- 7. Select initial item, preferring items NOT in v_prev_items, with random tie-breaker
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

-- ============================================================================
-- 5. Update submit_assessment_response
-- ============================================================================

create or replace function public.submit_assessment_response(
  p_session_id uuid,
  p_item_id text,
  p_raw_answer text default null,
  p_is_skip boolean default false,
  p_active_response_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.assessment_sessions%rowtype;
  v_item public.assessment_items%rowtype;
  v_expected_item_id text;
  v_outcome text;
  v_next_seq integer;
  v_provisional jsonb;
  v_evidence jsonb;
  v_attempts integer;
  v_correct integer;
  v_incorrect integer;
  v_skipped integer;
  v_diffs jsonb;
  v_outcomes jsonb;
  v_has_contra boolean;
  v_remaining_skills jsonb;
  v_next_skill text;
  v_next_item_id text;
  v_item_payload jsonb;
  v_final_result jsonb;
  v_used_items jsonb;
  v_last_passage_id text;
  v_is_contra_pending boolean;
  v_prev_items jsonb;
  s record;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_active_response_ms is not null and p_active_response_ms < 0 then
    raise exception 'Active response time must be non-negative';
  end if;

  select * into v_session
  from public.assessment_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Assessment session not found';
  end if;

  if not exists (
    select 1 from public.children
    where id = v_session.child_id and parent_id = v_user_id and is_active
  ) then
    raise exception 'Assessment session not owned by user';
  end if;

  if v_session.status = 'completed' then
    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'completed',
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'currentItem', null
    );
  end if;

  -- Idempotency check: duplicate response
  if exists (
    select 1 from public.assessment_responses
    where session_id = p_session_id and item_id = p_item_id
  ) then
    v_next_item_id := v_session.provisional_state->>'current_item_id';
    if v_next_item_id is not null then
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
      where i.id = v_next_item_id;
    else
      v_item_payload := null;
    end if;

    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', v_session.status,
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'currentItem', v_item_payload
    );
  end if;

  v_expected_item_id := v_session.provisional_state->>'current_item_id';
  if v_expected_item_id is distinct from p_item_id then
    raise exception 'Submitted item does not match currently presented item';
  end if;

  select * into v_item
  from public.assessment_items
  where id = p_item_id;

  if not found then
    raise exception 'Assessment item not found';
  end if;

  v_last_passage_id := v_item.passage_id;

  -- 1. Authoritative Grading
  if p_is_skip or p_raw_answer is null or length(trim(p_raw_answer)) = 0 then
    v_outcome := 'skipped';
  elsif v_item.response_type = 'single_choice' then
    if upper(trim(p_raw_answer)) = upper(trim(v_item.correct_choice)) then
      v_outcome := 'correct';
    else
      v_outcome := 'incorrect';
    end if;
  elsif v_item.response_type = 'short_answer' then
    if public.normalize_short_answer(p_raw_answer) in (
      select public.normalize_short_answer(val)
      from jsonb_array_elements_text(v_item.accepted_answers) as val
    ) then
      v_outcome := 'correct';
    else
      v_outcome := 'incorrect';
    end if;
  else
    v_outcome := 'incorrect';
  end if;

  -- 2. Insert authoritative response
  v_next_seq := v_session.items_completed + 1;
  insert into public.assessment_responses (
    session_id, child_id, item_id, sequence_number,
    response_type, raw_answer, is_skipped, outcome, active_response_ms
  ) values (
    v_session.id, v_session.child_id, p_item_id, v_next_seq,
    v_item.response_type, p_raw_answer, coalesce(p_is_skip, false), v_outcome, p_active_response_ms
  );

  -- 3. Update provisional evidence
  v_provisional := v_session.provisional_state;
  v_evidence := v_provisional->'skill_evidence'->v_item.skill;
  v_prev_items := coalesce(v_provisional->'previous_session_item_ids', '[]'::jsonb);

  if v_evidence is null then
    v_attempts := 0;
    v_correct := 0;
    v_incorrect := 0;
    v_skipped := 0;
    v_diffs := '[]'::jsonb;
    v_outcomes := '[]'::jsonb;
    v_has_contra := false;
  else
    v_attempts := (v_evidence->>'attempts')::integer;
    v_correct := (v_evidence->>'correct')::integer;
    v_incorrect := (v_evidence->>'incorrect')::integer;
    v_skipped := (v_evidence->>'skipped')::integer;
    v_diffs := v_evidence->'difficulties';
    v_outcomes := v_evidence->'outcomes';
    v_has_contra := coalesce((v_evidence->>'has_contradiction')::boolean, false);
  end if;

  v_attempts := v_attempts + 1;
  if v_outcome = 'correct' then
    v_correct := v_correct + 1;
  elsif v_outcome = 'skipped' then
    v_skipped := v_skipped + 1;
  else
    v_incorrect := v_incorrect + 1;
  end if;

  v_diffs := v_diffs || to_jsonb(v_item.difficulty);
  v_outcomes := v_outcomes || to_jsonb(v_outcome);

  -- Contradiction detection
  if v_attempts >= 2 then
    v_has_contra := exists (
      select 1
      from jsonb_array_elements_text(v_diffs) with ordinality as d1(diff1, idx1),
           jsonb_array_elements_text(v_diffs) with ordinality as d2(diff2, idx2)
      where idx1 <> idx2
        and (v_outcomes->>(idx1::integer - 1)) in ('incorrect', 'skipped')
        and (v_outcomes->>(idx2::integer - 1)) = 'correct'
        and (diff1)::integer < (diff2)::integer
    );
  end if;

  v_provisional := jsonb_set(
    v_provisional,
    array['skill_evidence', v_item.skill],
    jsonb_build_object(
      'skill', v_item.skill,
      'attempts', v_attempts,
      'correct', v_correct,
      'incorrect', v_incorrect,
      'skipped', v_skipped,
      'difficulties', v_diffs,
      'outcomes', v_outcomes,
      'has_contradiction', v_has_contra
    )
  );

  v_used_items := coalesce(v_provisional->'item_history', '[]'::jsonb);
  v_remaining_skills := v_provisional->'broad_probe_remaining_skills';
  v_next_item_id := null;

  -- 4. Broad probe continuation (with random tie-breaker among equivalent candidates)
  if v_remaining_skills is not null and jsonb_array_length(v_remaining_skills) > 0 then
    while jsonb_array_length(v_remaining_skills) > 0 and v_next_item_id is null loop
      v_next_skill := v_remaining_skills->>0;
      v_remaining_skills := v_remaining_skills - 0;

      select i.id into v_next_item_id
      from public.assessment_items i
      where i.skill = v_next_skill
        and i.status = 'active'
        and not (v_used_items ? i.id)
      order by
        abs(i.difficulty - (v_provisional->>'starting_difficulty')::integer) asc,
        case when v_last_passage_id is not null and i.passage_id = v_last_passage_id then 0 else 1 end asc,
        case when v_prev_items ? i.id then 1 else 0 end asc,
        random()
      limit 1;
    end loop;

    v_provisional := jsonb_set(v_provisional, '{broad_probe_remaining_skills}', v_remaining_skills);
  end if;

  if v_next_item_id is not null then
    v_provisional := jsonb_set(v_provisional, '{phase}', '"broad_probe"'::jsonb);
    v_provisional := jsonb_set(v_provisional, '{current_item_id}', to_jsonb(v_next_item_id));
    v_provisional := jsonb_set(v_provisional, '{item_history}', v_used_items || to_jsonb(v_next_item_id));

    update public.assessment_sessions
    set items_completed = v_next_seq,
        provisional_state = v_provisional,
        updated_at = now()
    where id = p_session_id;

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
    where i.id = v_next_item_id;

    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'in_progress',
      'itemsCompleted', v_next_seq,
      'targetItemCount', v_session.target_item_count,
      'currentItem', v_item_payload
    );
  end if;

  -- 5. Transition to Targeted Confirmation
  v_provisional := jsonb_set(v_provisional, '{phase}', '"targeted_confirmation"'::jsonb);

  v_is_contra_pending := exists (
    select 1
    from jsonb_each(v_provisional->'skill_evidence') e
    where (e.value->>'has_contradiction')::boolean = true
      and coalesce((e.value->>'attempts')::integer, 0) < 4
  );

  if v_next_seq >= 25 or (v_next_seq >= 22 and not v_is_contra_pending) or (v_next_seq >= 18 and not v_is_contra_pending) then
    v_final_result := public.compute_assessment_final_result(v_session.id, v_session.child_id, v_provisional);

    update public.assessment_sessions
    set status = 'completed',
        items_completed = v_next_seq,
        completed_at = now(),
        final_result = v_final_result,
        provisional_state = jsonb_set(v_provisional, '{current_item_id}', 'null'::jsonb),
        updated_at = now()
    where id = p_session_id;

    insert into public.child_assessment_state (
      child_id, last_session_id, status, skill_results, domain_summaries, assessed_at, projection_version, updated_at
    ) values (
      v_session.child_id, v_session.id, 'completed',
      v_final_result->'skillEvaluations', v_final_result->'domainSummaries',
      now(), 'assessment-projection-v1', now()
    )
    on conflict (child_id) do update set
      last_session_id = excluded.last_session_id,
      status = excluded.status,
      skill_results = excluded.skill_results,
      domain_summaries = excluded.domain_summaries,
      assessed_at = excluded.assessed_at,
      projection_version = excluded.projection_version,
      updated_at = excluded.updated_at;

    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'completed',
      'itemsCompleted', v_next_seq,
      'targetItemCount', v_session.target_item_count,
      'currentItem', null
    );
  end if;

  -- 6. Targeted Confirmation Skill Selection (with random tie-breaker among equivalent candidates)
  v_next_item_id := null;

  for s in (
    select k as skill,
           coalesce((v_provisional->'skill_evidence'->k->>'attempts')::integer, 0) as attempts,
           case
             when coalesce((v_provisional->'skill_evidence'->k->>'has_contradiction')::boolean, false) then (
               select (v_d)::integer
               from jsonb_array_elements_text(v_provisional->'skill_evidence'->k->'difficulties') with ordinality as d(v_d, ord)
               where (v_provisional->'skill_evidence'->k->'outcomes'->>(ord::integer - 1)) in ('incorrect', 'skipped')
               limit 1
             )
             when (v_provisional->'skill_evidence'->k->'outcomes'->>-1) = 'correct' then
               least(5, (v_provisional->'skill_evidence'->k->'difficulties'->>-1)::integer + 1)
             when (v_provisional->'skill_evidence'->k->'outcomes'->>-1) is not null then
               greatest(1, (v_provisional->'skill_evidence'->k->'difficulties'->>-1)::integer - 1)
             else
               coalesce((v_provisional->>'starting_difficulty')::integer, 2)
           end as target_d
    from unnest(array[
      'core_vocabulary', 'contextual_meaning', 'word_form_usage',
      'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
      'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
    ]) as k
    where coalesce((v_provisional->'skill_evidence'->k->>'attempts')::integer, 0) < 4
    order by
      case when coalesce((v_provisional->'skill_evidence'->k->>'has_contradiction')::boolean, false) then 100 else 0 end + (10 - coalesce((v_provisional->'skill_evidence'->k->>'attempts')::integer, 0)) desc,
      k asc
  ) loop
    select i.id into v_next_item_id
    from public.assessment_items i
    where i.skill = s.skill
      and i.status = 'active'
      and not (v_used_items ? i.id)
    order by
      abs(i.difficulty - coalesce(s.target_d, (v_provisional->>'starting_difficulty')::integer, 2)) asc,
      case when v_last_passage_id is not null and i.passage_id = v_last_passage_id then 0 else 1 end asc,
      case when v_prev_items ? i.id then 1 else 0 end asc,
      random()
    limit 1;

    if v_next_item_id is not null then
      exit;
    end if;
  end loop;

  if v_next_item_id is null then
    v_final_result := public.compute_assessment_final_result(v_session.id, v_session.child_id, v_provisional);

    update public.assessment_sessions
    set status = 'completed',
        items_completed = v_next_seq,
        completed_at = now(),
        final_result = v_final_result,
        provisional_state = jsonb_set(v_provisional, '{current_item_id}', 'null'::jsonb),
        updated_at = now()
    where id = p_session_id;

    insert into public.child_assessment_state (
      child_id, last_session_id, status, skill_results, domain_summaries, assessed_at, projection_version, updated_at
    ) values (
      v_session.child_id, v_session.id, 'completed',
      v_final_result->'skillEvaluations', v_final_result->'domainSummaries',
      now(), 'assessment-projection-v1', now()
    )
    on conflict (child_id) do update set
      last_session_id = excluded.last_session_id,
      status = excluded.status,
      skill_results = excluded.skill_results,
      domain_summaries = excluded.domain_summaries,
      assessed_at = excluded.assessed_at,
      projection_version = excluded.projection_version,
      updated_at = excluded.updated_at;

    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'completed',
      'itemsCompleted', v_next_seq,
      'targetItemCount', v_session.target_item_count,
      'currentItem', null
    );
  end if;

  v_provisional := jsonb_set(v_provisional, '{current_item_id}', to_jsonb(v_next_item_id));
  v_provisional := jsonb_set(v_provisional, '{item_history}', v_used_items || to_jsonb(v_next_item_id));

  update public.assessment_sessions
  set items_completed = v_next_seq,
      provisional_state = v_provisional,
      updated_at = now()
  where id = p_session_id;

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
  where i.id = v_next_item_id;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'status', 'in_progress',
    'itemsCompleted', v_next_seq,
    'targetItemCount', v_session.target_item_count,
    'currentItem', v_item_payload
  );
end;
$$;

revoke all on function public.submit_assessment_response(uuid, text, text, boolean, integer) from public, anon;
grant execute on function public.submit_assessment_response(uuid, text, text, boolean, integer) to authenticated, service_role;
