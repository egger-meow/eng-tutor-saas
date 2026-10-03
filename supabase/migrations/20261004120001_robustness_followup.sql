-- Follow the pre-existing future-dated P2 migration in replay order.
-- Preserve the authoritative request-time feedback cutoff.
-- FK probes and recovery lookups must not degrade into repeated full-table scans.
create index if not exists robustness_replacement_child on private_generation.material_replacement_jobs(child_id);
create index if not exists robustness_replacement_completed on private_generation.material_replacement_jobs(completed_material_id);
create index if not exists robustness_replacement_source on private_generation.material_replacement_jobs(source_material_id,child_id);
create index if not exists robustness_onboarding_child on private_generation.pending_onboardings(child_id);
create index if not exists robustness_onboarding_parent on private_generation.pending_onboardings(consumed_by);
create index if not exists robustness_history_child on private_generation.targeted_history_manifests(child_id);
create index if not exists robustness_progress_child on private_generation.week1_progress_tokens(child_id);
create index if not exists robustness_progress_job on private_generation.week1_progress_tokens(job_id);
create index if not exists robustness_response_item on public.assessment_responses(item_id);
create index if not exists robustness_assessment_last_session on public.child_assessment_state(last_session_id);
create index if not exists robustness_evidence_feedback on public.child_learning_evidence(feedback_processing_id,feedback_id,child_id,material_id);
create index if not exists robustness_evidence_material on public.child_learning_evidence(material_id,child_id);
create index if not exists robustness_snapshot_job on public.child_weekly_learning_snapshots(generation_job_id);
create index if not exists robustness_snapshot_material on public.child_weekly_learning_snapshots(material_id,child_id);
create index if not exists robustness_quality_material on public.curriculum_quality_observations(material_id);
create index if not exists robustness_feedback_memory_child on public.feedback_memory_processing(child_id);
create index if not exists robustness_feedback_memory_source on public.feedback_memory_processing(feedback_id,child_id,material_id);
create index if not exists robustness_email_child on public.material_email_deliveries(child_id);
create index if not exists robustness_email_parent on public.material_email_deliveries(parent_id);
create index if not exists robustness_request_job on public.material_generation_requests(generation_job_id);
create index if not exists robustness_request_source on public.material_generation_requests(source_material_id,child_id);

alter policy "Parents can view child communication progress" on public.child_communication_progress
using (exists(select 1 from public.children c where c.id=child_communication_progress.child_id and c.parent_id=(select auth.uid())));
alter policy waitlist_parent_select on public.waitlist using(parent_id=(select auth.uid()));
alter policy child_weekly_snapshots_owner_select on public.child_weekly_learning_snapshots
using(exists(select 1 from public.children c where c.id=child_weekly_learning_snapshots.child_id and c.parent_id=(select auth.uid())));
alter policy feedback_memory_processing_owner_select on public.feedback_memory_processing
using(exists(select 1 from public.children c where c.id=feedback_memory_processing.child_id and c.parent_id=(select auth.uid())));
alter policy child_learning_evidence_owner_select on public.child_learning_evidence
using(exists(select 1 from public.children c where c.id=child_learning_evidence.child_id and c.parent_id=(select auth.uid())));

create or replace function public.worker_renew_submission_leases(p_processor_id text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_processor_id is null or char_length(p_processor_id) < 3 then raise exception 'processor_id is required'; end if;
  with renewed as (
    update private_generation.curriculum_submissions s
    set processor_lease_expires_at = now() + interval '30 minutes', updated_at = now()
    where s.status = 'processing' and s.processor_id = p_processor_id
      and s.processor_lease_expires_at > now()
    returning s.job_id, s.generation_worker_id
  ), jobs as (
    update public.generation_jobs j set lease_expires_at = greatest(j.lease_expires_at, now() + interval '45 minutes')
    from renewed r where j.id = r.job_id and j.status = 'claimed'
      and j.claimed_by = r.generation_worker_id and j.lease_expires_at > now()
    returning j.id
  ) select count(*) into v_count from renewed;
  return v_count;
end $$;
revoke all on function public.worker_renew_submission_leases(text) from public, anon, authenticated;
grant execute on function public.worker_renew_submission_leases(text) to service_role;

-- A bounded admission budget before Auth dispatch and costly activation. No raw email/IP stored.
create table private_generation.onboarding_admission_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  used integer not null check (used >= 0),
  primary key(bucket_key, window_start)
);
alter table private_generation.onboarding_admission_buckets enable row level security;
revoke all on private_generation.onboarding_admission_buckets from public, anon, authenticated;

