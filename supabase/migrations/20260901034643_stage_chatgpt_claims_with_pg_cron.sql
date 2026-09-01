-- Stage the authoritative chatgpt-work-daily claim inside Postgres before
-- Scheduled Work starts. This removes the production claim mutation from the
-- generic Supabase execute_sql connector action.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'paper-english-chatgpt-claim-daily'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

-- pg_cron uses UTC here: 16:10 UTC = 00:10 Asia/Taipei.
-- Scheduled Work starts at 00:15 Asia/Taipei and only performs the read-only
-- recovery call from 20260901034142.
select cron.schedule(
  'paper-english-chatgpt-claim-daily',
  '10 16 * * *',
  $cron$select private_generation.chatgpt_claim_generation_batch('chatgpt-work-daily');$cron$
);
