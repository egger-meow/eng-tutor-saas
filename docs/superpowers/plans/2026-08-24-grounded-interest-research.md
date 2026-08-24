# Grounded Interest Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every newly authored curriculum package to carry auditable real-world grounding whose claims resolve to actual canonical lesson prose, while preserving the existing GitHub Actions finisher and delivery lifecycle.

**Architecture:** Introduce canonical schema `2.3.0` as an additive generation contract and retain historical package compatibility. Grounding remains internal package metadata: deterministic validation closes source-to-fact-to-claim-to-prose references, while authoring prompts and quality audits enforce research quality, temporal freshness, privacy, and copyright. The queue claim, submission, rendering, storage, completion, and technical retry flows remain unchanged except for accepting and validating the new canonical schema version.

**Tech Stack:** TypeScript, Zod, Vitest, Markdown prompt bundles, PostgreSQL/Supabase migrations, Playwright PDF rendering.

**Spec:** `docs/superpowers/specs/2026-08-24-grounded-interest-research-design.md`

## Global Constraints

- Preserve the GitHub Actions finisher architecture and delivery lifecycle unchanged.
- Do not redesign claiming, submission, rendering, storage, completion, or technical retry behavior.
- Modify finisher-side code only where strictly required for canonical schema compatibility or deterministic validation of grounding metadata.
- Every newly authored production `2.3.0` package has non-null real grounding; there is no N/A escape hatch.
- Every claim contains `id`, `factIds`, `location`, and `text`; `location` resolves to canonical authored prose and that field contains `text` exactly.
- `temporalMode` is exactly `evergreen` or `current`; current grounding requires `researchedAt`, supporting source publication dates, and critic freshness review.
- Do not run a real production generation job.
- Do not use TDD; implement each coherent change directly, then run focused verification.

---

### Task 1: Canonical 2.3.0 grounding schema and deterministic validator

**Files:**
- Modify: `packages/generator/src/curriculum-package-schema.ts`
- Modify: `packages/generator/src/validate-curriculum-package.ts`
- Modify: `packages/generator/src/normalize-curriculum-package.ts`
- Modify: `packages/generator/src/curriculum-package.test.ts`
- Create: `packages/generator/src/fixtures/grounded-curriculum-packages.ts`

**Interfaces:**
- Produces: `GroundingSchema`, `CurriculumPackageV22Schema`, canonical `CurriculumPackageSchema` at version `2.3.0`, and validation issues for broken grounding references.
- Preserves: legacy `2.0.0`–`2.2.0` parsing/rendering behavior without synthesizing fake grounding.

- [ ] Define strict source, fact, claim, and grounding Zod objects with stable IDs, URL/date fields, fact classification, `temporalMode`, and `researchedAt`.
- [ ] Add a `2.3.0` canonical schema while retaining the prior `2.2.0` contract under an explicit legacy export.
- [ ] Resolve claim locations only through an allowlisted canonical prose-path grammar, reject missing/non-string destinations, require exact text containment, and verify every referenced fact and source ID.
- [ ] Enforce current-mode date requirements deterministically without guessing semantic recency; reject null/empty grounding and malformed ISO timestamps.
- [ ] Add basketball, anime, and technology grounded fixtures plus negative cases for dangling IDs, bad locations, mismatched prose, missing current publication dates, and generic/non-grounded `2.3.0` packages.
- [ ] Run `pnpm --filter @paper-english/generator test -- curriculum-package.test.ts` and confirm all schema/validator cases pass.
- [ ] Commit the coherent schema/validator change.

### Task 2: Research-aware quality audit and production prompt contract

**Files:**
- Modify: `packages/generator/src/audit-curriculum.ts`
- Modify: `packages/generator/src/audit-curriculum.test.ts`
- Create: `packages/generator/prompts/2.5.0/README.md`
- Create: `packages/generator/prompts/2.5.0/01-plan.md`
- Create: `packages/generator/prompts/2.5.0/02-author.md`
- Create: `packages/generator/prompts/2.5.0/03-critic.md`
- Create: `packages/generator/prompts/2.5.0/04-repair.md`

**Interfaces:**
- Consumes: validated `CurriculumPackageSchema` `2.3.0` and its grounding graph.
- Produces: audit findings and a coherent plan/author/critic/repair contract for explore → drill → verify lessons.

- [ ] Extend audits with deterministic grounding coverage and quality rules: concrete propositions, source diversity/authority metadata, claim coverage of primary reading, and current-mode freshness evidence.
- [ ] Author prompt `2.5.0` to require one batched public-web research phase after queue claim, privacy-safe generalized queries, factual/inference separation, 3–5 concrete propositions, copyright-safe synthesis, and grounded primary reading even for grammar-heavy weeks.
- [ ] Require critic and repair stages to preserve authored-prose claim bindings and to repair content or metadata together rather than weakening validation.
- [ ] Describe a future executor-neutral Responses API `web_search` adapter without coupling canonical packages to provider response shapes.
- [ ] Add audit tests proving the three grounded themes pass and thin/generic or stale-current metadata fails for explicit reasons.
- [ ] Run focused generator audit tests and confirm passing results.
- [ ] Commit the audit and prompt-version change.

