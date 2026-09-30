-- Versioned, bounded data projection into the existing learningMemory input.
-- No prompt, canonical schema, release manifest or active contract changes.
create or replace function private_generation.material_answer_questions(p_source jsonb)
returns table(question jsonb) language sql immutable set search_path = '' as $$
  select q.value from jsonb_array_elements(coalesce(p_source->'studentLesson'->'practice','[]')) s,
    lateral jsonb_array_elements(coalesce(s.value->'questions','[]')) q
  union all select q.value from jsonb_array_elements(coalesce(p_source->'studentLesson'->'homework'->'questions','[]')) q
  union all select q.value from jsonb_array_elements(coalesce(p_source->'exercises','[]')) s,
    lateral jsonb_array_elements(coalesce(s.value->'questions','[]')) q
  union all select q.value from jsonb_array_elements(coalesce(p_source->'homework'->'tasks','[]')) q
  union all select jsonb_build_object('id','opening-reflection','prompt',p_source#>>'{studentLesson,opening,activity,prompt}','itemType','reflection')
    where p_source#>>'{studentLesson,opening,activity,type}'='question'
  union all select jsonb_build_object('id','adaptive-'||(p_source#>>'{studentLesson,adaptiveExtension,id}'),
    'prompt',p_source#>>'{studentLesson,adaptiveExtension,taskZh}','itemType','adaptive_reflection')
    where p_source#>>'{studentLesson,adaptiveExtension,id}' is not null;
$$;

create or replace function private_generation.student_performance_capsule(
  p_child_id uuid, p_cutoff timestamptz, p_source_material_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  packet record; item record; q jsonb; detail jsonb; response_units jsonb;
  recent_ids uuid[] := '{}'; recent jsonb := '[]'; details jsonb := '[]';
  summary jsonb; older jsonb; capsule jsonb;
  detail_count integer := 0; omitted integer := 0; missing_question integer := 0;
  option_notes jsonb; reading_note text;
begin
  for packet in
    select s.*, m.canonical_source from public.student_material_submissions s
    join public.materials m on m.id=s.material_id and m.child_id=s.child_id
    where s.child_id=p_child_id and s.submitted_at<=p_cutoff
    order by (s.material_id=p_source_material_id) desc nulls last, s.submitted_at desc, s.material_id
    limit 3
  loop
    recent_ids := array_append(recent_ids,packet.material_id);
    select jsonb_build_object('total',count(*),
      'correct',count(*) filter(where r.value->>'status'='correct'),
      'incorrect',count(*) filter(where r.value->>'status'='incorrect'),
      'unanswered',count(*) filter(where r.value->>'status'='unanswered'),
      'ungraded',count(*) filter(where r.value->>'status'='open_review')) into summary
    from jsonb_array_elements(packet.results) r;
    recent := recent || jsonb_build_array(jsonb_build_object(
      'materialId',packet.material_id,'submissionMaterialId',packet.material_id,
      'submittedAt',packet.submitted_at,'counts',summary));
    for item in select r.value from (
      select x.value from jsonb_array_elements(packet.results) x
        where x.value->>'status' in ('incorrect','open_review')
      union all select jsonb_build_object('question_id',x.question->>'id','status','open_review')
        from private_generation.material_answer_questions(packet.canonical_source) x
        where x.question->>'itemType' in ('reflection','adaptive_reflection')
          and nullif(trim(packet.answers->>(x.question->>'id')),'') is not null
          and not exists(select 1 from jsonb_array_elements(packet.results) z where z.value->>'question_id'=x.question->>'id')
      ) r order by case r.value->>'status' when 'incorrect' then 0 else 1 end, r.value->>'question_id'
    loop
      if detail_count>=12 then omitted := omitted+1; continue; end if;
      q := null;
      -- Stable IDs must resolve uniquely. Never guess from position or skill names.
      select x.question into q from private_generation.material_answer_questions(packet.canonical_source) x
      where coalesce(x.question->>'id',x.question->>'questionId')=item.value->>'question_id'
      and (select count(*) from private_generation.material_answer_questions(packet.canonical_source) z
        where coalesce(z.question->>'id',z.question->>'questionId')=item.value->>'question_id')=1;
      if q is null then missing_question := missing_question+1; continue; end if;
      select coalesce(jsonb_agg(jsonb_build_object('responseUnitId',u.id,'responseNote',left(packet.answers->>u.id,300)) order by u.id), '[]') into response_units
      from (select distinct x.value #>> '{}' as id
        from jsonb_path_query(coalesce(q->'responseLayout','{}'),'$.**.responseUnitId') x(value)
        where nullif(trim(packet.answers->>(x.value #>> '{}')),'') is not null
        order by id limit 8) u;
      select coalesce(jsonb_agg(left(o.value,160) order by o.ordinality),'[]') into option_notes
      from jsonb_array_elements_text(coalesce(q->'options','[]')) with ordinality o(value,ordinality)
      where o.ordinality<=6;
      -- Keep bounded table/dialogue/non-paragraph content as well as prose.
      reading_note := left(coalesce((packet.canonical_source#>'{studentLesson,reading}')::text,''),1800);
      detail := jsonb_build_object('materialId',packet.material_id,
        'submissionMaterialId',packet.material_id,'submittedAt',packet.submitted_at,
        'questionId',item.value->>'question_id','status',item.value->>'status',
        'itemType',left(q->>'itemType',100),'skillClassification','unknown',
        'promptNote',left(q->>'prompt',800),'optionNotes',option_notes,
        'responseLayoutNote',left((q->'responseLayout')::text,1000),
        'responseNote',left(packet.answers->>(item.value->>'question_id'),800),
        'responseUnitNotes',response_units,'canonicalAnswerNote',left(item.value->>'correct_answer',600),
        'readingNote',reading_note,'contentMayBeTruncated',true,
        'gradingBasis',case when item.value->>'status'='incorrect' then 'server_single_choice' else 'ungraded' end);
      -- All private prose uses *Note keys, so existing research privacy screening
      -- protects this additive memory input without changing executor prompts.
      if octet_length((details || jsonb_build_array(detail))::text)>44000 then
        omitted := omitted+1; continue;
      end if;
      details := details || jsonb_build_array(detail); detail_count := detail_count+1;
    end loop;
  end loop;
  -- PK material_id gives one immutable submission per packet. Recent/older sets
  -- are disjoint: reading a capsule again never increments learner counters.
  select jsonb_build_object('submissions',count(distinct s.material_id),
    'correct',count(*) filter(where r.value->>'status'='correct'),
    'incorrect',count(*) filter(where r.value->>'status'='incorrect'),
    'unanswered',count(*) filter(where r.value->>'status'='unanswered'),
    'ungraded',count(*) filter(where r.value->>'status'='open_review')) into older
  from public.student_material_submissions s
  left join lateral jsonb_array_elements(s.results) r on true
  where s.child_id=p_child_id and s.submitted_at<=p_cutoff and not(s.material_id=any(recent_ids));
  capsule := jsonb_build_object('projectionVersion','student-performance-v1',
    'cutoffTimestamp',p_cutoff,'recentSubmissions',recent,'items',details,'olderCounts',older,
    'omittedDetailCount',omitted,'unresolvedQuestionCount',missing_question,
    'limits',jsonb_build_object('recentSubmissions',3,'detailItems',12,'detailBytes',44000),
    'unansweredMeaning','completion_only_not_incorrect',
    'ungradedMeaning','not_assessed_not_incorrect',
    'skillAttribution','unknown_without_verified_mapping',
    'masteryInference','none');
  return capsule;
end $$;
revoke all on function private_generation.material_answer_questions(jsonb),
  private_generation.student_performance_capsule(uuid,timestamptz,uuid) from public,anon,authenticated;

alter function public.worker_generation_context(uuid,text) rename to worker_generation_context_before_student_performance;
-- PL/pgSQL qualifies parameters by function name; preserve those bindings.
do $$ begin
  execute replace(pg_get_functiondef('public.worker_generation_context_before_student_performance(uuid,text)'::regprocedure),
    'worker_generation_context.job_id','worker_generation_context_before_student_performance.job_id');
end $$;
revoke all on function public.worker_generation_context_before_student_performance(uuid,text) from public,anon,authenticated;
grant execute on function public.worker_generation_context_before_student_performance(uuid,text) to service_role;

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare base jsonb; frozen jsonb; memory jsonb; evidence jsonb; job public.generation_jobs%rowtype;
begin
  -- Existing authority checks the claimed worker/lease before private data access.
  base := public.worker_generation_context_before_student_performance(job_id,worker_id);
  select s.generation_context into frozen from private_generation.generation_claim_snapshots s
    where s.job_id=worker_generation_context.job_id;
  select j.* into job from public.generation_jobs j where j.id=worker_generation_context.job_id;
  if frozen is not null then return frozen; end if;
  memory := coalesce(base->'learningMemory','{}');
  if jsonb_typeof(memory)<>'object' then raise exception 'LEARNING_MEMORY_SHAPE_UNSUPPORTED'; end if;
  -- No snapshot exists yet: both claims freeze this data before fingerprinting.
  evidence := private_generation.student_performance_capsule(job.child_id,
    least(now(),coalesce(job.feedback_cutoff_at,now())),job.source_material_id);
  memory := memory-'studentPerformanceEvidence';
  if evidence is not null then memory := memory || jsonb_build_object('studentPerformanceEvidence',evidence); end if;
  return base || jsonb_build_object('learningMemory',memory);
end $$;
revoke all on function public.worker_generation_context(uuid,text) from public,anon,authenticated;
grant execute on function public.worker_generation_context(uuid,text) to service_role;
