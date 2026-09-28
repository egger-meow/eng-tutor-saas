-- Migration: 20260929100000_student_material_projection_and_drafts.sql
-- 1. Student material draft table for multi-device autosaved responses
-- 2. Server-authorized student material reading projection RPC (stripping answers and internal artifacts)
-- 3. Material draft query & save RPCs with optimistic concurrency protection

-- ============================================================================
-- 1. Student Material Drafts Table
-- ============================================================================

create table if not exists public.student_material_drafts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  self_check jsonb not null default '[]'::jsonb check (jsonb_typeof(self_check) = 'array'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (material_id, child_id)
);

create index if not exists idx_student_material_drafts_child_mat
  on public.student_material_drafts (child_id, material_id);

alter table public.student_material_drafts enable row level security;

create policy student_material_drafts_select_owner on public.student_material_drafts
  for select to authenticated
  using (child_id in (select id from public.children where parent_id = (select auth.uid())));

create policy student_material_drafts_insert_owner on public.student_material_drafts
  for insert to authenticated
  with check (child_id in (select id from public.children where parent_id = (select auth.uid())));

create policy student_material_drafts_update_owner on public.student_material_drafts
  for update to authenticated
  using (child_id in (select id from public.children where parent_id = (select auth.uid())))
  with check (child_id in (select id from public.children where parent_id = (select auth.uid())));

create policy student_material_drafts_delete_owner on public.student_material_drafts
  for delete to authenticated
  using (child_id in (select id from public.children where parent_id = (select auth.uid())));

revoke all on table public.student_material_drafts from public, anon;
grant select, insert, update, delete on table public.student_material_drafts to authenticated;

comment on table public.student_material_drafts is
  'Persistent student interactive draft responses. Separated from canonical materials to maintain master immutability.';

-- ============================================================================
-- 2. Server-Authorized Student Material Reading Projection
-- ============================================================================

