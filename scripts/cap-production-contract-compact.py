from pathlib import Path

Path('packages/generator/curriculum/cap-precedent-contract.md').write_text('''# CAP Precedent-First Assessment Contract

## Invariant

**No normal assessment item starts from a blank page when a relevant authoritative CAP precedent exists.** CAP is a design anchor, never a copy source. Explicit teaching/retrieval may remain simpler.

## Runtime retrieval

The bundle carries a compact 195-card non-holdout routing index. Route each governed item by skill, depth, language difficulty, evidence mode/span, genre, and distractor needs. After claim, read only 1–2 selected `packages/generator/curriculum/cap-precedent-shards/*.json` files from the same Git SHA and retrieve 1–5 rich anchors. Never read `history_exams/`, raw PDFs, holdouts, or the full rich runtime during weekly authoring.

Preserve evidence topology, reasoning, cognitive demand, correct-answer construction, and distractor logic. Replace surface content.

## Per-item plan

Every `cap-transfer` item, four-option `independent` item, and assessment-style four-option homework item needs a passed `cap-plan:<questionId>` critical check. Its compact JSON contains:

`learningObjective`, `primarySkill`, `secondarySkills`, `targetLanguageDifficulty`, `targetCognitiveDepth`, `evidenceMode`, `evidenceSpan`, `reasoningOperations`, `precedentRefs`, `preservedMechanics`, `adaptationStrategy`, `distractorStrategies`, `intentionalRecall`, `noPrecedentReason`.

`qualityEvidence.precedentRefs` equals the union of per-item refs.

A weaker learner may receive A1/A2 language with D2/D3 thinking. Simplifying English must not erase evidence dependency or reasoning.

Relevant anchors make `precedentRefs` mandatory. If none exists, CAP recipe/blueprint fallback needs a specific `noPrecedentReason`. `intentionalRecall: true` is only for explicit vocabulary/grammar retrieval outside `cap-transfer`.

## Quality floor and repair

The critic and deterministic Finisher reject missing/unknown refs, authority/provenance mismatch, decorative or context-free comprehension, naked dictionary-definition comprehension, depth collapse, weak distractor planning, and historical phrase-copy overlap. Exactly one answer remains evidence-supported.

Repair only the failing item/local cluster and dependent answer/explanation/plan; preserve valid surrounding material.

## Authority and provenance

A passed `cap-provenance` check encodes exact `capKnowledgeVersion`, `capCorpusHash`, `capBundleVersion`, `plannerVersion`, and `qualityFloorVersion`. Production fails closed without authoritative CAP runtime; provisional/mock knowledge is forbidden.
''', encoding='utf-8')
