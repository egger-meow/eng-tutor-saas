alter table public.children
  add column textbook_version text,
  add column next_generation_at timestamptz;

create table public.child_profiles (
  child_id uuid primary key references public.children (id) on delete cascade,
  baseline_level text,
  reading_level text,
  vocabulary_level text,
  grammar_level text,
  weekly_minutes integer check (weekly_minutes between 0 and 1200),
  learning_goals text check (char_length(learning_goals) <= 2000),
  school_progress text check (char_length(school_progress) <= 2000),
  parent_expectations text check (char_length(parent_expectations) <= 2000),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.child_vocab_progress (
  child_id uuid not null references public.children (id) on delete cascade,
  vocabulary_id text not null check (char_length(vocabulary_id) between 1 and 160),
  status text not null default 'new' check (status in ('new', 'learning', 'reviewing', 'mastered')),
  mastery_score smallint check (mastery_score between 0 and 100),
  exposure_count integer not null default 0 check (exposure_count >= 0),
  correct_count integer not null default 0 check (correct_count between 0 and exposure_count),
  last_seen_at timestamptz,
  last_material_id uuid,
  updated_at timestamptz not null default now(),
  primary key (child_id, vocabulary_id),
  foreign key (last_material_id, child_id)
    references public.materials (id, child_id) on delete set null (last_material_id)
);

create index child_vocab_progress_last_material_idx
  on public.child_vocab_progress (last_material_id, child_id)
  where last_material_id is not null;

create table public.child_grammar_progress (
  child_id uuid not null references public.children (id) on delete cascade,
  grammar_id text not null check (char_length(grammar_id) between 1 and 160),
  status text not null default 'new' check (status in ('new', 'learning', 'reviewing', 'mastered')),
  mastery_score smallint check (mastery_score between 0 and 100),
  exposure_count integer not null default 0 check (exposure_count >= 0),
  correct_count integer not null default 0 check (correct_count between 0 and exposure_count),
  last_seen_at timestamptz,
  last_material_id uuid,
  updated_at timestamptz not null default now(),
  primary key (child_id, grammar_id),
  foreign key (last_material_id, child_id)
    references public.materials (id, child_id) on delete set null (last_material_id)
);

create index child_grammar_progress_last_material_idx
  on public.child_grammar_progress (last_material_id, child_id)
  where last_material_id is not null;

create table public.child_learning_state (
  child_id uuid primary key references public.children (id) on delete cascade,
  comprehension_accuracy numeric(5, 2) check (comprehension_accuracy between 0 and 100),
  difficulty_trend text check (difficulty_trend in ('easier', 'steady', 'harder')),
  recurring_mistakes jsonb not null default '[]'::jsonb check (jsonb_typeof(recurring_mistakes) = 'array'),
  recent_feedback_summary text check (char_length(recent_feedback_summary) <= 4000),
  compact_weekly_history jsonb not null default '[]'::jsonb check (jsonb_typeof(compact_weekly_history) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.feedback
  add column completion_rate smallint check (completion_rate in (0, 25, 50, 75, 100)),
  add column weak_area text check (weak_area in ('vocabulary', 'grammar', 'reading', 'writing', 'mixed')),
  add column mistakes_text text check (char_length(mistakes_text) <= 4000),
  add column child_comments text check (char_length(child_comments) <= 2000),
  add column parent_comments text check (char_length(parent_comments) <= 2000),
  add column school_progress_update text check (char_length(school_progress_update) <= 2000),
  add column interest_update text check (char_length(interest_update) <= 2000),
  add column updated_at timestamptz not null default now();

alter table public.materials
  add column generation_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(generation_summary) = 'object'),
  add column canonical_source jsonb not null default '{}'::jsonb check (jsonb_typeof(canonical_source) = 'object'),
  add column prompt_version text,
  add column generator_version text,
  add column model_name text;

alter table public.subscriptions
  add column provider_customer_id text,
  add column plan_code text,
  add column price_twd integer check (price_twd >= 0),
  add column founding_status text not null default 'none' check (founding_status in ('none', 'eligible', 'redeemed')),
  add column current_period_start timestamptz,
  add column cancel_at_period_end boolean not null default false;

create unique index subscriptions_provider_customer_idx
  on public.subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;

update public.subscriptions
set plan_code = 'beta', price_twd = 0
where provider = 'beta' and plan_code is null;

create table public.enrollment_settings (
  key text primary key default 'default' check (key = 'default'),
  status text not null default 'open' check (status in ('open', 'waitlist', 'closed')),
  capacity integer not null default 100 check (capacity > 0),
  founding_limit integer not null default 30 check (founding_limit between 0 and capacity),
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.enrollment_settings (key) values ('default');

create index feedback_material_child_idx on public.feedback (material_id, child_id);
create index generation_jobs_material_id_idx
  on public.generation_jobs (material_id)
  where material_id is not null;

create function private_generation.create_child_learning_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.child_profiles (child_id) values (new.id);
  insert into public.child_learning_state (child_id) values (new.id);
  return new;
end;
$$;

revoke all on function private_generation.create_child_learning_records()
from public, anon, authenticated;

create trigger create_child_learning_records_after_child
after insert on public.children
for each row execute function private_generation.create_child_learning_records();

insert into public.child_profiles (child_id)
select id from public.children
on conflict (child_id) do nothing;

insert into public.child_learning_state (child_id)
select id from public.children
on conflict (child_id) do nothing;

create function private_generation.prevent_feedback_source_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.child_id is distinct from old.child_id
    or new.material_id is distinct from old.material_id then
    raise exception 'feedback child_id and material_id are immutable';
  end if;
  return new;
end;
$$;

create trigger feedback_prevent_source_change
before update on public.feedback
for each row execute function private_generation.prevent_feedback_source_change();

create trigger child_profiles_touch_updated_at before update on public.child_profiles
for each row execute function private_generation.touch_updated_at();
create trigger child_vocab_progress_touch_updated_at before update on public.child_vocab_progress
for each row execute function private_generation.touch_updated_at();
create trigger child_grammar_progress_touch_updated_at before update on public.child_grammar_progress
for each row execute function private_generation.touch_updated_at();
create trigger child_learning_state_touch_updated_at before update on public.child_learning_state
for each row execute function private_generation.touch_updated_at();
create trigger feedback_touch_updated_at before update on public.feedback
for each row execute function private_generation.touch_updated_at();
create trigger enrollment_settings_touch_updated_at before update on public.enrollment_settings
for each row execute function private_generation.touch_updated_at();

alter table public.child_profiles enable row level security;
alter table public.child_vocab_progress enable row level security;
alter table public.child_grammar_progress enable row level security;
alter table public.child_learning_state enable row level security;
alter table public.enrollment_settings enable row level security;

drop policy children_owner_all on public.children;
create policy children_owner_select on public.children for select to authenticated
using ((select auth.uid()) = parent_id);
create policy children_owner_insert on public.children for insert to authenticated
with check ((select auth.uid()) = parent_id);
create policy children_owner_update on public.children for update to authenticated
using ((select auth.uid()) = parent_id)
with check ((select auth.uid()) = parent_id);

create policy child_profiles_owner_select on public.child_profiles for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = child_profiles.child_id
    and children.parent_id = (select auth.uid())
));
create policy child_profiles_owner_insert on public.child_profiles for insert to authenticated
with check (exists (
  select 1 from public.children
  where children.id = child_profiles.child_id
    and children.parent_id = (select auth.uid())
));
create policy child_profiles_owner_update on public.child_profiles for update to authenticated
using (exists (
  select 1 from public.children
  where children.id = child_profiles.child_id
    and children.parent_id = (select auth.uid())
))
with check (exists (
  select 1 from public.children
  where children.id = child_profiles.child_id
    and children.parent_id = (select auth.uid())
));

create policy child_vocab_progress_owner_select on public.child_vocab_progress for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = child_vocab_progress.child_id
    and children.parent_id = (select auth.uid())
));
create policy child_grammar_progress_owner_select on public.child_grammar_progress for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = child_grammar_progress.child_id
    and children.parent_id = (select auth.uid())
));
create policy child_learning_state_owner_select on public.child_learning_state for select to authenticated
using (exists (
  select 1 from public.children
  where children.id = child_learning_state.child_id
    and children.parent_id = (select auth.uid())
));
create policy enrollment_settings_read on public.enrollment_settings for select
to anon, authenticated using (true);

drop policy feedback_owner_update on public.feedback;
create policy feedback_owner_update on public.feedback for update to authenticated
using (exists (
  select 1 from public.children
  where children.id = feedback.child_id
    and children.parent_id = (select auth.uid())
))
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

drop policy generation_jobs_owner_select on public.generation_jobs;

revoke delete on public.children from authenticated;
revoke all on public.generation_jobs from authenticated;
grant select, insert, update on public.child_profiles to authenticated;
grant select on public.child_vocab_progress, public.child_grammar_progress,
  public.child_learning_state to authenticated;
grant select on public.enrollment_settings to anon, authenticated;
grant all on public.child_profiles, public.child_vocab_progress,
  public.child_grammar_progress, public.child_learning_state,
  public.enrollment_settings to service_role;
