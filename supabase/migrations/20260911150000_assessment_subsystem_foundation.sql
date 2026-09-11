-- Forward-only migration: Assessment Subsystem Foundation
-- Tables: assessment_passages, assessment_items, assessment_sessions, assessment_responses, child_assessment_state

-- 1. Passages for reading assessment
create table public.assessment_passages (
  id text primary key,
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 10000),
  word_count integer not null check (word_count > 0),
  grade_band text not null check (grade_band in ('grade_7', 'grade_8', 'grade_9', 'mixed')),
  status text not null default 'active' check (status in ('draft', 'review', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Question bank items
create table public.assessment_items (
  id text primary key,
  domain text not null check (domain in ('vocabulary', 'grammar', 'reading')),
  skill text not null check (skill in (
    'core_vocabulary',
    'contextual_meaning',
    'word_form_usage',
    'basic_sentence_structure',
    'verb_tense_agreement',
    'questions_and_negatives',
    'modifiers_and_relations',
    'complex_structures',
    'explicit_information',
    'main_idea',
    'vocabulary_in_context',
    'inference',
    'information_integration'
  )),
  difficulty smallint not null check (difficulty between 1 and 5),
  grade_band text not null check (grade_band in ('grade_7', 'grade_8', 'grade_9', 'all')),
  response_type text not null check (response_type in ('single_choice', 'short_answer')),
  passage_id text references public.assessment_passages (id) on delete set null,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  choices jsonb check (choices is null or jsonb_typeof(choices) = 'array'),
  correct_choice text check (correct_choice is null or char_length(correct_choice) between 1 and 10),
  accepted_answers jsonb check (accepted_answers is null or jsonb_typeof(accepted_answers) = 'array'),
  analysis_tags text[] not null default '{}'::text[],
  status text not null default 'active' check (status in ('draft', 'review', 'active', 'archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (response_type = 'single_choice' and choices is not null and correct_choice is not null) or
    (response_type = 'short_answer' and accepted_answers is not null)
  )
);

create index assessment_items_skill_difficulty_idx
  on public.assessment_items (domain, skill, difficulty)
  where status = 'active';

create index assessment_items_passage_idx
  on public.assessment_items (passage_id)
  where passage_id is not null;

-- 3. Assessment sessions per child
create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  target_item_count integer not null default 18 check (target_item_count between 10 and 25),
  items_completed integer not null default 0 check (items_completed >= 0),
  max_items integer not null default 25 check (max_items between 15 and 30),
  provisional_state jsonb not null default '{}'::jsonb check (jsonb_typeof(provisional_state) = 'object'),
  final_result jsonb check (final_result is null or jsonb_typeof(final_result) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'completed') = (final_result is not null)),
  check ((status = 'abandoned') = (abandoned_at is not null))
);

create index assessment_sessions_child_status_idx
  on public.assessment_sessions (child_id, status);

create index assessment_sessions_child_created_idx
  on public.assessment_sessions (child_id, created_at desc);

-- 4. Granular responses per item in a session
create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  item_id text not null references public.assessment_items (id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  response_type text not null check (response_type in ('single_choice', 'short_answer')),
  raw_answer text,
  is_skipped boolean not null default false,
  outcome text not null check (outcome in ('correct', 'incorrect', 'skipped')),
  active_response_ms integer check (active_response_ms is null or active_response_ms >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, item_id),
  unique (session_id, sequence_number)
);

create index assessment_responses_session_seq_idx
  on public.assessment_responses (session_id, sequence_number);

create index assessment_responses_child_created_idx
  on public.assessment_responses (child_id, created_at);

-- 5. Compact learner assessment state
create table public.child_assessment_state (
  child_id uuid primary key references public.children (id) on delete cascade,
  last_session_id uuid references public.assessment_sessions (id) on delete set null,
  status text not null default 'completed' check (status in ('pending', 'in_progress', 'completed')),
  skill_results jsonb not null default '{}'::jsonb check (jsonb_typeof(skill_results) = 'object'),
  domain_summaries jsonb not null default '{}'::jsonb check (jsonb_typeof(domain_summaries) = 'object'),
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers for updated_at
create trigger assessment_passages_touch_updated_at
  before update on public.assessment_passages
  for each row execute function private_generation.touch_updated_at();

create trigger assessment_items_touch_updated_at
  before update on public.assessment_items
  for each row execute function private_generation.touch_updated_at();

create trigger assessment_sessions_touch_updated_at
  before update on public.assessment_sessions
  for each row execute function private_generation.touch_updated_at();

create trigger child_assessment_state_touch_updated_at
  before update on public.child_assessment_state
  for each row execute function private_generation.touch_updated_at();

-- Enable Row Level Security
alter table public.assessment_passages enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.child_assessment_state enable row level security;

-- Grants
grant select on public.assessment_passages, public.assessment_items to authenticated;
grant select, insert, update on public.assessment_sessions to authenticated;
grant select, insert on public.assessment_responses to authenticated;
grant select, insert, update on public.child_assessment_state to authenticated;
grant all on public.assessment_passages, public.assessment_items, public.assessment_sessions, public.assessment_responses, public.child_assessment_state to service_role;

-- RLS Policies: Content tables (read-only for authenticated, cannot be modified by ordinary users)
create policy assessment_passages_authenticated_select
  on public.assessment_passages for select to authenticated
  using (status = 'active');

create policy assessment_items_authenticated_select
  on public.assessment_items for select to authenticated
  using (status = 'active');

-- RLS Policies: Session ownership
create policy assessment_sessions_owner_select
  on public.assessment_sessions for select to authenticated
  using (exists (
    select 1 from public.children
    where children.id = assessment_sessions.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy assessment_sessions_owner_insert
  on public.assessment_sessions for insert to authenticated
  with check (exists (
    select 1 from public.children
    where children.id = assessment_sessions.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy assessment_sessions_owner_update
  on public.assessment_sessions for update to authenticated
  using (exists (
    select 1 from public.children
    where children.id = assessment_sessions.child_id
      and children.parent_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.children
    where children.id = assessment_sessions.child_id
      and children.parent_id = (select auth.uid())
  ));

-- RLS Policies: Responses ownership
create policy assessment_responses_owner_select
  on public.assessment_responses for select to authenticated
  using (exists (
    select 1 from public.children
    where children.id = assessment_responses.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy assessment_responses_owner_insert
  on public.assessment_responses for insert to authenticated
  with check (
    exists (
      select 1 from public.children
      where children.id = assessment_responses.child_id
        and children.parent_id = (select auth.uid())
    )
    and exists (
      select 1 from public.assessment_sessions
      where assessment_sessions.id = assessment_responses.session_id
        and assessment_sessions.child_id = assessment_responses.child_id
    )
  );

-- RLS Policies: Child state ownership
create policy child_assessment_state_owner_select
  on public.child_assessment_state for select to authenticated
  using (exists (
    select 1 from public.children
    where children.id = child_assessment_state.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy child_assessment_state_owner_insert
  on public.child_assessment_state for insert to authenticated
  with check (exists (
    select 1 from public.children
    where children.id = child_assessment_state.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy child_assessment_state_owner_update
  on public.child_assessment_state for update to authenticated
  using (exists (
    select 1 from public.children
    where children.id = child_assessment_state.child_id
      and children.parent_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.children
    where children.id = child_assessment_state.child_id
      and children.parent_id = (select auth.uid())
  ));
