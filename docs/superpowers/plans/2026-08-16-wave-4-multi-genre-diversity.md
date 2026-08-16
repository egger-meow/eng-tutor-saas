# Wave 4: Multi-Genre Reading, Deep Situational Personalization & Multi-Week Trajectory Diversity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the reading engine and prompt architecture into a pedagogically grounded, multi-genre reading system (`narrative`, `dialogue`, `notice`, `schedule`, `instructions`, `mini-report`) using Schema 2.1.0 with canonical `blocks` (`paragraph`, `dialogue`, `notice`, `schedule-row`), deep situational personalization (turning child interests into troubleshooting logs, teammate chats, and resource plans rather than superficial noun swaps), server-owned `diversityCapsule`, plain-text renderer compatibility, and 4-week trajectory diversity tracking under Prompt 2.3.0.

**Core Principles & Non-Negotiable Invariants:**
1. **Target ➔ Genre ➔ Interest Hierarchy (Diversity $\neq$ Randomness):**
   - *Learning Target* determines *Information Structure / Genre*, which is then instantiated in *Interest Context*.
   - Never pick a genre merely for decorative novelty; genre is an instrument of pedagogical reasoning aligned with Taiwan CAP (國中教育會考):
     - Inference & Context Reasoning (推論、代名詞指涉、語境推詞) ➔ `narrative`, `dialogue`, `article`.
     - Information Extraction & Practical Decisions (實用資訊擷取、時刻表、公告) ➔ `notice`, `schedule`, `instructions`.
     - Sequence & Troubleshooting (步驟流程、因果關係) ➔ `instructions`, `schedule`.
     - Comparison & Viewpoints (觀點比較、雙文本對照) ➔ `mini-report`, `article`.
2. **Deep Situational Personalization (No Superficial Skinning):**
   - Interests generate authentic information needs, conflicts, troubleshooting logs, and team discussions (e.g. Minecraft redstone circuit troubleshooting log, basketball team timeout strategy chat).
3. **Clean Schema 2.1.0 & Canonical Blocks as Single Source of Truth:**
   - No muddy `schemaVersion: union` with duplicate fields.
   - Schema 2.1.0 canonical reading contains ONLY `genre` and `blocks: ReadingBlock[]` (`paragraph`, `dialogue`, `notice`, `schedule-row`).
   - Legacy Schema 2.0.0 packages are upgraded cleanly via `upgradeV20ToV21(v20)`.
   - Production generator 2.3.0 exclusively outputs Schema 2.1.0.
4. **Server-Owned Diversity Capsule (Decision-Complete Capsule):**
   - LLMs do not write or store `recentDiversity` in `learnerSnapshot`.
   - Server records `{ genre, contextKey, itemFamilies }` on job completion into `generation_summary` / `compact_weekly_history`.
   - Server provides `diversityCapsule` (`recentGenres`, `recentContextKeys`, `recentItemFamilies`) in worker input.
5. **Plain Renderer Compatibility Adapter (Wave 4 Scope):**
   - Implement `renderReadingBlocksHtml(reading)` in `packages/pdf/src/` to format `paragraph`, `dialogue`, `notice`, and `schedule-row` into clean printable HTML segments without requiring full Wave 5 visual redesign.
6. **Multi-Week Trajectory Diversity Benchmark (Repetition Pressure):**
   - Evaluate repetition pressure across 4-week sequences (5 student profiles × 4 weeks = 20 snapshots) checking dominant genre runs, context distinctness, and item-family balance.
   - Pedagogy > Novelty: Repeating a genre is permitted if pedagogically justified, flagged only under excessive concentration ($\ge 3$ weeks) or mechanical noun swapping.

---

## File Structure

