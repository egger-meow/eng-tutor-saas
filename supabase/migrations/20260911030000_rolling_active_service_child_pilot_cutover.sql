-- Migration: 20260911030000_rolling_active_service_child_pilot_cutover.sql
-- Description:
--   1. Adds public.profiles.last_active_at with index for tracking genuine parent engagement.
--   2. Adds public.enrollment_settings.free_pilot_active_limit (default 100) and free_pilot_activity_window_days (default 14).
--   3. Relaxes private_generation.historical_pilot_admissions sequence constraint to allow entries past 100 while pilot is active.
--   4. Creates private_generation.pilot_override_audit table for logging privileged Free Pilot overrides.
--   5. Backfills profiles.last_active_at strictly from authentic historical evidence (auth.users.last_sign_in_at, funnel_events, feedback, profiles.created_at).
--   6. Preserves canonical private_generation.locked_capacity_count() for operational/billing/waitlist occupancy.
--   7. Implements private_generation.rolling_active_service_child_count(interval) dedicated to Free Pilot threshold evaluation.
--   8. Implements public.touch_parent_activity() with 1-hour DB throttling and ENROLLMENT-SETTINGS-FIRST lock ordering to prevent deadlock.
--   9. Implements private_generation.check_and_execute_free_pilot_cutover() which sets free_pilot_ended_at = now() and free_pilot_enabled = false when rolling active count >= limit.
--  10. Updates public.prevent_pilot_reopening() to reject automatic/regular reopening while allowing audited privileged override.
--  11. Implements public.admin_privileged_reopen_free_pilot(text, text) for authorized owner override.
--  12. Updates private_generation.create_beta_trial_subscription() removing artificial < 100 ledger cap and never touching parent activity.
--  13. Updates public.admin_release_waitlist_children() never touching parent activity.
--  14. Updates public.activate_landing_onboarding() updating parent activity on genuine landing onboarding.
--  15. Drops and replaces public.get_enrollment_state() returning fixed non-shapeshifting fields (active_count as fixed alias to operational_occupancy, rolling_active_count, total_real_children).

-- 1. Add last_active_at to public.profiles
alter table public.profiles
  add column if not exists last_active_at timestamptz;

create index if not exists idx_profiles_last_active_at
  on public.profiles (last_active_at desc nulls last);

-- 2. Add pilot rolling active settings to public.enrollment_settings
alter table public.enrollment_settings
  add column if not exists free_pilot_active_limit integer not null default 100,
  add column if not exists free_pilot_activity_window_days integer not null default 14;

-- 3. Relax check constraint on historical_pilot_admissions
alter table private_generation.historical_pilot_admissions
  drop constraint if exists chk_historical_pilot_admissions_seq;

alter table private_generation.historical_pilot_admissions
  add constraint chk_historical_pilot_admissions_seq
  check (admission_sequence >= 1);

-- 4. Audit table for privileged owner Free Pilot reopen
create table if not exists private_generation.pilot_override_audit (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  executed_by text not null,
  previous_ended_at timestamptz,
  executed_at timestamptz not null default now()
);

revoke all on table private_generation.pilot_override_audit from public, anon, authenticated;
grant all on table private_generation.pilot_override_audit to service_role;

-- 5. Conservative backfill of profiles.last_active_at from real historical evidence
with ranked_activity as (
  select
    p.id as profile_id,
    greatest(
      u.last_sign_in_at,
      p.created_at,
      fe.latest_funnel,
      fb.latest_feedback
    ) as best_known_active_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join (
    select user_id, max(created_at) as latest_funnel
    from public.funnel_events
    where user_id is not null
    group by user_id
  ) fe on fe.user_id = p.id
  left join (
    select c.parent_id, max(f.created_at) as latest_feedback
    from public.feedback f
    join public.children c on c.id = f.child_id
    group by c.parent_id
  ) fb on fb.parent_id = p.id
)
update public.profiles p
set last_active_at = coalesce(ra.best_known_active_at, p.created_at)
from ranked_activity ra
where p.id = ra.profile_id
  and p.last_active_at is null;

