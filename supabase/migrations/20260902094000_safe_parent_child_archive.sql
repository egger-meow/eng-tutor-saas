-- Safe parent-owned child removal.
-- This is a soft archive: historical materials, feedback, and billing records remain intact.
-- Live Paddle billing must be ended by the subscription lifecycle before a child can disappear
-- from the parent UI.

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
  'Soft-archives an authenticated parent-owned child, blocking live Paddle billing while safely closing beta/waitlist/unmaterialized generation state and preserving history.';