create function public.consume_onboarding_admission(p_email_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hour timestamptz := date_trunc('hour', now()); v_day timestamptz := date_trunc('day', now());
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid admission key'; end if;
  -- Shared lock makes checking and charging all dimensions atomic across Edge instances.
  perform pg_advisory_xact_lock(7265002);
  delete from private_generation.onboarding_admission_buckets where window_start < now() - interval '2 days';
  if coalesce((select used from private_generation.onboarding_admission_buckets where bucket_key='hour' and window_start=v_hour),0) >= 20
    or coalesce((select used from private_generation.onboarding_admission_buckets where bucket_key='day' and window_start=v_day),0) >= 80
    or coalesce((select used from private_generation.onboarding_admission_buckets where bucket_key=p_email_hash and window_start=v_hour),0) >= 3
  then return false; end if;
  insert into private_generation.onboarding_admission_buckets(bucket_key,window_start,used)
    values ('hour',v_hour,1),('day',v_day,1),(p_email_hash,v_hour,1)
    on conflict(bucket_key,window_start) do update set used=private_generation.onboarding_admission_buckets.used+1;
  return true;
end $$;
revoke all on function public.consume_onboarding_admission(text) from public, anon, authenticated;
grant execute on function public.consume_onboarding_admission(text) to service_role;

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
    'pending', now(), p_material_id, now() + interval '24 hours', now(), now()
  ) on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into v_job_id;

  update public.material_generation_requests set generation_job_id = v_job_id
  where child_id = p_child_id and source_material_id = p_material_id and generation_job_id is null;

  update public.children set next_generation_at = now() where id = p_child_id;
  return jsonb_build_object('feedbackSaved', true, 'requested', true, 'jobId', v_job_id, 'used', v_used + 1, 'limit', 4, 'resetsAt', v_period_end);
end;
$$;

