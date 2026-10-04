-- Migration: 20261004140000_material_learning_navigation.sql
-- 1. Material learning navigation table for cross-device & incremental continuation
-- 2. Material learning day signals table for calendar-day answer changes
-- 3. get_material_learning_navigation RPC
-- 4. save_material_learning_navigation RPC
-- 5. Update save_material_draft to record answer_changed day signal
-- 6. Purge function for day signals (90-day retention)

-- 1. Table: material_learning_navigation
create table if not exists public.material_learning_navigation (
  material_id uuid not null references public.materials (id) on delete cascade primary key,
  child_id uuid not null references public.children (id) on delete cascade,
  chapter_id text not null check (chapter_id in ('opening', 'vocabulary', 'reading', 'instruction', 'practice', 'selfcheck', 'homework')),
  question_id text null check (question_id is null or char_length(question_id) <= 128),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_material_learning_navigation_child_mat
  on public.material_learning_navigation (child_id, material_id);

alter table public.material_learning_navigation enable row level security;
revoke all on table public.material_learning_navigation from public, anon, authenticated;
grant select, insert, update, delete on table public.material_learning_navigation to service_role;

comment on table public.material_learning_navigation is
  'Multi-device reading and exercise continuation position. Stores navigation targets only, without answer copies or completion claims.';

-- 2. Table: material_learning_day_signals
create table if not exists public.material_learning_day_signals (
  material_id uuid not null references public.materials (id) on delete cascade,
  signal_date date not null default (now() at time zone 'utc')::date,
  signal_name text not null check (signal_name in ('answer_changed')),
  created_at timestamptz not null default now(),
  primary key (material_id, signal_date, signal_name)
);

create index if not exists idx_material_learning_day_signals_created
  on public.material_learning_day_signals (created_at);

alter table public.material_learning_day_signals enable row level security;
revoke all on table public.material_learning_day_signals from public, anon, authenticated;
grant select, insert, delete on table public.material_learning_day_signals to service_role;

comment on table public.material_learning_day_signals is
  'Privacy-safe UTC date activity signals. Measures cross-day answer edits without storing answers, IPs, or sessions.';

-- 3. RPC: get_material_learning_navigation
create or replace function public.get_material_learning_navigation(p_material_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_nav public.material_learning_navigation%rowtype;
begin
  if not exists (
    select 1 from public.materials m
    join public.children c on c.id = m.child_id and c.parent_id = (select auth.uid())
    join public.generation_jobs j on j.material_id = m.id and j.child_id = c.id
    where m.id = p_material_id and j.status = 'completed'
      and j.completed_at is not null and j.release_at <= now()
  ) then
    return null;
  end if;

  select * into v_nav from public.material_learning_navigation
  where material_id = p_material_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'chapter_id', v_nav.chapter_id,
    'question_id', v_nav.question_id,
    'version', v_nav.version,
    'updated_at', v_nav.updated_at
  );
end;
$$;

revoke all on function public.get_material_learning_navigation(uuid) from public, anon;
grant execute on function public.get_material_learning_navigation(uuid) to authenticated;

-- 4. RPC: save_material_learning_navigation
create or replace function public.save_material_learning_navigation(
  p_material_id uuid,
  p_chapter_id text,
  p_question_id text default null,
  p_client_version bigint default 0
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child_id uuid;
  v_current public.material_learning_navigation%rowtype;
  v_saved public.material_learning_navigation%rowtype;
begin
  if p_chapter_id not in ('opening', 'vocabulary', 'reading', 'instruction', 'practice', 'selfcheck', 'homework') then
    raise exception 'INVALID_CHAPTER_ID';
  end if;
  if p_question_id is not null and char_length(p_question_id) > 128 then
    raise exception 'INVALID_QUESTION_ID';
  end if;
  if p_client_version is null or p_client_version < 0 then
    raise exception 'INVALID_VERSION';
  end if;

  -- Lock material row and verify ownership & release status
  select m.child_id into v_child_id
  from public.materials m
  join public.children c on c.id = m.child_id and c.parent_id = (select auth.uid())
  join public.generation_jobs j on j.material_id = m.id and j.child_id = c.id
  where m.id = p_material_id and j.status = 'completed'
    and j.completed_at is not null and j.release_at <= now()
  for update of m;

  if v_child_id is null then
    raise exception 'MATERIAL_NOT_FOUND_OR_FORBIDDEN';
  end if;

  select * into v_current from public.material_learning_navigation
  where material_id = p_material_id;

  if p_client_version is distinct from coalesce(v_current.version, 0) then
    return jsonb_build_object(
      'success', false,
      'conflict', true,
      'version', coalesce(v_current.version, 0),
      'chapter_id', v_current.chapter_id,
      'question_id', v_current.question_id
    );
  end if;

  insert into public.material_learning_navigation
    (material_id, child_id, chapter_id, question_id, version, updated_at)
  values
    (p_material_id, v_child_id, p_chapter_id, p_question_id, p_client_version + 1, clock_timestamp())
  on conflict (material_id) do update set
    chapter_id = excluded.chapter_id,
    question_id = excluded.question_id,
    version = excluded.version,
    updated_at = excluded.updated_at
  returning * into v_saved;

  return jsonb_build_object(
    'success', true,
    'conflict', false,
    'version', v_saved.version,
    'chapter_id', v_saved.chapter_id,
    'question_id', v_saved.question_id,
    'updated_at', v_saved.updated_at
  );
end;
$$;

revoke all on function public.save_material_learning_navigation(uuid, text, text, bigint) from public, anon;
grant execute on function public.save_material_learning_navigation(uuid, text, text, bigint) to authenticated;

-- 5. Update save_material_draft to record day signal when answers change
create or replace function public.save_material_draft(
  p_material_id uuid,
  p_answers jsonb,
  p_self_check jsonb default '[]'::jsonb,
  p_client_version integer default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child_id uuid;
  v_is_internal_test boolean;
  v_current public.student_material_drafts%rowtype;
  v_saved public.student_material_drafts%rowtype;
begin
  if p_client_version is null or p_client_version < 0
    or jsonb_typeof(p_answers) is distinct from 'object'
    or jsonb_typeof(p_self_check) is distinct from 'array' then
    raise exception 'INVALID_DRAFT_INPUT';
  end if;

  select material.child_id, child.is_internal_test into v_child_id, v_is_internal_test
  from public.materials material
  join public.children child on child.id = material.child_id
    and child.parent_id = (select auth.uid())
  join public.generation_jobs job on job.material_id = material.id
    and job.child_id = child.id
  where material.id = p_material_id and job.status = 'completed'
    and job.completed_at is not null and job.release_at <= now()
  for update of material;

  if v_child_id is null then raise exception 'MATERIAL_NOT_FOUND_OR_FORBIDDEN'; end if;

  select * into v_current from public.student_material_drafts
  where material_id = p_material_id and child_id = v_child_id;

  if p_client_version is distinct from coalesce(v_current.version, 0) then
    return jsonb_build_object('success', false, 'conflict', true,
      'version', coalesce(v_current.version, 0),
      'answers', coalesce(v_current.answers, '{}'::jsonb),
      'self_check', coalesce(v_current.self_check, '[]'::jsonb));
  end if;

  insert into public.student_material_drafts
    (material_id, child_id, answers, self_check, version, updated_at)
  values (p_material_id, v_child_id, p_answers, p_self_check,
    p_client_version + 1, clock_timestamp())
  on conflict (material_id, child_id) do update set
    answers = excluded.answers, self_check = excluded.self_check,
    version = excluded.version, updated_at = excluded.updated_at
  returning * into v_saved;

  -- Record day signal when answers actually changed and not an internal test child
  if (v_current.answers is distinct from p_answers) and not coalesce(v_is_internal_test, false) then
    insert into public.material_learning_day_signals
      (material_id, signal_date, signal_name)
    values
      (p_material_id, (now() at time zone 'utc')::date, 'answer_changed')
    on conflict do nothing;
  end if;

  return jsonb_build_object('success', true, 'conflict', false,
    'version', v_saved.version, 'updated_at', v_saved.updated_at);
end;
$$;

revoke all on function public.save_material_draft(uuid, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_material_draft(uuid, jsonb, jsonb, integer) to authenticated;

-- 6. Purge function for day signals
create or replace function public.purge_expired_material_learning_day_signals()
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_count bigint;
begin
  delete from public.material_learning_day_signals where created_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_expired_material_learning_day_signals() from public, anon, authenticated;
grant execute on function public.purge_expired_material_learning_day_signals() to service_role;
