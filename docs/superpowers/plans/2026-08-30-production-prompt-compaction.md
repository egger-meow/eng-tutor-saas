# Production Prompt Compaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inherited production prompt overlay stack with one consolidated 2.11.0 suite and close the exact named-feature attribution hole without adding product-specific deterministic rules.

**Architecture:** Historical prompt suites remain byte-for-byte frozen for provenance. Current authoring compiles only `prompts/2.11.0/*` plus the canonical schema, quality/product contracts, and CAP runtime assets. Exact entity/mode/capability/control-flow attribution is an Author/Critic semantic invariant; Finisher remains responsible for objective integrity only.

**Tech Stack:** TypeScript, Vitest, pnpm, PostgreSQL/Supabase migrations, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-30-production-prompt-compaction-design.md`

## Global Constraints

- Active Prompt = `2.11.0`; Bundle = `2.11.0-prod`; Engine = `1.6.0`; Release = `rel_1.6.0`; Schema remains `2.4.0`.
- Quality Profile remains `1.2.0`; Worker and PDF renderer versions remain unchanged unless compatibility proves otherwise.
- Never edit historical prompt suites 2.4.0 through 2.10.1.
- No Suno-specific validator, keyword list, deterministic semantic checker, new quota, or Finisher pedagogy gate.
- Existing released/submitted materials retain historical metadata; fixes are forward-only.
- Exact attribution invariant: `exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`.
- Future active prompt changes modify a consolidated baseline rather than resume an unbounded permanent overlay chain.

---

### Task 1: Consolidated 2.11.0 production prompt

**Files:**
- Create: `packages/generator/prompts/2.11.0/01-plan.md`
- Create: `packages/generator/prompts/2.11.0/02-author.md`
- Create: `packages/generator/prompts/2.11.0/03-critic.md`
- Create: `packages/generator/prompts/2.11.0/04-repair.md`
- Create: `packages/generator/prompts/2.11.0/README.md`
- Modify: `docs/product-rules.md`
- Modify: `docs/curriculum-quality-rubric.md`
- Modify: `docs/SPEC.md`
- Test: `packages/generator/src/pedagogy-contract.test.ts`

**Interfaces:**
- Consumes: Schema 2.4.0, learner context, grounding object, CAP assessment-plan contract.
- Produces: one compact plan/author/critic/repair contract used directly by the production bundle compiler.

- [x] Add focused contract assertions that active 2.11.0 includes exact attribution, feedback authority, evidence containment, CAP floor, workload truth, and surgical repair, while excluding the obsolete `Require ≥7 genuinely new lexical units` critic rule.
- [x] Create concise 2.11.0 prompt files that encode current effective invariants once, without historical overlay headings or superseded numeric lexical gates.
- [x] Add exact-attribution language to product/rubric/SPEC grounding contracts and state that semantic Critic owns relationship accuracy.
- [x] Preserve deterministic Finisher boundary and historical prompt immutability.

### Task 2: Compiler and version reset

**Files:**
- Modify: `packages/generator/src/bundle-compiler.ts`
- Modify: `packages/generator/src/bundle-compiler.test.ts`
- Modify: `packages/generator/src/engine-version.ts`
- Modify current-version regression assertions found by repository search.
- Regenerate: `packages/generator/bundles/production-authoring-bundle.md`

**Interfaces:**
- Consumes: `packages/generator/prompts/2.11.0/*`.
- Produces: deterministic `2.11.0-prod` bundle and manifest `rel_1.6.0 / engine 1.6.0 / prompt 2.11.0 / schema 2.4.0`.

- [x] Change active `SOURCE_FILES` to hash 2.11.0 prompt stages instead of 2.4-2.10.1 active overlays; keep frozen historical hash lists/functions unchanged.
- [x] Make `readPromptStage` read exactly one 2.11.0 stage with no historical concatenation.
- [x] Update bundle metadata/version assertions and add a regression proving active bundle excludes legacy overlay sediment.
- [x] Bump engine manifest/current release only; do not relabel historical artifacts.
- [x] Regenerate the checked-in production bundle deterministically.

### Task 3: Forward-only production bridge release

**Files:**
- Create: `supabase/migrations/20260830*_advance_generation_release_to_1_6_0.sql`
- Modify: `supabase/tests/smoke.sql`
- Modify bridge/version regression tests that explicitly assert the current release.

**Interfaces:**
- Consumes: existing private generation bridge signatures and Schema 2.4.0 submission contract.
- Produces: new claims stamped `targetReleaseId = rel_1.6.0`; submissions remain Schema 2.4.0 and preserve existing security/retry semantics.

- [x] Copy the current bridge functions into one forward-only migration and change only the target/default release identifier to `rel_1.6.0`.
- [x] Preserve function signatures, revokes, input-fingerprint checks, immutable-attempt semantics, and 2 MiB limit.
- [x] Update smoke/regression assertions to require rel_1.6.0 without editing historical migrations.

### Task 4: Full verification and release

**Files:**
- No new production behavior beyond Tasks 1-3.

**Interfaces:**
- Produces: merge-ready PR and deployed forward migration.

- [x] Run targeted prompt/compiler/version/bridge tests.
- [ ] Run `pnpm lint`, `pnpm test`, `pnpm typecheck`, and `pnpm build` on the final PR head.
- [x] Inspect PR diff for accidental historical prompt/migration edits and verify generated bundle determinism.
- [ ] Merge only after CI is green; verify main CI/deploy and production migration history.
- [x] Remove any temporary bundle-generation workflow/helper before merge.
