do $$
declare
  claimed_count integer;
  visible_count integer;
  changed_count integer;
  blocked boolean := false;
begin
  insert into auth.users (id, raw_user_meta_data)
  values (
    '00000000-0000-0000-0000-000000000001',
    '{"display_name":"Migration Test"}'::jsonb
  );

  insert into public.children (id, parent_id, display_name, grade)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Test Student',
    7
  );

  if not exists (
    select 1
    from public.subscriptions
    where child_id = '00000000-0000-0000-0000-000000000002'
      and provider = 'beta'
      and status = 'trialing'
  ) then
    raise exception 'new child did not receive a beta trial entitlement';
  end if;

  insert into public.generation_jobs (
    child_id,
    material_week,
    rule_version,
    idempotency_key,
    scheduled_for
  )
  select
    '00000000-0000-0000-0000-000000000002',
    current_date + n,
    'test-v1',
    'test-' || n,
    now() - interval '1 minute'
  from generate_series(1, 16) as n;

  select count(*)
  into claimed_count
  from private_generation.claim_due_generation_jobs('migration-test');

  if claimed_count <> 15 then
    raise exception 'expected 15 claims, got %', claimed_count;
  end if;

  if (
    select integer_value
    from public.operational_settings
    where key = 'daily_generation_limit'
  ) <> 15 then
    raise exception 'daily generation limit mismatch';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'weekly-materials'
      and public = false
      and file_size_limit = 20971520
  ) then
    raise exception 'private PDF bucket mismatch';
  end if;

  insert into auth.users (id, raw_user_meta_data)
  values
    ('00000000-0000-0000-0000-000000000011', '{"display_name":"Family A"}'::jsonb),
    ('00000000-0000-0000-0000-000000000012', '{"display_name":"Family B"}'::jsonb);

  insert into public.children (id, parent_id, display_name, grade)
  values
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'Sibling A1', 7),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', 'Sibling A2', 8),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000012', 'Family B Child', 9);

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
  perform set_config('role', 'authenticated', true);

  select count(*) into visible_count from public.children;
  if visible_count <> 2 then
    raise exception 'family A should see exactly its two siblings, saw %', visible_count;
  end if;

  update public.children
  set display_name = 'Cross-family mutation'
  where id = '00000000-0000-0000-0000-000000000023';
  get diagnostics changed_count = row_count;
  if changed_count <> 0 then
    raise exception 'cross-family update bypassed RLS';
  end if;

  begin
    insert into public.children (parent_id, display_name, grade)
    values ('00000000-0000-0000-0000-000000000012', 'Forbidden child', 7);
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'cross-family insert bypassed RLS';
  end if;

  perform set_config('role', 'none', true);

  delete from auth.users
  where id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012'
  );
exception
  when others then
    perform set_config('role', 'none', true);
    delete from auth.users
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000012'
    );
    raise;
end;
$$;
