-- Forward-only migration: Assessment engine parity & security hardening
-- 1. Revoke direct authenticated SELECT access on internal diagnostic tables (sessions, responses, child_state, passages)
-- 2. Revoke execute on assessment RPCs from PUBLIC and anon, grant authenticated and service_role
-- 3. Update compute_assessment_final_result to achieve 100% parity with TypeScript engine
-- 4. Update start_or_resume_assessment_session with unavailable broad-probe skill fallback
-- 5. Update submit_assessment_response with selector parity (same-passage preference, broad probe skipping, bank exhaustion)

-- ============================================================================
-- 1. Close Direct Authenticated Reads of Internal Assessment State & Passages
-- ============================================================================

drop policy if exists assessment_sessions_owner_select on public.assessment_sessions;
revoke select on public.assessment_sessions from authenticated;

drop policy if exists assessment_responses_owner_select on public.assessment_responses;
revoke select on public.assessment_responses from authenticated;

drop policy if exists child_assessment_state_owner_select on public.child_assessment_state;
revoke select on public.child_assessment_state from authenticated;

drop policy if exists assessment_passages_authenticated_select on public.assessment_passages;
revoke select on public.assessment_passages from authenticated;

-- ============================================================================
-- 2. Harden RPC Execute Permissions (Revoke PUBLIC/anon, Grant Authenticated)
-- ============================================================================

