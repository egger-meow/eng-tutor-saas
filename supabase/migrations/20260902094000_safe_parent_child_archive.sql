-- Safe parent-owned child removal.
-- This is a soft archive: historical materials, feedback, and billing records remain intact.
-- Live Paddle billing, a transaction-bound checkout, or an email already in SMTP transmission
-- must be resolved before a child can disappear from the parent UI.

create or replace function public.archive_owned_child(p_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_child public.children%rowtype;
  v_subscription public.subscriptions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_child_id is null then
    raise exception 'Child id is required';
  end if;

  select * into v_child
  from public.children
  where id = p_child_id
    and parent_id = v_user_id
    and is_active
  for update;

  if not found then
    raise exception 'Child not found or not owned by user';
  end if;

  select * into v_subscription
  from public.subscriptions
  where child_id = p_child_id
  for update;

  if found
     and v_subscription.provider = 'paddle'
     and v_subscription.status in ('trialing', 'active', 'past_due', 'paused') then
    raise exception '這位孩子目前仍有付費訂閱，請先到訂閱頁取消，待方案結束後再移除孩子。';
  end if;

  -- A bound checkout may still become an external Paddle subscription. Do not hide the child
  -- until the existing reconciliation path has neutralized that transaction.
  if exists (
    select 1
    from private_generation.founder_checkout_claims
    where child_id = p_child_id
      and status in ('bound', 'release_pending')
  ) or exists (
    select 1
    from private_generation.capacity_checkout_claims
    where child_id = p_child_id
      and status in ('bound', 'release_pending')
  ) then
    raise exception '這位孩子有尚未完成的結帳，請稍後再試；結帳確認完成或取消後才能移除孩子。';
  end if;

  -- Once SMTP transmission has begun the provider outcome may already be irreversible.
  -- Wait for that attempt to settle instead of reporting a clean removal while mail is in flight.
  if exists (
    select 1
    from public.material_email_deliveries
    where child_id = p_child_id
      and sent_at is null
      and status = 'processing'
      and send_started_at is not null
  ) then
    raise exception '這位孩子有一封教材通知正在寄送，請稍後再試。';
  end if;

  -- Unbound pending checkout reservations have no external transaction and can be released
  -- immediately so a duplicate child does not strand Founder/capacity holds.
  update private_generation.founder_checkout_claims
  set status = 'released',
      released_at = now(),
      release_reason = 'superseded'
  where child_id = p_child_id
    and status = 'pending';

  update private_generation.capacity_checkout_claims
  set status = 'released',
      released_at = now(),
      release_reason = 'superseded'
  where child_id = p_child_id
    and status = 'pending';

  -- Free beta access can be ended locally because there is no external recurring charge.
  update public.subscriptions
  set status = 'canceled',
      current_period_end = least(coalesce(current_period_end, now()), now()),
      updated_at = now()
  where child_id = p_child_id
    and provider = 'beta'
    and status <> 'canceled';

  -- Waiting/released capacity no longer belongs to an archived child.
  update public.waitlist
  set status = 'canceled'
  where child_id = p_child_id
    and status in ('waiting', 'released');

  -- Stop work that has not materialized yet. Completed/failed history is deliberately retained.
  update public.generation_jobs
  set status = 'canceled',
      claimed_by = null,
      lease_expires_at = null,
      error_code = 'CHILD_ARCHIVED',
      error_message = null,
      updated_at = now()
  where child_id = p_child_id
    and status in ('pending', 'claimed');

  -- Stop any material notification that has not begun SMTP transmission and revoke every
  -- scoped email link for this child. Historical delivery rows remain for operations/audit.
  update public.material_email_deliveries
  set status = case when sent_at is null then 'dead' else status end,
      claimed_by = case when sent_at is null then null else claimed_by end,
      claim_expires_at = case when sent_at is null then null else claim_expires_at end,
      send_started_at = case when sent_at is null then null else send_started_at end,
      last_error = case
        when sent_at is null then coalesce(last_error, 'Child archived before material email delivery')
        else last_error
      end,
      access_revoked_at = coalesce(access_revoked_at, now()),
      updated_at = now()
  where child_id = p_child_id;

  update public.children
  set is_active = false,
      updated_at = now()
  where id = p_child_id
    and parent_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.archive_owned_child(uuid) from public, anon;
grant execute on function public.archive_owned_child(uuid) to authenticated, service_role;

comment on function public.archive_owned_child(uuid) is
  'Soft-archives an authenticated parent-owned child, blocking live Paddle/bound checkout/in-flight SMTP state while closing reservations, beta/waitlist/unmaterialized generation/email delivery state and preserving history.';

-- The dispatcher must never create or claim a material email for an archived child. This is
-- enforced here as a second line of defense so a completed historical material cannot recreate
-- a delivery row after archive_owned_child has already cleaned existing rows.
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
  join public.children as child on child.id = material.child_id and child.is_active
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
    join public.children as child on child.id = delivery.child_id and child.is_active
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

revoke all on function public.worker_claim_material_email_deliveries(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.worker_claim_material_email_deliveries(text, integer, integer, integer) to service_role;
