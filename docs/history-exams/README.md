# Historical CAP English Exam Digestion Pipeline

> **Taiwan Junior High Comprehensive Assessment Program (國中教育會考英語科)**
> **Isolated R&D Subsystem for Assessment Design Extraction, Pedagogical Analysis, Synthesis, and Benchmarking**

---

## 1. System Overview & Isolation Boundary

> [!IMPORTANT]
> **Production Isolation Notice**:
> This subsystem is **completely isolated** from the production weekly generation engine, Supabase schemas, worker tasks, and PDF rendering.
> It exists solely to transform historical CAP English exam PDFs into a structured, validated, and versioned **question-design knowledge base** and **benchmark foundation**.

### Architecture:

```text
history_exams/raw/ (e.g. 111P_English.pdf .. 115P_English.pdf)
          │
          ▼
   Stage 1: Deterministic Layout-Aware Extraction (pdfjs-dist)
          │
          ▼
history_exams/extracted/{111..115}.json
          │
          ▼
   Stage 2: Pedagogical Deep Analysis & Assessment Reverse-Engineering (AI / Deterministic Engine)
          │
          ▼
history_exams/analyzed/{111..115}.json
          │
          ▼
   Stage 3: Cross-Year Knowledge Synthesizer
          │
          ▼
history_exams/knowledge/
  ├── cap-taxonomy.json
  ├── question-recipes.json
  ├── distractor-patterns.json
  ├── depth-framework.json
  ├── anti-patterns.json
  ├── cap-blueprint.json
  └── cap-blueprint.md
          │
          ▼
   Stage 4: Benchmark Foundation & Validation
          │
          ▼
history_exams/benchmark/cap-benchmark.json
```

---

## 2. Dynamic Rolling Window Workflow (-1 / +1 Year Workflow)

The pipeline is fully dynamic and idempotent. When a new year passes (e.g. adding `116P_English.pdf` and optionally removing the oldest year):

1. Place the new official PDF into `history_exams/raw/` (e.g. `116P_English.pdf`).
2. Run the single build command:
   ```bash
   pnpm history-exams build
   ```
3. The pipeline will:
   - Extract the new PDF deterministically.
   - Analyze the new exam while reusing cached analyses for unchanged existing exams via stable SHA-256 content hashes.
   - Re-synthesize all cross-year knowledge artifacts and benchmarks across the active corpus.
   - Validate 100% of data structures against Zod contracts.
   - Seal the rolling source hashes only after the rebuilt corpus is authoritative, so a crashed update cannot reuse stale analyses on the next run.

---

## 3. Command Line Interface (CLI)

```bash
# 1. Deterministic extraction only
pnpm history-exams extract
pnpm history-exams extract --exam 115

# 2. Pedagogical analysis only
pnpm history-exams analyze
pnpm history-exams analyze --exam 115
pnpm history-exams analyze --exam 115 --question 24
pnpm history-exams analyze --force

# 3. Knowledge synthesis only
pnpm history-exams synthesize

# 4. Benchmark construction only
pnpm history-exams benchmark

# 5. Full corpus validation
pnpm history-exams validate

# 6. Complete End-to-End Build (Extract -> Analyze -> Synthesize -> Benchmark -> Validate)
pnpm history-exams build
```

---

## 4. Extraction Assumptions & Strict Real Data Contract

1. **Verified Official Answers**: Student booklets do not contain answer keys. Each active year therefore requires a separately verified official RCPET 43-item answer key before extraction/build may proceed; the pipeline fails closed instead of guessing answers.
2. **Text & Geometry Preservation**: Uses `pdfjs-dist` to extract raw text items, sorting lines strictly by coordinate geometry `(X, Y)` to preserve the physical layout without OCR distortion.
3. **Passage Linking & Cloze Discrimination**:
   - Section 1 (單題): Standalone items (Questions 1 to 19–23).
   - Section 2 (題組): Exactly 8 reading sets per year. Detects cloze tests (numbered blanks in narrative) vs reading comprehension.
4. **Visual & Graphic Options**: When options are map/diagram illustrations in the source booklet (e.g. 111 Q33), the extractor detects empty textual slices and attributes them as `[Image/Diagram Option A..D]` with high extraction confidence.

---

## 5. Pedagogical Analysis & Controlled Taxonomy

### 5.1 Controlled Skills Taxonomy
- `vocabulary_in_context`
- `grammar_in_context`
- `explicit_detail`
- `reference_resolution`
- `local_inference`
- `cross_sentence_inference`
- `main_idea`
- `purpose_speaker_intent`
- `discourse_relationship`
- `sequence_cause_consequence`
- `text_structure`
- `information_integration`
- `pragmatic_meaning`
- `other_uncertain`

