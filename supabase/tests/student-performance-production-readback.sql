-- Safe production read-back: isolated synthetic identities, rollback only.
-- Never calls a queue claim, submits curriculum, sends email or publishes.
begin;
do $$
declare p uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); m uuid:=gen_random_uuid();
  j uuid:=gen_random_uuid(); evidence jsonb; ctx jsonb; replay jsonb; fingerprint text;
begin
  insert into auth.users(id,raw_user_meta_data) values(p,'{"display_name":"Synthetic S3 rollback fixture"}');
  insert into public.children(id,parent_id,display_name,grade,grade_stage,is_internal_test)
    values(c,p,'Synthetic S3 rollback fixture',7,'grade_7',true);
  insert into public.materials(id,child_id,material_week,revision,rule_version,input_snapshot,
    student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary)
  values(m,c,current_date,1,'synthetic-s3','{}','synthetic/student.pdf','synthetic/answer.pdf',
    '{"studentLesson":{"practice":[{"questions":[{"id":"wrong","prompt":"Choose one","options":["One","Two"]},{"id":"open","prompt":"Write a sentence"}]}]}}','{}');
  insert into public.student_material_submissions(material_id,child_id,answers,self_check,results)
  values(m,c,'{"wrong":"Two","open":"A synthetic response"}','[]',
    '[{"question_id":"wrong","status":"incorrect","correct_answer":"One"},{"question_id":"open","status":"open_review"},{"question_id":"empty","status":"unanswered"},{"question_id":"right","status":"correct"}]');
  evidence:=private_generation.student_performance_capsule(c,now(),m);
  assert jsonb_array_length(evidence->'items')=2,'Production evidence statuses differ';
  assert evidence#>>'{recentSubmissions,0,counts,unanswered}'='1','Unanswered status lost';
  assert not exists(select 1 from public.feedback where material_id=m),'Synthetic feedback fabricated';
  insert into public.generation_jobs(id,child_id,material_week,rule_version,idempotency_key,status,
    scheduled_for,release_at,feedback_cutoff_at,generation_due_at,max_attempts,claimed_by,lease_expires_at,source_material_id)
  values(j,c,current_date+7,'synthetic-s3',j::text,'claimed',now(),now()+interval '2 days',now(),now()+interval '1 day',5,
    'synthetic-s3-rollback',now()+interval '1 hour',m);
  ctx:=public.worker_generation_context(j,'synthetic-s3-rollback');
  assert ctx#>'{learningMemory,studentPerformanceEvidence}'=evidence,'Production context omitted evidence';
  fingerprint:='sha256:'||encode(extensions.digest(convert_to(ctx::text,'UTF8'),'sha256'),'hex');
  insert into private_generation.generation_claim_snapshots(job_id,generation_worker_id,generation_context,input_fingerprint,claimed_at)
    values(j,'synthetic-s3-rollback',ctx,fingerprint,now());
  replay:=public.worker_generation_context(j,'synthetic-s3-rollback');
  assert replay=ctx,'Production replay drift';
  begin
    perform public.worker_generation_context(j,'synthetic-s3-wrong-worker');
    raise exception 'Wrong worker received private context';
  exception when others then
    if sqlerrm='Wrong worker received private context' then raise; end if;
  end;
  assert not has_function_privilege('authenticated','public.worker_generation_context(uuid,text)','execute');
end $$;
rollback;
select 'PASS: isolated production evidence/context/snapshot/authority rollback' as verification;