create or replace function public.get_student_material_projection(p_material_id uuid)
returns table (
  material_id uuid,
  child_id uuid,
  child_name text,
  material_week date,
  week_number integer,
  revision integer,
  title text,
  student_lesson jsonb,
  student_pdf_path text,
  release_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_material record;
  v_lesson jsonb;
  v_week_num integer;
  v_title text;
begin
  select
    material.id as m_id,
    material.child_id as c_id,
    child.display_name as c_name,
    material.material_week as m_week,
    material.revision as m_rev,
    material.student_pdf_path as pdf_path,
    material.canonical_source as c_source,
    material.generation_summary as gen_summary,
    job.release_at as rel_at
  into v_material
  from public.materials as material
  join public.children as child on child.id = material.child_id and child.parent_id = (select auth.uid())
  join public.generation_jobs as job on job.material_id = material.id and job.child_id = child.id
  where material.id = p_material_id
    and job.status = 'completed'
    and job.completed_at is not null
    and job.release_at <= now();

  if not found then
    return;
  end if;

  -- Extract week number from canonical metadata or generation summary
  v_week_num := coalesce(
    (v_material.c_source->'metadata'->>'weekNumber')::integer,
    (v_material.gen_summary->>'weekNumber')::integer,
    1
  );

  -- Extract title
  v_title := coalesce(
    v_material.c_source->'metadata'->>'title',
    v_material.gen_summary->>'title',
    '本週英文教材'
  );

  -- Extract student_lesson safely from canonical_source
  -- V2.x production schema uses studentLesson
  if v_material.c_source ? 'studentLesson' then
    v_lesson := v_material.c_source->'studentLesson';
  else
    -- Fallback projection for legacy 1.0 schema
    v_lesson := jsonb_build_object(
      'opening', jsonb_build_object(
        'goalsZh', coalesce(v_material.c_source->'objectives', '[]'::jsonb),
        'howToUseZh', '先閱讀文章與單字，再完成練習與作業。',
        'activity', jsonb_build_object('type', 'direct-reading')
      ),
      'vocabulary', coalesce(v_material.c_source->'vocabulary', '[]'::jsonb),
      'reading', coalesce(v_material.c_source->'reading', '{}'::jsonb),
      'instruction', case
        when v_material.c_source ? 'grammar' then jsonb_build_array(
          jsonb_build_object(
            'id', 'legacy-grammar',
            'titleZh', coalesce(v_material.c_source->'grammar'->>'topic', '文法焦點'),
            'blocks', jsonb_build_array(
              jsonb_build_object('type', 'prose', 'textZh', coalesce(v_material.c_source->'grammar'->>'explanation', ''))
            )
          )
        )
        else '[]'::jsonb
      end,
      'practice', case
        when v_material.c_source ? 'exercises' then (
          select jsonb_agg(
            jsonb_build_object(
              'id', 'exercise-' || (ord - 1)::text,
              'stage', 'guided',
              'titleZh', coalesce(ex->>'title', '練習'),
              'instructionsZh', coalesce(ex->>'instructions', ''),
              'hintZh', null,
              'questions', coalesce(ex->'questions', '[]'::jsonb)
            )
          )
          from jsonb_array_elements(v_material.c_source->'exercises') with ordinality as t(ex, ord)
        )
        else '[]'::jsonb
      end,
      'selfCheckZh', '[]'::jsonb,
      'homework', case
        when v_material.c_source ? 'homework' then jsonb_build_object(
          'purposeZh', coalesce(v_material.c_source->'homework'->>'instructions', '延遲提取作業'),
          'estimatedMinutes', 20,
          'questions', coalesce(v_material.c_source->'homework'->'tasks', '[]'::jsonb)
        )
        else jsonb_build_object('purposeZh', '延遲提取作業', 'estimatedMinutes', 0, 'questions', '[]'::jsonb)
      end
    );
  end if;

  -- Defensively strip any accidental answers or parent keys from the projected lesson
  v_lesson := v_lesson - 'answers' - 'answer' - 'parentSummary' - 'grounding' - 'qualityEvidence';

  return query select
    v_material.m_id,
    v_material.c_id,
    v_material.c_name,
    v_material.m_week,
    v_week_num,
    v_material.m_rev,
    v_title,
    v_lesson,
    v_material.pdf_path,
    v_material.rel_at;
end;
$$;

revoke all on function public.get_student_material_projection(uuid) from public, anon;
grant execute on function public.get_student_material_projection(uuid) to authenticated;

comment on function public.get_student_material_projection(uuid) is
  'Authoritative, answer-stripped student material projection for interactive web reading. Requires child ownership and material release.';

-- ============================================================================
-- 3. Draft Read & Save RPCs
-- ============================================================================

create or replace function public.get_material_draft(p_material_id uuid)
returns table (
  answers jsonb,
  self_check jsonb,
  version integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select draft.answers, draft.self_check, draft.version, draft.updated_at
  from public.student_material_drafts as draft
  join public.materials as material on material.id = draft.material_id
  join public.children as child on child.id = material.child_id and child.parent_id = (select auth.uid())
  join public.generation_jobs as job on job.material_id = material.id and job.child_id = child.id
  where draft.material_id = p_material_id
    and job.status = 'completed'
    and job.completed_at is not null
    and job.release_at <= now();
$$;

revoke all on function public.get_material_draft(uuid) from public, anon;
grant execute on function public.get_material_draft(uuid) to authenticated;

create or replace function public.save_material_draft(
  p_material_id uuid,
  p_answers jsonb,
  p_self_check jsonb default '[]'::jsonb,
  p_client_version integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_child_id uuid;
  v_current_version integer;
  v_current_answers jsonb;
  v_current_self_check jsonb;
  v_new_version integer;
  v_updated_at timestamptz;
begin
  -- Verify ownership and released status
  select material.child_id
  into v_child_id
  from public.materials as material
  join public.children as child on child.id = material.child_id and child.parent_id = (select auth.uid())
  join public.generation_jobs as job on job.material_id = material.id and job.child_id = child.id
  where material.id = p_material_id
    and job.status = 'completed'
    and job.completed_at is not null
    and job.release_at <= now();

  if v_child_id is null then
    raise exception 'MATERIAL_NOT_FOUND_OR_FORBIDDEN';
  end if;

  -- Fetch existing draft if any
  select version, answers, self_check
  into v_current_version, v_current_answers, v_current_self_check
  from public.student_material_drafts
  where material_id = p_material_id and child_id = v_child_id;

  -- Optimistic concurrency check:
  if v_current_version is not null and p_client_version is not null and p_client_version < v_current_version then
    return jsonb_build_object(
      'success', false,
      'conflict', true,
      'version', v_current_version,
      'answers', v_current_answers,
      'self_check', v_current_self_check
    );
  end if;

  v_new_version := coalesce(v_current_version, 0) + 1;
  v_updated_at := clock_timestamp();

  insert into public.student_material_drafts (
    material_id, child_id, answers, self_check, version, updated_at
  ) values (
    p_material_id, v_child_id, coalesce(p_answers, '{}'::jsonb), coalesce(p_self_check, '[]'::jsonb), v_new_version, v_updated_at
  )
  on conflict (material_id, child_id) do update set
    answers = coalesce(excluded.answers, '{}'::jsonb),
    self_check = coalesce(excluded.self_check, '[]'::jsonb),
    version = v_new_version,
    updated_at = v_updated_at;

  return jsonb_build_object(
    'success', true,
    'conflict', false,
    'version', v_new_version,
    'updated_at', v_updated_at
  );
end;
$$;

revoke all on function public.save_material_draft(uuid, jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_material_draft(uuid, jsonb, jsonb, integer) to authenticated;
