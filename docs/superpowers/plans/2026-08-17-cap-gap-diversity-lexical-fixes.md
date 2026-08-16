# CAP Gap Recommendations, Diversity Memory, Canonical ID Fail-Closed, and Lexical Audit Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 5 production gaps in curriculum planning and quality control: (1) wire real CAP gap recommendations (`recommendedVocabulary`, `recommendedGrammar`, `recommendedCommunicationFunctions`) into production context, (2) wire minimal 2–4 week diversity memory (`recentGenres`, `recentContextKeys`, `recentItemFamilies`), (3) enforce fail-closed CAP canonical IDs (24 grammar units, 16 communication functions, official 2000 vocab mapping), (4) fix 2 lexical audit bugs (`car ≠ carry` token-boundary morphology and proper noun allowlist), and (5) update provenance copy to "canonical asset integrity SHA-256".

**Architecture:** Extend `@paper-english/generator` with deterministic diversity capsule extraction and canonical ID validation; enrich worker generation context in `@paper-english/worker` (`pipeline.ts`) and Supabase RPCs with CAP recommendations and multi-week diversity history; update lexical audit to use token-boundary morphology and entity allowlists; and update manifest/test copy.

**Tech Stack:** TypeScript, Vitest, PostgreSQL (Supabase migrations), Zod, crypto (SHA-256).

**Spec:** `docs/SPEC.md` (Sections 46–67, 114–132, 180–181, 204, 205, 210), `docs/SPEC-TOC.md`.

## Global Constraints
- `eng-tutor` is upstream R&D only, not a production runtime dependency.
- Exposure is NOT evidence of mastery (Hard Invariant).
- No new complex algorithms, fancy scoring, or UI additions for diversity memory: only extract `recentGenres`, `recentContextKeys`, `recentItemFamilies` from the last 2–4 weeks.
- Domain words (e.g. Minecraft, sensors) may be taught in lessons, but must NOT pollute the CAP 2000 denominator/progress tracker.
- Fail-closed: grammar trackingDelta IDs must belong to the 24 derived grammar IDs; communication trackingDelta IDs must belong to the 16 official communication IDs.
- Deterministic publish gate: preserve the lexical ceiling rule without substring false positives (`car ≠ carry`) and without wildcard capital letter bypasses.

---

## Task Decomposition

### Task 1: Fix Lexical Audit Deterministic Bugs (`car ≠ carry` & Proper Noun Allowlist)
**Files:**
- Modify: `packages/generator/src/audit-curriculum.ts`
- Test: `packages/generator/src/audit-curriculum.test.ts`

**Interfaces:**
- `wordAppearsInText(word: string, text: string): boolean` — uses token-boundary matching and controlled inflection variants instead of `lowerText.includes(stem)`.
- `buildAllowedEntitiesSet(pkg: CurriculumPackage): Set<string>` — extracts allowed proper nouns/entities from dialogue block speakers, learner interests, and standard calendar/educational names.
- `auditCurriculumPackage(input: unknown): CurriculumAuditReport` — checks lexical anchor and ceiling using token-boundary matching and explicit entity allowlist.

- [ ] **Step 1: Write failing test cases in `packages/generator/src/audit-curriculum.test.ts`**
  - Test `car` is rejected when text contains `carry` or `careful` but not `car`.
  - Test `carry` is accepted when text contains `carries` or `carrying`.
  - Test capitalized advanced non-allowlist word (e.g., `Sophisticated`, `Quantum`) triggers `lexical-ceiling` critical finding when not taught.
  - Test dialogue speaker names (e.g., `Alex`, `Mia`) and learner interest terms are allowed without warning.

- [ ] **Step 2: Run test to verify failure**
  - Run `npx pnpm test packages/generator/src/audit-curriculum.test.ts`

- [ ] **Step 3: Implement token-boundary morphology and entity allowlist in `packages/generator/src/audit-curriculum.ts`**
  - Tokenize passage text into word tokens (`/[a-z0-9]+(?:'[a-z]+)?/gu`).
  - Implement controlled morphology generator for target words.
  - Replace `/^[A-Z][a-z]+$/` bypass with `buildAllowedEntitiesSet(pkg)`.

