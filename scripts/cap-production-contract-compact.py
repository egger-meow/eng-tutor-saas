from pathlib import Path

Path('packages/generator/curriculum/cap-precedent-contract.md').write_text('''# CAP Precedent-First Assessment Contract

## Invariant

**No normal assessment item starts from a blank page when a relevant authoritative CAP precedent exists.** CAP is a design anchor, never a copy source. Instruction, scaffolding, production, and explicit vocabulary/grammar retrieval may remain simpler teaching tasks.

## Runtime retrieval

This bundle contains a compact 195-card non-holdout routing index, not the full historical corpus. For each governed item, route by primary/secondary skill, cognitive depth, language difficulty, evidence mode/span, genre, and distractor needs. After the authoritative batch claim, read only the 1–2 `packages/generator/curriculum/cap-precedent-shards/*.json` paths selected by the routing index, from the exact same Git SHA. Retrieve 1–5 rich anchors. Never read `history_exams/`, raw PDFs, holdouts, or the full rich runtime during weekly authoring.

Preserve evidence topology, reasoning, cognitive demand, correct-answer construction, and distractor logic. Change topic, entities, wording, facts, numbers, passage/visual content, and answer wording.

## Per-item plan

Every `cap-transfer` item, every four-option `independent` item, and every assessment-style four-option homework item needs a passed `qualityEvidence.criticalChecks` record `cap-plan:<questionId>`. Its evidence is compact JSON containing:

`learningObjective`, `primarySkill`, `secondarySkills`, `targetLanguageDifficulty`, `targetCognitiveDepth`, `evidenceMode`, `evidenceSpan`, `reasoningOperations`, `precedentRefs`, `preservedMechanics`, `adaptationStrategy`, `distractorStrategies`, `intentionalRecall`, `noPrecedentReason`.

`qualityEvidence.precedentRefs` must equal the de-duplicated union of per-item refs.

A weaker learner may receive A1/A2 language with D2/D3 thinking. Simplifying English must not erase evidence dependency or reasoning.

If relevant anchors exist, `precedentRefs` is mandatory. If none exists, CAP recipes/blueprint fallback requires a specific `noPrecedentReason`. `intentionalRecall: true` is allowed only for explicit vocabulary/grammar retrieval outside `cap-transfer`.

## Quality floor and repair

The independent critic and deterministic Finisher reject missing/unknown refs, authority/provenance mismatch, decorative context, context-free comprehension, naked dictionary-definition comprehension, D3/D4 depth collapse, implausible distractor planning, and historical phrase-copy overlap. Exactly one answer must remain evidence-supported.

Repair only the failing item/local cluster and dependent answer/explanation/plan. Preserve valid reading, grounding, IDs, targets, and unrelated questions.

## Authority and provenance

A passed `cap-provenance` critical check must encode the runtime's exact `capKnowledgeVersion`, `capCorpusHash`, `capBundleVersion`, `plannerVersion`, and `qualityFloorVersion`. Production fails closed if authoritative CAP runtime is unavailable; never substitute provisional/mock knowledge.
''', encoding='utf-8')
