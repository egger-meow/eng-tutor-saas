# CAP Precedent-First Assessment Contract

The precedent index contains only authoritative, non-holdout CAP metadata. It is internal evidence, never learner-facing content.

Before assessment authoring, Planner and Author must search by skill, cognitive depth, evidence mode/span, genre, and distractor mechanism. When relevant cards exist, start from those mechanics and record an opaque `cap-...` ref in `qualityEvidence.precedentRefs`. Never copy or paraphrase historical wording, answers, names, or topics. Transfer only evidence relationships, reasoning, depth, and distractor logic.

Language difficulty and cognitive depth are independent controls. Simplifying vocabulary must not collapse a planned multi-step inference into retrieval; raising cognitive depth must not silently raise the lexical ceiling.

Deterministic quality floor before submission:

1. Every `cap-transfer` question has one or more internal precedent refs.
2. Every ref exists in the bundled index.
3. Each referenced card matches the authored item's primary skill and intended cognitive depth, or the package records a specific justified adjacent-depth adaptation.
4. The item requires the claimed evidence span and reasoning operation; no answer is obtainable by keyword matching when deeper reasoning is claimed.
5. Exactly one answer is independently entailed, and every distractor embodies a declared misconception without becoming a second valid answer.
6. Lexical-ceiling checks pass independently of the cognitive-depth checks.

Failure blocks submission. Repair only the failing item and answer/explanation while preserving valid reading, grounding, targets, unrelated questions, IDs, and answer distribution. Retrieve a better card, restore missing reasoning, simplify surface language without weakening mechanics, or rebuild the defective distractor. Re-run the floor.

Holdouts are absent. Never reconstruct or cite them.