```text
packages/generator/
├── prompts/
│   ├── 2.0.1/                               # FROZEN baseline
│   ├── 2.1.0/                               # FROZEN Wave 2
│   ├── 2.2.0/                               # FROZEN Wave 3
│   └── 2.3.0/                               # NEW Wave 4 Prompts
│       ├── 01-plan.md                       # Target -> Genre selection & diversity capsule
│       ├── 02-author.md                     # Deep situational immersion & multi-genre blocks
│       ├── 03-critic.md                     # Diversity, superficial skinning & genre audit
│       ├── 04-repair.md                     # Surgical multi-genre repair
│       └── README.md                        # Prompt 2.3.0 documentation
├── bundles/
│   └── production-authoring-bundle.md       # Compiled from prompts/2.3.0 (v2.3.0-prod)
├── src/
│   ├── curriculum-package-schema.ts         # [MODIFY] Schema 2.1.0 canonical & Schema 2.0.0 legacy
│   ├── upgrade-v20-to-v21.ts                # [NEW] Deterministic legacy 2.0 -> 2.1 upgrade
│   ├── normalize-curriculum-package.ts      # [MODIFY] Canonical block-based word count normalization
│   ├── validate-curriculum-package.ts       # [MODIFY] Transparent upgrade & 2.1.0 validation
│   ├── audit-curriculum.ts                  # [MODIFY] Genre-reasoning & repetition pressure audit rules
│   ├── bundle-compiler.ts                   # [MODIFY] Compile 2.3.0, freeze 2.2.0/2.1.0/2.0.1
│   ├── bundle-compiler.test.ts              # [MODIFY] Frozen baselines & 2.3.0 bundle test
│   ├── multi-genre.test.ts                  # [NEW] Unit tests for blocks, upgrade & normalization
│   └── fixtures/
│       └── multi-week-trajectory.ts         # [NEW] 5 child profiles × 4-week progression fixtures
├── scripts/
│   └── run-multi-week-diversity-benchmark.ts # [NEW] Trajectory diversity evaluation runner
packages/pdf/src/
└── render-curriculum-package.ts             # [MODIFY] Multi-genre block rendering adapter
docs/
└── evaluations/
    └── wave-4/
        ├── multi-week-diversity-evaluation.md # [NEW] 4-Week Trajectory Diversity Report
        └── manifest.json                      # [NEW] Trajectory hashes and rotation metrics
```

---

### Task 1: Schema 2.1.0 Canonical Reading & Legacy Upgrade Layer

**Files:**
- Modify: `packages/generator/src/curriculum-package-schema.ts`
- Create: `packages/generator/src/upgrade-v20-to-v21.ts`
- Modify: `packages/generator/src/normalize-curriculum-package.ts`
- Modify: `packages/generator/src/validate-curriculum-package.ts`
- Create: `packages/generator/src/multi-genre.test.ts`

- [ ] **Step 1: Update `curriculum-package-schema.ts`**
  - Define `ReadingBlockSchema`:
    - `paragraph`: `{ type: 'paragraph', text: Text }`
    - `dialogue`: `{ type: 'dialogue', speaker: Text, text: Text }`
    - `notice`: `{ type: 'notice', heading: Text.optional(), text: Text }`
    - `schedule-row`: `{ type: 'schedule-row', timeOrStep: Text, event: Text, detail: Text.optional() }`
  - Define `ReadingGenreSchema`:
    - `'article' | 'narrative' | 'dialogue' | 'notice' | 'schedule' | 'instructions' | 'mini-report'`
  - Update canonical `CurriculumPackageSchema` (`schemaVersion: z.literal('2.1.0')`):
    - `reading`: `{ title: Text, contextZh: Text, genre: ReadingGenreSchema, blocks: z.array(ReadingBlockSchema).min(1).max(20), wordCount: z.number().int().min(120).max(900), readingTipsZh: z.array(Text).min(1).max(6), sourceNote: Text.nullable() }`
  - Preserve `CurriculumPackageV20Schema` for legacy validation.

