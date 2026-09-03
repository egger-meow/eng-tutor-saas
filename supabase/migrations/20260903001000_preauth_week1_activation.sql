-- Trusted pre-auth Week 1 activation for first-time landing onboarding.
--
-- A brand-new Email may provision its first canonical child after the trusted server-side
-- Magic Link dispatch succeeds. Any Email that already existed before preparation remains
-- auth-first. Child insertion deliberately reuses the existing beta/capacity and explicit
-- generation-job triggers; this migration never inserts subscriptions or generation_jobs.

alter table private_generation.pending_onboardings
  add column if not exists account_existed_at_prepare boolean,
  add column if not exists provisioned_child_id uuid references public.children(id) on delete set null,
  add column if not exists preauth_started_at timestamptz,
  add column if not exists anonymous_id text,
  add column if not exists session_id text,
  add column if not exists email_submit_recorded_at timestamptz,
  add column if not exists child_created_recorded_at timestamptz,
  add column if not exists onboarding_complete_recorded_at timestamptz;

-- Existing live handoffs predate the classification snapshot. Fail closed: they keep the
-- previous auth-first behavior and can still finalize normally after authentication.
update private_generation.pending_onboardings
set account_existed_at_prepare = true
where account_existed_at_prepare is null;

alter table private_generation.pending_onboardings
  alter column account_existed_at_prepare set default true,
  alter column account_existed_at_prepare set not null;

alter table private_generation.pending_onboardings
  drop constraint if exists pending_onboardings_anonymous_id_length_check,
  add constraint pending_onboardings_anonymous_id_length_check
    check (anonymous_id is null or (char_length(trim(anonymous_id)) between 1 and 64)),
  drop constraint if exists pending_onboardings_session_id_length_check,
  add constraint pending_onboardings_session_id_length_check
    check (session_id is null or char_length(trim(session_id)) between 1 and 64),
  drop constraint if exists pending_onboardings_provisioned_state_check,
  add constraint pending_onboardings_provisioned_state_check
    check (preauth_started_at is null or provisioned_child_id is not null);

create unique index if not exists pending_onboardings_provisioned_child_uidx
  on private_generation.pending_onboardings (provisioned_child_id)
  where provisioned_child_id is not null;

revoke all on table private_generation.pending_onboardings from public, anon, authenticated;