### Task 3: Bundle compiler, product contract, and operating documentation

**Files:**
- Modify: `packages/generator/src/bundle-compiler.ts`
- Modify: `packages/generator/src/bundle-compiler.test.ts`
- Modify: `packages/generator/bundles/production-authoring-bundle.md`
- Modify: `docs/product-rules.md`
- Modify: `docs/curriculum-quality-rubric.md`
- Modify: `docs/chatgpt-work-daily-schedule.md`
- Modify: `docs/SPEC.md`
- Modify only if a heading changes: `docs/SPEC-TOC.md`

**Interfaces:**
- Consumes: prompt `2.5.0` and canonical schema `2.3.0`.
- Produces: deterministic compiled production bundle and synchronized product/operations rules.

- [ ] Point bundle compilation and metadata at prompt `2.5.0` and schema `2.3.0`; keep all source ordering and deterministic compilation rules intact.
- [ ] Update bundle tests for the new versions and required grounding clauses, then regenerate the committed bundle through the existing compiler command.
- [ ] Update product rules, rubric, schedule, and relevant SPEC sections to define real grounding, prose-bound claims, temporal classification, privacy-safe batch research, freshness criticism, and the existing single-claim delivery lifecycle.
- [ ] Verify numbered SPEC headings still match `SPEC-TOC.md`; edit the TOC only if a heading was added, removed, renamed, or renumbered.
- [ ] Run the bundle compiler/check and focused bundle tests.
- [ ] Commit the bundle and documentation change.

### Task 4: Submission bridge compatibility without lifecycle redesign

**Files:**
- Create: `supabase/migrations/20260824xxxxxx_accept_curriculum_schema_230.sql`
- Modify only if required: `packages/worker/src/submission-processor.ts`
- Modify: `packages/worker/src/submission-processor.test.ts`
- Do not modify: `.github/workflows/finish-curriculum-submissions.yml`

**Interfaces:**
- Consumes: canonical `2.3.0` JSON already validated by the generator package.
- Preserves: existing claim → process submission → render → upload → complete sequence and technical retry behavior.

- [ ] Add the smallest forward migration that changes only the bridge's accepted canonical schema version/constraint from `2.2.0` to `2.3.0`, copying the established SQL function/constraint pattern without altering queue state transitions.
- [ ] Change worker code only if its schema-version assertion is hard-coded; rely on shared canonical validation for grounding errors.
- [ ] Add worker coverage showing a valid `2.3.0` grounded package proceeds through the same mocked delivery calls and invalid grounding fails before rendering/upload/completion.
- [ ] Assert the workflow file is byte-for-byte untouched and existing retry/state tests remain green.
- [ ] Run focused worker and relevant Supabase database tests.
- [ ] Commit the compatibility migration and tests.

### Task 5: Deterministic rendering and synthetic generation compatibility

**Files:**
- Modify: `packages/pdf/src/generate-synthetic.ts`
- Modify: `packages/pdf/src/render-curriculum-package.test.ts`
- Modify as fixtures require: `packages/generator/src/fixtures/synthetic-week-1.ts`

**Interfaces:**
- Consumes: valid grounded `2.3.0` packages.
- Preserves: student/parent PDF content architecture; grounding remains internal and does not add engineering citations to learner-facing PDFs.

- [ ] Move synthetic canonical input to a valid grounded `2.3.0` fixture without changing renderer layout or output destinations.
- [ ] Verify metadata is ignored by learner-facing renderers and repeated rendering remains deterministic.
- [ ] Run focused PDF tests and `pnpm generate:synthetic`; inspect generated PDF page/image checks through the existing verification path.
- [ ] Commit synthetic/PDF compatibility changes.

### Task 6: Completion audit, delivery, and production migration verification

**Files:**
- Review: all files changed by Tasks 1–5

**Interfaces:**
- Produces: verified, pushed implementation and—because a migration is included—verified linked production migration history.

- [ ] Compare the final diff line-by-line with the approved design, especially prose binding, temporal requirements, mandatory grounding, privacy/copyright, and finisher non-redesign constraints.
- [ ] Run `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`, the production bundle consistency command, and `pnpm generate:synthetic`.
- [ ] Run `git diff --exit-code -- .github/workflows/finish-curriculum-submissions.yml` to prove the GitHub Actions finisher definition is unchanged.
- [ ] Run the repository's migration tests and inspect the new migration for unchanged claim/completion/retry semantics.
- [ ] Commit any verification-driven corrections, then push the current branch to its existing upstream without force.
- [ ] Apply the pending Supabase migration chain to the linked production database and verify remote migration history; do not deploy Edge Functions unless an Edge Function actually changed.
- [ ] Report exact verification commands/results, commit hashes, push status, and production migration status.

