-- Accept the current additive response-unit schema while preserving in-flight 2.4 packets.
-- Patch only the reviewed version gate; keep claim, fingerprint, release and immutable-attempt checks.
do $migration$
declare
  target regprocedure := 'private_generation.chatgpt_submit_curriculum_package(uuid,text,jsonb)'::regprocedure;
  definition text;
  old_gate text := $old$if jsonb_typeof(canonical_source) <> 'object'
    or schema_ver <> '2.4.0' then
    raise exception 'canonical_source must be a Curriculum Package 2.4.0 object';$old$;
  new_gate text := $new$if jsonb_typeof(canonical_source) is distinct from 'object'
    or schema_ver is null
    or schema_ver not in ('2.4.0', '2.5.0') then
    raise exception 'canonical_source must be a Curriculum Package 2.4.0 or 2.5.0 object';$new$;
begin
  definition := pg_get_functiondef(target);
  if (length(definition) - length(replace(definition, old_gate, ''))) / length(old_gate) <> 1 then
    raise exception 'Submission bridge gate drifted; review deployed definition before applying';
  end if;
  execute replace(definition, old_gate, new_gate);
end;
$migration$;
