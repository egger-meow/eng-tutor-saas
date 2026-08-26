# Recency-Aware Grounded-Interest Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Upgrade the production generator so fast-moving interests actively inspect and fairly compare recent developments while preserving pedagogical priority, evergreen fallback, privacy, freshness, and canonical grounding provenance.

**Architecture:** Add Prompt Suite 2.8.0 as a new overlay after the frozen 2.4–2.7 layers, advance the generation/worker release to 1.4.0, and keep Curriculum Schema 2.3.0. Encode topic-sensitive recency selection in planning and independent criticism, retain deterministic structural date/provenance validation, and regenerate the production bundle only through the compiler.

**Tech Stack:** TypeScript 6, Markdown prompt overlays, Zod 4 canonical schema, Vitest, pnpm deterministic bundle compiler.

**Spec:** `docs/superpowers/specs/2026-08-26-recency-aware-grounded-interest-research-design.md`

## Global Constraints

- Preserve `CurriculumPackageSchema` 2.3.0; do not add a canonical learner-profile field or grounding table.
- Preserve Claim Batch -> Grounding Research -> Plan -> Author -> Critic -> Repair -> Submit -> Finisher lifecycle and retry semantics.
- Search queries contain generalized public topic terms only and never private learner context.
- Preserve `Source -> Fact -> Claim -> Actual lesson prose` and independent educational synthesis.
- Frozen Prompt Suites 2.0.1 through 2.7.0 remain byte-for-byte immutable.
- Do not manually edit `packages/generator/bundles/production-authoring-bundle.md`.
- Repository policy forbids TDD unless explicitly requested; implement coherent changes first, then run focused regression tests and full verification.

---

### Task 1: Production Prompt 2.8.0 Overlay

**Files:**
- Create: `packages/generator/prompts/2.8.0/README.md`
- Create: `packages/generator/prompts/2.8.0/01-plan.md`
- Create: `packages/generator/prompts/2.8.0/02-author.md`
- Create: `packages/generator/prompts/2.8.0/03-critic.md`
- Create: `packages/generator/prompts/2.8.0/04-repair.md`

**Interfaces:**
- Consumes: frozen 2.4.0 CAP, 2.5.0 grounding, 2.6.0 workload, and 2.7.0 MCQ contracts.
- Produces: additive Prompt 2.8.0 stage overlays compiled after every matching 2.7.0 stage.

- [x] **Step 1: Write the suite README and planning overlay**

  Define a general planning judgment—durable versus fast-moving—based on whether recent developments materially change the useful teaching context, not a hardcoded domain list. For fast-moving interests require privacy-safe recent-development discovery, optional durable discovery, explicit comparison by learning-target fit, source quality, age appropriateness, lexical feasibility, factual depth, and freshness, plus a defensible evergreen fallback when current candidates lose.

- [x] **Step 2: Write the authoring overlay**

  Require `temporalMode: current`, `researchedAt`, valid supporting `publishedAt`, event/publication-date distinctions, original synthesis, exact claim bindings, lexical/CAP/workload integrity, and no news framing or marketing claims promoted beyond their evidence.

- [x] **Step 3: Write the critic overlay**

  Require semantic review of ignored strong current angles, unjustified freshness preference, stale/undated current sources, unsupported recency, rumor/speculation, generic noun-skinning, copied news framing, lexical overflow, and topical hooks that hijack the learning target. Make freshness topic-aware through evidence and presentation context rather than a universal age cutoff.

- [x] **Step 4: Write the repair overlay**

  Limit re-research and prose repair to dependent fragments for freshness, temporal classification, current-topic selection, source adequacy, and factual support; preserve immutable attempts, valid research, unrelated sections, and retry behavior.

### Task 2: Deterministic Bundle and Release Manifest

**Files:**
- Modify: `packages/generator/src/engine-version.ts`
- Modify: `packages/generator/src/bundle-compiler.ts`
- Modify: `packages/generator/src/bundle-compiler.test.ts`
- Modify: `packages/generator/src/pedagogy-contract.test.ts`
- Modify: `packages/generator/src/fixtures/grounded-curriculum-packages.ts`
- Generated: `packages/generator/bundles/production-authoring-bundle.md`

**Interfaces:**
- Consumes: Prompt 2.8.0 overlay files and existing `compileProductionBundle()` contract.
- Produces: release `rel_1.4.0`, engine/worker `1.4.0`, prompt `2.8.0`, bundle `2.8.0-prod`, schema `2.3.0`.

- [x] **Step 1: Advance authoritative versions**

  Update `CURRENT_RELEASE_ID`, `CURRENT_ENGINE_VERSION`, `CURRENT_PROMPT_VERSION`, and `CURRENT_WORKER_VERSION`; retain `CURRENT_SCHEMA_VERSION = '2.3.0'` and existing quality/PDF versions.

- [x] **Step 2: Extend the compiler**

  Add Prompt 2.8.0 files to `SOURCE_FILES`, layer them after 2.7.0, rewrite the inherited active prompt marker to 2.8.0, and emit 2.8.0 prompt/bundle metadata with engine 1.4.0.

- [x] **Step 3: Freeze Prompt 2.7.0**

  Add `FROZEN_270_FILES` and `computeFrozen270Hashes()` and assert exact SHA-256 hashes in `bundle-compiler.test.ts`, without changing any 2.7.0 byte.

- [x] **Step 4: Update release/provenance tests and fixtures**

  Make bundle, pedagogy, and grounded fixture expectations agree on 1.4.0/2.8.0 while continuing to assert Schema 2.3.0 and the canonical grounding chain.

- [x] **Step 5: Compile the deterministic bundle**

  Run `pnpm compile:bundle`; then run the bundle compiler test to prove checked-in output and source hashes match a fresh compile.

