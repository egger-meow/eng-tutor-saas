-- Synthetic bridge version regression; no learner claims or submissions are changed.
begin;
do $test$
declare
  payload jsonb;
  observed text;
  supported boolean;
begin
  if exists (select 1 from public.generation_jobs where id = '00000000-0000-0000-0000-000000000000'::uuid) then
    raise exception 'Synthetic test ID unexpectedly exists';
  end if;
  for payload, supported in
    select * from (values
      ('{"metadata":{"schemaVersion":"2.4.0"}}'::jsonb, true),
      ('{"metadata":{"schemaVersion":"2.5.0"}}'::jsonb, true),
      ('{"metadata":{"schemaVersion":"2.6.0"}}'::jsonb, false),
      ('{"metadata":{"schemaVersion":"2.3.0"}}'::jsonb, false),
      ('{"metadata":{"schemaVersion":null}}'::jsonb, false),
      ('{}'::jsonb, false),
      ('[]'::jsonb, false),
      ('null'::jsonb, false),
      (null::jsonb, false)
    ) cases(payload, supported)
  loop
    observed := null;
    begin
      perform private_generation.chatgpt_submit_curriculum_package(
        '00000000-0000-0000-0000-000000000000'::uuid, 'synthetic-schema-gate-test', payload);
    exception when others then
      observed := sqlerrm;
    end;
    if observed is distinct from (case when supported
      then 'job is not actively claimed by this worker'
      else 'canonical_source must be a Curriculum Package 2.4.0 or 2.5.0 object' end) then
      raise exception 'Unexpected schema gate result: %', observed;
    end if;
  end loop;
end;
$test$;
rollback;
