# CAP Precedent-First Assessment Contract

This contract governs normal assessment, application, contextual grammar, and reading-comprehension design. Instruction, explanations, scaffolding, production tasks, and explicit vocabulary/grammar retrieval remain free to use simpler teaching forms.

## Permanent invariant

**No normal assessment item starts from a blank page when a relevant authoritative CAP precedent exists.**

The bundled cards are authoritative non-holdout design anchors. They expose abstract assessment mechanics only. Never reconstruct or copy historical wording, answers, entities, topics, visuals, or numbers. Holdouts are absent from the production runtime library.

## Assessment intent planning

Before authoring each four-option question in `independent`, every question in `cap-transfer`, and every assessment-style four-option homework question:

1. plan the learning objective, primary/secondary skill, language difficulty, cognitive depth, evidence mode/span, and reasoning operations;
2. retrieve 1–5 best-matching cards by those dimensions plus distractor mechanics;
3. preserve evidence topology, reasoning operation, cognitive demand, and distractor logic;
4. adapt topic, entities, wording, facts, numbers, passage/visual content, and answer wording for this learner;
5. simplify English independently from thinking depth.

For each governed question `<questionId>`, add a passed `qualityEvidence.criticalChecks` record with id `cap-plan:<questionId>`. Its `evidence` MUST be compact valid JSON with these fields:

```json
{
  "learningObjective": "...",
  "primarySkill": "...",
  "secondarySkills": [],
  "targetLanguageDifficulty": "A1_elementary | A2_basic | B1_intermediate",
  "targetCognitiveDepth": "D1_verbatim_retrieval | D2_single_step_inference | D3_multi_step_synthesis | D4_evaluative_pragmatic",
  "evidenceMode": "...",
  "evidenceSpan": "...",
  "reasoningOperations": ["..."],
  "precedentRefs": ["cap-..."],
  "preservedMechanics": ["..."],
  "adaptationStrategy": ["..."],
  "distractorStrategies": ["..."],
  "intentionalRecall": false,
  "noPrecedentReason": null
}
```

`qualityEvidence.precedentRefs` is the de-duplicated union of every per-item `precedentRefs` array. This package-level list is for compact provenance; it does not replace item-level plans.

## Intentional retrieval exemption

Vocabulary or grammar recall may set `intentionalRecall: true` when it is explicitly a retrieval drill outside `cap-transfer`. This is not a loophole for comprehension/application items. A normal comprehension item such as `What is the meaning of "brave"?` is rejected; an explicitly planned vocabulary retrieval task may remain simple.

## No-precedent fallback

Retrieval is mandatory when a relevant card exists. If deterministic retrieval finds none, the plan may use authoritative CAP recipes/blueprint only when `noPrecedentReason` specifically explains why no direct anchor applies. Never silently skip retrieval.

## Independent language and cognition controls

A weaker learner may receive A1/A2 language with D2/D3 thinking. Simplify vocabulary, syntax, entity count, or instructions without deleting evidence dependency, constraint integration, inference, spatial reasoning, discourse reasoning, or plausible distractors. Difficulty must not be created merely through obscure words.

## CAP quality-floor critic

Before submission, independently check every governed item for evidence necessity, planned cognitive depth, exactly one evidence-supported answer, plausible misconception-based distractors, precedent-mechanism fidelity, and worksheet regressions. Reject decorative context, context-free comprehension, absurd distractors, accidental shallow recall, answer giveaways, and D3/D4 claims whose reasoning collapsed during simplification.

The deterministic Finisher re-runs this floor. Prompt-level self-attestation is insufficient.

## Anti-copy

The runtime cards contain only abstracted design fields plus one-way five-word phrase fingerprints. The Finisher rejects repeated historical phrase-fingerprint overlap for an anchored item. Transfer mechanics, never source wording.

## Targeted repair only

CAP-floor failure repairs only the failing question or local cluster plus dependent answer/explanation and its `cap-plan` evidence. Preserve valid reading, grounding, stable IDs, targets, unrelated questions, and history. Re-retrieve a better anchor or restore missing reasoning/distractor structure. Existing bounded retry/failure lifecycle remains authoritative.

## Runtime authority and provenance

Add a passed critical check `cap-provenance` whose `evidence` is valid JSON containing exactly the values published at the top of the authoritative runtime card bundle:

- `capKnowledgeVersion`
- `capCorpusHash`
- `capBundleVersion`
- `plannerVersion`
- `qualityFloorVersion`

Production must fail closed if the CAP runtime bundle is not authoritative. Never consume mock/provisional CAP knowledge and never claim CAP grounding when the authority gate is unavailable.
