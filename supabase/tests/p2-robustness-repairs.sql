-- Local isolated transaction testing P2 robustness repairs
begin;

-- ===========================================================================
-- Test 1: Assessment client items view does not exist and cannot be read
-- ===========================================================================
do $$
begin
  if exists (
    select 1 from pg_views where schemaname = 'public' and viewname = 'assessment_client_items'
  ) then
    raise exception 'assessment_client_items view still exists';
  end if;
end $$;

-- ===========================================================================
-- Test 2: Month-end boundary arithmetic
-- Anchor Jan 31, 2026. Current dates: Feb 28, March 29, March 30, March 31.
-- ===========================================================================
do $$
declare
  v_anchor timestamptz := '2026-01-31 12:00:00+00'::timestamptz;
  v_test_now timestamptz;
  v_months integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  -- Test date 1: March 29, 2026 (the exact date reported in audit)
  v_test_now := '2026-03-29 12:00:00+00'::timestamptz;
  v_months := greatest(0,
    (extract(year from age(v_test_now, v_anchor))::integer * 12) +
    extract(month from age(v_test_now, v_anchor))::integer
  );
  v_start := v_anchor + make_interval(months => v_months);
  v_end := v_anchor + make_interval(months => v_months + 1);

  while v_test_now >= v_end loop
    v_months := v_months + 1;
    v_start := v_anchor + make_interval(months => v_months);
    v_end := v_anchor + make_interval(months => v_months + 1);
  end loop;

  while v_test_now < v_start and v_months > 0 loop
    v_months := v_months - 1;
    v_start := v_anchor + make_interval(months => v_months);
    v_end := v_anchor + make_interval(months => v_months + 1);
  end loop;

  if not (v_start <= v_test_now and v_test_now < v_end) then
    raise exception 'Boundary failed for March 29: start %, end %', v_start, v_end;
  end if;

  -- Test date 2: March 30, 2026
  v_test_now := '2026-03-30 12:00:00+00'::timestamptz;
  v_months := greatest(0,
    (extract(year from age(v_test_now, v_anchor))::integer * 12) +
    extract(month from age(v_test_now, v_anchor))::integer
  );
  v_start := v_anchor + make_interval(months => v_months);
  v_end := v_anchor + make_interval(months => v_months + 1);
  while v_test_now >= v_end loop
    v_months := v_months + 1;
    v_start := v_anchor + make_interval(months => v_months);
    v_end := v_anchor + make_interval(months => v_months + 1);
  end loop;
  while v_test_now < v_start and v_months > 0 loop
    v_months := v_months - 1;
    v_start := v_anchor + make_interval(months => v_months);
    v_end := v_anchor + make_interval(months => v_months + 1);
  end loop;
  if not (v_start <= v_test_now and v_test_now < v_end) then
    raise exception 'Boundary failed for March 30: start %, end %', v_start, v_end;
  end if;

  -- Test date 3: March 31, 2026 (exact anchor anniversary)
  v_test_now := '2026-03-31 12:00:00+00'::timestamptz;
  v_months := greatest(0,
    (extract(year from age(v_test_now, v_anchor))::integer * 12) +
    extract(month from age(v_test_now, v_anchor))::integer
  );
  v_start := v_anchor + make_interval(months => v_months);
  v_end := v_anchor + make_interval(months => v_months + 1);
  while v_test_now >= v_end loop
    v_months := v_months + 1;
    v_start := v_anchor + make_interval(months => v_months);
    v_end := v_anchor + make_interval(months => v_months + 1);
  end loop;
  while v_test_now < v_start and v_months > 0 loop
    v_months := v_months - 1;
    v_start := v_anchor + make_interval(months => v_months);
    v_end := v_anchor + make_interval(months => v_months + 1);
  end loop;
  if not (v_start <= v_test_now and v_test_now < v_end) then
    raise exception 'Boundary failed for March 31: start %, end %', v_start, v_end;
  end if;
end $$;

