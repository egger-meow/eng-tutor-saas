---
profileVersion: "1.0.0"
modelId: "gemini-3.7-flash"
modelPatterns:
  - "gemini-3.7-flash"
  - "gemini-3-7-flash"
  - "models/gemini-3.7-flash"
  - "models/gemini-3-7-flash"
  - "gemini-2.5-flash"
  - "models/gemini-2.5-flash"
description: "Model-specific semantic critique profile for Gemini 3.7 Flash authoring"
updatedAt: "2026-08-18"
---

# Gemini 3.7 Flash Quality Profile

Before submission, specifically inspect:

## Active Quality Rules

### 1. English Naturalness & Phrasing Pass
- **Target Area:** `english-naturalness`
- **Rule ID:** `gemini-nat-01`
- **Description:** Re-read every generated English sentence. Repair unnatural collocations, missing possessives/articles, and translated-Chinese phrasing. Prefer natural junior-high English over merely grammatical English.
- **Check Points:**
  - Eliminate awkward word order, unnatural phrase combinations, or non-idiomatic translations.
  - Verify conversational dialogue sounds authentic and spoken, not textbook-robotic.

### 2. Possessives, Articles, Agreement & Collocations
- **Target Area:** `grammar-collocations`
- **Rule ID:** `gemini-gram-02`
- **Description:** Verify precision in minor grammatical agreements and high-frequency English collocations.
- **Check Points:**
  - Check third-person singular `-s` and past tense consistency across clauses.
  - Verify correct indefinite/definite article usage (`a`, `an`, `the`, or zero article).
  - Verify singular/plural noun possessives (e.g., `the boy's`, `the students'`).
  - Verify natural prepositional collocations (e.g., `interested in`, `good at`, `on the weekend` / `at the weekend`, `listen to`).

### 3. Translated-Chinese Phrasing Elimination
- **Target Area:** `chinese-naturalness`
- **Rule ID:** `gemini-zh-03`
- **Description:** Eliminate English syntax structures mirrored in Traditional Chinese text.
- **Check Points:**
  - Ensure all `instructionsZh`, `meaningZh`, `explanationZh`, `contextZh`, and `walkthroughZh` are written in fluent, idiomatic Taiwanese Traditional Chinese (正體中文).
  - Remove translationese (歐化中文), awkward passive constructions (e.g., 不自然的「被...所...」), and redundant pronouns.

### 4. Answer Integrity & Causal/Evidence Correctness
- **Target Area:** `explanation-causality`
- **Rule ID:** `gemini-exp-04`
- **Description:** Ensure every answer explanation actually explains why the answer is correct with explicit textual or grammatical evidence and clear causal reasoning.
- **Check Points:**
  - The explanation must clearly state *why* the correct answer is right by citing specific passage evidence or grammar rules.
  - For multiple-choice questions, the explanation must concisely eliminate key distractors with unbroken logical causality.
  - Explanations must be self-contained so a junior-high student studying alone can understand their mistake without external assistance.

### 5. Formatting Content & Option Values
- **Target Area:** `formatting-content`
- **Rule ID:** `gemini-fmt-05`
- **Description:** Do not embed option labels such as "A)" inside option text. Option values must contain content only.
- **Check Points:**
  - Verify options in multiple-choice questions do not begin with `(A)`, `A)`, `A.`, or `[A]`.
  - Renderer owns option markers like `(A)` deterministically; option values hold pure content.

## Human-Maintained Observations

<!--
Human operators: record observed model behaviors here.
Repeated or critical patterns can be promoted into Active Quality Rules above.
-->
