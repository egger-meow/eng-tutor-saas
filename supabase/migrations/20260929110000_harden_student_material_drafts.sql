-- Keep the canonical answer key and the mutable draft state behind scoped RPCs.
revoke all on public.materials from authenticated;
grant select (id, child_id, material_week, revision, rule_version,
  student_pdf_path, parent_answer_pdf_path, created_at, generation_summary,
  prompt_version, generator_version, model_name, observations_recorded_at)
  on public.materials to authenticated;

revoke all on public.student_material_drafts from authenticated;

create or replace function private_generation.student_lesson_without_answers(p_value jsonb)
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare
  v_key text;
  v_item jsonb;
  v_result jsonb;
begin
  if jsonb_typeof(p_value) = 'object' then
    v_result := '{}'::jsonb;
    for v_key, v_item in select key, value from jsonb_each(p_value) loop
      if lower(v_key) = any (array[
        'answer', 'answers', 'answerkey', 'correctanswer', 'correctanswers',
        'parentsummary', 'parentanswer', 'parentanswers',
        'grounding', 'qualityevidence', 'trackingdelta', 'learnersnapshot',
        'learningplan', 'inputsnapshot'
      ]) then continue; end if;
      v_result := v_result || jsonb_build_object(
        v_key, private_generation.student_lesson_without_answers(v_item));
    end loop;
    return v_result;
  elsif jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(private_generation.student_lesson_without_answers(value)), '[]'::jsonb)
      into v_result from jsonb_array_elements(p_value);
    return v_result;
  end if;
  return p_value;
end;
$$;

-- This function reads canonical_source after checking the caller's family ownership.
-- The browser role has no direct SELECT privilege on that column.
alter function public.get_student_material_projection(uuid) security definer;
alter function public.get_owned_released_material(uuid) security definer;

do $$
declare
  v_definition text;
  v_old text := 'v_lesson := v_lesson - ''answers'' - ''answer'' - ''parentSummary'' - ''grounding'' - ''qualityEvidence'';';
begin
  select pg_get_functiondef('public.get_student_material_projection(uuid)'::regprocedure)
    into v_definition;
  if position(v_old in v_definition) = 0 then
    raise exception 'student projection definition drifted';
  end if;
  execute replace(v_definition, v_old,
    'v_lesson := private_generation.student_lesson_without_answers(v_lesson);');
end;
$$;

create or replace function public.save_material_draft(
  p_material_id uuid,
  p_answers jsonb,
  p_self_check jsonb default '[]'::jsonb,
  p_client_version integer default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child_id uuid;
  v_current public.student_material_drafts%rowtype;
  v_saved public.student_material_drafts%rowtype;
begin
  if p_client_version is null or p_client_version < 0
    or jsonb_typeof(p_answers) is distinct from 'object'
    or jsonb_typeof(p_self_check) is distinct from 'array' then
    raise exception 'INVALID_DRAFT_INPUT';
  end if;

  -- The material row serializes both existing-row and first-insert saves.
  select material.child_id into v_child_id
  from public.materials material
  join public.children child on child.id = material.child_id
    and child.parent_id = (select auth.uid())
  join public.generation_jobs job on job.material_id = material.id
    and job.child_id = child.id
  where material.id = p_material_id and job.status = 'completed'
    and job.completed_at is not null and job.release_at <= now()
  for update of material;
  if v_child_id is null then raise exception 'MATERIAL_NOT_FOUND_OR_FORBIDDEN'; end if;

  select * into v_current from public.student_material_drafts
  where material_id = p_material_id and child_id = v_child_id;
  if p_client_version is distinct from coalesce(v_current.version, 0) then
    return jsonb_build_object('success', false, 'conflict', true,
      'version', coalesce(v_current.version, 0),
      'answers', coalesce(v_current.answers, '{}'::jsonb),
      'self_check', coalesce(v_current.self_check, '[]'::jsonb));
  end if;

  insert into public.student_material_drafts
    (material_id, child_id, answers, self_check, version, updated_at)
  values (p_material_id, v_child_id, p_answers, p_self_check,
    p_client_version + 1, clock_timestamp())
  on conflict (material_id, child_id) do update set
    answers = excluded.answers, self_check = excluded.self_check,
    version = excluded.version, updated_at = excluded.updated_at
  returning * into v_saved;

  return jsonb_build_object('success', true, 'conflict', false,
    'version', v_saved.version, 'updated_at', v_saved.updated_at);
end;
$$;

alter function public.get_material_draft(uuid) security definer;

revoke all on function public.save_material_draft(uuid,jsonb,jsonb,integer) from public, anon;
grant execute on function public.save_material_draft(uuid,jsonb,jsonb,integer) to authenticated;
