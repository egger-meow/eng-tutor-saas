# Wave 3: Low Model Reliability + Finisher Reform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable lower-cost / lighter LLMs (e.g. GPT-4o-mini, Claude 3.5 Haiku, Gemini 1.5 Flash) to reliably produce production-grade curriculum packages without failing Finisher on trivial arithmetic or cross-token memory limits, by introducing deterministic normalization, 3-tier Finisher classification, low-model authoring scaffolds (micro contrastive few-shot, local Q&A protocol, simple evidence recipes) under versioned Prompt 2.2.0, and an ablation + multi-model benchmark finding the quality-per-dollar frontier.

**Core Principles & Non-Negotiable Invariants:**
1. **Deterministic Normalization Principle:** *Only derive information for which there is exactly one deterministic correct value. Computer may calculate. Computer may not invent pedagogy.*
2. **Explicitly Rejected Anti-Patterns (NO-GO):**
   - ❌ No Regex jargon auto-replacement (personalization jargon remains a semantic failure).
   - ❌ No fuzzy ID guessing (`q12` vs `q21` must fail closed; guessing incorrectly is catastrophic).
   - ❌ No auto-inventing missing opening goals.
   - ❌ No downgrading cross-stage target evidence from error to warning.
3. **Prompt Versioning & Immutability:**
   - `prompts/2.1.0/` remains frozen and protected by hash contract tests.
   - Create `prompts/2.2.0/` with authoring scaffolds.
   - `schemaVersion = 2.0.0` (unchanged), `promptVersion = 2.2.0`, `bundleVersion = 2.2.0-prod`.

---

## 4-Pillar Wave 3 Architecture

```text
Wave 3
├── Pillar 1: Deterministic Normalization
│   └── Auto-derive machine values: reading.wordCount = countWords(paragraphs)
│
├── Pillar 2: Finisher 3-Tier Rule Reform
│   ├── Tier 1: AUTO-DERIVED (Server calculates/normalizes)
│   ├── Tier 2: STRUCTURAL CRITICAL (Schema, duplicate IDs, missing answers)
│   └── Tier 3: SEMANTIC CRITICAL (Cross-stage targets, Chinese scaffolding, zero jargon)
│
├── Pillar 3: Low-Model Authoring Scaffold (Prompt 2.2.0)
│   ├── Micro Contrastive Few-Shot (BAD ➔ GOOD for mental models & CAP items)
│   ├── Local Question-Answer Authoring Protocol (Internal Q&A pairing before projection)
│   └── Simple Target Evidence Recipes (Grammar, Reading, Vocabulary recipes)
│
└── Pillar 4: Ablation & Multi-Model Benchmark
    ├── Ablation variants: 2.1.0 ➔ +normalize ➔ +few-shot ➔ +local Q&A ➔ Full 2.2.0
    ├── Model tiers: Strong (4o/Sonnet), Medium (4o-mini/Haiku), Cheap (Flash/Llama)
    └── Metrics: First-pass pass rate, repair rate, semantic score (/35), struct fails, cost
```

---

## File Structure

```text
packages/generator/
├── prompts/
│   ├── 2.0.1/                               # FROZEN baseline
│   ├── 2.1.0/                               # FROZEN Wave 2
│   └── 2.2.0/                               # NEW Wave 3 Prompts
│       ├── 01-plan.md                       # Simple evidence recipes
│       ├── 02-author.md                     # Micro contrastive few-shot & local Q&A protocol
│       ├── 03-critic.md                     # Semantic adversarial audit
│       ├── 04-repair.md                     # Targeted surgical repair
│       └── README.md                        # Version documentation
├── bundles/
│   └── production-authoring-bundle.md       # Compiled from prompts/2.2.0 (v2.2.0-prod)
├── src/
│   ├── normalize-curriculum-package.ts      # [NEW] Normalization engine (wordCount calculation)
│   ├── validate-curriculum-package.ts       # [MODIFY] Normalization before structural validation
│   ├── audit-curriculum.ts                  # [MODIFY] 3-tier audit categorization
│   ├── bundle-compiler.ts                   # [MODIFY] Point to prompts/2.2.0 with frozen 2.1.0 checks
│   ├── bundle-compiler.test.ts              # [MODIFY] Anti-drift & frozen baseline tests
│   ├── finisher-tiers.test.ts               # [NEW] Finisher 3-tier classification tests
│   └── fixtures/
│       └── multi-model-matrix.ts            # [NEW] Model parameters and ablation definitions
├── scripts/
│   └── run-model-matrix-benchmark.ts        # [NEW] Multi-model & ablation benchmark runner
└── docs/
    └── evaluations/
        └── wave-3/
            ├── model-matrix-evaluation.md   # [NEW] Quality-per-dollar & Ablation Report
            └── manifest.json                # [NEW] Hashes, models, and run provenance
```

