create extension if not exists pgcrypto with schema extensions;

create table public.material_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique references public.materials(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'failed', 'sent', 'dead')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  last_error text,
  sent_at timestamptz,
  claimed_by text,
  claim_expires_at timestamptz,
  provider_message_id text,
  access_token_hash text unique,
  access_expires_at timestamptz,
  access_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_email_delivery_owner_scope unique (id, parent_id, child_id, material_id)
);

alter table public.material_email_deliveries enable row level security;
revoke all on table public.material_email_deliveries from public, anon, authenticated;
grant all on table public.material_email_deliveries to service_role;

create index material_email_deliveries_dispatch_idx
  on public.material_email_deliveries (status, claim_expires_at, created_at)
  where sent_at is null;

create or replace function public.worker_claim_material_email_deliveries(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 300,
  p_max_attempts integer default 5
)
returns table (delivery_id uuid, material_id uuid, parent_id uuid, child_id uuid, recipient_email text, attempt_count integer)
language plpgsql security definer set search_path = ''
as $$
begin
  if nullif(trim(p_worker_id), '') is null then raise exception 'worker id is required'; end if;

  insert into public.material_email_deliveries (material_id, parent_id, child_id, recipient_email)
  select material.id, child.parent_id, child.id, auth_user.email
  from public.materials as material
  join public.generation_jobs as job on job.material_id = material.id and job.child_id = material.child_id
  join public.children as child on child.id = material.child_id
  join auth.users as auth_user on auth_user.id = child.parent_id
  where job.status = 'completed'
    and job.completed_at is not null
    and job.release_at <= now()
    and nullif(auth_user.email, '') is not null
  on conflict on constraint material_email_deliveries_material_id_key do nothing;

  return query
  with candidates as (
    select delivery.id
    from public.material_email_deliveries as delivery
    join public.generation_jobs as job on job.material_id = delivery.material_id and job.child_id = delivery.child_id
    where delivery.sent_at is null
      and delivery.attempt_count < greatest(1, least(p_max_attempts, 20))
      and (delivery.status in ('pending', 'failed') or (delivery.status = 'processing' and delivery.claim_expires_at <= now()))
      and job.status = 'completed' and job.completed_at is not null and job.release_at <= now()
    order by job.release_at, delivery.created_at
    for update of delivery skip locked
    limit greatest(1, least(p_limit, 50))
  ), claimed as (
    update public.material_email_deliveries as delivery
    set status = 'processing', claimed_by = p_worker_id,
        recipient_email = coalesce((select nullif(auth_user.email, '') from auth.users as auth_user where auth_user.id = delivery.parent_id), delivery.recipient_email),
        claim_expires_at = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 1800))),
        attempt_count = delivery.attempt_count + 1, last_attempt_at = now(), last_error = null, updated_at = now()
    from candidates where delivery.id = candidates.id
    returning delivery.*
  )
  select claimed.id, claimed.material_id, claimed.parent_id, claimed.child_id, claimed.recipient_email, claimed.attempt_count
  from claimed;
end;
$$;