- [ ] **Step 2: Create `upgrade-v20-to-v21.ts`**
  - Converts `paragraphs: string[]` ➔ `blocks: paragraphs.map(text => ({ type: 'paragraph', text }))`, `genre: 'article'`, `schemaVersion: '2.1.0'`.

- [ ] **Step 3: Update `normalize-curriculum-package.ts` & `validate-curriculum-package.ts`**
  - `normalizeCurriculumPackage()` calculates `wordCount` by summing words across all block text fields.
  - `validateCurriculumPackage()` upgrades v2.0 input if detected, validates against canonical 2.1 schema.

- [ ] **Step 4: Write tests in `multi-genre.test.ts`**
  - Test all 4 block types.
  - Test legacy v2.0 upgrade.
  - Test wordCount auto-normalization on blocks.
  - Run: `npx vitest run packages/generator/src/multi-genre.test.ts`

---

### Task 2: PDF Plain-Renderer Multi-Genre Compatibility Adapter

**Files:**
- Modify: `packages/pdf/src/render-curriculum-package.ts`

- [ ] **Step 1: Implement `renderReadingBlocksHtml(reading)` in `render-curriculum-package.ts`**
  - Renders:
    - `paragraph` ➔ `<p>${h(block.text)}</p>`
    - `dialogue` ➔ `<p class="reading-dialogue"><strong>${h(block.speaker)}:</strong> ${h(block.text)}</p>`
    - `notice` ➔ `<div class="reading-notice">${block.heading ? `<strong>[${h(block.heading)}]</strong> ` : ''}${h(block.text)}</div>`
    - `schedule-row` ➔ `<p class="reading-schedule-row"><code>${h(block.timeOrStep)}</code> ${h(block.event)}${block.detail ? ` <span class="small">(${h(block.detail)})</span>` : ''}</p>`
- [ ] **Step 2: Verify PDF test suite**
  - Run: `npx vitest run packages/pdf/`

---

### Task 3: Finisher Audit Rules for Genre-Target Fit & Repetition Pressure

**Files:**
- Modify: `packages/generator/src/audit-curriculum.ts`

- [ ] **Step 1: Add genre-target fit and repetition pressure audit rules**
  - Validate that sequence/step questions align with sequential/process reading genres (`instructions`, `schedule`).
  - Validate that dialogue reading contains valid dialogue blocks with speakers.
  - Flag critical superficial skinning (same raw noun with zero problem context).

- [ ] **Step 2: Run audit tests**
  - Run: `npx vitest run packages/generator/src/finisher-tiers.test.ts`

---

### Task 4: Author Prompts 2.3.0 & Compile Production Bundle

**Files:**
- Create: `packages/generator/prompts/2.3.0/01-plan.md`
- Create: `packages/generator/prompts/2.3.0/02-author.md`
- Create: `packages/generator/prompts/2.3.0/03-critic.md`
- Create: `packages/generator/prompts/2.3.0/04-repair.md`
- Create: `packages/generator/prompts/2.3.0/README.md`
- Modify: `packages/generator/src/bundle-compiler.ts`
- Modify: `packages/generator/src/bundle-compiler.test.ts`
- Generate: `packages/generator/bundles/production-authoring-bundle.md`

- [ ] **Step 1: Write `prompts/2.3.0/01-plan.md`**
  - Include Target ➔ Genre Selection Procedure & Diversity Capsule check.
  - Emphasize Taiwan CAP reading comprehension competencies (生活情境、實用圖表、對白簡訊、科普說明、雙文本比較).
  - Define repetition pressure rules (pedagogy > novelty).
- [ ] **Step 2: Write `prompts/2.3.0/02-author.md`**
  - Deep Situational Immersion (troubleshooting logs, team chats, decision records).
  - Multi-Genre Block formatting rules (`paragraph`, `dialogue`, `notice`, `schedule-row`).
- [ ] **Step 3: Write `prompts/2.3.0/03-critic.md` & `04-repair.md`**
  - Adversarial audit for superficial noun-swapping and genre-target conflict.
