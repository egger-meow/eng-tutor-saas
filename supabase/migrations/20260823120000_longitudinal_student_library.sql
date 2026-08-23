-- Permanent, evidence-backed Student Library.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.child_weekly_learning_snapshots (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  material_id uuid not null unique,
  sequence_number integer not null check (sequence_number > 0),
  material_week date,
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  input_fingerprint text,
  schema_version text,
  curriculum_version text,
  prompt_version text,
  generator_version text,
  model_id text,
  reading_level text,
  reading_signals jsonb not null default '{}'::jsonb check (jsonb_typeof(reading_signals) = 'object'),
  introduced_vocabulary_ids text[] not null default '{}',
  reviewed_vocabulary_ids text[] not null default '{}',
  grammar_target_ids text[] not null default '{}',
  communication_function_ids text[] not null default '{}',
  measurable_targets jsonb not null default '[]'::jsonb check (jsonb_typeof(measurable_targets) = 'array'),
  target_evidence jsonb not null default '{}'::jsonb,
  assessment_opportunities jsonb not null default '[]'::jsonb check (jsonb_typeof(assessment_opportunities) = 'array'),
  hypotheses jsonb not null default '[]'::jsonb check (jsonb_typeof(hypotheses) = 'array'),
  next_review_candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(next_review_candidates) = 'array'),
  observed_mistakes jsonb not null default '[]'::jsonb check (jsonb_typeof(observed_mistakes) = 'array'),
  verified_strengths jsonb not null default '[]'::jsonb check (jsonb_typeof(verified_strengths) = 'array'),
  verified_weaknesses jsonb not null default '[]'::jsonb check (jsonb_typeof(verified_weaknesses) = 'array'),
  state_delta jsonb not null default '{}'::jsonb check (jsonb_typeof(state_delta) = 'object'),
  personalization_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(personalization_evidence) = 'array'),
  improvement_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(improvement_evidence) = 'array'),
  recorded_at timestamptz not null,
  backfilled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (child_id, sequence_number),
  unique (id, child_id),
  foreign key (material_id, child_id) references public.materials(id, child_id) on delete cascade
);

alter table public.feedback add constraint feedback_id_child_material_unique unique(id, child_id, material_id);

create table public.feedback_memory_processing (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null,
  child_id uuid not null references public.children(id) on delete cascade,
  material_id uuid not null,
  revision_fingerprint text not null,
  processor_version text not null,
  status text not null check (status in ('effective', 'superseded')),
  cutoff_classification text not null,
  sanitized_outcome jsonb not null default '{}'::jsonb check (jsonb_typeof(sanitized_outcome) = 'object'),
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (feedback_id, revision_fingerprint),
  unique (id, feedback_id, child_id, material_id),
  foreign key (feedback_id, child_id, material_id)
    references public.feedback(id, child_id, material_id) on delete cascade
);

create unique index feedback_memory_processing_effective_idx
  on public.feedback_memory_processing(feedback_id) where status = 'effective';

create table public.child_learning_evidence (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  material_id uuid not null,
  feedback_id uuid,
  feedback_processing_id uuid,
  target_type text not null check (target_type in ('vocabulary', 'grammar', 'communication', 'reading')),
  target_id text,
  evidence_type text not null check (evidence_type in ('learner_assessment', 'structured_parent_observation', 'captured_exercise_result')),
  result text not null check (result in ('correct', 'incorrect', 'partial', 'unknown')),
  assessed boolean not null,
  source text not null,
  evidence_strength text not null,
  observed_at timestamptz not null,
  processor_version text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  check ((target_type = 'reading') or target_id is not null),
  check ((feedback_id is null and feedback_processing_id is null) or (feedback_id is not null and feedback_processing_id is not null)),
  check (not assessed or result in ('correct', 'incorrect', 'partial')),
  foreign key (material_id, child_id) references public.materials(id, child_id) on delete cascade,
  foreign key (feedback_processing_id, feedback_id, child_id, material_id)
    references public.feedback_memory_processing(id, feedback_id, child_id, material_id) on delete cascade
);

