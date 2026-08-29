-- Scheduled Work bridge 1.3.0: claim is the availability boundary and submit-v2
-- owns JSON transport parsing. The existing jsonb submit RPC remains available
-- for backwards compatibility.

create or replace function private_generation.chatgpt_claim_generation_batch(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  generation_context jsonb;
  retry_context jsonb;
  fingerprint text;
  claimed_contexts jsonb := '[]'::jsonb;
  normal_limit integer;
  oldest_deadline timestamptz;
begin
  if worker_id is null or char_length(worker_id) < 3 then
    raise exception 'worker_id is required';
  end if;

  select integer_value into normal_limit
  from public.operational_settings
  where key = 'daily_generation_limit';

  for claimed_job in
    select * from private_generation.claim_due_generation_jobs(worker_id)
  loop
    update public.generation_jobs
    set lease_expires_at = now() + interval '6 hours'
    where id = claimed_job.id
      and status = 'claimed'
      and claimed_by = worker_id;

    generation_context := public.worker_generation_context(claimed_job.id, worker_id)
      || jsonb_build_object(
        'qualityTrends', public.worker_quality_trends(claimed_job.child_id),
        'targetReleaseId', 'rel_1.4.0'
      );

    select jsonb_build_object(
      'previousAttemptNumber', submission.authoring_attempt,
      'previousCanonicalPackage', submission.canonical_source,
      'failureType', submission.error_code,
      'findings', coalesce(submission.failure_evidence -> 'findings', '[]'::jsonb),
      'failureEvidence', coalesce(submission.failure_evidence, '{}'::jsonb),
      'repairInstructions', jsonb_build_array(
        'Do not regenerate the entire lesson unless dependency changes require it.',
        'Preserve already-approved content.',
        'Preserve stable question IDs and target mappings when possible.',
        'Repair only rejected sections plus dependent fragments.',
        'Update answers and tracking references when a changed question requires it.',
        'Do not repeat plan or author work that is already valid.'
      )
    ) into retry_context
    from private_generation.curriculum_submissions as submission
    where submission.job_id = claimed_job.id
      and submission.status = 'quality_rejected'
    order by submission.authoring_attempt desc
    limit 1;

    if retry_context is not null then
      generation_context := generation_context || jsonb_build_object('retryContext', retry_context);
    end if;

    fingerprint := 'sha256:' || encode(
      extensions.digest(convert_to(generation_context::text, 'UTF8'), 'sha256'),
      'hex'
    );

    insert into private_generation.generation_claim_snapshots (
      job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
    ) values (
      claimed_job.id, worker_id, generation_context, fingerprint, now()
    )
    on conflict (job_id) do update
    set generation_worker_id = excluded.generation_worker_id,
        generation_context = excluded.generation_context,
        input_fingerprint = excluded.input_fingerprint,
        claimed_at = excluded.claimed_at;

    claimed_contexts := claimed_contexts || jsonb_build_array(
      generation_context || jsonb_build_object('inputFingerprint', fingerprint)
    );
  end loop;

  select min(job.generation_due_at) into oldest_deadline
  from public.generation_jobs as job
  where job.status in ('pending', 'claimed', 'failed')
    and job.completed_at is null;

  return jsonb_build_object(
    'bridgeVersion', '1.3.0',
    'claimed', claimed_contexts,
    'claimedCount', jsonb_array_length(claimed_contexts),
    'normalCapacity', normal_limit,
    'mandatoryCapacityOverride', jsonb_array_length(claimed_contexts) > coalesce(normal_limit, 0),
    'oldestOutstandingDeadline', oldest_deadline
  );
end;
$$;

revoke all on function private_generation.chatgpt_claim_generation_batch(text)
from public, anon, authenticated, service_role;

create function private_generation.chatgpt_submit_curriculum_package_v2(
  p_job_id uuid,
  p_generation_worker_id text,
  p_payload_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  parsed_payload jsonb;
begin
  begin
    parsed_payload := p_payload_text::jsonb;
  exception
    when invalid_text_representation then
      return jsonb_build_object(
        'accepted', false,
        'persisted', false,
        'errorCode', 'INVALID_JSON_PAYLOAD',
        'retryable', true
      );
  end;

  return private_generation.chatgpt_submit_curriculum_package(
    p_job_id,
    p_generation_worker_id,
    parsed_payload
  );
end;
$$;

comment on function private_generation.chatgpt_submit_curriculum_package_v2(uuid, text, text)
is 'Controlled Scheduled Work submission bridge. Parses JSON text inside PL/pgSQL before delegating to the immutable jsonb submission contract.';

revoke all on function private_generation.chatgpt_submit_curriculum_package_v2(uuid, text, text)
from public, anon, authenticated, service_role;