---

### Task 1: Implement Deterministic Normalization Layer

**Files:**
- Create: `packages/generator/src/normalize-curriculum-package.ts`
- Modify: `packages/generator/src/validate-curriculum-package.ts`

**Interfaces:**
- Consumes: Raw `CurriculumPackage` input.
- Normalizes:
  - `studentLesson.reading.wordCount = countWords(reading.paragraphs)`
- Invariant: Only derives information for which there is exactly one deterministic correct value.

- [ ] **Step 1: Write `normalize-curriculum-package.ts`**

```typescript
export function countWords(paragraphs: string[]): number {
  return paragraphs.join(' ').trim().split(/\s+/u).filter(Boolean).length
}

export function normalizeCurriculumPackage(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const pkg = structuredClone(input) as any
  if (pkg.studentLesson?.reading?.paragraphs && Array.isArray(pkg.studentLesson.reading.paragraphs)) {
    pkg.studentLesson.reading.wordCount = countWords(pkg.studentLesson.reading.paragraphs)
  }
  return pkg
}
```

- [ ] **Step 2: Update `validateCurriculumPackage()`**

Run normalization before Zod schema validation and relationship checks so LLMs never fail on word count arithmetic.

- [ ] **Step 3: Commit**

```bash
git add packages/generator/src/normalize-curriculum-package.ts packages/generator/src/validate-curriculum-package.ts
git commit -m "feat(generator): add deterministic normalization layer for wordCount"
```

---

### Task 2: 3-Tier Finisher Classification & Tiered Audit

**Files:**
- Modify: `packages/generator/src/audit-curriculum.ts`
- Create: `packages/generator/src/finisher-tiers.test.ts`

**Interfaces:**
- Categorizes all findings into:
  - `tier: 'auto-derived' | 'structural-critical' | 'semantic-critical'`
- Enforces:
  - `structural-critical`: missing answers, unknown targets, duplicate IDs, schema corruption fail closed.
  - `semantic-critical`: targets across >= 2 stages with >= 1 independent/retrieval/homework observation, Chinese scaffolding, zero developer jargon.
  - Zero fuzzy guessing.

- [ ] **Step 1: Update `audit-curriculum.ts` with explicit tier metadata**

- [ ] **Step 2: Write tests in `finisher-tiers.test.ts`**

Verify that:
1. `wordCount` difference is auto-normalized and passes.
2. Duplicate IDs and missing answers fail as `structural-critical`.
3. Single-stage target coverage fails as `semantic-critical`.
4. Personalization jargon fails as `semantic-critical`.
5. Fuzzy IDs (`q12` vs `q21`) fail closed.

- [ ] **Step 3: Run vitest**

Run: `npx vitest run packages/generator/src/finisher-tiers.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/generator/src/audit-curriculum.ts packages/generator/src/finisher-tiers.test.ts
git commit -m "feat(generator): categorize finisher rules into 3 explicit tiers"
```

---

### Task 3: Author Prompts 2.2.0 (Low-Model Authoring Scaffold)

**Files:**
- Create: `packages/generator/prompts/2.2.0/README.md`
- Create: `packages/generator/prompts/2.2.0/01-plan.md`
- Create: `packages/generator/prompts/2.2.0/02-author.md`
- Create: `packages/generator/prompts/2.2.0/03-critic.md`
- Create: `packages/generator/prompts/2.2.0/04-repair.md`
- Modify: `packages/generator/src/bundle-compiler.ts`
- Modify: `packages/generator/src/bundle-compiler.test.ts`
- Generate: `packages/generator/bundles/production-authoring-bundle.md`

**Interfaces:**
- Produces: `prompts/2.2.0/*` with:
  1. **Micro Contrastive Few-Shot (BAD ➔ GOOD)**: ~250 tokens demonstrating (a) Trigger-Pattern-Trap-Try grammar mental models, and (b) CAP reading item + distractors + parent explanation + primary trap.
  2. **Local Question-Answer Authoring Protocol**: Author question + options + answer + explanation + misconception locally together, then project to separated `practice.questions` and `answers` arrays.
  3. **Simplified Target Evidence Recipes**:
     - Grammar: `guided ➔ independent ➔ one later retrieval/homework check`
     - Reading: `independent/detail or inference ➔ CAP-transfer`
     - Vocabulary/review: `practice exposure ➔ delayed retrieval/homework`
- Recompiles `production-authoring-bundle.md` with `bundleVersion: "2.2.0-prod"`, `promptVersion: "2.2.0"`.
- Protects `prompts/2.1.0/` and `prompts/2.0.1/` as frozen baselines.

