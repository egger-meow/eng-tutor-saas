# Prompt Suite 2.10.0

## Focus: Material Quality Contract Upgrade & Semantic Failure Prevention

Prompt Suite 2.10.0 introduces systemic safeguards against the 4 critical material quality failures observed in production review:

1. **Strict Primary Reading Evidence Boundaries**: Enforces `evidenceScope: "primary_reading"` and explicit block-level `evidenceAnchors`, preventing cross-section instruction leakage into reading assessments.
2. **Strict Answer Grounding & Epistemic Modality Preservation**: Prohibits converting hypothetical conditions into fabricated observed records or facts in parent answer rubrics and MCQ options.
3. **Lexical Integrity & Morphology Normalization**: Differentiates lexical ceiling severity, mandates reading anchors for new vocabulary, prevents core quota wasting on basic words, and prevents false positives on standard inflections/derivations.
4. **Task Topology Profiling & Learner-Level Calibration**: Mandates 5-dimension adversarial critic verification (`evidence-boundary`, `answer-entailment`, `lexical-integrity`, `task-topology`, `level-calibration`) and prevents repetitive question mechanism collapse.
