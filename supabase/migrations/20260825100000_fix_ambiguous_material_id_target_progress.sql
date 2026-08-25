-- Fix ambiguous material_id column reference in private.refresh_child_target_progress
-- when joining child_learning_evidence (e) and feedback_memory_processing (p).

create or replace function private.refresh_child_target_progress(p_child_id uuid, p_target_type text, p_target_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_exposures integer; v_last_exposed_at timestamptz; v_last_exposed_material uuid;
  v_assessed integer; v_correct integer; v_partial integer; v_miss integer;
  v_first timestamptz; v_last timestamptz; v_first_material uuid; v_last_material uuid;
  v_mastered_at timestamptz; v_later_miss boolean; v_status text; v_review boolean; v_mastery text; v_weakness text;
begin
  select count(*), max(s.recorded_at), (array_agg(s.material_id order by s.recorded_at desc, s.material_id desc))[1]
  into v_exposures, v_last_exposed_at, v_last_exposed_material
  from public.child_weekly_learning_snapshots s
  where s.child_id = p_child_id and case p_target_type
    when 'vocabulary' then p_target_id = any(s.introduced_vocabulary_ids || s.reviewed_vocabulary_ids)
    when 'grammar' then p_target_id = any(s.grammar_target_ids)
    when 'communication' then p_target_id = any(s.communication_function_ids) else false end;
  with effective as (
    select e.* from public.child_learning_evidence e
    left join public.feedback_memory_processing p on p.id = e.feedback_processing_id
    where e.child_id=p_child_id and e.target_type=p_target_type and e.target_id=p_target_id
      and (e.feedback_processing_id is null or p.status='effective')
  )
  select count(*) filter(where assessed), count(*) filter(where assessed and result='correct'),
    count(*) filter(where assessed and result='partial'), count(*) filter(where assessed and result='incorrect'),
    min(observed_at) filter(where assessed), max(observed_at) filter(where assessed),
    (array_agg(material_id order by observed_at, id) filter(where assessed))[1],
    (array_agg(material_id order by observed_at desc, id desc) filter(where assessed))[1]
  into v_assessed,v_correct,v_partial,v_miss,v_first,v_last,v_first_material,v_last_material from effective;
  with successes as (
    select e.material_id, min(e.observed_at) observed_at from public.child_learning_evidence e
    left join public.feedback_memory_processing p on p.id=e.feedback_processing_id
    where e.child_id=p_child_id and e.target_type=p_target_type and e.target_id=p_target_id
      and e.assessed and e.result='correct' and (e.feedback_processing_id is null or p.status='effective')
    group by e.material_id
  ), first_success as (select min(observed_at) at from successes)
  select min(s.observed_at) filter(where s.observed_at >= f.at + interval '7 days'), false
  into v_mastered_at, v_later_miss from successes s cross join first_success f;
  if v_mastered_at is not null then
    select exists(select 1 from public.child_learning_evidence e left join public.feedback_memory_processing p on p.id=e.feedback_processing_id
      where e.child_id=p_child_id and e.target_type=p_target_type and e.target_id=p_target_id and e.assessed and e.result='incorrect'
      and e.observed_at > v_mastered_at and (e.feedback_processing_id is null or p.status='effective')) into v_later_miss;
  end if;
  if v_later_miss then v_status:='reviewing'; v_review:=true; v_mastery:='two_spaced_correct_materials'; v_weakness:='regression_after_mastery';
  elsif v_mastered_at is not null then v_status:='mastered'; v_review:=false; v_mastery:='two_spaced_correct_materials'; v_weakness:=null;
  elsif v_miss > 0 then v_status:='reviewing'; v_review:=true; v_mastery:=null; v_weakness:='explicit_incorrect';
  elsif v_exposures > 0 or v_assessed > 0 then v_status:='learning'; v_review:=false; v_mastery:=null; v_weakness:=null;
  else v_status:='new'; v_review:=false; v_mastery:=null; v_weakness:=null; end if;
  if p_target_type='vocabulary' then
    insert into public.child_vocab_progress(child_id,vocabulary_id,status,exposure_count,correct_count,last_seen_at,last_material_id,assessed_count,partial_count,miss_count,first_assessed_at,last_assessed_at,first_assessed_material_id,last_assessed_material_id,review_due,mastery_reason,weakness_reason,evidence_policy_version)
    values(p_child_id,p_target_id,v_status,v_exposures,v_correct,v_last_exposed_at,v_last_exposed_material,v_assessed,v_partial,v_miss,v_first,v_last,v_first_material,v_last_material,v_review,v_mastery,v_weakness,'evidence-v1')
    on conflict(child_id,vocabulary_id) do update set status=excluded.status,exposure_count=excluded.exposure_count,correct_count=excluded.correct_count,last_seen_at=excluded.last_seen_at,last_material_id=excluded.last_material_id,assessed_count=excluded.assessed_count,partial_count=excluded.partial_count,miss_count=excluded.miss_count,first_assessed_at=excluded.first_assessed_at,last_assessed_at=excluded.last_assessed_at,first_assessed_material_id=excluded.first_assessed_material_id,last_assessed_material_id=excluded.last_assessed_material_id,review_due=excluded.review_due,mastery_reason=excluded.mastery_reason,weakness_reason=excluded.weakness_reason,evidence_policy_version='evidence-v1',updated_at=now();
  elsif p_target_type='grammar' then
    insert into public.child_grammar_progress(child_id,grammar_id,status,exposure_count,correct_count,last_seen_at,last_material_id,assessed_count,partial_count,miss_count,first_assessed_at,last_assessed_at,first_assessed_material_id,last_assessed_material_id,review_due,mastery_reason,weakness_reason,evidence_policy_version)
    values(p_child_id,p_target_id,v_status,v_exposures,v_correct,v_last_exposed_at,v_last_exposed_material,v_assessed,v_partial,v_miss,v_first,v_last,v_first_material,v_last_material,v_review,v_mastery,v_weakness,'evidence-v1')
    on conflict(child_id,grammar_id) do update set status=excluded.status,exposure_count=excluded.exposure_count,correct_count=excluded.correct_count,last_seen_at=excluded.last_seen_at,last_material_id=excluded.last_material_id,assessed_count=excluded.assessed_count,partial_count=excluded.partial_count,miss_count=excluded.miss_count,first_assessed_at=excluded.first_assessed_at,last_assessed_at=excluded.last_assessed_at,first_assessed_material_id=excluded.first_assessed_material_id,last_assessed_material_id=excluded.last_assessed_material_id,review_due=excluded.review_due,mastery_reason=excluded.mastery_reason,weakness_reason=excluded.weakness_reason,evidence_policy_version='evidence-v1',updated_at=now();
  elsif p_target_type='communication' then
    insert into public.child_communication_progress(child_id,communication_function_id,status,exposure_count,assessed_count,correct_count,miss_count,last_seen_at,last_material_id,partial_count,first_assessed_at,last_assessed_at,first_assessed_material_id,last_assessed_material_id,review_due,mastery_reason,weakness_reason,evidence_policy_version)
    values(p_child_id,p_target_id,v_status,v_exposures,v_assessed,v_correct,v_miss,v_last_exposed_at,v_last_exposed_material,v_partial,v_first,v_last,v_first_material,v_last_material,v_review,v_mastery,v_weakness,'evidence-v1')
    on conflict(child_id,communication_function_id) do update set status=excluded.status,exposure_count=excluded.exposure_count,assessed_count=excluded.assessed_count,correct_count=excluded.correct_count,miss_count=excluded.miss_count,last_seen_at=excluded.last_seen_at,last_material_id=excluded.last_material_id,partial_count=excluded.partial_count,first_assessed_at=excluded.first_assessed_at,last_assessed_at=excluded.last_assessed_at,first_assessed_material_id=excluded.first_assessed_material_id,last_assessed_material_id=excluded.last_assessed_material_id,review_due=excluded.review_due,mastery_reason=excluded.mastery_reason,weakness_reason=excluded.weakness_reason,evidence_policy_version='evidence-v1',updated_at=now();
  end if;
end;
$$;

revoke all on function private.refresh_child_target_progress(uuid, text, text) from public, anon, authenticated;
grant execute on function private.refresh_child_target_progress(uuid, text, text) to service_role;
