create policy generation_jobs_owner_release_select
on public.generation_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.children
    where children.id = generation_jobs.child_id
      and children.parent_id = (select auth.uid())
  )
);

grant select (material_id, child_id, release_at)
on public.generation_jobs
to authenticated;

comment on policy generation_jobs_owner_release_select on public.generation_jobs is
  'Parents may read only the release-schedule columns granted separately, for jobs belonging to their children.';