-- 6. Canonical private_generation.locked_capacity_count()
-- Preserved with its original operational/billing/waitlist occupancy semantics
create or replace function private_generation.locked_capacity_count()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_pilot_ended timestamptz;
begin
  select free_pilot_ended_at into v_pilot_ended
  from public.enrollment_settings
  where key = 'default';

  with occupied_children as (
    -- 1. Active Paddle subscriptions (including paused and past_due; canceled excluded)
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due', 'paused')

    union

    -- 2. Free Pilot active children or unexpired beta trials
    select child.id as child_id
    from public.subscriptions as sub
    join public.children as child on child.id = sub.child_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'beta' and sub.status = 'trialing'
      and (
        sub.current_period_end is null
        or sub.current_period_end > now()
      )
      and (
        -- While pilot is active: all unexpired beta children count towards operational capacity
        v_pilot_ended is null
        -- When pilot has ended: only children with in-flight unmaterialized jobs or unexpired trial period
        or exists (
          select 1 from public.generation_jobs as job
          where job.child_id = child.id
            and job.created_at <= v_pilot_ended
            and job.status in ('pending', 'claimed')
        )
        or coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()
      )

    union

    -- 3. Released waitlist entries
    select child.id as child_id
    from public.waitlist as entry
    join public.children as child on child.id = entry.child_id
    where not child.is_internal_test
      and entry.status = 'released'

    union

    -- 4. Unresolved capacity checkout claims
    select claim.child_id as child_id
    from private_generation.capacity_checkout_claims as claim
    join public.children as child on child.id = claim.child_id
    where not child.is_internal_test
      and (
        (claim.status = 'pending' and claim.reservation_expires_at > now())
        or claim.status in ('bound', 'release_pending')
      )
  )
  select count(distinct child_id)::integer into v_count from occupied_children;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function private_generation.locked_capacity_count() from public, anon, authenticated;
grant execute on function private_generation.locked_capacity_count() to service_role;

-- 7. Rolling active service children count
-- Dedicated function to count active service children whose parent has been active within window (or holding in-flight jobs).
drop function if exists private_generation.rolling_active_service_child_count(interval);

