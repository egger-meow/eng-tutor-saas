# Week 1 Fast Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an eligible first child enter a near-real-time Week 1 authoring fast lane, publish immediately without the normal independent Finisher semantic gate, and show parents a lively five-stage progress UI backed by authoritative database state.

**Architecture:** Preserve the explicit `generation_jobs` queue and immutable curriculum submission bridge. Add server-owned Week 1 wake/publish outboxes, a dedicated `chatgpt-week1-fast` claim path, payload-free GitHub doorbells, a dedicated fast publisher that keeps structural/render/storage/identity integrity but does not call `auditCurriculumPackageForFinisher()`, and parent-safe progress projections for both pre-auth landing and authenticated dashboard views. Week 2+ stays on the existing Author → Submission → deterministic Finisher path.

**Tech Stack:** Supabase Postgres + RLS/RPC, Supabase Edge Functions (Deno), GitHub Actions, TypeScript worker packages, React/Vite, Vitest, Playwright PDF renderer.

**Spec:** `docs/superpowers/specs/2026-09-05-week1-fast-lane-design.md`

## Global Constraints

- Dedicated Week 1 authoring worker identity is exactly `chatgpt-week1-fast`.
- Fast Lane eligibility is first canonical packet only: `source_material_id IS NULL` and no completed material already exists for the child/job.
- GitHub is a doorbell only; no Email, child name, school, grade, interests, profile text, feedback, canonical source, or generation context enters GitHub comments/dispatch payloads.
- Week 1 authoring still performs research → plan → author → critic → targeted repair → pre-submit validation → immutable submission → read-after-write verification.
- Week 1 Fast Publisher must not call `auditCurriculumPackageForFinisher()` and must not run a second semantic Critic.
- Fast Publisher must fail closed on corrupt schema/relationships, package-job-child identity mismatch, release mismatch, broken PDF render/inspection, wrong artifact paths, storage failure, or completion lease failure.
- Week 2+ remains unchanged and continues through the normal Finisher.
- Parent progress uses only `received | queued | authoring | publishing | ready`; no fabricated numeric percentage.
- Anonymous progress access uses a random short-lived single-purpose token stored hashed server-side; it cannot authenticate, reveal private profile data, or download PDFs.
- Remove parent-facing Week 1 next-day promises. Copy becomes truthful immediate-start language with progress-state fallback.
- Preserve all existing ownership, RLS, privacy, idempotency, immutable-attempt, release cadence, and historical-material invariants.
- New migrations are forward-only. Do not edit historical migrations.
- New/changed Edge Functions must be deployed to production only after code/test review and migration deployment.

---

### Task 1: Database fast-lane state, outboxes, safe progress, and dedicated claims

**Files:**
- Create: `supabase/migrations/20260905220000_week1_fast_lane.sql`
- Modify: `supabase/tests/smoke.sql`

**Interfaces:**
- Produces `private_generation.week1_wake_outbox(job_id uuid unique, status, attempt_count, ...)`.
- Produces `private_generation.week1_publish_outbox(job_id uuid, authoring_attempt integer, status, attempt_count, ..., unique(job_id, authoring_attempt))`.
- Produces hashed pre-auth progress-token storage linked to exactly one first-child Week 1 job.
- Produces `public.worker_start_week1_fast_batch(worker_id text)` that accepts only `chatgpt-week1-fast` and atomically claims only eligible Week 1 jobs without stealing live leases.
- Produces `public.worker_recover_week1_fast_batch(worker_id text)` for recovery without another claim.
- Produces service-only outbox claim/mark RPCs for wake and publish dispatch.
- Produces authenticated parent-safe progress RPC returning only `stage`, `stage_updated_at`, `ready`, and authorized `material_id`.
- Produces service-only token issuance and token-to-safe-progress lookup functions for the Edge Function.
- Produces dedicated fast-publisher submission claim/finalization RPCs, with idempotent completion and explicit `week1_fast` publication provenance.

- [ ] **Step 1: Add smoke assertions before the migration implementation**

Add assertions proving:

```sql
-- Browser roles cannot read either outbox/progress-token table.
-- anon/authenticated cannot execute service-only fast claim/complete functions.
-- worker_start_week1_fast_batch rejects any worker ID except chatgpt-week1-fast.
-- a Week 2 job with source_material_id IS NOT NULL is never returned by the fast claim.
-- a live lease owned by another worker is never stolen.
-- repeated fast-start by the same worker recovers rather than increments attempt_count twice.
-- safe progress never returns claimed_by, error_message, canonical_source, Email, profile fields, or worker identifiers.
-- completion is idempotent and schedules/reanchors Week 2 from actual Week 1 release.
```

