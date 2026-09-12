-- Migration: Add email tracking to announcements table
-- Tracks whether and when an announcement was broadcast via email to users

alter table public.announcements
  add column if not exists email_sent_at timestamptz null,
  add column if not exists email_sent_count integer not null default 0;

comment on column public.announcements.email_sent_at is 'Timestamp when the announcement was broadcast to users via email';
comment on column public.announcements.email_sent_count is 'Total number of users successfully sent the announcement email';