### 5.2 Decoupling Principle: Language Difficulty ≠ Cognitive Depth
- **Language Difficulty**: `A1_elementary`, `A2_basic`, `B1_intermediate` (Strict junior-high ceiling of 1200 + 800 words).
- **Cognitive Depth**:
  - `D1_verbatim_retrieval`: Literal matching.
  - `D2_single_step_inference`: Local deduction / paraphrase.
  - `D3_multi_step_synthesis`: Cross-paragraph global integration.
  - `D4_evaluative_pragmatic`: Evaluative and conversational subtext resolution.
- CAP questions frequently achieve `D3`/`D4` depth with `A1`/`A2` language.

### 5.3 Context Necessity Diagnostic
- `essential`: The question **cannot** be answered without reading the passage. (100% of CAP reading comprehension items).
- `helpful`: Context clarifies, but question could be guessed.
- `decorative`: Context is present in booklet but completely irrelevant to finding the answer (Anti-Pattern).
- `none`: Standalone single question.

### 5.4 Distractor Mechanisms Catalog
- `literal_keyword_matching`: Traps students who scan for matching surface words.
- `partial_truth`: Factually true in passage but misses stem constraints.
- `wrong_referent`: Attributes passage actions to the wrong character.
- `wrong_chronology`: Inverts event sequence.
- `local_evidence_for_global_question`: True detail presented as the main idea.
- `unsupported_world_knowledge`: Plausible in daily life, but ungrounded in text.
- `reversed_cause_effect`: Inverts causal relationships.
- `grammatically_plausible_contextually_wrong`: Syntactically correct but semantically contradictory.
- `overgeneralization` / `undergeneralization`.

---

## 6. Environment & AI Provider Setup

The analysis engine automatically selects the provider based on available environment variables:

| Environment Variable | Provider Selected | Description |
|----------------------|-------------------|-------------|
| `GEMINI_API_KEY` | `GeminiProvider` | Calls Google Gemini 2.5 Flash / Pro API with structured JSON output. |
| `OPENAI_API_KEY` | `OpenAiProvider` | Calls OpenAI GPT-4o / GPT-4o-mini API with structured JSON output. |
| None (Default in tests/CI) | `OfflineMockProvider` | Deterministic psychometric analysis engine for zero-cost, offline execution. |

Prompt versioning is maintained at `v1.0.0` in `scripts/history-exams/src/analyzer/prompt.ts`.

---

## 7. Artifact Classification

| Directory | Artifact | Provenance | Description |
|-----------|----------|------------|-------------|
| `history_exams/raw/` | `*P_English.pdf` | **Official Source** | Raw Ministry of Education CAP exam booklets. |
| `history_exams/extracted/` | `{year}.json` | **Deterministic** | Extracted questions, options, passages, and footnotes. |
| `history_exams/analyzed/` | `{year}.json` | **AI / Pedagogical** | Per-question reverse-engineered assessment records. |
| `history_exams/knowledge/` | `cap-taxonomy.json` | **Synthesized** | Skill hierarchy, co-occurrence, and definitions. |
| `history_exams/knowledge/` | `question-recipes.json` | **Synthesized** | Modular question construction blueprints. |
| `history_exams/knowledge/` | `distractor-patterns.json` | **Synthesized** | Empirical distractor frequencies and cognitive triggers. |
| `history_exams/knowledge/` | `depth-framework.json` | **Synthesized** | 4-level cognitive depth framework with real exemplars. |
| `history_exams/knowledge/` | `anti-patterns.json` | **Synthesized** | Catalog of weak question anti-patterns & diagnostic tests. |
| `history_exams/knowledge/` | `cap-blueprint.json / .md` | **Synthesized** | Master assessment design blueprint. |
| `history_exams/benchmark/` | `cap-benchmark.json` | **Synthesized** | Baseline distributions and isolated holdout set. |

---

## 8. Future Integration Boundaries

When the time comes to integrate these historical findings into production material generation, the following three clean integration surfaces are architected:

1. **Future P0 — Depth Gate**: Use the `contextNecessity` diagnostic and `shallowRecall` detector to block questions where context is decorative or cognitive depth is zero.
2. **Future P1 — CAP Blueprint Planner**: A Question Planner will select recipes from `question-recipes.json` and plan cognitive depth / distractor strategies **before** LLM prose generation.
3. **Future P2 — CAP-Based Benchmark Evaluator**: A critic will compare generated weekly packets against the baseline reference distributions in `cap-benchmark.json` and score against the isolated holdout items in `holdoutReferenceSet`.
