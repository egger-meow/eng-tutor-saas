-- LOCAL ONLY: isolated synthetic transaction; fixtures roll back. Never run this global-claim suite in production.
begin;
insert into auth.users(id,email) values
 ('cb111111-1111-1111-1111-111111111111','pdf-a@example.invalid'),
 ('cb222222-2222-2222-2222-222222222222','pdf-b@example.invalid');
insert into public.profiles(id,display_name) values
 ('cb111111-1111-1111-1111-111111111111','Synthetic PDF A'),
 ('cb222222-2222-2222-2222-222222222222','Synthetic PDF B') on conflict(id) do nothing;
insert into public.children(id,parent_id,display_name,grade,grade_stage,is_active) values
 ('db111111-1111-1111-1111-111111111111','cb111111-1111-1111-1111-111111111111','Synthetic PDF',7,'grade_7',true);
insert into public.materials(id,child_id,material_week,revision,rule_version,input_snapshot,
 student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary)
 values('eb111111-1111-1111-1111-111111111111','db111111-1111-1111-1111-111111111111',current_date,1,
 'synthetic-pdf-test','{}','synthetic/student.pdf','synthetic/parent.pdf','{}','{}');
insert into public.generation_jobs(id,child_id,material_id,material_week,rule_version,idempotency_key,
 scheduled_for,release_at,feedback_cutoff_at,generation_due_at,status,completed_at)
 values('fb111111-1111-1111-1111-111111111111','db111111-1111-1111-1111-111111111111',
 'eb111111-1111-1111-1111-111111111111',current_date,'synthetic-pdf-test','synthetic-pdf-test',
 now()-interval '3 days',now()-interval '1 hour',now()-interval '49 hours',now()-interval '25 hours','completed',now());
set local role authenticated;
set local "request.jwt.claims"='{"sub":"cb222222-2222-2222-2222-222222222222"}';
do $$ begin
 begin
  perform public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
  raise exception 'cross family access accepted';
 exception when insufficient_privilege then null; end;
 if has_table_privilege('authenticated','public.material_pdf_artifacts','select')
 or has_function_privilege('authenticated','public.claim_material_pdf(text)','execute') then
  raise exception 'browser has trusted cache authority'; end if;
end $$;
set local "request.jwt.claims"='{"sub":"cb111111-1111-1111-1111-111111111111"}';
do $$ declare a jsonb; b jsonb; begin
 a:=public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
 b:=public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
 if a->>'id' is distinct from b->>'id' or a->>'state'<>'ready' then raise exception 'not idempotent'; end if;
 begin
  perform public.request_material_pdf('eb111111-1111-1111-1111-111111111111','parent');
  raise exception 'locked answer accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare a public.material_pdf_artifacts; c jsonb; c2 jsonb; begin
 select * into a from public.material_pdf_artifacts where material_id='eb111111-1111-1111-1111-111111111111';
 perform public.queue_missing_material_pdf(a.id,'wrong-path');
 if (select state from public.material_pdf_artifacts where id=a.id)<>'ready' then raise exception 'stale invalidation'; end if;
 perform public.queue_missing_material_pdf(a.id,a.storage_path);
  -- Refuse to disturb any other local test work.
 if not exists(select 1 from public.material_pdf_artifacts where material_id<>a.material_id and state in ('queued','rendering')) then
  c:=public.claim_material_pdf('1.6.1');
  if c->>'id' is distinct from a.id::text or public.claim_material_pdf('1.6.1') is not null then raise exception 'duplicate live claim'; end if;
  update public.material_pdf_artifacts set lease_until=now()-interval '1 second' where id=a.id;
  c2:=public.claim_material_pdf('1.6.1');
  if c2->>'leaseToken'=c->>'leaseToken' then raise exception 'expired lease not replaced'; end if;
  perform public.fail_material_pdf(a.id,(c->>'leaseToken')::uuid);
  if (select state from public.material_pdf_artifacts where id=a.id)<>'rendering' then raise exception 'stale worker changed state'; end if;
  if not public.finish_material_pdf(a.id,(c2->>'leaseToken')::uuid,c2->>'path',2000,100) then raise exception 'valid completion rejected'; end if;
 end if;
 update public.material_pdf_artifacts set state='ready',expires_at=now()-interval '1 second' where id=a.id;
end $$;
set local role authenticated;
do $$ declare a jsonb; begin
 a:=public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
 if a->>'state'<>'queued' or a->>'path' is not null then raise exception 'expired cache served'; end if;
end $$;
reset role;
update public.material_pdf_artifacts set state='failed',updated_at=now()-interval '1 minute'
 where material_id='eb111111-1111-1111-1111-111111111111';
set local role authenticated;
do $$ begin
 if public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student')->>'state'<>'failed' then raise exception 'implicit retry'; end if;
 if public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student',true)->>'state'<>'queued' then raise exception 'explicit retry failed'; end if;
end $$;
reset role;
update public.generation_jobs set release_at=now()+interval '1 day',
 feedback_cutoff_at=now()-interval '1 day',generation_due_at=now()
 where id='fb111111-1111-1111-1111-111111111111';
set local role authenticated;
do $$ begin
 begin
  perform public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
  raise exception 'future release accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
