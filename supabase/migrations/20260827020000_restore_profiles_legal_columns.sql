-- Migration: Restore missing public.profiles legal acceptance columns and ensure durable RPC contracts.
-- Fixes production schema drift where 20260816050000 was marked as applied in migration history
-- but public.profiles was missing terms_version, privacy_version, and legal_accepted_at.

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists legal_accepted_at timestamptz;

comment on column public.profiles.terms_version is 'Version identifier of Terms of Service accepted by the parent.';
comment on column public.profiles.privacy_version is 'Version identifier of Privacy Policy accepted by the parent.';
comment on column public.profiles.legal_accepted_at is 'Timestamp when parent accepted the stated legal terms versions.';

-- Ensure durable RPC for recording legal terms acceptance
create or replace function public.accept_legal_terms(
  p_terms_version text,
  p_privacy_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'Authentication required to record legal terms acceptance';
  end if;

  if p_terms_version is null or char_length(trim(p_terms_version)) = 0 then
    raise exception 'p_terms_version is required';
  end if;

  if p_privacy_version is null or char_length(trim(p_privacy_version)) = 0 then
    raise exception 'p_privacy_version is required';
  end if;

  update public.profiles
  set terms_version = trim(p_terms_version),
      privacy_version = trim(p_privacy_version),
      legal_accepted_at = case
        when terms_version is not distinct from trim(p_terms_version)
         and privacy_version is not distinct from trim(p_privacy_version)
         and legal_accepted_at is not null
        then legal_accepted_at
        else now()
      end,
      updated_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.accept_legal_terms(text, text) from public, anon;
grant execute on function public.accept_legal_terms(text, text) to authenticated, service_role;

-- Ensure durable RPC for accept_current_terms
create or replace function public.accept_current_terms(p_terms_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required to accept current Terms';
  end if;

  if trim(coalesce(p_terms_version, '')) <> '2026-08-26-v2' then
    raise exception 'Unsupported Terms version';
  end if;

  update public.profiles
  set terms_version = p_terms_version,
      legal_accepted_at = now(),
      updated_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated, service_role;
