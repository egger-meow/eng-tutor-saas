do $$
declare
  claimed_count integer;
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

  insert into public.subscriptions (child_id, provider, status)
  values ('00000000-0000-0000-0000-000000000002', 'test', 'active');

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

  delete from auth.users
  where id = '00000000-0000-0000-0000-000000000001';
exception
  when others then
    delete from auth.users
    where id = '00000000-0000-0000-0000-000000000001';
    raise;
end;
$$;