- [ ] **Step 4: Run test to verify it passes**
  - Run `npx pnpm test packages/generator/src/audit-curriculum.test.ts`

---

### Task 2: Implement CAP Canonical ID Fail-Closed & Vocabulary Mapping
**Files:**
- Modify: `packages/generator/src/validate-curriculum-package.ts`
- Modify: `packages/generator/src/curriculum-maps/student-curriculum-tracker.ts`
- Modify: `packages/generator/src/curriculum-maps/derived/grammar-progression.ts`
- Modify: `packages/generator/src/index.ts`
- Test: `packages/generator/src/curriculum-package.test.ts`
- Test: `packages/generator/src/curriculum-maps/student-tracker.test.ts`

**Interfaces:**
- `VALID_GRAMMAR_UNIT_IDS: Set<string>` — exact 24 derived grammar IDs.
- `VALID_COMMUNICATION_FUNCTION_IDS: Set<string>` — exact 16 official communication function IDs.
- `mapToCanonicalVocabId(wordOrId: string): string | null` — maps word to official CAP 2000 ID if present.
- `validateCurriculumPackage(input: unknown): CurriculumValidationResult` — validates `trackingDelta.exposedGrammarTargetIds` ⊆ 24 IDs and `trackingDelta.exposedCommunicationFunctionIds` ⊆ 16 IDs.
- `recordExposureFromTrackingDelta(...)` — records only mapped canonical CAP 2000 IDs into `store.vocabRecords`.

- [ ] **Step 1: Write failing tests for canonical ID validation and vocab mapping**
  - Test `validateCurriculumPackage` rejects arbitrary grammar IDs like `g7-unknown-fake` or arbitrary communication IDs like `cf-invented-function`.
  - Test `recordExposureFromTrackingDelta` ignores domain words (e.g. `minecraft`, `redstone`) from CAP vocab coverage denominator while properly tracking CAP words (e.g. `borrow`, `through`).

- [ ] **Step 2: Run tests to verify failures**
  - Run `npx pnpm test packages/generator/src/curriculum-package.test.ts`

- [ ] **Step 3: Implement canonical ID sets and validation in `validate-curriculum-package.ts` and `student-curriculum-tracker.ts`**
  - Export `VALID_GRAMMAR_UNIT_IDS` and `VALID_COMMUNICATION_FUNCTION_IDS`.
  - Validate trackingDelta IDs in `relationshipIssues`.
  - Filter vocabulary in `recordExposureFromTrackingDelta` using official 2000 mapping.

- [ ] **Step 4: Run tests to verify pass**
  - Run `npx pnpm test packages/generator/src/curriculum-package.test.ts packages/generator/src/curriculum-maps/student-tracker.test.ts`

---

### Task 3: Build Diversity Memory Capsule (Last 2–4 Weeks)
**Files:**
- Create: `packages/generator/src/curriculum-maps/diversity-capsule.ts`
- Modify: `packages/generator/src/index.ts`
- Test: `packages/generator/src/curriculum-maps/diversity-capsule.test.ts`

**Interfaces:**
- `buildDiversityCapsule(recentMaterials: Array<{ canonical_source?: any; canonicalSource?: any; generation_summary?: any; generationSummary?: any }>): DiversityCapsule`
  - Extracts `recentGenres: ReadingGenre[]` (ordered latest to oldest).
  - Extracts `recentContextKeys: string[]` (from situationalContextKey / reading title / theme).
  - Extracts `recentItemFamilies: string[]` (distinct question itemTypes from practice & homework).

- [ ] **Step 1: Write test for `buildDiversityCapsule`**
  - Test extracting genres, context keys, and item families from 1, 2, 3, and 4 weeks of completed materials.
  - Test empty history returns empty arrays `{ recentGenres: [], recentContextKeys: [], recentItemFamilies: [] }`.

- [ ] **Step 2: Run test to verify failure**
  - Run `npx pnpm test packages/generator/src/curriculum-maps/diversity-capsule.test.ts`

