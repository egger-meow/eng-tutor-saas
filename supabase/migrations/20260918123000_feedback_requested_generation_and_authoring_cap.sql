-- P0: one authoring invocation claims at most ten jobs in either lane.
update public.operational_settings
set integer_value = 10,
    description = 'Maximum jobs claimed by one authoring invocation.',
    updated_at = now()
where key = 'daily_generation_limit';

do $migration$
declare definition text; patched text;
begin
  definition := pg_get_functiondef('private_generation.claim_due_generation_jobs(text)'::regprocedure);
  patched := replace(definition,
    '    for update of job skip locked' || chr(10) || '  ), normal as materialized (',
    '    for update of job skip locked' || chr(10) || '    limit claim_limit' || chr(10) || '  ), normal as materialized (');
  if patched = definition then raise exception 'normal authoring claim definition drifted'; end if;
  execute patched;

  definition := pg_get_functiondef('private_generation.claim_week1_fast_generation_jobs(text)'::regprocedure);
  patched := replace(definition, '    limit 15', '    limit 10');
  if patched = definition then raise exception 'Week 1 authoring claim definition drifted'; end if;
  execute patched;
end
$migration$;

-- P2: an owner feedback request is the sole authority for Week 2+ jobs.
create table public.material_generation_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  source_material_id uuid not null,
  generation_job_id uuid references public.generation_jobs(id) on delete restrict,
  service_period_start timestamptz not null,
  service_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  unique (child_id, source_material_id),
  foreign key (source_material_id, child_id) references public.materials(id, child_id) on delete restrict
);

alter table public.material_generation_requests enable row level security;
create policy material_generation_requests_owner_select on public.material_generation_requests
for select to authenticated using (exists (
  select 1 from public.children child
  where child.id = child_id and child.parent_id = (select auth.uid())
));

create or replace function private_generation.require_feedback_request_for_followup_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_material_id is null then return new; end if;
  if exists (
    select 1 from public.material_generation_requests request
    where request.child_id = new.child_id and request.source_material_id = new.source_material_id
  ) then return new; end if;
  if exists (select 1 from public.children child where child.id = new.child_id and child.is_internal_test)
     or exists (select 1 from public.generation_test_mode_sessions session where session.child_id = new.child_id and session.is_enabled)
  then return new; end if;
  -- Completion and billing code use the legacy child:date:r1 key. Suppress
  -- only that automatic cadence insert so audited manual recovery remains possible.
  if new.idempotency_key ~ '^[0-9a-f-]+:[0-9]{4}-[0-9]{2}-[0-9]{2}:r1$' then return null; end if;
  return new;
end
$$;
create trigger generation_jobs_require_feedback_request
before insert on public.generation_jobs for each row
execute function private_generation.require_feedback_request_for_followup_job();

create or replace function private_generation.clear_unscheduled_next_generation_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.next_generation_at is not null and not exists (
    select 1 from public.generation_jobs job
    where job.child_id = new.id and job.status in ('pending', 'claimed')
      and (job.source_material_id is null or exists (
        select 1 from public.material_generation_requests request
        where request.child_id = job.child_id and request.source_material_id = job.source_material_id
      ))
  ) then new.next_generation_at := null; end if;
  return new;
end
$$;
create trigger children_clear_unscheduled_next_generation_at
before update of next_generation_at on public.children for each row
execute function private_generation.clear_unscheduled_next_generation_at();

-- Preserve claimed/submitted work, but stop untouched legacy follow-up jobs from
-- entering the new policy without a parent request.
update public.generation_jobs job
set status = 'canceled', error_code = 'SUPERSEDED_BY_FEEDBACK_REQUEST_POLICY',
    error_message = 'Automatic weekly follow-up replaced by parent feedback request.', updated_at = now()
where job.source_material_id is not null and job.status = 'pending'
  and not exists (select 1 from private_generation.curriculum_submissions submission where submission.job_id = job.id);