- [ ] **Step 2: Run DB smoke and verify the new contract fails before implementation**

Run: `pnpm test:db`

Expected: FAIL because Week 1 Fast Lane tables/RPCs do not exist.

- [ ] **Step 3: Implement the forward-only migration**

The migration must:

```sql
create table private_generation.week1_wake_outbox (...);
create table private_generation.week1_publish_outbox (...);
create table private_generation.week1_progress_tokens (... token_hash text unique ... expires_at timestamptz ...);
```

Add status CHECK constraints, attempt bounds, timestamps, unique keys, indexes for pending dispatch, and full revokes from `PUBLIC`, `anon`, `authenticated`.

Fast claim eligibility must be DB-authoritative and equivalent to:

```sql
job.source_material_id is null
and job.status in ('pending','claimed')
and job.material_id is null
and not exists (select 1 from public.materials m where m.child_id = job.child_id)
```

plus existing entitlement/release/lease rules. It must share the existing authoring advisory-lock/collision model rather than invent a parallel lease system.

Insert the wake outbox row idempotently when an eligible initial job is created/admitted. Do not perform an external GitHub call inside the transaction.

When a fast-worker immutable submission becomes current and pending, insert the publish outbox row idempotently.

Public progress projection mapping:

```text
ready      = completed generation_job + material_id
publishing = current curriculum_submission pending/processing OR fast publisher lease
 authoring = live claimed Week 1 job with no current publish-stage submission
queued     = pending Week 1 job
received   = admitted first-child activation before/while initial job becomes visible
```

- [ ] **Step 4: Run DB smoke and verify it passes**

Run: `pnpm test:db`

