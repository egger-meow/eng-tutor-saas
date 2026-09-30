begin;
insert into auth.users(id,email) values
 ('cb111111-1111-1111-1111-111111111111','pdf-a@example.invalid'),
 ('cb222222-2222-2222-2222-222222222222','pdf-b@example.invalid');
insert into public.children(id,parent_id,display_name,grade,grade_stage,is_active) values
 ('db111111-1111-1111-1111-111111111111','cb111111-1111-1111-1111-111111111111','Synthetic PDF Readback',7,'grade_7',true);
insert into public.materials(id,child_id,material_week,revision,rule_version,input_snapshot,student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary)
 values('eb111111-1111-1111-1111-111111111111','db111111-1111-1111-1111-111111111111',current_date,1,'synthetic-pdf-readback','{}','synthetic/student.pdf','synthetic/parent.pdf','{}','{}');
insert into public.generation_jobs(id,child_id,material_id,material_week,rule_version,idempotency_key,scheduled_for,release_at,feedback_cutoff_at,generation_due_at,status,completed_at)
 values('fb111111-1111-1111-1111-111111111111','db111111-1111-1111-1111-111111111111','eb111111-1111-1111-1111-111111111111',current_date,'synthetic-pdf-readback','synthetic-pdf-readback',now()-interval '3 days',now()-interval '1 hour',now()-interval '49 hours',now()-interval '25 hours','completed',now());
set local role authenticated;
set local "request.jwt.claims"='{"sub":"cb222222-2222-2222-2222-222222222222"}';
do $$ begin
 begin
  perform public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
  raise exception 'cross-family access accepted';
 exception when insufficient_privilege then null; end;
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
update public.materials set answer_unlock_requires_submission=false where id='eb111111-1111-1111-1111-111111111111';
set local role authenticated;
do $$ begin
 if public.request_material_pdf('eb111111-1111-1111-1111-111111111111','parent')->>'state'<>'ready' then raise exception 'legacy answer unavailable'; end if;
end $$;
reset role;
update public.generation_jobs set release_at=now()+interval '1 day',feedback_cutoff_at=now()-interval '1 day',generation_due_at=now() where id='fb111111-1111-1111-1111-111111111111';
set local role authenticated;
do $$ begin
 begin
  perform public.request_material_pdf('eb111111-1111-1111-1111-111111111111','student');
  raise exception 'future release accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select true as synthetic_scoped_readback_passed;
