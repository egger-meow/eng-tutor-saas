-- Preserve owner/submission checks and quota; recognize operator-owned test entitlement.
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
  -- Match the claim path's operator-owned internal-test entitlement.
  if not v_child.is_internal_test
    and not exists(select 1 from public.subscriptions sub where sub.child_id=v_child.id
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