create or replace function public.worker_set_material_email_token(p_delivery_id uuid, p_worker_id text, p_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid token hash'; end if;
  update public.material_email_deliveries set access_token_hash = p_token_hash,
    access_expires_at = now() + interval '90 days', access_revoked_at = null, updated_at = now()
  where id = p_delivery_id and status = 'processing' and claimed_by = p_worker_id
    and claim_expires_at > now() and (access_token_hash is null or access_token_hash = p_token_hash);
  return found;
end; $$;

create or replace function public.worker_complete_material_email_delivery(p_delivery_id uuid, p_worker_id text, p_provider_message_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.material_email_deliveries set status = 'sent', sent_at = coalesce(sent_at, now()),
    provider_message_id = coalesce(provider_message_id, p_provider_message_id), last_error = null,
    claimed_by = null, claim_expires_at = null, updated_at = now()
  where id = p_delivery_id and sent_at is null and status = 'processing' and claimed_by = p_worker_id;
  return found;
end; $$;

create or replace function public.worker_fail_material_email_delivery(p_delivery_id uuid, p_worker_id text, p_error text, p_max_attempts integer default 5)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.material_email_deliveries set status = case when attempt_count >= greatest(1, least(p_max_attempts, 20)) then 'dead' else 'failed' end,
    last_error = left(coalesce(p_error, 'Unknown email error'), 2000), claimed_by = null, claim_expires_at = null, updated_at = now()
  where id = p_delivery_id and sent_at is null and status = 'processing' and claimed_by = p_worker_id;
  return found;
end; $$;

create or replace function public.resolve_material_email_access(p_token_hash text, p_session_user_id uuid default null)
returns table (material_id uuid, child_id uuid, parent_id uuid, child_name text, material_week date,
  week_number bigint, student_pdf_path text, parent_answer_pdf_path text, owner_session_matches boolean)
language sql stable security definer set search_path = '' as $$
  select material.id, child.id, child.parent_id, child.display_name, material.material_week,
    (select count(distinct earlier.id) from public.materials as earlier
      join public.generation_jobs as earlier_job on earlier_job.material_id = earlier.id and earlier_job.child_id = earlier.child_id
      where earlier.child_id = child.id and earlier_job.status = 'completed' and earlier_job.release_at <= now()
      and (earlier.material_week, earlier.revision, earlier.created_at, earlier.id)
        <= (material.material_week, material.revision, material.created_at, material.id)),
    material.student_pdf_path, material.parent_answer_pdf_path, child.parent_id = p_session_user_id
  from public.material_email_deliveries as delivery
  join public.materials as material on material.id = delivery.material_id and material.child_id = delivery.child_id
  join public.children as child on child.id = delivery.child_id and child.parent_id = delivery.parent_id
  join public.generation_jobs as job on job.material_id = material.id and job.child_id = child.id
  where delivery.access_token_hash = p_token_hash and delivery.sent_at is not null
    and delivery.access_revoked_at is null and delivery.access_expires_at > now()
    and job.status = 'completed' and job.completed_at is not null and job.release_at <= now();
$$;

revoke all on function public.worker_claim_material_email_deliveries(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.worker_set_material_email_token(uuid, text, text) from public, anon, authenticated;
revoke all on function public.worker_complete_material_email_delivery(uuid, text, text) from public, anon, authenticated;
revoke all on function public.worker_fail_material_email_delivery(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.resolve_material_email_access(text, uuid) from public, anon, authenticated;
grant execute on function public.worker_claim_material_email_deliveries(text, integer, integer, integer) to service_role;
grant execute on function public.worker_set_material_email_token(uuid, text, text) to service_role;
grant execute on function public.worker_complete_material_email_delivery(uuid, text, text) to service_role;
grant execute on function public.worker_fail_material_email_delivery(uuid, text, text, integer) to service_role;
grant execute on function public.resolve_material_email_access(text, uuid) to service_role;

create or replace function public.get_owned_released_material(p_material_id uuid)
returns table (id uuid, child_id uuid, child_name text, material_week date, revision integer,
  student_pdf_path text, parent_answer_pdf_path text, generation_summary jsonb, created_at timestamptz, release_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select material.id, material.child_id, child.display_name, material.material_week, material.revision,
    material.student_pdf_path, material.parent_answer_pdf_path, material.generation_summary, material.created_at, job.release_at
  from public.materials as material
  join public.children as child on child.id = material.child_id and child.parent_id = (select auth.uid())
  join public.generation_jobs as job on job.material_id = material.id and job.child_id = child.id
  where material.id = p_material_id and job.status = 'completed' and job.completed_at is not null and job.release_at <= now();
$$;
revoke all on function public.get_owned_released_material(uuid) from public, anon;
grant execute on function public.get_owned_released_material(uuid) to authenticated;

comment on table public.material_email_deliveries is 'Independent, retryable notification state. Dashboard release never depends on email success. Raw scoped tokens are never stored.';
