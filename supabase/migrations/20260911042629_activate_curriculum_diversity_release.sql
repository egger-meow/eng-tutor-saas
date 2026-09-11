-- Compatible consumers verified before activation; immutable snapshots stay unchanged.
do $$
begin
  if public.worker_current_authoring_contract()->>'releaseId' is distinct from 'rel_1.8.2' then
    raise exception 'Unexpected active release; review activation sequencing';
  end if;
end;
$$;
create or replace function public.worker_current_authoring_contract()
returns jsonb language sql security definer stable set search_path = ''
as $$
  select jsonb_build_object(
    'releaseId', 'rel_1.9.0', 'schemaVersion', '2.6.0',
    'promptVersion', '2.14.0', 'engineVersion', '1.9.0',
    'workerVersion', '1.8.0', 'rendererVersion', '1.6.0',
    'bundleVersion', '2.14.0-prod',
    'bundleSha256', '971e2b7d3f497c9448bf95171b5ab9258d278312bd3ea43d2f1d5ba531ed526c'
  );
$$;
revoke all on function public.worker_current_authoring_contract() from public, anon, authenticated;
grant execute on function public.worker_current_authoring_contract() to service_role;
