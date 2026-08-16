# Wave 3: Modeled Reliability Projection & Cumulative Ablation Harness

> [!CAUTION]
> ### ⚠️ NOT EMPIRICAL MODEL RESULTS
> Values in this report are **engineering hypotheses** used to design the benchmark harness, calibrate finisher thresholds, and estimate expected directional impacts.
> They are **NOT** measured empirical API results and **MUST NOT** be used for production model selection.

> **Evaluation Type:** Modeled Reliability Projection (Simulation Harness)  
> **Golden Test Cases:** 5 Junior-High Profiles (Alex G7, Bella G8, Charlie G9, David G7, Emily G8)  
> **Ablation Methodology (Cumulative Stacking):**  
> This harness models cumulative feature stacking (v1 = baseline ➔ v2 = +normalize ➔ v3 = +few-shot ➔ v4 = +local Q&A ➔ v5 = +evidence recipes). Improvements reflect total compound impact rather than isolated single-factor causal attribution.

## 1. Projected Hypotheses & Directional Expectations

1. **The Normalization Dividend (+14% to +20% Projected Pass Rate):**
   - Server-side `wordCount` auto-derivation is hypothesized to eliminate arithmetic-induced retries without altering pedagogical substance.
2. **Micro Few-Shot Expected Quality Gain (+3.6 to +5.8 Points):**
   - Adding compact `BAD ➔ GOOD` contrasts is designed to guide Medium (GPT-4o-mini / Haiku) and Cheap (Gemini Flash / Llama-3) models to produce authentic distractor mechanisms and intuitive Trigger-Pattern-Trap-Try explanations.
3. **Local Q&A Authoring Eliminates Long-Distance Drift:**
   - Authoring question reasoning locally before projecting to separated arrays is designed to eliminate structural ID mismatch and orphan answer errors.
4. **Projected Quality-per-Dollar Frontier (Hypothesis to Validate Empirically):**
   - Under these engineering assumptions, Medium Tier (GPT-4o-mini / Claude 3.5 Haiku) on Prompt 2.2.0 is projected to achieve high pass rates at ~15x cost efficiency compared to Strong tier baseline.

---

## 2. Modeled Performance Table (Cumulative Stacking)

| Model Tier | Cumulative Ablation Variant | Projected 1st-Pass | Projected Repair | Struct Fails/100 | Modeled Quality (/35) | Projected Cost ($) | Modeled Quality/$ Index |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Strong** (gpt-4o) | 2.1.0 Baseline | **88%** | 12% | 6 | **33.2** | $0.0482 | **6.9** |
| **Strong** (gpt-4o) | Cumulative: + Normalization | **94%** | 6% | 0 | **33.2** | $0.0471 | **7.0** |
| **Strong** (gpt-4o) | Cumulative: + Micro Few-Shot | **96%** | 4% | 0 | **34.0** | $0.0467 | **7.3** |
| **Strong** (gpt-4o) | Cumulative: + Local Q&A Protocol | **98%** | 2% | 0 | **34.2** | $0.0464 | **7.4** |
| **Strong** (gpt-4o) | Cumulative: Full Wave 3 (Prompt 2.2.0) | **100%** | 0% | 0 | **34.8** | $0.0460 | **7.6** |
| **Medium** (gpt-4o-mini) | 2.1.0 Baseline | **52%** | 38% | 28 | **27.4** | $0.0032 | **86.2** |
| **Medium** (gpt-4o-mini) | Cumulative: + Normalization | **68%** | 24% | 14 | **27.4** | $0.0030 | **90.7** |
| **Medium** (gpt-4o-mini) | Cumulative: + Micro Few-Shot | **80%** | 16% | 10 | **31.0** | $0.0029 | **105.4** |
| **Medium** (gpt-4o-mini) | Cumulative: + Local Q&A Protocol | **90%** | 8% | 2 | **31.8** | $0.0029 | **111.6** |
| **Medium** (gpt-4o-mini) | Cumulative: Full Wave 3 (Prompt 2.2.0) | **96%** | 4% | 0 | **33.1** | $0.0028 | **118.2** |
| **Cheap** (gemini-1.5-flash) | 2.1.0 Baseline | **34%** | 52% | 48 | **21.8** | $0.0017 | **130.5** |
| **Cheap** (gemini-1.5-flash) | Cumulative: + Normalization | **54%** | 36% | 30 | **21.8** | $0.0016 | **138.0** |
| **Cheap** (gemini-1.5-flash) | Cumulative: + Micro Few-Shot | **70%** | 22% | 20 | **27.6** | $0.0015 | **184.0** |
| **Cheap** (gemini-1.5-flash) | Cumulative: + Local Q&A Protocol | **82%** | 14% | 6 | **28.5** | $0.0015 | **195.2** |
| **Cheap** (gemini-1.5-flash) | Cumulative: Full Wave 3 (Prompt 2.2.0) | **92%** | 8% | 0 | **30.8** | $0.0014 | **216.9** |

---

## 3. Pillar-by-Pillar Architectural Mechanics

### Pillar 1: Deterministic Normalization
- **Mechanics:** Server auto-computes `wordCount = countWords(paragraphs)` before validation.
- **Invariant:** Zero pedagogical invention by the server; strictly derived arithmetic truth.

### Pillar 2: 3-Tier Finisher Classification
- **Classification:** Separated rules into `AUTO-DERIVED`, `STRUCTURAL CRITICAL`, and `SEMANTIC CRITICAL`.
- **Safety Guard:** Explicitly banned fuzzy ID guessing (`q12` vs `q21`), regex jargon mutation, and auto-inventing missing goals. Structural and semantic invariants fail closed.

### Pillar 3: Low-Model Authoring Scaffold (Prompt 2.2.0)
- **Micro Few-Shot:** ~250 tokens demonstrating Trigger-Pattern-Trap-Try and CAP distractors.
- **Local Q&A Protocol:** Resolves long-range attention decay between questions and answer keys.
- **Simple Evidence Recipes:** Standardizes step progression across grammar, reading, and vocabulary targets.

### Pillar 4: Benchmark Roadmap for Future Empirical Validation

| Model Tier Under Test | Target Candidate Models | Primary Empirical Question to Measure |
| :--- | :--- | :--- |
| **Strong Reference Tier** | `claude-3-5-sonnet` / `gpt-4o` | Confirm gold-standard ceiling scores on the 5 Golden Cases. |
| **Medium Efficiency Tier** | `gpt-4o-mini` / `claude-3-5-haiku` | Validate whether 1st-pass rate exceeds 90% and semantic quality $\ge 30/35$. |
| **Cheap High-Volume Tier** | `gemini-1.5-flash` / `llama-3.1-70b` | Measure error boundaries and recovery efficiency on live API runs. |
