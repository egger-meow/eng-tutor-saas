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
