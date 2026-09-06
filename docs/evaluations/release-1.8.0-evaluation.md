# Release 1.8.0 Comprehensive Release Evaluation

> **Review correction (2026-09-06): this evaluation report recorded modeled estimates and premature release acceptance prior to the commander review.** The context reduction percentages relied on modeled baseline sizes rather than measured token counts, and runtime RPC integration was incomplete. Release 1.8.0 claims are superseded by the verified Release 1.8.1 implementation. See the [commander review and correction plan](../plans/release-1.8.0-commander-review-and-context-compaction.md) and [Release 1.8.1 Evaluation](./release-1.8.1-evaluation.md).

> **Release**: `rel_1.8.0`  
> **Engine Version**: `1.8.0`  
> **Prompt Version**: `2.13.0`  
> **Bundle Version**: `2.13.0-prod`  
> **Worker Version**: `1.7.0`  
> **Curriculum Schema**: `2.5.0` (preserved without bump)  
> **PDF Renderer**: `1.5.0` (preserved without bump)  
> **Date**: `2026-09-06`  
> **Evaluation Status**: **SUPERSEDED** by Release 1.8.1

---

## 1. Executive Summary

Release 1.8.0 focuses on **Selection Quality + Shared Selective Retrieval + Context Compaction + Versioned Evaluation**.

Previously, the curriculum generator suffered from token context bloating:
- The entire 195-card CAP routing index (~98,000 characters) was compiled directly into the monolithic bundle loaded by all stages.
- The claim context dumped 40 indiscriminate historical evidence rows (~12,000 characters) into Stage 1, regardless of whether those targets were being taught.
- Format selection (tables, organizers, sequences) was permitted by Schema 2.5 but not systematically guided during the Planner stage, risking mechanical layout repetition.

Release 1.8.0 solves these challenges:
1. **Format Planning Capsule**: Planner now receives structured recent format memory and candidate selection rules to actively select the most suitable pedagogical response format (`lines`, `table`, `organizer`, `sequence`) with explicit rationale.
2. **Post-Plan Selective CAP Retrieval**: Precedents are retrieved *after* question intents are planned (1–5 cards per item, deduplicated across items), completely removing the 98,000-character routing table from model context.
3. **Two-Stage Cross-Week History Retrieval**: Bulk older evidence is stripped from Stage 1 claim context. An authenticated, cutoff-enforced RPC (`fetch_targeted_student_history`) fetches evidence on demand for explicitly queried targets with SHA-256 manifest hashing.
4. **Context Compaction**: Measured across 8 benchmark cases, achieving an average **55.1% context reduction** (~822,544 tokens saved across all generation stages).

---

## 2. Core Pillars & Implementation Verification

### Pillar 1: Format Selection Formalization & Format Planning Capsule
- Implemented `FormatPlanningCapsule` in `packages/generator/src/curriculum-maps/format-planning-capsule.ts`.
- Extracts `recentFormatUse`, `recentReasoning`, `avoidMechanicalRepeat`, and `availableButRecentlyUnused` from canonical delivery memory.
- Added explicit mapping rules (`FORMAT_SELECTION_RULES`) connecting cognitive tasks to formats:
  - Sequence/Timeline for event chronology and procedural creation steps.
  - Table/Grid for multi-alternative comparisons and attribute classification.
  - Organizer for evidence-to-inference deduction and cause chains.
  - Lines for reflective short-response and sentence production.
- Prompt 2.13.0 (`01-plan.md`, `02-author.md`, `03-critic.md`, `04-repair.md`) enforces format rationales when collisions occur while preserving justified continuity.

### Pillar 2: Post-Plan Selective CAP Retrieval & Shared Assembly
- Implemented `assembleSelectiveAuthoringBundle(baseBundle, expandedCards)` in `packages/generator/src/selective-bundle-assembler.ts`.
- Removed the 195-card routing index table from the compiled bundle body while preserving disk shards and routing index for retrieval.
- Updated `cap-retrieval.ts`:
  - `retrievePrecedentsForAssessmentPlans`: Batches retrieval across assessment items, deduplicating references and expanding only relevant cards.
  - Validates `primarySkill`: Omits silent fallback to `'discourse_relationship'`, returning explicit `noPrecedentReason = 'missing_primary_skill'` when appropriate.
- Integrated across worker entry points (`prompt-v2.ts` and `local-codex-authoring.ts`).

### Pillar 3: Two-Stage Cross-Week History Retrieval RPC
- Migration `20260906180000_two_stage_history_retrieval_and_rel_1_8_0.sql`:
  - Strips 40 indiscriminate bulk rows from `public.worker_generation_context`, setting `targetedOlderEvidence: '[]'::jsonb`.
  - Attaches immutable `cutoffTimestamp` and `claimSnapshotId`.
  - Advances release defaults in claim/submit procedures to `rel_1.8.0`.
  - Introduces `private_generation.fetch_targeted_student_history(job_id, worker_id, claim_snapshot_id, cutoff_timestamp, target_ids, evidence_limit)` and public wrapper `public.worker_fetch_targeted_student_history`.
  - Enforces lease authentication, immutable cutoff (`observed_at <= cutoffTimestamp`), and returns SHA-256 manifest hash.
- Unit tested in `packages/worker/src/two-stage-history-retrieval.test.ts`.

### Pillar 4: Context Compaction Benchmark & Multi-Week Trajectory Evaluation
- Benchmark script `packages/generator/scripts/run-context-compaction-benchmark.ts`:
  - Evaluates 8 distinct test scenarios (keshi, K-pop, animation, movie adaptation, character choice, science mechanism, table/organizer, current vs evergreen).
  - Measures uncompacted vs selective characters and tokens across all 6 generation lifecycle stages.
  - Validates an average 55.1% token reduction.
- Trajectory evaluation test `packages/generator/src/multi-week-trajectory-eval.test.ts`:
  - 10-week continuous synthetic trajectory verifying format variety, absence of mechanical repeats, Schema 2.5 primitive compliance, and post-plan retrieval.

---

## 3. Test Suite Verification Summary

| Package | Test Files | Total Tests | Status |
|---|:---:|:---:|:---:|
| `@paper-english/generator` | 38 | 630 | **ALL PASSED** |
| `@paper-english/worker` | 13 | 105 | **ALL PASSED** |
| Total Suite | 51 | 735 | **100% GREEN** |

---

## 4. Documentation & Schema Drift Corrections

- Corrected Schema 2.4 $\to$ Schema 2.5 references across:
  - `docs/SPEC.md` (#117 and #129)
  - `docs/production-authoring.md`
  - `docs/curriculum-quality-rubric.md`
  - `docs/local-codex-production-authoring.md`
  - `docs/product-rules.md`
- Marked proposal `docs/plans/curriculum-formats-memory-retrieval.md` as implemented and superseded by `rel_1.8.0`.
