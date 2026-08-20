# Scaling Gate & Cohort Release Waitlist Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete >100-child waitlist lifecycle on current main where capacity acts as an operational scaling gate. Child #101+ enters `waiting` state without subscription or generation; Admin can raise capacity and release cohorts to `released` with automated email notifications, strictly enforcing `active + released <= capacity` and unlocking standard subscription checkout.

**Architecture:** A persistent `public.waitlist` state machine (`waiting` → `released` → `converted`) managed by PostgreSQL triggers and RPCs with `FOR UPDATE` capacity locking. Admin Console gains full waitlist visibility and atomic "Raise Capacity & Release Cohort" controls with automated email dispatch. Web parent dashboard and billing unlock checkout exclusively for `released` children.

**Tech Stack:** Supabase (PostgreSQL, PL/pgSQL, RLS, Storage), React, TypeScript, Vite, Vitest, Paddle Billing Sandbox.

**Spec:** [docs/superpowers/specs/2026-08-19-scaling-gate-waitlist-lifecycle-design.md](file:///c:/IDEA/eng-tutor-saas/docs/superpowers/specs/2026-08-19-scaling-gate-waitlist-lifecycle-design.md)

## Global Constraints
- `active + released <= capacity` must be strictly enforced on all release actions; release-all must reject if new capacity is insufficient.
- `waiting` children must never check out merely because a slot is open; only an explicit `released` status unlocks billing.
- Founding 30 allocation is permanently capped at 30 historical allocations and never reopens after cancellations.
- Children #101+ must not receive `trialing` subscriptions or initial generation jobs while in `waiting` state.
- Automated release notification email is required on cohort release; copy-email in Admin is fallback only.
- Preserve Founding 30 and existing ≤100 flows.

---

### Task 1: Supabase Database Migration for Scaling Gate Waitlist & Gating Functions

**Files:**
- Create: `supabase/migrations/20260819220000_scaling_gate_waitlist_lifecycle.sql`
- Modify: `supabase/tests/smoke.sql`

**Interfaces:**
- Produces:
  - Table `public.waitlist` (`id`, `parent_id`, `child_id`, `email`, `status`, `created_at`, `released_at`, `converted_at`, `notes`)
  - Updated `private_generation.create_beta_trial_subscription()`
  - Updated `public.prepare_paddle_checkout(uuid, uuid, text)`
  - Updated `public.process_paddle_subscription_event(...)`
  - Updated `public.get_enrollment_state()`
  - RPC `public.admin_get_waitlist()`
  - RPC `public.admin_raise_capacity_and_release(integer, boolean)`
  - RPC `public.admin_release_waitlist_children(uuid[])`

- [ ] **Step 1: Write the database migration**

Create `supabase/migrations/20260819220000_scaling_gate_waitlist_lifecycle.sql` with:
1. `public.waitlist` table, unique constraint on `child_id`, and indexes on `parent_id` and `status`.
2. RLS policy allowing authenticated parents to `SELECT` their own waitlist entries (`parent_id = auth.uid()`).
3. Update `private_generation.create_beta_trial_subscription()`:
   - Lock `enrollment_settings` `FOR UPDATE`.
   - Check permanent Founding 30 cap (`count(*)` of subscriptions with `founding_status in ('eligible', 'redeemed')` < `settings.founding_limit`).
   - Count active service children (`subscriptions.status in ('trialing', 'active', 'past_due') and child.is_active = true`).
   - If `active_count < settings.capacity`: insert `subscriptions` (`trialing`, founding if eligible) which fires `enqueue_initial_generation_job()`.
   - If `active_count >= settings.capacity`: insert `public.waitlist` with `status = 'waiting'`, `parent_id = new.parent_id`, `child_id = new.id`, `email = (select email from auth.users where id = new.parent_id)`.
4. Update `public.prepare_paddle_checkout`:
   - If child has no active subscription and `waitlist.status = 'waiting'`, raise exception: `'這個學習名額仍在等候開放中，我們會在開放時以 Email 通知您。'`.
   - If `waitlist.status = 'released'`, permit checkout preparation with standard pricing (`founding_applies = false`).
5. Update `public.process_paddle_subscription_event`:
   - If child is in `public.waitlist`, update `status = 'converted'`, `converted_at = now()`.
   - Create/update `subscriptions` with `status = 'active'`.
   - Call `enqueue_initial_generation_job()` logic for next calendar day delivery.
6. Update `public.get_enrollment_state()` to return `(status text, capacity integer, active_count integer, remaining integer, founding_limit integer, founding_count integer, waiting_count integer, released_count integer)`.
7. Add `public.admin_get_waitlist()` returning waitlist entries joined with `children.display_name` and `children.grade`.
8. Add `public.admin_raise_capacity_and_release(p_new_capacity integer, p_release_all boolean)`:
   - Lock `enrollment_settings` `FOR UPDATE`.
   - Count `active_count`, `released_count`, and `waiting_count`.
   - If `p_release_all = true`:
     - If `p_new_capacity < active_count + released_count + waiting_count`, raise exception `'New capacity must cover all active and released children'`.
     - Update `enrollment_settings.capacity = p_new_capacity`.
     - Update `public.waitlist` set `status = 'released'`, `released_at = now()` where `status = 'waiting'`.
   - If `p_release_all = false`:
     - Update `enrollment_settings.capacity = p_new_capacity`.
9. Add `public.admin_release_waitlist_children(p_child_ids uuid[])`:
   - Lock `enrollment_settings` `FOR UPDATE`.
   - Check `active_count + released_count + array_length(p_child_ids, 1) <= settings.capacity`. If exceeded, raise exception `'Capacity exceeded'`.
   - Update `public.waitlist` set `status = 'released'`, `released_at = now()` where `child_id = any(p_child_ids)` and `status = 'waiting'`.

- [ ] **Step 2: Update database smoke test suite**

In `supabase/tests/smoke.sql`:
1. Add test case asserting child #101+ creation when capacity is 100 creates a `waitlist` entry in `waiting` state, no `trialing` subscription, and no `generation_jobs`.
2. Add test asserting `prepare_paddle_checkout` throws on `waiting` child.
3. Add test verifying `admin_raise_capacity_and_release(101, true)` updates capacity to 101 and transitions child #101 to `released`.
4. Add test verifying `prepare_paddle_checkout` succeeds for `released` child with standard pricing.
5. Add test verifying `process_paddle_subscription_event` converts `waitlist` row to `converted`, activates subscription, and enqueues initial generation job.

- [ ] **Step 3: Run database tests and verify**

Run: `pnpm test:db` (or test against local Supabase instance)
Expected: PASS

- [ ] **Step 4: Commit migration and smoke test changes**

```bash
git add supabase/migrations/20260819220000_scaling_gate_waitlist_lifecycle.sql supabase/tests/smoke.sql
git commit -m "feat(db): add scaling gate waitlist lifecycle and capacity gating migration"
```

---

### Task 2: Release Notification Email Template & Dispatcher

**Files:**
- Create: `supabase/templates/waitlist-release.html`
- Modify: `supabase/templates/auth-email-templates.test.ts`
- Modify: `apps/admin/src/server/admin-service.ts`

**Interfaces:**
- Consumes: `admin_release_waitlist_children`, `admin_raise_capacity_and_release`
- Produces: `dispatchReleaseNotificationEmails(releasedEntries: Array<{ email: string; childName: string }>)`

- [ ] **Step 1: Create email template `supabase/templates/waitlist-release.html`**

Create clean, brand-aligned HTML email:
- Header: 紙屬英文
- Title: 專屬名額已開放，歡迎開始訂閱
- Body: 說明孩子（{{ .ChildName }}）的學習資料已保存，新一梯次名額已開放，點擊連結即可前往確認方案並開始準備第一週教材。
- CTA button: 前往開通訂閱 (`{{ .BillingURL }}`)

- [ ] **Step 2: Add template unit tests in `supabase/templates/auth-email-templates.test.ts`**

Add tests verifying:
- Contains paper-english styling, title, child name placeholder, and billing link.

- [ ] **Step 3: Add email dispatcher logic in `apps/admin/src/server/admin-service.ts`**

Implement `dispatchReleaseNotificationEmails()` in `AdminService` that logs audit events and dispatches emails via configured SMTP/Supabase Auth/mailer when available, returning delivery status.

- [ ] **Step 4: Run tests**

Run: `pnpm test supabase/templates/auth-email-templates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/templates/waitlist-release.html supabase/templates/auth-email-templates.test.ts apps/admin/src/server/admin-service.ts
git commit -m "feat(email): add waitlist cohort release email template and dispatcher"
```

---

### Task 3: Admin Console Service, API Endpoints & Types

**Files:**
- Modify: `apps/admin/src/client/types.ts`
- Modify: `apps/admin/src/server/admin-service.ts`
- Modify: `apps/admin/src/server/api-handler.ts`
- Test: `apps/admin/src/server/admin-service.test.ts`

**Interfaces:**
- Produces:
  - Types: `WaitlistEntry`, `WaitlistData`, `RaiseCapacityAndReleaseResult`, `ReleaseWaitlistResult`
  - AdminService methods: `getWaitlistData()`, `raiseCapacityAndRelease()`, `releaseWaitlistChildren()`, `setCapacityOnly()`
  - HTTP Endpoints: `GET /api/waitlist`, `POST /api/waitlist/raise-and-release`, `POST /api/waitlist/release`, `POST /api/waitlist/capacity`

- [ ] **Step 1: Add types in `apps/admin/src/client/types.ts`**

Define `WaitlistEntry`, `WaitlistData`, `RaiseCapacityAndReleaseResult`, and add `waitlist` to `TabId`.

- [ ] **Step 2: Write failing unit tests in `apps/admin/src/server/admin-service.test.ts`**

Add tests for:
1. `getWaitlistData()` returns waiting, released, converted counts, capacity, and candidate list.
2. `raiseCapacityAndRelease(newCapacity, true)` rejects if newCapacity < active + released + waiting.
3. `raiseCapacityAndRelease(newCapacity, true)` succeeds, updates capacity, sets status to `released`, and triggers email dispatcher.
4. `releaseWaitlistChildren(childIds)` releases specified children and enforces capacity constraint.

- [ ] **Step 3: Implement methods in `apps/admin/src/server/admin-service.ts` and `api-handler.ts`**

Implement the business logic and route handlers.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test apps/admin/src/server/admin-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/client/types.ts apps/admin/src/server/admin-service.ts apps/admin/src/server/api-handler.ts apps/admin/src/server/admin-service.test.ts
git commit -m "feat(admin): add waitlist lifecycle management service and API endpoints"
```

---

### Task 4: Admin Console UI for Waitlist & Capacity Management

**Files:**
- Create: `apps/admin/src/components/waitlist/WaitlistManagementView.tsx`
- Modify: `apps/admin/src/components/Navigation.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/client/api.ts`
- Modify: `apps/admin/src/client/use-admin-data.ts`
- Modify: `apps/admin/src/components/overview/OperationsOverview.tsx`

**Interfaces:**
- Consumes: `/api/waitlist`, `/api/waitlist/raise-and-release`, `/api/waitlist/release`, `/api/waitlist/capacity`
- Produces: Interactive Waitlist & Capacity tab in Admin console

- [ ] **Step 1: Add API client functions in `apps/admin/src/client/api.ts` and hook in `use-admin-data.ts`**

Add `fetchWaitlist()`, `raiseCapacityAndRelease()`, `releaseWaitlistChildren()`, `setCapacity()`.

- [ ] **Step 2: Build `WaitlistManagementView.tsx`**

Create:
1. Top KPI cards (當前容量上限, 在學服務中, 等候名額中, 已開放選購, 成功轉化).
2. Action card:
   - **擴容並全數開放 (Raise Capacity & Release All)**: Input for new capacity with validation that it covers active + waiting, one-click button.
   - **手動調整容量 (Adjust Capacity Only)**.
   - **複製通知 Email 清單 (Fallback Copy Email List)**.
3. Candidate Data Table:
   - Filter by status (全部 / 等候中 / 已開放 / 已轉化).
   - Display parent email, child name, grade stage, joined date, status pill, released date, converted date.
   - Action: "開放名額" for individual waiting child.

- [ ] **Step 3: Wire into `Navigation.tsx` and `App.tsx`**

Add navigation tab `waitlist` with badge count for waiting candidates.

- [ ] **Step 4: Update `OperationsOverview.tsx`**

Show waitlist summary count in the Capacity KPI card.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @paper-english/admin test` and `pnpm --filter @paper-english/admin build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/components/waitlist/WaitlistManagementView.tsx apps/admin/src/components/Navigation.tsx apps/admin/src/App.tsx apps/admin/src/client/api.ts apps/admin/src/client/use-admin-data.ts apps/admin/src/components/overview/OperationsOverview.tsx
git commit -m "feat(admin): build waitlist and capacity management UI view"
```

---

### Task 5: Web Parent App Waitlist Library, Onboarding & Honest Messaging

**Files:**
- Create: `apps/web/src/lib/waitlist.ts`
- Modify: `apps/web/src/lib/enrollment.ts`
- Modify: `apps/web/src/components/public/CapacityStatus.tsx`
- Modify: `apps/web/src/routes/WaitlistPage.tsx`
- Modify: `apps/web/src/routes/ChildOnboardingPage.tsx`
- Test: `apps/web/src/lib/enrollment.test.ts` (or existing tests)

**Interfaces:**
- Produces: `listOwnedWaitlistEntries()`, `getWaitlistForChild(childId)`

- [ ] **Step 1: Create `apps/web/src/lib/waitlist.ts`**

Export:
- `export type WaitlistStatus = 'waiting' | 'released' | 'converted' | 'canceled'`
- `export type WaitlistEntry = { id: string; childId: string; parentId: string; email: string; status: WaitlistStatus; createdAt: string; releasedAt: string | null; convertedAt: string | null }`
- `listOwnedWaitlistEntries(): Promise<WaitlistEntry[]>`

- [ ] **Step 2: Update `apps/web/src/lib/enrollment.ts` and `CapacityStatus.tsx`**

Update `EnrollmentState` with `waitingCount` and `releasedCount`. Ensure `CapacityStatus.tsx` and `WaitlistPage.tsx` show honest messaging when full:
*"目前名額已滿。可以先建立帳號並填寫孩子的學習資料，不會收費。有名額開放時，我們會寄 Email 通知你，再決定是否訂閱。"*

- [ ] **Step 3: Update `ChildOnboardingPage.tsx`**

After child creation/profiling, if the child was placed on waitlist (i.e. status is `waiting`), display confirmation:
*"已為孩子登記候補！學習資料已完整儲存。我們會在擴容開放時以 Email 通知您，收到通知後即可開通每週專屬教材。"*

- [ ] **Step 4: Run web unit tests**

Run: `pnpm --filter @paper-english/web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/waitlist.ts apps/web/src/lib/enrollment.ts apps/web/src/components/public/CapacityStatus.tsx apps/web/src/routes/WaitlistPage.tsx apps/web/src/routes/ChildOnboardingPage.tsx
git commit -m "feat(web): add waitlist data layer and honest onboarding confirmation"
```

---

### Task 6: Web Parent Dashboard & Billing Experience for Waiting & Released States

**Files:**
- Modify: `apps/web/src/hooks/use-parent-data.ts`
- Modify: `apps/web/src/components/dashboard/ChildCard.tsx`
- Modify: `apps/web/src/routes/BillingPage.tsx`
- Modify: `apps/web/src/components/billing/ChildSubscription.tsx`
- Test: `apps/web/src/components/billing/ChildSubscription.test.tsx`

**Interfaces:**
- Consumes: `listOwnedWaitlistEntries`
- Produces: Dashboard and Billing cards reflecting `waiting` and `released` states with locked/unlocked checkout.

- [ ] **Step 1: Update `useParentData` in `apps/web/src/hooks/use-parent-data.ts`**

Include `waitlist?: WaitlistEntry | null` on `ChildWithProfile`.

- [ ] **Step 2: Update `ChildCard.tsx`**

1. If `child.waitlist?.status === 'waiting'`:
   - Status badge: `候補中・等候名額開放`
   - Body message: *"目前名額已滿，孩子的學習資料已完整儲存。有名額開放時會以 Email 通知您開通訂閱。"*
2. If `child.waitlist?.status === 'released'`:
   - Status badge: `名額已開放・請確認訂閱`
   - Banner: *"您已獲得專屬訂閱名額！請前往帳戶設定確認方案，完成後即可開始準備每週專屬教材。"* with CTA to `/billing`.

- [ ] **Step 3: Update `ChildSubscription.tsx` and `BillingPage.tsx`**

1. If child is `waiting`:
   - Render waitlist card: status `候補中・等候名額開放`, description *"目前在候補名單中，尚未收費。新名額開放時會寄信通知您開始訂閱。"*. Checkout button hidden/disabled.
2. If child is `released`:
   - Render plan selector (Monthly NT$499 / Annual NT$4,999) with banner *"名額已為您開放！請選擇月繳或年繳方案以啟用訂閱。"*
   - Enable Paddle checkout button.

- [ ] **Step 4: Update and run tests in `ChildSubscription.test.tsx`**

Add test cases verifying:
- `waiting` child displays waitlist notice and does not allow checkout.
- `released` child displays released banner and enables monthly/annual checkout.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @paper-english/web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/use-parent-data.ts apps/web/src/components/dashboard/ChildCard.tsx apps/web/src/routes/BillingPage.tsx apps/web/src/components/billing/ChildSubscription.tsx apps/web/src/components/billing/ChildSubscription.test.tsx
git commit -m "feat(web): integrate waitlist status and billing gating into parent dashboard"
```

---

### Task 7: End-to-End Verification & Workspace Validation

**Files:**
- Workspace-wide verification across apps, packages, and supabase.

- [ ] **Step 1: Run typechecks across the entire repository**

Run: `pnpm typecheck`
Expected: All packages and apps pass typecheck without errors.

- [ ] **Step 2: Run all unit and integration tests**

Run: `pnpm test`
Expected: All vitest suites pass.

- [ ] **Step 3: Run production builds**

Run: `pnpm build` and `pnpm admin:build`
Expected: Production bundles build cleanly without warnings or errors.

- [ ] **Step 4: Run E2E test verification**

Run: `pnpm test:e2e`
Expected: PASS.

- [ ] **Step 5: Final review and commit**

```bash
git add .
git commit -m "feat: complete >100 scaling gate waitlist lifecycle and capacity cohort release"
```
