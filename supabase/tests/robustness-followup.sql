-- LOCAL ONLY. Synthetic fixtures and admission charges roll back.
begin;
do $$ declare k text := repeat('a',64); i integer;
begin
  delete from private_generation.onboarding_admission_buckets;
  for i in 1..3 loop
    if not public.consume_onboarding_admission(k) then raise exception 'legitimate budget rejected'; end if;
  end loop;
  if public.consume_onboarding_admission(k) then raise exception 'email budget bypass'; end if;
  if (select used from private_generation.onboarding_admission_buckets where bucket_key='hour')<>3 then
    raise exception 'rejected request charged global budget'; end if;
  for i in 4..20 loop
    if not public.consume_onboarding_admission(lpad(i::text,64,'0')) then raise exception 'global budget rejected early'; end if;
  end loop;
  if public.consume_onboarding_admission(repeat('b',64)) then raise exception 'hourly budget bypass'; end if;
  delete from private_generation.onboarding_admission_buckets;
  insert into private_generation.onboarding_admission_buckets values('day',date_trunc('day',now()),80);
  if public.consume_onboarding_admission(k) then raise exception 'daily budget bypass'; end if;
  if has_function_privilege('anon','public.consume_onboarding_admission(text)','execute')
    or has_function_privilege('authenticated','public.worker_renew_submission_leases(text)','execute')
    or has_table_privilege('authenticated','private_generation.onboarding_admission_buckets','select') then
    raise exception 'service-only authority exposed'; end if;
end $$;
insert into auth.users(id,email) values('fa111111-1111-4111-8111-111111111111','robustness@example.invalid');
insert into public.profiles(id,display_name) values('fa111111-1111-4111-8111-111111111111','Synthetic robustness') on conflict do nothing;
insert into public.children(id,parent_id,display_name,grade,grade_stage,is_active)
values('fb111111-1111-4111-8111-111111111111','fa111111-1111-4111-8111-111111111111','Synthetic robustness',7,'grade_7',true);
update public.subscriptions set status='active',current_period_end=now()+interval '30 days'
where child_id='fb111111-1111-4111-8111-111111111111';
insert into public.materials(id,child_id,material_week,revision,rule_version,input_snapshot,student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary)
values('fc111111-1111-4111-8111-111111111111','fb111111-1111-4111-8111-111111111111',current_date,1,'synthetic','{}','s.pdf','p.pdf','{}','{}');
-- Historical paper feedback remains supported without an interactive submission.
update public.materials set answer_unlock_requires_submission=false where id='fc111111-1111-4111-8111-111111111111';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"fa111111-1111-4111-8111-111111111111"}';
do $$ declare result jsonb;
begin
  result := public.submit_feedback_and_request_next_material('fb111111-1111-4111-8111-111111111111',
    'fc111111-1111-4111-8111-111111111111',3::smallint,50);
  if not (result->>'requested')::boolean then raise exception 'legacy request failed: %',result; end if;
end $$;
reset role;
do $$ declare j uuid; result jsonb;
begin
  select generation_job_id into j from public.material_generation_requests
  where source_material_id='fc111111-1111-4111-8111-111111111111';
  if not exists(select 1 from public.generation_jobs where id=j and feedback_cutoff_at=generation_due_at
    and feedback_cutoff_at >= (select created_at from public.feedback where material_id='fc111111-1111-4111-8111-111111111111')) then
    raise exception 'request excludes freshly saved feedback'; end if;
  update public.generation_jobs set status='claimed',claimed_by='synthetic-author',lease_expires_at=now()+interval '1 minute' where id=j;
  insert into private_generation.curriculum_submissions(job_id,authoring_attempt,generation_worker_id,canonical_source,status,processor_id,processor_lease_expires_at)
  values(j,1,'synthetic-author','{}','processing','synthetic-processor',now()+interval '1 minute');
  if public.worker_renew_submission_leases('wrong-processor')<>0 then raise exception 'cross processor renewal'; end if;
  if public.worker_renew_submission_leases('synthetic-processor')<>1 then raise exception 'live renewal failed'; end if;
  if not exists(select 1 from public.generation_jobs where id=j and lease_expires_at>=now()+interval '44 minutes') then
    raise exception 'authoring lease not renewed'; end if;
  update private_generation.curriculum_submissions set processor_lease_expires_at=now()-interval '1 minute' where job_id=j;
  if public.worker_renew_submission_leases('synthetic-processor')<>0 then raise exception 'expired lease resurrected'; end if;
  update public.generation_jobs set status='failed' where id=j;
  insert into public.student_material_submissions(material_id,child_id,answers,self_check,results)
  values('fc111111-1111-4111-8111-111111111111','fb111111-1111-4111-8111-111111111111','{}','[]','[]');
  perform set_config('request.jwt.claims','{"sub":"fa111111-1111-4111-8111-111111111111"}',true);
  result := public.get_student_material_submission('fc111111-1111-4111-8111-111111111111');
  if result->>'next_request_status'<>'failed' or not (result->>'next_requested')::boolean then
    raise exception 'terminal request falsely projected as queued work'; end if;
  perform set_config('request.jwt.claims','{"sub":"fa222222-2222-4222-8222-222222222222"}',true);
  if public.get_student_material_submission('fc111111-1111-4111-8111-111111111111') is not null then
    raise exception 'request failure leaked across parents'; end if;
end $$;
rollback;