-- Preserve request history while exposing terminal generation failures honestly to the owner.
create or replace function public.get_student_material_submission(p_material_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_submission public.student_material_submissions%rowtype; v_next_status text;
begin
  select s.* into v_submission from public.student_material_submissions s
  join public.children c on c.id=s.child_id and c.parent_id=(select auth.uid())
  where s.material_id=p_material_id;
  if not found then return null; end if;
  select j.status into v_next_status from public.material_generation_requests r
  left join public.generation_jobs j on j.id=r.generation_job_id and j.child_id=r.child_id
  where r.child_id=v_submission.child_id and r.source_material_id=p_material_id;
  return jsonb_build_object('submitted_at',v_submission.submitted_at,
    'answers',v_submission.answers,'self_check',v_submission.self_check,'results',v_submission.results,
    'next_requested',exists(select 1 from public.material_generation_requests r
      where r.child_id=v_submission.child_id and r.source_material_id=p_material_id),
    'next_request_status',v_next_status);
end $$;

-- Cached published PDFs remain valid until superseded; no monthly regeneration churn.
create table private_generation.material_pdf_garbage (
  storage_path text primary key,
  eligible_at timestamptz not null default now()+interval '24 hours'
);
alter table private_generation.material_pdf_garbage enable row level security;
revoke all on private_generation.material_pdf_garbage from public,anon,authenticated;
create or replace function public.request_material_pdf(p_material_id uuid, p_kind text, p_retry boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.materials; a public.material_pdf_artifacts; v_renderer text; v_path text;
begin
  if p_kind not in ('student','parent') or p_kind is null then raise exception 'Invalid output kind'; end if;
  select mat.* into m from public.materials mat
  join public.children c on c.id=mat.child_id and c.parent_id=(select auth.uid())
  join public.generation_jobs j on j.material_id=mat.id and j.child_id=c.id
  where mat.id=p_material_id and j.status='completed' and j.completed_at is not null and j.release_at<=now();
  if m.id is null then raise exception 'Material unavailable' using errcode='42501'; end if;
  if p_kind='parent' and not public.can_open_parent_answer(m.id) then
    raise exception 'Submit material before opening answers' using errcode='42501';
  end if;
  select renderer_version into v_renderer from public.material_pdf_settings where singleton;
  v_path := case when p_kind='student' then m.student_pdf_path else m.parent_answer_pdf_path end;
  -- Reuse inspected published artifacts without re-rendering or expiring history.
  insert into public.material_pdf_artifacts(material_id,revision,renderer_version,kind,state,storage_path)
  values(m.id,m.revision,v_renderer,p_kind,'ready',v_path) on conflict do nothing;
  select * into a from public.material_pdf_artifacts
    where material_id=m.id and revision=m.revision and renderer_version=v_renderer and kind=p_kind for update;
  if (a.state='ready' and a.expires_at<=now()) or (a.state='failed' and p_retry and a.updated_at<now()-interval '30 seconds') then
    update public.material_pdf_artifacts set state='queued',expires_at=null,
      lease_token=null,lease_until=null,updated_at=now() where id=a.id returning * into a;
  end if;
  return jsonb_build_object('id',a.id,'state',a.state,'path',case when a.state='ready' then a.storage_path end);
end $$;
create or replace function public.claim_material_pdf(p_renderer text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.material_pdf_artifacts; m public.materials; v_old_path text;
begin
  -- One serialized claim at a time; skip locked prevents duplicate work across runners.
  if not pg_try_advisory_xact_lock(7265001) then return null; end if;
  if p_renderer is distinct from (select renderer_version from public.material_pdf_settings where singleton) then
    raise exception 'PDF renderer version mismatch';
  end if;
  if exists(select 1 from public.material_pdf_artifacts where state='rendering' and lease_until>now()) then return null; end if;
  select * into a from public.material_pdf_artifacts
  where renderer_version=p_renderer and (state='queued' or (state='rendering' and lease_until<=now()))
  order by requested_at for update skip locked limit 1;
  if a.id is null then return null; end if;
  select * into m from public.materials where id=a.material_id;
  v_old_path := a.storage_path;
  if v_old_path like m.child_id::text||'/pdf-cache/'||a.id::text||'/%' then
    insert into private_generation.material_pdf_garbage(storage_path) values(v_old_path) on conflict do nothing;
  end if;
  update public.material_pdf_artifacts set state='rendering',lease_token=gen_random_uuid(),
    lease_until=now()+interval '10 minutes',attempts=attempts+1,updated_at=now()
    where id=a.id returning * into a;
  update public.material_pdf_artifacts set storage_path=m.child_id::text||'/pdf-cache/'||a.id::text||'/'||a.lease_token::text||'.pdf' where id=a.id;
  select * into m from public.materials where id=a.material_id;
  return jsonb_build_object('id',a.id,'leaseToken',a.lease_token,'kind',a.kind,
    'path',m.child_id::text||'/pdf-cache/'||a.id::text||'/'||a.lease_token::text||'.pdf',
    'canonicalSource',m.canonical_source);
end $$;
create or replace function public.finish_material_pdf(p_id uuid,p_lease uuid,p_path text,p_bytes bigint,p_render_ms integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_updated integer; v_expected text;
begin
  select m.child_id::text||'/pdf-cache/'||a.id::text||'/'||a.lease_token::text||'.pdf' into v_expected
  from public.material_pdf_artifacts a join public.materials m on m.id=a.material_id where a.id=p_id;
  if p_path is null or p_path is distinct from v_expected or p_bytes is null or p_bytes<1000
    or p_render_ms is null or p_render_ms<0 then raise exception 'Invalid PDF completion'; end if;
  update public.material_pdf_artifacts set state='ready',storage_path=p_path,expires_at=null,
    byte_size=p_bytes,render_ms=p_render_ms,lease_token=null,lease_until=null,updated_at=now()
  where id=p_id and state='rendering' and lease_token=p_lease and lease_until>now();
  get diagnostics v_updated=row_count;
  return v_updated=1;
end $$;

create or replace function public.queue_missing_material_pdf(p_id uuid,p_path text)
returns void language sql security definer set search_path='' as $$
  update public.material_pdf_artifacts set state='queued',expires_at=null,updated_at=now()
  where id=p_id and state='ready' and storage_path=p_path;
$$;
create or replace function public.fail_material_pdf(p_id uuid,p_lease uuid)
returns void language sql security definer set search_path='' as $$
  with failed as (
    update public.material_pdf_artifacts set state='failed',lease_token=null,lease_until=null,updated_at=now()
    where id=p_id and state='rendering' and lease_token=p_lease returning storage_path
  ) insert into private_generation.material_pdf_garbage(storage_path)
    select storage_path from failed where storage_path is not null and storage_path like '%/pdf-cache/%'
    on conflict do nothing;
$$;
create function public.list_material_pdf_garbage(p_limit integer default 20)
returns table(storage_path text) language sql stable security definer set search_path='' as $$
  select g.storage_path from private_generation.material_pdf_garbage g
  where g.eligible_at<=now()
    and g.storage_path ~ '^[0-9a-f-]{36}/pdf-cache/[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$'
    and not exists(select 1 from public.materials m where m.student_pdf_path=g.storage_path or m.parent_answer_pdf_path=g.storage_path)
    and not exists(select 1 from public.material_pdf_artifacts a where a.storage_path=g.storage_path and a.state in ('ready','rendering'))
  order by g.eligible_at limit greatest(0,least(p_limit,100));
$$;
create function public.acknowledge_material_pdf_garbage(p_path text)
returns void language sql security definer set search_path='' as $$
  delete from private_generation.material_pdf_garbage where storage_path=p_path and eligible_at<=now();
$$;
revoke all on function public.list_material_pdf_garbage(integer),public.acknowledge_material_pdf_garbage(text) from public,anon,authenticated;
grant execute on function public.list_material_pdf_garbage(integer),public.acknowledge_material_pdf_garbage(text) to service_role;

-- Restore the explicit Week 1 publication exception required by AGENTS/SPEC 24 and 205.
create or replace function public.worker_claim_curriculum_submissions(
  processor_id text,
  claim_limit integer default 5
)
returns table (
  job_id uuid,
  authoring_attempt integer,
  generation_worker_id text,
  canonical_source jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if processor_id is null or char_length(processor_id) < 3 then
    raise exception 'processor_id is required';
  end if;
  if claim_limit < 1 or claim_limit > 25 then
    raise exception 'claim_limit must be between 1 and 25';
  end if;

  return query
  with selected as (
    select submission.job_id, submission.authoring_attempt
    from private_generation.curriculum_submissions as submission
    join public.generation_jobs as job on job.id = submission.job_id
    where job.source_material_id is not null
      and (
        submission.status = 'pending'
        or (
          submission.status = 'technical_failed'
          and coalesce(submission.error_code, '') <> 'RELEASE_MISMATCH'
          and submission.processor_id is distinct from $1
        )
        or (
          submission.status = 'processing'
          and submission.processor_lease_expires_at < now()
        )
      )
      and job.status in ('claimed', 'completed')
    order by submission.submitted_at, submission.job_id, submission.authoring_attempt
    for update of submission skip locked
    limit claim_limit
  ), renewed_jobs as (
    update public.generation_jobs as job
    set lease_expires_at = case
      when job.status = 'claimed' then now() + interval '45 minutes'
      else job.lease_expires_at
    end
    from selected
    where job.id = selected.job_id
    returning job.id
  )
  update private_generation.curriculum_submissions as submission
  set status = 'processing',
      processor_id = $1,
      processor_lease_expires_at = now() + interval '30 minutes',
      attempt_count = submission.attempt_count + 1,
      publication_path = 'normal_finisher',
      updated_at = now()
  from selected
  where submission.job_id = selected.job_id
    and submission.authoring_attempt = selected.authoring_attempt
    and exists (select 1 from renewed_jobs where renewed_jobs.id = selected.job_id)
  returning submission.job_id, submission.authoring_attempt,
    submission.generation_worker_id, submission.canonical_source;
end;
$$;

comment on function public.worker_claim_curriculum_submissions(text, integer)
is 'Week 2+ Finisher claim. Week 1 remains exclusively on the objective-integrity Fast Publisher path; run-scoped IDs prevent immediate technical-failure loops.';
