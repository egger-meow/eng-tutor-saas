# CAP Deep Digestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete genuine GPT-authored deep analysis for the 111–115 CAP English questions without changing corrected official answer keys, then consolidate canonical hashes/provenance and validate the final 215-question corpus.

**Architecture:** Historical source truth remains in `history_exams/extracted/*.json`; genuine authored fragments live in `history_exams/agent_analysis/*.json` and are consolidated only after visual provenance is accurate. Canonical analyzed output is produced by the existing agent-ingest/hash pipeline so prompt/model/schema metadata plus required image SHA-256 values are part of the content hash. Official answer keys and their regression lock are immutable inputs during digestion.

**Tech Stack:** TypeScript, Node.js, pnpm, JSON corpus files, Vitest/Node tests, GitHub Actions.

**Spec:** `docs/SPEC.md` sections 179–180, 193, 199, 204–205, 210; repository contract `AGENTS.md`.

## Global Constraints

- Preserve corrected official answers for years 111–115 and the answer-key regression lock byte-for-byte unless a separately verified official-source correction is explicitly required.
- Never replace a real `openai-chatgpt`/`gpt-5.6-sol` analysis with mock/offline content.
- Do not claim visual reasoning from answer keys alone; visual-first items require the corresponding image asset and provenance.
- Canonical content hashes must remain real 64-character SHA-256 hashes produced by the repository pipeline.
- Do not set `authorityStatus=authoritative` until all 215 questions are live-or-agent and synthesis/benchmark/validation gates pass.

---

### Task 1: Continue safe authored coverage

**Files:**
- Read: `history_exams/extracted/114.json`
- Create: `history_exams/agent_analysis/114-q02-13.json`
- Preserve: `history_exams/extracted/111.json` through `115.json` answer fields and official-answer regression fixtures/tests

**Interfaces:**
- Consumes: extracted question stem/options/answer/evidence metadata for 114 Q2–Q13.
- Produces: one schema-1.0.0 genuine analysis fragment using provider `openai-chatgpt`, model `gpt-5.6-sol`, prompt `chatgpt-agent-digestion-v2`, critic `chatgpt-agent-critic-v1`.

- [ ] **Step 1: Verify the target questions are not already genuinely authored**

Run repository/API inspection of `history_exams/agent_analysis/` and confirm no 114 Q2–Q13 fragment exists.

- [ ] **Step 2: Author Q2–Q13 from the extracted source**

For every question include primary/secondary skills, reasoning operations, mechanism, correct rationale, three distractor rationales, failure modes, misconceptions, reusable design principle, simplification/depth controls, evidence references, confidence, and critic result. Use only source evidence present in the item.

- [ ] **Step 3: Validate JSON and schema compatibility**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('history_exams/agent_analysis/114-q02-13.json','utf8')); console.log('json ok')"
pnpm test -- history-exams
```

Expected: JSON parse succeeds; relevant history-exam tests do not report schema errors for the new fragment.

- [ ] **Step 4: Commit the safe batch**

```bash
git add history_exams/agent_analysis/114-q02-13.json
git commit -m "feat(history-exams): begin genuine 114 CAP digestion"
```

### Task 2: Resolve remaining visual-first provenance before ingest

**Files:**
- Inspect: `history_exams/extracted/112.json`, `113.json`, `114.json`, `115.json`
- Inspect: `history_exams/assets/<year>/page-*.png`
- Modify only extraction/provenance metadata that is demonstrably inconsistent with the source PDF/images.

**Interfaces:**
- Consumes: source-PDF page images and existing extracted question/passage metadata.
- Produces: accurate `evidenceMode`, `visualEvidenceRequired`, `requiredAssets`, and asset SHA-256 metadata for genuinely visual items.

- [ ] **Step 1: Identify placeholder/visual passages**

Search for `[Visual/Graphic Content in Source PDF` and questions whose stems/options explicitly depend on a picture/map/chart while `requiredAssets` is empty.

- [ ] **Step 2: Inspect each required page image**

Verify the visual directly. Do not infer image contents solely from the official answer.

- [ ] **Step 3: Repair only proven provenance defects**

Attach the existing page image path/SHA and mark visual evidence accurately, preserving question answer fields.

- [ ] **Step 4: Run official-answer regression tests**

```bash
pnpm test -- history-exams-official-answers
```

Expected: corrected 111–115 official answers remain unchanged.

### Task 3: Consolidate and canonical-ingest completed years

**Files:**
- Read: authored fragments under `history_exams/agent_analysis/`
- Generate/update: canonical analyzed history-exam artifacts through existing repository scripts only.

**Interfaces:**
- Consumes: complete genuine fragments plus corrected extraction/provenance.
- Produces: canonical 64-character content hashes and live-or-agent analyzed rows.

- [ ] **Step 1: Consolidate fragments without overwriting genuine rows**

Use the repository's existing consolidation/agent-ingest path and reject duplicate question numbers or mock-provider replacement.

- [ ] **Step 2: Recompute canonical hashes**

Ensure required image binary hashes, prompt version, critic version, schema version, provider/model, passage text, and question metadata feed the existing hash function.

- [ ] **Step 3: Run ingest/hash regression tests**

```bash
pnpm test -- history-exams-agent-ingest
pnpm test -- history-exams-official-answers
```

Expected: all ingested hashes are 64-character SHA-256 values and official answers remain locked.

### Task 4: Finish corpus authority gates

**Files:**
- Generate/update only through existing scripts: cross-year synthesis, benchmark artifacts, corpus validation metadata.

**Interfaces:**
- Consumes: 215/215 live-or-agent canonical analyses.
- Produces: cross-year synthesis, benchmark output, passed corpus validation, then and only then `authorityStatus=authoritative`.

- [ ] **Step 1: Generate cross-year synthesis and benchmark**

Run the repository's documented history-exam synthesis/benchmark commands discovered from `package.json`/history-exam scripts.

- [ ] **Step 2: Run corpus validation**

Confirm five years × 43 questions = 215 and no mock analysis is counted as authoritative.

- [ ] **Step 3: Run full verification before completion**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all four commands pass. If any fail, report the exact failing gate and leave `authorityStatus` non-authoritative.
