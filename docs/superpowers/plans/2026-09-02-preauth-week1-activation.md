# Pre-auth Week 1 Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For a genuinely first-time parent, make successful landing Email submission sufficient to provision the first child and enter the canonical Week 1 generation pipeline without waiting for the parent to click the Magic Link, while preserving returning-account safeguards, capacity authority, privacy, and existing material delivery.

**Architecture:** Keep the public landing questionnaire and private onboarding handoff, but move onboarding Email dispatch into one narrow public Supabase Edge Function. The Edge Function uses service-only database preparation to classify whether the Email existed before the Auth request, sends the existing Supabase Magic Link itself, then invokes a service-only idempotent activation helper. Brand-new accounts may be provisioned immediately after Auth accepts the passwordless request; any pre-existing Auth account remains pending until authenticated finalization. Child insertion continues to reuse the existing beta/capacity trigger and subscription-triggered explicit Week 1 job. Magic Link callback becomes ownership binding/cleanup for pre-provisioned first children and remains the explicit additional-child confirmation boundary for returning parents.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase Auth/PostgreSQL/RLS, Supabase Edge Functions (Deno + `@supabase/supabase-js`), existing generation jobs/Finisher/material-email pipeline, Admin React app.

**Design Spec:** `docs/superpowers/specs/2026-09-02-preauth-week1-activation-design.md`

**Relevant SPEC:** sections 17–21, 24, 26–33, 36, 44–45, 114–125, 133–151, 168–170, 172, 179, 192–199, 204–205, 210.

## Global Constraints

- New first-time acquisition threshold is intentionally `completed child draft + successfully requested Magic Link Email`; Magic Link click is not required to start Week 1.
- Any Email that already existed in `auth.users` before this onboarding request receives **no pre-auth account/child mutation**.
- Do not reveal account existence to the anonymous browser. Public Edge responses are only generic `accepted` or `waitlisted` (plus generic errors).
- Never trust the browser to assert that Auth dispatch succeeded. The Edge Function owns Auth dispatch and the activation call.
- Preserve one parent → many isolated children and one-child-one-subscription semantics.
- Preserve the canonical `children insert → beta/capacity trigger → subscription trigger → explicit generation_jobs` path. The new activation helper must not directly insert a Week 1 job.
- Preserve the real 100-child capacity gate and Founder allocation rules.
- Preserve private onboarding storage, token hashing, RLS/direct-grant restrictions, and PII-free analytics metadata.
- A retry after uncertain network failure must not reclassify the Auth user created by the same live onboarding as a returning account or create a duplicate child/subscription/job.
- The generic direct-login card remains ordinary Supabase passwordless login and is not routed through pre-auth child provisioning.
- Update `docs/SPEC.md` for intentional behavior changes; section titles/numbers do not change, so `SPEC-TOC.md` should not need edits.

---

### Task 1: Lock the new database lifecycle in RED tests

**Files:**
- Modify: `scripts/onboarding-handoff-security.test.ts`
- Modify: `supabase/tests/smoke.sql`

**Interfaces to prove:**
- service-only prepare helper, e.g. `public.prepare_landing_onboarding(...) returns text`
- service-only activation helper, e.g. `public.activate_landing_onboarding(text) returns jsonb`
- updated authenticated `finalize_pending_onboarding(text)` / confirm / discard semantics

- [x] **Step 1: Extend static security contract tests** to require pending columns equivalent to `account_existed_at_prepare`, `provisioned_child_id`, `preauth_started_at`, attribution fields; service-only EXECUTE for prepare/activate; no anon/auth direct table access; authenticated-only finalization/confirm/discard.
- [x] **Step 2: Add DB smoke cases** for brand-new pre-auth activation, retry idempotency, canonical beta + exactly one Week 1 job, capacity-full waitlist/no-job, pre-existing account no pre-auth child, pre-provisioned Magic Link finalization returning the same child, mismatched-email rejection, existing-parent confirm/discard.
- [x] **Step 3: Run targeted static tests / DB smoke if available** and confirm RED because the new lifecycle does not exist yet.

### Task 2: Implement the forward-only pre-auth activation migration

**Files:**
- Create: `supabase/migrations/20260902*_preauth_week1_activation.sql`