create index child_weekly_snapshots_sequence_idx on public.child_weekly_learning_snapshots(child_id, sequence_number desc);
create index child_weekly_snapshots_recorded_idx on public.child_weekly_learning_snapshots(child_id, recorded_at desc);
create index child_learning_evidence_target_idx on public.child_learning_evidence(child_id, target_type, target_id, observed_at);
create index child_learning_evidence_processing_idx on public.child_learning_evidence(feedback_processing_id) where feedback_processing_id is not null;
create index feedback_memory_processing_status_idx on public.feedback_memory_processing(feedback_id, status);

alter table public.child_vocab_progress
  add column assessed_count integer not null default 0 check (assessed_count >= 0),
  add column partial_count integer not null default 0 check (partial_count >= 0),
  add column miss_count integer not null default 0 check (miss_count >= 0),
  add column first_assessed_at timestamptz,
  add column last_assessed_at timestamptz,
  add column first_assessed_material_id uuid,
  add column last_assessed_material_id uuid,
  add column review_due boolean not null default false,
  add column mastery_reason text,
  add column weakness_reason text,
  add column evidence_policy_version text not null default 'evidence-v1';
alter table public.child_grammar_progress
  add column assessed_count integer not null default 0 check (assessed_count >= 0),
  add column partial_count integer not null default 0 check (partial_count >= 0),
  add column miss_count integer not null default 0 check (miss_count >= 0),
  add column first_assessed_at timestamptz,
  add column last_assessed_at timestamptz,
  add column first_assessed_material_id uuid,
  add column last_assessed_material_id uuid,
  add column review_due boolean not null default false,
  add column mastery_reason text,
  add column weakness_reason text,
  add column evidence_policy_version text not null default 'evidence-v1';
alter table public.child_communication_progress
  add column partial_count integer not null default 0 check (partial_count >= 0),
  add column first_assessed_at timestamptz,
  add column last_assessed_at timestamptz,
  add column first_assessed_material_id uuid,
  add column last_assessed_material_id uuid,
  add column review_due boolean not null default false,
  add column mastery_reason text,
  add column weakness_reason text,
  add column evidence_policy_version text not null default 'evidence-v1';

create index child_vocab_progress_review_idx on public.child_vocab_progress(child_id, review_due, status);
create index child_grammar_progress_review_idx on public.child_grammar_progress(child_id, review_due, status);
create index child_communication_progress_review_idx on public.child_communication_progress(child_id, review_due, status);

create function private.reject_student_library_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'student library rows are immutable';
end;
$$;
create trigger child_weekly_snapshots_immutable before update or delete on public.child_weekly_learning_snapshots
  for each row execute function private.reject_student_library_mutation();
create trigger child_learning_evidence_immutable before update or delete on public.child_learning_evidence
  for each row execute function private.reject_student_library_mutation();

create function private.protect_feedback_processing_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if tg_op = 'DELETE' then raise exception 'feedback processing revisions are immutable'; end if;
  if old.id <> new.id or old.feedback_id <> new.feedback_id or old.child_id <> new.child_id
     or old.material_id <> new.material_id or old.revision_fingerprint <> new.revision_fingerprint
     or old.processor_version <> new.processor_version or old.cutoff_classification <> new.cutoff_classification
     or old.sanitized_outcome <> new.sanitized_outcome or old.processed_at <> new.processed_at
     or old.created_at <> new.created_at or not (old.status = 'effective' and new.status = 'superseded') then
    raise exception 'feedback processing revision payload is immutable';
  end if;
  return new;
end;
$$;
create trigger feedback_processing_revision_immutable before update or delete on public.feedback_memory_processing
  for each row execute function private.protect_feedback_processing_revision();

create function private.sorted_distinct_text_array(p_value jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct value order by value) filter (where value <> ''), '{}'::text[])
  from jsonb_array_elements_text(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) as item(value)
$$;

-- Forward declaration; replaced below with the policy implementation.
create function private.refresh_child_target_progress(p_child_id uuid, p_target_type text, p_target_id text)
returns void language plpgsql security definer set search_path = '' as $$ begin return; end $$;

