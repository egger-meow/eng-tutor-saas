alter table public.generation_jobs
  add column source_material_id uuid,
  add column release_at timestamptz,
  add column feedback_cutoff_at timestamptz,
  add column generation_due_at timestamptz,
  add column feedback_missing boolean not null default false;

update public.generation_jobs
set release_at = scheduled_for + interval '24 hours',
    feedback_cutoff_at = scheduled_for - interval '24 hours',
    generation_due_at = scheduled_for;

alter table public.generation_jobs
  alter column release_at set not null,
  alter column feedback_cutoff_at set not null,
  alter column generation_due_at set not null,
  add constraint generation_jobs_source_material_child_fk
    foreign key (source_material_id, child_id)
    references public.materials (id, child_id) on delete restrict,
  add constraint generation_jobs_schedule_order_check
    check (
      feedback_cutoff_at = release_at - interval '48 hours'
      and generation_due_at = release_at - interval '24 hours'
    );

drop index generation_jobs_due_idx;
create index generation_jobs_claim_idx
  on public.generation_jobs (
    generation_due_at,
    feedback_cutoff_at,
    scheduled_for,
    created_at
  )
  where status in ('pending', 'claimed');
create index generation_jobs_source_material_child_idx
  on public.generation_jobs (source_material_id, child_id)
  where source_material_id is not null;

comment on column public.generation_jobs.scheduled_for is
  'Earliest attempt time, including retry backoff; feedback eligibility is evaluated separately.';
comment on column public.generation_jobs.release_at is
  'Promised delivery timestamp on the child rolling seven-day cadence.';
comment on column public.generation_jobs.feedback_cutoff_at is
  'Latest timestamp at which source-material feedback may influence this job.';
comment on column public.generation_jobs.generation_due_at is
  'Mandatory generation threshold; due jobs bypass normal run capacity.';
comment on column public.generation_jobs.feedback_missing is
  'True when claimed without qualifying feedback; not evidence of successful completion.';

create or replace function private_generation.claim_due_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_limit integer;
begin
  if worker_id is null or char_length(worker_id) < 3 then
    raise exception 'worker_id is required';
  end if;

  select least(integer_value, 100)
  into claim_limit
  from public.operational_settings
  where key = 'daily_generation_limit';

  if claim_limit is null then
    raise exception 'daily_generation_limit is not configured';
  end if;

  return query
  with mandatory as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.subscriptions as subscription
      on subscription.child_id = child.id
      and subscription.status in ('trialing', 'active')
    where job.scheduled_for <= now()
      and job.generation_due_at <= now()
      and job.attempt_count < job.max_attempts
      and (
        job.status = 'pending'
        or (job.status = 'claimed' and job.lease_expires_at < now())
      )
      and (
        job.source_material_id is null
        or job.feedback_cutoff_at <= now()
        or exists (
          select 1
          from public.feedback as source_feedback
          where source_feedback.child_id = job.child_id
            and source_feedback.material_id = job.source_material_id
            and source_feedback.created_at <= job.feedback_cutoff_at
        )
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
  ),
  normal as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.subscriptions as subscription
      on subscription.child_id = child.id
      and subscription.status in ('trialing', 'active')
    where job.scheduled_for <= now()
      and job.generation_due_at > now()
      and job.attempt_count < job.max_attempts
      and (
        job.status = 'pending'
        or (job.status = 'claimed' and job.lease_expires_at < now())
      )
      and (
        job.source_material_id is null
        or job.feedback_cutoff_at <= now()
        or exists (
          select 1
          from public.feedback as source_feedback
          where source_feedback.child_id = job.child_id
            and source_feedback.material_id = job.source_material_id
            and source_feedback.created_at <= job.feedback_cutoff_at
        )
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
    limit greatest(claim_limit - (select count(*)::integer from mandatory), 0)
  ),
  selected as (
    select id from mandatory
    union all
    select id from normal
  )
  update public.generation_jobs as job
  set status = 'claimed',
      claimed_by = worker_id,
      lease_expires_at = now() + interval '45 minutes',
      attempt_count = job.attempt_count + 1,
      feedback_missing = not exists (
        select 1
        from public.feedback as source_feedback
        where source_feedback.child_id = job.child_id
          and source_feedback.material_id = job.source_material_id
          and source_feedback.created_at <= job.feedback_cutoff_at
      ),
      error_code = null,
      error_message = null
  from selected
  where job.id = selected.id
  returning job.*;
end;
$$;

revoke all on function private_generation.claim_due_generation_jobs(text)
from public, anon, authenticated;
grant execute on function private_generation.claim_due_generation_jobs(text)
to service_role;
