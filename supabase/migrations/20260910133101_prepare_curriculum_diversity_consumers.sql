-- Deploy compatibility before changing the active authoring contract.
-- Existing snapshots and the active release remain unchanged.
do $migration$
declare
  definition text;
  signature text;
  old_gate text := $old$schema_ver not in ('2.4.0', '2.5.0')$old$;
  contract_gate text := $old$if canonical_source #>> '{metadata,schemaVersion}' is distinct from$old$;
  old_binding text := $old$'targetReleaseId', 'rel_1.8.2'$old$;
begin
  signature := 'private_generation.chatgpt_submit_curriculum_package(uuid,text,jsonb)';
  definition := pg_get_functiondef(signature::regprocedure);
  if (length(definition) - length(replace(definition, old_gate, ''))) <> length(old_gate) then
    raise exception 'Submission schema gate drifted';
  end if;
  definition := replace(definition, old_gate, $new$schema_ver not in ('2.4.0', '2.5.0', '2.6.0')$new$);
  definition := replace(definition, 'Curriculum Package 2.4.0 or 2.5.0 object', 'Curriculum Package 2.4.0, 2.5.0 or 2.6.0 object');
  if (length(definition) - length(replace(definition, contract_gate, ''))) <> length(contract_gate) then
    raise exception 'Submission immutable contract gate drifted';
  end if;
  definition := replace(definition, contract_gate,
    $new$if canonical_source #>> '{metadata,releaseId}' is distinct from target_rel_id
      or canonical_source #>> '{metadata,schemaVersion}' is distinct from$new$);
  execute definition;
  foreach signature in array array[
    'private_generation.chatgpt_claim_generation_batch(text)',
    'private_generation.claim_week1_fast_generation_batch(text)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
      raise exception 'Claim release binding drifted: %', signature;
    end if;
    execute replace(definition, old_binding,
      $new$'targetReleaseId', public.worker_current_authoring_contract()->>'releaseId'$new$);
  end loop;
end;
$migration$;
