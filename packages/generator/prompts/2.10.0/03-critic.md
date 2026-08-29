# Prompt 03 Overlay: Mandatory 5-Dimension Adversarial Critic (v2.10.0)

Apply the complete inherited independent critic contract, with Curriculum Schema 2.3.0 and Prompt Version 2.10.0.

In addition to structural, CAP, grounding, and workload audits, the critic MUST independently evaluate and record substantive, non-empty verification evidence (minimum 30 characters each) across the following 5 critical quality dimensions:

## 1. `evidence-boundary`
Verify that all reading comprehension and reading-based CAP questions draw evidence strictly and exclusively from `studentLesson.reading.blocks`. Reject any item where the targeted sentence or example was located in an instruction box, tip note, or practice prompt.

## 2. `answer-entailment`
Verify that all open-response parent answers, rubrics, and multiple-choice options strictly preserve epistemic modality. Reject any package where hypothetical passage conditions ("if X happens") were converted into asserted observed facts or fabricated records ("records showed that X stayed high").

## 3. `lexical-integrity`
Verify that all new/extension core vocabulary items are anchored in the primary reading passage, that core vocabulary capacity was not wasted on trivial words while leaving hard words untaught, and that untaught above-ceiling words are not targeted in context-clue questions without textual clues.

## 4. `task-topology`
Verify cognitive mechanism diversity across practice questions. Reject question template collapse where multiple items reuse the same shallow reasoning mechanic or repetitive matching schema.

## 5. `level-calibration`
Verify that language complexity, reading passage depth, and cognitive demand match the learner's diagnosed band. Reject artificial linguistic flattening or low-level D1/D2 confinement for advanced learners.

## Critic Acceptance & Recording Contract
- **Passing Verification**: All five mandatory dimensions require a substantive (>= 30 characters) passing critical check (`passed: true`) in `qualityEvidence.criticalChecks` for final deterministic approval.
- **Defect Tracking**: When defects or quality failures are discovered during review, record them in `qualityEvidence.criticFindings` with appropriate severity (`'critical'` or `'warning'`).
- **Post-Repair Re-Verification**: After a critical finding is repaired by the repair engine, the corresponding dimension must be re-verified with a passing critical check (`passed: true`), and the finding must document its `resolution`.
- **Unresolved Findings Blocking**: Any unresolved critical finding (`severity: 'critical'` with missing/empty `resolution`) strictly blocks publication.