### Task 3: Worker and Admin Version Bridges

**Files:**
- Modify: `packages/worker/src/prompt-v2.ts`
- Modify: `packages/worker/src/prompt-v2.test.ts`
- Modify: `apps/admin/src/server/admin-service.test.ts`

**Interfaces:**
- Consumes: authoritative generator version constants and Prompt 2.8.0 files.
- Produces: worker runtime prompt assembly and Admin provenance/drift expectations aligned with the current release.

- [x] **Step 1: Add the 2.8.0 worker overlay**

  Assemble each worker stage from frozen 2.4.0 + 2.5.0 + 2.6.0 + 2.7.0 + 2.8.0, update active headers/descriptions, and retain exact schema and model provenance behavior.

- [x] **Step 2: Update worker prompt assertions**

  Assert Prompt 2.8.0, fast-moving discovery/privacy/fallback obligations, and the preserved canonical provenance contract are present in runtime prompt assembly.

- [x] **Step 3: Update Admin provenance release cases**

  Treat 1.3.0/2.7.0 as the immediately previous historical release and 1.4.0/2.8.0 as current; update aligned inspector/export/version-format expectations without relabeling stored history.

### Task 4: Canonical Product Contract Synchronization

**Files:**
- Modify: `docs/SPEC.md`
- Modify: `docs/product-rules.md`
- Modify: `docs/curriculum-quality-rubric.md`
- Modify: `docs/chatgpt-work-daily-schedule.md`

**Interfaces:**
- Consumes: approved design and existing SPEC sections 61, 114–130, 146, 153, 179–182, 187, 193, 199, 204, 205, and 210.
- Produces: semantically aligned canonical behavior; `docs/SPEC-TOC.md` remains unchanged because no heading is added, removed, renamed, or renumbered.

- [x] **Step 1: Update existing SPEC sections in place**

  Add the durable/fast-moving research-planning signal, recent discovery and comparison funnel, principled evergreen fallback, topic-aware freshness criticism, source hierarchy, privacy boundary, targeted repair, and production release metadata to the natural existing sections.

- [x] **Step 2: Update product rules and quality rubric**

  State that current wins only when it is the strongest teachable grounded context, and that recency cannot lower factual density, lexical control, CAP relevance, answer entailment, copyright safety, workload integrity, or personalization quality.

- [x] **Step 3: Update Scheduled Work contract**

  Keep exactly the existing authorized inputs and lifecycle while requiring generalized recent-development searches for fast-moving interests and documenting Prompt 2.8.0/Engine 1.4.0 where the schedule is authoritative.

### Task 5: Behavioral Regression Coverage

**Files:**
- Create: `packages/generator/src/recency-grounding-contract.test.ts`
- Modify: `packages/generator/src/curriculum-package.test.ts`
- Modify: `packages/generator/src/audit-curriculum.test.ts`

**Interfaces:**
- Consumes: compiled Prompt 2.8.0 contract and existing canonical/deterministic validators.
- Produces: executable coverage for selection policy, privacy, freshness metadata, provenance, and historical immutability.

- [x] **Step 1: Add production-contract behavior tests**

  Compile the bundle and assert the complete decision paths: a strong current technology candidate is discovered/compared/preferred; weak or speculative candidates permit evergreen fallback; durable interests do not receive an artificial current requirement; query construction excludes every listed private learner attribute; the critic evaluates stale/undated/unsupported recency, speculation, pedagogical inferiority, lexical overflow, source-shaped prose, and target hijacking.

- [x] **Step 2: Strengthen deterministic freshness fixtures**

  Exercise missing `publishedAt`, publication after access/research, and missing independent `grounding-freshness` evidence for `current`; confirm valid evergreen packages remain accepted.

- [x] **Step 3: Preserve exact provenance behavior**

  Exercise a current package whose source supports a fact whose IDs bind an exact authored claim, then reject unsupported embellishment or broken exact-text/location binding through existing canonical validation/audit boundaries.

- [x] **Step 4: Run focused tests**

  Run `pnpm test -- packages/generator/src/recency-grounding-contract.test.ts packages/generator/src/curriculum-package.test.ts packages/generator/src/audit-curriculum.test.ts packages/generator/src/bundle-compiler.test.ts packages/generator/src/pedagogy-contract.test.ts packages/worker/src/prompt-v2.test.ts apps/admin/src/server/admin-service.test.ts` and fix only failures caused by this release.

### Task 6: Full Verification and Delivery

**Files:**
- Verify only: repository working tree and generated artifacts.

**Interfaces:**
- Consumes: all implementation tasks.
- Produces: verified, committed, pushed production release with no production job mutations.

- [x] **Step 1: Run canonical generator verification**

  Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm audit:curriculum -- packages/generator/src/fixtures`, and the repository's focused frozen-prompt/bundle/canonical tests.

- [x] **Step 2: Run generation/PDF verification**

  Run `pnpm generate:synthetic` and confirm deterministic PDF generation remains valid; do not run real production jobs.

- [x] **Step 3: Recheck bundle determinism**

  Run `pnpm compile:bundle`, verify `git diff --exit-code packages/generator/bundles/production-authoring-bundle.md`, and rerun `packages/generator/src/bundle-compiler.test.ts`.

- [x] **Step 4: Review release consistency and scope**

  Use `rg` to ensure all authoritative current references agree on Engine/Worker 1.4.0, Prompt 2.8.0, Bundle 2.8.0-prod, Schema 2.3.0; verify no frozen prompt changed and no unrelated queue/claim/submit/Finisher/storage code changed.

- [x] **Step 5: Commit and push**

  Commit the coherent implementation and verification updates with a production-release message, then push the current `main` branch to its configured upstream without force.
