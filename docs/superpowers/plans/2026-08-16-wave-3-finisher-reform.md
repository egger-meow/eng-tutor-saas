# Wave 3: Low Model Reliability + Finisher Reform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable lower-cost / lighter LLMs to reliably produce high-quality curriculum packages by reforming the Finisher and Authoring procedures to reduce structural cognitive load (auto-deriving mechanical fields like `wordCount`, classifying Finisher checks into 3 distinct tiers, eliminating fuzzy ID risks, and preserving strict pedagogical quality constraints) and benchmarking multi-model quality-per-dollar frontiers.

**Core Philosophy:**
- Lower cognitive/structural burden on LLMs; do **NOT** lower the pedagogical quality bar.
- Do not make Finisher guess with fuzzy ID matching (`q12` vs `q21` false matches are catastrophic).
- Auto-derive machine-computable values (e.g. `wordCount`) on the server/finisher.
- Preserve all structural invariants (duplicate IDs, missing answers, schema corruption fail closed) and semantic quality invariants (target cross-stage evidence, distraction plausibility, self-study continuity).

---

## 3-Tier Finisher Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. AUTO-DERIVED (Server / Normalizer Computes)              │
│ - reading.wordCount = actual paragraph word count           │
│ - summary statistics & derived counter normalizations       │
├─────────────────────────────────────────────────────────────┤
│ 2. STRUCTURAL CRITICAL (Deterministic Fail-Closed Checks)    │
│ - Schema syntax & Zod validation                            │
│ - Duplicate question / answer IDs                           │
│ - 1:1 Question-to-Answer ID mapping (no missing/dangling)   │
│ - Unknown learning target references                        │
│ - Written response writingLines > 0                         │
├─────────────────────────────────────────────────────────────┤
│ 3. SEMANTIC CRITICAL (Pedagogical Quality Invariants)       │
│ - All learning targets have >= 2 stage observations         │
│ - Targets have >= 1 independent/transfer/retrieval/homework │
│ - All 5 pedagogical stages present (guided..retrieval)      │
│ - Minimum Chinese scaffolding on goals, instructions, tips  │
│ - Zero forbidden developer jargon in parent personalization  │
│ - Answer explanation brevity and non-tautology              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```text
packages/generator/
├── src/
│   ├── normalize-curriculum-package.ts      # [NEW] Auto-derivation & normalization layer
│   ├── validate-curriculum-package.ts       # [MODIFY] 3-tier validation (auto-derive wordCount)
│   ├── audit-curriculum.ts                  # [MODIFY] Tiered audit findings (Structural vs Semantic)
│   ├── finisher-tiers.test.ts               # [NEW] Unit tests for 3-tier Finisher classification
│   └── fixtures/
│       └── multi-model-matrix.ts            # [NEW] Multi-model cost & latency parameters
├── scripts/
│   └── run-model-matrix-benchmark.ts        # [NEW] Quality-per-dollar frontier evaluation script
└── docs/
    └── evaluations/
        └── wave-3/
            ├── model-matrix-evaluation.md   # [NEW] Multi-Model Benchmark Matrix Report
            └── manifest.json                # [NEW] Model matrix hashes and metrics
```

---

### Task 1: Create Normalization & Auto-Derivation Layer

**Files:**
- Create: `packages/generator/src/normalize-curriculum-package.ts`
- Modify: `packages/generator/src/validate-curriculum-package.ts`

**Interfaces:**
- Consumes: Raw / partially-computed `CurriculumPackage` input.
- Normalizes:
  - `reading.wordCount`: Automatically computed as `countWords(reading.paragraphs)`.
- Produces: Normalized package with exact derived properties guaranteed.

- [ ] **Step 1: Write `normalize-curriculum-package.ts`**

```typescript
export function normalizeCurriculumPackage(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const pkg = structuredClone(input) as any
  if (pkg.studentLesson?.reading?.paragraphs && Array.isArray(pkg.studentLesson.reading.paragraphs)) {
    const actualWords = countWords(pkg.studentLesson.reading.paragraphs)
    pkg.studentLesson.reading.wordCount = actualWords
  }
  return pkg
}
```

- [ ] **Step 2: Integrate normalization into `validateCurriculumPackage()`**

Ensure `validateCurriculumPackage()` normalizes auto-derived fields before structural and semantic validation, completely eliminating word count arithmetic failures for LLMs.

- [ ] **Step 3: Commit**

```bash
git add packages/generator/src/normalize-curriculum-package.ts packages/generator/src/validate-curriculum-package.ts
git commit -m "feat(generator): introduce normalization layer for auto-derived finisher fields"
```

---

### Task 2: Refactor Finisher Rules into 3 Explicit Tiers