create function private.worker_record_weekly_snapshot(p_material_id uuid, p_backfilled_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  m public.materials; j public.generation_jobs; s jsonb; existing public.child_weekly_learning_snapshots;
  v_sequence integer; v_recorded timestamptz; v_id uuid; v_target_evidence jsonb; v_target text;
begin
  select * into m from public.materials where id = p_material_id for update;
  if m.id is null then raise exception 'material not found'; end if;
  select * into j from public.generation_jobs where material_id = m.id and status = 'completed' order by completed_at desc nulls last limit 1;
  if j.id is null then raise exception 'material is not completed'; end if;
  s := coalesce(m.canonical_source, '{}'::jsonb);
  v_recorded := coalesce(j.release_at, j.completed_at, m.created_at);
  select * into existing from public.child_weekly_learning_snapshots where material_id = m.id;
  select coalesce(jsonb_object_agg(x.target_id, x.checks), '{}'::jsonb) into v_target_evidence
  from (
    select q.target_id, jsonb_agg(jsonb_build_object('questionId', q.question_id, 'stage', q.stage) order by q.stage, q.question_id) checks
    from (
      select target.value target_id, question->>'id' question_id, stage->>'stage' stage
      from jsonb_array_elements(coalesce(s #> '{studentLesson,practice}', '[]')) stage
      cross join lateral jsonb_array_elements(coalesce(stage->'questions', '[]')) question
      cross join lateral jsonb_array_elements_text(coalesce(question->'targetIds', '[]')) target(value)
      union all
      select target.value, question->>'id', 'homework'
      from jsonb_array_elements(coalesce(s #> '{studentLesson,homework,questions}', '[]')) question
      cross join lateral jsonb_array_elements_text(coalesce(question->'targetIds', '[]')) target(value)
    ) q group by q.target_id
  ) x;
  if existing.id is not null then
    if existing.child_id is distinct from m.child_id or existing.material_week is distinct from m.material_week
      or existing.generation_job_id is distinct from j.id or existing.input_fingerprint is distinct from s #>> '{metadata,inputFingerprint}'
      or existing.schema_version is distinct from s #>> '{metadata,schemaVersion}'
      or existing.introduced_vocabulary_ids is distinct from private.sorted_distinct_text_array(s #> '{trackingDelta,introducedVocabularyIds}')
      or existing.reviewed_vocabulary_ids is distinct from private.sorted_distinct_text_array(s #> '{trackingDelta,reviewedVocabularyIds}')
      or existing.grammar_target_ids is distinct from private.sorted_distinct_text_array(s #> '{trackingDelta,exposedGrammarTargetIds}')
      or existing.communication_function_ids is distinct from private.sorted_distinct_text_array(s #> '{trackingDelta,exposedCommunicationFunctionIds}')
      or existing.measurable_targets is distinct from coalesce(s #> '{learningPlan,targets}', '[]')
      or existing.target_evidence is distinct from v_target_evidence
      or existing.recorded_at is distinct from v_recorded then
      raise exception 'conflicting canonical snapshot for material %', m.id;
    end if;
    return existing.id;
  end if;
  select count(*) + 1 into v_sequence from public.materials prior
  join public.generation_jobs prior_job on prior_job.material_id = prior.id and prior_job.status = 'completed'
  where prior.child_id = m.child_id and
    (coalesce(prior_job.release_at, prior_job.completed_at, prior.created_at), prior.id) < (v_recorded, m.id);
  if exists (select 1 from public.child_weekly_learning_snapshots where child_id = m.child_id and sequence_number >= v_sequence) then
    raise exception 'historical material must be backfilled in canonical order';
  end if;
  insert into public.child_weekly_learning_snapshots(
    child_id, material_id, sequence_number, material_week, generation_job_id, input_fingerprint,
    schema_version, curriculum_version, prompt_version, generator_version, model_id, reading_level, reading_signals,
    introduced_vocabulary_ids, reviewed_vocabulary_ids, grammar_target_ids, communication_function_ids,
    measurable_targets, target_evidence, assessment_opportunities, hypotheses, next_review_candidates,
    observed_mistakes, verified_strengths, verified_weaknesses, state_delta,
    personalization_evidence, improvement_evidence, recorded_at, backfilled_at
  ) values (
    m.child_id, m.id, v_sequence, m.material_week, j.id, s #>> '{metadata,inputFingerprint}',
    s #>> '{metadata,schemaVersion}', s #>> '{metadata,curriculumVersion}', m.prompt_version, m.generator_version, m.model_name,
    s #>> '{learnerSnapshot,readingLevel}', coalesce(s #> '{learnerSnapshot,readingSignals}', '{}'),
    private.sorted_distinct_text_array(s #> '{trackingDelta,introducedVocabularyIds}'),
    private.sorted_distinct_text_array(s #> '{trackingDelta,reviewedVocabularyIds}'),
    private.sorted_distinct_text_array(s #> '{trackingDelta,exposedGrammarTargetIds}'),
    private.sorted_distinct_text_array(s #> '{trackingDelta,exposedCommunicationFunctionIds}'),
    coalesce(s #> '{learningPlan,targets}', '[]'), v_target_evidence,
    coalesce(s #> '{trackingDelta,intendedAssessmentOpportunities}', '[]'),
    coalesce(s #> '{trackingDelta,hypothesesToVerify}', '[]'), coalesce(s #> '{trackingDelta,nextReviewCandidates}', '[]'),
    coalesce(s #> '{trackingDelta,observedMistakes}', '[]'), coalesce(s #> '{trackingDelta,verifiedStrengths}', '[]'),
    coalesce(s #> '{trackingDelta,verifiedWeaknesses}', '[]'), coalesce(s #> '{trackingDelta,stateDelta}', '{}'),
    coalesce(s #> '{qualityEvidence,feedbackApplied}', '[]'), coalesce(s #> '{qualityEvidence,improvementComparedToPrevious}', '[]'),
    v_recorded, p_backfilled_at
  ) returning id into v_id;
  foreach v_target in array private.sorted_distinct_text_array(s #> '{trackingDelta,introducedVocabularyIds}') || private.sorted_distinct_text_array(s #> '{trackingDelta,reviewedVocabularyIds}')
    loop perform private.refresh_child_target_progress(m.child_id,'vocabulary',v_target); end loop;
  foreach v_target in array private.sorted_distinct_text_array(s #> '{trackingDelta,exposedGrammarTargetIds}')
    loop perform private.refresh_child_target_progress(m.child_id,'grammar',v_target); end loop;
  foreach v_target in array private.sorted_distinct_text_array(s #> '{trackingDelta,exposedCommunicationFunctionIds}')
    loop perform private.refresh_child_target_progress(m.child_id,'communication',v_target); end loop;
  return v_id;
end;
$$;

create or replace function private.refresh_child_target_progress(p_child_id uuid, p_target_type text, p_target_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_exposures integer; v_last_exposed_at timestamptz; v_last_exposed_material uuid;
  v_assessed integer; v_correct integer; v_partial integer; v_miss integer;
  v_first timestamptz; v_last timestamptz; v_first_material uuid; v_last_material uuid;
  v_mastered_at timestamptz; v_later_miss boolean; v_status text; v_review boolean; v_mastery text; v_weakness text;
begin
  select count(*), max(recorded_at), (array_agg(material_id order by recorded_at desc, material_id desc))[1]
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
    select material_id, min(observed_at) observed_at from public.child_learning_evidence e
    left join public.feedback_memory_processing p on p.id=e.feedback_processing_id
    where e.child_id=p_child_id and e.target_type=p_target_type and e.target_id=p_target_id
      and e.assessed and e.result='correct' and (e.feedback_processing_id is null or p.status='effective') group by material_id
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

create function private.record_snapshot_after_observations() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.observations_recorded_at is null and new.observations_recorded_at is not null then
    perform private.worker_record_weekly_snapshot(new.id,null);
  end if;
  return new;
end $$;
create trigger record_snapshot_after_observations after update of observations_recorded_at on public.materials
  for each row execute function private.record_snapshot_after_observations();

create function private.process_feedback_memory(p_feedback_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare f public.feedback; fp text; oldp public.feedback_memory_processing; pid uuid; outcome jsonb; result_value text; observed timestamptz;
begin
  select * into f from public.feedback where id=p_feedback_id for update;
  if f.id is null then raise exception 'feedback not found'; end if;
  fp := encode(extensions.digest(convert_to(jsonb_build_object('difficulty',f.difficulty,'completionRate',f.completion_rate,'weakArea',f.weak_area,'mistakes',coalesce(f.mistakes_text,''),'childComments',coalesce(f.child_comments,''),'parentComments',coalesce(f.parent_comments,''))::text,'utf8'),'sha256'),'hex');
  select * into oldp from public.feedback_memory_processing where feedback_id=f.id and status='effective' for update;
  if oldp.revision_fingerprint=fp then return oldp.id; end if;
  if oldp.id is not null then update public.feedback_memory_processing set status='superseded' where id=oldp.id; end if;
  outcome:=jsonb_build_object('hasStructuredWeakArea',f.weak_area is not null,'hasLearnerResult',f.weak_area is not null and f.weak_area<>'none');
  insert into public.feedback_memory_processing(feedback_id,child_id,material_id,revision_fingerprint,processor_version,status,cutoff_classification,sanitized_outcome)
  values(f.id,f.child_id,f.material_id,fp,'feedback-memory-v1','effective','current',outcome) returning id into pid;
  observed:=coalesce(f.updated_at,f.created_at);
  if f.weak_area in ('vocabulary','grammar','reading') then
    result_value:=case when f.weak_area='reading' and f.completion_rate=0 then 'incorrect' else 'unknown' end;
    if f.weak_area='reading' then
      insert into public.child_learning_evidence(child_id,material_id,feedback_id,feedback_processing_id,target_type,target_id,evidence_type,result,assessed,source,evidence_strength,observed_at,processor_version,idempotency_key)
      values(f.child_id,f.material_id,f.id,pid,'reading',null,'structured_parent_observation',result_value,result_value='incorrect','feedback.weak_area','broad',observed,'feedback-memory-v1',pid||':reading:wide:'||result_value);
    end if;
  end if;
  return pid;
end;
$$;

create function private.feedback_memory_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.process_feedback_memory(new.id); return new; end $$;
create trigger process_feedback_memory_after_write after insert or update of difficulty,completion_rate,weak_area,mistakes_text,child_comments,parent_comments
  on public.feedback for each row execute function private.feedback_memory_trigger();

create function public.worker_backfill_student_library(p_child_id uuid default null,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m record; scanned integer:=0; created integer:=0; existing integer:=0; processed integer:=0; before_id uuid; feedback_count integer;
begin
  if p_limit < 1 or p_limit > 1000 then raise exception 'limit must be between 1 and 1000'; end if;
  for m in select material.id from public.materials material join public.generation_jobs job on job.material_id=material.id and job.status='completed'
    where (p_child_id is null or material.child_id=p_child_id)
    order by coalesce(job.release_at,job.completed_at,material.created_at),material.id limit p_limit for update of material skip locked
  loop
    scanned:=scanned+1; select id into before_id from public.child_weekly_learning_snapshots where material_id=m.id;
    perform private.worker_record_weekly_snapshot(m.id,now()); if before_id is null then created:=created+1; else existing:=existing+1; end if;
    perform private.process_feedback_memory(f.id) from public.feedback f where f.material_id=m.id;
    select count(*) into feedback_count from public.feedback f where f.material_id=m.id;
    processed:=processed+feedback_count;
  end loop;
  return jsonb_build_object('scanned',scanned,'created',created,'existing',existing,'feedbackRevisionsProcessed',processed,'conflicts',0);
end;
$$;

create function public.parent_child_learning_timeline(p_child_id uuid,p_before_sequence integer default null,p_limit integer default 10)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.children c where c.id=p_child_id and c.parent_id=auth.uid()) then raise exception 'child not owned'; end if;
  select coalesce(jsonb_agg(row_value order by sequence_number desc),'[]') into result from (
    select s.sequence_number,jsonb_build_object('sequenceNumber',s.sequence_number,'recordedAt',s.recorded_at,'readingTrajectory',coalesce(s.reading_level,'尚待觀察'),
      'introducedCount',cardinality(s.introduced_vocabulary_ids),'reviewedCount',cardinality(s.reviewed_vocabulary_ids),
      'introducedLabels',to_jsonb(s.introduced_vocabulary_ids),'reviewedLabels',to_jsonb(s.reviewed_vocabulary_ids),
      'difficulties',s.verified_weaknesses,'improvements',s.improvement_evidence,'nextReviewReasons',s.next_review_candidates) row_value
    from public.child_weekly_learning_snapshots s where s.child_id=p_child_id and (p_before_sequence is null or s.sequence_number<p_before_sequence)
    order by s.sequence_number desc limit greatest(1,least(coalesce(p_limit,10),25))
  ) page;
  return result;
end;
$$;

create function public.parent_child_learning_summary(p_child_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.children c where c.id=p_child_id and c.parent_id=auth.uid()) then raise exception 'child not owned'; end if;
  select jsonb_build_object('totalWeeks',(select count(*) from public.child_weekly_learning_snapshots where child_id=p_child_id),
    'vocabulary',jsonb_build_object('exposed',count(*),'learning',count(*) filter(where status in('new','learning')),'evidenceMastered',count(*) filter(where status='mastered'),'reviewing',count(*) filter(where status='reviewing')),
    'grammar',(select jsonb_build_object('exposed',count(*),'learning',count(*) filter(where status in('new','learning')),'evidenceMastered',count(*) filter(where status='mastered'),'reviewing',count(*) filter(where status='reviewing')) from public.child_grammar_progress where child_id=p_child_id),
    'communication',(select jsonb_build_object('exposed',count(*),'learning',count(*) filter(where status in('new','learning')),'evidenceMastered',count(*) filter(where status='mastered'),'reviewing',count(*) filter(where status='reviewing')) from public.child_communication_progress where child_id=p_child_id),
    'readingTrajectory',coalesce((select jsonb_build_object('label',coalesce(reading_level,'尚待觀察')) from public.child_weekly_learning_snapshots where child_id=p_child_id order by sequence_number desc limit 1),'{}'),
    'persistentWeakAreas',coalesce((select jsonb_agg(jsonb_build_object('type','vocabulary','targetId',vocabulary_id,'reason',weakness_reason)) from public.child_vocab_progress where child_id=p_child_id and review_due),'[]'),
    'recentImprovements',coalesce((select improvement_evidence from public.child_weekly_learning_snapshots where child_id=p_child_id order by sequence_number desc limit 1),'[]'),
    'masteryEvidenceExplanation','有明確證據的掌握，需來自至少兩份不同教材、間隔至少七天的兩次答對紀錄；只讀過或完成教材不代表已掌握。')
  into result from public.child_vocab_progress where child_id=p_child_id;
  return result;
end;
$$;

alter function public.worker_generation_context(uuid,text) rename to worker_generation_context_before_student_library;
create function public.worker_generation_context(job_id uuid,worker_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb; child_value uuid; lifetime jsonb; older jsonb;
begin
  base:=public.worker_generation_context_before_student_library(job_id,worker_id);
  select child_id into child_value from public.generation_jobs where id=job_id;
  select jsonb_build_object(
    'vocabulary',jsonb_build_object('total',count(*),'dueTargetIds',coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter(where review_due),'[]'),'verifiedWeakTargetIds',coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter(where weakness_reason is not null),'[]'),'uncertainTargetIds',coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter(where status in('new','learning')),'[]'),'masteredTargetIds',coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter(where status='mastered'),'[]'),'regressionTargetIds',coalesce(jsonb_agg(vocabulary_id order by vocabulary_id) filter(where weakness_reason='regression_after_mastery'),'[]')),
    'grammar',(select jsonb_build_object('total',count(*),'dueTargetIds',coalesce(jsonb_agg(grammar_id order by grammar_id) filter(where review_due),'[]'),'verifiedWeakTargetIds',coalesce(jsonb_agg(grammar_id order by grammar_id) filter(where weakness_reason is not null),'[]'),'uncertainTargetIds',coalesce(jsonb_agg(grammar_id order by grammar_id) filter(where status in('new','learning')),'[]'),'masteredTargetIds',coalesce(jsonb_agg(grammar_id order by grammar_id) filter(where status='mastered'),'[]'),'regressionTargetIds',coalesce(jsonb_agg(grammar_id order by grammar_id) filter(where weakness_reason='regression_after_mastery'),'[]')) from public.child_grammar_progress where child_id=child_value),
    'communication',(select jsonb_build_object('total',count(*),'dueTargetIds',coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter(where review_due),'[]'),'verifiedWeakTargetIds',coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter(where weakness_reason is not null),'[]'),'uncertainTargetIds',coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter(where status in('new','learning')),'[]'),'masteredTargetIds',coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter(where status='mastered'),'[]'),'regressionTargetIds',coalesce(jsonb_agg(communication_function_id order by communication_function_id) filter(where weakness_reason='regression_after_mastery'),'[]')) from public.child_communication_progress where child_id=child_value)
  ) into lifetime from public.child_vocab_progress where child_id=child_value;
  select coalesce(jsonb_agg(jsonb_build_object('targetType',target_type,'targetId',target_id,'result',result,'observedAt',observed_at) order by observed_at desc),'[]') into older
  from (select e.* from public.child_learning_evidence e left join public.feedback_memory_processing p on p.id=e.feedback_processing_id
    where e.child_id=child_value and (e.feedback_processing_id is null or p.status='effective') and (e.result='incorrect' or e.result='partial') order by e.observed_at desc limit 40) evidence;
  return base || jsonb_build_object('lifetimeLearningMemory',lifetime,'targetedOlderEvidence',older,'memoryPolicyVersion','evidence-v1');
end $$;

alter table public.child_weekly_learning_snapshots enable row level security;
alter table public.feedback_memory_processing enable row level security;
alter table public.child_learning_evidence enable row level security;
create policy child_weekly_snapshots_owner_select on public.child_weekly_learning_snapshots for select to authenticated using(exists(select 1 from public.children c where c.id=child_id and c.parent_id=auth.uid()));
create policy feedback_memory_processing_owner_select on public.feedback_memory_processing for select to authenticated using(exists(select 1 from public.children c where c.id=child_id and c.parent_id=auth.uid()));
create policy child_learning_evidence_owner_select on public.child_learning_evidence for select to authenticated using(exists(select 1 from public.children c where c.id=child_id and c.parent_id=auth.uid()));
grant select on public.child_weekly_learning_snapshots,public.feedback_memory_processing,public.child_learning_evidence to authenticated;
revoke insert,update,delete on public.child_weekly_learning_snapshots,public.feedback_memory_processing,public.child_learning_evidence from public,anon,authenticated;
revoke all on function private.worker_record_weekly_snapshot(uuid,timestamptz),private.refresh_child_target_progress(uuid,text,text),private.process_feedback_memory(uuid),public.worker_backfill_student_library(uuid,integer) from public,anon,authenticated;
grant execute on function private.worker_record_weekly_snapshot(uuid,timestamptz),private.refresh_child_target_progress(uuid,text,text),private.process_feedback_memory(uuid),public.worker_backfill_student_library(uuid,integer) to service_role;
revoke all on function public.worker_generation_context_before_student_library(uuid,text),public.worker_generation_context(uuid,text) from public,anon,authenticated;
grant execute on function public.worker_generation_context_before_student_library(uuid,text),public.worker_generation_context(uuid,text) to service_role;
revoke all on function public.parent_child_learning_timeline(uuid,integer,integer),public.parent_child_learning_summary(uuid) from public,anon;
grant execute on function public.parent_child_learning_timeline(uuid,integer,integer),public.parent_child_learning_summary(uuid) to authenticated;