- [ ] **Step 3: Implement `buildDiversityCapsule` in `packages/generator/src/curriculum-maps/diversity-capsule.ts`**
  - Implement parsing and deduplicated aggregation for last 2–4 weeks.
  - Export `buildDiversityCapsule` in `packages/generator/src/index.ts`.

- [ ] **Step 4: Run test to verify pass**
  - Run `npx pnpm test packages/generator/src/curriculum-maps/diversity-capsule.test.ts`

---

### Task 4: Connect CAP Recommendations & Diversity Memory into Production Worker Context & Supabase
**Files:**
- Modify: `packages/generator/src/curriculum-maps/build-cap-coverage-capsule.ts`
- Modify: `packages/worker/src/pipeline.ts`
- Modify: `packages/worker/src/pipeline.test.ts`
- Create: `supabase/migrations/20260817030000_wire_cap_gaps_and_diversity_memory.sql`

**Interfaces:**
- `enrichGenerationContext(context: GenerationContext, client?: WorkerClient): Promise<GenerationContext>` — enriches `capCoverageCapsule` with `recommendedVocabulary`, `recommendedGrammar`, `recommendedCommunicationFunctions` and adds `diversityCapsule` from recent materials.
- `loadGenerationContext(client: WorkerClient, jobId: string, workerId: string): Promise<GenerationContext>` — returns fully populated `capCoverageCapsule` and `diversityCapsule`.

- [ ] **Step 1: Write tests in `packages/worker/src/pipeline.test.ts`**
  - Verify `loadGenerationContext` returns `context.capCoverageCapsule` containing non-empty `recommendedVocabulary`, `recommendedGrammar`, and `recommendedCommunicationFunctions`.
  - Verify `loadGenerationContext` returns `context.diversityCapsule` containing recent genres, context keys, and item families when previous materials exist.

- [ ] **Step 2: Run test to verify failure**
  - Run `npx pnpm test packages/worker/src/pipeline.test.ts`

- [ ] **Step 3: Implement context enrichment and database migration**
  - Implement enrichment logic in `packages/worker/src/pipeline.ts`.
  - Create Supabase migration `supabase/migrations/20260817030000_wire_cap_gaps_and_diversity_memory.sql` updating `worker_generation_context` to fetch recent materials for diversity memory and ensure canonical tracking observations map vocabulary to official 2000.

- [ ] **Step 4: Run test to verify pass**
  - Run `npx pnpm test packages/worker/src/pipeline.test.ts`

---

### Task 5: Provenance Copy Update & Bundle Compilation
**Files:**
- Modify: `packages/generator/src/curriculum-maps/official/source-manifest.json`
- Modify: `packages/generator/src/curriculum-maps/cap-maps.test.ts`
- Modify: `docs/eng-tutor-upstream.md`
- Modify: `packages/generator/bundles/production-authoring-bundle.md`
- Test: `packages/generator/src/bundle-compiler.test.ts`
- Test: `packages/generator/src/curriculum-maps/cap-maps.test.ts`

**Interfaces:**
- Wording updated to "canonical asset integrity SHA-256" verifying checked-in canonical assets.
- Production bundle compiled with valid source hashes.

- [ ] **Step 1: Update provenance descriptions in `source-manifest.json` and `cap-maps.test.ts`**
- [ ] **Step 2: Recompile production bundle and verify `bundle-compiler.test.ts` passes**
- [ ] **Step 3: Run full test suite across all packages**
  - Run `npx pnpm test`

---

## Verification Plan

### Automated Tests
- `npx pnpm test packages/generator/src/audit-curriculum.test.ts` (lexical anchor & ceiling tests)
- `npx pnpm test packages/generator/src/curriculum-package.test.ts` (canonical ID fail-closed validation)
- `npx pnpm test packages/generator/src/curriculum-maps/` (student tracker, cap maps, diversity capsule)
- `npx pnpm test packages/worker/src/` (worker context enrichment with CAP gaps & diversity capsule)
- `npx pnpm test` (full project test suite)
