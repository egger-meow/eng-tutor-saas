-- Migration: 20260911120000_repair_pilot_capacity_gate_and_dormant_cadence.sql
-- Description:
--   1. Updates private_generation.locked_capacity_count() so dormant Beta learners (> 14 days without parent activity)
--      do not occupy operational capacity during Free Pilot unless holding an actively claimed in-flight job,
--      allowing pre-cutover active seat replacement.
--   2. Updates private_generation.rolling_active_service_child_count() to strictly require real parent touch
--      (last_active_at >= now() - window) without fallback to created_at.
--   3. Updates private_generation.claim_due_generation_jobs() so Week 2+ generation for Beta learners is paused
--      when parent is dormant (> 14 days without activity), resuming immediately once parent activity is touched.
--   4. Updates public.activate_landing_onboarding() to lock enrollment_settings FIRST (canonical lock order).
--   5. Updates public.admin_release_waitlist_children() to preserve Paddle subscriptions (WHERE provider = 'beta')
--      and trigger check_and_execute_free_pilot_cutover() if released children push rolling count to 100.
--   6. Updates public.get_enrollment_state() so total_real_children is counted from public.children (WHERE NOT is_internal_test)
--      and free_pilot_admissions is counted from historical_pilot_admissions.

-- 1. private_generation.locked_capacity_count()
create or replace function private_generation.locked_capacity_count()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_pilot_ended timestamptz;
  v_window interval;
