-- Synthetic fixtures only; every write rolls back.
begin;
do $$
declare
  v_parent uuid := 'ba111111-1111-4111-8111-111111111111';
  v_child uuid := 'ba222222-2222-4222-8222-222222222222';
  v_material uuid := 'ba333333-3333-4333-8333-333333333333';
  result jsonb;
begin
  insert into auth.users(id,email) values(v_parent,'next-material-test@example.com');
  insert into public.profiles(id,display_name) values(v_parent,'Synthetic parent');
  insert into public.children(id,parent_id,display_name,grade,grade_stage,is_active,is_internal_test)
  values(v_child,v_parent,'Synthetic child',7,'grade_7',true,true);
  update public.subscriptions set status='canceled' where child_id=v_child;
  insert into public.materials(id,child_id,material_week,revision,rule_version,input_snapshot,
    student_pdf_path,parent_answer_pdf_path,canonical_source,generation_summary)
  values(v_material,v_child,current_date-7,1,'weekly-material/2.0.0','{}',
    'synthetic/student.pdf','synthetic/parent.pdf','{}','{}');
  insert into public.student_material_submissions(material_id,child_id,answers,self_check,results,submitted_at)
  values(v_material,v_child,'{}','[]','[]',now());
  delete from private_generation.historical_pilot_admissions where child_id=v_child;
  update public.children set is_internal_test=false where id=v_child;
  perform set_config('request.jwt.claim.sub',v_parent::text,true);
  begin
    perform public.request_next_after_student_submission(v_material);
    raise exception 'ordinary child without entitlement was allowed';
  exception when raise_exception then
    if sqlerrm <> 'ACTIVE_ENTITLEMENT_REQUIRED' then raise; end if;
  end;
  update public.children set is_internal_test=true where id=v_child;
  perform set_config('request.jwt.claim.sub','ba444444-4444-4444-8444-444444444444',true);
  begin
    perform public.request_next_after_student_submission(v_material);
    raise exception 'non-owner was allowed';
  exception when raise_exception then
    if sqlerrm <> 'SUBMISSION_NOT_FOUND' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',v_parent::text,true);
  result := public.request_next_after_student_submission(v_material);
  if result->>'requested' <> 'true' then raise exception 'internal request failed: %',result; end if;
  result := public.request_next_after_student_submission(v_material);
  if result->>'alreadyRequested' <> 'true' then raise exception 'retry not idempotent: %',result; end if;
end $$;
rollback;
