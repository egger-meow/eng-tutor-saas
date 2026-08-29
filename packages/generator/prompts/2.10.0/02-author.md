# Prompt 02 Overlay: Evidence Boundaries, Modality Truth & Lexical Integrity (v2.10.0)

Apply the complete inherited authoring contract, with Curriculum Schema 2.3.0 and Prompt Version 2.10.0.

## 1. Strict Primary Reading Evidence Boundary

All reading comprehension and reading-based CAP assessment items must draw evidence exclusively from `studentLesson.reading.blocks`:
- **Explicit Location Anchoring**:
  - Every CAP-governed assessment item must specify valid `evidenceAnchors` in its internal `cap-plan:<questionId>` check.
  - Every non-CAP reading-dependent assessment item (e.g. guided/independent reading comprehension, detail, inference) must specify a compact internal `evidence-plan:<questionId>` check in `qualityEvidence.criticalChecks` declaring `evidenceScope: "primary_reading"` and valid `evidenceAnchors` pointing to `studentLesson.reading.blocks.<idx>.<field>` where `anchorText` occurs verbatim.
  - Pure vocabulary and grammar recall items remain exempt unless they explicitly claim reading evidence.
- **Quote Verifiability**: Any quoted sentence or phrase appearing inside a question prompt must be verbatim present in the declared reading passage blocks.

## 2. Modality Preservation & Textual Entailment

Preserve strict factual truth and epistemic modality across all question prompts, parent answers, and explanations:
- **Hypothetical vs. Observed Distinction**: If the passage describes a condition or hypothetical scenario ("If eaten portions are high...", "It could happen that..."), never convert it into an asserted historical record or observed fact ("the record shows that eaten portions remained high for days").
- **No Invented Evidence**: Never synthesize ungrounded backstory, fabricated data logs, or phantom experiments in parent answer rubrics or multiple-choice distractors.

## 3. Lexical Integrity & Anchored Core Vocabulary

Ensure strict alignment between vocabulary cards and authored text:
- **Mandatory Reading Anchoring**: Every core vocabulary item with `status: 'new'` or `'extension'` must appear directly in the primary reading passage text.
- **Ceiling & Target Integrity**: Never target an untaught, out-of-ceiling word with a context-clue or definition question unless adequate context clues are explicitly built into the primary reading text.
- **Linguistic Richness**: Maintain level-appropriate sentence variety, cohesive conjunctions, and expressive phrasing suited to the learner's calibrated band.
