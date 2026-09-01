-- Migration: Subscription Pause Clock & Service Time Cadence
--
-- Invariant: "教材週次是 service time，不是 wall-clock time。訂多久，就往前走多久；沒訂的日子不存在。"
-- 1. Webhook re-anchors unmaterialized pending/stale jobs to tomorrow upon activation/resumption.
-- 2. Protects active claims/submissions from being reset mid-generation.
-- 3. worker_complete_generation_job enforces next release is strictly in the future.
-- 4. get_owned_released_materials_page returns canonical week_number from child_weekly_learning_snapshots.sequence_number.

-- Drop and recreate get_owned_released_materials_page to add week_number to return table signature
drop function if exists public.get_owned_released_materials_page(uuid, integer, integer, timestamptz);

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
  week_number integer,
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
      job.release_at,
      coalesce(
        snapshot.sequence_number,
        (
          select count(distinct earlier.id)::integer
          from public.materials as earlier
          join public.generation_jobs as earlier_job on earlier_job.material_id = earlier.id and earlier_job.child_id = earlier.child_id
          where earlier.child_id = material.child_id
            and earlier_job.status = 'completed'
            and earlier_job.release_at <= p_as_of
            and (earlier.material_week, earlier.revision, earlier.created_at, earlier.id)
              <= (material.material_week, material.revision, material.created_at, material.id)
        )
      ) as week_number
    from public.materials as material
    left join lateral (
      select max(generation_job.release_at) as release_at
      from public.generation_jobs as generation_job
      where generation_job.material_id = material.id
    ) as job on true
    left join public.child_weekly_learning_snapshots as snapshot
      on snapshot.material_id = material.id and snapshot.child_id = material.child_id
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
    owned_released.week_number,
    count(*) over () as total_count
  from owned_released
  order by owned_released.material_week desc, owned_released.revision desc
  limit greatest(least(coalesce(p_limit, 5), 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz) from public, anon;
grant execute on function public.get_owned_released_materials_page(uuid, integer, integer, timestamptz) to authenticated, service_role;

-- Update worker_complete_generation_job with defense-in-depth future guard
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

  expected_prefix := claimed_job.child_id::text || '/' || claimed_job.id::text || '/';
  if student_pdf_path <> expected_prefix || 'student.pdf'
    or parent_answer_pdf_path <> expected_prefix || 'parent-answer.pdf' then
    raise exception 'artifact paths do not match the claimed job';
  end if;

  select coalesce(timezone, 'Asia/Taipei') into child_tz
  from public.children
  where id = claimed_job.child_id and is_active;

  -- Week 1 is the sole early-release exception: when successfully completed early,
  -- completion immediately becomes the actual release_at.
  -- For Week 2+, preserve the canonical release_at date anchor.
  effective_release_at := case
    when claimed_job.source_material_id is null
      then least(coalesce(claimed_job.release_at, now()), now())
    else claimed_job.release_at
  end;

  insert into public.materials (
    child_id, material_week, revision, rule_version, input_snapshot,
    student_pdf_path, parent_answer_pdf_path, generation_summary,
    canonical_source, prompt_version, generator_version, model_name
  ) values (
    claimed_job.child_id, claimed_job.material_week, 1, claimed_job.rule_version,
    jsonb_build_object(
      'sourceMaterialId', claimed_job.source_material_id,
      'feedbackCutoffAt', claimed_job.feedback_cutoff_at,
      'feedbackMissing', claimed_job.feedback_missing
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

  -- Defense-in-depth safety fuse: the next material must NEVER be scheduled in the past.
  -- Normal cadence is effective_release_at + 7 days; if that has somehow passed, anchor to tomorrow.
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

revoke all on function public.worker_complete_generation_job(
  uuid, text, text, text, jsonb, jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.worker_complete_generation_job(
  uuid, text, text, text, jsonb, jsonb, text, text, text
) to service_role;

-- Update process_paddle_subscription_event_v2_base with Pre-Claim Webhook Re-anchor
create or replace function public.process_paddle_subscription_event_v2_base(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_child_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_status public.subscription_status,
  p_plan_code text,
  p_billing_interval text,
  p_price_twd integer,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_expected_founding_discount_id text,
  p_discount_id text default null,
  p_discount_status text default null,
  p_discount_type text default null,
  p_discount_ends_at timestamptz default null,
  p_discount_ends_at_present boolean default false,
  p_founder_claim_id uuid default null,
  p_originating_transaction_id text default null
)
returns table (
  processed boolean,
  duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_subscription public.subscriptions%rowtype;
  v_waitlist_status text;
  next_founding_status text;
  next_redeemed_at timestamptz;
  next_forfeited_at timestamptz;
  founder_discount_valid boolean;
  v_claim private_generation.founder_checkout_claims%rowtype;
  v_matching_capacity_claim private_generation.capacity_checkout_claims%rowtype;
  v_needs_capacity_claim boolean := false;
  v_child_tz text;
  v_local_now timestamp;
  v_next_day_local date;
  v_release_anchor timestamptz;
  v_candidate_job public.generation_jobs%rowtype;
  v_latest_material_id uuid;
begin
  if p_child_id is null then raise exception 'Webhook payload missing child_id in custom_data'; end if;
  if not exists (select 1 from public.children where id = p_child_id) then
    raise exception 'Child % not found for billing event %', p_child_id, p_event_id;
  end if;

  select status into v_waitlist_status from public.waitlist where child_id = p_child_id for update;
  if v_waitlist_status = 'waiting' then
    raise exception 'Cannot process subscription for child still in waiting status — Admin release required first';
  end if;

  if exists (
    select 1 from public.subscriptions where provider_subscription_id = p_provider_subscription_id and child_id <> p_child_id
  ) then raise exception 'Paddle subscription is already assigned to another child'; end if;

  select * into existing_subscription from public.subscriptions where child_id = p_child_id for update;

  if existing_subscription.id is not null
    and existing_subscription.provider = 'paddle'
    and existing_subscription.provider_subscription_id is distinct from p_provider_subscription_id
    and existing_subscription.status in ('trialing', 'active', 'past_due', 'paused')
  then
    raise exception 'Child already has a different active Paddle subscription';
  end if;

  insert into public.billing_webhook_events (
    event_id, event_type, occurred_at, provider_subscription_id, child_id
  ) values (
    p_event_id, p_event_type, p_occurred_at, p_provider_subscription_id, p_child_id
  ) on conflict (event_id) do nothing;
  if not found then
    return query select true, true;
    return;
  end if;

  if existing_subscription.provider_event_at is not null and p_occurred_at < existing_subscription.provider_event_at then
    update public.billing_webhook_events set ignored_as_stale = true where event_id = p_event_id;
    return query select true, true;
    return;
  end if;

  -- Verify capacity authority for fresh activations:
  -- Expired-beta child requires an unresolved capacity claim bound to exact p_originating_transaction_id.
  -- Released waitlist children already own capacity through their released waitlist row.
  if p_status in ('trialing', 'active') then
    if coalesce(v_waitlist_status, '') <> 'released' and (
      existing_subscription.id is null
      or (
        existing_subscription.provider = 'beta'
        and coalesce(existing_subscription.current_period_end, existing_subscription.created_at + interval '14 days') <= p_occurred_at
      )
    ) then
      v_needs_capacity_claim := true;
    end if;

    if v_needs_capacity_claim then
      if p_originating_transaction_id is null then
        raise exception 'Paddle subscription activation for expired-beta child requires originating transaction ID';
      end if;

      select * into v_matching_capacity_claim
      from private_generation.capacity_checkout_claims
      where child_id = p_child_id
        and paddle_transaction_id is not null
        and paddle_transaction_id = p_originating_transaction_id
        and status in ('bound', 'release_pending')
      for update;

      if v_matching_capacity_claim.id is null then
        raise exception 'No matching bound capacity claim found for transaction % (child %)', p_originating_transaction_id, p_child_id;
      end if;

      -- Complete ONLY the exact matching capacity claim
      update private_generation.capacity_checkout_claims
      set status = 'completed',
          completed_at = now()
      where id = v_matching_capacity_claim.id;
    end if;
  end if;

  -- Forever discount requires expected discount ID, flat type if provided, active status if provided, and ends_at IS NULL (Paddle API v2 schema)
  founder_discount_valid := (
    p_expected_founding_discount_id is not null
    and p_discount_id is not null
    and p_discount_id = p_expected_founding_discount_id
    and coalesce(p_discount_status, 'active') = 'active'
    and coalesce(p_discount_type, 'flat') = 'flat'
    and (not coalesce(p_discount_ends_at_present, false) or p_discount_ends_at is null)
    and p_discount_ends_at is null
  );

  next_founding_status := coalesce(existing_subscription.founding_status, 'none');
  next_redeemed_at := existing_subscription.founding_redeemed_at;
  next_forfeited_at := existing_subscription.founding_forfeited_at;

  if next_founding_status in ('none', 'eligible', 'expired')
    and p_plan_code = 'standard_monthly'
    and p_status in ('trialing', 'active')
  then
    if p_event_type = 'subscription.created' and p_founder_claim_id is not null and founder_discount_valid then
      select * into v_claim
      from private_generation.founder_checkout_claims
      where id = p_founder_claim_id for update;

      if v_claim.id is not null
        and v_claim.child_id = p_child_id
        and v_claim.status in ('bound', 'release_pending')
        and v_claim.paddle_transaction_id is not null
        and p_originating_transaction_id is not null
        and v_claim.paddle_transaction_id = p_originating_transaction_id
      then
        next_founding_status := 'redeemed';
        next_redeemed_at := coalesce(existing_subscription.founding_redeemed_at, p_occurred_at, now());
      end if;
    end if;
  elsif next_founding_status = 'redeemed' and p_status in ('trialing', 'active', 'past_due', 'paused') then
    if not founder_discount_valid then
      raise exception 'Founder billing integrity failure: expected discount is missing or mismatched';
    end if;
  elsif next_founding_status = 'redeemed' and p_status = 'canceled' then
    next_founding_status := 'forfeited';
    next_forfeited_at := coalesce(existing_subscription.founding_forfeited_at, p_occurred_at, now());
  end if;

  -- Record monotonic historical authority table ONLY after verified redemption
  if next_founding_status = 'redeemed' and not exists (
    select 1 from public.children where id = p_child_id and is_internal_test
  ) then
    insert into private_generation.founder_redemptions (
      child_id, provider_subscription_id, redeemed_at
    ) values (
      p_child_id, p_provider_subscription_id, coalesce(next_redeemed_at, p_occurred_at, now())
    ) on conflict (provider_subscription_id) do nothing;
  end if;

  if v_waitlist_status = 'released' and p_status in ('trialing', 'active') then
    update public.waitlist set status = 'converted', converted_at = now()
    where child_id = p_child_id and status = 'released';
  end if;

  insert into public.subscriptions (
    child_id, provider, provider_customer_id, provider_subscription_id, status,
    plan_code, billing_interval, price_twd, current_period_start, current_period_end,
    cancel_at_period_end, provider_event_at, founding_status, founding_redeemed_at, founding_forfeited_at
  ) values (
    p_child_id, 'paddle', p_provider_customer_id, p_provider_subscription_id, p_status,
    p_plan_code, p_billing_interval, p_price_twd, p_current_period_start, p_current_period_end,
    p_cancel_at_period_end, p_occurred_at, next_founding_status, next_redeemed_at, next_forfeited_at
  )
  on conflict (child_id) do update set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    status = excluded.status,
    plan_code = excluded.plan_code,
    billing_interval = excluded.billing_interval,
    price_twd = excluded.price_twd,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider_event_at = excluded.provider_event_at,
    founding_status = excluded.founding_status,
    founding_redeemed_at = excluded.founding_redeemed_at,
    founding_forfeited_at = excluded.founding_forfeited_at,
    updated_at = now();

  -- Complete or release Founder checkout claim
  if p_founder_claim_id is not null then
    select * into v_claim
    from private_generation.founder_checkout_claims
    where id = p_founder_claim_id for update;

    if v_claim.id is not null then
      if p_status in ('trialing', 'active') and next_founding_status = 'redeemed' then
        update private_generation.founder_checkout_claims
        set status = 'completed',
            completed_at = now(),
            paddle_transaction_id = coalesce(paddle_transaction_id, p_originating_transaction_id)
        where id = p_founder_claim_id;
      elsif p_status = 'canceled' or (not founder_discount_valid and next_founding_status <> 'redeemed') then
        update private_generation.founder_checkout_claims
        set status = 'released',
            released_at = now(),
            release_reason = case when p_status = 'canceled' then 'transaction_canceled' else 'discount_removed' end
        where id = p_founder_claim_id;
      end if;
    end if;
  end if;

  -- Subscription Pause Clock: Pre-Claim Re-anchoring for Activation & Resumption
  -- Material delivery cadence represents service time, not wall-clock time.
  -- When subscription becomes active or trialing, unmaterialized pending jobs must be re-anchored
  -- to the child's local next calendar day, preventing retroactive catch-up cascades.
  if p_status in ('trialing', 'active') and v_waitlist_status is distinct from 'waiting' then
    select coalesce(timezone, 'Asia/Taipei') into v_child_tz
    from public.children where id = p_child_id and is_active;

    if v_child_tz is not null then
      v_local_now := now() at time zone v_child_tz;
      v_next_day_local := (v_local_now::date) + 1;
      v_release_anchor := (v_next_day_local::timestamp) at time zone v_child_tz;

      -- Select unmaterialized candidate job:
      -- ONLY pending jobs, or claimed jobs whose lease expired AND have no active curriculum submission.
      -- In-progress worker claims and active submissions are strictly protected.
      select * into v_candidate_job
      from public.generation_jobs as job
      where job.child_id = p_child_id
        and job.material_id is null
        and (
          job.status = 'pending'
          or (
            job.status = 'claimed'
            and job.lease_expires_at < now()
            and not exists (
              select 1 from private_generation.curriculum_submissions as s
              where s.job_id = job.id and s.status in ('pending', 'processing')
            )
          )
        )
      order by (job.source_material_id is not null) desc, job.created_at desc
      limit 1
      for update;

      if v_candidate_job.id is not null then
        -- Re-anchor if job is stale (deadline in the past) or if child just gained entitlement
        if (v_candidate_job.generation_due_at <= now() or v_candidate_job.release_at <= now())
          or (
            existing_subscription.id is null
            or existing_subscription.provider is distinct from 'paddle'
            or existing_subscription.status not in ('trialing', 'active')
          )
        then
          -- Clean up any conflicting duplicate unmaterialized orphan pending jobs for this child
          delete from public.generation_jobs
          where child_id = p_child_id
            and material_id is null
            and id <> v_candidate_job.id
            and status = 'pending';

          update public.generation_jobs
          set material_week = v_next_day_local,
              idempotency_key = p_child_id::text || ':' || v_next_day_local::text || ':r1',
              release_at = v_release_anchor,
              generation_due_at = v_release_anchor - interval '24 hours',
              feedback_cutoff_at = v_release_anchor - interval '48 hours',
              scheduled_for = date_trunc('second', now()),
              attempt_count = 0,
              claimed_by = null,
              lease_expires_at = null,
              status = 'pending',
              updated_at = now()
          where id = v_candidate_job.id;

          update public.children
          set next_generation_at = v_release_anchor - interval '24 hours'
          where id = p_child_id;
        end if;
      elsif not exists (select 1 from public.generation_jobs where child_id = p_child_id and material_id is null) then
        -- No pending job exists. If child has completed materials, resume with next unconsumed week.
        select id into v_latest_material_id
        from public.materials
        where child_id = p_child_id
        order by material_week desc, revision desc, created_at desc
        limit 1;

        if v_latest_material_id is not null then
          insert into public.generation_jobs (
            child_id, material_week, rule_version, idempotency_key, status,
            scheduled_for, source_material_id, release_at, feedback_cutoff_at, generation_due_at
          ) values (
            p_child_id, v_next_day_local, 'curriculum-rules/1.0.0',
            p_child_id::text || ':' || v_next_day_local::text || ':r1', 'pending',
            date_trunc('second', now()), v_latest_material_id, v_release_anchor,
            v_release_anchor - interval '48 hours', v_release_anchor - interval '24 hours'
          ) on conflict (idempotency_key) do nothing;

          update public.children
          set next_generation_at = v_release_anchor - interval '24 hours'
          where id = p_child_id;
        elsif not exists (select 1 from public.materials where child_id = p_child_id) then
          -- Child has 0 materials and 0 generation jobs: initialize Week 1
          insert into public.generation_jobs (
            child_id, material_week, rule_version, idempotency_key, status,
            scheduled_for, source_material_id, release_at, feedback_cutoff_at, generation_due_at
          ) values (
            p_child_id, v_next_day_local, 'curriculum-rules/1.0.0',
            p_child_id::text || ':' || v_next_day_local::text || ':r1', 'pending',
            date_trunc('second', now()), null, v_release_anchor,
            v_release_anchor - interval '48 hours', v_release_anchor - interval '24 hours'
          ) on conflict (idempotency_key) do nothing;

          update public.children
          set next_generation_at = v_release_anchor - interval '24 hours'
          where id = p_child_id;
        end if;
      end if;
    end if;
  end if;

  return query select true, false;
end;
$$;

revoke all on function public.process_paddle_subscription_event_v2_base(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text,
  text, text, timestamptz, boolean, uuid, text
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event_v2_base(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text,
  text, text, timestamptz, boolean, uuid, text
) to service_role;

-- Also maintain compatibility for private_generation alias if called internally
create or replace function private_generation.process_paddle_subscription_event_v2_base(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_child_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_status public.subscription_status,
  p_plan_code text,
  p_billing_interval text,
  p_price_twd integer,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_expected_founding_discount_id text,
  p_discount_id text default null,
  p_discount_status text default null,
  p_discount_type text default null,
  p_discount_ends_at timestamptz default null,
  p_discount_ends_at_present boolean default false,
  p_founder_claim_id uuid default null,
  p_originating_transaction_id text default null
)
returns table (
  processed boolean,
  duplicate boolean
)
language sql
security definer
set search_path = ''
as $$
  select * from public.process_paddle_subscription_event_v2_base(
    p_event_id, p_event_type, p_occurred_at, p_child_id, p_provider_subscription_id,
    p_provider_customer_id, p_status, p_plan_code, p_billing_interval, p_price_twd,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_expected_founding_discount_id, p_discount_id, p_discount_status, p_discount_type,
    p_discount_ends_at, p_discount_ends_at_present, p_founder_claim_id, p_originating_transaction_id
  );
$$;

revoke all on function private_generation.process_paddle_subscription_event_v2_base(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text,
  text, text, timestamptz, boolean, uuid, text
) from public, anon, authenticated;
grant execute on function private_generation.process_paddle_subscription_event_v2_base(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text,
  text, text, timestamptz, boolean, uuid, text
) to service_role;

-- Ensure public.process_paddle_subscription_event_v2 delegates directly to public.process_paddle_subscription_event_v2_base
create or replace function public.process_paddle_subscription_event_v2(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_child_id uuid,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_status public.subscription_status,
  p_plan_code text,
  p_billing_interval text,
  p_price_twd integer,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_expected_founding_discount_id text,
  p_discount_id text default null,
  p_discount_status text default null,
  p_discount_type text default null,
  p_discount_ends_at timestamptz default null,
  p_discount_ends_at_present boolean default false,
  p_founder_claim_id uuid default null,
  p_originating_transaction_id text default null
)
returns table (
  processed boolean,
  duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select * from public.process_paddle_subscription_event_v2_base(
    p_event_id, p_event_type, p_occurred_at, p_child_id, p_provider_subscription_id,
    p_provider_customer_id, p_status, p_plan_code, p_billing_interval, p_price_twd,
    p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_expected_founding_discount_id, p_discount_id, p_discount_status, p_discount_type,
    p_discount_ends_at, p_discount_ends_at_present, p_founder_claim_id, p_originating_transaction_id
  );
end;
$$;

revoke all on function public.process_paddle_subscription_event_v2(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text,
  text, text, timestamptz, boolean, uuid, text
) from public, anon, authenticated;
grant execute on function public.process_paddle_subscription_event_v2(
  text, text, timestamptz, uuid, text, text, public.subscription_status,
  text, text, integer, timestamptz, timestamptz, boolean, text, text,
  text, text, timestamptz, boolean, uuid, text
) to service_role;
