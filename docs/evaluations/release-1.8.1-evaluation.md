# Release 1.8.1 Comprehensive Release Evaluation

> **Release**: `rel_1.8.1`  
> **Engine Version**: `1.8.1`  
> **Prompt Version**: `2.13.1`  
> **Bundle Version**: `2.13.1-prod`  
> **Worker Version**: `1.7.1`  
> **Curriculum Schema**: `2.5.0` (strictly preserved without bump)  
> **PDF Renderer**: `1.5.0` (strictly preserved without bump)  
> **Date**: `2026-09-06`  
> **Evaluation Status**: **PASSED** (100% test pass rate, verified authentic context compaction, verified RPC lease security and history isolation)

---

## 1. Executive Summary

Release 1.8.1 delivers the Commander Review corrections on top of baseline `587a16b`, addressing runtime integration gaps, database security invariants, prompt version freezing, and authentic reproducible benchmarking:

1. **Targeted Student History RPC Integrity**:
   - Corrected `public.worker_fetch_targeted_student_history` and `private_generation.fetch_targeted_student_history` via Migration `20260906230000`.
   - Removed caller-trusted `child_id`; derived strictly from active job lease, verifying matching worker lease and claim snapshot authority.
   - Enforced immutable cutoff (`observed_at <= cutoffTimestamp`) preventing future evidence leakage.
   - Validated tenant isolation and rollback transactions in `supabase/tests/smoke.sql`.

2. **Format Planning Capsule & Runtime Delivery**:
   - Fixed the window ordering in `packages/generator/src/curriculum-maps/format-planning-capsule.ts` to sort newest-first before taking the lookback slice.
   - Added automatic runtime injection in `packages/worker/src/authoring-context.ts` so the `formatPlanningCapsule` is attached to prompt presentation context.

3. **Authentic Context Compaction**:
   - Retracted legacy modeled estimates (which assumed a fictional 98,000-character routing index).
   - Replaced with authentic measurements: Base bundle is 83,259 chars (83,559 bytes); monolithic bundle with 17,116-char routing table was 100,208 chars (100,508 bytes).
   - Across 8 realistic benchmark scenarios, context compaction delivers an authentic net savings of 292,392 characters (~73,098 estimated tokens).

4. **Version Contract & Prompt Succession**:
   - Prompts `2.13.0` are frozen byte-for-byte in tests.
   - Prompts `2.13.1` are consolidated and compiled into `packages/generator/bundles/production-authoring-bundle.md` (`2.13.1-prod`).

---

## 2. Core Pillars & Implementation Verification

### Pillar 1: Targeted History RPC Integrity & DB Smoke Verification
- Migration `20260906230000_advance_generation_release_to_1_8_1_and_tighten_history_rpc.sql`:
  - Enforces active lease requirement on `generation_jobs`.
  - Rejects unowned, expired, or worker-mismatched claim snapshots.
  - Derives `child_id` strictly from the server record.
  - Applies SHA-256 manifest hashing over retrieved evidence rows.
- Verified in `supabase/tests/smoke.sql`:
  - Validates `worker_fetch_targeted_student_history` under authentic tenant isolation.
  - Tests Week 1 Fast Publisher path (`worker_claim_week1_fast_submissions` / `worker_complete_week1_fast_submission`).
  - Confirms Week 2+ generation job creation and feedback prerequisites.
  - `pnpm test:db` passes with complete transactional rollback.

### Pillar 2: Format Planning Capsule Runtime Delivery
- `packages/generator/src/curriculum-maps/format-planning-capsule.ts`:
  - Normalizes deliveries newest-first, then takes `[0, lookbackWeeks]`.
  - Accurately identifies `recentFormatUse` and `availableButRecentlyUnused`.
- `packages/worker/src/authoring-context.ts`:
  - `compactAuthoringContext` ensures `diversityCapsule.formatPlanningCapsule` is synthesized and passed to model prompts.
  - Unit tested in `authoring-context.test.ts`.

### Pillar 3: Authentic Compaction Benchmarking
- Evaluated via `packages/generator/scripts/run-context-compaction-benchmark.ts`:
  - All 8 scenarios measured against authentic compiled bundles and realistic history payloads.
  - Generates `docs/evaluations/release-1.8.1-compaction-benchmark.md` and `docs/evaluations/release-1.8.1-compaction-manifest.json`.
  - Average context reduction: **10.3%** across all generation stages.

---

## 3. Test Suite Verification Summary

| Package | Test Files | Total Tests | Status |
|---|:---:|:---:|:---:|
| Full Workspace (`pnpm test`) | 152 | 1,238 | **ALL PASSED (100%)** |
| Database Smoke (`pnpm test:db`) | 1 | 2 blocks | **ALL PASSED (ROLLBACK OK)** |
| Typecheck (`pnpm typecheck`) | 5 packages | - | **0 ERRORS** |
| Build (`pnpm build`) | 5 packages | - | **SUCCESSFUL** |

---

## 4. Invariants Preserved

- **Strict Real Data Rule**: Zero fabricated/mock data; real schema structures and authentic metrics throughout.
- **Curriculum Schema**: Strictly preserved at `2.5.0`.
- **PDF Renderer**: Strictly preserved at `1.5.0`.
- **Cloudflare SPA Route Boundary**: Preserved root-based SPA routing without repository prefixes.
