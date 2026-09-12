-- Migration: Add CTA button text and URL to announcements table
-- Enables custom or default official website action button in announcement emails and detail views

alter table public.announcements
  add column if not exists cta_text text null,
  add column if not exists cta_url text null;

comment on column public.announcements.cta_text is 'Optional action button text for official website link (defaults to 前往紙屬英文官網 in emails)';
comment on column public.announcements.cta_url is 'Optional destination URL for official website action button (defaults to siteUrl in emails)';
