-- Read-only behavior checks, safe against production; no claims or submissions.
begin;
do $$
declare
  active jsonb := public.worker_current_authoring_contract();
  legacy jsonb;
  resolution jsonb;
begin
  assert active->>'bundleSha256' = '227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340';
  resolution := public.worker_resolve_authoring_bundle(active);
  assert resolution->>'bundleSha256' = active->>'bundleSha256';
  assert resolution->>'correctionId' is null;
  legacy := jsonb_set(active, '{bundleSha256}', to_jsonb('227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffee58340'::text));
  resolution := public.worker_resolve_authoring_bundle(legacy);
  assert resolution->>'bundleSha256' = active->>'bundleSha256';
  assert resolution->>'correctionId' = '20260909181131_bundle_hash_typo';
  assert length(legacy->>'bundleSha256') = 62;
  begin
    perform public.worker_resolve_authoring_bundle(jsonb_set(legacy, '{engineVersion}', '"unknown"'));
    raise exception 'Test failed: unrelated contract was accepted';
  exception when raise_exception then
    if sqlerrm not like 'AUTHORING_BUNDLE_HASH_INVALID:%' then raise; end if;
  end;
  begin
    perform public.worker_resolve_authoring_bundle('{}'::jsonb);
    raise exception 'Test failed: missing hash was accepted';
  exception when raise_exception then
    if sqlerrm not like 'AUTHORING_BUNDLE_HASH_INVALID:%' then raise; end if;
  end;
  resolution := public.worker_resolve_authoring_bundle(jsonb_set(active, '{bundleSha256}', to_jsonb(repeat('0',64))));
  assert resolution->>'bundleSha256' = repeat('0',64), 'Unknown valid hash must not be remapped';
  assert not has_function_privilege('anon', 'public.worker_resolve_authoring_bundle(jsonb)', 'execute');
  assert not has_function_privilege('authenticated', 'public.worker_resolve_authoring_bundle(jsonb)', 'execute');
  assert has_function_privilege('service_role', 'public.worker_resolve_authoring_bundle(jsonb)', 'execute');
end;
$$;
rollback;
