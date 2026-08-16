-- Migration: Enable Founding 30 auto-allocation on trial creation and controlled backfill
--
-- 1. Updates private_generation.create_beta_trial_subscription() with transaction locking
--    on enrollment_settings to prevent race conditions exceeding founding_limit.
-- 2. Controlled backfill for existing trialing subscriptions without exceeding remaining slots.

create or replace function private_generation.create_beta_trial_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.enrollment_settings%rowtype;
  founding_count integer;
  init_founding_status text := 'none';
begin
  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is not null then
    select count(*)::integer into founding_count
    from public.subscriptions
    where founding_status in ('eligible', 'redeemed');

    if founding_count < settings.founding_limit then
      init_founding_status := 'eligible';
    end if;
  end if;

  insert into public.subscriptions (child_id, provider, status, founding_status)
  values (new.id, 'beta', 'trialing', init_founding_status);

  return new;
end;
$$;

-- Controlled backfill for existing trialing subscriptions with founding_status = 'none'
do $$
declare
  settings public.enrollment_settings%rowtype;
  current_founding_count integer;
  available_slots integer;
begin
  select * into settings
  from public.enrollment_settings
  where key = 'default'
  for update;

  if settings.key is not null then
    select count(*)::integer into current_founding_count
    from public.subscriptions
    where founding_status in ('eligible', 'redeemed');

    available_slots := greatest(0, settings.founding_limit - current_founding_count);

    if available_slots > 0 then
      with eligible_candidates as (
        select id
        from public.subscriptions
        where status = 'trialing'
          and founding_status = 'none'
        order by created_at asc
        limit available_slots
      )
      update public.subscriptions
      set founding_status = 'eligible'
      where id in (select id from eligible_candidates);
    end if;
  end if;
end $$;
