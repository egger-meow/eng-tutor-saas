# Wave 2: Pedagogical Quality & CAP Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given the same learner evidence and the same CurriculumPackage 2.0.0 structure, Prompt 2.1.0 must produce materially better teaching explanations, more diagnostic CAP-style questions, more plausible distractors, and more useful parent answer rationales than frozen Prompt 2.0.1, without increasing structural complexity or crossing into Wave 4.

**Architecture:**
1. **Prompt Versioning (`2.1.0`)**: Freeze `prompts/2.0.1/` as an immutable audit baseline with byte-for-byte hash assertions. Create `prompts/2.1.0/` containing upgraded planning, authoring, critic, and repair procedures.
2. **Pedagogical Procedures Engine (Cognitive Architecture, not UI templates)**:
   - `01-plan.md` (v2.1.0): Establishes planning obligations without schema alterations (addresses language need, reading-reasoning appropriate to level, and due retrieval when justified).
   - `02-author.md` (v2.1.0):
     - **Grammar Teaching**: Internal `Trigger → Pattern → Trap → Try` reasoning rendered in natural Traditional Chinese without forcing rigid UI section headers.
     - **CAP Distractor Quality**: Invariant that every distractor must represent a specific, plausible student reasoning mistake (drawing from 7 reference mechanisms when natural, rather than mechanical taxonomy quotas).
     - **Parent Answer Sharpness**: Actionable evidence-based reason + primary trap de-biasing only when genuinely useful; explicitly banning tautological ("because C is correct") explanations.
   - `03-critic.md` (v2.1.0): Adversarially catches tautological explanations, silly giveaway distractors, and lack of self-study continuity.
   - `04-repair.md` (v2.1.0): Targeted repair instructions for distractor and explanation sharpening.
3. **Automated Contract & Regression Tests**: Verify prompt contracts, anti-drift hashes, schema `2.0.0` preservation, zero Wave 4 leakage, and token regression bounds (< 4,000 words).
4. **Golden Pedagogical Evaluation**: Establish 5 standard child contexts (A, B, C, D, E) and document a side-by-side evaluation artifact (`docs/evaluations/2026-08-16-wave-2-golden-evaluation.md`) assessing the 7 pedagogical dimensions.

**Tech Stack:** TypeScript, Node.js, Vitest, Zod.

