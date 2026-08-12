# Parent Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype parent portal with a child-centric, editorial-quality public site and authenticated workflow while preserving secure materials, feedback, and Supabase ownership boundaries.

**Architecture:** Keep React 19 and Vite, add a small browser-history router without a new routing dependency, and split route coordination from typed feature components and `src/lib` data access. Existing Supabase tables remain authoritative; only a focused migration is added for public capacity counts and profile fields that cannot be represented cleanly by the current schema.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Supabase JS 2, CSS custom properties, Vitest, oxlint

## Global Constraints

- Preserve Email OTP / Magic Link authentication and short-lived signed PDF downloads.
- Never expose service-role credentials, sibling data, private PDFs, or operational queue language.
- Completed PDFs remain immutable; profile edits affect future generation only.
- Use the approved Editorial Learning Journal tokens and avoid gradients, glassmorphism, KPI grids, AI branding, and childish decoration.
- Support keyboard navigation, visible focus, reduced motion, WCAG AA contrast, and a 375px viewport.
- Pricing is NT$499 per child monthly; Founding 30 receives free Week 1, then NT$299 for the first paid month; capacity is 100 active children.
- Follow the repository preference to implement first and run focused verification afterward; do not use TDD.

---

### Task 1: Application foundation and design system

**Files:**
- Create: `apps/web/src/app/routes.ts`
- Create: `apps/web/src/app/use-route.ts`
- Create: `apps/web/src/components/layout/AppShell.tsx`
- Create: `apps/web/src/components/layout/PublicHeader.tsx`
- Create: `apps/web/src/components/layout/ParentNavigation.tsx`
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/base.css`
- Create: `apps/web/src/styles/components.css`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Produces `Route = { name; params; path }`, `parseRoute(pathname)`, and `navigate(path)`.
- Produces layout components accepting `children: ReactNode`; authenticated navigation also accepts `activeChildId?: string`.

- [ ] Add path matching for `/`, `/about`, `/guide`, `/waitlist`, `/dashboard`, `/children/new`, `/children/:id`, `/children/:id/edit`, `/children/:id/materials`, `/feedback/:materialId`, and `/billing`; unknown paths resolve to `/` for the GitHub Pages SPA fallback.
- [ ] Implement `useRoute()` with `popstate` subscription and an exported `navigate()` that calls `history.pushState` and dispatches a route-change event.
- [ ] Add semantic layout primitives with skip link, public header, parent navigation, account menu, and no more than four mobile destinations.
- [ ] Move all global colors, type, spacing, radius, focus, status, and motion values into CSS custom properties using the approved token values.
- [ ] Replace the current global CSS import with `tokens.css`, `base.css`, and `components.css`; load Noto Serif TC/Noto Sans TC with resilient system fallbacks.
- [ ] Verify with `pnpm --filter @paper-english/web typecheck`, `pnpm --filter @paper-english/web lint`, and `pnpm --filter @paper-english/web build`.
- [ ] Commit as `refactor: establish parent portal foundation`.

### Task 2: Typed child context and reusable material flows

**Files:**
- Create: `apps/web/src/lib/child-profiles.ts`
- Create: `apps/web/src/hooks/use-parent-data.ts`
- Create: `apps/web/src/components/children/ChildSwitcher.tsx`
- Create: `apps/web/src/components/children/ChildIdentity.tsx`
- Create: `apps/web/src/components/materials/MaterialActions.tsx`
- Create: `apps/web/src/components/materials/MaterialHistory.tsx`
- Create: `apps/web/src/components/materials/MaterialHistoryItem.tsx`
- Create: `apps/web/src/components/feedback/FeedbackForm.tsx`
- Create: `apps/web/src/components/feedback/FeedbackSummary.tsx`
- Modify: `apps/web/src/lib/children.ts`
- Modify: `apps/web/src/lib/materials.ts`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces `ChildProfile`, `ChildWithProfile`, `listChildProfiles(childIds)`, and `saveChildProfile(childId, input)`.
- Produces `useParentData()` returning `{ children, selectedChild, materials, loading, error, selectChild, refresh }`.
- `MaterialActions` consumes one `Material`, a child name, and callbacks; it continues calling `openMaterialDownload()` rather than handling storage directly.

- [ ] Expand child and material types to include `textbook_version`, `next_generation_at`, generation summaries, and feedback timestamps without weakening null handling.
- [ ] Load children first, select from URL/local storage only when the child belongs to the signed-in parent, then fetch only that child's materials.
- [ ] Extract feedback fields exactly as currently supported: completion rate, difficulty, weak area, mistakes, child comments, and parent comments.
- [ ] Extract signed Student PDF and Parent Answer PDF actions, preserving 60-second signed URLs and actionable error messages.
- [ ] Build child switcher, child identity, feedback summary/form, and material history with loading, empty, success, and error states.
- [ ] Remove equivalent JSX/state from the monolithic `App.tsx` after the extracted components are connected.
- [ ] Add focused Vitest coverage for route-owned child selection and generation-summary parsing; run `pnpm test`, typecheck, lint, and build.
- [ ] Commit as `refactor: extract parent material workflows`.

### Task 3: Child-centric weekly dashboard

**Files:**
- Create: `apps/web/src/routes/DashboardPage.tsx`
- Create: `apps/web/src/components/dashboard/WeeklyLearningPanel.tsx`
- Create: `apps/web/src/components/dashboard/DeliveryStatus.tsx`
- Create: `apps/web/src/components/dashboard/PersonalizationSummary.tsx`
- Create: `apps/web/src/lib/delivery.ts`
- Create: `apps/web/src/lib/delivery.test.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles/components.css`

**Interfaces:**
- Produces `getDeliveryViewModel(child, latestMaterial, now)` returning parent-facing labels for feedback cutoff, next delivery, and material state.
- `DashboardPage` consumes the authenticated `Session` and uses `useParentData()` as its only orchestration hook.

- [ ] Implement zero-child onboarding CTA, one-child direct context, and multi-child switcher states.
- [ ] Make the first viewport show child, current week theme/focus, Student PDF, Parent Answer PDF, feedback action/cutoff, personalization summary, and next delivery.
- [ ] Derive friendly delivery copy from `next_generation_at`, material dates, and feedback state; never surface job status names.
- [ ] Show recent history below the weekly panel and keep all results filtered to the selected child.
- [ ] Verify delivery date boundaries with Vitest and manually verify 375px, tablet, and desktop layouts.
- [ ] Run `pnpm test`, typecheck, lint, and build; commit as `feat: add child-centric weekly dashboard`.

### Task 4: Six-step onboarding and editable learning profile

**Files:**
- Create: `apps/web/src/routes/ChildOnboardingPage.tsx`
- Create: `apps/web/src/routes/ChildProfilePage.tsx`
- Create: `apps/web/src/components/onboarding/OnboardingLayout.tsx`
- Create: `apps/web/src/components/onboarding/OnboardingProgress.tsx`
- Create: `apps/web/src/components/onboarding/steps/AboutStep.tsx`
- Create: `apps/web/src/components/onboarding/steps/LevelStep.tsx`
- Create: `apps/web/src/components/onboarding/steps/SchoolStep.tsx`
- Create: `apps/web/src/components/onboarding/steps/InterestsStep.tsx`
- Create: `apps/web/src/components/onboarding/steps/RoutineStep.tsx`
- Create: `apps/web/src/components/onboarding/steps/GoalsStep.tsx`
- Create: `apps/web/src/components/profile/ProfileSummary.tsx`
- Create: `apps/web/src/components/profile/ProfileSection.tsx`
- Create: `apps/web/src/lib/profile-form.ts`
- Create: `apps/web/src/lib/profile-form.test.ts`
- Create: `supabase/migrations/20260812_add_parent_onboarding_fields.sql`
- Modify: `apps/web/src/lib/children.ts`
- Modify: `apps/web/src/lib/child-profiles.ts`

**Interfaces:**
- Produces `ProfileDraft` with nickname, grade, four level fields, textbook/current chapter/upcoming test, interests/dislikes, weekly minutes/session preference, goals/weaknesses/expectations/notes.
- Produces `validateProfileStep(step, draft)` and local-session draft serialization keyed by child ID.

- [ ] Add only missing normalized fields needed by generation; retain flexible interests and session preferences in `child_profiles.preferences` JSONB and add matching constraints/RLS-safe grants in the migration.
- [ ] Implement create flow so the child and profile are saved together from the reviewed final step; recover gracefully if the profile upsert must be retried.
- [ ] Implement one decision group per step, `Step X of 6`, Back/Continue, blur validation, optional labels, and session-local draft persistence.
- [ ] Implement the profile summary/edit route and explicitly state that changes apply only to future materials.
- [ ] Verify validation/serialization with Vitest, apply the migration locally, run database smoke tests, then run full typecheck/lint/build.
- [ ] Commit as `feat: add child learning profile onboarding`.

### Task 5: Public landing, learning guide, and founder trust pages

**Files:**
- Create: `apps/web/src/routes/LandingPage.tsx`
- Create: `apps/web/src/routes/AboutPage.tsx`
- Create: `apps/web/src/routes/GuidePage.tsx`
- Create: `apps/web/src/components/auth/AuthPanel.tsx`
- Create: `apps/web/src/components/public/FounderSummary.tsx`
- Create: `apps/web/src/components/public/FounderProfile.tsx`
- Create: `apps/web/src/components/public/PricingSection.tsx`
- Create: `apps/web/src/components/public/CapacityStatus.tsx`
- Create: `apps/web/src/content/site.ts`
- Create: `apps/web/public/founder/.gitkeep`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- `site.ts` exports centralized pricing, capacity, contact, founder, and marketing copy; unverified founder claims and media remain unpublished through an explicit `isPublished` flag.
- `AuthPanel` preserves `signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })`.

- [ ] Build the landing page in the approved eleven-section order with a free Week 1 CTA and inline authentication.
- [ ] Explain paper-first study, responsible optional AI use, full per-child personalization, feedback improvement, parent effort, and progress continuity in concrete language.
- [ ] Build `/guide` as a concise printable-friendly learning sequence rather than a marketing duplicate.
- [ ] Build `/about` with safe placeholders hidden from public output until portrait, redacted CAP evidence, verified biography, website, and contact email are supplied.
- [ ] Add metadata, semantic heading order, descriptive alt text hooks, and responsive public navigation.
- [ ] Run typecheck, lint, build, and a manual anonymous-route/OTP smoke test; commit as `feat: add public product and founder pages`.

### Task 6: Real capacity, waitlist, and subscription settings

**Files:**
- Create: `apps/web/src/lib/enrollment.ts`
- Create: `apps/web/src/lib/subscriptions.ts`
- Create: `apps/web/src/routes/WaitlistPage.tsx`
- Create: `apps/web/src/routes/BillingPage.tsx`
- Create: `apps/web/src/components/billing/ChildSubscription.tsx`
- Create: `supabase/migrations/20260812_expose_safe_capacity_state.sql`
- Modify: `apps/web/src/components/public/CapacityStatus.tsx`
- Modify: `apps/web/src/components/public/PricingSection.tsx`

**Interfaces:**
- Produces `EnrollmentState = { status; capacity; activeCount; remaining; foundingLimit }` from a security-definer RPC exposing aggregate counts only.
- Produces read-only `SubscriptionView` per owned child; provider mutations remain disabled until the server-verified billing integration exists.

- [ ] Add an anonymous-safe aggregate capacity RPC that counts eligible active children without exposing child rows or parent identities.
- [ ] Replace static capacity copy with real open/waitlist/closed states and route full-capacity visitors to `/waitlist`.
- [ ] Show trial, active, past-due, and cancellation state grouped per child on `/billing` using plain parent-facing language.
- [ ] Keep checkout, webhook, cancellation mutation, and provider authority out of the browser until Paddle configuration is validated.
- [ ] Run database smoke tests plus frontend tests/typecheck/lint/build; commit as `feat: add capacity and subscription views`.

### Task 7: Hosted routing, accessibility, and regression verification

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/public/404.html`
- Modify: `scripts/test-e2e.mjs`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**
- GitHub Pages must redirect deep links back into the SPA while preserving the requested pathname.
- E2E must cover login bootstrap, child isolation, both downloads, profile update, feedback submission, and anonymous public routes.

