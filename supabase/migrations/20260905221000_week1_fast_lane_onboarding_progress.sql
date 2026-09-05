-- Week 1 Fast Lane follow-up: issue progress tokens from trusted onboarding handoffs
-- and correct wake-outbox claim precedence.

create or replace function public.worker_claim_week1_wake_outbox(p_limit integer default 10)
returns table(id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with selected as (
    select outbox.id
    from private_generation.week1_wake_outbox as outbox
    join public.generation_jobs as job on job.id = outbox.job_id
    where (
        outbox.status in ('pending', 'failed')
        or (outbox.status = 'processing' and outbox.processing_lease_expires_at < now())
      )
      and job.source_material_id is null
      and job.material_id is null
      and job.status in ('pending', 'claimed')
    order by outbox.created_at
    for update of outbox skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  )
  update private_generation.week1_wake_outbox as outbox
  set status = 'processing', attempt_count = outbox.attempt_count + 1,
      processing_lease_expires_at = now() + interval '2 minutes', updated_at = now()
  from selected
  where outbox.id = selected.id
  returning outbox.id;
end;
$$;

revoke all on function public.worker_claim_week1_wake_outbox(integer) from public, anon, authenticated;
grant execute on function public.worker_claim_week1_wake_outbox(integer) to service_role;

create or replace function public.worker_issue_week1_progress_token_for_onboarding(p_onboarding_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_child_id uuid;
begin
  if p_onboarding_token is null
     or char_length(trim(p_onboarding_token)) < 32
     or char_length(trim(p_onboarding_token)) > 256 then
    return null;
  end if;

  v_hash := encode(extensions.digest(trim(p_onboarding_token), 'sha256'), 'hex');

  select provisioned_child_id into v_child_id
  from private_generation.pending_onboardings
  where token_hash = v_hash
    and consumed_at is null
    and provisioned_child_id is not null
    and expires_at > now()
  limit 1;

  if v_child_id is null then return null; end if;
  if exists (
    select 1 from public.waitlist
    where child_id = v_child_id and status = 'waiting'
  ) then
    return null;
  end if;

  return public.worker_issue_week1_progress_token(v_child_id);
end;
$$;

revoke all on function public.worker_issue_week1_progress_token_for_onboarding(text)
from public, anon, authenticated;
grant execute on function public.worker_issue_week1_progress_token_for_onboarding(text)
to service_role;
