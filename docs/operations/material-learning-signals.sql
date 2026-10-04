-- Service/operator SQL only. No private lesson, answer, feedback or identity fields.
-- Rolling 90-day descriptive counts, not a clean acquisition conversion cohort.
select e.event_name, e.origin, count(*) as materials
from public.material_learning_events e
join public.materials m on m.id=e.material_id
join public.children c on c.id=m.child_id and not c.is_internal_test
where e.created_at >= now()-interval '90 days'
group by e.event_name,e.origin order by e.event_name;

-- Second published packet usage, using canonical sequence authority, not date arithmetic.
-- Unknown/missing sequence is excluded; first click is not proof of learning/completion.
select e.event_name,count(distinct s.child_id) as children_using_second_packet
from public.material_learning_events e
join public.child_weekly_learning_snapshots s on s.material_id=e.material_id and s.sequence_number=2
join public.children c on c.id=s.child_id and not c.is_internal_test
where e.created_at >= now()-interval '90 days'
  and e.event_name in ('material_opened','answer_started','material_submitted','student_downloaded')
group by e.event_name order by e.event_name;

-- Failure is a deduplicated signal per material, not the number of failed save attempts.
select e.material_id,e.created_at,
  exists(select 1 from public.student_material_submissions s where s.material_id=e.material_id) as later_submitted
from public.material_learning_events e where e.event_name='save_failed'
order by e.created_at desc limit 50;

-- Rendering metadata only. Do not select canonical_source or raw error payloads.
select state,count(*) as artifacts,min(requested_at) as oldest_request,
  max(attempts) as maximum_attempts,
  round(avg(render_ms)) as mean_render_ms,sum(byte_size) as cached_bytes
from public.material_pdf_artifacts group by state order by state;

select count(*) as expired_learning_events from public.material_learning_events
where created_at < now()-interval '90 days';

-- 48-hour activation signal: answer_started within 48h of actual readiness, or paper_started self-report.
-- Excludes internal tests; descriptive signal only.
select
  count(distinct m.id) as released_materials,
  count(distinct case when e.created_at >= greatest(j.release_at, j.completed_at) and e.created_at < greatest(j.release_at, j.completed_at) + interval '48 hours' then m.id end) as online_started_within_48h,
  count(distinct case when chk.paper_started_at >= greatest(j.release_at, j.completed_at) and chk.paper_started_at < greatest(j.release_at, j.completed_at) + interval '48 hours' then m.id end) as paper_self_reported_within_48h
from public.materials m
join public.children c on c.id = m.child_id and not c.is_internal_test
join public.generation_jobs j on j.material_id = m.id and j.child_id = m.child_id and j.status = 'completed' and j.completed_at is not null
left join public.material_learning_events e on e.material_id = m.id and e.event_name = 'answer_started'
left join public.material_learning_checkins chk on chk.material_id = m.id
where greatest(j.release_at, j.completed_at) >= now() - interval '90 days'
  and greatest(j.release_at, j.completed_at) <= now();

-- 7-day multi-day answer activity signals: at least 2 distinct UTC dates with answer_changed within 7 days of release.
select
  count(distinct m.id) as materials_with_multi_day_activity,
  count(distinct c.id) as children_with_multi_day_activity
from public.materials m
join public.children c on c.id = m.child_id and not c.is_internal_test
join public.generation_jobs j on j.material_id = m.id and j.child_id = m.child_id and j.status = 'completed' and j.completed_at is not null
join lateral (
  select count(distinct signal_date) as active_dates
  from public.material_learning_day_signals s
  where s.material_id = m.id and s.signal_name = 'answer_changed'
    and s.created_at >= greatest(j.release_at, j.completed_at)
    and s.created_at < greatest(j.release_at, j.completed_at) + interval '7 days'
) s on s.active_dates >= 2
where greatest(j.release_at, j.completed_at) >= now() - interval '90 days'
  and greatest(j.release_at, j.completed_at) + interval '7 days' <= now();

-- Learning barriers reported by parents: distribution by reason.
-- Purely for parent support analysis; not fed into prompt generation.
select
  barrier,
  count(*) as reported_count
from public.material_learning_checkins chk
join public.materials m on m.id = chk.material_id
join public.children c on c.id = m.child_id and not c.is_internal_test
where barrier is not null
group by barrier
order by reported_count desc;

select count(*) as expired_day_signals from public.material_learning_day_signals
where created_at < now() - interval '90 days';