revoke execute on function public.start_or_resume_assessment_session(uuid) from public, anon;
revoke execute on function public.submit_assessment_response(uuid, text, text, boolean, integer) from public, anon;
revoke execute on function public.get_assessment_session_state(uuid) from public, anon;
revoke execute on function public.compute_assessment_final_result(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.normalize_short_answer(text) from public, anon;

grant execute on function public.start_or_resume_assessment_session(uuid) to authenticated, service_role;
grant execute on function public.submit_assessment_response(uuid, text, text, boolean, integer) to authenticated, service_role;
grant execute on function public.get_assessment_session_state(uuid) to authenticated, service_role;
grant execute on function public.compute_assessment_final_result(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.normalize_short_answer(text) to authenticated, service_role;

-- ============================================================================
-- 3. SQL Final Result Generator with Full TS V1 Engine Parity
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
  v_diff_sum integer;
  v_d_val integer;
  v_i integer;
  v_d text;
  v_d_skills text[];
  v_d_secure_cnt integer;
  v_d_needs_cnt integer;
  v_d_low_cnt integer;
  v_d_high_cnt integer;
  v_d_total_cnt integer;
  v_d_result text;
  v_d_conf text;
  v_d_summary text;
  v_v_res text;
  v_g_res text;
  v_r_res text;
  v_narrative text;
  v_all_skills text[] := array[
    'core_vocabulary', 'contextual_meaning', 'word_form_usage',
    'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
    'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
  ];
begin
  foreach v_skill in array v_all_skills loop
    if v_skill in ('core_vocabulary', 'contextual_meaning', 'word_form_usage') then
      v_domain := 'vocabulary';
    elsif v_skill in ('basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures') then
      v_domain := 'grammar';
    else
      v_domain := 'reading';
    end if;

    v_evidence := p_provisional_state->'skill_evidence'->v_skill;
    if v_evidence is null or coalesce((v_evidence->>'attempts')::integer, 0) = 0 then
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

      v_max_corr_diff := 0;
      v_min_fail_diff := 6;
      v_diff_sum := 0;

      for v_i in 0..(jsonb_array_length(v_diff_arr) - 1) loop
        v_d_val := (v_diff_arr->>v_i)::integer;
        v_diff_sum := v_diff_sum + v_d_val;
        if (v_evidence->'outcomes'->>v_i) = 'correct' then
          if v_d_val > v_max_corr_diff then
            v_max_corr_diff := v_d_val;
          end if;
        else
          if v_d_val < v_min_fail_diff then
            v_min_fail_diff := v_d_val;
          end if;
        end if;
      end loop;

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
        -- 2 or more attempts
        if v_has_contra then
          v_skill_conf := case when v_attempts >= 4 then 'medium' else 'low' end;
        elsif v_attempts >= 3 then
          v_skill_conf := 'high';
        else
          v_skill_conf := 'medium';
        end if;

        if (v_correct::numeric / v_attempts) >= 0.70 then
          if v_max_corr_diff >= 3 then
            v_skill_result := 'secure';
            v_est_diff := v_max_corr_diff;
          else
            v_skill_result := 'developing';
            v_est_diff := 2;
          end if;
        elsif (v_correct::numeric / v_attempts) <= 0.35 or (v_correct = 0 and v_min_fail_diff <= 2) then
          v_skill_result := 'needs_support';
          v_est_diff := greatest(1, least(v_min_fail_diff, 2));
        else
          v_skill_result := 'developing';
          v_est_diff := greatest(1, least(5, round(v_diff_sum::numeric / v_attempts)));
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
    v_d_low_cnt := 0;
    v_d_high_cnt := 0;

    if v_d = 'vocabulary' then
      v_d_skills := array['core_vocabulary', 'contextual_meaning', 'word_form_usage'];
    elsif v_d = 'grammar' then
      v_d_skills := array['basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures'];
    else
      v_d_skills := array['explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'];
    end if;

    v_d_total_cnt := array_length(v_d_skills, 1);

    foreach v_skill in array v_d_skills loop
      if (v_skill_evals->v_skill->>'result') = 'secure' then
        v_d_secure_cnt := v_d_secure_cnt + 1;
      elsif (v_skill_evals->v_skill->>'result') = 'needs_support' then
        v_d_needs_cnt := v_d_needs_cnt + 1;
      end if;

      if (v_skill_evals->v_skill->>'confidence') = 'high' then
        v_d_high_cnt := v_d_high_cnt + 1;
      elsif (v_skill_evals->v_skill->>'confidence') = 'low' then
        v_d_low_cnt := v_d_low_cnt + 1;
      end if;
    end loop;

    -- Domain result
    if v_d_secure_cnt::numeric > (v_d_total_cnt::numeric / 2.0) then
      v_d_result := 'secure';
    elsif v_d_needs_cnt::numeric > (v_d_total_cnt::numeric / 2.0) then
      v_d_result := 'needs_support';
    else
      v_d_result := 'developing';
    end if;

    -- Domain confidence
    if v_d_high_cnt >= (v_d_total_cnt - 1) then
      v_d_conf := 'high';
    elsif v_d_low_cnt::numeric > (v_d_total_cnt::numeric / 2.0) then
      v_d_conf := 'low';
    else
      v_d_conf := 'medium';
    end if;

    -- Summary text in Traditional Chinese
    v_d_summary := case
      when v_d = 'vocabulary' then
        case v_d_result
          when 'secure' then '字彙掌握穩固，常用單字辨析度佳。'
          when 'needs_support' then '基礎核心字彙較為薄弱，建議從教育部常用千字加強扎根。'
          else '常用字彙具備基礎，情境用法與延伸詞性需持續累積。'
        end
      when v_d = 'grammar' then
        case v_d_result
          when 'secure' then '句型結構與時態掌握良好，能理解複合句與進階文法。'
          when 'needs_support' then '基本五大句型與時態規則待強化，建議回歸基本句構練習。'
          else '基礎句型結構穩定，時態一致性與關係子句仍需多練習。'
        end
      else
        case v_d_result
          when 'secure' then '閱讀篇章理解力佳，能快速掌握主旨並進行深層推論。'
          when 'needs_support' then '文章細節擷取較為吃力，建議從短篇生活對話與公告開始建立信心。'
          else '能檢索篇章具體細節，長文推論與跨段落整合仍有進步空間。'
        end
    end;

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

  -- Overall narrative branches
  v_v_res := v_domain_summaries->'vocabulary'->>'result';
  v_g_res := v_domain_summaries->'grammar'->>'result';
  v_r_res := v_domain_summaries->'reading'->>'result';

  if v_v_res = 'secure' and v_g_res = 'secure' and v_r_res = 'secure' then
    v_narrative := '整體英語程度穩健優異，字彙量充足且文法結構清晰，具備良好的篇章推論能力。';
  elsif v_v_res = 'needs_support' and v_g_res = 'needs_support' and v_r_res = 'needs_support' then
    v_narrative := '目前在各學習領域均需要更多基礎引導，建議從日常核心字彙與簡單句構循序漸進建立學習自信。';
  elsif v_r_res = 'secure' and (v_g_res in ('developing', 'needs_support')) then
    v_narrative := '閱讀理解與語感表現良好，但文法規則與精準句構稍弱，加強時態與句型有助於突破瓶頸。';
  elsif v_g_res = 'secure' and (v_r_res in ('developing', 'needs_support')) then
    v_narrative := '文法概念清晰扎實，篇章閱讀時可多練習長文耐心與段落主旨掌握。';
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
-- 4. Start Or Resume Session with Fallback on Unavailable Probe Skills
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
  v_current_item_id text;
  v_item_payload jsonb;
  v_onboarding_level text;
  v_grade_stage text;
  v_baseline integer;
  v_adj integer;
  v_starting_diff integer;
  v_first_item_id text;
  v_provisional jsonb;
  v_broad_probe_skills text[];
  v_first_skill text;
  v_first_skill_idx integer;
  v_k integer;
  v_remaining_skills_json jsonb;
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

-- ============================================================================
-- 5. Submit Response with Selector Parity & Clean Edge-Case Finalization
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
  v_i integer;
  v_j integer;
  v_corr_d integer;
  v_fail_d integer;
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

  -- Contradiction detection: correct at diff >= failed at diff
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
  v_next_item_id := null;

  if v_remaining_skills is not null and jsonb_array_length(v_remaining_skills) > 0 then
    -- Broad probe continuation: skip unavailable skills until candidate found
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
        i.id asc
      limit 1;
    end loop;

    v_provisional := jsonb_set(v_provisional, '{broad_probe_remaining_skills}', v_remaining_skills);
  end if;

  if v_next_item_id is not null then
    -- Continues in broad_probe
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

  -- Check Stop Conditions
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
      child_id, last_session_id, status, skill_results, domain_summaries, assessed_at, updated_at
    ) values (
      v_session.child_id, v_session.id, 'completed',
      v_final_result->'skillEvaluations', v_final_result->'domainSummaries',
      now(), now()
    )
    on conflict (child_id) do update set
      last_session_id = excluded.last_session_id,
      status = excluded.status,
      skill_results = excluded.skill_results,
      domain_summaries = excluded.domain_summaries,
      assessed_at = excluded.assessed_at,
      updated_at = excluded.updated_at;

    return jsonb_build_object(
      'sessionId', v_session.id,
      'status', 'completed',
      'itemsCompleted', v_next_seq,
      'targetItemCount', v_session.target_item_count,
      'currentItem', null
    );
  end if;

  -- Pick Next Targeted Confirmation Skill
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
      i.id asc
    limit 1;

    if v_next_item_id is not null then
      exit;
    end if;
  end loop;

  if v_next_item_id is null then
    -- Clean termination if no further eligible items exist in bank
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
      child_id, last_session_id, status, skill_results, domain_summaries, assessed_at, updated_at
    ) values (
      v_session.child_id, v_session.id, 'completed',
      v_final_result->'skillEvaluations', v_final_result->'domainSummaries',
      now(), now()
    )
    on conflict (child_id) do update set
      last_session_id = excluded.last_session_id,
      status = excluded.status,
      skill_results = excluded.skill_results,
      domain_summaries = excluded.domain_summaries,
      assessed_at = excluded.assessed_at,
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
