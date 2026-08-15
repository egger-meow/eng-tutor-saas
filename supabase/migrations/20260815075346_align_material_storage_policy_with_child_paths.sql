drop policy if exists weekly_materials_owner_select on storage.objects;

create policy weekly_materials_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'weekly-materials'
  and exists (
    select 1
    from public.materials as material
    join public.generation_jobs as job
      on job.material_id = material.id
      and job.child_id = material.child_id
    join public.children as child
      on child.id = material.child_id
      and child.parent_id = (select auth.uid())
    where (storage.foldername(storage.objects.name))[1] = child.id::text
      and (material.student_pdf_path = storage.objects.name
        or material.parent_answer_pdf_path = storage.objects.name)
      and job.release_at <= now()
  )
);

comment on policy weekly_materials_owner_select on storage.objects is
  'Parents may read released artifacts for their own children. Paths are child-id/job-id as written by the finisher.';