begin
  select
    free_pilot_ended_at,
    (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
  into v_pilot_ended, v_window
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
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    where child.is_active and not child.is_internal_test
      and sub.provider = 'beta' and sub.status = 'trialing'
      and (
        sub.current_period_end is null
        or sub.current_period_end > now()
      )
      and (
        -- While pilot is active: parent is active in rolling window OR child has actively claimed in-flight job
        (
          v_pilot_ended is null
          and (
            (parent_profile.last_active_at is not null and parent_profile.last_active_at >= now() - v_window)
            or exists (
              select 1 from public.generation_jobs as job
              where job.child_id = child.id
                and job.status = 'claimed'
                and job.lease_expires_at > now()
            )
          )
        )
        -- When pilot has ended: only children with in-flight unmaterialized jobs or unexpired trial period
        or (
          v_pilot_ended is not null
          and (
            exists (
              select 1 from public.generation_jobs as job
              where job.child_id = child.id
                and job.created_at <= v_pilot_ended
                and job.status in ('pending', 'claimed')
            )
            or coalesce(sub.current_period_end, sub.created_at + interval '14 days') > now()
          )
        )
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

-- 2. private_generation.rolling_active_service_child_count(interval)
-- Enforces strictly real parent touch (last_active_at >= now() - window) without fallback to created_at
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

-- 3. private_generation.claim_due_generation_jobs(text)
create or replace function private_generation.claim_due_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_limit integer;
  v_pilot_ended timestamptz;
  v_pilot_enabled boolean;
  v_window interval;
begin
  if worker_id is null or char_length(worker_id) < 3 then raise exception 'worker_id is required'; end if;
  select least(integer_value, 100) into claim_limit
  from public.operational_settings where key = 'daily_generation_limit';
  if claim_limit is null then raise exception 'daily_generation_limit is not configured'; end if;

  select
    free_pilot_ended_at,
    coalesce(free_pilot_enabled, true),
    (coalesce(free_pilot_activity_window_days, 14) || ' days')::interval
  into v_pilot_ended, v_pilot_enabled, v_window
  from public.enrollment_settings
  where key = 'default';

  return query
  with mandatory as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    left join public.subscriptions as subscription on subscription.child_id = child.id
    left join public.generation_test_mode_sessions as test_session on test_session.child_id = child.id and test_session.is_enabled
    where (
      -- 1. Internal test child or test mode session
      child.is_internal_test
      or test_session.child_id is not null
      -- 2. Active Paddle subscription
      or (
        subscription.provider = 'paddle'
        and subscription.status in ('trialing', 'active')
      )
      -- 3. Free Pilot Entitlement:
      --    While pilot active: Week 1 always claimable; Week 2+ requires active parent in 14-day rolling window
      --    After cutover: only jobs created <= free_pilot_ended_at for historically admitted children
      or (
        (
          (
            v_pilot_ended is null and v_pilot_enabled
            and (
              exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
              or (subscription.provider = 'beta' and subscription.status in ('trialing', 'active'))
            )
            and (
              job.source_material_id is null
              or (parent_profile.last_active_at is not null and parent_profile.last_active_at >= now() - v_window)
            )
          )
          or (
            v_pilot_ended is not null
            and job.created_at <= v_pilot_ended
            and exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
          )
        )
      )
      -- 4. Unexpired beta trial (Week 1 only for post-pilot children)
      or (
        subscription.provider = 'beta'
        and subscription.status in ('trialing', 'active')
        and coalesce(subscription.current_period_end, subscription.created_at + interval '14 days') > now()
        and job.source_material_id is null
        and not exists (select 1 from public.materials where child_id = job.child_id)
      )
    )
      and (
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at <= now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and (
            active_submission.status in ('pending', 'processing')
            or (active_submission.status = 'technical_failed' and coalesce(active_submission.error_code, '') <> 'RELEASE_MISMATCH')
          )
      )
      and (
        case
          when (child.is_internal_test or test_session.child_id is not null) then
            (job.source_material_id is null or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
            ))
          else
            (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
                and source_feedback.created_at <= job.feedback_cutoff_at
            ))
        end
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
  ), normal as materialized (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.profiles as parent_profile on parent_profile.id = child.parent_id
    left join public.subscriptions as subscription on subscription.child_id = child.id
    left join public.generation_test_mode_sessions as test_session on test_session.child_id = child.id and test_session.is_enabled
    where (
      child.is_internal_test
      or test_session.child_id is not null
      or (
        subscription.provider = 'paddle'
        and subscription.status in ('trialing', 'active')
      )
      or (
        (
          (
            v_pilot_ended is null and v_pilot_enabled
            and (
              exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
              or (subscription.provider = 'beta' and subscription.status in ('trialing', 'active'))
            )
            and (
              job.source_material_id is null
              or (parent_profile.last_active_at is not null and parent_profile.last_active_at >= now() - v_window)
            )
          )
          or (
            v_pilot_ended is not null
            and job.created_at <= v_pilot_ended
            and exists (select 1 from private_generation.historical_pilot_admissions where child_id = child.id)
          )
        )
      )
      or (
        subscription.provider = 'beta'
        and subscription.status in ('trialing', 'active')
        and coalesce(subscription.current_period_end, subscription.created_at + interval '14 days') > now()
        and job.source_material_id is null
        and not exists (select 1 from public.materials where child_id = job.child_id)
      )
    )
      and (
        (child.is_internal_test or test_session.child_id is not null)
        or (job.scheduled_for <= now() and job.generation_due_at > now())
      )
      and job.attempt_count < job.max_attempts
      and (job.status = 'pending' or (job.status = 'claimed' and job.lease_expires_at < now()))
      and not exists (
        select 1 from private_generation.curriculum_submissions as active_submission
        where active_submission.job_id = job.id
          and (
            active_submission.status in ('pending', 'processing')
            or (active_submission.status = 'technical_failed' and coalesce(active_submission.error_code, '') <> 'RELEASE_MISMATCH')
          )
      )
      and (
        case
          when (child.is_internal_test or test_session.child_id is not null) then
            (job.source_material_id is null or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
            ))
          else
            (job.source_material_id is null or job.feedback_cutoff_at <= now() or exists (
              select 1 from public.feedback as source_feedback
              where source_feedback.child_id = job.child_id
                and source_feedback.material_id = job.source_material_id
                and source_feedback.created_at <= job.feedback_cutoff_at
            ))
        end
      )
    order by job.generation_due_at, job.created_at
    for update of job skip locked
    limit greatest(claim_limit - (select count(*)::integer from mandatory), 0)
  ), selected as (
    select id from mandatory union all select id from normal
  )
  update public.generation_jobs as job
  set status = 'claimed', claimed_by = worker_id,
      lease_expires_at = now() + interval '45 minutes',
      attempt_count = job.attempt_count + 1,
      feedback_missing = case
        when exists (select 1 from public.generation_test_mode_sessions s where s.child_id = job.child_id and s.is_enabled)
          or exists (select 1 from public.children c where c.id = job.child_id and c.is_internal_test) then
          (job.source_material_id is not null and not exists (
            select 1 from public.feedback as source_feedback
            where source_feedback.child_id = job.child_id
              and source_feedback.material_id = job.source_material_id
          ))
        else
          not exists (
            select 1 from public.feedback as source_feedback
            where source_feedback.child_id = job.child_id
              and source_feedback.material_id = job.source_material_id
              and source_feedback.created_at <= job.feedback_cutoff_at
          )
      end,
      updated_at = now()
  from selected
  where job.id = selected.id
  returning job.*;
