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
-- Excludes internal tests and immature observations; descriptive signal only.
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
  and greatest(j.release_at, j.completed_at) + interval '48 hours' <= now();

-- First-packet readiness cohort. One row per child before aggregating, so retries
-- cannot multiply the denominator. This is NOT a signup-to-delivery cohort.
-- answer_started is best-effort first-input evidence, not confirmed saved work.
-- UTC-day changes are activity proxies, not independent sessions or mastery.
-- Set this only from verified deployment/collection evidence for BOTH event and
-- day-signal streams. The first observed event does not prove collection began.
-- NULL deliberately withholds rates until coverage is established.
with coverage as (
  select null::timestamptz as verified_tracking_started_at
), ready_packets as (
  select m.child_id, m.id as material_id, s.sequence_number,
    min(greatest(j.release_at, j.completed_at)) as ready_at
  from public.materials m
  join public.children c on c.id=m.child_id and not c.is_internal_test
  join public.child_weekly_learning_snapshots s on s.material_id=m.id and s.child_id=m.child_id
  join public.generation_jobs j on j.material_id=m.id and j.child_id=m.child_id
    and j.status='completed' and j.completed_at is not null
  where s.sequence_number in (1,2)
  group by m.child_id,m.id,s.sequence_number
), first_packets as (
  select distinct on (child_id) child_id,material_id,ready_at
  from ready_packets where sequence_number=1 and ready_at<=now()
  order by child_id,ready_at,material_id
), observations as (
  select f.*,
    exists(select 1 from public.material_learning_events e
      where e.material_id=f.material_id and e.event_name='answer_started'
        and e.created_at>=f.ready_at and e.created_at<f.ready_at+interval '48 hours') as started_48h,
    (select count(distinct d.signal_date) from public.material_learning_day_signals d
      where d.material_id=f.material_id and d.signal_name='answer_changed'
        and d.created_at>=f.ready_at and d.created_at<f.ready_at+interval '7 days')>=2 as multi_day_7d,
    exists(select 1 from ready_packets p join public.material_learning_events e on e.material_id=p.material_id
      where p.child_id=f.child_id and p.sequence_number=2 and e.event_name='answer_started'
        and e.created_at>=p.ready_at and e.created_at>=f.ready_at
        and e.created_at<f.ready_at+interval '28 days') as second_started_28d
  from first_packets f cross join coverage c
  where f.ready_at>=now()-interval '60 days'
    and f.ready_at>=c.verified_tracking_started_at
)
select (select verified_tracking_started_at from coverage) as verified_tracking_started_at,
  (select count(*) from first_packets f where f.ready_at>=now()-interval '60 days') as candidate_children,
  (select count(*) from first_packets f cross join coverage c
    where f.ready_at>=now()-interval '60 days'
      and (c.verified_tracking_started_at is null or f.ready_at<c.verified_tracking_started_at)) as coverage_unverified_or_pretracking_children,
  count(*) as first_packet_ready_children,
  count(*) filter(where ready_at+interval '48 hours'<=now()) as mature_48h,
  count(*) filter(where ready_at+interval '48 hours'>now()) as pending_48h,
  count(*) filter(where ready_at+interval '48 hours'<=now() and started_48h) as started_48h,
  count(*) filter(where ready_at+interval '7 days'<=now()) as mature_7d,
  count(*) filter(where ready_at+interval '7 days'>now()) as pending_7d,
  count(*) filter(where ready_at+interval '7 days'<=now() and multi_day_7d) as multi_day_7d,
  count(*) filter(where ready_at+interval '28 days'<=now()) as mature_28d,
  count(*) filter(where ready_at+interval '28 days'>now()) as pending_28d,
  count(*) filter(where ready_at+interval '28 days'<=now() and second_started_28d) as second_started_28d
from observations;

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