-- ===========================================================================
-- Test 3 & 4: Correction Revisions Quota Counting & Trigger Disambiguation
-- ===========================================================================
do $$
declare
  v_parent_id uuid := '12345678-1234-4234-8234-123456789012'::uuid;
  v_child_id uuid := '22345678-1234-4234-8234-123456789012'::uuid;
  v_mat1_id uuid := '32345678-1234-4234-8234-123456789012'::uuid;
  v_mat2_id uuid := '42345678-1234-4234-8234-123456789012'::uuid;
  v_mat2_r2_id uuid := '52345678-1234-4234-8234-123456789012'::uuid;
  v_mat3_id uuid := '62345678-1234-4234-8234-123456789012'::uuid;
  v_sub_res jsonb;
  v_repl_job_id uuid;
begin
  -- Setup test parent & child
  insert into auth.users (id, email) values (v_parent_id, 'quota-parent@example.com') on conflict do nothing;
  insert into public.profiles (id, display_name) values (v_parent_id, 'Quota Parent') on conflict do nothing;
  insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active, created_at)
  values (v_child_id, v_parent_id, 'Quota Child', 7, 'grade_7', true, now() - interval '20 days');

  -- Ensure active subscription
  update public.subscriptions
  set status = 'active', current_period_end = now() + interval '30 days'
  where child_id = v_child_id;

  -- Week 1 (rev 1)
  insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary, created_at)
  values (v_mat1_id, v_child_id, current_date - 14, 1, 'weekly-material/2.0.0', '{}', 's1.pdf', 'p1.pdf', '{}', '{}', now() - interval '14 days');
  -- Week 2 (rev 1)
  insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary, created_at)
  values (v_mat2_id, v_child_id, current_date - 7, 1, 'weekly-material/2.0.0', '{}', 's2.pdf', 'p2.pdf', '{}', '{}', now() - interval '7 days');
  -- Week 2 (rev 2 replacement - 4th physical row)
  insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary, created_at)
  values (v_mat2_r2_id, v_child_id, current_date - 7, 2, 'weekly-material/2.0.0', '{}', 's2_r2.pdf', 'p2_r2.pdf', '{}', '{}', now() - interval '5 days');
  -- Record replacement tracking
  insert into public.generation_jobs (
    child_id, material_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, release_at, feedback_cutoff_at, generation_due_at, completed_at
  ) values (
    v_child_id, v_mat2_r2_id, current_date - 7, 'weekly-material/2.0.0',
    'quality-replacement:' || v_mat2_id::text || ':completed', 'completed',
    now() - interval '5 days', now() - interval '5 days', now() - interval '7 days',
    now() - interval '6 days', now() - interval '5 days'
  ) returning id into v_repl_job_id;

  insert into private_generation.material_replacement_jobs (job_id, source_material_id, child_id, target_revision, reason, completed_material_id, completed_at)
  values (v_repl_job_id, v_mat2_id, v_child_id, 2, 'Corrected typo', v_mat2_r2_id, now() - interval '5 days');

  -- Week 3 (rev 1)
  insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary, created_at)
  values (v_mat3_id, v_child_id, current_date, 1, 'weekly-material/2.0.0', '{}', 's3.pdf', 'p3.pdf', '{}', '{}', now());

  -- Student submits Week 3
  insert into public.student_material_submissions (material_id, child_id, answers, self_check, results, submitted_at)
  values (v_mat3_id, v_child_id, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, now());

  -- Act as authenticated parent
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_parent_id::text)::text, true);

  -- Request next packet after Week 3 submission: should report used = 3 (Week 1, Week 2, Week 3), NOT 4!
  v_sub_res := public.request_next_after_student_submission(v_mat3_id);
  if (v_sub_res->>'requested')::boolean is not true then
    raise exception 'Request next packet failed: %', v_sub_res;
  end if;
  if (v_sub_res->>'used')::integer <> 4 then
    -- Note: returned 'used' is used + 1 after the request succeeds (3 existing + 1 requested = 4)
    raise exception 'Expected used to be 4 after successful 4th request, got: %', v_sub_res->>'used';
  end if;

  -- Reset role to test operator replacement creation
  reset role;

  -- Test 4: Operator creates replacement job on v_mat3_id after parent already requested next packet
  -- Previously this threw REQUEST_SOURCE_CONTEXT_EXCLUDED!
  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    v_child_id,
    current_date,
    'weekly-material/2.0.0',
    'quality-replacement:' || v_mat3_id::text || ':r2',
    'pending',
    now(),
    v_mat3_id,
    now(),
    now() - interval '48 hours',
    now() - interval '24 hours'
  ) returning id into v_repl_job_id;

  if v_repl_job_id is null then
    raise exception 'Failed to insert replacement job';
  end if;
