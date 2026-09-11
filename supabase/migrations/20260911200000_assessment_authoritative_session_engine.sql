-- Forward-only migration: Authoritative Direct Assessment session + adaptive engine
-- 1. Historical assessment immutability triggers (items and passages)
-- 2. Retire broad client enumeration (revoke select on assessment_client_items)
-- 3. Deterministic short-answer normalizer
-- 4. Final session result generator function
-- 5. Session RPCs: start_or_resume, submit_response, get_session_state

-- ============================================================================
-- 1. Historical Assessment Immutability Triggers
-- ============================================================================

create or replace function public.protect_used_assessment_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.assessment_responses where item_id = old.id) then
      raise exception 'Cannot delete assessment item % because it is referenced in historical assessment responses', old.id;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if exists (select 1 from public.assessment_responses where item_id = old.id) then
      if new.domain is distinct from old.domain or
         new.skill is distinct from old.skill or
         new.difficulty is distinct from old.difficulty or
         new.grade_band is distinct from old.grade_band or
         new.response_type is distinct from old.response_type or
         new.passage_id is distinct from old.passage_id or
         new.prompt is distinct from old.prompt or
         new.choices is distinct from old.choices or
         new.correct_choice is distinct from old.correct_choice or
         new.accepted_answers is distinct from old.accepted_answers or
         new.analysis_tags is distinct from old.analysis_tags or
         new.version is distinct from old.version then
        raise exception 'Cannot modify semantic fields of assessment item % because it is referenced in historical assessment responses', old.id;
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists check_assessment_item_immutability on public.assessment_items;
create trigger check_assessment_item_immutability
  before update or delete on public.assessment_items
  for each row execute function public.protect_used_assessment_item();

create or replace function public.protect_used_assessment_passage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.assessment_items i
    join public.assessment_responses r on r.item_id = i.id
    where i.passage_id = old.id
  ) then
    if tg_op = 'DELETE' then
      raise exception 'Cannot delete assessment passage % because its items are referenced in historical assessment responses', old.id;
    end if;
    if tg_op = 'UPDATE' then
      if new.title is distinct from old.title or
         new.content is distinct from old.content or
         new.word_count is distinct from old.word_count or
         new.grade_band is distinct from old.grade_band then
        raise exception 'Cannot modify semantic content of assessment passage % because its items are referenced in historical assessment responses', old.id;
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists check_assessment_passage_immutability on public.assessment_passages;
create trigger check_assessment_passage_immutability
  before update or delete on public.assessment_passages
  for each row execute function public.protect_used_assessment_passage();

-- ============================================================================
-- 2. Revoke Broad Client Enumeration of Question Bank
-- ============================================================================

revoke select on public.assessment_client_items from authenticated;

-- ============================================================================
-- 3. Deterministic Short-Answer Normalizer
-- ============================================================================

