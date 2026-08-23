-- A provisioned token remains usable if SMTP accepted the message but the
-- dispatcher crashed before recording sent_at. Delivery state is intentionally
-- independent from the scoped material authorization state.
alter table public.material_email_deliveries
  add column send_started_at timestamptz;

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
  where job.status = 'completed' and job.completed_at is not null and job.release_at <= now()
    and nullif(auth_user.email, '') is not null
  on conflict on constraint material_email_deliveries_material_id_key do nothing;

  -- Once SMTP transmission has started, an abandoned lease is ambiguous: Gmail
  -- may have accepted the message. Never auto-resend it. Operators can inspect
  -- the durable token and error and make an explicit recovery decision.
  update public.material_email_deliveries
  set status = 'dead', claimed_by = null, claim_expires_at = null,
    last_error = coalesce(last_error, 'SMTP outcome uncertain after worker interruption; automatic resend suppressed'),
    updated_at = now()
  where sent_at is null and status = 'processing' and claim_expires_at <= now()
    and send_started_at is not null;

  return query
  with candidates as (
    select delivery.id
    from public.material_email_deliveries as delivery
    join public.generation_jobs as job on job.material_id = delivery.material_id and job.child_id = delivery.child_id
    where delivery.sent_at is null and delivery.send_started_at is null
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

create or replace function public.worker_begin_material_email_send(p_delivery_id uuid, p_worker_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.material_email_deliveries set send_started_at = now(), updated_at = now()
  where id = p_delivery_id and sent_at is null and send_started_at is null
    and status = 'processing' and claimed_by = p_worker_id and claim_expires_at > now()
    and access_token_hash is not null and access_expires_at > now() and access_revoked_at is null;
  return found;
end;
$$;

create or replace function public.worker_fail_material_email_delivery(p_delivery_id uuid, p_worker_id text, p_error text, p_max_attempts integer default 5)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.material_email_deliveries set status = case when attempt_count >= greatest(1, least(p_max_attempts, 20)) then 'dead' else 'failed' end,
    last_error = left(coalesce(p_error, 'Unknown email error'), 2000), claimed_by = null,
    claim_expires_at = null, send_started_at = null, updated_at = now()
  where id = p_delivery_id and sent_at is null and status = 'processing' and claimed_by = p_worker_id;
  return found;
end;
$$;

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
  where delivery.access_token_hash = p_token_hash
    and delivery.access_revoked_at is null and delivery.access_expires_at > now()
    and job.status = 'completed' and job.completed_at is not null and job.release_at <= now();
$$;

revoke all on function public.resolve_material_email_access(text, uuid) from public, anon, authenticated;
revoke all on function public.worker_begin_material_email_send(uuid, text) from public, anon, authenticated;
revoke all on function public.worker_claim_material_email_deliveries(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.worker_fail_material_email_delivery(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.resolve_material_email_access(text, uuid) to service_role;
grant execute on function public.worker_begin_material_email_send(uuid, text) to service_role;
grant execute on function public.worker_claim_material_email_deliveries(text, integer, integer, integer) to service_role;
grant execute on function public.worker_fail_material_email_delivery(uuid, text, text, integer) to service_role;
