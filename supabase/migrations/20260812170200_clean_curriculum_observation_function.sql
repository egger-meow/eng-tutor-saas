drop function if exists public.worker_record_curriculum_observations(uuid, text, jsonb);

create function public.worker_record_curriculum_observations(
  material_id uuid,
  worker_id text,
  canonical_source jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  material_row public.materials;
  child_id_value uuid;
  vocabulary_item jsonb;
  target_id text;
  target_domain text;
  quality_item jsonb;
  history_entry jsonb;
begin
  perform $2;
  select * into material_row from public.materials where id = $1;
  if material_row.id is null then raise exception 'material does not exist'; end if;
  child_id_value := material_row.child_id;

  for vocabulary_item in select value from jsonb_array_elements(coalesce($3 #> '{studentLesson,vocabulary}', '[]'::jsonb)) loop
    insert into public.child_vocab_progress (child_id, vocabulary_id, status, exposure_count, last_seen_at, last_material_id)
    values (child_id_value, left(coalesce(vocabulary_item->>'id', vocabulary_item->>'word'), 160), case vocabulary_item->>'status' when 'repeated-miss' then 'learning' when 'review' then 'reviewing' else 'new' end, 1, now(), $1)
    on conflict (child_id, vocabulary_id) do update set exposure_count = public.child_vocab_progress.exposure_count + 1, last_seen_at = now(), last_material_id = excluded.last_material_id, status = case when public.child_vocab_progress.status = 'mastered' then 'mastered' else excluded.status end, updated_at = now();
  end loop;

  for target_id, target_domain in select target->>'id', target->>'domain' from jsonb_array_elements(coalesce($3 #> '{learningPlan,targets}', '[]'::jsonb)) as target loop
    if target_domain = 'grammar' then
      insert into public.child_grammar_progress (child_id, grammar_id, status, exposure_count, last_seen_at, last_material_id)
      values (child_id_value, left(target_id, 160), 'learning', 1, now(), $1)
      on conflict (child_id, grammar_id) do update set exposure_count = public.child_grammar_progress.exposure_count + 1, last_seen_at = now(), last_material_id = excluded.last_material_id, updated_at = now();
    end if;
  end loop;

  history_entry := jsonb_build_object('materialId', $1, 'week', material_row.material_week, 'curriculumVersion', $3 #>> '{metadata,curriculumVersion}', 'hypotheses', coalesce($3 #> '{trackingDelta,hypothesesToVerify}', '[]'::jsonb), 'feedbackApplied', coalesce($3 #> '{qualityEvidence,feedbackApplied}', '[]'::jsonb), 'recordedAt', now());
  update public.child_learning_state
  set compact_weekly_history = ((case when jsonb_array_length(compact_weekly_history) >= 11 then compact_weekly_history - 0 else compact_weekly_history end) || jsonb_build_array(history_entry)), recent_feedback_summary = left(coalesce($3 #>> '{learnerSnapshot,feedbackSummary}', recent_feedback_summary), 4000), updated_at = now()
  where child_id = child_id_value;

  for quality_item in select value from jsonb_array_elements(coalesce($3 #> '{qualityEvidence,criticFindings}', '[]'::jsonb)) loop
    insert into public.curriculum_quality_observations (child_id, material_id, dimension, severity, evidence) values (child_id_value, $1, left(quality_item->>'dimension', 160), quality_item->>'severity', left(coalesce(quality_item->>'finding', ''), 4000));
  end loop;
  return true;
end;
$$;

revoke all on function public.worker_record_curriculum_observations(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.worker_record_curriculum_observations(uuid, text, jsonb) to service_role;
