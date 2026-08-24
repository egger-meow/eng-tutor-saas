alter table public.children
  add column if not exists is_internal_test boolean not null default false;

comment on column public.children.is_internal_test is
  'Operator-owned test entitlement. Bypasses billing, founding allocation, and public capacity only; production generation and quality lifecycle remain unchanged.';

alter table public.generation_jobs alter column max_attempts set default 5;
update public.generation_jobs
set max_attempts = 5
where max_attempts = 3 and status in ('pending', 'claimed', 'failed');

create table public.material_quality_overrides (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs(id),
  authoring_attempt integer not null check (authoring_attempt = 5),
  material_id uuid not null unique references public.materials(id),
  processor_id text not null,
  outcome text not null default 'delivered_with_quality_override'
    check (outcome = 'delivered_with_quality_override'),
  override_reason text not null,
  rejection_evidence jsonb not null check (jsonb_typeof(rejection_evidence) = 'object'),
  created_at timestamptz not null default now(),
  unique (job_id, authoring_attempt)
);

alter table public.material_quality_overrides enable row level security;
revoke all on public.material_quality_overrides from public, anon, authenticated;
grant select, insert on public.material_quality_overrides to service_role;

create or replace function public.worker_record_quality_override(
  job_id uuid,
  authoring_attempt integer,
  material_id uuid,
  processor_id text,
  override_reason text,
  rejection_evidence jsonb,
  rejection_message text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if authoring_attempt <> 5 then raise exception 'quality override requires attempt 5'; end if;
  if nullif(trim(override_reason), '') is null then raise exception 'override reason is required'; end if;
  if rejection_evidence is null or jsonb_typeof(rejection_evidence) <> 'object' then
    raise exception 'rejection evidence must be an object';
  end if;
  if not exists (
    select 1 from public.materials m join public.generation_jobs j on j.material_id = m.id
    where m.id = $3 and j.id = $1 and m.student_pdf_path is not null and m.parent_answer_pdf_path is not null
  ) then raise exception 'valid rendered material candidate is missing'; end if;
  update private_generation.curriculum_submissions s
  set status='quality_rejected', processed_at=now(), processor_lease_expires_at=null,
      error_code='QUALITY_REJECTED', error_message=left($7, 2000), failure_evidence=$6, updated_at=now()
  where s.job_id=$1 and s.authoring_attempt=$2 and s.status='processing' and s.processor_id=$4;
  if not found then raise exception 'active Finisher submission lease is missing'; end if;
  insert into public.material_quality_overrides(job_id, authoring_attempt, material_id, processor_id, override_reason, rejection_evidence)
  values ($1, $2, $3, $4, $5, $6) returning id into result_id;
  return result_id;
end $$;
revoke all on function public.worker_record_quality_override(uuid, integer, uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.worker_record_quality_override(uuid, integer, uuid, text, text, jsonb, text) to service_role;

create or replace function public.get_enrollment_state()
returns table (status text, capacity integer, active_count integer, remaining integer, founding_limit integer, founding_count integer, waiting_count integer, released_count integer)
language sql stable security definer set search_path = '' as $$
  with released_state as (
    select count(*)::integer released_cnt from public.waitlist where waitlist.status = 'released'
  ), waiting_state as (
    select count(*)::integer waiting_cnt from public.waitlist where waitlist.status = 'waiting'
  )
  select settings.status, settings.capacity,
    count(child.id) filter (where not child.is_internal_test)::integer,
    greatest(settings.capacity - count(child.id) filter (where not child.is_internal_test)::integer - rs.released_cnt, 0),
    settings.founding_limit,
    count(child.id) filter (where not child.is_internal_test and subscription.founding_status in ('eligible', 'redeemed'))::integer,
    ws.waiting_cnt, rs.released_cnt
  from public.enrollment_settings settings
  cross join released_state rs cross join waiting_state ws
  left join public.subscriptions subscription on subscription.status in ('trialing', 'active', 'past_due')
  left join public.children child on child.id = subscription.child_id and child.is_active
  where settings.key = 'default'
  group by settings.status, settings.capacity, settings.founding_limit, rs.released_cnt, ws.waiting_cnt;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;

create or replace function public.admin_set_internal_test_entitlement(p_child_id uuid, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.children set is_internal_test = p_enabled where id = p_child_id;
  if not found then raise exception 'child not found'; end if;
  if p_enabled then
    insert into public.subscriptions(child_id, provider, status, founding_status)
    values (p_child_id, 'internal_test', 'trialing', 'none')
    on conflict (child_id) do update set provider = 'internal_test', status = 'trialing', founding_status = 'none';
  else
    update public.subscriptions set status = 'canceled'
    where child_id = p_child_id and provider = 'internal_test';
  end if;
  return true;
end $$;
revoke all on function public.admin_set_internal_test_entitlement(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_internal_test_entitlement(uuid, boolean) to service_role;
