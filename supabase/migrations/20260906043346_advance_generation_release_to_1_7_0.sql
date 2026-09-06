-- Advance only release defaults; retain the latest installed function bodies,
-- including Week 1 routing, leases, immutable snapshots, and existing grants.
-- Existing claim snapshots keep their original targetReleaseId.
do $migration$
declare
  signature text;
  definition text;
  old_binding text;
  new_binding text;
begin
  foreach signature in array array[
    'private_generation.chatgpt_claim_generation_batch(text)',
    'private_generation.claim_week1_fast_generation_batch(text)',
    'private_generation.chatgpt_submit_curriculum_package(uuid,text,jsonb)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if signature like '%chatgpt_submit_curriculum_package%' then
      old_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.6.0')$binding$;
      new_binding := $binding$coalesce(claim_snapshot.generation_context->>'targetReleaseId', 'rel_1.7.0')$binding$;
    else
      old_binding := $binding$'targetReleaseId', 'rel_1.6.0'$binding$;
      new_binding := $binding$'targetReleaseId', 'rel_1.7.0'$binding$;
    end if;
    if (length(definition) - length(replace(definition, old_binding, ''))) <> length(old_binding) then
      raise exception 'Expected exactly one previous release binding in %', signature;
    end if;
    execute replace(definition, old_binding, new_binding);
  end loop;
end;
$migration$;
