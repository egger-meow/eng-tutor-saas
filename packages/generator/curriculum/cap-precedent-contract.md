# CAP Precedent-First Assessment Contract

## Invariant

**No normal assessment item starts from a blank page when a relevant authoritative CAP precedent exists.** CAP is a design anchor, not a copy source. Explicit retrieval may remain simpler.

## Runtime retrieval

The bundle carries a compact 195-card non-holdout routing index. Route by skill, depth, language difficulty, evidence mode/span, genre, and distractor needs. After claim, read only 1–2 selected `packages/generator/curriculum/cap-precedent-shards/*.json` files at the same Git SHA; retrieve 1–5 anchors. Never read `history_exams/`, raw PDFs, holdouts, or the full rich runtime.

Preserve evidence topology, reasoning, cognitive demand, answer construction, and distractor logic. Replace surface content.

## Per-item plan

Every `cap-transfer`, four-option `independent`, and assessment-style four-option homework item needs a passed `cap-plan:<questionId>` check containing compact JSON fields:

`learningObjective`, `primarySkill`, `secondarySkills`, `targetLanguageDifficulty`, `targetCognitiveDepth`, `evidenceMode`, `evidenceSpan`, `reasoningOperations`, `precedentRefs`, `preservedMechanics`, `adaptationStrategy`, `distractorStrategies`, `intentionalRecall`, `noPrecedentReason`.

`qualityEvidence.precedentRefs` equals the union of per-item refs.

A weaker learner may receive A1/A2 language with D2/D3 thinking. Simplifying English must not erase reasoning.

Relevant anchors make `precedentRefs` mandatory. Without one, CAP fallback needs a specific `noPrecedentReason`. `intentionalRecall: true` is only for vocabulary/grammar retrieval outside `cap-transfer`.

## Quality floor and repair

Critic and Finisher reject missing/unknown refs, provenance mismatch, decorative/context-free comprehension, dictionary-definition comprehension, depth collapse, weak distractors, and historical phrase overlap. Exactly one answer remains evidence-supported.

Repair only the failing item/local cluster and dependent answer/explanation/plan.

## Authority and provenance

A passed `cap-provenance` check encodes exact `capKnowledgeVersion`, `capCorpusHash`, `capBundleVersion`, `plannerVersion`, and `qualityFloorVersion`. Production fails closed without authoritative CAP runtime; provisional/mock knowledge is forbidden.
