drop policy if exists weekly_materials_owner_select on storage.objects;

create policy weekly_materials_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'weekly-materials'
  and exists (
    select 1
    from public.materials
    join public.children on children.id = materials.child_id
    where children.parent_id = (select auth.uid())
      and storage.objects.name in (
        materials.student_pdf_path,
        materials.parent_answer_pdf_path
      )
  )
);

comment on policy weekly_materials_owner_select on storage.objects is
  'Parents may read only immutable material artifacts recorded for their own children.';
