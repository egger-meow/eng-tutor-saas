-- P2 Robustness Repairs:
-- 1. Drop unused, retired assessment client items view to eliminate anonymous question-bank access
-- 2. Repair month-end quota boundary derivation and ensure [start, end) contains now()
-- 3. Count logical deliveries and exclude corrective revisions in material request RPCs
-- 4. Disambiguate replacement jobs from next-packet personalization in follow-up trigger
-- 5. Resolve repaired/cached PDF artifacts in resolve_material_email_access

-- ---------------------------------------------------------------------------
-- 1. Assessment View Boundary
-- ---------------------------------------------------------------------------
drop view if exists public.assessment_client_items cascade;

-- ---------------------------------------------------------------------------
-- 2 & 4. Follow-up Job Trigger: Distinguish Replacement Jobs
-- ---------------------------------------------------------------------------
create or replace function private_generation.require_feedback_request_for_followup_job()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_feedback_at timestamptz; v_submission_at timestamptz;
begin
  if new.source_material_id is null then return new; end if;
  -- Replacement jobs regenerate the same week's material and are not follow-up next-packet jobs
  if new.idempotency_key like 'quality-replacement:%' then return new; end if;
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

-- ---------------------------------------------------------------------------
-- 3. Request Next After Student Submission (Quota Boundaries & Logical Revision Counting)
-- ---------------------------------------------------------------------------
create or replace function public.request_next_after_student_submission(p_material_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child public.children%rowtype;
  v_material public.materials%rowtype;
  v_months integer;
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

  -- Derive service boundaries from activation anchor and ensure half-open interval contains now()
  v_months := greatest(0,
    (extract(year from age(now(), v_child.created_at))::integer * 12) +
    extract(month from age(now(), v_child.created_at))::integer
  );
  v_start := v_child.created_at + make_interval(months => v_months);
  v_end := v_child.created_at + make_interval(months => v_months + 1);

  while now() >= v_end loop
    v_months := v_months + 1;
    v_start := v_child.created_at + make_interval(months => v_months);
    v_end := v_child.created_at + make_interval(months => v_months + 1);
  end loop;

  while now() < v_start and v_months > 0 loop
    v_months := v_months - 1;
    v_start := v_child.created_at + make_interval(months => v_months);
    v_end := v_child.created_at + make_interval(months => v_months + 1);
  end loop;

  -- Count logical deliveries in this period, excluding corrective revisions
  select count(distinct m.material_week) into v_used from public.materials m
  where m.child_id = v_child.id
    and m.created_at >= v_start and m.created_at < v_end
    and m.revision = 1
    and not exists (
      select 1 from private_generation.material_replacement_jobs rep
      where rep.completed_material_id = m.id
    );

  -- Count in-flight generation requests for this period, excluding replacement jobs
  select v_used + count(distinct r.source_material_id) into v_used
  from public.material_generation_requests r
  join public.generation_jobs j on j.id = r.generation_job_id
  where r.child_id = v_child.id
    and r.created_at >= v_start and r.created_at < v_end
    and j.material_id is null
    and j.status not in ('canceled', 'failed')
    and not (j.idempotency_key like 'quality-replacement:%');

  if v_used >= 4 then
    return jsonb_build_object('requested',false,'reason','MONTHLY_LIMIT','used',v_used,'limit',4,'resetsAt',v_end);
  end if;

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

-- ---------------------------------------------------------------------------
-- 3b. Submit Feedback and Request Next Material (Legacy Request Path Quota Repair)
-- ---------------------------------------------------------------------------
create or replace function public.submit_feedback_and_request_next_material(
  p_child_id uuid,
  p_material_id uuid,
  p_difficulty smallint,
  p_completion_rate integer,
  p_weak_area text default null,
  p_mistakes_text text default null,
  p_child_comments text default null,
  p_parent_comments text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.children%rowtype;
  v_material public.materials%rowtype;
  v_months integer;
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

  -- Service months are anchored to the child's activation date with clamped interval protection
  v_months := greatest(0,
    (extract(year from age(now(), v_child.created_at))::integer * 12) +
    extract(month from age(now(), v_child.created_at))::integer
  );
  v_period_start := v_child.created_at + make_interval(months => v_months);
  v_period_end := v_child.created_at + make_interval(months => v_months + 1);

  while now() >= v_period_end loop
    v_months := v_months + 1;
    v_period_start := v_child.created_at + make_interval(months => v_months);
    v_period_end := v_child.created_at + make_interval(months => v_months + 1);
  end loop;

  while now() < v_period_start and v_months > 0 loop
    v_months := v_months - 1;
    v_period_start := v_child.created_at + make_interval(months => v_months);
    v_period_end := v_child.created_at + make_interval(months => v_months + 1);
  end loop;

  -- Count logical deliveries, excluding corrective revisions
  select count(distinct m.material_week) into v_used from public.materials m
  where m.child_id = p_child_id
    and m.created_at >= v_period_start and m.created_at < v_period_end
    and m.revision = 1
    and not exists (
      select 1 from private_generation.material_replacement_jobs rep
      where rep.completed_material_id = m.id
    );

  -- Count in-flight generation requests, excluding replacement jobs
  select v_used + count(distinct r.source_material_id) into v_used
  from public.material_generation_requests r
  join public.generation_jobs j on j.id = r.generation_job_id
  where r.child_id = p_child_id
    and r.created_at >= v_period_start and r.created_at < v_period_end
    and j.material_id is null
    and j.status not in ('canceled', 'failed')
    and not (j.idempotency_key like 'quality-replacement:%');

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
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Email Material Access: Resolve Repaired / Cached Artifact Paths
-- ---------------------------------------------------------------------------
create or replace function public.resolve_material_email_access(p_token_hash text, p_session_user_id uuid default null)
returns table (
  material_id uuid,
  child_id uuid,
  parent_id uuid,
  child_name text,
  material_week date,
  week_number bigint,
  student_pdf_path text,
  parent_answer_pdf_path text,
  owner_session_matches boolean
)
language sql stable security definer set search_path = '' as $$
  with access_seed as (
    select delivery.material_id as requested_material_id, delivery.child_id, delivery.parent_id,
      seed.material_week, child.display_name
    from public.material_email_deliveries delivery
    join public.materials seed on seed.id = delivery.material_id and seed.child_id = delivery.child_id
    join public.children child on child.id = delivery.child_id and child.parent_id = delivery.parent_id
    join public.generation_jobs seed_job on seed_job.material_id = seed.id and seed_job.child_id = child.id
    where delivery.access_token_hash = p_token_hash
      and delivery.access_revoked_at is null and delivery.access_expires_at > now()
      and seed_job.status = 'completed' and seed_job.completed_at is not null and seed_job.release_at <= now()
  )
  select material.id, seed.child_id, seed.parent_id, seed.display_name, material.material_week,
    (
      select count(distinct earlier.material_week)
      from public.materials earlier
      join public.generation_jobs earlier_job
        on earlier_job.material_id = earlier.id and earlier_job.child_id = earlier.child_id
      where earlier.child_id = seed.child_id
        and earlier_job.status = 'completed'
        and earlier_job.release_at <= now()
        and earlier.material_week <= material.material_week
    ),
    coalesce(
      (
        select artifact.storage_path
        from public.material_pdf_artifacts artifact
        where artifact.material_id = material.id
          and artifact.revision = material.revision
          and artifact.kind = 'student'
          and artifact.state = 'ready'
          and artifact.storage_path is not null
          and (artifact.expires_at is null or artifact.expires_at > now())
        order by artifact.updated_at desc
        limit 1
      ),
      material.student_pdf_path
    ),
    coalesce(
      (
        select artifact.storage_path
        from public.material_pdf_artifacts artifact
        where artifact.material_id = material.id
          and artifact.revision = material.revision
          and artifact.kind = 'parent'
          and artifact.state = 'ready'
          and artifact.storage_path is not null
          and (artifact.expires_at is null or artifact.expires_at > now())
        order by artifact.updated_at desc
        limit 1
      ),
      material.parent_answer_pdf_path
    ),
    seed.parent_id = p_session_user_id
  from access_seed seed
  join lateral (
    select candidate.*
    from public.materials candidate
    join public.generation_jobs candidate_job
      on candidate_job.material_id = candidate.id and candidate_job.child_id = candidate.child_id
    where candidate.child_id = seed.child_id
      and candidate.material_week = seed.material_week
      and candidate_job.status = 'completed'
      and candidate_job.completed_at is not null
      and candidate_job.release_at <= now()
    order by candidate.revision desc, candidate.created_at desc, candidate.id desc
    limit 1
  ) material on true;
$$;
