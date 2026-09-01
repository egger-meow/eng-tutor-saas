-- Operational scheduler modes and executor-agnostic authoring helpers.
-- Enables switching between 'local' and 'online' scheduler modes via pg_cron,
-- and exposes active generation lease recovery and inspection to service-role authoring runners.

create table if not exists private_generation.production_operational_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into private_generation.production_operational_settings (key, value)
values ('scheduler_mode', 'local')
on conflict (key) do nothing;

create or replace function public.worker_get_active_generation_leases()
returns jsonb language plpgsql security definer stable set search_path = ''
as $$
declare
  result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'jobId', id,
    'workerId', generation_worker_id,
    'claimedAt', claimed_at,
    'claimExpiresAt', claim_expires_at
  )), '[]'::jsonb)
  into result
  from public.generation_jobs
  where status = 'claimed' and claim_expires_at > now();

  return result;
end;
$$;

create or replace function public.worker_recover_active_authoring_batch(worker_id text)
returns jsonb language sql security definer set search_path = ''
as $$
  select private_generation.chatgpt_recover_claimed_generation_batch($1);
$$;

create or replace function public.worker_get_scheduler_mode()
returns text language plpgsql security definer stable set search_path = ''
as $$
declare
  current_mode text;
begin
  select value into current_mode
  from private_generation.production_operational_settings
  where key = 'scheduler_mode';

  return coalesce(current_mode, 'local');
end;
$$;

create or replace function public.worker_set_scheduler_mode(mode text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(trim(mode));
  existing_job record;
begin
  if normalized not in ('local', 'online') then
    raise exception 'Invalid scheduler mode: % (expected local or online)', mode;
  end if;

  insert into private_generation.production_operational_settings (key, value, updated_at)
  values ('scheduler_mode', normalized, now())
  on conflict (key) do update
  set value = excluded.value, updated_at = now();

  -- Clean up existing daily claim cron job if pg_cron is installed
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for existing_job in
      select jobid from cron.job where jobname = 'paper-english-chatgpt-claim-daily'
    loop
      perform cron.unschedule(existing_job.jobid);
    end loop;

    -- If online, schedule the daily claim
    if normalized = 'online' then
      perform cron.schedule(
        'paper-english-chatgpt-claim-daily',
        '10 16 * * *',
        $cron$select private_generation.chatgpt_claim_generation_batch('chatgpt-work-daily');$cron$
      );
    end if;
  end if;

  return normalized;
end;
$$;

revoke all on function public.worker_get_active_generation_leases() from public, anon, authenticated;
revoke all on function public.worker_recover_active_authoring_batch(text) from public, anon, authenticated;
revoke all on function public.worker_get_scheduler_mode() from public, anon, authenticated;
revoke all on function public.worker_set_scheduler_mode(text) from public, anon, authenticated;

grant execute on function public.worker_get_active_generation_leases() to service_role;
grant execute on function public.worker_recover_active_authoring_batch(text) to service_role;
grant execute on function public.worker_get_scheduler_mode() to service_role;
grant execute on function public.worker_set_scheduler_mode(text) to service_role;

comment on function public.worker_get_active_generation_leases()
is 'Inspects active non-expired claimed generation jobs without mutating DB state.';

comment on function public.worker_recover_active_authoring_batch(text)
is 'Recovers active claimed contexts for the specified worker without advancing state or re-claiming.';

comment on function public.worker_get_scheduler_mode()
is 'Returns the current production scheduler mode (local or online).';

comment on function public.worker_set_scheduler_mode(text)
is 'Switches production scheduler mode between local and online, updating pg_cron accordingly.';