create or replace function public.submit_feedback_and_request_next_material(
  p_child_id uuid,
  p_material_id uuid,
  p_difficulty smallint,
  p_completion_rate integer,
  p_weak_area text,
  p_mistakes_text text,
  p_child_comments text,
  p_parent_comments text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child public.children%rowtype;
  v_material public.materials%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_used integer;
  v_job_id uuid;
begin
  select * into v_child from public.children
  where id = p_child_id and parent_id = (select auth.uid()) and is_active for update;
  if v_child.id is null then raise exception 'active owned child not found'; end if;
  select * into v_material from public.materials where id = p_material_id and child_id = p_child_id;
  if v_material.id is null then raise exception 'owned source material not found'; end if;

  if not exists (
    select 1 from public.subscriptions subscription
    where subscription.child_id = p_child_id and subscription.status in ('trialing', 'active')
      and (subscription.current_period_end is null or subscription.current_period_end > now())
  ) and not exists (
    select 1 from private_generation.historical_pilot_admissions admission
    join public.enrollment_settings settings on settings.key = 'default'
    where admission.child_id = p_child_id and settings.free_pilot_ended_at is null
      and coalesce(settings.free_pilot_enabled, true)
  ) then raise exception 'active service entitlement required'; end if;

  insert into public.feedback (child_id, material_id, difficulty, completion_rate, weak_area, mistakes_text, child_comments, parent_comments)
  values (p_child_id, p_material_id, p_difficulty, p_completion_rate, nullif(p_weak_area, ''), nullif(trim(p_mistakes_text), ''), nullif(trim(p_child_comments), ''), nullif(trim(p_parent_comments), ''))
  on conflict (child_id, material_id) do update set
    difficulty = excluded.difficulty, completion_rate = excluded.completion_rate,
    weak_area = excluded.weak_area, mistakes_text = excluded.mistakes_text,
    child_comments = excluded.child_comments, parent_comments = excluded.parent_comments;

  if coalesce(p_completion_rate, 0) = 0 then
    return jsonb_build_object('feedbackSaved', true, 'requested', false, 'reason', 'NOT_STARTED');
  end if;

  -- Service months are anchored to the child's activation date.
  v_period_start := v_child.created_at +
    make_interval(months => greatest(0, (extract(year from age(now(), v_child.created_at))::integer * 12) + extract(month from age(now(), v_child.created_at))::integer));
  v_period_end := v_period_start + interval '1 month';

  select count(*) into v_used from public.materials
  where child_id = p_child_id and created_at >= v_period_start and created_at < v_period_end;
  select v_used + count(*) into v_used from public.material_generation_requests request
  join public.generation_jobs job on job.id = request.generation_job_id
  where request.child_id = p_child_id and request.created_at >= v_period_start and request.created_at < v_period_end
    and job.material_id is null and job.status not in ('canceled', 'failed');

  if v_used >= 4 then
    return jsonb_build_object('feedbackSaved', true, 'requested', false, 'reason', 'MONTHLY_LIMIT', 'used', v_used, 'limit', 4, 'resetsAt', v_period_end);
  end if;

  insert into public.material_generation_requests(child_id, source_material_id, service_period_start, service_period_end)
  values (p_child_id, p_material_id, v_period_start, v_period_end)
  on conflict (child_id, source_material_id) do nothing;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status, scheduled_for,
    source_material_id, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    p_child_id, (now() at time zone coalesce(v_child.timezone, 'Asia/Taipei'))::date,
    v_material.rule_version, p_child_id::text || ':' || p_material_id::text || ':feedback-next',
    'pending', now(), p_material_id, now() + interval '24 hours', now() - interval '24 hours', now()
  ) on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into v_job_id;

  update public.material_generation_requests set generation_job_id = v_job_id
  where child_id = p_child_id and source_material_id = p_material_id and generation_job_id is null;

  update public.children set next_generation_at = now() where id = p_child_id;
  return jsonb_build_object('feedbackSaved', true, 'requested', true, 'jobId', v_job_id, 'used', v_used + 1, 'limit', 4, 'resetsAt', v_period_end);
end
$$;

revoke all on function public.submit_feedback_and_request_next_material(uuid,uuid,smallint,integer,text,text,text,text) from public, anon;
grant execute on function public.submit_feedback_and_request_next_material(uuid,uuid,smallint,integer,text,text,text,text) to authenticated, service_role;
