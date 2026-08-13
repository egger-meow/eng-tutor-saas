update public.materials as material
set observations_recorded_at = material.created_at
where material.observations_recorded_at is null
  and exists (
    select 1
    from public.child_learning_state as state
    cross join lateral jsonb_array_elements(state.compact_weekly_history) as history(entry)
    where state.child_id = material.child_id
      and history.entry->>'materialId' = material.id::text
  );
