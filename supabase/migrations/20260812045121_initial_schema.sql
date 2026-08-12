create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'paused', 'canceled');
create type public.generation_job_status as enum ('pending', 'claimed', 'completed', 'failed', 'canceled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  grade smallint not null check (grade between 7 and 9),
  timezone text not null default 'Asia/Taipei',
  delivery_weekday smallint not null default 1 check (delivery_weekday between 0 and 6),
  preferences jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index children_parent_id_idx on public.children (parent_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children (id) on delete cascade,
  provider text not null,
  provider_subscription_id text unique,
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  material_week date not null,
  revision integer not null default 1 check (revision > 0),
  rule_version text not null,
  input_snapshot jsonb not null,
  student_pdf_path text not null,
  parent_answer_pdf_path text not null,
  created_at timestamptz not null default now(),
  unique (child_id, material_week, revision),
  unique (id, child_id)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  material_id uuid not null,
  difficulty smallint check (difficulty between 1 and 5),
  minutes_spent integer check (minutes_spent between 0 and 600),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (child_id, material_id),
  foreign key (material_id, child_id)
    references public.materials (id, child_id) on delete restrict
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  material_week date not null,
  rule_version text not null,
  idempotency_key text not null unique,
  status public.generation_job_status not null default 'pending',
  scheduled_for timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  claimed_by text,
  lease_expires_at timestamptz,
  material_id uuid references public.materials (id) on delete set null,
  error_code text,
  error_message text check (char_length(error_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'completed') = (material_id is not null))
);

create index generation_jobs_due_idx
  on public.generation_jobs (scheduled_for, created_at)
  where status in ('pending', 'claimed');
create index generation_jobs_child_id_idx on public.generation_jobs (child_id);

create table public.operational_settings (
  key text primary key,
  integer_value integer not null check (integer_value > 0),
  description text not null,
  updated_at timestamptz not null default now()
);

insert into public.operational_settings (key, integer_value, description)
values ('daily_generation_limit', 15, 'Maximum jobs claimed by one scheduled generation run.');

create schema private_generation;
revoke all on schema private_generation from public, anon, authenticated;

create function private_generation.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private_generation.touch_updated_at();
create trigger children_touch_updated_at before update on public.children
for each row execute function private_generation.touch_updated_at();
create trigger subscriptions_touch_updated_at before update on public.subscriptions
for each row execute function private_generation.touch_updated_at();
create trigger generation_jobs_touch_updated_at before update on public.generation_jobs
for each row execute function private_generation.touch_updated_at();

create function private_generation.create_parent_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

revoke all on function private_generation.create_parent_profile() from public, anon, authenticated;

create trigger create_parent_profile_after_signup
after insert on auth.users
for each row execute function private_generation.create_parent_profile();

create function private_generation.claim_due_generation_jobs(worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_limit integer;
begin
  if worker_id is null or char_length(worker_id) < 3 then
    raise exception 'worker_id is required';
  end if;

  select least(integer_value, 100)
  into claim_limit
  from public.operational_settings
  where key = 'daily_generation_limit';

  if claim_limit is null then
    raise exception 'daily_generation_limit is not configured';
  end if;

  return query
  with due as (
    select job.id
    from public.generation_jobs as job
    join public.children as child on child.id = job.child_id and child.is_active
    join public.subscriptions as subscription
      on subscription.child_id = child.id
      and subscription.status in ('trialing', 'active')
    where job.scheduled_for <= now()
      and job.attempt_count < job.max_attempts
      and (
        job.status = 'pending'
        or (job.status = 'claimed' and job.lease_expires_at < now())
      )
    order by job.scheduled_for, job.created_at
    for update of job skip locked
    limit claim_limit
  )
  update public.generation_jobs as job
  set status = 'claimed',
      claimed_by = worker_id,
      lease_expires_at = now() + interval '45 minutes',
      attempt_count = job.attempt_count + 1,
      error_code = null,
      error_message = null
  from due
  where job.id = due.id
  returning job.*;
end;
$$;

revoke all on function private_generation.claim_due_generation_jobs(text) from public, anon, authenticated;
grant usage on schema private_generation to service_role;
grant execute on function private_generation.claim_due_generation_jobs(text) to service_role;

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.subscriptions enable row level security;
alter table public.materials enable row level security;
alter table public.feedback enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.operational_settings enable row level security;

create policy profiles_owner_select on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_owner_update on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy children_owner_all on public.children for all to authenticated
using ((select auth.uid()) = parent_id) with check ((select auth.uid()) = parent_id);

create policy subscriptions_owner_select on public.subscriptions for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = subscriptions.child_id
    and children.parent_id = (select auth.uid())
));

create policy materials_owner_select on public.materials for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = materials.child_id
    and children.parent_id = (select auth.uid())
));

create policy feedback_owner_select on public.feedback for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = feedback.child_id
    and children.parent_id = (select auth.uid())
));
create policy feedback_owner_insert on public.feedback for insert to authenticated
with check (
  exists (
    select 1 from public.children
    where children.id = feedback.child_id
      and children.parent_id = (select auth.uid())
  )
  and exists (
    select 1 from public.materials
    where materials.id = feedback.material_id
      and materials.child_id = feedback.child_id
  )
);
create policy feedback_owner_update on public.feedback for update to authenticated
using (exists (
  select 1 from public.children
  where children.id = feedback.child_id
    and children.parent_id = (select auth.uid())
))
with check (exists (
  select 1 from public.children
  where children.id = feedback.child_id
    and children.parent_id = (select auth.uid())
));

create policy generation_jobs_owner_select on public.generation_jobs for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = generation_jobs.child_id
    and children.parent_id = (select auth.uid())
));

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant select on public.subscriptions, public.materials, public.generation_jobs to authenticated;
grant select, insert, update on public.feedback to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('weekly-materials', 'weekly-materials', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy weekly_materials_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'weekly-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
