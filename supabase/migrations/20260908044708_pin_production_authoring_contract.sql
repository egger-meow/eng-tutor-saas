-- Pin the repository-owned authoring contract into every new claim snapshot.
-- Existing snapshots remain valid; strict checks apply to newly contracted claims.
create or replace function public.worker_current_authoring_contract()
returns jsonb language sql security definer stable set search_path = ''
as $$
  select jsonb_build_object(
    'releaseId', 'rel_1.8.2', 'schemaVersion', '2.5.0',
    'promptVersion', '2.13.2', 'engineVersion', '1.8.2',
    'workerVersion', '1.7.2', 'rendererVersion', '1.5.0',
    'bundleVersion', '2.13.2-prod',
    'bundleSha256', '227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffee58340'
  );
$$;
revoke all on function public.worker_current_authoring_contract() from public, anon, authenticated;
grant execute on function public.worker_current_authoring_contract() to service_role;

do $migration$
declare
  signature text;
  definition text;
  old_binding text := $binding$'targetReleaseId', 'rel_1.8.2'$binding$;
  new_binding text := $binding$'targetReleaseId', 'rel_1.8.2',
        'activeAuthoringContract', public.worker_current_authoring_contract()$binding$;
begin
  foreach signature in array array[
    'private_generation.chatgpt_claim_generation_batch(text)',
    'private_generation.claim_week1_fast_generation_batch(text)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
      raise exception 'Expected exactly one release binding in %', signature;
    end if;
    execute replace(definition, old_binding, new_binding);
  end loop;
end;
$migration$;

do $migration$
declare
  definition text;
  old_binding text := $binding$target_rel_id := coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.2');$binding$;
  new_binding text := $binding$target_rel_id := coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.8.2');
  if claim_snapshot.generation_context ? 'activeAuthoringContract' then
    if canonical_source #>> '{metadata,schemaVersion}' is distinct from claim_snapshot.generation_context #>> '{activeAuthoringContract,schemaVersion}'
      or canonical_source #>> '{metadata,promptVersion}' is distinct from claim_snapshot.generation_context #>> '{activeAuthoringContract,promptVersion}'
      or canonical_source #>> '{metadata,engineVersion}' is distinct from claim_snapshot.generation_context #>> '{activeAuthoringContract,engineVersion}'
      or canonical_source #>> '{metadata,workerVersion}' is distinct from claim_snapshot.generation_context #>> '{activeAuthoringContract,workerVersion}'
      or canonical_source #>> '{metadata,rendererVersion}' is distinct from claim_snapshot.generation_context #>> '{activeAuthoringContract,rendererVersion}'
      or target_rel_id is distinct from claim_snapshot.generation_context #>> '{activeAuthoringContract,releaseId}' then
      raise exception 'AUTHORING_CONTRACT_MISMATCH: package metadata does not match the server-owned claim contract';
    end if;
  end if;$binding$;
begin
  definition := pg_get_functiondef('private_generation.chatgpt_submit_curriculum_package(uuid,text,jsonb)'::regprocedure);
  if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
    raise exception 'Expected exactly one submit release binding';
  end if;
  execute replace(definition, old_binding, new_binding);
end;
$migration$;

comment on function public.worker_current_authoring_contract()
is 'Service-role-only active production authoring contract embedded into new claims and enforced on submit.';