create or replace function public.prepare_landing_onboarding(
  p_email text,
  p_draft jsonb,
  p_terms_version text,
  p_privacy_version text,
  p_anonymous_id text,
  p_session_id text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_display_name text := trim(coalesce(p_draft ->> 'displayName', ''));
  v_grade integer;
  v_grade_stage text := trim(coalesce(p_draft ->> 'gradeStage', ''));
  v_baseline text := trim(coalesce(p_draft ->> 'baselineLevel', ''));
  v_weekly_minutes integer;
  v_token text;
  v_token_hash text;
  v_account_existed boolean;
  existing private_generation.pending_onboardings%rowtype;
begin
  if char_length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email';
  end if;

  if p_draft is null or jsonb_typeof(p_draft) <> 'object' or pg_column_size(p_draft) > 65536 then
    raise exception 'Invalid onboarding draft';
  end if;

  if char_length(v_display_name) < 1 or char_length(v_display_name) > 80 then
    raise exception 'Invalid child display name';
  end if;

  begin
    v_grade := (p_draft ->> 'grade')::integer;
    v_weekly_minutes := (p_draft ->> 'weeklyMinutes')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Invalid onboarding numeric fields';
  end;

  if v_grade not between 7 and 9
     or v_grade_stage not in ('incoming_grade_7', 'grade_7', 'grade_8', 'grade_9')
     or (v_grade_stage in ('incoming_grade_7', 'grade_7') and v_grade <> 7)
     or (v_grade_stage = 'grade_8' and v_grade <> 8)
     or (v_grade_stage = 'grade_9' and v_grade <> 9) then
    raise exception 'Invalid grade state';
  end if;

  if v_baseline not in ('needs-support', 'developing', 'on-level', 'advanced') then
    raise exception 'Invalid baseline level';
  end if;

  if v_weekly_minutes not between 30 and 240 then
    raise exception 'Invalid weekly minutes';
  end if;

  if char_length(coalesce(p_draft ->> 'learningGoals', '')) > 2000
     or char_length(coalesce(p_draft ->> 'currentChapter', '')) > 2000
     or char_length(coalesce(p_draft ->> 'parentExpectations', '')) > 2000 then
    raise exception 'Onboarding text field too long';
  end if;

  if trim(coalesce(p_terms_version, '')) = '' or char_length(p_terms_version) > 100
     or trim(coalesce(p_privacy_version, '')) = '' or char_length(p_privacy_version) > 100 then
    raise exception 'Invalid legal version';
  end if;

  if nullif(trim(coalesce(p_anonymous_id, '')), '') is null
     or char_length(trim(p_anonymous_id)) > 64 then
    raise exception 'Invalid anonymous id';
  end if;

  if p_session_id is not null
     and (nullif(trim(p_session_id), '') is null or char_length(trim(p_session_id)) > 64) then
    raise exception 'Invalid session id';
  end if;

  -- Expired unprovisioned drafts may be discarded. A provisioned child keeps its binding row
  -- so a later retry can refresh the Magic Link without orphaning the canonical child.
  delete from private_generation.pending_onboardings
  where consumed_at is null
    and provisioned_child_id is null
    and expires_at < now();

  select * into existing
  from private_generation.pending_onboardings
  where normalized_email = v_email
    and consumed_at is null
  for update;

  if found then
    -- Critical retry rule: never reclassify a first-time acquisition merely because a previous
    -- successful Auth dispatch created auth.users before a network-uncertain activation retry.
    v_account_existed := existing.account_existed_at_prepare;
  else
    select exists (
      select 1
      from auth.users
      where lower(trim(email)) = v_email
    ) into v_account_existed;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  if existing.id is not null then
    update private_generation.pending_onboardings as pending
    set token_hash = v_token_hash,
        draft = case when existing.provisioned_child_id is null then p_draft else pending.draft end,
        terms_version = trim(p_terms_version),
        privacy_version = trim(p_privacy_version),
        expires_at = now() + interval '2 hours',
        account_existed_at_prepare = existing.account_existed_at_prepare,
        anonymous_id = trim(p_anonymous_id),
        session_id = nullif(trim(coalesce(p_session_id, '')), ''),
        updated_at = now()
    where id = existing.id;
  else
    insert into private_generation.pending_onboardings (
      token_hash,
      normalized_email,
      draft,
      terms_version,
      privacy_version,
      expires_at,
      account_existed_at_prepare,
      anonymous_id,
      session_id
    ) values (
      v_token_hash,
      v_email,
      p_draft,
      trim(p_terms_version),
      trim(p_privacy_version),
      now() + interval '2 hours',
      v_account_existed,
      trim(p_anonymous_id),
      nullif(trim(coalesce(p_session_id, '')), '')
    );
  end if;

  return v_token;
end;
$$;

revoke all on function public.prepare_landing_onboarding(text, jsonb, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.prepare_landing_onboarding(text, jsonb, text, text, text, text)
to service_role;

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

  -- A concurrent authenticated finalization may win the row lock first. Reuse its child.
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

  -- Email submission is server-authoritative here: activation is called only after the Edge
  -- Function's Auth request succeeded. The browser cannot manufacture this event.
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

  -- Any account that existed before this onboarding request is auth-first. Do not mutate it.
  if v_pending.account_existed_at_prepare then
    return jsonb_build_object('status', 'accepted');
  end if;

  -- Idempotent retry after a successful first-time provision.
  if v_pending.provisioned_child_id is not null then
    if exists (
      select 1 from public.waitlist
      where child_id = v_pending.provisioned_child_id and status = 'waiting'
    ) then
      v_status := 'waitlisted';
    end if;
    return jsonb_build_object('status', v_status);
  end if;

  -- Defensive concurrency guard. If the just-created account has already produced a child via
  -- an authenticated path, do not silently add another one before ownership confirmation.
  if exists (
    select 1 from public.children
    where parent_id = v_user_id and is_active
  ) then
    return jsonb_build_object('status', 'accepted');
  end if;

  v_draft := v_pending.draft;
  v_grade := (v_draft ->> 'grade')::smallint;
  v_grade_stage := v_draft ->> 'gradeStage';

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
      reading_level = nullif(trim(coalesce(v_draft ->> 'readingLevel', '')), ''),
      vocabulary_level = nullif(trim(coalesce(v_draft ->> 'vocabularyLevel', '')), ''),
      grammar_level = nullif(trim(coalesce(v_draft ->> 'grammarLevel', '')), ''),
      weekly_minutes = (v_draft ->> 'weeklyMinutes')::integer,
      learning_goals = coalesce(nullif(trim(coalesce(v_draft ->> 'learningGoals', '')), ''), '建立自主閱讀習慣，穩固國中核心單字與文法能力'),
      school_progress = nullif(trim(coalesce(v_draft ->> 'currentChapter', '')), ''),
      parent_expectations = nullif(trim(coalesce(v_draft ->> 'parentExpectations', '')), ''),
      preferences = v_preferences,
      updated_at = v_now
  where child_id = v_child_id;

  if not found then
    raise exception 'Child profile bootstrap missing';
  end if;

  update public.profiles
  set terms_version = v_pending.terms_version,
      privacy_version = v_pending.privacy_version,
      legal_accepted_at = case
        when terms_version is not distinct from v_pending.terms_version
         and privacy_version is not distinct from v_pending.privacy_version
         and legal_accepted_at is not null
        then legal_accepted_at
        else v_now
      end,
      updated_at = v_now
  where id = v_user_id;

  if not found then
    raise exception 'Parent profile missing';
  end if;

  if exists (
    select 1 from public.waitlist
    where child_id = v_child_id and status = 'waiting'
  ) then
    v_status := 'waitlisted';
  elsif not exists (
    select 1 from public.subscriptions
    where child_id = v_child_id
      and provider = 'beta'
      and status = 'trialing'
  ) then
    raise exception 'First-time child missing beta or waitlist state';
  elsif not exists (
    select 1 from public.generation_jobs
    where child_id = v_child_id
      and source_material_id is null
      and status in ('pending', 'claimed', 'completed')
  ) then
    raise exception 'First-time child missing initial generation job';
  end if;

  if v_pending.anonymous_id is not null then
    insert into public.funnel_events (
      event_name, anonymous_id, user_id, child_id, session_id, path, device_class, metadata
    ) values
      ('child_created', v_pending.anonymous_id, v_user_id, v_child_id, v_pending.session_id,
       '/', 'unknown', '{"flow":"landing_onboarding","preauth":true}'::jsonb),
      ('onboarding_complete', v_pending.anonymous_id, v_user_id, v_child_id, v_pending.session_id,
       '/', 'unknown', '{"flow":"landing_onboarding","preauth":true}'::jsonb);
  end if;

  update private_generation.pending_onboardings
  set provisioned_child_id = v_child_id,
      preauth_started_at = v_now,
      draft = '{}'::jsonb,
      child_created_recorded_at = case when anonymous_id is null then null else v_now end,
      onboarding_complete_recorded_at = case when anonymous_id is null then null else v_now end,
      updated_at = v_now
  where id = v_pending.id;

  return jsonb_build_object('status', v_status);
end;
$$;

revoke all on function public.activate_landing_onboarding(text)
from public, anon, authenticated;
grant execute on function public.activate_landing_onboarding(text)
to service_role;

create or replace function public.finalize_pending_onboarding(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_auth_email text;
  v_token_hash text;
  v_pending private_generation.pending_onboardings%rowtype;
  v_draft jsonb;
  v_child_id uuid;
  v_grade smallint;
  v_grade_stage text;
  v_preferences jsonb;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_token is null or char_length(trim(p_token)) < 32 or char_length(trim(p_token)) > 256 then
    raise exception 'Invalid onboarding token';
  end if;

  select lower(trim(email)) into v_auth_email
  from auth.users
  where id = v_user_id;

  if v_auth_email is null then
    raise exception 'Authenticated email not found';
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
    if v_pending.consumed_by = v_user_id and v_pending.child_id is not null then
      return v_pending.child_id;
    end if;
    raise exception 'Onboarding handoff already used';
  end if;

  if v_pending.expires_at < now() and v_pending.provisioned_child_id is null then
    raise exception 'Onboarding handoff expired';
  end if;

  if v_pending.normalized_email <> v_auth_email then
    raise exception 'Authenticated email does not match onboarding email';
  end if;

  -- Brand-new first-time onboarding may already own a canonical child because trusted Email
  -- dispatch started Week 1. Authentication only binds/cleans the handoff and never recreates it.
  if v_pending.provisioned_child_id is not null then
    if not exists (
      select 1 from public.children
      where id = v_pending.provisioned_child_id
        and parent_id = v_user_id
    ) then
      raise exception 'Provisioned child does not belong to authenticated user';
    end if;

    update public.profiles
    set terms_version = v_pending.terms_version,
        privacy_version = v_pending.privacy_version,
        legal_accepted_at = coalesce(legal_accepted_at, v_now),
        updated_at = v_now
    where id = v_user_id;

    update private_generation.pending_onboardings
    set normalized_email = 'consumed:' || v_pending.id::text,
        draft = '{}'::jsonb,
        additional_child_confirmed_at = null,
        additional_child_confirmed_token_hash = null,
        consumed_at = v_now,
        consumed_by = v_user_id,
        child_id = v_pending.provisioned_child_id,
        updated_at = v_now
    where id = v_pending.id;

    return v_pending.provisioned_child_id;
  end if;

  if exists (
    select 1
    from public.children
    where parent_id = v_user_id
      and is_active
  ) and v_pending.additional_child_confirmed_token_hash is distinct from v_token_hash then
    raise exception 'ADDITIONAL_CHILD_CONFIRMATION_REQUIRED';
  end if;

  v_draft := v_pending.draft;
  v_grade := (v_draft ->> 'grade')::smallint;
  v_grade_stage := v_draft ->> 'gradeStage';

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
      reading_level = nullif(trim(coalesce(v_draft ->> 'readingLevel', '')), ''),
      vocabulary_level = nullif(trim(coalesce(v_draft ->> 'vocabularyLevel', '')), ''),
      grammar_level = nullif(trim(coalesce(v_draft ->> 'grammarLevel', '')), ''),
      weekly_minutes = (v_draft ->> 'weeklyMinutes')::integer,
      learning_goals = coalesce(nullif(trim(coalesce(v_draft ->> 'learningGoals', '')), ''), '建立自主閱讀習慣，穩固國中核心單字與文法能力'),
      school_progress = nullif(trim(coalesce(v_draft ->> 'currentChapter', '')), ''),
      parent_expectations = nullif(trim(coalesce(v_draft ->> 'parentExpectations', '')), ''),
      preferences = v_preferences,
      updated_at = v_now
  where child_id = v_child_id;

  if not found then
    raise exception 'Child profile bootstrap missing';
  end if;

  update public.profiles
  set terms_version = v_pending.terms_version,
      privacy_version = v_pending.privacy_version,
      legal_accepted_at = case
        when terms_version is not distinct from v_pending.terms_version
         and privacy_version is not distinct from v_pending.privacy_version
         and legal_accepted_at is not null
        then legal_accepted_at
        else v_now
      end,
      updated_at = v_now
  where id = v_user_id;

  if not found then
    raise exception 'Parent profile missing';
  end if;

  -- Existing Auth accounts remain auth-first. Once they actually create a first/additional child,
  -- record the child acquisition from the private attribution snapshot, not from browser claims.
  if v_pending.anonymous_id is not null then
    if v_pending.email_submit_recorded_at is null then
      insert into public.funnel_events (
        event_name, anonymous_id, user_id, session_id, path, device_class, metadata
      ) values (
        'email_submit', v_pending.anonymous_id, v_user_id, v_pending.session_id,
        '/', 'unknown', '{"flow":"landing_onboarding","source":"authenticated_finalize"}'::jsonb
      );
    end if;

    if v_pending.child_created_recorded_at is null then
      insert into public.funnel_events (
        event_name, anonymous_id, user_id, child_id, session_id, path, device_class, metadata
      ) values (
        'child_created', v_pending.anonymous_id, v_user_id, v_child_id, v_pending.session_id,
        '/', 'unknown', '{"flow":"landing_onboarding","preauth":false}'::jsonb
      );
    end if;

    if v_pending.onboarding_complete_recorded_at is null then
      insert into public.funnel_events (
        event_name, anonymous_id, user_id, child_id, session_id, path, device_class, metadata
      ) values (
        'onboarding_complete', v_pending.anonymous_id, v_user_id, v_child_id, v_pending.session_id,
        '/', 'unknown', '{"flow":"landing_onboarding","preauth":false}'::jsonb
      );
    end if;
  end if;

  update private_generation.pending_onboardings
  set normalized_email = 'consumed:' || v_pending.id::text,
      draft = '{}'::jsonb,
      additional_child_confirmed_at = null,
      additional_child_confirmed_token_hash = null,
      email_submit_recorded_at = case
        when anonymous_id is null then email_submit_recorded_at
        else coalesce(email_submit_recorded_at, v_now)
      end,
      child_created_recorded_at = case
        when anonymous_id is null then child_created_recorded_at
        else coalesce(child_created_recorded_at, v_now)
      end,
      onboarding_complete_recorded_at = case
        when anonymous_id is null then onboarding_complete_recorded_at
        else coalesce(onboarding_complete_recorded_at, v_now)
      end,
      consumed_at = v_now,
      consumed_by = v_user_id,
      child_id = v_child_id,
      updated_at = v_now
  where id = v_pending.id;

  return v_child_id;
end;
$$;

revoke all on function public.finalize_pending_onboarding(text) from public, anon;
grant execute on function public.finalize_pending_onboarding(text) to authenticated, service_role;

-- Do not allow the authenticated discard path to orphan a child that trusted pre-auth activation
-- already provisioned. The confirmation UI only discards auth-first returning-parent drafts.
create or replace function public.discard_pending_onboarding(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_auth_email text;
  v_token_hash text;
  v_pending private_generation.pending_onboardings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_token is null or char_length(trim(p_token)) < 32 or char_length(trim(p_token)) > 256 then
    raise exception 'Invalid onboarding token';
  end if;

  select lower(trim(email)) into v_auth_email
  from auth.users
  where id = v_user_id;

  if v_auth_email is null then
    raise exception 'Authenticated email not found';
  end if;

  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  select * into v_pending
  from private_generation.pending_onboardings
  where token_hash = v_token_hash
  for update;

  if not found or v_pending.consumed_at is not null then
    return false;
  end if;

  if v_pending.normalized_email <> v_auth_email then
    raise exception 'Authenticated email does not match onboarding email';
  end if;

  if v_pending.provisioned_child_id is not null then
    return false;
  end if;

  delete from private_generation.pending_onboardings
  where id = v_pending.id;

  return true;
end;
$$;

revoke all on function public.discard_pending_onboarding(text) from public, anon;
grant execute on function public.discard_pending_onboarding(text) to authenticated, service_role;

comment on function public.prepare_landing_onboarding(text, jsonb, text, text, text, text) is
  'Service-only preparation for landing onboarding. Snapshots pre-existing-account state before Auth dispatch and returns an opaque token.';
comment on function public.activate_landing_onboarding(text) is
  'Service-only idempotent activation after trusted Magic Link dispatch. New accounts enter the canonical child/beta/capacity/Week-1 pipeline; pre-existing accounts remain auth-first.';
