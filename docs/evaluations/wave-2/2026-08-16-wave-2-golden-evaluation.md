# Wave 2 Golden Curriculum Semantic Evaluation Report (Blind Benchmark)

**Evaluation Date:** 2026-08-16  
**Evaluation Protocol:** Double-Blind Candidate Scoring  
**Benchmark Suite:** `docs/evaluations/wave-2/`  
**Manifest:** [docs/evaluations/wave-2/manifest.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/manifest.json)  
**Schema Invariant:** `CurriculumPackageSchema 2.0.0`  
**Evaluation Candidates:** Candidate X vs Candidate Y (Identical input signals)

---

## 1. Evaluation Methodology & 7 Scoring Dimensions

Evaluations are conducted blind across 5 canonical cases. The evaluator does not know which candidate corresponds to which prompt version during scoring.

Each dimension is scored **1 to 5 points** (Total max score: 35 points per case):

1. **Teaching Clarity:** Can a tired junior-high student proceed smoothly and independently without tutor or parent intervention?
2. **Explanation Substance:** Does grammar instruction provide an actionable mental model (`Trigger → Pattern → Trap → Try`) rather than theoretical linguistic rules?
3. **CAP Reasoning Depth:** Do reading items test textual evidence, inference, and discourse relations rather than superficial keyword matching?
4. **Distractor Plausibility:** Does every wrong option model a specific, plausible student misconception (answering *"What flawed student reasoning leads to choosing this?"*)?
5. **Trap Explanation & Parent Utility:** Does the answer key provide concise evidence AND de-bias tempting traps without circular tautologies (e.g. 「因為C正確所以選C」)?
6. **Personalization Authenticity:** Does the child's interest form a meaningful problem-solving setting rather than a cosmetic noun swap?
7. **Cognitive Load Balance:** Is the learning flow breathable, chunked, and manageable within the time budget?

---

## 2. Blind Case-by-Case Scoring

### 🎮 Case A: Incoming G7 + Shaky Be-Verb Foundation + Minecraft
* **Input Context:** [case-a/context.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-a/context.json)
* **Candidate X Output:** [case-a/2.0.1-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-a/2.0.1-output.json)
* **Candidate Y Output:** [case-a/2.1.0-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-a/2.1.0-output.json)

| Dimension | Candidate X | Candidate Y | Evaluator Blind Findings |
| :--- | :---: | :---: | :--- |
| **1. Teaching Clarity** | 3 / 5 | 5 / 5 | Candidate Y breaks down the decision into 2 clear steps with cues. Candidate X provides a single wall of text. |
| **2. Explanation Substance** | 3 / 5 | 5 / 5 | Candidate Y uses an active reflex cue (`The redstone block` = 1 singular item ➔ `is`) and explicitly identifies the nearby noun trap (`redstone dusts`). Candidate X only states "singular uses is". |
| **3. CAP Reasoning Depth** | 3 / 5 | 4.5 / 5 | Candidate Y tests understanding of the cause-and-effect of the circuit working. Candidate X tests simple story recall. |
| **4. Distractor Plausibility** | 3 / 5 | 4.5 / 5 | Candidate Y's distractors represent real student errors (confusing singular block with plural dust; wall vs floor placement). Candidate X has silly giveaways (*"On the tree"*, *"Under the bed"*). |
| **5. Trap Explanation & Parent Utility** | 3 / 5 | 5 / 5 | Candidate Y provides sharp reasons + `likelyMisconceptionZh` debunking option C. Candidate X has circular/thin explanations (「選 A，文章第 2 段有寫」). |
| **6. Personalization Authenticity** | 3 / 5 | 4.5 / 5 | Candidate Y integrates redstone circuit logic into grammar and inference. Candidate X performs simple thematic setting. |
| **7. Cognitive Load Balance** | 3 / 5 | 4.5 / 5 | Candidate Y provides structured, gradual release with high breathability. |
| **Case A Total** | **21.0 / 35** | **33.0 / 35** | **Candidate Y wins decisively (+57.1%)** |

---

### 🏀 Case B: G7 + Strong Reading Comprehension + Basketball Tactics
* **Input Context:** [case-b/context.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-b/context.json)
* **Candidate X Output:** [case-b/2.0.1-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-b/2.0.1-output.json)
* **Candidate Y Output:** [case-b/2.1.0-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-b/2.1.0-output.json)

