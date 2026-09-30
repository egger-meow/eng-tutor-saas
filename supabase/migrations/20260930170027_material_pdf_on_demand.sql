-- PDF cache orchestration only; canonical publication and historical paths stay immutable.
create table public.material_pdf_settings (
  singleton boolean primary key default true check(singleton),
  renderer_version text not null
);
insert into public.material_pdf_settings values(true, '1.6.1');
alter table public.material_pdf_settings enable row level security;
revoke all on public.material_pdf_settings from public, anon, authenticated;
grant all on public.material_pdf_settings to service_role;

create table public.material_pdf_artifacts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  revision integer not null,
  renderer_version text not null,
  kind text not null check(kind in ('student','parent')),
  state text not null check(state in ('queued','rendering','ready','failed')),
  storage_path text,
  expires_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  byte_size bigint,
  render_ms integer,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(material_id, revision, renderer_version, kind)
);
alter table public.material_pdf_artifacts enable row level security;
revoke all on public.material_pdf_artifacts from public, anon, authenticated;
grant all on public.material_pdf_artifacts to service_role;
create index material_pdf_pending on public.material_pdf_artifacts(requested_at)
  where state in ('queued','rendering');

create function public.request_material_pdf(p_material_id uuid, p_kind text, p_retry boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.materials; a public.material_pdf_artifacts; v_renderer text; v_path text;
begin
  if p_kind not in ('student','parent') or p_kind is null then raise exception 'Invalid output kind'; end if;
  select mat.* into m from public.materials mat
  join public.children c on c.id=mat.child_id and c.parent_id=(select auth.uid())
  join public.generation_jobs j on j.material_id=mat.id and j.child_id=c.id
  where mat.id=p_material_id and j.status='completed' and j.completed_at is not null and j.release_at<=now();
  if m.id is null then raise exception 'Material unavailable' using errcode='42501'; end if;
  if p_kind='parent' and not public.can_open_parent_answer(m.id) then
    raise exception 'Submit material before opening answers' using errcode='42501';
  end if;
  select renderer_version into v_renderer from public.material_pdf_settings where singleton;
  v_path := case when p_kind='student' then m.student_pdf_path else m.parent_answer_pdf_path end;
  -- Reuse inspected published artifacts without re-rendering or expiring history.
  insert into public.material_pdf_artifacts(material_id,revision,renderer_version,kind,state,storage_path)
  values(m.id,m.revision,v_renderer,p_kind,'ready',v_path) on conflict do nothing;
  select * into a from public.material_pdf_artifacts
    where material_id=m.id and revision=m.revision and renderer_version=v_renderer and kind=p_kind for update;
  if (a.state='ready' and a.expires_at<=now()) or (a.state='failed' and p_retry and a.updated_at<now()-interval '30 seconds') then
    update public.material_pdf_artifacts set state='queued',storage_path=null,expires_at=null,
      lease_token=null,lease_until=null,updated_at=now() where id=a.id returning * into a;
  end if;
  return jsonb_build_object('id',a.id,'state',a.state,'path',case when a.state='ready' then a.storage_path end);
end $$;
revoke all on function public.request_material_pdf(uuid,text,boolean) from public,anon;
grant execute on function public.request_material_pdf(uuid,text,boolean) to authenticated;

-- Only a trusted signer may enqueue an object proven absent; stale responses cannot invalidate a new path.
create function public.queue_missing_material_pdf(p_id uuid,p_path text)
returns void language sql security definer set search_path='' as $$
  update public.material_pdf_artifacts set state='queued',storage_path=null,expires_at=null,updated_at=now()
  where id=p_id and state='ready' and storage_path=p_path;
$$;

create function public.claim_material_pdf(p_renderer text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.material_pdf_artifacts; m public.materials;
begin
  -- One serialized claim at a time; skip locked prevents duplicate work across runners.
  if not pg_try_advisory_xact_lock(7265001) then return null; end if;
  if p_renderer is distinct from (select renderer_version from public.material_pdf_settings where singleton) then
    raise exception 'PDF renderer version mismatch';
  end if;
  if exists(select 1 from public.material_pdf_artifacts where state='rendering' and lease_until>now()) then return null; end if;
  select * into a from public.material_pdf_artifacts
  where renderer_version=p_renderer and (state='queued' or (state='rendering' and lease_until<=now()))
  order by requested_at for update skip locked limit 1;
  if a.id is null then return null; end if;
  update public.material_pdf_artifacts set state='rendering',lease_token=gen_random_uuid(),
    lease_until=now()+interval '10 minutes',attempts=attempts+1,updated_at=now()
    where id=a.id returning * into a;
  select * into m from public.materials where id=a.material_id;
  return jsonb_build_object('id',a.id,'leaseToken',a.lease_token,'kind',a.kind,
    'path',m.child_id::text||'/pdf-cache/'||a.id::text||'/'||a.lease_token::text||'.pdf',
    'canonicalSource',m.canonical_source);
end $$;

create function public.finish_material_pdf(p_id uuid,p_lease uuid,p_path text,p_bytes bigint,p_render_ms integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_updated integer; v_expected text;
begin
  select m.child_id::text||'/pdf-cache/'||a.id::text||'/'||a.lease_token::text||'.pdf' into v_expected
  from public.material_pdf_artifacts a join public.materials m on m.id=a.material_id where a.id=p_id;
  if p_path is null or p_path is distinct from v_expected or p_bytes is null or p_bytes<1000
    or p_render_ms is null or p_render_ms<0 then raise exception 'Invalid PDF completion'; end if;
  update public.material_pdf_artifacts set state='ready',storage_path=p_path,expires_at=now()+interval '30 days',
    byte_size=p_bytes,render_ms=p_render_ms,lease_token=null,lease_until=null,updated_at=now()
  where id=p_id and state='rendering' and lease_token=p_lease and lease_until>now();
  get diagnostics v_updated=row_count;
  return v_updated=1;
end $$;

create function public.fail_material_pdf(p_id uuid,p_lease uuid)
returns void language sql security definer set search_path='' as $$
  update public.material_pdf_artifacts set state='failed',lease_token=null,lease_until=null,updated_at=now()
  where id=p_id and state='rendering' and lease_token=p_lease;
$$;
revoke all on function public.queue_missing_material_pdf(uuid,text),public.claim_material_pdf(text),
  public.finish_material_pdf(uuid,uuid,text,bigint,integer),public.fail_material_pdf(uuid,uuid) from public,anon,authenticated;
grant execute on function public.queue_missing_material_pdf(uuid,text),public.claim_material_pdf(text),
  public.finish_material_pdf(uuid,uuid,text,bigint,integer),public.fail_material_pdf(uuid,uuid) to service_role;
