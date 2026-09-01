-- Migration: Supersede unmaterialized failed jobs and terminal submission jobs on entitlement resume
-- Architectural Invariant: Once a generation job has generated ANY curriculum_submission,
-- or has reached terminal 'failed' status, its target identity and attempt sequence are strictly immutable.
-- On entitlement transition to active/trialing:
-- 1. In-flight claims (lease valid) or submissions (pending/processing) are untouched.
-- 2. Any unmaterialized job with terminal submissions OR with status = 'failed' is superseded -> 'canceled',
--    releasing its idempotency_key slot while preserving historical job and submission records for audit.
-- 3. Only clean jobs with zero submission history and non-failed status can be re-anchored in place.
-- 4. If no clean job exists, a fresh generation job with tomorrow's anchor and fresh attempt counter (0)
--    is created, avoiding immutable attempt collisions and idempotency slot blockage.

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
  v_is_entitlement_transition boolean := false;
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

  -- Entitlement Transition Determination:
  -- Re-anchoring of pending jobs applies ONLY on genuine entitlement transitions:
  --   * beta -> Paddle active/trialing
  --   * none -> Paddle active/trialing
  --   * paused / past_due / canceled -> Paddle active/trialing
  -- Continuous active subscriptions (Paddle active -> active, Paddle trialing -> active)
  -- maintain rolling weekly cadence; overdue jobs remain mandatory and are NOT postponed.
  v_is_entitlement_transition := (
    existing_subscription.id is null
    or existing_subscription.provider is distinct from 'paddle'
    or existing_subscription.status not in ('trialing', 'active')
  );

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
  -- Re-anchoring runs ONLY when entitlement transitions into active or trialing.
  -- Continuous active subscribers maintain their rolling cadence without postponement.
  if p_status in ('trialing', 'active')
    and v_waitlist_status is distinct from 'waiting'
    and v_is_entitlement_transition
  then
    select coalesce(timezone, 'Asia/Taipei') into v_child_tz
    from public.children where id = p_child_id and is_active;

    if v_child_tz is not null then
      v_local_now := now() at time zone v_child_tz;
      v_next_day_local := (v_local_now::date) + 1;
      v_release_anchor := (v_next_day_local::timestamp) at time zone v_child_tz;

      -- 1. In-flight active claim / submission guard:
      -- If any unmaterialized job for this child currently has an active worker lease
      -- or an in-flight curriculum submission (status in ('pending', 'processing')),
      -- leave the pipeline completely intact (do not touch, cancel, or duplicate).
      if not exists (
        select 1
        from public.generation_jobs as job
        where job.child_id = p_child_id
          and job.material_id is null
          and (
            (job.status = 'claimed' and job.lease_expires_at >= now())
            or exists (
              select 1 from private_generation.curriculum_submissions as s
              where s.job_id = job.id and s.status in ('pending', 'processing')
            )
          )
      ) then

        -- 2. Terminal submission history & unmaterialized failed job protection:
        -- Once a generation job has generated ANY curriculum_submission, its target identity is immutable.
        -- Any unmaterialized job that has terminal submission history (quality_rejected, technical_failed)
        -- OR has reached terminal status 'failed' must be superseded -> 'canceled'.
        -- We preserve its job record and submissions for audit, while updating its idempotency_key
        -- with ':canceled:' || id to free the calendar anchor slot for the fresh successor job.
        update public.generation_jobs as job
        set status = 'canceled',
            claimed_by = null,
            lease_expires_at = null,
            idempotency_key = job.idempotency_key || ':canceled:' || job.id::text,
            updated_at = now()
        where job.child_id = p_child_id
          and job.material_id is null
          and job.status <> 'canceled'
          and (
            job.status = 'failed'
            or exists (
              select 1 from private_generation.curriculum_submissions as s
              where s.job_id = job.id
            )
          );

        -- 3. Resolve canonical latest material authority
        select s.material_id into v_latest_material_id
        from public.child_weekly_learning_snapshots as s
        where s.child_id = p_child_id
        order by s.sequence_number desc, s.created_at desc
        limit 1;

        if v_latest_material_id is null then
          select m.id into v_latest_material_id
          from public.materials as m
          where m.child_id = p_child_id
          order by m.material_week desc, m.revision desc, m.created_at desc
          limit 1;
        end if;

        -- 4. Candidate selection for in-place re-anchoring:
        -- ONLY unmaterialized jobs with ZERO submission history and non-failed status can be re-anchored in place.
        select * into v_candidate_job
        from public.generation_jobs as job
        where job.child_id = p_child_id
          and job.material_id is null
          and (
            job.status = 'pending'
            or (job.status = 'claimed' and job.lease_expires_at < now())
          )
          and not exists (
            select 1 from private_generation.curriculum_submissions as s
            where s.job_id = job.id
          )
        order by (job.source_material_id is not null) desc, job.created_at desc
        limit 1
        for update;

        if v_candidate_job.id is not null then
          -- Clean up any duplicate unmaterialized orphan pending jobs with zero submissions
          delete from public.generation_jobs as other_job
          where other_job.child_id = p_child_id
            and other_job.material_id is null
            and other_job.id <> v_candidate_job.id
            and other_job.status = 'pending'
            and not exists (
              select 1 from private_generation.curriculum_submissions as s
              where s.job_id = other_job.id
            );

          update public.generation_jobs
          set material_week = v_next_day_local,
              idempotency_key = p_child_id::text || ':' || v_next_day_local::text || ':r1',
              release_at = v_release_anchor,
              generation_due_at = v_release_anchor - interval '24 hours',
              feedback_cutoff_at = v_release_anchor - interval '48 hours',
              scheduled_for = date_trunc('second', now()),
              source_material_id = coalesce(v_latest_material_id, v_candidate_job.source_material_id),
              attempt_count = 0,
              claimed_by = null,
              lease_expires_at = null,
              status = 'pending',
              updated_at = now()
          where id = v_candidate_job.id;

          update public.children
          set next_generation_at = v_release_anchor - interval '24 hours'
          where id = p_child_id;
        elsif not exists (
          select 1 from public.generation_jobs
          where child_id = p_child_id and material_id is null and status in ('pending', 'claimed')
        ) then
          -- No active/pending job exists (either 0 unmaterialized jobs existed or prior unmaterialized
          -- jobs had terminal submissions / failed status and were safely canceled to protect immutable attempts).
          -- Create fresh generation job starting at attempt 0 (first claim will be attempt 1).
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
            -- Child has 0 materials and 0 valid generation jobs: initialize Week 1
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
