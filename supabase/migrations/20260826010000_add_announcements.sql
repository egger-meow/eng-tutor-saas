-- Migration: Add Announcements Center Table and RLS
-- Created for authenticated parent announcements and admin authoring

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 200),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 50000),
  category text not null check (category in ('feature', 'material', 'maintenance', 'notice')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to automatically touch updated_at on updates
create trigger announcements_touch_updated_at
  before update on public.announcements
  for each row
  execute function private_generation.touch_updated_at();

-- Index for deterministic published announcement feed: published_at desc, id desc
create index idx_announcements_published
  on public.announcements (published_at desc, id desc)
  where status = 'published' and published_at is not null;

-- Index for admin listing and filtering
create index idx_announcements_status_created
  on public.announcements (status, created_at desc, id desc);

-- Enable Row Level Security
alter table public.announcements enable row level security;

-- Authenticated parents can only select published announcements where published_at <= now()
create policy "Authenticated parents can read published announcements"
  on public.announcements
  for select
  to authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

-- Revoke all permissions from anon
revoke all on public.announcements from anon;

-- Revoke mutating permissions from authenticated
revoke insert, update, delete on public.announcements from authenticated;

-- Grant select to authenticated
grant select on public.announcements to authenticated;