end;
$$;

revoke all on function private_generation.claim_due_generation_jobs(text) from public, anon, authenticated;
grant execute on function private_generation.claim_due_generation_jobs(text) to service_role;

-- 3. public.activate_landing_onboarding(text)
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

  -- Acquire enrollment_settings lock FIRST to ensure canonical lock ordering (enrollment_settings -> profiles)
  perform 1
  from public.enrollment_settings
  where key = 'default'
  for update;

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

-- 4. public.admin_release_waitlist_children(uuid[])
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

      -- Update existing subscription ONLY if provider is 'beta' (preserve Paddle subscriptions)
      update public.subscriptions
      set status = 'trialing',
          current_period_end = case
            when settings.free_pilot_ended_at is null then null
            else now() + interval '14 days'
          end,
          updated_at = now()
      where child_id = v_child_id
        and provider = 'beta';

      if not found and not exists (select 1 from public.subscriptions where child_id = v_child_id) then
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

  -- If children were released, evaluate whether cutover condition is met
  if v_released_now > 0 then
    perform private_generation.check_and_execute_free_pilot_cutover();
  end if;

  return v_released_now;
end;
$$;

revoke all on function public.admin_release_waitlist_children(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_release_waitlist_children(uuid[]) to service_role;

-- 5. public.get_enrollment_state()
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
  free_pilot_admissions integer, -- Historical pilot ledger admissions
  free_pilot_limit integer,      -- Configured free pilot active limit (100)
  rolling_active_count integer,  -- Authoritative rolling 14-day active service children
  operational_occupancy integer, -- Authoritative locked_capacity_count()
  total_real_children integer,   -- Total real children in the database (where not is_internal_test)
  activity_window_days integer,  -- Configured window days (14)
  free_pilot_ended_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  v_occupancy integer;
  v_rolling_active integer;
  v_pilot_admissions integer;
  v_total_real_children integer;
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

  select count(*)::integer into v_pilot_admissions
  from private_generation.historical_pilot_admissions;

  select count(*)::integer into v_total_real_children
  from public.children
  where not is_internal_test;

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
    v_pilot_admissions,   -- free_pilot_admissions
    coalesce(settings.free_pilot_active_limit, 100),
    v_rolling_active,
    v_occupancy,          -- operational_occupancy
    v_total_real_children, -- total_real_children
    coalesce(settings.free_pilot_activity_window_days, 14),
    settings.free_pilot_ended_at;
end;
$$;

revoke all on function public.get_enrollment_state() from public;
grant execute on function public.get_enrollment_state() to anon, authenticated, service_role;
