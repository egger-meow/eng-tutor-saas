create or replace function public.get_owned_released_materials_page(
  p_child_id uuid,
  p_limit integer default 5,
  p_offset integer default 0,
  p_as_of timestamptz default now()
)
returns table (
  id uuid,
  child_id uuid,
  material_week date,
  revision integer,
  student_pdf_path text,
  parent_answer_pdf_path text,
  generation_summary jsonb,
  created_at timestamptz,
  release_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with owned_released as (
    select
      material.id,
      material.child_id,
      material.material_week,
      material.revision,
      material.student_pdf_path,
      material.parent_answer_pdf_path,
      material.generation_summary,
      material.created_at,
      job.release_at
    from public.materials as material
    left join lateral (
      select max(generation_job.release_at) as release_at
      from public.generation_jobs as generation_job
      where generation_job.material_id = material.id
    ) as job on true
    where material.child_id = p_child_id
      and (job.release_at is null or job.release_at <= p_as_of)
  )
  select
    owned_released.id,
    owned_released.child_id,
    owned_released.material_week,
    owned_released.revision,
    owned_released.student_pdf_path,
    owned_released.parent_answer_pdf_path,
    owned_released.generation_summary,
    owned_released.created_at,
    owned_released.release_at,
    count(*) over () as total_count
  from owned_released
  order by owned_released.material_week desc, owned_released.revision desc
  limit greatest(least(coalesce(p_limit, 5), 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz)
from public, anon;
grant execute on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz)
to authenticated;

comment on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz) is
  'Returns one authenticated-parent-owned released-material page. Future prepared materials never consume page slots; total_count is the complete released history size.';
