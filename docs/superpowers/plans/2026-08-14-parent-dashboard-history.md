# Parent Dashboard History and Child Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore discoverable weekly material history and render all owned child profiles on one parent-facing page.

**Architecture:** Keep per-child material and subscription boundaries. Improve the existing dashboard history affordance, and change the profile route to render the full owned-child collection returned by `useParentData`.

**Tech Stack:** React, TypeScript, Vite, Vitest, existing Supabase data helpers, CSS modules via project stylesheets.

## Global Constraints

- Preserve parent ownership boundaries and one-child-one-subscription semantics.
- Preserve compact historical memory and load only the recent five materials initially.
- Do not add MVP non-goal features or change database/RLS behavior.
- Follow the repository's `VITE_BASE_PATH=/eng-tutor-saas/` deployment behavior.

---

### Task 1: Make material history discoverable

**Files:**
- Modify: `apps/web/src/components/dashboard/ChildCard.tsx`
- Modify: `apps/web/src/components/materials/MaterialHistory.tsx`
- Modify: `apps/web/src/styles/components.css`

- [ ] **Step 1: Replace the ambiguous history label with an explicit action**
- [ ] **Step 2: Keep the existing recent-five initial query and load-more behavior**
- [ ] **Step 3: Add accessible state text and spacing for the history action**
- [ ] **Step 4: Run the web typecheck and focused tests**

### Task 2: Render all child profiles on the profile page

**Files:**
- Modify: `apps/web/src/routes/ChildProfilePage.tsx`
- Modify: `apps/web/src/styles/components.css`

- [ ] **Step 1: Render `data.children` rather than only `childId`**
- [ ] **Step 2: Keep the route's ownership-safe data source and edit links per child**
- [ ] **Step 3: Add a divider between child profile sections without card wrappers**
- [ ] **Step 4: Run typecheck, unit tests, and production build**

### Task 3: Verify and deliver

**Files:**
- Test: existing `apps/web/src/lib/*.test.ts` and route tests

- [ ] **Step 1: Run `pnpm typecheck`**
- [ ] **Step 2: Run `pnpm test`**
- [ ] **Step 3: Run `pnpm build`**
- [ ] **Step 4: Review the diff for scope and commit the coherent change**
