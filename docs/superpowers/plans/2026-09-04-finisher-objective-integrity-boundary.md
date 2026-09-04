# Finisher Objective-Integrity Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Finisher hard-fail only machine-provable integrity violations and prevent future pseudo-semantic audit rules from silently becoming production blockers.

**Architecture:** Keep the strict curriculum audit rich for Author/Critic diagnostics, but centralize Finisher blocking authority in an explicit allowlist policy. Remove semantic bookkeeping checks that bypass that policy in schema validation and remove context-heuristic grammar progression rejection from the worker hard-fail path. Preserve objective schema/reference/provenance/answer/release/render/storage invariants.

**Tech Stack:** TypeScript, Zod, Vitest, pnpm workspace, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-04-finisher-objective-integrity-boundary-design.md`

## Global Constraints

- Current production schema remains `2.4.0` and prompt remains `2.11.1` unless an existing build artifact compiler requires metadata regeneration.
- Do not mutate production jobs or Supabase state.
- Do not weaken release/version, PDF rendering/inspection, storage, job/child identity, answer-key/reference, grounding provenance, or canonical ID integrity.
- Strict semantic audit findings remain available as diagnostics even when Finisher downgrades them to warnings.
- New audit criticals default to advisory unless explicitly classified as machine-provable blockers.

---

### Task 1: Lock the Finisher policy regressions

**Files:**
- Modify: `packages/generator/src/finisher-audit-policy.test.ts`
- Existing regression: `packages/generator/src/evidence-boundary-quoted-instruction-regression.test.ts`

**Interfaces:**
- Consumes: `applyFinisherAuditPolicy(report, pkgInput?)`.
- Produces: regression expectations defining default advisory behavior and retained objective blockers.

- [ ] **Step 1: Add failing policy tests**

Add cases proving an unknown semantic critical, retrieval-stage critical, CAP relevance/depth/copy heuristic, and self-study heuristic are downgraded by default, while bare lookup, CAP provenance, evidence binding, objective genre mismatch, grounding timestamp contradiction, and reproducibility provenance stay critical.

- [ ] **Step 2: Verify RED**

Run the generator test suite for the policy/evidence regression files. Expected: at least the unknown semantic critical and quoted `I am` cases fail against current main behavior.

- [ ] **Step 3: Commit tests only**

Commit the red regression boundary before production policy changes.

---

### Task 2: Convert Finisher audit policy to an explicit blocker allowlist

**Files:**
- Modify: `packages/generator/src/finisher-audit-policy.ts`
- Modify if necessary: `packages/generator/src/finisher-audit-policy.test.ts`

**Interfaces:**
- Consumes: `CurriculumAuditFinding` from strict `auditCurriculumPackage`.
- Produces: `applyFinisherAuditPolicy()` with default-warning semantics for non-objective criticals.

- [ ] **Step 1: Implement a small pure `isObjectiveFinisherFinding()` classifier**

Classify only exact objective dimensions/prefixes documented in the design. Unknown critical findings return false.

- [ ] **Step 2: Replace exception-based downgrade logic**

For every strict finding with `severity === 'critical'`, preserve critical only when `isObjectiveFinisherFinding()` is true; otherwise convert to warning. Recompute `passed` from post-policy severities.

- [ ] **Step 3: Remove semantic recall-classification rescue complexity if no longer needed**

Bare lexical lookup remains hard through `lexical-retrieval-quality`; CAP recall classification becomes advisory unless an independent objective invariant fails.

- [ ] **Step 4: Run focused tests**

Expected: all policy tests pass.

---

### Task 3: Fix quoted instruction overlap false positive

**Files:**
- Modify: `packages/generator/src/cap-precedent-audit.ts`
- Test: `packages/generator/src/evidence-boundary-quoted-instruction-regression.test.ts`
- Preserve: `packages/generator/src/finisher-calibration-regression.test.ts`

**Interfaces:**
- Consumes: `quoteClaimsPassageSource(prompt, rawQuoted)`.
- Produces: `auditReadingEvidenceBoundary()` only emits quote-based `EVIDENCE_BOUNDARY_LEAKAGE` when the quote is actually attributed to the reading.

- [ ] **Step 1: Change the quote-overlap branch**

Require `quoteClaimsPassageSource(question.prompt, rawQuoted)` before turning instruction-only quote overlap into `EVIDENCE_BOUNDARY_LEAKAGE`.

- [ ] **Step 2: Keep declared evidence-anchor leakage strict**

Do not change anchor location/text verification.

- [ ] **Step 3: Run evidence/CAP calibration tests**

Expected: `Use "I am" ...` passes; explicit reading attribution still fails; constructed-speaker quote tests remain green.

---

### Task 4: Remove semantic bookkeeping from structural validation

**Files:**
- Modify: `packages/generator/src/validate-curriculum-package.ts`
- Add/modify tests in: `packages/generator/src/curriculum-package.test.ts` or a focused regression file.

**Interfaces:**
- Consumes: canonical schema-parsed package.
- Produces: validation issues limited to structural/reference/integrity invariants plus unresolved explicit critical Critic findings.

- [ ] **Step 1: Add failing tests**

Prove a package does not fail solely because one arbitrary `criticalChecks` entry has `passed: false`, and a current-grounded package does not fail solely because an exact `grounding-freshness` label is absent.

- [ ] **Step 2: Preserve unresolved critical Critic finding rejection**

Add/retain a regression proving `criticFindings.severity === 'critical' && resolution == null` remains a validation failure.

- [ ] **Step 3: Remove blanket all-checks-pass validation**

Delete the relationship issue requiring every `criticalChecks` record to pass.

- [ ] **Step 4: Remove exact grounding-freshness label requirement**

Keep current grounding timestamp/publication metadata integrity checks intact.

- [ ] **Step 5: Run focused validation tests**

Expected: bookkeeping regressions pass and objective reference/provenance tests remain green.

---

### Task 5: Remove semantic grammar progression heuristic from worker hard failures

**Files:**
- Modify: `packages/worker/src/pipeline.ts`
- Modify/add tests: `packages/worker/src/feedback-authority-regression.test.ts` or a focused worker regression file.

**Interfaces:**
- Consumes: `forwardProgressionIssues(pkg, context)`.
- Produces: only objective vocabulary exposure/status/tracking consistency findings in the hard-rejection list.

- [ ] **Step 1: Add a failing regression**

Create a previously exposed grammar-primary case with no deterministic feedback match and assert it does not produce a hard progression issue.

- [ ] **Step 2: Preserve vocabulary integrity regression**

Keep never-exposed vocabulary labeled `review` as a hard issue.

- [ ] **Step 3: Remove the grammar-primary heuristic hard finding**

Do not move it into another deterministic blocker. Author/Critic owns that pedagogical decision.

- [ ] **Step 4: Run worker progression tests**

Expected: grammar case passes; vocabulary integrity case still fails as intended.

---

### Task 6: Full Finisher boundary verification and bundle consistency

**Files:**
- Inspect: `packages/generator/bundles/production-authoring-bundle.md`
- Update generated bundle only if repository compiler/test requires it because source contract content changed.

**Interfaces:**
- Produces: repository-wide evidence that no known pseudo-semantic path still bypasses the policy.

- [ ] **Step 1: Search all production `QUALITY_REJECTED` entry points**

Verify only schema/reference validation, objective forward progression, and policy-filtered audit can create curriculum quality rejection in the Finisher path.

- [ ] **Step 2: Run full verification**

Run:

```text
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

Expected: all pass; pre-existing warnings may remain but no new errors.

- [ ] **Step 3: Review final diff**

Confirm no production job/Supabase mutation, no unrelated feature change, and no objective release/render/storage integrity weakening.

- [ ] **Step 4: Merge to main**

Merge only after full CI succeeds and re-read current main SHA after merge.
