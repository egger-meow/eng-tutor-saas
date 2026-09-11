\set ON_ERROR_STOP on
-- LOCAL-ONLY, disposable Supabase Docker database. Everything rolls back.
begin;
do $test$
declare
 p uuid:=gen_random_uuid(); c uuid; j uuid; old_j uuid; ctx jsonb; old_ctx jsonb; old_row jsonb; claimed jsonb; ct jsonb;
 deployed_ct jsonb:=public.worker_current_authoring_contract();
 old_ct jsonb:='{"releaseId":"rel_1.8.2","schemaVersion":"2.5.0","promptVersion":"2.13.2","engineVersion":"1.8.2","workerVersion":"1.7.2","rendererVersion":"1.5.0","bundleVersion":"2.13.2-prod","bundleSha256":"227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340"}';
 new_ct jsonb:='{"releaseId":"rel_1.9.0","schemaVersion":"2.6.0","promptVersion":"2.14.0","engineVersion":"1.9.0","workerVersion":"1.8.0","rendererVersion":"1.6.0","bundleVersion":"2.14.0-prod","bundleSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}';
 original_def text:=pg_get_functiondef('public.worker_current_authoring_contract()'::regprocedure);
 payload jsonb; rejected boolean; k text; lane integer; w text;
begin
 execute format('create or replace function public.worker_current_authoring_contract() returns jsonb language sql stable security definer set search_path = '''' as %L','select '||quote_literal(old_ct::text)||'::jsonb');
 assert not exists(select 1 from public.generation_jobs where status in ('pending','claimed')),'Requires isolated empty local queue';
 insert into auth.users(id,raw_user_meta_data) values(p,'{"display_name":"Local release fixture"}');
 update public.profiles set terms_version='2026-08-26-v2',privacy_version='2026-08-16-v1',legal_accepted_at=now() where id=p;
 for lane in 0..2 loop
  if lane=1 then
   execute format('create or replace function public.worker_current_authoring_contract() returns jsonb language sql stable security definer set search_path = '''' as %L','select '||quote_literal(new_ct::text)||'::jsonb');
  end if;
  ct:=public.worker_current_authoring_contract(); c:=gen_random_uuid();
  insert into public.children(id,parent_id,display_name,grade,grade_stage,is_internal_test) values(c,p,'Local release fixture',7,'grade_7',true);
  delete from public.generation_jobs where child_id=c;
  j:=gen_random_uuid();
  insert into public.generation_jobs(id,child_id,material_week,rule_version,idempotency_key,status,scheduled_for,release_at,feedback_cutoff_at,generation_due_at,max_attempts)
   values(j,c,current_date,'test-release',j::text,'pending',now()-interval '1 hour',now()+interval '12 hours',now()-interval '36 hours',now()-interval '12 hours',5);
  w:=case when lane=2 then 'chatgpt-week1-fast' else 'local-release-test' end;
  claimed:=case when lane=2 then private_generation.claim_week1_fast_generation_batch(w) else private_generation.chatgpt_claim_generation_batch(w) end;
  select item into ctx from jsonb_array_elements(claimed->'claimed') item where item#>>'{job,id}'=j::text;
  assert ctx is not null,'Actual claim path did not return fixture';
  assert ctx->'activeAuthoringContract'=ct,'Claim contract drift';
  assert ctx->>'targetReleaseId'=ct->>'releaseId','Claim target drift';
  if lane=0 then
   old_j:=j; old_ctx:=ctx;
   select to_jsonb(s) into old_row from private_generation.generation_claim_snapshots s where job_id=j;
   continue;
  end if;
  payload:=jsonb_build_object('metadata',ct||jsonb_build_object('jobId',j::text,'childId',c::text,'inputFingerprint',ctx->>'inputFingerprint'));
  foreach k in array array['releaseId','schemaVersion','promptVersion','engineVersion','workerVersion','rendererVersion'] loop
   rejected:=false;
   begin
    perform private_generation.chatgpt_submit_curriculum_package(j,w,jsonb_set(payload,array['metadata',k],to_jsonb(case when k='schemaVersion' then '2.5.0' else 'forged' end::text)));
   exception when raise_exception then
    if sqlerrm not like 'AUTHORING_CONTRACT_MISMATCH:%' then raise; end if;
    rejected:=true;
   end;
   assert rejected,'Mismatched metadata accepted';
   assert not exists(select 1 from private_generation.curriculum_submissions where job_id=j),'Mismatch mutated submissions';
  end loop;
  perform private_generation.chatgpt_submit_curriculum_package(j,w,payload);
  assert exists(select 1 from private_generation.curriculum_submissions where job_id=j and canonical_source=payload),'Target submission rejected or altered';
 end loop;
 assert (select to_jsonb(s)=old_row from private_generation.generation_claim_snapshots s where job_id=old_j),'Old snapshot mutated';
 payload:=jsonb_build_object('metadata',old_ct||jsonb_build_object('jobId',old_j::text,'childId',old_ctx#>>'{job,childId}','inputFingerprint',old_ctx->>'inputFingerprint'));
 perform private_generation.chatgpt_submit_curriculum_package(old_j,'local-release-test',payload);
 assert exists(select 1 from private_generation.curriculum_submissions where job_id=old_j and canonical_source=payload),'Old in-flight submission rejected or relabeled';
 execute original_def;
 assert public.worker_current_authoring_contract()=deployed_ct;
 raise notice 'PASS: both claim paths, target acceptance, six mismatches per path, predecessor immutability';
end;
$test$;
rollback;
