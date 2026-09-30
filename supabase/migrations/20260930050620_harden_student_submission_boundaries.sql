-- Enforce the web submission gate for every feedback write, including legacy RPC
-- and direct owner writes. Historical paper packets retain their prior workflow.
create or replace function private_generation.require_submission_for_material_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.materials m
    where m.id = new.material_id and m.child_id = new.child_id
      and m.answer_unlock_requires_submission)
    and not exists (select 1 from public.student_material_submissions s
      where s.material_id = new.material_id and s.child_id = new.child_id) then
    raise exception 'MATERIAL_SUBMISSION_REQUIRED';
  end if;
  return new;
end $$;
revoke all on function private_generation.require_submission_for_material_feedback() from public, anon, authenticated;
create trigger require_submission_for_material_feedback before insert or update on public.feedback
for each row execute function private_generation.require_submission_for_material_feedback();

-- Guard legacy feedback requests at their authority, including release and
-- repeat-request handling before quota checks. Do not alter historical content.
do $patch$
declare definition text; patched text;
begin
  definition := pg_get_functiondef('public.submit_feedback_and_request_next_material(uuid,uuid,smallint,integer,text,text,text,text)'::regprocedure);
  patched := replace(definition,
    'if v_material.id is null then raise exception ''owned source material not found''; end if;',
    'if v_material.id is null then raise exception ''owned source material not found''; end if;
    if not exists(select 1 from public.generation_jobs j where j.material_id=p_material_id
      and j.child_id=p_child_id and j.status=''completed'' and j.completed_at is not null
      and j.release_at<=now()) then raise exception ''MATERIAL_NOT_RELEASED''; end if;');
  if patched=definition then raise exception 'legacy feedback release guard patch drift'; end if;
  definition := patched;
  patched := replace(definition, '-- Service months are anchored to the child''s activation date.',
    'if exists(select 1 from public.material_generation_requests r
      where r.child_id=p_child_id and r.source_material_id=p_material_id) then
      return jsonb_build_object(''feedbackSaved'',true,''requested'',true,''alreadyRequested'',true);
    end if;
    -- Service months are anchored to the child''s activation date.');
  if patched=definition then raise exception 'legacy feedback idempotency patch drift'; end if;
  execute patched;
end $patch$;

-- Resolve a key only if exactly one option matches; never invent a mark for
-- duplicated option text, conflicting letter/text, or an out-of-range letter.
create or replace function private_generation.single_choice_letter(p_options jsonb, p_answer text)
returns text language plpgsql immutable set search_path = '' as $$
declare v_matches integer; v_letter text; v_text text := lower(trim(p_answer)); v_index integer;
begin
  if v_text is null or v_text = '' then return null; end if;
  select count(*), min(chr((64+o.ordinality)::integer)) into v_matches, v_letter
  from jsonb_array_elements_text(p_options) with ordinality o(value, ordinality)
  where lower(trim(o.value)) = v_text;
  if v_matches > 1 then return null; end if;
  if v_matches = 1 then return v_letter; end if;
  if upper(v_text) ~ '^[A-F][.)]?$' then
    v_index := ascii(left(upper(v_text),1))-65;
    if v_index < jsonb_array_length(p_options) then return chr(v_index+65); end if;
  elsif upper(v_text) ~ '^[A-F][.)][[:space:]]+' then
    v_index := ascii(left(upper(v_text),1))-65;
    if v_index < jsonb_array_length(p_options) and
      lower(trim(p_options->>v_index)) = lower(trim(regexp_replace(p_answer,'^[[:space:]]*[A-Fa-f][.)][[:space:]]+',''))) then
      return chr(v_index+65);
    end if;
  end if;
  return null;
end $$;
revoke all on function private_generation.single_choice_letter(jsonb,text) from public,anon,authenticated;

create or replace function public.submit_student_material(p_material_id uuid, p_client_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_material public.materials%rowtype;
  v_draft public.student_material_drafts%rowtype;
  v_existing jsonb;
  v_question jsonb;
  v_key jsonb;
  v_id text;
  v_response text;
  v_expected text;
  v_expected_letter text;
  v_response_letter text;
  v_options jsonb;
  v_result text;
  v_results jsonb := '[]'::jsonb;
  v_seen text[] := '{}';
begin
  select m.* into v_material from public.materials m
  join public.children c on c.id = m.child_id and c.parent_id = (select auth.uid())
  join public.generation_jobs j on j.material_id = m.id and j.child_id = c.id
  where m.id = p_material_id and j.status = 'completed'
    and j.completed_at is not null and j.release_at <= now()
  for update of m;
  if not found then raise exception 'MATERIAL_NOT_FOUND_OR_FORBIDDEN'; end if;

  v_existing := public.get_student_material_submission(p_material_id);
  if v_existing is not null then return v_existing; end if;
  select * into v_draft from public.student_material_drafts
    where material_id = p_material_id and child_id = v_material.child_id for update;
  if p_client_version is null or p_client_version <> coalesce(v_draft.version, 0) then
    return jsonb_build_object('conflict', true, 'version', coalesce(v_draft.version, 0));
  end if;

  -- Grade only unmistakable single-choice keys. Free text and structured responses await review.
  for v_question in
    select q.value from jsonb_array_elements(coalesce(v_material.canonical_source->'studentLesson'->'practice', '[]'::jsonb)) stage,
      lateral jsonb_array_elements(coalesce(stage.value->'questions', '[]'::jsonb)) q
    union all
    select q.value from jsonb_array_elements(coalesce(v_material.canonical_source->'studentLesson'->'homework'->'questions', '[]'::jsonb)) q
    union all
    select q.value from jsonb_array_elements(coalesce(v_material.canonical_source->'exercises', '[]'::jsonb)) stage,
      lateral jsonb_array_elements(coalesce(stage.value->'questions', '[]'::jsonb)) q
    union all
    select q.value from jsonb_array_elements(coalesce(v_material.canonical_source->'homework'->'tasks', '[]'::jsonb)) q
  loop
    v_id := coalesce(v_question->>'id', v_question->>'questionId');
    if v_id is null or v_id = any(v_seen) then continue; end if;
    v_seen := array_append(v_seen, v_id);
    v_response := nullif(trim(coalesce(v_draft.answers->>v_id, '')), '');
    if v_response is null and v_question ? 'responseLayout' then
      for v_key in select jsonb_path_query(v_question->'responseLayout', '$.**.responseUnitId') loop
        if nullif(trim(coalesce(v_draft.answers->>(v_key #>> '{}'), '')), '') is not null then
          v_response := '[structured response]';
          exit;
        end if;
      end loop;
    end if;
    v_result := case when v_response is null then 'unanswered' else 'open_review' end;
    v_expected := null;
    v_options := v_question->'options';
    select case when count(*) = 1 then min(a.value->>'answer') end into v_expected
    from jsonb_array_elements(coalesce(v_material.canonical_source->'answers', '[]'::jsonb)) a
    where a.value->>'questionId' = v_id;
    if jsonb_typeof(v_options) = 'array' and jsonb_array_length(v_options) between 2 and 6 then
      v_expected_letter := private_generation.single_choice_letter(v_options, v_expected);
      v_response_letter := private_generation.single_choice_letter(v_options, v_response);
      if v_response is not null and v_expected_letter is not null and v_response_letter is not null then
        v_result := case when v_response_letter = v_expected_letter then 'correct' else 'incorrect' end;
      end if;
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'question_id', v_id, 'status', v_result,
      'correct_answer', v_expected));
  end loop;

  insert into public.student_material_submissions(material_id, child_id, answers, self_check, results)
  values (p_material_id, v_material.child_id, coalesce(v_draft.answers, '{}'::jsonb),
    coalesce(v_draft.self_check, '[]'::jsonb), v_results);
  return public.get_student_material_submission(p_material_id);
end $$;
