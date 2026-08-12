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

  if not exists (
    select 1 from public.child_profiles
    where child_id = '00000000-0000-0000-0000-000000000002'
  ) or not exists (
    select 1 from public.child_learning_state
    where child_id = '00000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'new child did not receive learning memory records';
  end if;

  insert into public.materials (
    id, child_id, material_week, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path
  ) values (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    current_date - 7,
    'test-v1',
    '{}'::jsonb,
    'migration-test/student.pdf',
    'migration-test/answer.pdf'
  );

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    source_material_id, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000002',
    current_date + 7,
    'test-v1',
    'waiting-feedback',
    now() - interval '1 minute',
    '00000000-0000-0000-0000-000000000003',
    now() + interval '4 days',
    now() + interval '2 days',
    now() + interval '3 days'
  );

  insert into public.generation_jobs (
    child_id,
    material_week,
    rule_version,
    idempotency_key,
    scheduled_for,
    release_at,
    feedback_cutoff_at,
    generation_due_at
  )
  select
    '00000000-0000-0000-0000-000000000002',
    current_date + n,
    'test-v1',
    'test-' || n,
    now() - interval '1 minute',
    now() + interval '4 days',
    now() + interval '2 days',
    now() + interval '3 days'
  from generate_series(1, 16) as n;

  select count(*)
  into claimed_count
  from private_generation.claim_due_generation_jobs('migration-test');

  if claimed_count <> 15 then
    raise exception 'expected 15 claims, got %', claimed_count;
  end if;

  if (
    select status
    from public.generation_jobs
    where idempotency_key = 'waiting-feedback'
  ) <> 'pending' then
    raise exception 'job waiting for feedback was claimed to fill spare capacity';
  end if;

  insert into public.feedback (child_id, material_id, completion_rate)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    100
  );

  perform private_generation.claim_due_generation_jobs('feedback-test');

  if not exists (
    select 1
    from public.generation_jobs
    where idempotency_key = 'waiting-feedback'
      and status = 'claimed'
      and feedback_missing = false
  ) then
    raise exception 'qualifying feedback did not unlock its next job';
  end if;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    source_material_id, release_at, feedback_cutoff_at, generation_due_at
  ) values (
    '00000000-0000-0000-0000-000000000002',
    current_date + 14,
    'test-v1',
    'cutoff-with-late-feedback',
    now() - interval '1 minute',
    '00000000-0000-0000-0000-000000000003',
    now() + interval '47 hours',
    now() - interval '1 hour',
    now() + interval '23 hours'
  );

  perform private_generation.claim_due_generation_jobs('cutoff-test');

  if not exists (
    select 1
    from public.generation_jobs
    where idempotency_key = 'cutoff-with-late-feedback'
      and status = 'claimed'
      and feedback_missing = true
  ) then
    raise exception 'cutoff did not unlock job or late feedback was applied';
  end if;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, scheduled_for,
    release_at, feedback_cutoff_at, generation_due_at
  )
  select
    '00000000-0000-0000-0000-000000000002',
    current_date + 100 + n,
    'test-v1',
    'mandatory-' || n,
    now() - interval '1 minute',
    now() + interval '12 hours',
    now() - interval '36 hours',
    now() - interval '12 hours'
  from generate_series(1, 18) as n;

  select count(*)
  into claimed_count
  from private_generation.claim_due_generation_jobs('mandatory-test');

  if claimed_count <> 18 then
    raise exception 'expected all 18 mandatory claims, got %', claimed_count;
  end if;

  if exists (
    select 1
    from public.generation_jobs
    where idempotency_key like 'mandatory-%'
      and feedback_missing = false
  ) then
    raise exception 'mandatory jobs without feedback were not marked feedback_missing';
  end if;

  if (
    select integer_value
    from public.operational_settings
    where key = 'daily_generation_limit'
  ) <> 15 then
    raise exception 'daily generation limit mismatch';
  end if;

  if not exists (
    select 1 from public.enrollment_settings
    where key = 'default' and status = 'open' and capacity = 100 and founding_limit = 30
  ) then
    raise exception 'typed enrollment settings mismatch';
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

  insert into public.materials (
    id, child_id, material_week, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path
  ) values
    (
      '00000000-0000-0000-0000-000000000031',
      '00000000-0000-0000-0000-000000000021', current_date, 'test-v1', '{}'::jsonb,
      'family-a/student.pdf', 'family-a/answer.pdf'
    ),
    (
      '00000000-0000-0000-0000-000000000032',
      '00000000-0000-0000-0000-000000000023', current_date, 'test-v1', '{}'::jsonb,
      'family-b/student.pdf', 'family-b/answer.pdf'
    );

  insert into public.feedback (id, child_id, material_id, completion_rate)
  values (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000031', 100
  );

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
  perform set_config('role', 'authenticated', true);

  select count(*) into visible_count from public.children;
  if visible_count <> 2 then
    raise exception 'family A should see exactly its two siblings, saw %', visible_count;
  end if;

  select count(*) into visible_count from public.child_profiles;
  if visible_count <> 2 then
    raise exception 'family A should see exactly two child profiles, saw %', visible_count;
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

  blocked := false;
  begin
    delete from public.children
    where id = '00000000-0000-0000-0000-000000000021';
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'authenticated parent retained hard-delete access';
  end if;

  blocked := false;
  begin
    update public.feedback
    set child_id = '00000000-0000-0000-0000-000000000023',
        material_id = '00000000-0000-0000-0000-000000000032'
    where id = '00000000-0000-0000-0000-000000000041';
  exception when others then
    blocked := true;
  end;
  if not blocked then
    raise exception 'feedback source identity was mutable';
  end if;

  update public.children
  set is_active = false
  where id = '00000000-0000-0000-0000-000000000021';
  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'owner could not archive child';
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

do $$
begin
  if has_function_privilege('anon', 'public.worker_claim_generation_jobs(text)', 'execute')
    or has_function_privilege('authenticated', 'public.worker_claim_generation_jobs(text)', 'execute') then
    raise exception 'browser roles can execute worker claim RPC';
  end if;
  if not has_function_privilege('service_role', 'public.worker_claim_generation_jobs(text)', 'execute') then
    raise exception 'service role cannot execute worker claim RPC';
  end if;
  if has_function_privilege('authenticated', 'public.worker_complete_generation_job(uuid,text,text,text,jsonb,jsonb,text,text,text)', 'execute') then
    raise exception 'authenticated role can execute worker completion RPC';
  end if;
end;
$$;
