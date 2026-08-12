create function private_generation.enqueue_initial_generation_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  release_anchor timestamptz := date_trunc('second', now());
  first_material_week date;
begin
  if new.status not in ('trialing', 'active') then
    return new;
  end if;

  if exists (
    select 1 from public.materials where child_id = new.child_id
  ) or exists (
    select 1 from public.generation_jobs where child_id = new.child_id
  ) then
    return new;
  end if;

  select (release_anchor at time zone child.timezone)::date
  into first_material_week
  from public.children as child
  where child.id = new.child_id and child.is_active;

  if first_material_week is null then
    return new;
  end if;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    new.child_id,
    first_material_week,
    'curriculum-rules/1.0.0',
    new.child_id::text || ':' || first_material_week::text || ':r1',
    'pending',
    release_anchor,
    null,
    release_anchor,
    release_anchor - interval '48 hours',
    release_anchor - interval '24 hours'
  ) on conflict (idempotency_key) do nothing;

  update public.children
  set next_generation_at = release_anchor - interval '24 hours'
  where id = new.child_id;

  return new;
end;
$$;

revoke all on function private_generation.enqueue_initial_generation_job()
from public, anon, authenticated;

create trigger enqueue_initial_generation_after_subscription
after insert or update of status on public.subscriptions
for each row execute function private_generation.enqueue_initial_generation_job();

-- Backfill eligible children created before initial-job automation existed.
insert into public.generation_jobs (
  child_id, material_week, rule_version, idempotency_key, status,
  scheduled_for, source_material_id, release_at,
  feedback_cutoff_at, generation_due_at
)
select
  child.id,
  (anchor.release_at at time zone child.timezone)::date,
  'curriculum-rules/1.0.0',
  child.id::text || ':' || (anchor.release_at at time zone child.timezone)::date::text || ':r1',
  'pending',
  anchor.release_at,
  null,
  anchor.release_at,
  anchor.release_at - interval '48 hours',
  anchor.release_at - interval '24 hours'
from public.children as child
join public.subscriptions as subscription
  on subscription.child_id = child.id
  and subscription.status in ('trialing', 'active')
cross join lateral (select date_trunc('second', now()) as release_at) as anchor
where child.is_active
  and not exists (select 1 from public.materials where child_id = child.id)
  and not exists (select 1 from public.generation_jobs where child_id = child.id)
on conflict (idempotency_key) do nothing;

update public.children as child
set next_generation_at = job.generation_due_at
from public.generation_jobs as job
where job.child_id = child.id
  and job.source_material_id is null
  and job.status = 'pending'
  and child.next_generation_at is null;
