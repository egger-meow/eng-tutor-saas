-- ============================================================================
-- Direct Assessment Phase 5: Deterministic Learner State Projection
-- Forward-only migration:
-- 1. Adds projection_version to child_assessment_state with check constraint
-- 2. Creates canonical internal projection helper project_assessment_session_to_learner_state
-- 3. Revokes execution from public/anon/authenticated, grants to service_role
-- 4. Updates submit_assessment_response to atomically project on session completion
-- 5. Backfills existing completed assessment sessions into compact learner state
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Schema Update: Add projection_version to child_assessment_state
-- ----------------------------------------------------------------------------
alter table public.child_assessment_state
  add column if not exists projection_version text not null default 'assessment-projection-v1';

alter table public.child_assessment_state
  drop constraint if exists child_assessment_state_projection_version_check;

alter table public.child_assessment_state
  add constraint child_assessment_state_projection_version_check
  check (projection_version = 'assessment-projection-v1');

-- ----------------------------------------------------------------------------
-- 2. Deterministic Projection Helper Function
-- ----------------------------------------------------------------------------
create or replace function public.project_assessment_session_to_learner_state(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.assessment_sessions%rowtype;
  v_current_state public.child_assessment_state%rowtype;
  v_raw_skills jsonb;
  v_raw_domains jsonb;
  v_compact_skills jsonb := '{}'::jsonb;
  v_compact_domains jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_level text;
  v_confidence text;
begin
  if p_session_id is null then
    raise exception 'Assessment session id is required';
  end if;

  select * into v_session
  from public.assessment_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Assessment session not found: %', p_session_id;
  end if;

  if v_session.status != 'completed' or v_session.completed_at is null then
    raise exception 'Assessment session % is not completed', p_session_id;
  end if;

  if v_session.final_result is null or jsonb_typeof(v_session.final_result) != 'object' then
    raise exception 'Assessment session % has no valid final_result object', p_session_id;
  end if;

  if (v_session.final_result->>'childId') is distinct from v_session.child_id::text then
    raise exception 'Assessment session % childId mismatch in final_result: expected %, got %',
      p_session_id, v_session.child_id, v_session.final_result->>'childId';
  end if;

  -- Validate and project skillEvaluations
  v_raw_skills := v_session.final_result->'skillEvaluations';
  if v_raw_skills is null or jsonb_typeof(v_raw_skills) != 'object' then
    raise exception 'Assessment session % final_result missing valid skillEvaluations object', p_session_id;
  end if;

  for v_key, v_val in select * from jsonb_each(v_raw_skills) loop
    if v_key not in (
      'core_vocabulary', 'contextual_meaning', 'word_form_usage',
      'basic_sentence_structure', 'verb_tense_agreement', 'questions_and_negatives', 'modifiers_and_relations', 'complex_structures',
      'explicit_information', 'main_idea', 'vocabulary_in_context', 'inference', 'information_integration'
    ) then
      raise exception 'Unknown skill key % in final_result of session %', v_key, p_session_id;
    end if;

    if jsonb_typeof(v_val) != 'object' then
      raise exception 'Skill evaluation for % must be an object in session %', v_key, p_session_id;
    end if;

    v_level := v_val->>'result';
    v_confidence := v_val->>'confidence';

    if v_level is null or v_level not in ('needs_support', 'developing', 'secure') then
      raise exception 'Invalid skill result level % for % in session %', v_level, v_key, p_session_id;
    end if;

    if v_confidence is null or v_confidence not in ('low', 'medium', 'high') then
      raise exception 'Invalid skill confidence % for % in session %', v_confidence, v_key, p_session_id;
    end if;

    v_compact_skills := jsonb_set(
      v_compact_skills,
      array[v_key],
      jsonb_build_object(
        'level', v_level,
        'confidence', v_confidence
      ),
      true
    );
  end loop;

  -- Validate and project domainSummaries
  v_raw_domains := v_session.final_result->'domainSummaries';
  if v_raw_domains is null or jsonb_typeof(v_raw_domains) != 'object' then
    raise exception 'Assessment session % final_result missing valid domainSummaries object', p_session_id;
  end if;

  for v_key, v_val in select * from jsonb_each(v_raw_domains) loop
    if v_key not in ('vocabulary', 'grammar', 'reading') then
      raise exception 'Unknown domain key % in final_result of session %', v_key, p_session_id;
    end if;

    if jsonb_typeof(v_val) != 'object' then
      raise exception 'Domain summary for % must be an object in session %', v_key, p_session_id;
    end if;

    v_level := v_val->>'result';
    v_confidence := v_val->>'confidence';

    if v_level is null or v_level not in ('needs_support', 'developing', 'secure') then
      raise exception 'Invalid domain result level % for % in session %', v_level, v_key, p_session_id;
    end if;

    if v_confidence is null or v_confidence not in ('low', 'medium', 'high') then
      raise exception 'Invalid domain confidence % for % in session %', v_confidence, v_key, p_session_id;
    end if;

    v_compact_domains := jsonb_set(
      v_compact_domains,
      array[v_key],
      jsonb_build_object(
        'level', v_level,
        'confidence', v_confidence
      ),
      true
    );
  end loop;

  -- Idempotency & latest-wins resolution
  select * into v_current_state
  from public.child_assessment_state
  where child_id = v_session.child_id;

  if v_current_state.child_id is not null then
    -- Replay of same session or this session is at least as new as current projection: update
    if v_current_state.last_session_id = v_session.id or v_current_state.assessed_at <= v_session.completed_at then
      update public.child_assessment_state
      set last_session_id = v_session.id,
          status = 'completed',
          skill_results = v_compact_skills,
          domain_summaries = v_compact_domains,
          assessed_at = v_session.completed_at,
          projection_version = 'assessment-projection-v1',
          updated_at = now()
      where child_id = v_session.child_id;
      return true;
    else
      -- Existing state is strictly newer than this historical session: do not overwrite
      return false;
    end if;
  else
    insert into public.child_assessment_state (
      child_id,
      last_session_id,
      status,
      skill_results,
      domain_summaries,
      assessed_at,
      projection_version,
      created_at,
      updated_at
    ) values (
      v_session.child_id,
      v_session.id,
      'completed',
      v_compact_skills,
      v_compact_domains,
      v_session.completed_at,
      'assessment-projection-v1',
      now(),
      now()
    );
    return true;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Permissions: Internal / Service-Role only
-- ----------------------------------------------------------------------------
revoke execute on function public.project_assessment_session_to_learner_state(uuid) from public, anon, authenticated;
grant execute on function public.project_assessment_session_to_learner_state(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 4. Authoritative Completion Path: Update submit_assessment_response
-- ----------------------------------------------------------------------------
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

    -- Atomic deterministic projection to compact learner state
    perform public.project_assessment_session_to_learner_state(p_session_id);

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

    -- Atomic deterministic projection to compact learner state
    perform public.project_assessment_session_to_learner_state(p_session_id);

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

revoke execute on function public.submit_assessment_response(uuid, text, text, boolean, integer) from public, anon;
grant execute on function public.submit_assessment_response(uuid, text, text, boolean, integer) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Safe Forward-Only Backfill of Existing Completed Sessions
-- ----------------------------------------------------------------------------
do $$
declare
  v_rec record;
  v_success boolean;
begin
  -- For each child with completed assessment sessions, project their latest completed session
  for v_rec in (
    select distinct on (child_id) id, child_id, completed_at
    from public.assessment_sessions
    where status = 'completed' and final_result is not null
    order by child_id, completed_at desc nulls last, created_at desc
  ) loop
    begin
      v_success := public.project_assessment_session_to_learner_state(v_rec.id);
    exception when others then
      raise warning 'Backfill projection failed for session % (child %): %', v_rec.id, v_rec.child_id, sqlerrm;
    end;
  end loop;
end;
$$;
