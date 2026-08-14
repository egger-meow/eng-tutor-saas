# Parent Guide and Product Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a logged-in parent guide with a secure product-feedback form.

**Architecture:** A static React route renders the parent learning guidance and a focused form component. The form writes a typed record through the browser-safe Supabase client to a new RLS-protected `public.product_feedback` table. This table is intentionally separate from material feedback so it cannot affect personalization or generation.

**Tech Stack:** React 19, TypeScript, Vite, Supabase Postgres/RLS, Vitest, CSS tokens.

## Global Constraints

- Preserve `VITE_BASE_PATH=/eng-tutor-saas/` and static SPA routing.
- Browser code uses only the publishable Supabase client; no service-role keys.
- Product feedback has no email delivery and does not trigger generation.
- New exposed tables enable RLS and grant only the required authenticated capabilities.
- Retain existing unrelated working-tree changes.

---

### Task 1: Secure product-feedback persistence

**Files:**
- Create: `supabase/migrations/<timestamp>_add_product_feedback.sql`
- Modify: `supabase/tests/smoke.sql`

**Interfaces:**
- Produces `public.product_feedback(parent_id uuid, category text, message text)` for browser inserts.
- Category values: `bug`, `flow`, `materials`, `other`.

- [ ] Create the migration through `supabase migration new add_product_feedback`.
- [ ] Define the table with UUID primary key, `parent_id` referencing `public.profiles(id)`, category check, message length check, and timestamps.
- [ ] Enable RLS; add authenticated SELECT and INSERT policies whose ownership predicate is `(select auth.uid()) = parent_id`; add matching explicit grants.
- [ ] Extend the SQL smoke suite to prove the owner may insert/select and a second authenticated user cannot read or insert a row for the owner.
- [ ] Run `pnpm test:db` and inspect the migration for correct grants and RLS predicates.

### Task 2: Browser feedback data boundary

**Files:**
- Create: `apps/web/src/lib/product-feedback.ts`
- Create: `apps/web/src/lib/product-feedback.test.ts`

**Interfaces:**
- Produces `ProductFeedbackCategory`, `ProductFeedbackInput`, and `saveProductFeedback(input)`.
- Consumed by `ProductFeedbackForm` in Task 3.

- [ ] Implement the category union and a `saveProductFeedback` function that gets the current authenticated user and inserts `{ parent_id, category, message }` through `getSupabaseClient()`.
- [ ] Reject an unauthenticated session, a non-whitelisted category, blank/whitespace-only messages, and messages longer than 4,000 characters before a database call.
- [ ] Add unit tests for validation behaviour and the successful insert payload using the existing Vitest mocking pattern.
- [ ] Run the focused Vitest test file.

### Task 3: Parent guide, form, and navigation

**Files:**
- Create: `apps/web/src/components/product-feedback/ProductFeedbackForm.tsx`
- Create: `apps/web/src/routes/ParentGuideFeedbackPage.tsx`
- Modify: `apps/web/src/app/routes.ts`
- Modify: `apps/web/src/app/routes.test.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/ParentNavigation.tsx`
- Modify: `apps/web/src/styles/components.css`

**Interfaces:**
- Consumes `saveProductFeedback(input)` from Task 2.
- Produces protected route name `parent-guide-feedback` at `/parent-guide-feedback`.

- [ ] Add a static protected route and test it, including GitHub Pages base-path handling.
- [ ] Render a parent-only page in the existing `AppShell` with the parent navigation, explanation sections, AI photo privacy reminder, and weekly-feedback link/copy.
- [ ] Build a semantic form: category radio group, labeled textarea, character limit, disabled submit state, and `role=status` success/error announcements.
- [ ] Add responsive CSS using existing design tokens; keep the guide scannable and the form adjacent below it on narrow screens.
- [ ] Run focused route/form tests, then `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

### Task 4: Final verification and delivery

**Files:**
- Modify: files from Tasks 1-3 only as verification requires.

- [ ] Run `pnpm test`, `pnpm test:db`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [ ] Inspect `git diff --check` and `git status --short`; confirm only feature files are staged.
- [ ] Commit only the feature files with `feat(web): add parent guide and product feedback` and push the current upstream branch without force.
