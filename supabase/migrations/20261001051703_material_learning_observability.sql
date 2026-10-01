-- Deliberately separate learning signals from acquisition attribution and private answers.
create table public.material_learning_events (
  material_id uuid not null references public.materials(id) on delete cascade,
  event_name text not null check (event_name in ('material_opened','answer_started','save_failed',
    'material_submitted','feedback_saved','next_requested','student_downloaded','parent_downloaded')),
  origin text not null check (origin in ('browser','server')),
  created_at timestamptz not null default now(),
  primary key (material_id, event_name)
);
create index material_learning_events_created_at on public.material_learning_events(created_at);
alter table public.material_learning_events enable row level security;
revoke all on public.material_learning_events from public, anon, authenticated;
grant select, insert, delete on public.material_learning_events to service_role;

create or replace function public.record_material_learning_event(p_material_id uuid, p_event_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event_name is null or p_event_name not in ('material_opened','answer_started','save_failed',
    'student_downloaded','parent_downloaded') then raise exception 'INVALID_EVENT_NAME'; end if;
  if not exists(select 1 from public.materials m
    join public.children c on c.id=m.child_id and c.parent_id=(select auth.uid())
    join public.generation_jobs j on j.material_id=m.id and j.child_id=c.id
    where m.id=p_material_id and j.status='completed' and j.completed_at is not null
      and j.release_at<=now()) then raise exception 'MATERIAL_NOT_AVAILABLE'; end if;
  if p_event_name='parent_downloaded' and not public.can_open_parent_answer(p_material_id) then
    raise exception 'SUBMISSION_REQUIRED'; end if;
  if exists(select 1 from public.materials m join public.children c on c.id=m.child_id
    where m.id=p_material_id and c.is_internal_test) then return; end if;
  insert into public.material_learning_events(material_id,event_name,origin)
    values(p_material_id,p_event_name,'browser') on conflict do nothing;
end $$;
revoke all on function public.record_material_learning_event(uuid,text) from public, anon;
grant execute on function public.record_material_learning_event(uuid,text) to authenticated;

create or replace function private_generation.record_material_learning_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_material_id uuid; v_event text;
begin
  if tg_table_name='material_generation_requests' then
    v_material_id:=new.source_material_id; v_event:='next_requested';
  elsif tg_table_name='feedback' then
    v_material_id:=new.material_id; v_event:='feedback_saved';
  else v_material_id:=new.material_id; v_event:='material_submitted'; end if;
  if v_material_id is null or exists(select 1 from public.materials m
    join public.children c on c.id=m.child_id where m.id=v_material_id and c.is_internal_test) then return new; end if;
  insert into public.material_learning_events(material_id,event_name,origin)
    values(v_material_id,v_event,'server') on conflict do nothing;
  return new;
end $$;
revoke all on function private_generation.record_material_learning_transition() from public, anon, authenticated;
create trigger material_learning_submission after insert on public.student_material_submissions
  for each row execute function private_generation.record_material_learning_transition();
create trigger material_learning_feedback after insert or update on public.feedback
  for each row execute function private_generation.record_material_learning_transition();
create trigger material_learning_next after insert on public.material_generation_requests
  for each row execute function private_generation.record_material_learning_transition();

-- No backfill: periods before this deployment are unavailable evidence.
create or replace function public.purge_expired_material_learning_events()
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_count bigint;
begin
  delete from public.material_learning_events where created_at < now()-interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.purge_expired_material_learning_events() from public, anon, authenticated;
grant execute on function public.purge_expired_material_learning_events() to service_role;
