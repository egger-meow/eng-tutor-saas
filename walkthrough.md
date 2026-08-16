# Wave 4.2: Cross-Wave Coherence & Production Wiring Walkthrough

Wave 4.2 completes the cross-wave pedagogical inheritance, active prompt invariant enforcement, production schema 2.2.0 wiring, server-side CAP closed-loop exposure tracking, and passage-first lexical ceiling auditing.

---

## 1. Five Core Accomplishments

### Cut 1: Prompt 2.4 Complete Inheritance & Budget Compression
- **Restored full multi-wave pedagogical superset in [prompts/2.4.0/](file:///c:/IDEA/eng-tutor-saas/packages/generator/prompts/2.4.0/)**:
  - **Wave 2**: `Trigger → Pattern → Trap → Try` mental models, diagnostic distractor reasoning (`partial evidence`, `reversed relationship`), non-tautological parent explanations (`likelyMisconceptionZh`).
  - **Wave 3**: Micro contrastive few-shot (`BAD ➔ GOOD`), local Question-Answer authoring protocol, deterministic projection.
  - **Wave 4**: `The Golden Hierarchy: Target ➔ Genre ➔ Interest`, multi-genre blocks (`paragraph`, `dialogue`, `notice`, `schedule-row`), item-type rotation (Macro, Micro, Applied/Transfer).
  - **Wave 4.1**: `The Strict Planning Priority Order`, `capCoverageCapsule`, `trackingDelta` exposure semantics.
  - **Wave 4.2**: Passage-first lexical contract & lexical ceiling.
- **Compiled Production Bundle**: [production-authoring-bundle.md](file:///c:/IDEA/eng-tutor-saas/packages/generator/bundles/production-authoring-bundle.md) compiles with `bundleVersion: "2.4.0-prod"`, `schemaVersion: "2.2.0"`, and stays strictly under the 4,000-word token budget ($> 50\%$ compression).

### Cut 2: Active Prompt Invariant Contract Tests
- Updated [pedagogy-contract.test.ts](file:///c:/IDEA/eng-tutor-saas/packages/generator/src/pedagogy-contract.test.ts) to assert invariants directly against the active `prompts/2.4.0/` files, ensuring no regression or hollow backward-compatibility claims.

### Cut 3: Production Schema Wiring (2.2.0)
- Updated [prompt-v2.ts](file:///c:/IDEA/eng-tutor-saas/packages/worker/src/prompt-v2.ts) to build prompts from `prompts/2.4.0/` under `Curriculum Package 2.2.0 · Prompt 2.4.0`.
- Updated [cli.ts](file:///c:/IDEA/eng-tutor-saas/packages/worker/src/cli.ts) `complete-v2` to output `schema: '2.2.0'`.
- Updated [20260817020000_wire_production_schema_220_and_cap_loop.sql](file:///c:/IDEA/eng-tutor-saas/supabase/migrations/20260817020000_wire_production_schema_220_and_cap_loop.sql) `private_generation.chatgpt_submit_curriculum_package` to validate `2.2.0` on canonical ingest while supporting legacy upgrade.

### Cut 4: Server-Side CAP Closed Loop
- **Claim Context Capsule**: `worker_generation_context` extracts `child_communication_progress` into `communicationCapsule` and computes `capCoverageCapsule` across Vocabulary (2,000 scope), Grammar (24 scope), and Communication Functions (16 scope).
- **Observation Recording**: `worker_record_curriculum_observations` records exposed IDs from `trackingDelta` (`exposedCommunicationFunctionIds`, `exposedGrammarTargetIds`, `introducedVocabularyIds`, `reviewedVocabularyIds`) into database progress tables.
- **Invariant**: Exposure updates increment `exposure_count` and `last_seen_at`, but **NEVER** set `mastery_status = 'mastered'` or increment `correct_count`.

### Cut 5: Passage-First Lexical Contract & Clean Provenance
- **Exact Provenance & Count**: [build-official-vocab.ts](file:///c:/IDEA/eng-tutor-saas/packages/generator/scripts/build-official-vocab.ts) generates exactly **1,200 Core words + 800 Extension words = 2,000 canonical words** in [vocabulary-2000.json](file:///c:/IDEA/eng-tutor-saas/packages/generator/src/curriculum-maps/official/vocabulary-2000.json).
- **Lexical Ceiling Lint**: Added `isApprovedWord()` and lexical ceiling audit in [audit-curriculum.ts](file:///c:/IDEA/eng-tutor-saas/packages/generator/src/audit-curriculum.ts) (`auditCurriculumPackage`), alerting when untaught off-target words exceed threshold.

---

## 2. Verification Evidence

### Automated Test Suite
- `npx vitest run --exclude "**/dist/**"`:
  ```text
  Test Files  41 passed (41)
       Tests  240 passed (240)
  ```

### Deterministic PDF Rendering
- `tsx packages/pdf/src/generate-synthetic.ts`:
  ```text
  {"kind":"student","path":"output/pdf/synthetic-week-1-student.pdf","bytes":91756}
  {"kind":"parent-answer","path":"output/pdf/synthetic-week-1-parent-answer.pdf","bytes":73482}
  ```

### Build & Typecheck
- `npx pnpm typecheck ; npx pnpm lint ; npx pnpm build`:
  - `apps/web`: Done (Typecheck + Vite build clean)
  - `packages/generator`: Done (Typecheck + TSC build clean)
  - `packages/pdf`: Done (Typecheck + TSC build clean)
  - `packages/worker`: Done (Typecheck + TSC build clean)
  - Lint: 0 errors
