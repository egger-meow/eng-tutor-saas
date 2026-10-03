-- Close the remaining repository-owned mutable function context advisories.
-- Built-ins still resolve through implicit pg_catalog; table names are already qualified.
alter function public.normalize_short_answer(text) set search_path = '';
alter function private_generation.prevent_pilot_admissions_mutation() set search_path = '';

-- These are trigger entrypoints, never browser RPCs. Trigger execution continues
-- under the existing table/trigger policy; remove unnecessary direct client grants.
revoke execute on function public.prevent_pilot_reopening(),
  public.protect_used_assessment_item(), public.protect_used_assessment_passage()
  from public, anon, authenticated;
