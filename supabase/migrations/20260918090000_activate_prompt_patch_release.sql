-- Activate the versioned prompt/renderer patch only from the reviewed rel_1.9.0 contract.
-- Compatible consumers must be deployed and verified before this migration is applied in production.
do $$
begin
  if public.worker_current_authoring_contract() is distinct from jsonb_build_object(
    'releaseId', 'rel_1.9.0', 'schemaVersion', '2.6.0',
    'promptVersion', '2.14.0', 'engineVersion', '1.9.0',
    'workerVersion', '1.8.0', 'rendererVersion', '1.6.0',
    'bundleVersion', '2.14.0-prod',
    'bundleSha256', '971e2b7d3f497c9448bf95171b5ab9258d278312bd3ea43d2f1d5ba531ed526c'
  ) then
    raise exception 'Unexpected active authoring contract; review activation sequencing';
  end if;
end;
$$;

create or replace function public.worker_current_authoring_contract()
returns jsonb language sql security definer stable set search_path = ''
as $$
  select jsonb_build_object(
    'releaseId', 'rel_1.9.1', 'schemaVersion', '2.6.0',
    'promptVersion', '2.14.1', 'engineVersion', '1.9.0',
    'workerVersion', '1.8.0', 'rendererVersion', '1.6.1',
    'bundleVersion', '2.14.1-prod',
    'bundleSha256', 'd72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211'
  );
$$;

revoke all on function public.worker_current_authoring_contract() from public, anon, authenticated;
grant execute on function public.worker_current_authoring_contract() to service_role;
