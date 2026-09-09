-- Correct a transcription error, not bundle content or release versions.
-- Preserve all immutable claim snapshots and fingerprints.
create or replace function public.worker_current_authoring_contract()
returns jsonb language sql security definer stable set search_path = ''
as $$
  select jsonb_build_object(
    'releaseId', 'rel_1.8.2', 'schemaVersion', '2.5.0',
    'promptVersion', '2.13.2', 'engineVersion', '1.8.2',
    'workerVersion', '1.7.2', 'rendererVersion', '1.5.0',
    'bundleVersion', '2.13.2-prod',
    'bundleSha256', '227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340'
  );
$$;
revoke all on function public.worker_current_authoring_contract() from public, anon, authenticated;
grant execute on function public.worker_current_authoring_contract() to service_role;

-- Read-only, exact-contract erratum resolution. Never rewrites a claim.
create or replace function public.worker_resolve_authoring_bundle(claim_contract jsonb)
returns jsonb language plpgsql security definer immutable set search_path = ''
as $$
declare
  original_hash text := claim_contract->>'bundleSha256';
  corrected_hash constant text := '227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340';
  known_bad_contract constant jsonb := jsonb_build_object(
    'releaseId', 'rel_1.8.2', 'schemaVersion', '2.5.0',
    'promptVersion', '2.13.2', 'engineVersion', '1.8.2',
    'workerVersion', '1.7.2', 'rendererVersion', '1.5.0',
    'bundleVersion', '2.13.2-prod', 'bundleSha256', '227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffee58340'
  );
begin
  if claim_contract = known_bad_contract then
    return jsonb_build_object('originalBundleSha256', original_hash,
      'bundleSha256', corrected_hash, 'correctionId', '20260909181131_bundle_hash_typo');
  end if;
  if original_hash is null or original_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'AUTHORING_BUNDLE_HASH_INVALID: no reviewed correction for this contract';
  end if;
  return jsonb_build_object('originalBundleSha256', original_hash,
    'bundleSha256', original_hash, 'correctionId', null);
end;
$$;
revoke all on function public.worker_resolve_authoring_bundle(jsonb) from public, anon, authenticated;
grant execute on function public.worker_resolve_authoring_bundle(jsonb) to service_role;
comment on function public.worker_resolve_authoring_bundle(jsonb)
is 'Read-only exact historical contract hash erratum; caller must compare resolved hash to actual bundle bytes and preserve original claim/fingerprint.';