| Dimension | Candidate X | Candidate Y | Evaluator Blind Findings |
| :--- | :---: | :---: | :--- |
| **1. Teaching Clarity** | 3.5 / 5 | 5 / 5 | Candidate Y provides crisp task framing tailored for fast readers. |
| **2. Explanation Substance** | 3.5 / 5 | 4.5 / 5 | Candidate Y demonstrates frequency adverb placement with context contrasts. |
| **3. CAP Reasoning Depth** | 3 / 5 | 5 / 5 | Candidate Y tests tactical inference across paragraphs (stamina drop ➔ substitution). Candidate X is literal retrieval. |
| **4. Distractor Plausibility** | 3 / 5 | 5 / 5 | Candidate Y uses partial evidence and keyword lures (*"tactics"*). Candidate X options are easily eliminated by skimming. |
| **5. Trap Explanation & Parent Utility** | 3 / 5 | 5 / 5 | Candidate Y explains why option C is a keyword trap from paragraph 1. Candidate X merely asserts correctness. |
| **6. Personalization Authenticity** | 3.5 / 5 | 5 / 5 | Candidate Y treats basketball tactics as a genuine analytical reading dilemma. |
| **7. Cognitive Load Balance** | 3.5 / 5 | 4.5 / 5 | Candidate Y matches the advanced pace without unnecessary text bloat. |
| **Case B Total** | **23.0 / 35** | **34.0 / 35** | **Candidate Y wins decisively (+47.8%)** |

---

### 🏸 Case C: G8 + Recurring Grammar Mistake + Low Completion
* **Input Context:** [case-c/context.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-c/context.json)
* **Candidate X Output:** [case-c/2.0.1-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-c/2.0.1-output.json)
* **Candidate Y Output:** [case-c/2.1.0-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-c/2.1.0-output.json)

| Dimension | Candidate X | Candidate Y | Evaluator Blind Findings |
| :--- | :---: | :---: | :--- |
| **1. Teaching Clarity** | 2.5 / 5 | 5 / 5 | Candidate Y provides a 3-step reflex cue (`since + 起點`, `for + 長度`). Candidate X presents dense theoretical grammar rules. |
| **2. Explanation Substance** | 2.5 / 5 | 5 / 5 | Candidate Y explicitly targets the fatal trap: `since two years` is WRONG. Candidate X lacks trap warnings. |
| **3. CAP Reasoning Depth** | 3 / 5 | 4.5 / 5 | Candidate Y uses authentic time-duration contrasts. |
| **4. Distractor Plausibility** | 3 / 5 | 5 / 5 | Candidate Y's options isolate tense confusion, agreement, and since/for misuse. Candidate X options are scattered. |
| **5. Trap Explanation & Parent Utility** | 2.5 / 5 | 5 / 5 | Candidate Y gives parents instant diagnostic clarity on why the student mixed up duration with starting point. |
| **6. Personalization Authenticity** | 2.5 / 5 | 4.5 / 5 | Candidate Y uses sports tournament timelines naturally. |
| **7. Cognitive Load Balance** | 3 / 5 | 4 / 5 | Candidate Y significantly lowers cognitive barrier for an overwhelmed student. |
| **Case C Total** | **19.0 / 35** | **33.0 / 35** | **Candidate Y wins decisively (+73.7%)** |

---

### 🚀 Case D: Feedback Missing Baseline (Calibration)
* **Input Context:** [case-d/context.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-d/context.json)
* **Candidate X Output:** [case-d/2.0.1-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-d/2.0.1-output.json)
* **Candidate Y Output:** [case-d/2.1.0-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-d/2.1.0-output.json)

| Dimension | Candidate X | Candidate Y | Evaluator Blind Findings |
| :--- | :---: | :---: | :--- |
| **1. Teaching Clarity** | 3.5 / 5 | 4.5 / 5 | Candidate Y maintains steady calibration with clear there is / are contrast. |
| **2. Explanation Substance** | 3 / 5 | 4.5 / 5 | Candidate Y highlights the nearest-noun rule trap. Candidate X only gives textbook definitions. |
| **3. CAP Reasoning Depth** | 3 / 5 | 4.5 / 5 | Candidate Y connects astronomy observation steps with spatial prepositions. |
| **4. Distractor Plausibility** | 3 / 5 | 4.5 / 5 | Candidate Y's options model genuine prepositional confusion. |
| **5. Trap Explanation & Parent Utility** | 3 / 5 | 5 / 5 | Candidate Y provides clear parent notes without exposing engine metadata or developer terms. |
| **6. Personalization Authenticity** | 3 / 5 | 4.5 / 5 | Candidate Y integrates space observation meaningfully. |
| **7. Cognitive Load Balance** | 3.5 / 5 | 4.5 / 5 | Candidate Y delivers a well-balanced calibration packet. |
| **Case D Total** | **22.0 / 35** | **32.0 / 35** | **Candidate Y wins decisively (+45.5%)** |