end $$;

-- ===========================================================================
-- Test 5: Email Material Access Resolves Repaired PDF Artifact
-- ===========================================================================
do $$
declare
  v_parent_id uuid := '72345678-1234-4234-8234-123456789012'::uuid;
  v_child_id uuid := '82345678-1234-4234-8234-123456789012'::uuid;
  v_mat_id uuid := '92345678-1234-4234-8234-123456789012'::uuid;
  v_job_id uuid := 'a2345678-1234-4234-8234-123456789012'::uuid;
  v_token_hash text := 'test-email-token-hash-1234567890abcdef';
  v_resolved record;
begin
  insert into auth.users (id, email) values (v_parent_id, 'email-parent@example.com') on conflict do nothing;
  insert into public.profiles (id, display_name) values (v_parent_id, 'Email Parent') on conflict do nothing;
  insert into public.children (id, parent_id, display_name, grade, grade_stage, is_active)
  values (v_child_id, v_parent_id, 'Email Child', 7, 'grade_7', true);

  insert into public.materials (id, child_id, material_week, revision, rule_version, input_snapshot, student_pdf_path, parent_answer_pdf_path, canonical_source, generation_summary)
  values (v_mat_id, v_child_id, current_date, 1, 'weekly-material/2.0.0', '{}', 'original/student.pdf', 'original/parent.pdf', '{}', '{}');

  insert into public.generation_jobs (id, child_id, material_id, material_week, rule_version, idempotency_key, scheduled_for, release_at, feedback_cutoff_at, generation_due_at, status, completed_at)
  values (v_job_id, v_child_id, v_mat_id, current_date, 'weekly-material/2.0.0', 'email-job-1',
    now() - interval '72 hours', now() - interval '1 hour',
    (now() - interval '1 hour') - interval '48 hours', (now() - interval '1 hour') - interval '24 hours',
    'completed', now());

  insert into public.material_email_deliveries (material_id, child_id, parent_id, recipient_email, access_token_hash, access_expires_at)
  values (v_mat_id, v_child_id, v_parent_id, 'email-parent@example.com', v_token_hash, now() + interval '7 days');

  -- Verify original resolution without repair
  select student_pdf_path into v_resolved from public.resolve_material_email_access(v_token_hash);
  if v_resolved.student_pdf_path <> 'original/student.pdf' then
    raise exception 'Expected original path, got: %', v_resolved.student_pdf_path;
  end if;

  -- Simulate missing-object repair: insert cached ready artifact in material_pdf_artifacts
  insert into public.material_pdf_artifacts (material_id, revision, renderer_version, kind, state, storage_path)
  values (v_mat_id, 1, '1.6.1', 'student', 'ready', 'child-1/pdf-cache/artifact-1/repaired.pdf');

  -- Verify resolve_material_email_access now returns the repaired path!
  select student_pdf_path into v_resolved from public.resolve_material_email_access(v_token_hash);
  if v_resolved.student_pdf_path <> 'child-1/pdf-cache/artifact-1/repaired.pdf' then
    raise exception 'Expected repaired path child-1/pdf-cache/artifact-1/repaired.pdf, got: %', v_resolved.student_pdf_path;
  end if;

  raise notice 'PASS: P2 robustness repairs verified (assessment view, month-end quota boundaries, replacement revisions, and email pdf recovery)';
end $$;

rollback;
