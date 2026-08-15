-- Fix Week 1 delivery timing: release_at must be the next calendar day,
-- not the registration moment.
--
-- Root cause: enqueue_initial_generation_job() set release_at = now(),
-- promising same-day delivery when the sole curriculum author (ChatGPT
-- Scheduled Work) runs at ~00:15 Asia/Taipei the next day.
--
-- After this fix:
--   release_at       = next calendar day 00:00 in child timezone (local date anchor)
--   generation_due_at = release_at - 24h (via existing CHECK constraint)
--   feedback_cutoff_at = release_at - 48h (via existing CHECK constraint)
--     * Note: For Week 1, feedback_cutoff_at is an invariant-derived placeholder
--       and does not represent an actionable parent feedback deadline because no
--       prior material exists.
--   scheduled_for    = date_trunc('second', now()) (claimable immediately)
--   material_week    = next calendar day date in child timezone
--
-- Claim eligibility at the next 00:15 Scheduled task:
--   scheduled_for = now() <= clock  ✓ always claimable by the next 00:15 run
--   generation_due_at = today 00:00 in child TZ (which is <= next day 00:15)
--   and scheduled_for <= now() so the job is eligible for the next authoring run ✓

create or replace function private_generation.enqueue_initial_generation_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  child_tz text;
  local_now timestamp;
  next_day_local date;
  release_anchor timestamptz;
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

  -- Resolve the child's configured timezone (default Asia/Taipei)
  select coalesce(child.timezone, 'Asia/Taipei')
  into child_tz
  from public.children as child
  where child.id = new.child_id and child.is_active;

  if child_tz is null then
    return new;
  end if;

  -- Compute the next calendar day in the child's local timezone
  local_now := now() at time zone child_tz;
  next_day_local := (local_now::date) + 1;
  first_material_week := next_day_local;

  -- Release anchor: next calendar day 00:00 local time, converted to UTC
  release_anchor := (next_day_local::timestamp) at time zone child_tz;

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
    date_trunc('second', now()),  -- claimable immediately
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
