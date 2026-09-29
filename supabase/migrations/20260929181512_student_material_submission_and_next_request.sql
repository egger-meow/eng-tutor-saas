-- S2: immutable student submission, server-side objective grading, optional feedback.
-- Preserve historical paper answer access; new materials unlock parent answers after submission.
alter table public.materials add column answer_unlock_requires_submission boolean not null default true;
update public.materials set answer_unlock_requires_submission = false;

create table public.student_material_submissions (
  material_id uuid primary key references public.materials(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete restrict,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  self_check jsonb not null check (jsonb_typeof(self_check) = 'array'),
  results jsonb not null check (jsonb_typeof(results) = 'array'),
  submitted_at timestamptz not null default now()
);
create index on public.student_material_submissions(child_id, submitted_at desc);
alter table public.student_material_submissions enable row level security;
revoke all on public.student_material_submissions from public, anon, authenticated;

-- A submitted packet can authorize the next job even if parent feedback is skipped.
create or replace function private_generation.require_feedback_request_for_followup_job()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_feedback_at timestamptz; v_submission_at timestamptz;
begin
  if new.source_material_id is null then return new; end if;
  if exists(select 1 from public.material_generation_requests r
    where r.child_id=new.child_id and r.source_material_id=new.source_material_id) then
    select created_at into v_feedback_at from public.feedback
      where child_id=new.child_id and material_id=new.source_material_id;
    select submitted_at into v_submission_at from public.student_material_submissions
      where child_id=new.child_id and material_id=new.source_material_id;
    if v_feedback_at is null and v_submission_at is null then
      raise exception 'REQUEST_SOURCE_CONTEXT_MISSING';
    end if;
    if new.feedback_cutoff_at is null or
      (v_feedback_at is not null and v_feedback_at > new.feedback_cutoff_at) or
      (v_submission_at is not null and v_submission_at > new.feedback_cutoff_at) then
      raise exception 'REQUEST_SOURCE_CONTEXT_EXCLUDED';
    end if;
    return new;
  end if;
  if exists(select 1 from public.children c where c.id=new.child_id and c.is_internal_test)
    or exists(select 1 from public.generation_test_mode_sessions s
      where s.child_id=new.child_id and s.is_enabled) then return new; end if;
  if new.idempotency_key ~ '^[0-9a-f-]+:[0-9]{4}-[0-9]{2}-[0-9]{2}:r1$' then return null; end if;
  return new;
end $$;

create or replace function private_generation.prevent_submitted_draft_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.student_material_submissions where material_id=new.material_id) then
    raise exception 'MATERIAL_ALREADY_SUBMITTED';
  end if;
  return new;
end $$;
create trigger prevent_submitted_draft_change before insert or update on public.student_material_drafts
for each row execute function private_generation.prevent_submitted_draft_change();

