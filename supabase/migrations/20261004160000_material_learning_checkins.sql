-- Material learning checkin table and RPCs for lightweight learning barriers, paper-started self-reports, and quiet dismissals.
-- Restricted to owner parents on released materials.

create table public.material_learning_checkins (
  material_id uuid primary key references public.materials(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  barrier text check (barrier is null or barrier in ('no_time', 'cannot_print', 'too_hard', 'child_not_interested', 'missed_email')),
  paper_started_at timestamptz,
  dismissed_until timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_material_learning_checkins_child on public.material_learning_checkins(child_id, updated_at desc);

alter table public.material_learning_checkins enable row level security;
revoke all on public.material_learning_checkins from public, anon, authenticated;

-- 1. Read checkin
create or replace function public.get_material_learning_checkin(p_material_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_checkin public.material_learning_checkins%rowtype;
begin
  if not exists (
    select 1 from public.materials m
    join public.children c on c.id = m.child_id and c.parent_id = (select auth.uid())
    join public.generation_jobs j on j.material_id = m.id and j.child_id = c.id
    where m.id = p_material_id
      and j.status = 'completed'
      and j.completed_at is not null
      and j.release_at <= now()
  ) then
    return null;
  end if;

  select * into v_checkin from public.material_learning_checkins
  where material_id = p_material_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'barrier', v_checkin.barrier,
    'paper_started_at', v_checkin.paper_started_at,
    'dismissed_until', v_checkin.dismissed_until
  );
end;
$$;

revoke all on function public.get_material_learning_checkin(uuid) from public, anon;
grant execute on function public.get_material_learning_checkin(uuid) to authenticated;

-- 2. Save checkin
create or replace function public.save_material_learning_checkin(
  p_material_id uuid,
  p_action text,
  p_barrier text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_material public.materials%rowtype;
  v_checkin public.material_learning_checkins%rowtype;
begin
  -- Validate material ownership and release status
  select m.* into v_material
  from public.materials m
  join public.children c on c.id = m.child_id and c.parent_id = (select auth.uid())
  join public.generation_jobs j on j.material_id = m.id and j.child_id = c.id
  where m.id = p_material_id
    and j.status = 'completed'
    and j.completed_at is not null
    and j.release_at <= now();

  if not found then
    raise exception 'MATERIAL_NOT_FOUND_OR_FORBIDDEN';
  end if;

  if p_action = 'barrier' then
    if p_barrier is null or p_barrier not in ('no_time', 'cannot_print', 'too_hard', 'child_not_interested', 'missed_email') then
      raise exception 'INVALID_BARRIER';
    end if;

    insert into public.material_learning_checkins (
      material_id, child_id, barrier, updated_at
    ) values (
      p_material_id, v_material.child_id, p_barrier, now()
    )
    on conflict (material_id) do update set
      barrier = excluded.barrier,
      updated_at = now()
    returning * into v_checkin;

  elsif p_action = 'paper_started' then
    -- paper_started is permitted only on historical materials where answer_unlock_requires_submission is false
    if v_material.answer_unlock_requires_submission <> false then
      raise exception 'PAPER_STARTED_NOT_PERMITTED';
    end if;

    insert into public.material_learning_checkins (
      material_id, child_id, paper_started_at, updated_at
    ) values (
      p_material_id, v_material.child_id, now(), now()
    )
    on conflict (material_id) do update set
      paper_started_at = coalesce(material_learning_checkins.paper_started_at, excluded.paper_started_at),
      updated_at = now()
    returning * into v_checkin;

  elsif p_action = 'dismiss' then
    insert into public.material_learning_checkins (
      material_id, child_id, dismissed_until, updated_at
    ) values (
      p_material_id, v_material.child_id, now() + interval '7 days', now()
    )
    on conflict (material_id) do update set
      dismissed_until = now() + interval '7 days',
      updated_at = now()
    returning * into v_checkin;

  else
    raise exception 'INVALID_ACTION';
  end if;

  return jsonb_build_object(
    'barrier', v_checkin.barrier,
    'paper_started_at', v_checkin.paper_started_at,
    'dismissed_until', v_checkin.dismissed_until
  );
end;
$$;

revoke all on function public.save_material_learning_checkin(uuid, text, text) from public, anon;
grant execute on function public.save_material_learning_checkin(uuid, text, text) to authenticated;

comment on table public.material_learning_checkins is
  'Parent checkin observations, historical paper self-reports, and temporary dismissals.';
comment on function public.save_material_learning_checkin(uuid, text, text) is
  'Saves a structured learning barrier, paper started timestamp, or 7-day dismissal.';
