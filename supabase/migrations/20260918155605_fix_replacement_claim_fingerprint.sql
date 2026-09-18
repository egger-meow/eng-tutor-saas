-- Fix replacement-lane claim snapshots to use the canonical sha256:<64hex> fingerprint format.
do $migration$
declare
  definition text;
  patched text;
begin
  definition := pg_get_functiondef('public.worker_claim_material_replacement_batch(text,uuid[])'::regprocedure);

  if position('v_fingerprint := ''sha256:'' || encode(' in definition) > 0 then
    return;
  end if;

  patched := replace(
    definition,
    'v_fingerprint := encode(',
    'v_fingerprint := ''sha256:'' || encode('
  );

  if patched = definition then
    raise exception 'replacement claim fingerprint patch did not match expected function body';
  end if;

  execute patched;
end
$migration$;