**Implementation contract:**
- Extend `private_generation.pending_onboardings` without exposing it.
- Preserve original account classification for an existing live pending Email on retries, so an Auth user created by a prior uncertain attempt does not become a false returning-account classification.
- Replace browser-executable pending creation with a service-only prepare helper.
- Prepare validates the same ProfileDraft/legal limits, creates/rotates an opaque token, records `account_existed_at_prepare`, and stores analytics attribution privately.
- Activation locks by token hash and is idempotent.
- `account_existed_at_prepare=true`: record server-authoritative `email_submit`, do not provision, return generic accepted state.
- New account: resolve the Auth user/profile created by Auth dispatch; create child, update `child_profiles`, apply legal acceptance, rely on existing capacity/beta + initial-job triggers, store `provisioned_child_id`, scrub the child draft immediately, record `email_submit`/`child_created`/`onboarding_complete` server-side.
- Determine response from authoritative subscription/waitlist/job state: `accepted` or `waitlisted`, without account-existence leakage.
- `finalize_pending_onboarding` binds an already-provisioned child to the matching authenticated Email and scrubs remaining pending Email; it must not create again.
- Pre-existing account with no active child may create its first child on authenticated finalization; active-child account still returns `ADDITIONAL_CHILD_CONFIRMATION_REQUIRED` until explicit confirm.

- [x] **Step 1: Implement only enough SQL to satisfy the RED contracts.**
- [x] **Step 2: Run targeted static tests and `pnpm test:db` (or the repo-supported DB smoke command).**
- [x] **Step 3: Verify GREEN and inspect the migration for lock order, privileges, idempotency, and trigger reuse.**
- [x] **Step 4: Commit the DB slice.**

### Task 3: Add trusted Edge Function orchestration

**Files:**
- Create: `supabase/functions/start-landing-onboarding/index.ts`
- Modify: `supabase/config.toml`
- Add focused function contract/unit test if repo test tooling supports pure helpers; otherwise add a source contract test under `scripts/`.

**Flow:**
1. Validate JSON shape, Email, allowed redirect origin, ProfileDraft envelope, and attribution lengths.
2. Service-role client calls prepare helper and receives raw opaque token.
3. Anon/public Auth client calls `signInWithOtp` with redirect URL carrying only `aid` + `onboarding` token.
4. If Auth dispatch fails, return generic failure and do not activate.
5. If Auth dispatch succeeds, service-role client calls activation helper.
6. Return only `{ status: 'accepted' }` or `{ status: 'waitlisted' }`.

**Security:**
- `verify_jwt=false` because this is a public landing entry.
- Never return whether the Email already existed.
- Allow production `https://paperbond.jjmowlab.com` and explicit local/test origins only; reject arbitrary redirect hosts.
- Do not log Email/profile payload.

- [x] **Step 1: Write a failing function/source contract** for prepare → Auth send → activate ordering, no activation on Auth error, generic response, and origin allowlist.
- [x] **Step 2: Run targeted test and verify RED.**
- [x] **Step 3: Implement the Edge Function and config entry.**
- [x] **Step 4: Run targeted test and TypeScript checks that cover Supabase functions.**
- [x] **Step 5: Commit the Edge slice.**

### Task 4: Move the landing final step to the Edge orchestration and new promise

**Files:**
- Create: `apps/web/src/lib/landing-onboarding-start.ts`
- Create: `apps/web/src/lib/landing-onboarding-start.test.ts`
- Modify: `apps/web/src/components/auth/LandingOnboardingPanel.tsx`
- Modify: `apps/web/src/lib/onboarding-handoff.ts`
- Modify: `apps/web/src/lib/onboarding-handoff.test.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/routes/LandingPage.test.tsx` or focused auth/onboarding tests

**Interfaces:**
- `startLandingOnboarding(email, draft): Promise<{status:'accepted'|'waitlisted'}>` invokes `functions.invoke('start-landing-onboarding')` with legal versions and first-party attribution.
- `onboarding-handoff.ts` keeps authenticated token finalization/confirmation/discard; public `createPendingOnboarding` is removed from browser code.

**UX copy:**
- heading: `最後留下 Email，第一週做好直接寄給你`
- description: child data is complete; after Email submission the system starts handling Week 1 and the finished material will be emailed.
- primary button: `開始準備第一週教材`
- accepted success: `完成了，第一週教材已開始準備` plus `教材完成後會直接寄到你的 Email，不需要一直留在網站上。`
- secure-login link/message is secondary only.
- waitlisted response uses truthful existing capacity/waitlist language and must not claim Week 1 is preparing.

**Analytics:**
- Remove browser `trackEmailSubmit` / landing `trackChildCreated` / landing `trackOnboardingComplete` emissions that would duplicate server-authoritative events.
- Keep `trackAuthComplete` as engagement and keep returning-parent branch events unless moved server-side deliberately.

