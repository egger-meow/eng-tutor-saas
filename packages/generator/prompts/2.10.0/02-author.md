# Prompt 02 Overlay: Evidence Boundaries, Modality Truth & Lexical Integrity (v2.10.0)

Apply the complete inherited authoring contract, with Curriculum Schema 2.3.0 and Prompt Version 2.10.0.

## 1. Strict Primary Reading Evidence Boundary

All reading comprehension and reading-based CAP assessment items must draw evidence exclusively from `studentLesson.reading.blocks`:
- **Explicit Location Anchoring**:
  - Every CAP-governed assessment item must specify valid `evidenceAnchors` in its internal `cap-plan:<questionId>` check.
  - Every non-CAP reading-dependent assessment item (e.g. guided/independent reading comprehension, detail, inference) must specify a compact internal `evidence-plan:<questionId>` check in `qualityEvidence.criticalChecks` declaring `evidenceScope: "primary_reading"` and valid `evidenceAnchors` pointing to `studentLesson.reading.blocks.<idx>.<field>` where `anchorText` occurs verbatim.
  - Pure vocabulary and grammar recall items remain exempt unless they explicitly claim reading evidence.
- **Quote Verifiability**: A quote explicitly attributed to the reading/passage/author must be verbatim present in the declared reading blocks. Constructed assessment stimuli (for example, `A student says, "..."`) are allowed and are judged by their evidence anchors rather than passage-string identity.

## 2. Modality Preservation, Scope Consistency & Task Constraint Adherence

Preserve strict factual truth, decisive qualifiers, and epistemic modality across all question prompts, parent answers, and explanations:
- **Condition & Scope Preservation**: Bounded claims in Reading (e.g. comparative outcomes depending on controlled factors like length, tension, thickness, temperature, baseline state) must preserve all materially necessary qualifiers across Reading, Instruction, Question prompts, and Answer explanations.
  - Instruction cannot silently strengthen or weaken a Reading claim.
  - Questions cannot drop decisive conditions from the evidence they depend on (e.g. asking what reading predicts for thicker vs thinner strings without specifying that length and tension are held equal).
  - Answer explanations cannot expand a bounded claim into an unqualified universal claim.
  - Modality and scope must remain consistent across: `Reading → Instruction → Question → Answer`.
- **Hypothetical vs. Observed Distinction**: If the passage describes a condition or hypothetical scenario ("If eaten portions are high...", "It could happen that..."), never convert it into an asserted historical record or observed fact ("the record shows that eaten portions remained high for days").
- **No Invented Evidence**: Never synthesize ungrounded backstory, fabricated data logs, or phantom experiments in parent answer rubrics or multiple-choice distractors.
- **Task Constraint Adherence in Model Answers**: Model answers in `answers` must strictly obey all explicit structural constraints given in question prompts, such as:
  - Exact requested sentence count (e.g. if the prompt specifies "Write two sentences.", provide exactly two sentences, not four or one).
  - Requested number of examples or comparison dimensions.
  - Requested connectors or grammatical structures.

## 3. Lexical Integrity & Anchored Core Vocabulary

Ensure strict alignment between vocabulary cards and authored text:
- **Mandatory Reading Anchoring**: Every core vocabulary item with `status: 'new'` or `'extension'` must appear directly in the primary reading passage text.
- **Ceiling & Target Integrity**: Use learner-level judgment, context, and instructional value when deciding whether an unfamiliar word is acceptable or should be taught. The official 2000-word foundation is a planning reference, not a deterministic allowlist; ordinary inflections, derivations, compounds, transparent topic words, and natural domain language must not be treated as automatic defects merely because a fixed list or morphology heuristic misses them.
- **Linguistic Richness**: Maintain level-appropriate sentence variety, cohesive conjunctions, and expressive phrasing suited to the learner's calibrated band.

## 4. Structured Response Layout Authoring

When a question prompt or instruction directs the learner to fill out or create a table or multi-column organizer (such as comparing changed features, controlled features, and outcomes):
- Provide structured response metadata in `responseLayout`:
  - `type`: `"table"` or `"organizer"`
  - `headers`: column header titles (e.g. `["Feature", "What changes?", "What stays the same?", "Pitch result"]`)
  - `rows`: list of row objects with optional `label` (e.g. `label: "Thickness"`, `label: "Tension"`, `label: "Vibrating length"`) and optional initial values.