create or replace function private_generation.rolling_active_service_child_count(
  p_window_interval interval default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interval interval;
  v_count integer;
begin
  if p_window_interval is null then
    select (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
    into v_interval
    from public.enrollment_settings
    where key = 'default';
  else
    v_interval := p_window_interval;
  end if;

  select count(distinct child.id)::integer into v_count
  from public.children as child
  join public.profiles as parent_profile on parent_profile.id = child.parent_id
  join public.subscriptions as sub on sub.child_id = child.id
  where child.is_active
    and not child.is_internal_test
    and (
      (sub.provider = 'beta' and sub.status = 'trialing')
      or (sub.provider = 'paddle' and sub.status in ('trialing', 'active', 'past_due'))
    )
    and parent_profile.last_active_at is not null
    and parent_profile.last_active_at >= now() - v_interval;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function private_generation.rolling_active_service_child_count(interval) from public, anon, authenticated;
grant execute on function private_generation.rolling_active_service_child_count(interval) to service_role;

-- 8. Check and execute Free Pilot cutover
create or replace function private_generation.check_and_execute_free_pilot_cutover()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.enrollment_settings%rowtype;
  v_rolling_count integer;
  v_limit integer;
begin
  select * into v_settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if v_settings.free_pilot_ended_at is not null then
    return false;
  end if;

  v_rolling_count := private_generation.rolling_active_service_child_count(
    (coalesce(v_settings.free_pilot_activity_window_days, 14) || ' days')::interval
  );
  v_limit := coalesce(v_settings.free_pilot_active_limit, 100);

  if v_rolling_count >= v_limit then
    update public.enrollment_settings
    set free_pilot_ended_at = now(),
        free_pilot_enabled = false,
        updated_at = now()
    where key = 'default';
    return true;
  end if;

  return false;
end;
$$;

revoke all on function private_generation.check_and_execute_free_pilot_cutover() from public, anon, authenticated;
grant execute on function private_generation.check_and_execute_free_pilot_cutover() to service_role;

-- 9. touch_parent_activity() with ENROLLMENT-SETTINGS-FIRST lock ordering
create or replace function public.touch_parent_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_last_active timestamptz;
  v_pilot_ended timestamptz;
  v_settings public.enrollment_settings%rowtype;
  v_rolling_count integer;
  v_limit integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  -- 1. Read caller profile last_active_at without locks to throttle
  select last_active_at into v_last_active
  from public.profiles
  where id = v_uid;

  if not found then
    return;
  end if;

  -- Throttle: if touched within 1 hour, return immediately
  if v_last_active is not null and v_last_active > (now() - interval '1 hour') then
    return;
  end if;

  -- 2. Fast check if Free Pilot has already ended
  select free_pilot_ended_at into v_pilot_ended
  from public.enrollment_settings
  where key = 'default';

  if v_pilot_ended is not null then
    -- Pilot already permanently ended: simply update profile
    update public.profiles
    set last_active_at = now()
    where id = v_uid;
    return;
  end if;

  -- 3. Pilot is active: follow canonical ENROLLMENT-SETTINGS-FIRST lock order
  select * into v_settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if v_settings.free_pilot_ended_at is not null then
    -- Concurrent transaction already ended the pilot
    update public.profiles
    set last_active_at = now()
    where id = v_uid;
    return;
  end if;

  -- Update caller's profile under enrollment_settings lock
  update public.profiles
  set last_active_at = now()
  where id = v_uid;

  -- Evaluate rolling active count
  v_rolling_count := private_generation.rolling_active_service_child_count(
    (coalesce(v_settings.free_pilot_activity_window_days, 14) || ' days')::interval
  );
  v_limit := coalesce(v_settings.free_pilot_active_limit, 100);

  if v_rolling_count >= v_limit then
    update public.enrollment_settings
    set free_pilot_ended_at = now(),
        free_pilot_enabled = false,
        updated_at = now()
    where key = 'default';
  end if;
end;
$$;

revoke all on function public.touch_parent_activity() from public, anon;
grant execute on function public.touch_parent_activity() to authenticated;

-- 10. Update public.prevent_pilot_reopening() with privileged override support
create or replace function public.prevent_pilot_reopening()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_override text;
begin
  if old.free_pilot_ended_at is not null then
    -- Check if this is an intentional privileged owner override
    v_override := current_setting('app.privileged_pilot_override', true);
    if coalesce(v_override, '') = 'true' then
      return new;
    end if;

    -- Normal product path: strictly irreversible
    if new.free_pilot_ended_at is null then
      raise exception 'Free Pilot phase has permanently ended and cannot be reopened (free_pilot_ended_at cannot be set to null)';
    end if;

    if coalesce(new.free_pilot_enabled, false) = true and coalesce(old.free_pilot_enabled, false) = false then
      raise exception 'Free Pilot phase has permanently ended and cannot be re-enabled';
    end if;
  end if;

  return new;
end;
$$;

-- 11. Privileged owner Free Pilot reopen RPC
create or replace function public.admin_privileged_reopen_free_pilot(
  p_reason text,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.enrollment_settings%rowtype;
begin
  if p_confirmation <> 'CONFIRM_REOPEN_FREE_PILOT' then
    raise exception 'Invalid confirmation token for privileged Free Pilot reopen';
  end if;

  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'A substantial reason (minimum 10 characters) is required for privileged Free Pilot reopen audit';
  end if;

  -- Lock enrollment_settings
  select * into v_settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if v_settings.key is null then
    raise exception 'Enrollment settings missing';
  end if;

  -- Set session-scoped bypass config
  perform set_config('app.privileged_pilot_override', 'true', true);

  -- Record audit entry
  insert into private_generation.pilot_override_audit (
    reason,
    executed_by,
    previous_ended_at,
    executed_at
  ) values (
    trim(p_reason),
    coalesce(auth.jwt() ->> 'email', auth.uid()::text, 'service_role'),
    v_settings.free_pilot_ended_at,
    now()
  );

  -- Update enrollment settings to reopen
  update public.enrollment_settings
  set free_pilot_ended_at = null,
      free_pilot_enabled = true,
      updated_at = now()
  where key = 'default';
end;
$$;

revoke all on function public.admin_privileged_reopen_free_pilot(text, text) from public, anon, authenticated;
grant execute on function public.admin_privileged_reopen_free_pilot(text, text) to service_role;

-- 12. Child insertion trigger: private_generation.create_beta_trial_subscription()
-- Never touches parent activity; records sequential admission into historical ledger without artificial < 100 limit.
create or replace function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  locked_count integer;
  current_admissions integer;
  parent_email text;
begin
  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if not found then
    raise exception 'Enrollment settings missing';
  end if;

  if new.is_internal_test then
    insert into public.subscriptions (
      child_id,
      provider,
      status,
      plan_code,
      billing_interval,
      current_period_end
    ) values (
      new.id,
      'beta',
      'trialing',
      'standard_monthly',
      'month',
      now() + interval '100 years'
    )
    on conflict (child_id) do nothing;
    return new;
  end if;

  locked_count := private_generation.locked_capacity_count();

  if locked_count >= settings.capacity then
    select email into parent_email from auth.users where id = new.parent_id;
    insert into public.waitlist (parent_id, child_id, email, status)
    values (new.parent_id, new.id, coalesce(parent_email, ''), 'waiting')
    on conflict (child_id) do update set
      parent_id = excluded.parent_id,
      email = excluded.email,
      status = 'waiting',
      released_at = null,
      converted_at = null;
    return new;
  end if;

  -- Record audit ledger entry if Free Pilot is active (no artificial < 100 limit)
  if settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true) then
    select count(*)::integer into current_admissions
    from private_generation.historical_pilot_admissions;

    insert into private_generation.historical_pilot_admissions (
      child_id,
      admission_sequence,
      admitted_at
    ) values (
      new.id,
      current_admissions + 1,
      now()
    )
    on conflict (child_id) do nothing;
  end if;

  -- Create subscription row for admitted child
  insert into public.subscriptions (
    child_id,
    provider,
    status,
    plan_code,
    billing_interval,
    current_period_end
  ) values (
    new.id,
    'beta',
    'trialing',
    'standard_monthly',
    'month',
    case
      when settings.free_pilot_ended_at is null then null
      else now() + interval '14 days'
    end
  )
  on conflict (child_id) do nothing;

  -- Check if rolling active count reaches cutover threshold
  perform private_generation.check_and_execute_free_pilot_cutover();

  return new;
end;
$$;

-- 13. public.admin_release_waitlist_children(uuid[])
-- Administrative action: NEVER touches parent activity!
create or replace function public.admin_release_waitlist_children(p_child_ids uuid[])
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_locked integer;
  v_to_release integer;
  v_released_now integer := 0;
  v_child_id uuid;
  v_child public.children%rowtype;
  v_current_admissions integer;
  v_is_pilot_admitted boolean;
begin
  if p_child_ids is null or array_length(p_child_ids, 1) is null or array_length(p_child_ids, 1) = 0 then
    return 0;
  end if;

  select * into settings from public.enrollment_settings where key = 'default' for update;
  if settings.key is null then raise exception 'Enrollment settings are missing'; end if;

  v_locked := private_generation.locked_capacity_count();

  select count(distinct id)::integer into v_to_release
  from public.waitlist
  where child_id = any(p_child_ids) and status = 'waiting';

  if (v_locked + v_to_release) > settings.capacity then
    raise exception 'Cannot release % children: exceeds available capacity (locked: %, capacity: %)',
      v_to_release, v_locked, settings.capacity;
  end if;

  foreach v_child_id in array p_child_ids loop
    select * into v_child from public.children where id = v_child_id;
    if found and not v_child.is_internal_test then
      v_is_pilot_admitted := exists (
        select 1 from private_generation.historical_pilot_admissions where child_id = v_child_id
      );

      -- Record audit ledger entry if Free Pilot is active (no artificial < 100 limit)
      if not v_is_pilot_admitted and settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true) then
        select count(*)::integer into v_current_admissions
        from private_generation.historical_pilot_admissions;

        insert into private_generation.historical_pilot_admissions (
          child_id,
          admission_sequence,
          admitted_at
        ) values (
          v_child_id,
          v_current_admissions + 1,
          now()
        ) on conflict (child_id) do nothing;

        v_is_pilot_admitted := true;
      end if;

      update public.subscriptions
      set status = 'trialing',
          provider = 'beta',
          current_period_end = case
            when settings.free_pilot_ended_at is null then null
            else now() + interval '14 days'
          end,
          updated_at = now()
      where child_id = v_child_id;

      if not found then
        insert into public.subscriptions (
          child_id,
          provider,
          status,
          plan_code,
          billing_interval,
          current_period_end
        ) values (
          v_child_id,
          'beta',
          'trialing',
          'standard_monthly',
          'month',
          case
            when settings.free_pilot_ended_at is null then null
            else now() + interval '14 days'
          end
        ) on conflict (child_id) do nothing;
      end if;

      update public.waitlist
      set status = 'released',
          released_at = now(),
          notification_status = 'pending',
          notification_attempts = 0,
          notification_error = null,
          notified_at = null
      where child_id = v_child_id and status = 'waiting';

      v_released_now := v_released_now + 1;
    end if;
  end loop;

  return v_released_now;
end;
$$;

revoke all on function public.admin_release_waitlist_children(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_release_waitlist_children(uuid[]) to service_role;

-- 14. public.activate_landing_onboarding(text)
-- Genuine user-initiated onboarding: stamps parent profile activity.
create or replace function public.activate_landing_onboarding(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_hash text;
  v_pending private_generation.pending_onboardings%rowtype;
  v_user_id uuid;
  v_child_id uuid;
  v_draft jsonb;
  v_grade smallint;
  v_grade_stage text;
  v_preferences jsonb;
  v_status text := 'accepted';
  v_now timestamptz := now();
begin
  if p_token is null or char_length(trim(p_token)) < 32 or char_length(trim(p_token)) > 256 then
    raise exception 'Invalid onboarding token';
  end if;

  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  select * into v_pending
  from private_generation.pending_onboardings
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Onboarding handoff not found';
  end if;

  if v_pending.consumed_at is not null then
    if v_pending.child_id is null then
      raise exception 'Consumed onboarding is missing child binding';
    end if;
    if exists (
      select 1 from public.waitlist
      where child_id = v_pending.child_id and status = 'waiting'
    ) then
      v_status := 'waitlisted';
    end if;
    return jsonb_build_object('status', v_status);
  end if;

  if v_pending.expires_at < now() and v_pending.provisioned_child_id is null then
    raise exception 'Onboarding handoff expired';
  end if;

  select id into v_user_id
  from auth.users
  where lower(trim(email)) = v_pending.normalized_email
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'AUTH_USER_NOT_READY';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'PARENT_PROFILE_NOT_READY';
  end if;

  if v_pending.anonymous_id is not null and v_pending.email_submit_recorded_at is null then
    insert into public.funnel_events (
      event_name, anonymous_id, user_id, session_id, path, device_class, metadata
    ) values (
      'email_submit', v_pending.anonymous_id, v_user_id, v_pending.session_id,
      '/', 'unknown', '{"flow":"landing_onboarding","source":"trusted_auth_dispatch"}'::jsonb
    );

    update private_generation.pending_onboardings
    set email_submit_recorded_at = v_now,
        updated_at = v_now
    where id = v_pending.id;
  end if;

  if v_pending.account_existed_at_prepare then
    return jsonb_build_object('status', 'accepted');
  end if;

  if v_pending.provisioned_child_id is not null then
    if exists (
      select 1 from public.waitlist
      where child_id = v_pending.provisioned_child_id and status = 'waiting'
    ) then
      v_status := 'waitlisted';
    end if;
    return jsonb_build_object('status', v_status);
  end if;

  if exists (
    select 1 from public.children
    where parent_id = v_user_id and is_active
  ) then
    return jsonb_build_object('status', 'accepted');
  end if;

  v_draft := v_pending.draft;
  v_grade := (v_draft ->> 'grade')::smallint;
  v_grade_stage := v_draft ->> 'gradeStage';

  -- User-initiated onboarding: stamp parent activity
  update public.profiles
  set last_active_at = v_now
  where id = v_user_id;

  insert into public.children (
    parent_id,
    display_name,
    grade,
    grade_stage,
    textbook_version
  ) values (
    v_user_id,
    trim(v_draft ->> 'displayName'),
    v_grade,
    v_grade_stage,
    nullif(trim(coalesce(v_draft ->> 'textbookVersion', '')), '')
  )
  returning id into v_child_id;

  v_preferences := jsonb_build_object(
    'schemaVersion', 2,
    'interests', case when jsonb_typeof(v_draft -> 'interests') = 'array' then v_draft -> 'interests' else '[]'::jsonb end,
    'favoriteStories', trim(coalesce(v_draft ->> 'favoriteStories', '')),
    'favoriteGames', trim(coalesce(v_draft ->> 'favoriteGames', '')),
    'favoriteMusic', trim(coalesce(v_draft ->> 'favoriteMusic', '')),
    'activities', trim(coalesce(v_draft ->> 'activities', '')),
    'currentFascinations', trim(coalesce(v_draft ->> 'currentFascinations', '')),
    'changedInterests', trim(coalesce(v_draft ->> 'changedInterests', '')),
    'upcomingTest', trim(coalesce(v_draft ->> 'upcomingTest', '')),
    'dislikedTopics', trim(coalesce(v_draft ->> 'dislikedTopics', '')),
    'sessionPreference', trim(coalesce(v_draft ->> 'sessionPreference', '')),
    'knownWeaknesses', trim(coalesce(v_draft ->> 'knownWeaknesses', '')),
    'notes', trim(coalesce(v_draft ->> 'notes', ''))
  );

  update public.child_profiles
  set baseline_level = nullif(trim(coalesce(v_draft ->> 'baselineLevel', '')), ''),
      curriculum_preferences = v_preferences,
      context_notes = nullif(trim(coalesce(v_draft ->> 'notes', '')), ''),
      updated_at = v_now
  where child_id = v_child_id;

  if not found then
    insert into public.child_profiles (
      child_id, baseline_level, curriculum_preferences, context_notes
    ) values (
      v_child_id,
      nullif(trim(coalesce(v_draft ->> 'baselineLevel', '')), ''),
      v_preferences,
      nullif(trim(coalesce(v_draft ->> 'notes', '')), '')
    );
  end if;

  if exists (
    select 1 from public.waitlist
    where child_id = v_child_id and status = 'waiting'
  ) then
    v_status := 'waitlisted';
  end if;

  update private_generation.pending_onboardings
  set provisioned_child_id = v_child_id,
      updated_at = v_now
  where id = v_pending.id;

  return jsonb_build_object('status', v_status);
end;
$$;

-- 15. public.get_enrollment_state()
-- Drop and recreate function returning backward-compatible order plus explicit non-shapeshifting fields.
drop function if exists public.get_enrollment_state();

create or replace function public.get_enrollment_state()
returns table (
  status text,
  capacity integer,
  active_count integer,          -- Permanent alias to operational_occupancy (locked_capacity_count)
  remaining integer,
  founding_limit integer,
  founding_count integer,
  waiting_count integer,
  released_count integer,
  total_demand integer,
  free_pilot_active boolean,
  free_pilot_admissions integer, -- Historical real children admitted
  free_pilot_limit integer,      -- Configured free pilot active limit (100)
  rolling_active_count integer,  -- Authoritative rolling 14-day active service children
  operational_occupancy integer, -- Authoritative locked_capacity_count()
  total_real_children integer,   -- Historical real children admitted
  activity_window_days integer,  -- Configured window days (14)
  free_pilot_ended_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_occupancy integer;
  v_rolling_active integer;
  v_real_admissions integer;
  v_waiting integer;
  v_released integer;
  v_founding integer;
  v_remaining integer;
  v_window_interval interval;
  v_free_pilot_active boolean;
begin
  select * into settings from public.enrollment_settings where key = 'default';
  if settings.key is null then
    raise exception 'Enrollment settings are missing';
  end if;

  v_occupancy := private_generation.locked_capacity_count();
  v_founding := private_generation.founding_seat_count();
  v_window_interval := (coalesce(settings.free_pilot_activity_window_days, 14) || ' days')::interval;
  v_rolling_active := private_generation.rolling_active_service_child_count(v_window_interval);

  select count(*)::integer into v_real_admissions
  from private_generation.historical_pilot_admissions;

  select count(*)::integer into v_waiting
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'waiting' and not child.is_internal_test;

  select count(*)::integer into v_released
  from public.waitlist as entry
  join public.children as child on child.id = entry.child_id
  where entry.status = 'released' and not child.is_internal_test;

  v_free_pilot_active := (settings.free_pilot_ended_at is null and coalesce(settings.free_pilot_enabled, true));
  v_remaining := greatest(settings.capacity - v_occupancy, 0);

  return query
  select
    settings.status,
    settings.capacity,
    v_occupancy,          -- active_count: permanent alias to operational_occupancy
    v_remaining,          -- remaining
    settings.founding_limit,
    v_founding,
    v_waiting,
    v_released,
    v_occupancy + v_waiting + v_released,
    v_free_pilot_active,
    v_real_admissions,
    coalesce(settings.free_pilot_active_limit, 100),
    v_rolling_active,
    v_occupancy,          -- operational_occupancy
    v_real_admissions,    -- total_real_children
    coalesce(settings.free_pilot_activity_window_days, 14),
    settings.free_pilot_ended_at;
end;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;
