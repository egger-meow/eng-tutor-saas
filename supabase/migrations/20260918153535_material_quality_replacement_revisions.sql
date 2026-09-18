-- Audited quality replacement lane for already-released curriculum materials.
-- A replacement creates a new material revision and preserves the original row/artifacts.

create table if not exists private_generation.material_replacement_jobs (
  job_id uuid primary key references public.generation_jobs(id) on delete cascade,
  source_material_id uuid not null references public.materials(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete cascade,
  target_revision integer not null check (target_revision >= 2),
  reason text not null check (char_length(reason) between 1 and 1000),
  completed_material_id uuid references public.materials(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (source_material_id, target_revision),
  foreign key (source_material_id, child_id) references public.materials(id, child_id) on delete restrict
);

alter table private_generation.material_replacement_jobs enable row level security;
revoke all on table private_generation.material_replacement_jobs from public, anon, authenticated, service_role;

create or replace function public.admin_create_material_replacement_jobs(
  p_material_ids uuid[],
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_material_id uuid;
  v_material public.materials%rowtype;
  v_existing private_generation.material_replacement_jobs%rowtype;
  v_job_id uuid;
  v_target_revision integer;
  v_result jsonb := '[]'::jsonb;
begin
  if p_material_ids is null or cardinality(p_material_ids) = 0 then
    raise exception 'at least one material id is required';
  end if;
  if cardinality(p_material_ids) > 50 then
    raise exception 'at most 50 material ids may be repaired at once';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'replacement reason is required';
  end if;

  foreach v_material_id in array p_material_ids loop
    select * into v_material
    from public.materials
    where id = v_material_id
    for update;

    if v_material.id is null then
      raise exception 'material % not found', v_material_id;
    end if;
    if not exists (
      select 1 from public.generation_jobs job
      where job.material_id = v_material.id
        and job.child_id = v_material.child_id
        and job.status = 'completed'
        and job.completed_at is not null
    ) then
      raise exception 'material % is not a completed delivery', v_material_id;
    end if;

    select replacement.* into v_existing
    from private_generation.material_replacement_jobs replacement
    join public.generation_jobs job on job.id = replacement.job_id
    where replacement.source_material_id = v_material.id
      and (replacement.completed_material_id is not null or job.status in ('pending','claimed'))
    order by replacement.target_revision desc
    limit 1;

    if v_existing.job_id is not null then
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'sourceMaterialId', v_material.id,
        'jobId', v_existing.job_id,
        'targetRevision', v_existing.target_revision,
        'existing', true,
        'completedMaterialId', v_existing.completed_material_id
      ));
      continue;
    end if;

    select coalesce(max(material.revision), 0) + 1
    into v_target_revision
    from public.materials material
    where material.child_id = v_material.child_id
      and material.material_week = v_material.material_week;

    insert into public.generation_jobs (
      child_id, material_week, rule_version, idempotency_key, status,
      scheduled_for, source_material_id, release_at,
      feedback_cutoff_at, generation_due_at
    ) values (
      v_material.child_id,
      v_material.material_week,
      v_material.rule_version,
      'quality-replacement:' || v_material.id::text || ':r' || v_target_revision::text,
      'pending',
      now(),
      v_material.id,
      now(),
      now() - interval '48 hours',
      now() - interval '24 hours'
    )
    returning id into v_job_id;

    insert into private_generation.material_replacement_jobs (
      job_id, source_material_id, child_id, target_revision, reason
    ) values (
      v_job_id, v_material.id, v_material.child_id, v_target_revision, trim(p_reason)
    );

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'sourceMaterialId', v_material.id,
      'jobId', v_job_id,
      'targetRevision', v_target_revision,
      'existing', false
    ));
  end loop;

  return v_result;
end;
$$;

revoke all on function public.admin_create_material_replacement_jobs(uuid[], text)
from public, anon, authenticated;
grant execute on function public.admin_create_material_replacement_jobs(uuid[], text) to service_role;