create or replace function public.get_student_material_submission(p_material_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_submission public.student_material_submissions%rowtype;
begin
  select s.* into v_submission from public.student_material_submissions s
  join public.children c on c.id = s.child_id and c.parent_id = (select auth.uid())
  where s.material_id = p_material_id;
  if not found then return null; end if;
  return jsonb_build_object('submitted_at', v_submission.submitted_at,
    'answers', v_submission.answers, 'self_check', v_submission.self_check,
    'results', v_submission.results,
    'next_requested', exists(select 1 from public.material_generation_requests r
      where r.child_id=v_submission.child_id and r.source_material_id=p_material_id));
end $$;

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
    if v_response is not null and jsonb_typeof(v_options) = 'array' and jsonb_array_length(v_options) between 2 and 6 then
      select a.value->>'answer' into v_expected
      from jsonb_array_elements(coalesce(v_material.canonical_source->'answers', '[]'::jsonb)) a
      where a.value->>'questionId' = v_id limit 1;
      -- Only exact option text or a standalone option letter can be scored.
      if v_expected is not null then
        v_expected_letter := null;
        v_response_letter := null;
        select chr((64 + o.ordinality)::integer)::text into v_expected_letter
        from jsonb_array_elements_text(v_options) with ordinality o(value, ordinality)
        where lower(trim(o.value)) = lower(trim(v_expected)) limit 1;
        if v_expected_letter is null and upper(trim(v_expected)) ~ '^[A-F][.)]?$' then
          v_expected_letter := left(upper(trim(v_expected)), 1);
        end if;
        if v_expected_letter is null and upper(trim(v_expected)) ~ '^[A-F][.)][[:space:]]+' then
          select chr((64 + o.ordinality)::integer)::text into v_expected_letter
          from jsonb_array_elements_text(v_options) with ordinality o(value, ordinality)
          where o.ordinality = ascii(left(upper(trim(v_expected)), 1)) - 64
            and lower(trim(o.value)) = lower(trim(regexp_replace(v_expected, '^[[:space:]]*[A-F][.)][[:space:]]+', '')))
          limit 1;
        end if;
        if v_expected_letter is null and upper(trim(v_expected)) ~ '^[A-F][.)][[:space:]]+' then
          select chr((64 + o.ordinality)::integer)::text into v_expected_letter
          from jsonb_array_elements_text(v_options) with ordinality o(value, ordinality)
          where o.ordinality = ascii(left(upper(trim(v_expected)), 1)) - 64
            and lower(trim(o.value)) = lower(trim(regexp_replace(v_expected, '^[[:space:]]*[A-F][.)][[:space:]]+', '')))
          limit 1;
        end if;
        select chr((64 + o.ordinality)::integer)::text into v_response_letter
        from jsonb_array_elements_text(v_options) with ordinality o(value, ordinality)
        where lower(trim(o.value)) = lower(trim(v_response)) limit 1;
        if v_response_letter is null and upper(trim(v_response)) ~ '^[A-F]$' then
          v_response_letter := upper(trim(v_response));
        end if;
        if v_expected_letter is not null then
          v_result := case when v_response_letter = v_expected_letter then 'correct' else 'incorrect' end;
        end if;
      end if;
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'question_id', v_id, 'status', v_result,
      'correct_answer', case when v_result in ('correct','incorrect') then v_expected else null end));
  end loop;

  insert into public.student_material_submissions(material_id, child_id, answers, self_check, results)
  values (p_material_id, v_material.child_id, coalesce(v_draft.answers, '{}'::jsonb),
    coalesce(v_draft.self_check, '[]'::jsonb), v_results);
  return public.get_student_material_submission(p_material_id);
end $$;

