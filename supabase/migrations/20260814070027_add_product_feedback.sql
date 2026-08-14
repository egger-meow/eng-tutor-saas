create table public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('bug', 'flow', 'materials', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index product_feedback_parent_created_idx
  on public.product_feedback (parent_id, created_at desc);

alter table public.product_feedback enable row level security;

create policy product_feedback_owner_select on public.product_feedback for select to authenticated
using ((select auth.uid()) = parent_id);

create policy product_feedback_owner_insert on public.product_feedback for insert to authenticated
with check ((select auth.uid()) = parent_id);

grant select, insert on public.product_feedback to authenticated;
grant all on public.product_feedback to service_role;