- [ ] **Step 1: Write `prompts/2.2.0/*` files**

- [ ] **Step 2: Update `bundle-compiler.ts` to compile from `prompts/2.2.0/` and verify frozen 2.1.0 hashes**

- [ ] **Step 3: Recompile production bundle**

Run: `node_modules/.pnpm/node_modules/.bin/tsx.CMD packages/generator/scripts/compile-production-bundle.ts`

- [ ] **Step 4: Update `bundle-compiler.test.ts` and verify token budget (<4,000 words)**

Run: `npx vitest run packages/generator/src/bundle-compiler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/generator/prompts/2.2.0/ packages/generator/src/bundle-compiler.ts packages/generator/src/bundle-compiler.test.ts packages/generator/bundles/production-authoring-bundle.md
git commit -m "feat(generator): introduce prompts 2.2.0 with low-model authoring scaffolds"
```

---

### Task 4: Multi-Model & Ablation Benchmark Matrix

**Files:**
- Create: `packages/generator/src/fixtures/multi-model-matrix.ts`
- Create: `packages/generator/scripts/run-model-matrix-benchmark.ts`
- Generate: `docs/evaluations/wave-3/model-matrix-evaluation.md`
- Generate: `docs/evaluations/wave-3/manifest.json`
- Create: `packages/generator/src/wave3-benchmark.test.ts`

**Interfaces:**
- Evaluates across 5 Golden Benchmark Contexts:
  - **Ablation Track**:
    - Variant 1: `2.1.0 baseline`
    - Variant 2: `+ normalization only`
    - Variant 3: `+ micro contrastive few-shot`
    - Variant 4: `+ local Q&A protocol`
    - Variant 5: `full 2.2.0`
  - **Model Tiers**:
    - Strong: GPT-4o / Claude 3.5 Sonnet
    - Medium: GPT-4o-mini / Claude 3.5 Haiku
    - Cheap: Gemini 1.5 Flash / Llama-3-70B
- Outputs:
  - 1st-Pass Pass Rate (%)
  - Repair Rate (%)
  - Semantic Quality Score (/35)
  - Structural Failures Count
  - Generation Cost per Package ($)
  - Quality-per-Dollar Frontier Ranking

- [ ] **Step 1: Write `multi-model-matrix.ts` and `run-model-matrix-benchmark.ts`**

- [ ] **Step 2: Run benchmark runner script to generate `model-matrix-evaluation.md` and `manifest.json`**

Run: `node_modules/.pnpm/node_modules/.bin/tsx.CMD packages/generator/scripts/run-model-matrix-benchmark.ts`

- [ ] **Step 3: Write and run `wave3-benchmark.test.ts` to assert manifest and hash integrity**

Run: `npx vitest run packages/generator/src/wave3-benchmark.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/evaluations/wave-3/ packages/generator/src/fixtures/multi-model-matrix.ts packages/generator/scripts/run-model-matrix-benchmark.ts packages/generator/src/wave3-benchmark.test.ts
git commit -m "docs(eval): publish Wave 3 ablation and multi-model benchmark matrix"
```

---

### Task 5: Full System Verification & Regression Guard

**Files:**
- Test: Full repository test suite (`npx vitest run --exclude **/dist/**`)
- Test: Synthetic PDF rendering proof (`generate:synthetic`)

- [ ] **Step 1: Run full test suite**

Ensure all 35+ test files pass cleanly.

- [ ] **Step 2: Run synthetic PDF generation**

Ensure PDF generation produces clean Student and Parent PDFs.

- [ ] **Step 3: Commit final Wave 3 release**

```bash
git commit -m "chore(release): complete Wave 3 finisher reform and low-model reliability upgrade"
```

---

## Verification Plan

### Automated Tests
- `npx vitest run packages/generator/src/finisher-tiers.test.ts` (3-tier Finisher rules & normalization)
- `npx vitest run packages/generator/src/bundle-compiler.test.ts` (Frozen 2.0.1 & 2.1.0 baselines, active 2.2.0 bundle hashes)
- `npx vitest run packages/generator/src/wave3-benchmark.test.ts` (Wave 3 manifest & benchmark hash integrity)
- `npx vitest run --exclude **/dist/**` (Full workspace test suite)
- `.\node_modules\.pnpm\node_modules\.bin\tsx.CMD packages/pdf/src/generate-synthetic.ts` (Deterministic PDF rendering proof)

### Benchmark Inspection
- Review `docs/evaluations/wave-3/model-matrix-evaluation.md` to verify the quality-per-dollar frontier and ablation progression across all 5 variants and 3 model tiers.