create or replace function public.save_student_parent_feedback(
  p_material_id uuid, p_difficulty smallint, p_completion_rate integer,
  p_weak_area text, p_mistakes_text text, p_child_comments text, p_parent_comments text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_child_id uuid;
begin
  select s.child_id into v_child_id from public.student_material_submissions s
  join public.children c on c.id = s.child_id and c.parent_id = (select auth.uid())
  where s.material_id = p_material_id;
  if v_child_id is null then raise exception 'SUBMISSION_NOT_FOUND'; end if;
  if p_difficulty is null or p_difficulty not in (1,3,5)
    or p_completion_rate is null or p_completion_rate not in (0,25,50,75,100) then
    raise exception 'INVALID_FEEDBACK'; end if;
  insert into public.feedback(child_id,material_id,difficulty,completion_rate,weak_area,mistakes_text,child_comments,parent_comments)
  values (v_child_id,p_material_id,p_difficulty,p_completion_rate,nullif(p_weak_area,''),
    nullif(trim(p_mistakes_text),''),nullif(trim(p_child_comments),''),nullif(trim(p_parent_comments),''))
  on conflict(child_id,material_id) do update set difficulty=excluded.difficulty,
    completion_rate=excluded.completion_rate,weak_area=excluded.weak_area,
    mistakes_text=excluded.mistakes_text,child_comments=excluded.child_comments,
    parent_comments=excluded.parent_comments;
  return true;
end $$;

create or replace function public.request_next_after_student_submission(p_material_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child public.children%rowtype;
  v_material public.materials%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_used integer;
  v_job_id uuid;
begin
  select c.* into v_child from public.student_material_submissions s
  join public.children c on c.id = s.child_id and c.parent_id = (select auth.uid()) and c.is_active
  where s.material_id = p_material_id for update of c;
  if not found then raise exception 'SUBMISSION_NOT_FOUND'; end if;
  select * into v_material from public.materials where id=p_material_id and child_id=v_child.id;
  if exists(select 1 from public.material_generation_requests where child_id=v_child.id and source_material_id=p_material_id) then
    return jsonb_build_object('requested',true,'alreadyRequested',true);
  end if;
  if not exists(select 1 from public.subscriptions sub where sub.child_id=v_child.id
    and sub.status in ('trialing','active') and (sub.current_period_end is null or sub.current_period_end>now()))
    and not exists(select 1 from private_generation.historical_pilot_admissions a
      join public.enrollment_settings e on e.key='default'
      where a.child_id=v_child.id and e.free_pilot_ended_at is null and coalesce(e.free_pilot_enabled,true))
  then raise exception 'ACTIVE_ENTITLEMENT_REQUIRED'; end if;
  v_start := v_child.created_at + make_interval(months => greatest(0,
    extract(year from age(now(),v_child.created_at))::integer*12 + extract(month from age(now(),v_child.created_at))::integer));
  v_end := v_start + interval '1 month';
  select count(*) into v_used from public.materials
    where child_id=v_child.id and created_at>=v_start and created_at<v_end;
  select v_used+count(*) into v_used from public.material_generation_requests r
  join public.generation_jobs j on j.id=r.generation_job_id
  where r.child_id=v_child.id and r.created_at>=v_start and r.created_at<v_end
    and j.material_id is null and j.status not in ('canceled','failed');
  if v_used>=4 then return jsonb_build_object('requested',false,'reason','MONTHLY_LIMIT','used',v_used,'limit',4,'resetsAt',v_end); end if;
  insert into public.material_generation_requests(child_id,source_material_id,service_period_start,service_period_end)
  values(v_child.id,p_material_id,v_start,v_end);
  insert into public.generation_jobs(child_id,material_week,rule_version,idempotency_key,status,scheduled_for,
    source_material_id,release_at,feedback_cutoff_at,generation_due_at)
  values(v_child.id,(now() at time zone coalesce(v_child.timezone,'Asia/Taipei'))::date,v_material.rule_version,
    v_child.id::text||':'||p_material_id::text||':feedback-next','pending',now(),p_material_id,
    now()+interval '24 hours',now(),now())
  returning id into v_job_id;
  update public.material_generation_requests set generation_job_id=v_job_id
  where child_id=v_child.id and source_material_id=p_material_id;
  update public.children set next_generation_at=now() where id=v_child.id;
  return jsonb_build_object('requested',true,'jobId',v_job_id,'used',v_used+1,'limit',4,'resetsAt',v_end);
end $$;

revoke all on function public.get_student_material_submission(uuid) from public,anon;
revoke all on function public.submit_student_material(uuid,integer) from public,anon;
revoke all on function public.save_student_parent_feedback(uuid,smallint,integer,text,text,text,text) from public,anon;
revoke all on function public.request_next_after_student_submission(uuid) from public,anon;
grant execute on function public.get_student_material_submission(uuid) to authenticated;
grant execute on function public.submit_student_material(uuid,integer) to authenticated;
grant execute on function public.save_student_parent_feedback(uuid,smallint,integer,text,text,text,text) to authenticated;
grant execute on function public.request_next_after_student_submission(uuid) to authenticated;

create or replace function public.can_open_parent_answer(p_material_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.materials m
    join public.children c on c.id=m.child_id and c.parent_id=(select auth.uid())
    join public.generation_jobs j on j.material_id=m.id and j.child_id=c.id
    where m.id=p_material_id and j.status='completed' and j.completed_at is not null
      and j.release_at<=now() and (not m.answer_unlock_requires_submission or exists (
        select 1 from public.student_material_submissions s where s.material_id=m.id and s.child_id=c.id
      ))
  );
$$;
revoke all on function public.can_open_parent_answer(uuid) from public,anon;
grant execute on function public.can_open_parent_answer(uuid) to authenticated;

drop policy if exists weekly_materials_owner_select on storage.objects;
create policy weekly_materials_owner_select on storage.objects for select to authenticated
using (
  bucket_id='weekly-materials' and exists (
    select 1 from public.materials m
    join public.generation_jobs j on j.material_id=m.id and j.child_id=m.child_id
    join public.children c on c.id=m.child_id and c.parent_id=(select auth.uid())
    where (storage.foldername(storage.objects.name))[1]=c.id::text
      and (m.student_pdf_path=storage.objects.name
        or (m.parent_answer_pdf_path=storage.objects.name and public.can_open_parent_answer(m.id)))
      and j.status='completed' and j.completed_at is not null and j.release_at<=now()
  )
);
