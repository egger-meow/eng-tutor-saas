# Child-Based Capacity Counter Implementation Plan

> **For agentic workers:** Execute this plan inline with focused verification after each coherent change.

**Goal:** Make founding and service-capacity counters consistently count children, and show both used and remaining child slots in public UI.

**Architecture:** Keep the existing anonymous-safe Supabase enrollment RPC as the authoritative aggregate. Return child-based active count plus a child-based founding count, then render explicit used/remaining copy in shared public capacity and pricing components.

**Tech Stack:** Supabase PostgreSQL migrations, React, TypeScript, Vitest, SQL smoke tests.

## Global Constraints

- Capacity is counted by child, never by parent email.
- The public cap is 100 active service children and the founding limit is 30 eligible children.
- Preserve anonymous-safe aggregate output; expose no child or parent identifiers.
- Preserve one-child-one-subscription and private PDF ownership boundaries.

### Task 1: Make the enrollment aggregate explicit

**Files:**
- Create: `supabase/migrations/20260814130000_child_based_enrollment_counters.sql`
- Modify: `supabase/tests/smoke.sql`

- [ ] Replace the enrollment function with an aggregate that counts active children through eligible service subscriptions and returns `founding_count` alongside `active_count`.
- [ ] Keep remaining values clamped at zero and retain the existing public grants.
- [ ] Add SQL smoke coverage for multiple children sharing one parent and verify counts are 2 children, not 1 parent.

### Task 2: Expose and render the counters

**Files:**
- Modify: `apps/web/src/lib/enrollment.ts`
- Modify: `apps/web/src/components/public/CapacityStatus.tsx`
- Modify: `apps/web/src/components/public/PricingSection.tsx`

- [ ] Add typed `foundingCount` to the enrollment state.
- [ ] Render “已有 X 位孩子加入／還剩 Y 個名額” and “Founding 30 已使用 A／還有 B 個” using live state.
- [ ] Keep waitlist/full states and existing CTA behavior intact.

### Task 3: Verify and deliver

**Files:**
- Test: existing web and SQL test suites

- [ ] Run focused TypeScript tests, lint, typecheck, and database smoke tests available locally.
- [ ] Inspect the diff for account-vs-child wording and commit/push the coherent change.
