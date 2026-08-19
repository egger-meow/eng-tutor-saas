# Scaling Gate & Cohort Release Waitlist Lifecycle Design

## Goal

Implement the complete >100-child waitlist lifecycle on current main: a persistent scaling gate where capacity (default 100) acts as an operational system scale checkpoint rather than a scarce-capacity queue. Children #101+ complete parent onboarding and profile creation upfront without charges or material generation, entering `waiting` state. When scaling permits, the Admin can raise capacity (e.g. to 300, 500, 5,000+) and release cohorts to `released`, unlocking standard subscription checkout with automated email notifications.

## Product Decisions

1. **Scaling Gate, Not a Scarce Queue**:
   - 100 active children represents an operational quality and infrastructure review checkpoint, not an artificial scarcity lottery.
   - No individual countdown timers, no invite token expiration, and no FIFO ranking calculations.
   - Children entering when active service is at capacity (active_count >= capacity) are recorded in `public.waitlist` with `status = 'waiting'`.
   - Zero subscription rows and zero generation jobs are created for `waiting` children.

2. **Strict Payment & Entitlement Gating**:
   - A child with `status = 'waiting'` can **never** check out merely because an individual slot became available (e.g. due to another child's cancellation).
   - Only an explicit Admin cohort release (`status = 'released'`) or existing active/trialing subscription unlocks billing and Paddle checkout.
   - Released children pay standard pricing (NT$499/month or NT$4,999/year). Founding 30 remains closed once the first 30 founding slots are allocated.

3. **Admin Scaling & Cohort Release Controls**:
   - Admin can view real-time waitlist metrics: total waiting, released, converted, active service count, and current capacity.
   - Admin can execute a single unified operation: **"Raise Capacity & Release All Eligible Waiting Users" (一鍵擴容並全數開放候補)**, or manually adjust capacity / release specific selected candidates.
   - Email notifications are triggered to released parents informing them that the new cohort is open to activate their subscription.

4. **Transparent User Experience**:
   - Landing & Waitlist pages clearly state: *"目前名額已滿。可以先建立帳號並填寫孩子的學習資料，不會收費。有名額開放時，我們會寄 Email 通知你，再決定是否訂閱。"*
   - Onboarding completes smoothly for child #101+, reassuring parents that their child's profile is safely preserved.
   - Parent Dashboard and Billing pages distinguish `waiting` (held until cohort opening) and `released` (unlocked to subscribe) states with clear badges and actionable guidance.

## Architecture

### 1. Database Schema (`public.waitlist`)
```sql
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  email text not null,
  status text not null default 'waiting' 
    check (status in ('waiting', 'released', 'converted', 'canceled')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  converted_at timestamptz,
  notes text,
  constraint waitlist_child_id_unique unique (child_id)
);

create index waitlist_parent_id_idx on public.waitlist (parent_id);
create index waitlist_status_idx on public.waitlist (status);
```

### 2. Transactional Capacity & Gating Triggers
- **`private_generation.create_beta_trial_subscription()`**:
  - Runs `after insert on public.children`.
  - Transactionally locks `enrollment_settings` (`FOR UPDATE`).
  - Evaluates active service count (`subscriptions.status in ('trialing', 'active', 'past_due') and child.is_active = true`).
  - When `active_count < settings.capacity`: Creates a `trialing` subscription (Founding 30 if eligible) and enqueues initial Week 1 generation job.
  - When `active_count >= settings.capacity`: Inserts a `public.waitlist` row with `status = 'waiting'`. Does not create any subscription row or generation job.
- **`public.prepare_paddle_checkout(p_user_id, p_child_id, p_plan_code)`**:
  - Validates that child belongs to user.
  - Checks if child has active/trialing subscription OR `waitlist.status = 'released'`.
  - If child is `waiting`, throws an exception: `"這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。"`.
- **`public.process_paddle_subscription_event(...)`**:
  - When Paddle webhook receives initial subscription activation:
    - If a `waitlist` entry exists for `child_id`, updates `status = 'converted'`, `converted_at = now()`.
    - Inserts/updates `subscriptions` row to `active` (`plan_code`, `billing_interval`, `price_twd`, etc.).
    - Safely enqueues the initial Week 1 generation job anchored to the next calendar day 00:00.

### 3. Server RPC Functions & Admin Operations
- `public.get_enrollment_state()`:
  - Returns `status`, `capacity`, `active_count`, `remaining`, `founding_limit`, `founding_count`, `waiting_count`, `released_count`.
- `admin_get_waitlist()`:
  - Returns waitlist entries with parent email, child display name, grade, status, created_at, released_at, converted_at.
- `admin_raise_capacity_and_release(p_new_capacity int, p_release_all boolean)`:
  - Atomically updates `enrollment_settings.capacity = p_new_capacity`.
  - If `p_release_all = true`, updates all `status = 'waiting'` rows to `status = 'released'`, `released_at = now()`.
  - Returns released count.
- `admin_release_waitlist_children(p_child_ids uuid[])`:
  - Releases explicitly selected waiting children.

### 4. Admin Console View (候補名單與容量控管)
- **KPI Summary**: Capacity Limit, Active Service Children, Waiting Cohort, Released for Checkout, Converted Subscriptions.
- **Scaling Controls**:
  - Combined **"擴容並開放全數候補 (Raise Capacity & Release All Waiting)"** action.
  - Capacity update input and release button.
  - Batch Email broadcast copy button (one-click copy of email addresses and release notification text).
- **Waitlist Data Table**: Chronological table showing email, child name, grade stage, status, created_at, released_at, converted_at, and individual release actions.

### 5. Parent Web Experience
- **Public & Waitlist Pages**: Explicit zero-charge messaging, upfront profile collection promise.
- **Onboarding Route**: Success feedback confirms waitlist registration and email delivery promise.
- **Dashboard & Billing**: Clear status pill badges (`候補中・等候名額開放` vs `名額已開放・請確認訂閱`), locked checkout for `waiting`, enabled checkout for `released`.

## Verification

1. **Database Smoke Suite (`supabase/tests/smoke.sql`)**:
   - Verify child creation under capacity (1-100) receives trial subscription + Week 1 generation.
   - Verify child creation at capacity (100+) creates `waitlist` row (`status = 'waiting'`) without subscription or generation job.
   - Verify `prepare_paddle_checkout` blocks `waiting` children and allows `released` children.
   - Verify `admin_raise_capacity_and_release` updates capacity and transitions `waiting` -> `released`.
   - Verify Paddle webhook converts `released` child to `converted`, activates subscription, and enqueues initial generation.
2. **Admin Service & Handler Tests**:
   - Verify waitlist query, capacity adjustment, batch release, and telemetry.
3. **Web Frontend Tests**:
   - Verify `useEnrollmentState`, billing card states (`waiting` vs `released`), and onboarding completion copy.
4. **Full Workspace Build & Typecheck**:
   - `pnpm -r typecheck`, `pnpm test`, `pnpm build`.
