create table public.child_communication_progress (
  child_id uuid not null references public.children (id) on delete cascade,
  communication_function_id text not null check (char_length(communication_function_id) between 1 and 160),
  status text not null default 'new' check (status in ('new', 'learning', 'reviewing', 'mastered')),
  exposure_count integer not null default 0 check (exposure_count >= 0),
  assessed_count integer not null default 0 check (assessed_count >= 0 and assessed_count <= exposure_count),
  correct_count integer not null default 0 check (correct_count between 0 and assessed_count),
  miss_count integer not null default 0 check (miss_count >= 0),
  last_seen_at timestamptz,
  next_review_at timestamptz,
  last_material_id uuid,
  updated_at timestamptz not null default now(),
  primary key (child_id, communication_function_id),
  foreign key (last_material_id, child_id)
    references public.materials (id, child_id) on delete set null (last_material_id)
);

create index child_communication_progress_last_material_idx
  on public.child_communication_progress (last_material_id, child_id)
  where last_material_id is not null;

alter table public.child_communication_progress enable row level security;

create policy "Parents can view child communication progress"
  on public.child_communication_progress
  for select
  using (
    exists (
      select 1 from public.children
      where children.id = child_communication_progress.child_id
        and children.parent_id = auth.uid()
    )
  );
