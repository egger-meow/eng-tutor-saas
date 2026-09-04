# Finisher Objective-Integrity Boundary Design

## Goal

Make the deterministic Finisher a narrow integrity gate instead of a second semantic Critic. A package may be semantically criticized and repaired by Author/Critic, but Finisher may hard-reject only failures that are machine-provable from canonical package/context/runtime state.

## Authority

This design implements the current `docs/curriculum-quality-rubric.md` release bar:

- deterministic hard failures are limited to schema/structure, required references, CAP authority/provenance, exact binding/reference integrity, answer/key structural consistency, release/version integrity, rendering/storage integrity, privacy/safety, and exact high-confidence bare bilingual/dictionary lookup patterns;
- approximate style, lexical difficulty, pedagogical scheduling, task diversity, Critic label coverage, finite-list checks, arbitrary counts, percentages, morphology heuristics, or other pseudo-semantic signals are advisory unless they prove an objective integrity error.

## Design

### 1. Default-deny blocking authority

`audit-curriculum.ts` remains the rich strict diagnostic audit used by Author/Critic and tests. `finisher-audit-policy.ts` becomes the blocking-policy boundary for audit findings.

The policy changes from exception-based downgrading to an explicit blocking allowlist. Any new strict-audit critical finding is advisory by default until its prefix/dimension is deliberately classified as objective.

### 2. Objective audit blockers

The Finisher may keep critical severity for:

- exact bare bilingual/dictionary lookup signatures;
- CAP runtime authority and provenance failures;
- missing/malformed required CAP plan/provenance references;
- unknown/inconsistent CAP references;
- exact evidence-scope/location/anchor binding failures;
- explicit passage-attributed quote mismatches;
- objective current-grounding timestamp contradictions;
- objective genre/block structural contradictions;
- reproducibility provenance failures such as an unknown input fingerprint.

CAP relevance, cognitive-depth calibration, distractor quality, decorative-context judgments, copy-overlap heuristics, arbitrary fallback-reason lengths, task scheduling, MCQ answer-position percentages, self-study wording, workload heuristics, and Critic bookkeeping remain diagnostic/advisory in Finisher.

### 3. Dedicated Finisher validator

The original `validateCurriculumPackage()` remains available as the strict diagnostic validator. Production package exports route `validateCurriculumPackage` to a dedicated Finisher validator instead, while exposing the original as `validateCurriculumPackageStrict`.

For newly authored Schema 2.4 packages, Finisher validation owns only objective structure/reference integrity. It rejects:

- invalid required types/fields;
- duplicate learning-target/question/answer IDs;
- missing or orphan answers;
- question target IDs that do not exist in `learningPlan.targets`;
- missing required core learning stages;
- unresolved explicit critical Critic findings;
- grounding Source -> Fact -> Claim reference/timestamp/exact-reading binding failures;
- unknown canonical grammar/communication tracking IDs.

It does not reject solely for semantic Critic bookkeeping such as a `criticalChecks` entry with `passed: false` or a missing exact `grounding-freshness` label.

### 4. Pedagogical cardinality boundary

Schema 2.4 authoring may still recommend richer counts, but Finisher does not treat those recommendations as release integrity. Its validation view permits a non-empty minimum for:

- one learning target rather than an arbitrary minimum of three;
- one opening goal rather than two;
- one worked example per instruction section rather than two;
- zero common-mistake examples rather than requiring one;
- one self-check item rather than two;
- one homework question rather than three;
- any non-empty primary reading rather than hard-rejecting solely below 120 words.

The core stage structure, response-space requirements, answer/reference integrity, and grounding bindings remain hard. The already-removed global 12-answerable-item minimum stays removed. Fixed counts/percentages must not regain blocking authority unless downstream integrity literally requires them.

### 5. Quote boundary regression

Quoted strings in a question are not reading evidence merely because the same string also appears in an instruction box. Strict audit may retain this as diagnostic evidence, but Finisher hard-blocks the quoted-overlap finding only when that specific quote is explicitly attributed to the reading/passage/article/text. Declared evidence anchors remain strict regardless of quote wording.

This prevents grammar/production prompts such as `Use "I am" ...` from being rejected while preserving `According to the reading, "I am" ...` mismatch detection.

### 6. Progression boundary cleanup

Cross-week vocabulary exposure/state consistency remains deterministic because it compares canonical IDs/statuses with stored history.

The rule deciding whether previously exposed grammar is pedagogically justified as the week's primary grammar is not deterministic. It depends on feedback interpretation, learner need, prerequisite repair, and Author/Critic judgment, so it must not produce a Finisher hard rejection.

### 7. Failure safety

Release/version mismatch, PDF render/inspection mismatch, storage integrity, job/child identity mismatch, and other technical integrity checks are unchanged.

No production job state is mutated by this code-change task. Existing rejected submissions remain immutable and retry through the normal pipeline.

## Regression bar

Tests must prove:

1. constructed `"I am"` grammar/production text overlapping instruction content does not hard-fail Finisher;
2. explicit reading attribution of absent `"I am"` still hard-fails;
3. a new unknown semantic critical finding defaults to warning in Finisher;
4. CAP provenance/evidence binding and bare bilingual lookup remain hard failures;
5. Critic bookkeeping and exact grounding-freshness label presence do not hard-fail Finisher validation;
6. unresolved explicit critical Critic findings still hard-fail;
7. pedagogical Schema 2.4 count floors above the non-empty structural minimum do not hard-fail;
8. previously exposed grammar-primary selection no longer hard-fails merely because deterministic heuristics cannot prove the pedagogical reason;
9. vocabulary exposure/status integrity still hard-fails;
10. unknown learning-target references such as `v-movement` still hard-fail;
11. full repository lint/test/typecheck/build pass before merge.