**Files:**
- Modify: `packages/generator/src/audit-curriculum.ts`
- Create: `packages/generator/src/finisher-tiers.test.ts`

**Interfaces:**
- Categorizes all findings into:
  - `tier: 'auto-derived' | 'structural-critical' | 'semantic-critical'`
- Preserves all pedagogical quality thresholds (targets appearing across >= 2 stages with >= 1 independent/retrieval/homework observation; Chinese scaffolding; jargon detector).

- [ ] **Step 1: Update `audit-curriculum.ts` with explicit tier metadata**

Add `tier` to `CurriculumAuditFinding`:
```typescript
export type CurriculumAuditTier = 'auto-derived' | 'structural-critical' | 'semantic-critical'
export type CurriculumAuditFinding = {
  tier: CurriculumAuditTier
  dimension: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}
```

- [ ] **Step 2: Write comprehensive tests in `finisher-tiers.test.ts`**

Assert:
1. WordCount mismatch is auto-normalized and does NOT fail validation.
2. Structural failures (duplicate ID, missing answer, unknown target) fail with `structural-critical`.
3. Pedagogical failures (target in only 1 stage, no retrieval stage, forbidden jargon) fail with `semantic-critical`.
4. No dangerous fuzzy matching occurs.

- [ ] **Step 3: Run vitest**

Run: `npx vitest run packages/generator/src/finisher-tiers.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/generator/src/audit-curriculum.ts packages/generator/src/finisher-tiers.test.ts
git commit -m "feat(generator): categorize finisher rules into 3 explicit tiers"
```

---

### Task 3: Multi-Model Quality-per-Dollar Golden Evaluation Matrix

**Files:**
- Create: `packages/generator/src/fixtures/multi-model-matrix.ts`
- Create: `packages/generator/scripts/run-model-matrix-benchmark.ts`
- Generate: `docs/evaluations/wave-3/model-matrix-evaluation.md`
- Generate: `docs/evaluations/wave-3/manifest.json`

**Interfaces:**
- Evaluates 3 model tiers across the 5 Golden Benchmark Contexts:
  - **Strong Tier**: GPT-4o / Claude 3.5 Sonnet ($2.50 / $10.00 per 1M tokens)
  - **Medium Tier**: GPT-4o-mini / Claude 3.5 Haiku ($0.15 / $0.60 per 1M tokens)
  - **Cheap Tier**: Gemini 1.5 Flash / Llama-3-70B ($0.075 / $0.30 per 1M tokens)
- Metrics recorded:
  - 1st-Pass Finisher Pass Rate (%)
  - Average Repair Attempts (0–2)
  - Semantic Quality Score (out of 35)
  - Average Token Cost per Weekly Package ($)
  - Quality-per-Dollar Frontier Index

- [ ] **Step 1: Write `multi-model-matrix.ts` and `run-model-matrix-benchmark.ts`**

- [ ] **Step 2: Execute benchmark runner script**

Run: `node_modules/.pnpm/node_modules/.bin/tsx.CMD packages/generator/scripts/run-model-matrix-benchmark.ts`

- [ ] **Step 3: Document findings in `docs/evaluations/wave-3/model-matrix-evaluation.md`**

- [ ] **Step 4: Commit**

```bash
git add docs/evaluations/wave-3/ packages/generator/scripts/run-model-matrix-benchmark.ts packages/generator/src/fixtures/multi-model-matrix.ts
git commit -m "docs(eval): publish Wave 3 multi-model quality-per-dollar evaluation matrix"
```

---

### Task 4: Full Workspace Verification & Anti-Drift Check

**Files:**
- Test: Full repository test suite (`npx vitest run --exclude **/dist/**`)
- Test: Synthetic PDF rendering (`generate:synthetic`)

- [ ] **Step 1: Run full test suite**

Ensure all 35+ test files pass cleanly.

- [ ] **Step 2: Verify deterministic PDF rendering**

Ensure synthetic PDFs render with zero errors.

- [ ] **Step 3: Commit final Wave 3 release**

```bash
git commit -m "chore(release): complete Wave 3 finisher reform and low-model reliability upgrade"
```

---

## Verification Plan

### Automated Tests
- `npx vitest run packages/generator/src/finisher-tiers.test.ts` (Finisher 3-tier rule assertions & auto-derivation)
- `npx vitest run packages/generator/src/golden-benchmark.test.ts` (Golden benchmark suite integrity)
- `npx vitest run --exclude **/dist/**` (Full workspace test suite)
- `.\node_modules\.pnpm\node_modules\.bin\tsx.CMD packages/pdf/src/generate-synthetic.ts` (PDF rendering proof)

### Benchmark Inspection
- Review `docs/evaluations/wave-3/model-matrix-evaluation.md` to confirm the quality-per-dollar frontier across Strong, Medium, and Cheap model tiers.
