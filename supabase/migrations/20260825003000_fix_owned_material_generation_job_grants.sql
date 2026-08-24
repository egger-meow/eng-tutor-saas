grant select (status, completed_at)
on public.generation_jobs
to authenticated;

comment on policy generation_jobs_owner_release_select on public.generation_jobs is
  'Parents may read only the release columns required by authenticated material RPCs, for jobs belonging to their children.';
