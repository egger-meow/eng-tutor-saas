# Annual Paddle Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure NT$4,999 annual Paddle subscription from public pricing and parent checkout through webhook-backed database state.

**Architecture:** One Paddle product owns separate monthly and annual recurring prices. Browser code sends a semantic plan key; the checkout function maps it to server-owned price IDs, and the webhook validates Paddle item price/interval/amount before persisting canonical billing data through a locked-down RPC.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Paddle Billing/Paddle.js, Supabase Edge Functions, PostgreSQL, Vitest.

## Global Constraints

- Billing is per child and one Paddle subscription maps to exactly one child.
- Entitlement and subscription state change only from verified Paddle webhook events.
- Founding 30 applies to the first paid monthly period only; annual is always NT$4,999.
- Existing active subscriptions do not switch interval in this phase.
- Preserve signed and idempotent webhook processing, stale-event rejection, capacity behavior, and `VITE_BASE_PATH` deployment behavior.
- Do not expose Paddle API keys, webhook secrets, Supabase secret/service-role keys, or raw server price selection to browser code.

---

### Task 1: Canonical plan model and secure persistence

**Files:**
- Create: `supabase/migrations/<generated>_add_annual_paddle_subscription.sql`
- Modify: `supabase/tests/smoke.sql`

**Interfaces:**
- Produces `subscriptions.billing_interval` with `month | year | null` and canonical plan codes `standard_monthly | standard_annual`.
- Extends `process_paddle_subscription_event` with plan code, billing interval, and price arguments.

- [ ] Generate the migration with the installed Supabase CLI.
- [ ] Add the constrained billing interval column and replace the webhook RPC without weakening ownership, idempotency, stale-event, or execute permissions.
- [ ] Redeem Founding 30 only for `standard_monthly`; annual activation must leave eligibility unredeemed.
- [ ] Extend smoke tests for monthly and annual persistence, invalid plan/interval/price combinations, and service-role-only RPC execution.
- [ ] Run the database suite after implementation.

### Task 2: Paddle checkout and webhook boundaries

**Files:**
- Modify: `.env.example`
- Modify: `supabase/functions/paddle-checkout/index.ts`
- Modify: `supabase/functions/paddle-webhook/index.ts`
- Create/Modify: focused shared plan helper and unit test files if required by the existing test runner.

**Interfaces:**
- Checkout accepts `{ child_id: string, plan: 'monthly' | 'annual' }`.
- Checkout returns `{ transaction_id, plan, billing_interval, price_twd, founding_applies }`.
- Webhook reads `items[0].price.id`, `billing_cycle.interval`, `unit_price.amount`, and `currency_code` and passes validated canonical data to Postgres.

- [ ] Add `PADDLE_ANNUAL_PRICE_ID` and map semantic plans to server-side price IDs.
- [ ] Apply the founding discount only to monthly transactions and include plan metadata in custom data.
- [ ] Reject missing/unknown plans before any Paddle API call.
- [ ] Validate webhook price ID, recurring interval, TWD currency, integer unit amount, and a single quantity-one item before granting entitlement.
- [ ] Keep signature verification and webhook event idempotency unchanged.
- [ ] Add focused tests for valid monthly/annual mapping and invalid inputs.

### Task 3: Pricing and parent billing UI

**Files:**
- Modify: `apps/web/src/content/site.ts`
- Modify: `apps/web/src/lib/subscriptions.ts`
- Modify: `apps/web/src/components/public/PricingSection.tsx`
- Modify: `apps/web/src/components/billing/ChildSubscription.tsx`
- Modify: `apps/web/src/routes/BillingPage.tsx`
- Modify: `apps/web/src/styles/components.css`
- Create: focused pricing/subscription unit tests.

**Interfaces:**
- Produces shared monthly/annual display configuration and annual saving calculation.
- `prepareCheckout(childId, plan)` sends the semantic plan and returns the exact checkout summary.
- `ChildSubscription.onSubscribe(childId, plan)` carries the selected interval into checkout.

- [ ] Centralize monthly/annual prices, labels, cadence, annual monthly equivalent, and savings.
- [ ] Show both public prices and make monthly-only founding copy explicit.
- [ ] Add an accessible monthly/annual selector to trialing/canceled child cards with annual savings copy.
- [ ] Render stored active plan cadence from `billing_interval` and plan code, not hardcoded monthly text.
- [ ] Keep the selected plan stable while the inline Paddle checkout is open and show the exact plan summary.
- [ ] Add unit tests for pricing calculations and checkout payload/error normalization.

### Task 4: Documentation, verification, and delivery

**Files:**
- Modify: `README.md` or existing billing operations documentation if present.
- Modify: files above only as verification requires.

- [ ] Document Paddle Sandbox product/price creation and every required ID/secret, webhook event, and Supabase secret name.
- [ ] Run focused tests, `pnpm test`, `pnpm test:db`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [ ] Run `git diff --check` and inspect the complete diff for security and copy consistency.
- [ ] Commit the coherent feature and push the current upstream branch without force.
