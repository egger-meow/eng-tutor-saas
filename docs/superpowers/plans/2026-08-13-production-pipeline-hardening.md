# Production Curriculum Pipeline Hardening Implementation Plan

> **For agentic workers:** Execute these tasks in order. Tests are added after direct implementation per repository policy; do not use TDD.

**Goal:** Make `complete-v2` fail closed on curriculum quality, reject corrupt or semantically unsafe PDFs, and recover safely from partial or ambiguous Supabase Storage completion.

**Architecture:** Keep one validated canonical `CurriculumPackage` as the source for deterministic Student and Parent projections. Add repository-owned gates at the worker boundary: deterministic curriculum audit, PDF inspection derived from the canonical question/answer contract, and immutable create-or-verify storage writes. Database completion remains the final transactional step.

**Tech Stack:** TypeScript, Vitest, Playwright/Chromium, PDF.js, Supabase Storage.

## Global Constraints

- Preserve `canonical package -> Student PDF + Parent Answer PDF`.
- Never expose server secrets or persist real child data in Git.
- Released material is immutable; retries may verify an identical existing artifact but may not silently replace it.
- Quality rejection happens before storage; technical failures remain inspectable and retryable.
- Generated PDFs stay under git-ignored `output/pdf/`.

---

### Task 1: Deterministic production publish gate

**Files:**
- Modify: `packages/worker/src/pipeline.ts`
- Test: `packages/worker/src/pipeline.test.ts`

- [x] Import and run `auditCurriculumPackage()` after schema validation and context matching.
- [x] Reject every critical audit finding before rendering or touching Storage, with stable `QUALITY_REJECTED` semantics.
- [x] Verify a valid package proceeds and a critical audit failure performs zero storage calls.

### Task 2: PDF artifact integrity and pair contract

**Files:**
- Create: `packages/pdf/src/inspect-pdf.ts`
- Modify: `packages/pdf/src/render-pdf.ts`
- Modify: `packages/pdf/src/render-curriculum-pair.ts`
- Modify: `packages/pdf/src/index.ts`
- Modify: `packages/pdf/package.json`
- Test: `packages/pdf/src/inspect-pdf.test.ts`

- [x] Add PDF.js parsing for page count and per-page extracted text.
- [x] Reject malformed PDFs, zero/blank pages, unreasonable page counts, missing Student lesson markers, missing Parent answer coverage, and Student answer-section leakage.
- [x] Validate the two artifacts against canonical question IDs and answer-section labels rather than trusting `%PDF` bytes.
- [x] Render both projections inside one Chromium browser lifecycle and always close pages/browser.
- [x] Verify focused PDF tests and real synthetic rendering.

### Task 3: Immutable create-or-verify Storage writes

**Files:**
- Modify: `packages/worker/src/pipeline.ts`
- Modify: `packages/worker/src/client.ts`
- Create: `supabase/migrations/20260813155216_add_completed_generation_recovery_context.sql`
- Create: `supabase/migrations/20260813155935_make_curriculum_observations_idempotent.sql`
- Create: `supabase/migrations/20260813160444_backfill_recorded_curriculum_observations.sql`
- Modify: `supabase/tests/smoke.sql`
- Test: `packages/worker/src/pipeline.test.ts`

- [x] Extend the worker Storage interface with private-object download.
- [x] Upload each fixed job artifact with `upsert: false`; when an object exists, download and inspect it against the canonical pair (raw Chromium bytes are not stable across renders).
- [x] Never pre-delete artifacts. On a newly-created partial pair failure, remove only artifacts created by that attempt.
- [x] Preserve both artifacts after an ambiguous completion RPC error so a retry can verify and reuse them.
- [x] Reject an existing object that fails canonical pair inspection, preserving evidence instead of overwriting it.
- [x] Permit the same worker to recover minimal context after the completion transaction committed but its response was lost.
- [x] Make observation write-back once-only by committed `material_id`, even across repeated recovery attempts.

### Task 4: `complete-v2` failure and retry matrix

**Files:**
- Modify: `packages/worker/src/pipeline.test.ts`

- [x] Cover render rejection, first upload failure, second upload failure cleanup, inspected existing artifacts, conflicting existing artifacts, completion RPC transport ambiguity, observation-write warning, and rerun completion.
- [x] Confirm fail RPC is called only before completion starts and cleanup never deletes pre-existing artifacts.

### Task 5: Production verification and documentation

**Files:**
- Modify only if behavior documentation needs synchronization: `docs/chatgpt-work-daily-schedule.md`

- [x] Run focused generator/PDF/worker tests.
- [x] Run `pnpm lint`, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- [x] Run `pnpm generate:synthetic` and the curriculum sample, inspect PDF metadata/text, render every page to PNG, and visually review Student and Parent outputs.
- [x] Verify the working tree contains no generated child artifacts or secrets.
- [ ] Commit and push the coherent hardening change.