- [ ] Add the GitHub Pages SPA fallback and confirm asset base paths work at the repository subpath.
- [ ] Extend hosted/local E2E fixtures to cover zero, one, and multiple children without committing private data or PDFs.
- [ ] Keyboard-test navigation, dialogs, onboarding, child switching, downloads, and feedback; confirm visible focus and first-invalid-field focus.
- [ ] Check 200% zoom, reduced motion, 375px layout, empty/error/loading states, and founder evidence accessibility.
- [ ] Run `pnpm test`, `pnpm test:db`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`.
- [ ] Update repository commands and frontend structure documentation; commit as `chore: verify redesigned parent portal` and push `main`.

## Self-Review

- Spec coverage: all visual, navigation, dashboard, onboarding, public, founder, pricing, capacity, billing-readiness, security, accessibility, and Pages-routing requirements map to Tasks 1–7.
- Deferred intentionally: payment-provider mutations are excluded until Paddle credentials/webhooks are validated; founder claims/media stay unpublished until the founder supplies and approves them.
- Placeholder scan: no implementation step depends on unspecified error handling or unnamed tests; unpublished founder content is an explicit safe product state, not an engineering placeholder.
- Type consistency: child context flows from `useParentData`; profile data uses `ProfileDraft`; capacity uses `EnrollmentState`; material actions continue using the existing signed-download boundary.
