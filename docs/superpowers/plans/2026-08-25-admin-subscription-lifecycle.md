# Admin Subscription Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Traditional Chinese operator Admin with trustworthy subscription lifecycle and revenue visibility plus correct three-state engine provenance presentation.

**Architecture:** Add an immutable Supabase lifecycle-event table and instrument the authoritative Paddle and internal beta transition transactions. Build a sanitized Admin read model from current subscriptions plus recorded events, then expose it through the existing Admin server/client pattern and render a focused subscription page without reconstructing pre-instrumentation history.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, Supabase Edge Functions/Deno, React 19, TypeScript, Vite, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-08-25-admin-subscription-lifecycle-design.md`

## Global Constraints

- Do not use TDD; implement directly, then run focused and final verification.
- Keep `subscriptions` and `billing_webhook_events` authoritative inputs.
- Do not backfill fabricated lifecycle history.
- Exclude `children.is_internal_test = true` from paid, conversion, churn, and revenue metrics.
- Preserve exact versions: Engine `1.1.0`, Prompt `2.5.0`, Schema `2.3.0`.
- `unobservable` is neutral; only `version_drift` uses error styling.
- Keep raw engineering identifiers in English only where diagnostically useful.
- Do not add unrelated Admin features.

---

### Task 1: Append-only subscription lifecycle truth

**Files:**
- Create: `supabase/migrations/<generated>_add_subscription_lifecycle_events.sql`
- Modify: `supabase/tests/smoke.sql`

**Interfaces:**
- Produces table `public.subscription_lifecycle_events` with normalized event type, source, source event ID, effective timestamp, observed subscription fields, and immutable metadata.
- Produces internal recording/classification helpers used by beta creation and `public.process_paddle_subscription_event(...)`.

- [ ] Generate the migration filename with `pnpm exec supabase migration new add_subscription_lifecycle_events`.
- [ ] Create the event enum/check constraints, foreign keys, indexes, source idempotency constraint, RLS, explicit role revokes/grants, and update/delete rejection trigger.
- [ ] Replace the current beta subscription trigger function so subscription creation and `trial_started` recording share one transaction and internal-test/waitlist rules remain unchanged.
- [ ] Replace the current Paddle RPC definition while preserving its exact public signature, validation, waitlist conversion, founding logic, and generation enqueue behavior; lock the previous subscription row and insert the appropriate lifecycle event using `p_occurred_at`.
- [ ] Record `cancel_scheduled` separately, classify `activated`, `renewed`, `resumed`, `past_due`, `paused`, and `canceled`, and avoid inserting a lifecycle event when no authoritative transition is observable.
- [ ] Extend pgTAP/smoke coverage for immutability, webhook idempotency, timestamps, beta trial creation, renewal, cancellation scheduling, terminal cancellation, resume, and no historical backfill.
- [ ] Run `pnpm test:db` and confirm all database tests pass.

### Task 2: Subscription Admin data contract and read model

**Files:**
- Modify: `apps/admin/src/client/types.ts`
- Modify: `apps/admin/src/client/api.ts`
- Modify: `apps/admin/src/client/use-admin-data.ts`
- Modify: `apps/admin/src/server/api-handler.ts`
- Modify: `apps/admin/src/server/admin-service.ts`
- Modify: `apps/admin/src/server/admin-service.test.ts`

**Interfaces:**
- Add `TabId` value `subscriptions`.
- Add `SubscriptionRevenueData`, current-state counts, time-series points, authoritative funnels, table rows, and lifecycle timeline types.
- Add `getSubscriptions(rangeDays)` and `/api/subscriptions?days=N`.

- [ ] Add the browser-safe TypeScript contract with range options and localized-state-ready normalized values.
- [ ] Query subscriptions, children, and lifecycle events with explicit select fields; mask child names and filter internal-test children before metric aggregation.
- [ ] Derive current counts from current rows and historical series only from lifecycle events inside the selected range.
- [ ] Compute trial-to-paid conversion only from children with both recorded `trial_started` and later `activated`; expose unavailable funnel stages explicitly.
- [ ] Return current subscription table rows with plan, price, start, period end, cancellation state, and sorted event timelines.
- [ ] Wire the API route, client call, loading/refresh behavior, and focused service tests covering all current states, ranges, calculations, no-event periods, and internal-test exclusion.
- [ ] Run `pnpm --filter @paper-english/admin test` and `pnpm --filter @paper-english/admin typecheck`.

### Task 3: Traditional Chinese Admin and subscription page

**Files:**
- Create: `apps/admin/src/components/subscriptions/SubscriptionRevenueView.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/components/Header.tsx`
- Modify: `apps/admin/src/components/Navigation.tsx`
- Modify: `apps/admin/src/components/AnomalyBanner.tsx`
- Modify: `apps/admin/src/components/overview/OperationsOverview.tsx`
- Modify: `apps/admin/src/components/failures/FailureIntelligence.tsx`
- Modify: `apps/admin/src/components/feedback/ParentFeedbackIntelligence.tsx`
- Modify: `apps/admin/src/components/product/ProductFeedbackView.tsx`
- Modify: `apps/admin/src/components/timeline/ChildWeekTimeline.tsx`
- Modify: `apps/admin/src/components/timeline/GenerationTestModePanel.tsx`
- Modify: `apps/admin/src/components/waitlist/WaitlistManagementView.tsx`
- Modify: `apps/admin/src/components/export/AiDatasetExport.tsx`
- Modify: `apps/admin/src/styles/cockpit.css`
- Test: existing Admin component/service tests plus any new focused component test needed for semantic styling.

**Interfaces:**
- `SubscriptionRevenueView` consumes `SubscriptionRevenueData` and a range-change callback.
- Engine Inspector maps `aligned`, `unobservable`, and `version_drift` to distinct localized labels and CSS classes.

- [ ] Localize primary navigation, page headings, controls, loading/empty/error copy, status text, and operator explanations to Traditional Chinese while preserving raw identifiers.
- [ ] Localize the cockpit labels to `服務中孩子`, `等候名單`, `總需求`, `等待生成`, `等待品質審核`, and `審核完成`; translate first/retry/attempt labels without changing pipeline membership.
- [ ] Render the Engine/Prompt/Schema hierarchy and ensure unobservable rows use a neutral class rather than `drift-row`.
- [ ] Add the `訂閱與營收` navigation page with compact current-state cards, range controls, accessible SVG/CSS charts, authoritative funnel blocks, and an expandable subscription timeline table.
- [ ] Add responsive, low-weight styles consistent with the existing cockpit and explicit green/neutral/red engine states.
- [ ] Add/adjust regression assertions for Traditional Chinese labels and engine semantic classes.
- [ ] Run Admin tests, typecheck, and build.

### Task 4: Final verification and production delivery

**Files:**
- Modify only files required to fix verification failures caused by Tasks 1–3.

- [ ] Run `git diff --check` and review the full scoped diff for accidental unrelated changes and untranslated primary UI strings.
- [ ] Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- [ ] Run a fresh local Supabase reset followed by `pnpm test:db` and verify the migration chain from zero.
- [ ] Invoke `superpowers:verification-before-completion`, review current Git state, and commit the coherent implementation.
- [ ] Push the current branch without force.
- [ ] Apply the pending migration to the linked production database, verify remote migration history, and run security/performance advisors.
- [ ] Deploy `paddle-webhook` only if its source changed and verify the deployed function version.