**Spec:** [docs/SPEC.md](file:///c:/IDEA/eng-tutor-saas/docs/SPEC.md) (Sections 46–87, 204, 205, 210), [Taiwan CAP English Exam Guidelines](https://cap.rcpet.edu.tw/test4-3.html).

---

## Global Constraints & Invariants

- **ZERO SCHEMA MUTATION**: `schemaVersion` remains strictly `2.0.0`. No new target type fields or schema changes.
- **ZERO WAVE 4 LEAKAGE**:
  - ❌ Dialogue / infographic / schedule genre formatting (Wave 4)
  - ❌ Topic rotation engine
  - ❌ PDF CSS or layout styling
  - ❌ Guided visual box CSS
  - ❌ Finisher auto-heal / fuzzy ID matching
- **FROZEN PROMPT 2.0.1**: `packages/generator/prompts/2.0.1/` is frozen and protected by hash contract tests.
- **TOKEN BUDGET GUARD**: Keep prompt additions concise and procedure-driven. Compiled bundle must not exceed 4,000 words.

---

## File Structure

```text
packages/generator/
├── prompts/
│   ├── 2.0.1/                               # FROZEN audit baseline
│   └── 2.1.0/                               # NEW Wave 2 Prompts
│       ├── 01-plan.md                       # Flexible target domain obligations
│       ├── 02-author.md                     # Trigger-Pattern-Trap-Try & Diagnostic Distractors
│       ├── 03-critic.md                     # Semantic adversarial audit
│       ├── 04-repair.md                     # Targeted repair
│       └── README.md                        # Prompt 2.1.0 documentation
├── bundles/
│   └── production-authoring-bundle.md       # Compiled from prompts/2.1.0 (v2.1.0-prod)
├── src/
│   ├── bundle-compiler.ts                   # Compiled for promptVersion 2.1.0
│   ├── bundle-compiler.test.ts              # Hash and anti-drift verification (2.0.1 frozen + 2.1.0 active)
│   ├── pedagogy-contract.test.ts            # Contract verification for Wave 2 rules & invariants
│   └── fixtures/
│       └── golden-contexts.ts               # 5 Canonical Child Contexts (A, B, C, D, E)
└── docs/
    └── evaluations/
        └── 2026-08-16-wave-2-golden-evaluation.md # 2.0.1 vs 2.1.0 Side-by-Side Evaluation Artifact
```

---

### Task 1: Freeze 2.0.1 Baseline & Author Prompts 2.1.0

**Files:**
- Create: `packages/generator/prompts/2.1.0/README.md`
- Create: `packages/generator/prompts/2.1.0/01-plan.md`
- Create: `packages/generator/prompts/2.1.0/02-author.md`
- Create: `packages/generator/prompts/2.1.0/03-critic.md`
- Create: `packages/generator/prompts/2.1.0/04-repair.md`

**Interfaces:**
- Consumes: CAP English pedagogical requirements, Trigger-Pattern-Trap-Try procedures.
- Produces: 4 versioned markdown prompts implementing the Wave 2 procedures.

- [ ] **Step 1: Write `packages/generator/prompts/2.1.0/README.md`**

```markdown
# Prompt Version 2.1.0 · Pedagogical Quality & CAP Alignment

Transforms abstract quality guidance into executable authoring procedures:
1. **Grammar Mental Models:** Trigger → Pattern → Trap → Try reasoning rendered naturally in Traditional Chinese without rigid header templates.
2. **CAP Distractor Invariant:** Every distractor must model a specific plausible student error (answering "what flawed student reasoning leads to this choice?").
3. **Parent Answer Rationale:** Evidence-based reason + primary trap de-biasing only when genuinely useful (banning tautological explanations).
4. **Learning Plan Target Obligations:** Prioritizes real student need (language foundation, reading reasoning, due retrieval) without rigid quotas or schema alterations.
```

- [ ] **Step 2: Write `packages/generator/prompts/2.1.0/01-plan.md`**

Incorporate target obligations within existing schema `2.0.0` (using existing `targets` array).

- [ ] **Step 3: Write `packages/generator/prompts/2.1.0/02-author.md`**

Incorporate:
- Internal `Trigger → Pattern → Trap → Try` mental model for grammar/language items, rendered in natural, varied Traditional Chinese.
- Distractor plausibility rule: each wrong option must correspond to a plausible learner error (drawing from reference mechanisms like partial evidence, wrong referent, reversed relationship, surface keyword match, unsupported reasonable inference, overgeneralization, grammar-form confusion).
- Parent answer sharp reasoning + primary trap misconception notes where useful.

- [ ] **Step 4: Write `packages/generator/prompts/2.1.0/03-critic.md` and `04-repair.md`**

Adversarial check against empty tautologies, distractor plausibility, and student self-study friction.

- [ ] **Step 5: Commit**

```bash
git add packages/generator/prompts/2.1.0/
git commit -m "feat(generator): create versioned prompt 2.1.0 for Wave 2"
```

---

### Task 2: Update Bundle Compiler & Anti-Drift Tests

**Files:**
- Modify: `packages/generator/src/bundle-compiler.ts`
- Modify: `packages/generator/src/bundle-compiler.test.ts`
- Generate: `packages/generator/bundles/production-authoring-bundle.md`

**Interfaces:**
- Produces: `production-authoring-bundle.md` with `bundleVersion: "2.1.0-prod"`, `promptVersion: "2.1.0"`, `schemaVersion: "2.0.0"`.

- [ ] **Step 1: Update `bundle-compiler.ts` to compile from `prompts/2.1.0/`**

Update `SOURCE_FILES` to point to `prompts/2.1.0/`.
Set `bundleVersion: '2.1.0-prod'`, `promptVersion: '2.1.0'`.

- [ ] **Step 2: Update `bundle-compiler.test.ts`**

Add tests verifying:
1. `prompts/2.0.1/` files remain byte-for-byte frozen against baseline sha256 checksums.
2. Compiled bundle compiles cleanly from `prompts/2.1.0/`.
3. Token count stays under 4,000 words (< 5,500 tokens).

- [ ] **Step 3: Recompile bundle**

Run: `node_modules/.pnpm/node_modules/.bin/tsx.CMD packages/generator/scripts/compile-production-bundle.ts`

- [ ] **Step 4: Run test**

Run: `npx vitest run packages/generator/src/bundle-compiler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/generator/src/bundle-compiler.ts packages/generator/src/bundle-compiler.test.ts packages/generator/bundles/production-authoring-bundle.md
git commit -m "feat(generator): upgrade production bundle compiler to 2.1.0-prod with frozen 2.0.1 baseline checks"
```

---

### Task 3: Automated Pedagogy Contract & Invariant Tests

**Files:**
- Create: `packages/generator/src/pedagogy-contract.test.ts`

**Interfaces:**
- Asserts contract guarantees:
  1. Prompt 2.1.0 contains Trigger-Pattern-Trap-Try procedure and forbids rigid header copy-pasting.
  2. Prompt 2.1.0 defines the distractor plausibility test.
  3. Prompt 2.1.0 explicitly bans tautological parent explanations.
  4. Schema remains strictly `2.0.0` (no new target type enums).
  5. No Wave 4 concepts (dialogue/genre systems, CSS layout, fuzzy ID auto-heal) are leaked.

- [ ] **Step 1: Write `pedagogy-contract.test.ts`**

- [ ] **Step 2: Run test**

Run: `npx vitest run packages/generator/src/pedagogy-contract.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/generator/src/pedagogy-contract.test.ts
git commit -m "test(generator): add pedagogy contract and invariant tests for Wave 2"
```

---

### Task 4: 5 Golden Child Contexts & Side-by-Side Semantic Evaluation

**Files:**
- Create: `packages/generator/src/fixtures/golden-contexts.ts`
- Create: `docs/evaluations/2026-08-16-wave-2-golden-evaluation.md`

**Interfaces:**
- Produces:
  - 5 standard input contexts:
    - **Context A**: Incoming G7 + weak grammar foundation + Minecraft interest.
    - **Context B**: G7 + stronger reading comprehension + basketball interest.
    - **Context C**: G8 + recurring grammar mistake (past vs present perfect) + low completion.
    - **Context D**: Feedback missing (cautious calibration baseline).
    - **Context E**: Retry context following a semantic quality rejection.
  - Complete 2.0.1 vs 2.1.0 comparison evaluation report assessing the 7 dimensions:
    1. Teaching clarity
    2. Explanation substance
    3. CAP reasoning depth
    4. Distractor quality
    5. Trap explanation
    6. Personalization authenticity
    7. Cognitive load balance

- [ ] **Step 1: Create `golden-contexts.ts`**

- [ ] **Step 2: Produce and document 2.0.1 vs 2.1.0 side-by-side evaluation in `docs/evaluations/2026-08-16-wave-2-golden-evaluation.md`**

- [ ] **Step 3: Commit**

```bash
git add packages/generator/src/fixtures/golden-contexts.ts docs/evaluations/2026-08-16-wave-2-golden-evaluation.md
git commit -m "docs(eval): create Wave 2 golden contexts and side-by-side semantic evaluation report"
```

---

### Task 5: Full Workspace Regression Verification & PDF Proof

**Files:**
- Test: Full repository test suite (`npx vitest run --exclude **/dist/**`)
- Test: Synthetic PDF generation proof (`generate:synthetic`)

- [ ] **Step 1: Run all test suites**

Verify 34+ test files pass cleanly.

- [ ] **Step 2: Run synthetic PDF generation**

Ensure PDF generation produces clean Student and Parent PDFs.

- [ ] **Step 3: Commit final Wave 2 release**

```bash
git commit -m "chore(release): complete Wave 2 pedagogical quality upgrade"
```

---

## Verification Plan

### Automated Tests
- `npx vitest run packages/generator/src/bundle-compiler.test.ts` (Frozen 2.0.1 baseline + active 2.1.0 bundle hash integrity)
- `npx vitest run packages/generator/src/pedagogy-contract.test.ts` (Wave 2 procedural rules & invariant bounds)
- `npx vitest run --exclude **/dist/**` (Full workspace test suite)
- `.\node_modules\.pnpm\node_modules\.bin\tsx.CMD packages/pdf/src/generate-synthetic.ts` (Deterministic PDF rendering proof)

### Semantic Evaluation
- Inspect `docs/evaluations/2026-08-16-wave-2-golden-evaluation.md` to verify the 7-dimension improvements across all 5 golden contexts.
