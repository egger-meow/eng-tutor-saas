-- Synthetic regression fixture; no persistent writes, dispatch or storage cleanup.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';
-- Temporarily free the single-tester slot inside this rolled-back transaction.
-- Concurrent readers keep seeing the original committed session.
update public.generation_test_mode_sessions set is_enabled=false where is_enabled;
do $$
declare
  p uuid := 'cb111111-1111-4111-8111-111111111111';
  c uuid := 'cb222222-2222-4222-8222-222222222222';
  m uuid := 'cb333333-3333-4333-8333-333333333333';
  j uuid;
  next_j uuid;
  r jsonb;
begin
  insert into auth.users(id,email) values(p,'test-mode-lifecycle@example.invalid');
  insert into public.profiles(id,display_name) values(p,'Synthetic parent') on conflict do nothing;
  insert into public.children(id,parent_id,display_name,grade,grade_stage,is_internal_test)
    values(c,p,'Synthetic tester',7,'grade_7',true);
  insert into public.generation_test_mode_sessions(child_id,is_enabled,target_week)
    values(c,true,9);
  select id into j from public.generation_jobs where child_id=c limit 1;
  insert into public.materials(id,child_id,material_week,rule_version,input_snapshot,
    student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary,observations_recorded_at)
    values(m,c,current_date-7,'weekly-material/2.0.0','{}','synthetic/student.pdf','synthetic/parent.pdf','{}','{}',now());
  update public.generation_jobs set status='completed',material_id=m,attempt_count=2,
    completed_at=now(),lease_expires_at=null where id=j;
  insert into private_generation.curriculum_submissions(job_id,generation_worker_id,canonical_source,status,authoring_attempt)
    values(j,'synthetic-worker','{}','technical_failed',1);
  insert into public.generation_jobs(child_id,material_week,rule_version,idempotency_key,status,scheduled_for,release_at,feedback_cutoff_at,generation_due_at)
    values(c,current_date+1,'weekly-material/2.0.0','synthetic-test-mode-canceled','canceled',now(),now()+interval '48 hours',now(),now()+interval '24 hours');
  insert into public.generation_jobs(child_id,material_week,rule_version,idempotency_key,status,scheduled_for,release_at,feedback_cutoff_at,generation_due_at)
    values(c,current_date+8,'weekly-material/2.0.0','synthetic-test-mode-pending','pending',now()+interval '7 days',now()+interval '9 days',now()+interval '7 days',now()+interval '8 days') returning id into next_j;
  r := public.admin_get_test_mode_status(c);
  if r#>>'{nextJob,id}' <> next_j::text or r#>>'{advanceEligibility,canAdvance}' <> 'true'
    or r#>>'{resetEligibility,canReset}' <> 'true' then
    raise exception 'historical canceled job or failed submission blocked current work: %',r;
  end if;
  r := public.admin_advance_test_week(c);
  if r->>'success' <> 'true' or r->>'jobId' <> next_j::text then raise exception 'advance failed: %',r; end if;
  update public.generation_jobs set status='claimed',attempt_count=1,lease_expires_at=now()+interval '1 hour' where id=next_j;
  r := public.admin_get_test_mode_status(c);
  if r#>>'{resetEligibility,canReset}' <> 'false' then raise exception 'active authoring lease allowed reset'; end if;
  r := public.admin_reset_test_child_to_onboarding(c);
  if r->>'error' <> 'RESET_BLOCKED_ACTIVE_WORK' then raise exception 'active reset not blocked: %',r; end if;
  insert into private_generation.curriculum_submissions(job_id,generation_worker_id,canonical_source,status,authoring_attempt)
    values(next_j,'synthetic-worker','{}','technical_failed',1);
  r := public.admin_get_test_mode_status(c);
  if r#>>'{advanceEligibility,blockingCode}' <> 'FINISHER_IN_PROGRESS' then raise exception 'current submission not recognized: %',r; end if;
  update public.generation_jobs set status='canceled',lease_expires_at=null where id=next_j;
  -- New interactive records must not break the test-only reset's dependency order.
  insert into public.student_material_submissions(material_id,child_id,answers,self_check,results)
    values(m,c,'{}','[]','[]');
  insert into public.material_generation_requests(child_id,source_material_id,generation_job_id,service_period_start,service_period_end)
    values(c,m,next_j,now()-interval '1 day',now()+interval '29 days');
  r := public.admin_reset_test_child_to_onboarding(c);
  if r->>'success' <> 'true' then raise exception 'modern test reset failed: %',r; end if;
  if exists(select 1 from public.materials where child_id=c)
    or exists(select 1 from public.student_material_submissions where child_id=c)
    or exists(select 1 from public.material_generation_requests where child_id=c)
    or (select count(*) from public.generation_jobs where child_id=c and status='pending') <> 1 then
    raise exception 'reset did not recreate a clean initial job';
  end if;
  r := public.admin_reset_test_child_to_onboarding(null);
  if r->>'error' <> 'INVALID_CHILD_ID' then raise exception 'invalid child accepted'; end if;
end $$;
rollback;
