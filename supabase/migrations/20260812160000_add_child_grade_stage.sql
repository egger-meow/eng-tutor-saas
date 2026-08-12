alter table public.children
  add column grade_stage text;

update public.children
set grade_stage = 'grade_' || grade::text
where grade_stage is null;

alter table public.children
  alter column grade_stage set not null,
  alter column grade_stage set default 'grade_7',
  add constraint children_grade_stage_check check (
    (grade_stage = 'incoming_grade_7' and grade = 7)
    or grade_stage = 'grade_' || grade::text
  );

comment on column public.children.grade_stage is
  'Explicit school stage. incoming_grade_7 is distinct from an enrolled Grade 7 learner.';

create or replace function public.worker_generation_context(job_id uuid, worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs;
  result jsonb;
begin
  select * into claimed_job
  from public.generation_jobs as job
  where job.id = $1
    and job.status = 'claimed'
    and job.claimed_by = $2
    and job.lease_expires_at > now();

  if claimed_job.id is null then
    raise exception 'job is not actively claimed by this worker';
  end if;

  select jsonb_build_object(
    'job', jsonb_build_object(
      'id', claimed_job.id, 'childId', claimed_job.child_id,
      'materialWeek', claimed_job.material_week, 'ruleVersion', claimed_job.rule_version,
      'releaseAt', claimed_job.release_at, 'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing, 'sourceMaterialId', claimed_job.source_material_id
    ),
    'child', jsonb_build_object(
      'grade', child.grade, 'gradeStage', child.grade_stage,
      'textbookVersion', child.textbook_version, 'preferences', child.preferences
    ),
    'profile', to_jsonb(profile) - 'child_id' - 'created_at' - 'updated_at',
    'learningState', to_jsonb(state) - 'child_id' - 'updated_at',
    'vocabularyProgress', coalesce((
      select jsonb_agg(to_jsonb(vocab) - 'child_id' order by vocab.updated_at desc)
      from (select * from public.child_vocab_progress where child_id = claimed_job.child_id order by updated_at desc limit 100) as vocab
    ), '[]'::jsonb),
    'grammarProgress', coalesce((
      select jsonb_agg(to_jsonb(grammar) - 'child_id' order by grammar.updated_at desc)
      from (select * from public.child_grammar_progress where child_id = claimed_job.child_id order by updated_at desc limit 100) as grammar
    ), '[]'::jsonb),
    'sourceMaterial', case when source_material.id is null then null else jsonb_build_object(
      'id', source_material.id, 'materialWeek', source_material.material_week,
      'generationSummary', source_material.generation_summary
    ) end,
    'feedback', case when feedback.id is null then null else to_jsonb(feedback) - 'child_id' - 'updated_at' end
  ) into result
  from public.children as child
  join public.child_profiles as profile on profile.child_id = child.id
  join public.child_learning_state as state on state.child_id = child.id
  left join public.materials as source_material on source_material.id = claimed_job.source_material_id
  left join public.feedback as feedback
    on feedback.child_id = claimed_job.child_id
    and feedback.material_id = claimed_job.source_material_id
    and feedback.created_at <= claimed_job.feedback_cutoff_at
  where child.id = claimed_job.child_id;

  return result;
end;
$$;

revoke all on function public.worker_generation_context(uuid, text) from public, anon, authenticated;
grant execute on function public.worker_generation_context(uuid, text) to service_role;