- [ ] **Step 4: Update `bundle-compiler.ts` and compile bundle**
  - Assert frozen hashes for 2.0.1, 2.1.0, and 2.2.0.
  - Compile `2.3.0-prod` bundle.
  - Run: `npx vitest run packages/generator/src/bundle-compiler.test.ts`

---

### Task 5: Multi-Week Trajectory Diversity Benchmark

**Files:**
- Create: `packages/generator/src/fixtures/multi-week-trajectory.ts`
- Create: `packages/generator/scripts/run-multi-week-diversity-benchmark.ts`
- Generate: `docs/evaluations/wave-4/multi-week-diversity-evaluation.md`
- Generate: `docs/evaluations/wave-4/manifest.json`
- Create: `packages/generator/src/wave4-trajectory.test.ts`

- [ ] **Step 1: Build 4-week trajectory dataset for 5 child profiles (20 snapshots)**
  - Alex (G7): W1 Minecraft Redstone Log (instructions) ➔ W2 Robotics Lab Chat (dialogue) ➔ W3 Robot Competition Schedule (schedule) ➔ W4 Science Fair Notice (notice).
  - Bella (G8): W1 Stray Cat Rescue Story (narrative) ➔ W2 Shelter Volunteer Guide (instructions) ➔ W3 Vet Clinic Notice (notice) ➔ W4 Adoption Mini-Report (mini-report).
  - Charlie (G9): W1 Basketball Strategy Dialogue (dialogue) ➔ W2 Tournament Schedule (schedule) ➔ W3 Training Plan Article (article) ➔ W4 Championship Notice (notice).
  - David (G7): W1 Drawing Club Notice (notice) ➔ W2 Comic Dialogue (dialogue) ➔ W3 Step-by-Step Character Guide (instructions) ➔ W4 Art Exhibition Article (article).
  - Emily (G8): W1 Board Game Rulebook (instructions) ➔ W2 Strategy Discussion Dialogue (dialogue) ➔ W3 Game Night Notice (notice) ➔ W4 History Mini-Report (mini-report).
- [ ] **Step 2: Run benchmark runner script**
  - Measure deterministic repetition pressure, genre entropy, context key distinctness, and schema 2.1.0 validity.
  - Output report and manifest.
- [ ] **Step 3: Test trajectory integrity in `wave4-trajectory.test.ts`**
  - Run: `npx vitest run packages/generator/src/wave4-trajectory.test.ts`

---

### Task 6: Full Workspace Verification & Synthetic PDF Proof

**Files:**
- Test: Full repository test suite (`npx vitest run --exclude **/dist/**`)
- Test: Synthetic PDF generation proof (`generate:synthetic`)

- [ ] **Step 1: Run full test suite across workspace**
- [ ] **Step 2: Verify synthetic PDF rendering**
- [ ] **Step 3: Commit Wave 4 release**

---

## Verification Plan

### Automated Tests
- `npx vitest run packages/generator/src/multi-genre.test.ts` (Block schemas, v2.0 ➔ v2.1 upgrade, normalization)
- `npx vitest run packages/generator/src/bundle-compiler.test.ts` (Frozen 2.0.1, 2.1.0, 2.2.0 baselines, 2.3.0 active bundle)
- `npx vitest run packages/generator/src/wave4-trajectory.test.ts` (4-week trajectory diversity metrics)
- `npx vitest run --exclude **/dist/**` (Full workspace test suite)
- `.\node_modules\.pnpm\node_modules\.bin\tsx.CMD packages/pdf/src/generate-synthetic.ts` (Deterministic PDF rendering proof)

- `npx vitest run --exclude **/dist/**` (Full workspace test suite)
- `.\node_modules\.pnpm\node_modules\.bin\tsx.CMD packages/pdf/src/generate-synthetic.ts` (Deterministic PDF rendering proof)
