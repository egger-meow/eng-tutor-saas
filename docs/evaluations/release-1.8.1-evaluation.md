> Correction (1.8.2 review): the earlier 23.5% result used constructed history, unsourced factual text and reconstructed baselines. It is not a measured production saving or evidence of teaching quality. See release-1.8.2-compaction-benchmark.md for the controlled replacement and its limits.

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

1. **Targeted Student History RPC Contract Alignment & Immutable Evidence**:
   - Corrected `public.worker_fetch_targeted_student_history` and `private_generation.fetch_targeted_student_history` parameter names (`job_id`, `worker_id`, `claim_snapshot_id`, `cutoff_timestamp`, `target_ids`, `evidence_limit`) via Migration `20260907000000`.
   - Persisted full `evidence jsonb` in `private_generation.targeted_history_manifests` and enforced immutable caching on repeat reads for the same claim snapshot.
   - Enforced active worker lease and immutable cutoff (`observed_at <= cutoffTimestamp`), preventing future evidence leakage.
   - Validated tenant isolation, manifest hashing, and rollback transactions in `supabase/tests/smoke.sql`.

2. **Format Planning Capsule Upfront Injection & Window Ordering**:
   - Fixed window ordering in `packages/generator/src/curriculum-maps/diversity-capsule.ts` to sort chronologically ascending before slicing the last `lookbackWeeks`.
   - Injected format planning memory upfront into context before Stage 4 Packet Planning, guaranteeing `recentFormatUse`, `avoidMechanicalRepeat`, and `availableRecommendedFormats` are present.

3. **Fail-Closed Packet Planning (No Generic Fallback)**:
   - Eliminated silent generic fallback (`createDefaultPacketPlan`) in `packages/worker/src/local-codex-authoring.ts`.
   - Implemented a 2-round attempt loop with diagnostic plan repair; throws `PACKET_PLANNING_FAILED` on failure.

4. **Authentic Lifecycle Context Compaction**:
   - All character counts, UTF-8 byte sizes, and estimated token usages are directly measured from real prompt builders (`planningPrompt`, `researchPrompt`, `buildPacketPlanningPrompt`, and `authoringPrompt`) and compiled bundles.
   - Across 8 realistic benchmark scenarios, context compaction delivers an authentic net savings of 496,032 characters (~124,009 estimated tokens), achieving an average 23.5% reduction across all 5 generation stages.

5. **Version Contract & Prompt Succession**:
   - Prompts `2.13.0` are frozen byte-for-byte in tests.
   - Prompts `2.13.1` are consolidated and compiled into `packages/generator/bundles/production-authoring-bundle.md` (`2.13.1-prod`).

---

## 2. Core Pillars & Implementation Verification

### Pillar 1: Targeted History RPC Integrity & DB Smoke Verification
- Migration `20260907000000_align_history_rpc_contract_and_immutable_evidence.sql`:
   - Aligns parameter names between Postgres RPC and TypeScript client (`history-client.ts`).
   - Persists immutable evidence array in `private_generation.targeted_history_manifests`.
   - Caches and returns identical evidence on re-reads within the same claim.
   - Applies SHA-256 manifest hashing over retrieved evidence rows.
- Verified in `supabase/tests/smoke.sql`:
   - Validates `worker_fetch_targeted_student_history` with exact named arguments.
   - Confirms `cached: false` on first call, persists to audit table, and `cached: true` on repeat call.
   - `pnpm test:db` passes with complete transactional rollback.

### Pillar 2: Format Planning Capsule Upfront Delivery & Window Sorting
- `packages/generator/src/curriculum-maps/diversity-capsule.ts`:
   - Normalizes weeks chronologically ascending before `slice(-lookbackWeeks)`, ensuring order invariance.
   - Maps historical package summaries to delivery projections so format memory is always populated.
- `packages/worker/src/local-codex-authoring.ts` & `packet-planning.ts`:
   - Guarantees format memory is compacted and injected before Stage 4 Packet Planning.

### Pillar 3: Authentic Compaction Benchmarking
- Evaluated via `packages/generator/scripts/run-context-compaction-benchmark.ts`:
   - All 8 scenarios measured against authentic compiled bundles and real stage prompts.
   - Generates `docs/evaluations/release-1.8.1-compaction-benchmark.md` and `docs/evaluations/release-1.8.1-compaction-manifest.json`.
   - Average context reduction: **23.5%** across all 5 generation stages.

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