create or replace function public.normalize_short_answer(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  v_res text;
begin
  if p_raw is null then
    return '';
  end if;
  v_res := lower(trim(p_raw));
  v_res := regexp_replace(v_res, '\s+', ' ', 'g');
  v_res := regexp_replace(v_res, '^[.,?!;:''"“”‘’]+', '', 'g');
  v_res := regexp_replace(v_res, '[.,?!;:''"“”‘’]+$', '', 'g');
  return trim(v_res);
end;
$$;

-- ============================================================================
-- 4. Final Session Result Generator Function
-- ============================================================================

create or replace function public.compute_assessment_final_result(
  p_session_id uuid,
  p_child_id uuid,
  p_provisional_state jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_skill text;
  v_domain text;
  v_skill_evals jsonb := '{}'::jsonb;
  v_domain_summaries jsonb := '{}'::jsonb;
  v_total_attempted integer := 0;
  v_total_correct integer := 0;
  v_total_skipped integer := 0;
  v_evidence jsonb;
  v_attempts integer;
  v_correct integer;
  v_skipped integer;
  v_has_contra boolean;
  v_skill_result text;
  v_skill_conf text;
  v_est_diff integer;
  v_diff_arr jsonb;
  v_first_diff integer;
  v_max_corr_diff integer;
  v_min_fail_diff integer;
  v_d text;
  v_d_skills text[];
  v_d_secure_cnt integer;
  v_d_needs_cnt integer;
  v_d_result text;
  v_d_conf text;
  v_d_summary text;
  v_narrative text;
  v_all_skills text[] := array[
    'core_vocabulary', 'contextual_meaning', 'word_form_usage',
    'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
    'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
  ];
begin
  foreach v_skill in array v_all_skills loop
    -- Skill domain
    if v_skill in ('core_vocabulary', 'contextual_meaning', 'word_form_usage') then
      v_domain := 'vocabulary';
    elsif v_skill in ('basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures') then
      v_domain := 'grammar';
    else
      v_domain := 'reading';
    end if;

    v_evidence := p_provisional_state->'skill_evidence'->v_skill;
    if v_evidence is null or (v_evidence->>'attempts')::integer = 0 then
      v_skill_evals := jsonb_set(
        v_skill_evals,
        array[v_skill],
        jsonb_build_object(
          'skill', v_skill,
          'domain', v_domain,
          'result', 'developing',
          'confidence', 'low',
          'itemsAttempted', 0,
          'itemsCorrect', 0,
          'estimatedDifficulty', 2,
          'notes', '未施測題目，無足夠資料。'
        )
      );
    else
      v_attempts := (v_evidence->>'attempts')::integer;
      v_correct := (v_evidence->>'correct')::integer;
      v_skipped := (v_evidence->>'skipped')::integer;
      v_has_contra := coalesce((v_evidence->>'has_contradiction')::boolean, false);
      v_diff_arr := v_evidence->'difficulties';

      v_total_attempted := v_total_attempted + v_attempts;
      v_total_correct := v_total_correct + v_correct;
      v_total_skipped := v_total_skipped + v_skipped;

      if v_attempts = 1 then
        v_skill_conf := 'low';
        v_first_diff := (v_diff_arr->>0)::integer;
        if v_correct = 1 then
          if v_first_diff >= 3 then
            v_skill_result := 'secure';
          else
            v_skill_result := 'developing';
          end if;
          v_est_diff := v_first_diff;
        else
          if v_first_diff <= 2 then
            v_skill_result := 'needs_support';
          else
            v_skill_result := 'developing';
          end if;
          v_est_diff := greatest(1, v_first_diff - 1);
        end if;
      else
        if v_has_contra then
          v_skill_conf := case when v_attempts >= 4 then 'medium' else 'low' end;
        elsif v_attempts >= 3 then
          v_skill_conf := 'high';
        else
          v_skill_conf := 'medium';
        end if;

        if (v_correct::numeric / v_attempts) >= 0.70 then
          v_skill_result := 'secure';
          v_est_diff := 3;
        elsif (v_correct::numeric / v_attempts) <= 0.35 then
          v_skill_result := 'needs_support';
          v_est_diff := 1;
        else
          v_skill_result := 'developing';
          v_est_diff := 2;
        end if;
      end if;

      v_skill_evals := jsonb_set(
        v_skill_evals,
        array[v_skill],
        jsonb_build_object(
          'skill', v_skill,
          'domain', v_domain,
          'result', v_skill_result,
          'confidence', v_skill_conf,
          'itemsAttempted', v_attempts,
          'itemsCorrect', v_correct,
          'estimatedDifficulty', v_est_diff
        )
      );
    end if;
  end loop;

  -- Domain Summaries
  foreach v_d in array array['vocabulary', 'grammar', 'reading'] loop
    v_d_secure_cnt := 0;
    v_d_needs_cnt := 0;

    if v_d = 'vocabulary' then
      v_d_skills := array['core_vocabulary', 'contextual_meaning', 'word_form_usage'];
    elsif v_d = 'grammar' then
      v_d_skills := array['basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures'];
    else
      v_d_skills := array['explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'];
    end if;

    foreach v_skill in array v_d_skills loop
      if (v_skill_evals->v_skill->>'result') = 'secure' then
        v_d_secure_cnt := v_d_secure_cnt + 1;
      elsif (v_skill_evals->v_skill->>'result') = 'needs_support' then
        v_d_needs_cnt := v_d_needs_cnt + 1;
      end if;
    end loop;

    if v_d_secure_cnt > (array_length(v_d_skills, 1) / 2) then
      v_d_result := 'secure';
      v_d_conf := 'high';
      v_d_summary := case
        when v_d = 'vocabulary' then '字彙掌握穩固，常用單字辨析度佳。'
        when v_d = 'grammar' then '句型結構與時態掌握良好，能理解複合句與進階文法。'
        else '閱讀篇章理解力佳，能快速掌握主旨並進行深層推論。'
      end;
    elsif v_d_needs_cnt > (array_length(v_d_skills, 1) / 2) then
      v_d_result := 'needs_support';
      v_d_conf := 'medium';
      v_d_summary := case
        when v_d = 'vocabulary' then '基礎核心字彙較為薄弱，建議從教育部常用千字加強扎根。'
        when v_d = 'grammar' then '基本五大句型與時態規則待強化，建議回歸基本句構練習。'
        else '文章細節擷取較為吃力，建議從短篇生活對話與公告開始建立信心。'
      end;
    else
      v_d_result := 'developing';
      v_d_conf := 'medium';
      v_d_summary := case
        when v_d = 'vocabulary' then '常用字彙具備基礎，情境用法與延伸詞性需持續累積。'
        when v_d = 'grammar' then '基礎句型結構穩定，時態一致性與關係子句仍需多練習。'
        else '能檢索篇章具體細節，長文推論與跨段落整合仍有進步空間。'
      end;
    end if;

    v_domain_summaries := jsonb_set(
      v_domain_summaries,
      array[v_d],
      jsonb_build_object(
        'domain', v_d,
        'result', v_d_result,
        'confidence', v_d_conf,
        'summaryZh', v_d_summary
      )
    );
  end loop;

  -- Overall narrative
  if (v_domain_summaries->'vocabulary'->>'result') = 'secure' and
     (v_domain_summaries->'grammar'->>'result') = 'secure' and
     (v_domain_summaries->'reading'->>'result') = 'secure' then
    v_narrative := '整體英語程度穩健優異，字彙量充足且文法結構清晰，具備良好的篇章推論能力。';
  elsif (v_domain_summaries->'vocabulary'->>'result') = 'needs_support' and
        (v_domain_summaries->'grammar'->>'result') = 'needs_support' and
        (v_domain_summaries->'reading'->>'result') = 'needs_support' then
    v_narrative := '目前在各學習領域均需要更多基礎引導，建議從日常核心字彙與簡單句構循序漸進建立學習自信。';
  else
    v_narrative := '整體英語學習基礎良好，各領域表現均衡，持續保持每週閱讀習慣將能穩定進步。';
  end if;

  return jsonb_build_object(
    'sessionId', p_session_id,
    'childId', p_child_id,
    'completedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'totalItems', greatest(1, v_total_attempted),
    'correctCount', v_total_correct,
    'skipCount', v_total_skipped,
    'skillEvaluations', v_skill_evals,
    'domainSummaries', v_domain_summaries,
    'overallNarrativeZh', v_narrative
  );
end;
$$;

-- ============================================================================
-- 5. Session RPCs
-- ============================================================================

-- 5a. Start or resume session
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
  v_grade_stage text;
  v_onboarding_level text;
  v_starting_diff integer;
  v_baseline integer;
  v_adj integer;
  v_first_item_id text;
  v_current_item_id text;
  v_item_payload jsonb;
  v_provisional jsonb;
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

  -- Check for existing in_progress session
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

  -- Create new session
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

  -- Select initial broad probe item (skill: core_vocabulary)
  select i.id into v_first_item_id
  from public.assessment_items i
  where i.skill = 'core_vocabulary'
    and i.status = 'active'
  order by abs(i.difficulty - v_starting_diff) asc, i.id asc
  limit 1;

  if v_first_item_id is null then
    raise exception 'No active items available in question bank';
  end if;

  v_provisional := jsonb_build_object(
    'engine_version', 'v1.0.0',
    'phase', 'broad_probe',
    'starting_difficulty', v_starting_diff,
    'broad_probe_remaining_skills', jsonb_build_array(
      'contextual_meaning', 'word_form_usage',
      'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
      'main_idea', 'explicit_information', 'vocabulary_in_context', 'inference', 'information_integration'
    ),
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

-- 5b. Submit response
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
  v_phase text;
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
  v_target_diff integer;
  v_item_payload jsonb;
  v_final_result jsonb;
  v_used_items jsonb;
  v_is_contra_pending boolean;
  v_i integer;
  v_j integer;
  v_corr_d integer;
  v_fail_d integer;
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
  v_diffs := v_diffs || to_jsonb(v_item.difficulty);
  v_outcomes := v_outcomes || to_jsonb(v_outcome);

  if v_outcome = 'correct' then
    v_correct := v_correct + 1;
  elsif v_outcome = 'incorrect' then
    v_incorrect := v_incorrect + 1;
  elsif v_outcome = 'skipped' then
    v_skipped := v_skipped + 1;
  end if;

  -- Recompute contradiction
  v_has_contra := false;
  for v_i in 0..(jsonb_array_length(v_outcomes) - 1) loop
    if (v_outcomes->>v_i) = 'correct' then
      v_corr_d := (v_diffs->>v_i)::integer;
      for v_j in 0..(jsonb_array_length(v_outcomes) - 1) loop
        if (v_outcomes->>v_j) in ('incorrect', 'skipped') then
          v_fail_d := (v_diffs->>v_j)::integer;
          if v_corr_d >= v_fail_d then
            v_has_contra := true;
            exit;
          end if;
        end if;
      end loop;
    end if;
    if v_has_contra then exit; end if;
  end loop;

  v_evidence := jsonb_build_object(
    'skill', v_item.skill,
    'domain', v_item.domain,
    'attempts', v_attempts,
    'correct', v_correct,
    'incorrect', v_incorrect,
    'skipped', v_skipped,
    'difficulties', v_diffs,
    'outcomes', v_outcomes,
    'has_contradiction', v_has_contra
  );

  v_provisional := jsonb_set(
    v_provisional,
    array['skill_evidence', v_item.skill],
    v_evidence
  );

  v_used_items := v_provisional->'item_history';

  -- 4. Route Next Item or Complete
  v_remaining_skills := v_provisional->'broad_probe_remaining_skills';

  if v_remaining_skills is not null and jsonb_array_length(v_remaining_skills) > 0 then
    -- Broad probe continuation
    v_next_skill := v_remaining_skills->>0;
    v_remaining_skills := v_remaining_skills - 0;
    v_provisional := jsonb_set(v_provisional, '{broad_probe_remaining_skills}', v_remaining_skills);

    select i.id into v_next_item_id
    from public.assessment_items i
    where i.skill = v_next_skill
      and i.status = 'active'
      and not (v_used_items ? i.id)
    order by abs(i.difficulty - (v_provisional->>'starting_difficulty')::integer) asc, i.id asc
    limit 1;

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
  else
    -- Targeted Confirmation Phase
    v_provisional := jsonb_set(v_provisional, '{phase}', '"targeted_confirmation"'::jsonb);

    -- Check Stop Conditions
    -- Check if any skill has unconfirmed contradiction with attempts < 4
    v_is_contra_pending := exists (
      select 1
      from jsonb_each(v_provisional->'skill_evidence') e
      where (e.value->>'has_contradiction')::boolean = true
        and (e.value->>'attempts')::integer < 4
    );

    if v_next_seq >= 25 or (v_next_seq >= 22 and not v_is_contra_pending) or (v_next_seq >= 18 and not v_is_contra_pending) then
      -- Finalize session
      v_final_result := public.compute_assessment_final_result(v_session.id, v_session.child_id, v_provisional);

      update public.assessment_sessions
      set status = 'completed',
          items_completed = v_next_seq,
          completed_at = now(),
          final_result = v_final_result,
          provisional_state = jsonb_set(v_provisional, '{current_item_id}', 'null'::jsonb),
          updated_at = now()
      where id = p_session_id;

      return jsonb_build_object(
        'sessionId', v_session.id,
        'status', 'completed',
        'itemsCompleted', v_next_seq,
        'targetItemCount', v_session.target_item_count,
        'currentItem', null
      );
    end if;

    -- Pick Next Targeted Confirmation Skill
    -- Priority: Contradiction first, then fewest attempts (< 4)
    select s.skill,
           case
             when (s.ev->>'has_contradiction')::boolean then (
               select (v_d)::integer
               from jsonb_array_elements_text(s.ev->'difficulties') with ordinality as d(v_d, ord)
               where (s.ev->'outcomes'->>(ord::integer - 1)) in ('incorrect', 'skipped')
               limit 1
             )
             when (s.ev->'outcomes'->>-1) = 'correct' then
               least(5, (s.ev->'difficulties'->>-1)::integer + 1)
             else
               greatest(1, (s.ev->'difficulties'->>-1)::integer - 1)
           end as target_d
    into v_next_skill, v_target_diff
    from (
      select k as skill, v_provisional->'skill_evidence'->k as ev
      from unnest(array[
        'core_vocabulary', 'contextual_meaning', 'word_form_usage',
        'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
        'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
      ]) as k
    ) s
    where (s.ev->>'attempts')::integer < 4
      and exists (
        select 1 from public.assessment_items ai
        where ai.skill = s.skill and ai.status = 'active' and not (v_used_items ? ai.id)
      )
    order by
      case when (s.ev->>'has_contradiction')::boolean then 0 else 1 end asc,
      (s.ev->>'attempts')::integer asc,
      s.skill asc
    limit 1;

    if v_next_skill is null then
      -- No eligible skills left, finalize session
      v_final_result := public.compute_assessment_final_result(v_session.id, v_session.child_id, v_provisional);

      update public.assessment_sessions
      set status = 'completed',
          items_completed = v_next_seq,
          completed_at = now(),
          final_result = v_final_result,
          provisional_state = jsonb_set(v_provisional, '{current_item_id}', 'null'::jsonb),
          updated_at = now()
      where id = p_session_id;

      return jsonb_build_object(
        'sessionId', v_session.id,
        'status', 'completed',
        'itemsCompleted', v_next_seq,
        'targetItemCount', v_session.target_item_count,
        'currentItem', null
      );
    end if;

    select i.id into v_next_item_id
    from public.assessment_items i
    where i.skill = v_next_skill
      and i.status = 'active'
      and not (v_used_items ? i.id)
    order by abs(i.difficulty - coalesce(v_target_diff, 2)) asc, i.id asc
    limit 1;

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
end;
$$;

-- 5c. Get session state
create or replace function public.get_assessment_session_state(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.assessment_sessions%rowtype;
  v_current_item_id text;
  v_item_payload jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
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

  if v_session.status = 'completed' then
    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'completed',
      'itemsCompleted', v_session.items_completed,
      'targetItemCount', v_session.target_item_count,
      'currentItem', null
    );
  end if;

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
end;
$$;

-- 5d. Grants
grant execute on function public.start_or_resume_assessment_session(uuid) to authenticated;
grant execute on function public.submit_assessment_response(uuid, text, text, boolean, integer) to authenticated;
grant execute on function public.get_assessment_session_state(uuid) to authenticated;
