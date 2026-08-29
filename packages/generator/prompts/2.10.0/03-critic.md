# Prompt 03 Overlay: Mandatory 5-Dimension Adversarial Critic (v2.10.0)

Apply the complete inherited independent critic contract, with Curriculum Schema 2.3.0 and Prompt Version 2.10.0.

In addition to structural, CAP, grounding, and workload audits, the critic MUST independently evaluate and record specific, non-empty verification evidence across the following 5 critical quality dimensions. Do not pad evidence to satisfy a character count.

## 1. `evidence-boundary`
Verify that all reading comprehension and reading-based CAP questions draw evidence strictly and exclusively from `studentLesson.reading.blocks`. Reject any item where the targeted sentence or example was located in an instruction box, tip note, or practice prompt.

## 2. `answer-entailment`
Verify that all open-response parent answers, rubrics, and multiple-choice options strictly preserve epistemic modality, condition scope, and task instructions:
- **Condition & Scope Preservation**: Reject any question, answer rubric, or explanation that silently drops decisive control conditions or qualifiers from the reading (e.g. omitting that length and tension must be held equal when comparing string thickness), converting a bounded relation into an invalid claim.
- **Hypothetical vs. Asserted Facts**: Reject any package where hypothetical passage conditions ("if X happens") were converted into asserted observed facts or fabricated records ("records showed that X stayed high").
- **Task Instruction Compliance**: Verify that model answers in `answers` strictly obey explicit prompt constraints (e.g. exact requested sentence count, requested number of items/reasons, specified connectors). Reject any model answer that violates the prompt's own explicit constraints.

## 3. `lexical-integrity`
Verify lexical appropriateness holistically for this learner: core vocabulary should be useful, genuinely difficult words should receive enough support, and context-clue targets should have usable textual clues. Do not reject merely because a token is outside the official 2000-word list or because a deterministic inflection/derivation heuristic would fail to recognize it.

## 4. `task-topology`
Verify cognitive mechanism diversity across practice questions. Reject question template collapse where multiple items reuse the same shallow reasoning mechanic or repetitive matching schema.

## 5. `level-calibration`
Verify that language complexity, reading passage depth, and cognitive demand match the learner's diagnosed band. Reject artificial linguistic flattening or low-level D1/D2 confinement for advanced learners.

## Critic Acceptance & Recording Contract
- **Passing Verification**: All five mandatory dimensions require a specific, non-empty passing critical check (`passed: true`) in `qualityEvidence.criticalChecks` for final deterministic approval. No arbitrary character minimum applies.
- **Defect Tracking**: When defects or quality failures are discovered during review, record them in `qualityEvidence.criticFindings` with appropriate severity (`'critical'` or `'warning'`).
- **Post-Repair Re-Verification**: After a critical finding is repaired by the repair engine, the corresponding dimension must be re-verified with a passing critical check (`passed: true`), and the finding must document its `resolution`.
- **Unresolved Findings Blocking**: Any unresolved critical finding (`severity: 'critical'` with missing/empty `resolution`) strictly blocks publication.
