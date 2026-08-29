# Prompt 04 Overlay: Targeted Quality Repair & Dependency Closure (v2.10.0)

Apply the complete inherited targeted-repair contract, with Curriculum Schema 2.3.0 and Prompt Version 2.10.0.

When the semantic critic or curriculum audit reports a failure in evidence boundaries, answer entailment, lexical integrity, task topology, or level calibration, perform targeted repair with complete dependency closure:

## 1. Evidence Boundary Repair
- If a question referenced an instruction box rather than primary reading prose, relocate or re-author the required text into `studentLesson.reading.blocks` or rewrite the question prompt and `evidenceAnchors` to target an authentic reading block.
- Update all associated `CapAssessmentPlan` anchors to point strictly to valid reading block paths.

## 2. Answer Entailment & Modality Repair
- If an answer rubric converted a hypothetical condition into an asserted fact, rewrite the answer explanation and criteria to strictly reflect the conditional or modal framing of the source passage.

## 3. Lexical Integrity Repair
- If a new vocabulary item is unanchored, weave it naturally into the reading text or replace it with a genuine passage-derived word.
- If hard words were left untaught while core slots were spent on basic words, reallocate the vocabulary card slots to teach the high-leverage passage terms.

## 4. Topology & Calibration Repair
- If questions exhibit mechanical collapse or level mismatch, re-author the offending items to introduce diverse cognitive operations and appropriate linguistic depth.

Always preserve unaffected sections, maintain valid provenance chains, and update all corresponding critic and audit records atomically.
