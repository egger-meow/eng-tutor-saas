-- Isolated behavioral test: copy the installed function body, replacing only
-- its two relation references with transaction-local synthetic tables.
-- No learner rows, publication jobs, or storage objects are created.
begin;
create temporary table diversity_materials (
  id uuid, child_id uuid, material_week date, canonical_source jsonb, created_at timestamptz
);
create temporary table diversity_snapshots (
  id uuid, material_id uuid, child_id uuid, sequence_number integer,
  introduced_vocabulary_ids text[], grammar_target_ids text[], communication_function_ids text[]
);
do $$
declare body text;
begin
  select pg_get_functiondef('public.aggregate_format_memory(uuid,integer)'::regprocedure) into body;
  body := replace(body, 'public.aggregate_format_memory(', 'pg_temp.diversity_format_memory(');
  body := replace(body, 'public.materials', 'pg_temp.diversity_materials');
  body := replace(body, 'public.child_weekly_learning_snapshots', 'pg_temp.diversity_snapshots');
  execute body;
end $$;
insert into diversity_materials values
('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','2026-01-01',
'{"metadata":{"weekNumber":1},"studentLesson":{"opening":{"warmUp":"Think"},"instruction":[{"explanationZh":"legacy"}],"reading":{"questions":[{"writingLines":2},{"options":[1,2,3,4]}]}}}',now()),
('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','2026-01-08',
'{"metadata":{"weekNumber":2},"studentLesson":{"opening":{"activity":{"type":"direct-reading"}},"instruction":[{"blocks":[{"type":"prose"},{"type":"comparison"}]},{"blocks":[{"type":"comparison"},{"type":"prose"},{"type":"steps"}]}],"reading":{"questions":[{"responseLayout":{"type":"table"},"writingLines":2,"options":[1,2,3,4]},{"responseLayout":{"type":"lines"},"writingLines":2}]},"practice":[{"questions":[{"responseLayout":{"type":"sequence","layoutDirection":"horizontal"}},{"responseLayout":{"type":"organizer"}}]}],"homework":{"questions":[{"responseLayout":{"type":"sequence"}},{"options":[1,2]},{"writingLines":1}]}}}',now());
do $$
declare memory jsonb; latest jsonb; legacy jsonb;
begin
  memory := pg_temp.diversity_format_memory('00000000-0000-0000-0000-000000000010',4);
  latest := memory #> '{recentDeliveryMemory,0}';
  legacy := memory #> '{recentDeliveryMemory,1}';
  if latest ->> 'openingMode' is distinct from 'direct-reading'
    or latest -> 'instructionModes' is distinct from '["prose","comparison","steps"]'::jsonb
    or latest -> 'responseFormatCounts' is distinct from '{"table:grid":1,"written:lines":2,"mcq:4-option":1,"mcq:multi-option":1,"sequence:horizontal":1,"sequence:vertical":1,"table:organizer":1}'::jsonb then
    raise exception 'current diversity projection mismatch: %',latest;
  end if;
  if legacy ->> 'openingMode' is distinct from 'legacy-warmup'
    or legacy -> 'instructionModes' is distinct from '["legacy-explanation"]'::jsonb
    or legacy -> 'responseFormatCounts' is distinct from '{"written:lines":1,"mcq:4-option":1}'::jsonb then
    raise exception 'legacy diversity projection mismatch: %',legacy;
  end if;
  if jsonb_array_length(pg_temp.diversity_format_memory('00000000-0000-0000-0000-000000000010',1) -> 'recentDeliveryMemory') is distinct from 1 then
    raise exception 'lookback bound not preserved';
  end if;
  if pg_temp.diversity_format_memory('00000000-0000-0000-0000-000000000099',4) -> 'recentDeliveryMemory' is distinct from '[]'::jsonb then
    raise exception 'child isolation not preserved';
  end if;
  if has_function_privilege('anon','public.aggregate_format_memory(uuid,integer)','execute')
    or has_function_privilege('authenticated','public.aggregate_format_memory(uuid,integer)','execute')
    or not has_function_privilege('service_role','public.aggregate_format_memory(uuid,integer)','execute') then
    raise exception 'format memory function ACL mismatch';
  end if;
end $$;
rollback;