create or replace function public.worker_claim_material_replacement_batch(
  p_worker_id text,
  p_job_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract jsonb;
  v_claimed jsonb := '[]'::jsonb;
  v_row record;
  v_context jsonb;
  v_fingerprint text;
begin
  if nullif(trim(p_worker_id), '') is null or char_length(trim(p_worker_id)) < 3 then
    raise exception 'worker id is required';
  end if;
  if p_job_ids is null or cardinality(p_job_ids) = 0 then
    raise exception 'replacement job ids are required';
  end if;
  if cardinality(p_job_ids) > 10 then
    raise exception 'replacement claim limit is 10';
  end if;

  v_contract := public.worker_current_authoring_contract();

  for v_row in
    select
      job.id as job_id,
      replacement.source_material_id,
      replacement.target_revision,
      replacement.reason,
      source.canonical_source as previous_canonical_source
    from public.generation_jobs job
    join private_generation.material_replacement_jobs replacement on replacement.job_id = job.id
    join public.materials source on source.id = replacement.source_material_id
    where job.id = any(p_job_ids)
      and replacement.completed_material_id is null
      and (
        job.status = 'pending'
        or (job.status = 'claimed' and job.lease_expires_at < now())
      )
    order by job.created_at, job.id
    for update of job skip locked
  loop
    update public.generation_jobs
    set status = 'claimed',
        claimed_by = p_worker_id,
        lease_expires_at = now() + interval '6 hours',
        attempt_count = attempt_count + 1,
        error_code = null,
        error_message = null,
        updated_at = now()
    where id = v_row.job_id;

    v_context := public.worker_generation_context(v_row.job_id, p_worker_id)
      || jsonb_build_object(
        'qualityTrends', public.worker_quality_trends(
          (select child_id from public.generation_jobs where id = v_row.job_id)
        ),
        'targetReleaseId', v_contract->>'releaseId',
        'activeAuthoringContract', v_contract,
        'replacementContext', jsonb_build_object(
          'sourceMaterialId', v_row.source_material_id,
          'targetRevision', v_row.target_revision,
          'reason', v_row.reason,
          'previousCanonicalPackage', v_row.previous_canonical_source,
          'repairInstructions', jsonb_build_array(
            'This is an audited quality replacement for an already released packet.',
            'Preserve the valid topic, learning targets, research, and stable existing question IDs.',
            'Repair the underfilled workload with useful dependent practice and writing; do not fake estimatedMinutes.',
            'Use the current active authoring contract metadata and the new replacement job identity.',
            'Do not treat this replacement as a new learning week.'
          )
        )
      );

    v_fingerprint := encode(
      extensions.digest(convert_to(v_context::text, 'UTF8'), 'sha256'),
      'hex'
    );

    v_context := v_context || jsonb_build_object('inputFingerprint', v_fingerprint);

    insert into private_generation.generation_claim_snapshots (
      job_id, generation_worker_id, generation_context, input_fingerprint, claimed_at
    ) values (
      v_row.job_id, p_worker_id, v_context, v_fingerprint, now()
    )
    on conflict (job_id) do update set
      generation_worker_id = excluded.generation_worker_id,
      generation_context = excluded.generation_context,
      input_fingerprint = excluded.input_fingerprint,
      claimed_at = excluded.claimed_at;

    v_claimed := v_claimed || jsonb_build_array(v_context);
  end loop;

  return jsonb_build_object(
    'workerId', p_worker_id,
    'claimedCount', jsonb_array_length(v_claimed),
    'claimed', v_claimed,
    'activeAuthoringContract', v_contract
  );
end;
$$;

revoke all on function public.worker_claim_material_replacement_batch(text, uuid[])
from public, anon, authenticated;
grant execute on function public.worker_claim_material_replacement_batch(text, uuid[]) to service_role;

-- Completion remains the normal Finisher boundary, but replacement jobs insert the
-- requested revision and deliberately do not advance service cadence.
create or replace function public.worker_complete_generation_job(
  job_id uuid,
  worker_id text,
  student_pdf_path text,
  parent_answer_pdf_path text,
  canonical_source jsonb,
  generation_summary jsonb,
  prompt_version text,
  generator_version text,
  model_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job public.generation_jobs%rowtype;
  replacement_job private_generation.material_replacement_jobs%rowtype;
  completed_material_id uuid;
  expected_prefix text;
  effective_release_at timestamptz;
  next_release_at timestamptz;
  next_material_week date;
  child_tz text;
begin
  if job_id is null then raise exception 'job_id is required'; end if;
  if worker_id is null or char_length(worker_id) < 3 then raise exception 'worker_id is required'; end if;

  select * into claimed_job
  from public.generation_jobs
  where id = job_id
  for update;

  if claimed_job.status = 'completed' then
    return claimed_job.material_id;
  end if;

  if claimed_job.id is null
    or claimed_job.status <> 'claimed'
    or claimed_job.claimed_by <> worker_id
    or claimed_job.lease_expires_at <= now() then
    raise exception 'job is not actively claimed by this worker';
  end if;

  select * into replacement_job
  from private_generation.material_replacement_jobs replacement
  where replacement.job_id = claimed_job.id
  for update;

  expected_prefix := claimed_job.child_id::text || '/' || claimed_job.id::text || '/';
  if student_pdf_path <> expected_prefix || 'student.pdf'
    or parent_answer_pdf_path <> expected_prefix || 'parent-answer.pdf' then
    raise exception 'artifact paths do not match the claimed job';
  end if;

  select coalesce(timezone, 'Asia/Taipei') into child_tz
  from public.children
  where id = claimed_job.child_id and is_active;

  if replacement_job.job_id is not null then
    select least(coalesce(max(source_job.release_at), now()), now())
    into effective_release_at
    from public.generation_jobs source_job
    where source_job.material_id = replacement_job.source_material_id;
  else
    effective_release_at := case
      when claimed_job.source_material_id is null
        then least(coalesce(claimed_job.release_at, now()), now())
      else claimed_job.release_at
    end;
  end if;

  insert into public.materials (
    child_id, material_week, revision, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path, generation_summary,
    canonical_source, prompt_version, generator_version, model_name
  ) values (
    claimed_job.child_id,
    claimed_job.material_week,
    case when replacement_job.job_id is null then 1 else replacement_job.target_revision end,
    claimed_job.rule_version,
    jsonb_build_object(
      'sourceMaterialId', claimed_job.source_material_id,
      'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing,
      'replacementForMaterialId', replacement_job.source_material_id,
      'replacementRevision', replacement_job.target_revision
    ),
    $3, $4, $6,
    $5, $7, $8, $9
  ) returning id into completed_material_id;

  update public.generation_jobs
  set status = 'completed', material_id = completed_material_id,
      release_at = effective_release_at,
      feedback_cutoff_at = effective_release_at - interval '48 hours',
      generation_due_at = effective_release_at - interval '24 hours',
      completed_at = now(), lease_expires_at = null,
      error_code = null, error_message = null
  where id = claimed_job.id;

  if replacement_job.job_id is not null then
    update private_generation.material_replacement_jobs
    set completed_material_id = completed_material_id,
        completed_at = now()
    where job_id = claimed_job.id;
    return completed_material_id;
  end if;

  next_release_at := greatest(
    effective_release_at + interval '7 days',
    ((now() at time zone coalesce(child_tz, 'Asia/Taipei'))::date + 1)::timestamp at time zone coalesce(child_tz, 'Asia/Taipei')
  );
  next_material_week := (next_release_at at time zone coalesce(child_tz, 'Asia/Taipei'))::date;

  insert into public.generation_jobs (
    child_id, material_week, rule_version, idempotency_key, status,
    scheduled_for, source_material_id, release_at,
    feedback_cutoff_at, generation_due_at
  ) values (
    claimed_job.child_id,
    next_material_week,
    claimed_job.rule_version,
    claimed_job.child_id::text || ':' || next_material_week::text || ':r1',
    'pending', now(), completed_material_id,
    next_release_at,
    next_release_at - interval '48 hours',
    next_release_at - interval '24 hours'
  ) on conflict (idempotency_key) do nothing;

  update public.children
  set next_generation_at = next_release_at - interval '24 hours'
  where id = claimed_job.child_id;

  return completed_material_id;
end;
$$;

revoke all on function public.worker_complete_generation_job(uuid, text, text, text, jsonb, jsonb, text, text, text)
from public, anon, authenticated;
grant execute on function public.worker_complete_generation_job(uuid, text, text, text, jsonb, jsonb, text, text, text)
to service_role;

-- Dashboard history exposes only the newest released revision for a logical week.
drop function if exists public.get_owned_released_materials_page(uuid, integer, integer, timestamptz);
create function public.get_owned_released_materials_page(
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
  week_number integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with released as (
    select
      material.id,
      material.child_id,
      material.material_week,
      material.revision,
      material.student_pdf_path,
      material.parent_answer_pdf_path,
      material.generation_summary,
      material.created_at,
      job.release_at,
      coalesce(
        (
          select max(snapshot.sequence_number)
          from public.child_weekly_learning_snapshots snapshot
          join public.materials snapshot_material on snapshot_material.id = snapshot.material_id
          where snapshot.child_id = material.child_id
            and snapshot_material.material_week = material.material_week
        ),
        (
          select count(distinct earlier.material_week)::integer
          from public.materials earlier
          join public.generation_jobs earlier_job
            on earlier_job.material_id = earlier.id and earlier_job.child_id = earlier.child_id
          where earlier.child_id = material.child_id
            and earlier_job.status = 'completed'
            and earlier_job.release_at <= p_as_of
            and earlier.material_week <= material.material_week
        )
      ) as week_number
    from public.materials material
    join public.generation_jobs job
      on job.material_id = material.id and job.child_id = material.child_id
    where material.child_id = p_child_id
      and job.status = 'completed'
      and job.completed_at is not null
      and job.release_at <= p_as_of
  ),
  latest as (
    select *
    from (
      select released.*,
        row_number() over (
          partition by released.child_id, released.material_week
          order by released.revision desc, released.created_at desc, released.id desc
        ) as revision_rank
      from released
    ) ranked
    where ranked.revision_rank = 1
  )
  select
    latest.id, latest.child_id, latest.material_week, latest.revision,
    latest.student_pdf_path, latest.parent_answer_pdf_path,
    latest.generation_summary, latest.created_at, latest.release_at,
    latest.week_number, count(*) over () as total_count
  from latest
  order by latest.material_week desc, latest.revision desc
  limit greatest(least(coalesce(p_limit, 5), 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz)
from public, anon;
grant execute on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz)
to authenticated;

-- An authenticated historical URL resolves to the newest released revision of that week.
create or replace function public.get_owned_released_material(p_material_id uuid)
returns table (id uuid, child_id uuid, child_name text, material_week date, revision integer,
  student_pdf_path text, parent_answer_pdf_path text, generation_summary jsonb, created_at timestamptz, release_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with requested as (
    select seed.child_id, seed.material_week, child.display_name
    from public.materials seed
    join public.children child on child.id = seed.child_id and child.parent_id = (select auth.uid())
    where seed.id = p_material_id
  )
  select material.id, material.child_id, requested.display_name, material.material_week, material.revision,
    material.student_pdf_path, material.parent_answer_pdf_path, material.generation_summary, material.created_at, job.release_at
  from requested
  join lateral (
    select candidate.*
    from public.materials candidate
    join public.generation_jobs candidate_job
      on candidate_job.material_id = candidate.id and candidate_job.child_id = candidate.child_id
    where candidate.child_id = requested.child_id
      and candidate.material_week = requested.material_week
      and candidate_job.status = 'completed'
      and candidate_job.completed_at is not null
      and candidate_job.release_at <= now()
    order by candidate.revision desc, candidate.created_at desc, candidate.id desc
    limit 1
  ) material on true
  join public.generation_jobs job on job.material_id = material.id and job.child_id = material.child_id
  where job.status = 'completed' and job.completed_at is not null and job.release_at <= now();
$$;

-- Existing scoped email links also resolve to the corrected newest revision.
create or replace function public.resolve_material_email_access(p_token_hash text, p_session_user_id uuid default null)
returns table (material_id uuid, child_id uuid, parent_id uuid, child_name text, material_week date,
  week_number bigint, student_pdf_path text, parent_answer_pdf_path text, owner_session_matches boolean)
language sql stable security definer set search_path = '' as $$
  with access_seed as (
    select delivery.material_id as requested_material_id, delivery.child_id, delivery.parent_id,
      seed.material_week, child.display_name
    from public.material_email_deliveries delivery
    join public.materials seed on seed.id = delivery.material_id and seed.child_id = delivery.child_id
    join public.children child on child.id = delivery.child_id and child.parent_id = delivery.parent_id
    join public.generation_jobs seed_job on seed_job.material_id = seed.id and seed_job.child_id = child.id
    where delivery.access_token_hash = p_token_hash
      and delivery.access_revoked_at is null and delivery.access_expires_at > now()
      and seed_job.status = 'completed' and seed_job.completed_at is not null and seed_job.release_at <= now()
  )
  select material.id, seed.child_id, seed.parent_id, seed.display_name, material.material_week,
    (
      select count(distinct earlier.material_week)
      from public.materials earlier
      join public.generation_jobs earlier_job
        on earlier_job.material_id = earlier.id and earlier_job.child_id = earlier.child_id
      where earlier.child_id = seed.child_id
        and earlier_job.status = 'completed'
        and earlier_job.release_at <= now()
        and earlier.material_week <= material.material_week
    ),
    material.student_pdf_path, material.parent_answer_pdf_path,
    seed.parent_id = p_session_user_id
  from access_seed seed
  join lateral (
    select candidate.*
    from public.materials candidate
    join public.generation_jobs candidate_job
      on candidate_job.material_id = candidate.id and candidate_job.child_id = candidate.child_id
    where candidate.child_id = seed.child_id
      and candidate.material_week = seed.material_week
      and candidate_job.status = 'completed'
      and candidate_job.completed_at is not null
      and candidate_job.release_at <= now()
    order by candidate.revision desc, candidate.created_at desc, candidate.id desc
    limit 1
  ) material on true;
$$;

-- Quality replacements are silent corrections; do not enqueue a duplicate notification email.
do $migration$
declare
  definition text;
  old_fragment text := $old$where job.status = 'completed' and job.completed_at is not null and job.release_at <= now()
    and nullif(auth_user.email, '') is not null$old$;
  new_fragment text := $new$where job.status = 'completed' and job.completed_at is not null and job.release_at <= now()
    and nullif(auth_user.email, '') is not null
    and not exists (
      select 1 from private_generation.material_replacement_jobs replacement
      where replacement.completed_material_id = material.id
    )$new$;
begin
  definition := pg_get_functiondef('public.worker_claim_material_email_deliveries(text,integer,integer,integer)'::regprocedure);
  if (length(definition) - length(replace(definition, old_fragment, ''))) <> length(old_fragment) then
    raise exception 'worker_claim_material_email_deliveries definition drifted';
  end if;
  execute replace(definition, old_fragment, new_fragment);
end
$migration$;

comment on table private_generation.material_replacement_jobs is
  'Audited mapping from a released source material to its quality-repair generation job and newer revision.';
comment on function public.admin_create_material_replacement_jobs(uuid[], text) is
  'Service-role operator entry point for idempotent quality replacement jobs; preserves released source revisions.';
comment on function public.worker_claim_material_replacement_batch(text, uuid[]) is
  'Targeted authoring claim for explicit quality replacement jobs only; embeds the current authoring contract and previous canonical package.';