- [x] **Step 1: Write RED tests** for Edge helper payload/result parsing, new copy/button, accepted/waitlisted states, and no direct `signInWithOtp` in landing onboarding.
- [x] **Step 2: Run targeted web tests and verify RED.**
- [x] **Step 3: Implement helper/component/App changes.**
- [x] **Step 4: Run targeted web tests and verify GREEN.**
- [x] **Step 5: Commit the web slice.**

### Task 5: Update the shared Magic Link template without adding another welcome-email system

**Files:**
- Modify: `supabase/templates/magic-link.html`
- Modify: `supabase/templates/auth-email-templates.test.ts`

**Contract:**
- Template works for both direct login and onboarding.
- It must not state that clicking the link is required to start Week 1.
- It may say the secure link lets the parent enter/manage the parent area; actual Week 1 delivery remains the existing material-release email pipeline.

- [x] **Step 1: Update template contract test first and verify RED.**
- [x] **Step 2: Update the template with dual-purpose wording.**
- [x] **Step 3: Run template tests and verify GREEN.**
- [x] **Step 4: Commit the email-copy slice.**

### Task 6: Make Admin acquisition funnel auth-optional

**Files:**
- Modify: `apps/admin/src/components/funnel/landing-first-funnel.ts`
- Modify: `apps/admin/src/components/funnel/landing-first-funnel.test.ts`
- Modify: `apps/admin/src/server/admin-service.funnel.test.ts`
- Modify: `apps/admin/src/server/admin-service.ts` only where sequential funnel normalization currently assumes auth
- Modify: `apps/admin/src/components/funnel/ConversionFunnelView.tsx`
- Modify: `apps/admin/src/client/types.ts` only if necessary for a secondary auth KPI

**Sequential acquisition order:**
`landing_view → sample_click → free_trial_click → child_form_start → email_submit → child_created → onboarding_complete`

**Secondary engagement:**
- `auth_complete` remains visible as a separate engagement/account-access metric but is not used in step-to-step acquisition conversion/dropoff.
- Existing-parent/additional-child branch remains separate and excluded from first-time acquisition.

- [x] **Step 1: Update normalization/service tests first and verify RED under the old 8-step funnel.**
- [x] **Step 2: Implement the 7-step acquisition order and secondary auth presentation.**
- [x] **Step 3: Run Admin targeted tests and verify GREEN.**
- [x] **Step 4: Commit the Admin slice.**

### Task 7: Update canonical SPEC to the approved lifecycle

**Files:**
- Modify: `docs/SPEC.md`

**Sections:**
- 24 Free Week 1
- 33 Authentication
- 44 Parent Onboarding
- 168 Analytics and Early Funnel
- 172 Operational Admin Needs
- 179 Testing Requirements
- 192 Definition of Done: Account
- 193 Definition of Done: First Material
- 198 Definition of Done: Security
- 145 only if clarification is required for notification/dashboard authority

- [x] **Step 1: Replace the old “Magic Link before child/job” contract with the approved pre-auth first-time activation semantics.**
- [x] **Step 2: Preserve returning-account explicit confirmation, material-email authority, capacity, RLS, and one-child-one-subscription rules.**
- [x] **Step 3: Self-review the SPEC for contradictions with Sections 17–21, 114, 138, 149, 204–205, 210.**
- [x] **Step 4: Commit the SPEC slice.**

### Task 8: Full verification, review, PR, merge, and production delivery

- [x] **Step 1: Run `pnpm lint`.** Expected PASS.
- [x] **Step 2: Run `pnpm test`.** Expected PASS.
- [x] **Step 3: Run `pnpm test:db`.** Expected PASS where local DB dependencies are available; otherwise rely on CI/production migration validation and report the exact limitation.
- [x] **Step 4: Run `pnpm typecheck`.** Expected PASS.
- [x] **Step 5: Run `pnpm build`.** Expected PASS.
- [x] **Step 6: Use verification-before-completion and requesting-code-review on the final branch diff. Fix only evidence-backed findings and rerun affected/full gates.**
- [ ] **Step 7: Open a non-draft PR from `design/preauth-week1-activation` to `main`, wait for CI, and merge only if the verified head is unchanged and green.**
- [ ] **Step 8: Apply the forward-only migration to production Supabase and verify remote migration history + RPC ACL/read-after-write behavior.**
- [ ] **Step 9: Deploy `start-landing-onboarding` Edge Function and verify its production deployment/config.**
- [ ] **Step 10: Verify post-merge main CI and Cloudflare production deploy success.**
- [ ] **Step 11: Perform safe production smoke checks that do not create an unintended real child; if a true new-Email E2E would consume capacity/generate material, report that as the remaining manual customer-like smoke unless an approved test account is available.**
