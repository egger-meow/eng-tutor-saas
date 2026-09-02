# Existing Parent Onboarding Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent silent duplicate-child creation for returning parents, provide safe child removal, and make Admin analytics distinguish first-child conversion from returning-parent additional-child activity.

**Architecture:** Keep the current landing-first anonymous draft and Magic Link flow. The existing `finalize_pending_onboarding(text)` RPC remains the first callback path, but it must stop with a machine-readable confirmation-required error when the authenticated parent already owns an active child; a separate authenticated confirmation RPC explicitly permits creation of an additional child, and a discard RPC removes the pending draft. Child removal is a soft archive through a reviewed authenticated RPC that blocks live Paddle subscriptions, cancels beta/waitlist state, and leaves historical material/billing rows intact. Funnel analytics add branch events rather than rewriting historical events, and the Admin UI presents first-child conversion separately from returning-parent add-child activity.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase/PostgreSQL RPCs and RLS, existing Cloudflare Workers Static Assets frontend.

**Spec:** `docs/SPEC.md` sections 17–21, 24, 33, 36, 44–45, 141–149, 159–161, 168–170, 172, 179, 182, 192, 198, 204, 210.

## Global Constraints

- One authenticated parent may manage multiple children; multiple children must remain isolated.
- Landing-first Free Week 1 onboarding remains child-data-first and Email/Magic-Link-last.
- Existing parents must never receive a silent duplicate child from the anonymous landing handoff.
- Do not expose whether an Email already has an account before Magic Link authentication.
- Do not hard-delete child history, materials, or billing records.
- A child with a live Paddle subscription cannot be removed while billing entitlement is still live.
- Analytics must remain non-blocking and privacy-preserving.
- Update `docs/SPEC.md` when changing the product contract; do not rename sections, so `docs/SPEC-TOC.md` remains unchanged.

---

### Task 1: Lock returning-parent handoff behavior in tests

**Files:**
- Modify: `scripts/onboarding-handoff-security.test.ts`
- Modify: `apps/web/src/lib/onboarding-handoff.test.ts`

**Interfaces:**
- Consumes: current `finalize_pending_onboarding(text)` handoff.
- Produces: `confirmAdditionalChildOnboarding(token)` and `discardPendingOnboarding(token)` client contracts plus confirmation-required result handling.

- [ ] **Step 1: Write failing tests** asserting the migration contains an active-child guard, authenticated confirmation/discard RPCs, and the client maps `ADDITIONAL_CHILD_CONFIRMATION_REQUIRED` to a confirmation state.
- [ ] **Step 2: Run targeted tests** and verify failure is specifically due to the missing guard/RPC/client behavior.
- [ ] **Step 3: Implement the minimum migration/client changes** to satisfy those contracts.
- [ ] **Step 4: Run targeted tests** and verify green.
- [ ] **Step 5: Commit** the handoff safety slice.

### Task 2: Add the authenticated confirmation UI

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/auth/AdditionalChildConfirmation.tsx`
- Create or modify tests under: `apps/web/src/components/auth/`

**Interfaces:**
- Consumes: `finalizePendingOnboarding`, `confirmAdditionalChildOnboarding`, `discardPendingOnboarding`, authenticated `listChildren()`.
- Produces: explicit UI with `是，新增另一位孩子` and `不是，回到原本孩子管理` actions.

- [ ] **Step 1: Write a failing rendering/behavior contract test** for the confirmation copy and actions.
- [ ] **Step 2: Run the targeted test** and verify it fails because the component/branch does not exist.
- [ ] **Step 3: Implement the minimal confirmation state in `App.tsx`**; first finalize attempt must not create when existing children are present.
- [ ] **Step 4: Run targeted tests** and verify green.
- [ ] **Step 5: Commit** the UI slice.

### Task 3: Add safe child removal

**Files:**
- Create: `supabase/migrations/20260902*_safe_parent_child_archive.sql`
- Modify: `apps/web/src/lib/children.ts`
- Modify: `apps/web/src/routes/ChildProfilePage.tsx`
- Add/modify relevant Vitest contract tests and `supabase/tests/smoke.sql` if the existing DB smoke style supports the RPC.

**Interfaces:**
- Produces: `public.archive_owned_child(p_child_id uuid)` and client `archiveChild(id)` backed by that RPC.

- [ ] **Step 1: Write failing tests** requiring owner checks, live-Paddle blocking, beta cancellation, waitlist cancellation, `children.is_active=false`, and authenticated-only EXECUTE.
- [ ] **Step 2: Run tests** and verify the missing RPC/UI is the failure reason.
- [ ] **Step 3: Implement the RPC** as a transaction-safe soft archive. Preserve materials/history. Reject `provider='paddle'` with status `trialing|active|past_due|paused`; for beta, set subscription to canceled/end now; cancel waiting/released waitlist rows; deactivate the child.
- [ ] **Step 4: Add a danger-zone UI** on the child profile with explicit confirmation copy and refresh/navigate after success.
- [ ] **Step 5: Run targeted tests** and verify green.
- [ ] **Step 6: Commit** the child-removal slice.

### Task 4: Split Admin funnel into acquisition vs returning-parent branch

**Files:**
- Modify: `apps/web/src/lib/analytics.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `supabase/migrations/*` with a forward-only event allowlist migration
- Modify: `apps/admin/src/client/types.ts`
- Modify: `apps/admin/src/server/admin-service.ts`
- Modify: `apps/admin/src/components/funnel/landing-first-funnel.ts`
- Modify: `apps/admin/src/components/funnel/landing-first-funnel.test.ts`
- Modify: `apps/admin/src/components/funnel/ConversionFunnelView.tsx`
- Modify: `apps/admin/src/server/admin-service.funnel.test.ts`

**Interfaces:**
- Adds event names: `existing_parent_detected`, `additional_child_confirmed`, `pending_onboarding_discarded`, `child_archived`.
- First-child funnel remains: landing → sample → CTA → form start → Email → auth → child created → onboarded.
- Returning-parent branch reports: existing parent detected → additional child confirmed or pending onboarding discarded; `child_archived` is an account-management metric, not an acquisition conversion step.

- [ ] **Step 1: Write failing Admin normalization/service tests** for the separate returning-parent branch.
- [ ] **Step 2: Run tests** and verify expected failure.
- [ ] **Step 3: Add event allowlist/types/tracking** and emit events at confirmation/discard/archive success points.
- [ ] **Step 4: Update Admin presentation** so first-child conversion is not diluted by returning parents.
- [ ] **Step 5: Run targeted Admin/web tests** and verify green.
- [ ] **Step 6: Commit** analytics/Admin slice.

### Task 5: Update product contract and complete verification

**Files:**
- Modify: `docs/SPEC.md` sections 36, 44, 161, 168–170, 192, 198 as required.

- [ ] **Step 1: Update SPEC** to define returning-parent confirmation and safe archival semantics.
- [ ] **Step 2: Run `pnpm lint`**; expected PASS.
- [ ] **Step 3: Run `pnpm test`**; expected PASS.
- [ ] **Step 4: Run `pnpm typecheck`**; expected PASS.
- [ ] **Step 5: Run `pnpm build`**; expected PASS.
- [ ] **Step 6: Open a non-draft PR**, wait for CI, review the final diff, and merge only if green.
- [ ] **Step 7: Apply new Supabase migrations to production**, verify migration history/RPC ACLs, then confirm the post-merge production deploy succeeds.
