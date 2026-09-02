-- Guard landing-first onboarding for returning parents.
-- A parent who already owns an active child must explicitly confirm that the landing draft
-- represents another child before the handoff may create an additional child.

alter table private_generation.pending_onboardings
  add column if not exists additional_child_confirmed_at timestamptz,
  add column if not exists additional_child_confirmed_token_hash text;

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

  if v_pending.expires_at < now() then
    raise exception 'Onboarding handoff expired';
  end if;

  if v_pending.normalized_email <> v_auth_email then
    raise exception 'Authenticated email does not match onboarding email';
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
      updated_at = now()
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
        else now()
      end,
      updated_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'Parent profile missing';
  end if;

  update private_generation.pending_onboardings
  set normalized_email = 'consumed:' || v_pending.id::text,
      draft = '{}'::jsonb,
      additional_child_confirmed_at = null,
      additional_child_confirmed_token_hash = null,
      consumed_at = now(),
      consumed_by = v_user_id,
      child_id = v_child_id,
      updated_at = now()
  where id = v_pending.id;

  return v_child_id;
end;
$$;

revoke all on function public.finalize_pending_onboarding(text) from public, anon;
grant execute on function public.finalize_pending_onboarding(text) to authenticated, service_role;

create or replace function public.confirm_additional_child_onboarding(p_token text)
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

  if v_pending.expires_at < now() then
    raise exception 'Onboarding handoff expired';
  end if;

  if v_pending.normalized_email <> v_auth_email then
    raise exception 'Authenticated email does not match onboarding email';
  end if;

  update private_generation.pending_onboardings
  set additional_child_confirmed_at = now(),
      additional_child_confirmed_token_hash = v_token_hash,
      updated_at = now()
  where id = v_pending.id;

  return public.finalize_pending_onboarding(p_token);
end;
$$;

revoke all on function public.confirm_additional_child_onboarding(text) from public, anon;
grant execute on function public.confirm_additional_child_onboarding(text) to authenticated, service_role;

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

  if not found then
    return false;
  end if;

  if v_pending.consumed_at is not null then
    return false;
  end if;

  if v_pending.normalized_email <> v_auth_email then
    raise exception 'Authenticated email does not match onboarding email';
  end if;

  delete from private_generation.pending_onboardings
  where id = v_pending.id;

  return true;
end;
$$;

revoke all on function public.discard_pending_onboarding(text) from public, anon;
grant execute on function public.discard_pending_onboarding(text) to authenticated, service_role;

comment on function public.confirm_additional_child_onboarding(text) is
  'Explicit returning-parent confirmation that the pending landing draft represents another child; finalizes atomically after confirmation.';
comment on function public.discard_pending_onboarding(text) is
  'Lets the authenticated matching parent discard an unconsumed landing onboarding draft without creating a child.';
