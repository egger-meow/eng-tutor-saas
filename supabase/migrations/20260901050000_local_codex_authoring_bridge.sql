-- Replace Scheduled Work claim staging with service-role-only local Codex runner bridges.
-- Historical ChatGPT bridge functions remain private for provenance and reuse.

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'paper-english-chatgpt-claim-daily'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

create or replace function public.worker_claim_local_authoring_batch(worker_id text)
returns jsonb language sql security definer set search_path = ''
as $$ select private_generation.chatgpt_claim_generation_batch($1); $$;

create or replace function public.worker_submit_local_curriculum_package(p_job_id uuid, p_generation_worker_id text, p_payload_text text)
returns jsonb language sql security definer set search_path = ''
as $$ select private_generation.chatgpt_submit_curriculum_package_v2($1, $2, $3); $$;

create or replace function public.worker_local_curriculum_submission_status(job_id uuid, worker_id text)
returns jsonb language sql security definer stable set search_path = ''
as $$ select private_generation.chatgpt_curriculum_submission_status($1, $2); $$;

create or replace function public.worker_release_local_unsubmitted_claim(job_id uuid, worker_id text, error_code text, error_message text)
returns jsonb language sql security definer set search_path = ''
as $$ select private_generation.chatgpt_release_unsubmitted_claim($1, $2, $3, $4); $$;

revoke all on function public.worker_claim_local_authoring_batch(text) from public, anon, authenticated;
revoke all on function public.worker_submit_local_curriculum_package(uuid, text, text) from public, anon, authenticated;
revoke all on function public.worker_local_curriculum_submission_status(uuid, text) from public, anon, authenticated;
revoke all on function public.worker_release_local_unsubmitted_claim(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.worker_claim_local_authoring_batch(text) to service_role;
grant execute on function public.worker_submit_local_curriculum_package(uuid, text, text) to service_role;
grant execute on function public.worker_local_curriculum_submission_status(uuid, text) to service_role;
grant execute on function public.worker_release_local_unsubmitted_claim(uuid, text, text, text) to service_role;

comment on function public.worker_claim_local_authoring_batch(text)
is 'Service-role-only single authoritative batch claim for the repository-owned local Codex authoring runner.';