Expected: PASS, including new Fast Lane ACL/idempotency/progress tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260905220000_week1_fast_lane.sql supabase/tests/smoke.sql
git commit -m "feat(db): add Week 1 fast lane contracts"
```

---

### Task 2: Landing activation returns a short-lived progress token and queues wake work

**Files:**
- Modify: `supabase/functions/_shared/landing-onboarding-start.ts`
- Modify: `supabase/functions/start-landing-onboarding/index.ts`
- Create: `supabase/functions/week1-progress/index.ts`
- Modify: related Edge/onboarding unit tests under `supabase/functions/**` and `apps/web/src/lib/landing-onboarding-start.test.ts`

**Interfaces:**
- `startLandingOnboarding(...)` returns `{ status, progressToken?: string }` for newly accepted first-child activation; waitlist and existing-account paths may omit it.
- `week1-progress` accepts only the opaque progress token and returns `{ stage, stageUpdatedAt, ready }`, plus no private identifiers before authentication.

- [ ] **Step 1: Write failing tests for the new response and privacy boundary**

Tests must prove:

```ts
expect(result.status).toBe('accepted')
expect(result.progressToken).toMatch(/^[A-Za-z0-9_-]{40,}$/)
```

and the public progress endpoint response must not contain Email, child name, `jobId`, `claimedBy`, `errorMessage`, model/prompt identifiers, or canonical source.

- [ ] **Step 2: Run focused tests and verify RED**

Run the existing Vitest command scoped to landing onboarding / Edge source-contract tests.

Expected: FAIL because activation currently returns only `{ status }`.

- [ ] **Step 3: Extend trusted activation handling**

`activate_landing_onboarding` output is read after successful Auth dispatch. The Edge Function calls the service-only DB token-issuance RPC only when activation corresponds to a provisioned accepted first child with a Week 1 job. The raw token is returned once to the same browser response; only its hash is stored server-side.

Do not put the progress token into the Magic Link URL. Do not persist it in analytics.

- [ ] **Step 4: Implement `week1-progress` Edge Function**

Behavior:

```text
POST { token }
→ validate shape/length
→ service-role call token-safe-progress RPC
→ 200 sanitized projection
→ 404/410 style generic invalid/expired response without account-existence disclosure
```

CORS/origin policy should match the public web origins already allowlisted for landing onboarding. All responses use `cache-control: no-store`.

- [ ] **Step 5: Run focused tests and verify GREEN**

- [ ] **Step 6: Commit**

```bash
git add supabase/functions apps/web/src/lib/landing-onboarding-start.test.ts
git commit -m "feat(onboarding): expose safe Week 1 progress token"
```

---

### Task 3: Payload-free GitHub wake dispatcher and dedicated Week 1 authoring bridge

**Files:**
- Create: `supabase/functions/week1-fast-dispatch/index.ts`
- Modify: `supabase/functions/authoring-bridge/index.ts`
- Modify/Create: `packages/worker/src/authoring-bridge-contract.test.ts` and source-contract tests for dispatch privacy
- Modify: `docs/production-authoring.md`

**Interfaces:**
- New authoring bridge routes:
  - `POST /week1/start` → `worker_start_week1_fast_batch('chatgpt-week1-fast')`
  - `GET /week1/batch` → recovery only
  - existing `/submit`, `/status`, `/release` resolve `chatgpt-week1-fast` when the claimed job belongs to that worker.
- `week1-fast-dispatch` claims pending wake/publish outbox rows and sends payload-free doorbells.

- [ ] **Step 1: Write failing bridge/dispatch contract tests**

Tests assert exact pinned identity:

```ts
export const PINNED_WEEK1_FAST_WORKER_ID = 'chatgpt-week1-fast'
```

and assert dispatch source never serializes job IDs, Email, child IDs, profile fields, or canonical source into GitHub request bodies.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement Week 1 bridge start/recover/identity resolution**

Normal `/start` behavior must remain unchanged. Week 1 routes are explicit, single-purpose, and cannot claim Week 2+ jobs.

- [ ] **Step 4: Implement dispatcher**

Wake doorbell:

```text
GitHub PR issue-comment body: week1-wake:v1:<opaque-outbox-event-id>
```

The event ID is the outbox row ID, not child/job identity.

Publish doorbell:

```text
repository_dispatch event_type = week1-fast-publish
client_payload = {}
```

No job identity is required because the workflow claims authoritative pending fast submissions from Supabase.

Use server-only secrets such as `GITHUB_WEEK1_TOKEN`, `GITHUB_REPO`, and `GITHUB_WEEK1_WAKE_PR_NUMBER`. Missing configuration marks dispatch as retryable failure and never rolls back onboarding/submission.

- [ ] **Step 5: Run focused tests and verify GREEN**

- [ ] **Step 6: Commit**

```bash
git add supabase/functions packages/worker/src/authoring-bridge-contract.test.ts docs/production-authoring.md
git commit -m "feat(authoring): add Week 1 event-driven bridge"
```

---

### Task 4: Week 1 Fast Publisher without normal Finisher semantic audit

**Files:**
- Create: `packages/worker/src/week1-fast-publisher.ts`
- Create: `packages/worker/src/week1-fast-publisher.test.ts`
- Modify: `packages/worker/src/cli.ts`
- Create: `.github/workflows/publish-week1-fast.yml`
- Modify: any worker exports/package scripts required by the existing CLI architecture

**Interfaces:**
- `processWeek1FastSubmissions(client, processorId, claimLimit)` claims only dedicated Week 1 fast submissions.
- Uses `validateCurriculumPackageForFinisher()` or an extracted **objective integrity-only** validator for schema/relationship checks, but never calls `auditCurriculumPackageForFinisher()`.
- Uses existing deterministic `renderCurriculumPackageBytes` and `inspectCurriculumPdfPair`.
- Completes through `worker_complete_week1_fast_submission`.

- [ ] **Step 1: Write failing publisher tests**

Tests must prove:

```ts
// eligible Week 1 submission renders, inspects, uploads, completes
// Week 2 submission is rejected/not claimable
// render failure records technical failure and does not create material
// identity mismatch fails closed
// repeated invocation is idempotent
// source module does NOT import or call auditCurriculumPackageForFinisher
```

- [ ] **Step 2: Run focused worker tests and verify RED**

- [ ] **Step 3: Implement objective Fast Publisher**

Reuse deterministic rendering/storage helpers where practical, but do not route through `completeCurriculumJob()` if that function necessarily invokes the normal Finisher audit. Extract shared render/upload/idempotency primitives instead of copying a second divergent PDF pipeline.

Fast publisher checks retain:

```text
schema + required relationships
job/package/child/release identity
canonical artifact path
PDF render
PDF pair inspection
private upload/recovery
transactional completion
```

They omit:

```text
auditCurriculumPackageForFinisher
second semantic Critic
pedagogical warning gates
normal Finisher retry/soft-quality-override semantics
```

- [ ] **Step 4: Add CLI command**

Example:

```bash
pnpm worker publish-week1-fast --processor github-actions-week1-fast --limit 5
```

- [ ] **Step 5: Add GitHub Actions workflow**

Trigger on `repository_dispatch` event type `week1-fast-publish` and manual recovery. Validate `SUPABASE_URL`/`SUPABASE_SECRET_KEY`, install/cached PDF fonts/Chromium following the existing Finisher workflow, then run the dedicated command.

Concurrency is one workflow-level publisher lock or DB leases; never cancel an in-progress publisher.

- [ ] **Step 6: Run worker tests/typecheck and verify GREEN**

- [ ] **Step 7: Commit**

```bash
git add packages/worker .github/workflows/publish-week1-fast.yml
git commit -m "feat(worker): publish Week 1 through fast lane"
```

---

### Task 5: Animated parent-safe Week 1 live progress UI

**Files:**
- Create: `apps/web/src/lib/week1-progress.ts`
- Create: `apps/web/src/components/materials/Week1FastProgress.tsx`
- Create: `apps/web/src/components/materials/Week1FastProgress.test.tsx`
- Modify: `apps/web/src/components/auth/LandingOnboardingPanel.tsx`
- Modify: `apps/web/src/components/auth/LandingOnboardingPanel.test.tsx`
- Modify: `apps/web/src/hooks/use-parent-data.ts`
- Modify: `apps/web/src/lib/materials.ts`
- Modify: `apps/web/src/components/dashboard/ChildCard.tsx`
- Modify: `apps/web/src/styles/beta-trust-ux.css`

**Interfaces:**
- `Week1ProgressStage = 'received' | 'queued' | 'authoring' | 'publishing' | 'ready'`.
- Pre-auth polling uses the session-stored progress token and `week1-progress` Edge Function.
- Authenticated polling uses the parent-owned progress RPC and normal session/RLS.
- Poll interval while active: 2–4 seconds with one in-flight request at a time; stop polling on `ready`, waitlist, unmount, hidden/long-idle state, or terminal generic failure.

- [ ] **Step 1: Write failing component/model tests**

Tests assert the exact five parent labels:

```text
資料已收到
已排入教材製作
正在製作內容
品質檢查與排版
教材可以下載
```

Tests prove only the current active step animates, completed steps render ✓, reduced-motion users receive a static but clear active indicator, and no numeric percentage is rendered.

- [ ] **Step 2: Run focused web tests and verify RED**

- [ ] **Step 3: Implement progress client and polling**

Store the pre-auth token in `sessionStorage` under a narrowly named key and clear it after authenticated binding/ready/expiry. Network failures preserve the last known state and show calm copy instead of raw errors.

- [ ] **Step 4: Implement `Week1FastProgress`**

Visual behavior:

- completed rows: check icon + settled connector;
- active row: CSS spinner/ring + subtle breathing/shimmer on the card/connector;
- future rows: muted dots;
- ready row: visually resolves into download-ready success;
- `@media (prefers-reduced-motion: reduce)` disables rotation/shimmer.

Do not add Framer Motion solely for this feature if the current web package does not already depend on it. CSS is sufficient.

- [ ] **Step 5: Mount it in landing success and authenticated child card**

Waitlisted children never display fake production stages. Existing-account auth-first path does not pretend a child/job was provisioned.

- [ ] **Step 6: Run focused tests and verify GREEN**

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): show live Week 1 production progress"
```

---

### Task 6: Remove Week 1 next-day promises and update product/SPEC contract

**Files:**
- Modify: `apps/web/src/routes/LandingPage.tsx`
- Modify: `apps/web/src/routes/LandingPage.test.tsx`
- Modify: `apps/web/src/lib/delivery.ts`
- Modify: `apps/web/src/lib/delivery.test.ts`
- Modify: all parent-facing files found by repository search for Week 1 `隔天`, `明天`, and stale first-material date promises
- Modify: `docs/SPEC.md`
- Modify: `docs/production-authoring.md`
- Modify: `docs/chatgpt-work-daily-schedule.md` if it currently claims all first packets wait for the daily schedule/normal Finisher
- Modify: `docs/SPEC-TOC.md` only if headings are renamed/added; otherwise keep numbering stable

**Interfaces:**
- Landing FAQ answer becomes equivalent to: `名額開放時，完成孩子資料後會立即開始製作第一份專屬教材；完成後直接開放下載。若目前額滿，會先進入候補且不收費。`
- Pre-Week1 delivery model no longer promotes the original next-day `release_at` as the primary parent promise. It shows Fast Lane progress/preparation state until material completion.

- [ ] **Step 1: Add/modify tests that forbid obsolete Week 1 timing claims**

Search-contract tests should reject parent-facing phrases that promise next-day Week 1 delivery while allowing sample-duration text such as `預計 94 分鐘`.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Update UI copy and delivery view model**

Do not alter Week 2+ seven-day cadence/date surfaces.

- [ ] **Step 4: Update SPEC sections 116, 117, 121, 126, 158, 172, 193, 199, 205, 206 and adjacent text as required**

The contract must state explicitly:

```text
Week 1 Fast Lane is the sole publication-path exception.
Author/Critic + pre-submit validation remain mandatory.
Week 1 skips the independent normal Finisher semantic/audit gate.
Fast Publisher performs only non-bypassable publication integrity, deterministic PDF rendering/inspection, private upload, and atomic completion.
Week 2+ remains normal Author → Submission → Finisher.
```

Remove statements that incorrectly say the deterministic Finisher alone always renders/uploads every production packet.

- [ ] **Step 5: Run relevant tests and verify GREEN**

- [ ] **Step 6: Commit**

```bash
git add apps/web docs
git commit -m "docs: make Week 1 immediate fast lane authoritative"
```

---

### Task 7: End-to-end contracts, fallback, and full verification

**Files:**
- Create/Modify source-contract tests under `scripts/` for cross-layer Fast Lane invariants
- Modify CI only if a new deterministic check must be added; do not weaken existing CI

**Interfaces:**
- One source-contract test proves the whole intended wiring without production credentials:

```text
activation → wake outbox
week1 bridge → chatgpt-week1-fast claim
fast submission → publish outbox
payload-free dispatch → fast workflow
fast workflow → dedicated publisher
publisher → dedicated atomic completion
web → safe five-stage progress
Week 2+ → unchanged normal Finisher
```

- [ ] **Step 1: Write the cross-layer regression test**

Explicitly fail if:

```text
week1 fast publisher imports auditCurriculumPackageForFinisher
publish dispatch contains job/child/package payload
browser can execute service-only Fast Lane RPC
Week 2+ can enter fast claim/publisher
landing still promises first material next day
```

- [ ] **Step 2: Run full verification**

Run in this order:

```bash
pnpm lint
pnpm test
pnpm test:db
pnpm typecheck
pnpm build
```

Expected: all PASS.

- [ ] **Step 3: Review the final diff against the design**

Check specifically for accidental weakening of privacy/RLS, normal Finisher behavior, Week 2 cadence, existing retry semantics, and no new model API dependency.

- [ ] **Step 4: Commit any final test-only corrections**

```bash
git commit -m "test: lock Week 1 fast lane boundaries"
```

---

### Task 8: Production rollout and live proof

**Files/Systems:**
- GitHub PR from implementation branch to `main`
- Supabase production project `ykzszjrqynrhgdhoeovo`
- GitHub Actions production deployment
- ChatGPT Work GitHub-PR webhook task configuration

**Interfaces:**
- Production database migration first.
- Deploy `start-landing-onboarding`, `week1-progress`, `week1-fast-dispatch`, and changed `authoring-bridge` Edge Functions after migration.
- Configure server-side GitHub credential/env without exposing it to the web bundle.
- Create/retain one permanent operational wake PR; configure ChatGPT Work to react only to its new comment activity and execute the repo’s Week 1 Fast Lane authoring contract.

- [ ] **Step 1: Open implementation PR and require green CI**

Do not merge with failing lint/test/typecheck/build or failing DB smoke.

- [ ] **Step 2: Apply pending migration chain to production and verify migration history**

- [ ] **Step 3: Deploy changed/new Edge Functions and verify their deployed revisions**

- [ ] **Step 4: Configure wake PR + ChatGPT Work event task**

The Work task instruction must tell the agent to:

```text
read AGENTS.md + current production-authoring bundle
use only /week1/start or /week1/batch
process all claimed Week 1 contexts
research/plan/author/critic/repair/validate/submit/read-after-write
stop after confirmed submission
never run normal Finisher
never trust GitHub comment as job data
```

- [ ] **Step 5: Merge only after production prerequisites are ready**

- [ ] **Step 6: Verify production web deployment**

Confirm main SHA, CI verify success, Cloudflare deploy success, and parent-facing immediate Week 1 copy.

- [ ] **Step 7: Run one controlled non-real-child smoke if the repository’s existing internal-test entitlement path permits it**

Verify real state transitions:

```text
queued → authoring → publishing → ready
```

and verify Week 2 is created on the normal path. Do not use or invent real child data for testing.