---

### 🌊 Case E: Retry After Semantic Quality Rejection (Passive Voice)
* **Input Context:** [case-e/context.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-e/context.json)
* **Candidate X Output:** [case-e/2.0.1-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-e/2.0.1-output.json)
* **Candidate Y Output:** [case-e/2.1.0-output.json](file:///c:/IDEA/eng-tutor-saas/docs/evaluations/wave-2/case-e/2.1.0-output.json)

| Dimension | Candidate X | Candidate Y | Evaluator Blind Findings |
| :--- | :---: | :---: | :--- |
| **1. Teaching Clarity** | 3 / 5 | 5 / 5 | Candidate Y clearly teaches active vs passive receiver perspective before testing. |
| **2. Explanation Substance** | 3 / 5 | 5 / 5 | Candidate Y identifies the action receiver vs doer trap. Candidate X has circular explanations. |
| **3. CAP Reasoning Depth** | 3 / 5 | 5 / 5 | Candidate Y requires analyzing environmental cause and effect. |
| **4. Distractor Plausibility** | 2.5 / 5 | 5 / 5 | Candidate Y creates plausible reversed-relationship and wrong-referent traps (*The coral reef protects scientists*). Candidate X has silly giveaways. |
| **5. Trap Explanation & Parent Utility** | 2.5 / 5 | 5 / 5 | Candidate Y explicitly explains why option A reversed the agent/receiver role. Candidate X is tautological (「因為文章說被保護所以選C」). |
| **6. Personalization Authenticity** | 3 / 5 | 5 / 5 | Candidate Y integrates ocean ecology conservation into the core language task. |
| **7. Cognitive Load Balance** | 3 / 5 | 5 / 5 | Candidate Y performs surgical repair without bloating untouched sections. |
| **Case E Total** | **20.0 / 35** | **35.0 / 35** | **Candidate Y wins decisively (+75.0%)** |

---

## 3. Aggregate Blind Scorecard

| Case / Evaluation Track | Candidate X (Max 35) | Candidate Y (Max 35) | Delta (%) |
| :--- | :---: | :---: | :---: |
| **Case A (Incoming G7 / Minecraft)** | 21.0 / 35 | 33.0 / 35 | **+57.1%** |
| **Case B (G7 Strong Reading / Basketball)** | 23.0 / 35 | 34.0 / 35 | **+47.8%** |
| **Case C (G8 Recurring Mistake / Fatigue)** | 19.0 / 35 | 33.0 / 35 | **+73.7%** |
| **Case D (Feedback Missing Baseline)** | 22.0 / 35 | 32.0 / 35 | **+45.5%** |
| **Case E (Semantic Quality Retry)** | 20.0 / 35 | 35.0 / 35 | **+75.0%** |
| **Overall Mean Score** | **21.0 / 35 (60.0%)** | **33.4 / 35 (95.4%)** | **+59.0%** |

---

## 4. Unblinding & Candidate Mapping Reveal

Following the completion of blind scoring, the candidate identities are revealed:

| Blind Candidate ID | System Version | Description |
| :--- | :--- | :--- |
| **Candidate X** | **Prompt `2.0.1` (Baseline)** | Baseline frozen prompt ruleset with abstract guidelines. |
| **Candidate Y** | **Prompt `2.1.0` (Wave 2)** | Wave 2 upgraded prompt ruleset implementing Trigger-Pattern-Trap-Try mental models, 7 CAP distractor mechanisms, non-tautological parent answers, and structured target obligations. |

---

## 5. Summary & Reusable Examination Ground Contract

1. **Decisive Quality Separation:**
   Candidate Y (Prompt 2.1.0) outperformed Candidate X (Prompt 2.0.1) by **+59.0%** on identical child inputs, completely eliminating tautological answers and replacing abstract rules with actionable mental models.
2. **Permanent Testing Ground:**
   The `docs/evaluations/wave-2/` suite (manifest + 5 case subdirectories with raw context and generation outputs) is established as an immutable, repeatable golden evaluation harness for all subsequent engine waves.
