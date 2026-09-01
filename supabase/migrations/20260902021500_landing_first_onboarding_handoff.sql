-- Landing-first onboarding handoff.
-- Parents may finish the child questionnaire before authentication. The draft is held
-- privately for a short period and becomes a real child/profile only after the matching
-- email account completes Supabase Magic Link authentication.

create table if not exists private_generation.pending_onboardings (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  normalized_email text not null,
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  terms_version text not null,
  privacy_version text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete set null,
  child_id uuid references public.children(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((consumed_at is null and consumed_by is null and child_id is null)
      or (consumed_at is not null and consumed_by is not null and child_id is not null))
);

create unique index if not exists pending_onboardings_token_hash_uidx
  on private_generation.pending_onboardings (token_hash);

create unique index if not exists pending_onboardings_active_email_uidx
  on private_generation.pending_onboardings (normalized_email)
  where consumed_at is null;

create index if not exists pending_onboardings_expiry_idx
  on private_generation.pending_onboardings (expires_at)
  where consumed_at is null;

revoke all on table private_generation.pending_onboardings from public, anon, authenticated;

create or replace function public.create_pending_onboarding(
  p_email text,
  p_draft jsonb,
  p_terms_version text,
  p_privacy_version text
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

  delete from private_generation.pending_onboardings
  where consumed_at is null and expires_at < now();

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into private_generation.pending_onboardings (
    token_hash,
    normalized_email,
    draft,
    terms_version,
    privacy_version,
    expires_at
  ) values (
    v_token_hash,
    v_email,
    p_draft,
    trim(p_terms_version),
    trim(p_privacy_version),
    now() + interval '2 hours'
  )
  on conflict (normalized_email) where consumed_at is null
  do update set
    token_hash = excluded.token_hash,
    draft = excluded.draft,
    terms_version = excluded.terms_version,
    privacy_version = excluded.privacy_version,
    expires_at = excluded.expires_at,
    updated_at = now();

  return v_token;
end;
$$;

revoke all on function public.create_pending_onboarding(text, jsonb, text, text) from public;
grant execute on function public.create_pending_onboarding(text, jsonb, text, text) to anon, authenticated, service_role;

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

comment on function public.create_pending_onboarding(text, jsonb, text, text) is
  'Stores a short-lived private child-profile draft before Magic Link authentication and returns an opaque one-time handoff token.';
comment on function public.finalize_pending_onboarding(text) is
  'After Magic Link authentication, atomically binds the matching pending onboarding to the authenticated parent and creates the child/profile exactly once, then scrubs the pre-auth PII.';
