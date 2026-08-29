
Work on the current `main` branch of `egger-meow/eng-tutor-saas`.

Read `AGENTS.md` first. Follow the repository instructions exactly:
- read `docs/SPEC-TOC.md`
- read the required Agent Instructions / curriculum / generator sections of `docs/SPEC.md`
- inspect the current production material-generation pipeline before changing anything
- inspect the completed Historical CAP Exam subsystem under `history_exams/**` and `scripts/history-exams/**`

Do not begin by redesigning the CAP digestion subsystem.

The historical CAP subsystem now exists for one reason:

# Goal

Integrate the authoritative CAP knowledge into the production material-generation pipeline so it provides TWO permanent guarantees.

## Guarantee 1 — Permanent Assessment Direction

From now on, production assessment content must never be designed from a blank page when relevant authentic CAP precedents exist.

The five-year CAP corpus is the system's assessment-design ground truth.

For every generated exercise, reading-comprehension item, contextual grammar item, application question, or assessment-style task, the system should first establish an explicit design direction using relevant CAP evidence.

The generator should know:

- what authentic CAP questions with similar objectives look like
- what evidence structures they use
- what reasoning operations they require
- how cognitive depth is created
- how correct options are constructed
- how distractors are made plausible
- how language difficulty can be changed without destroying reasoning quality

This is a DESIGN reference system, not a text-copying system.

## Guarantee 2 — CAP-Based Quality Floor

The more important guarantee:

> Normal assessment-style material must not fall below a quality floor derived from authentic CAP assessment design.

Even the least creative acceptable generated exercise should still be able to fall back to:

1. retrieve one or more relevant authentic CAP precedents
2. preserve their assessment mechanism
3. replace topic, entities, wording, vocabulary, scenario, and surface content
4. adapt language difficulty to the current student
5. preserve meaningful evidence dependency, reasoning structure, and distractor quality

Therefore, when a strong relevant precedent exists, a weak generic AI worksheet item should never be preferred over a CAP-grounded adaptation.

Examples of unacceptable regression include normal comprehension exercises such as:

- naked dictionary-definition questions
- decorative passages
- questions answerable without their provided context
- obviously absurd distractors
- repetitive single-sentence fill-in-the-blank worksheets
- difficulty created only through obscure vocabulary
- context that contributes no evidence
- questions whose reasoning disappears when language is simplified

Intentional vocabulary recall, grammar drills, explanations, scaffolding, teacher tips, and instructional teaching content are NOT required to imitate CAP questions.

The CAP quality floor primarily governs assessment / application / comprehension practice.

---

# Core Product Principle

Implement this as a permanent production invariant:

> No assessment item is generated from a blank page when a relevant CAP precedent exists.

The model may create novel content.

It must not invent assessment design unnecessarily when authentic design precedent is available.

CAP examples are design anchors, not copy sources.

---

# Architecture

Do not dump the entire five-year corpus into every generation prompt.

Build a compact runtime layer:

```text
Student State
+
Weekly Learning Objectives
+
Curriculum Constraints
+
Student History / Feedback
        ↓
Assessment Intent Planner
        ↓
CAP Precedent Retriever
        ↓
Question Design Anchors
        ↓
Material Authoring
        ↓
CAP Quality Floor Critic
        ↓
Targeted Repair
        ↓
Existing deterministic validation / rendering pipeline
````

Preserve existing production architecture wherever possible.

Do not replace the current curriculum, grounding, personalization, retry, rendering, or delivery systems.

CAP intelligence should become an additional assessment-design layer.

---

# 1. CAP Precedent Retriever

Create a deterministic/searchable runtime representation of the authoritative CAP corpus.

The retriever should search the detailed per-question analyzed corpus first, not only the summarized blueprint.

The 215 analyzed questions are the primary precedent library.

Cross-year knowledge artifacts such as:

* taxonomy
* recipes
* distractor patterns
* depth framework
* anti-patterns
* blueprint

are secondary guidance.

For a planned assessment item, retrieval should consider dimensions such as:

```text
target skill
secondary skill
language difficulty
desired cognitive depth
evidence mode
genre
evidence span
reasoning operations
question mechanism
student learning objective
grammar target
vocabulary target
```

Return a small number of highly relevant precedents, approximately 1–5.

Do not retrieve dozens of examples.

Each returned precedent should expose only the information required for assessment design, such as:

```ts
type CapDesignAnchor = {
  examId: string;
  questionNumber: number;

  primarySkill: string;
  secondarySkills: string[];

  cognitiveDepth: string;
  languageDifficulty: string;

  evidenceMode: string;
  evidenceNecessity: string;
  evidenceSpan: string;

  reasoningOperations: string[];
  questionMechanism: string;

  correctAnswerConstructionPrinciple: string;
  distractorMechanisms: string[];

  reusableDesignPrinciple: string;
  difficultyAdjustment: ...;

  sourceReference: ...;
};
```

The runtime representation should NOT expose raw CAP wording unless genuinely necessary.

Prefer abstracted design information.

---

# 2. Assessment Intent Planner

Before writing assessment items, explicitly plan what each item is supposed to do.

Do not allow the authoring model to simultaneously invent:

* learning goal
* skill
* depth
* evidence structure
* question type
* distractors

from scratch.

For each assessment item or item cluster, create an internal plan such as:

```ts
type AssessmentItemPlan = {
  learningObjective: string;

  primarySkill: string;
  secondarySkills: string[];

  targetLanguageDifficulty: string;
  targetCognitiveDepth: string;

  evidenceMode: string;
  evidenceSpan: string;

  reasoningOperations: string[];

  precedentRefs: Array<{
    examId: string;
    questionNumber: number;
  }>;

  preservedMechanics: string[];

  adaptationStrategy: string[];

  distractorStrategies: string[];

  intentionalRecall?: boolean;
};
```

This can remain internal to the generator.

Do not expand the public/material schema unless necessary.

---

# 3. Language Difficulty and Cognitive Depth Must Stay Independent

This is a hard requirement.

A weaker student may receive:

```text
A1/A2 language
+
D2/D3 reasoning
```

Do not lower cognitive quality automatically when vocabulary becomes easier.

CAP mechanics should be adaptable downward in language complexity while preserving meaningful thinking.

Example:

An authentic map-navigation or multi-constraint CAP mechanism may be adapted for a younger student by:

* reducing vocabulary
* shortening instructions
* reducing number of entities
* simplifying sentence grammar

while preserving:

* route reasoning
* constraint integration
* inference
* evidence dependency
* plausible distractors

Do not equate easier English with childish question design.

---

# 4. CAP-Grounded Adaptation, Not Copying

Implement anti-copy protections.

The system must NOT reproduce historical CAP questions with superficial substitutions.

Do not simply:

* change names
* change one noun
* change numbers
* preserve nearly identical wording

Use CAP questions for their hidden design structure.

A proper adaptation may preserve:

```text
evidence topology
reasoning operation
question mechanism
distractor logic
cognitive depth
```

while changing:

```text
topic
scenario
entities
surface wording
passage content
visual content
facts
numbers
answer wording
```

Add deterministic lexical-overlap / phrase-overlap protection where appropriate.

Historical CAP source text must not appear verbatim in student materials beyond unavoidable short generic phrases.

---

# 5. Quality Floor Critic

After authoring but before accepting assessment content, run an explicit CAP quality-floor review.

For each assessment item, evaluate at least:

### Evidence

* Is supplied context actually required?
* If the context/passage/image is removed, can the question still be answered?
* Is the evidence sufficient and unambiguous?

### Cognitive quality

* What reasoning operation does the student perform?
* Does the resulting item meet its planned cognitive depth?
* Did simplification accidentally remove the reasoning?

### Correct answer

* Is exactly one answer correct?
* Is it supported by evidence?
* Is it merely a verbatim copy when the task claims deeper comprehension?

### Distractors

* Are wrong options genuinely plausible?
* Do they correspond to specific misunderstandings?
* Are they too obviously wrong?
* Are they grammatically parallel where appropriate?

### Precedent fidelity

* Does the item preserve the intended mechanism from its CAP anchor?
* Has adaptation broken the original assessment structure?

### Worksheet-quality regression

Detect weak patterns including:

* isolated dictionary-definition questions used as comprehension
* decorative context
* irrelevant distractors
* repeated identical mechanics
* shallow recall dominating assessment sections
* answer giveaways
* context-free questions masquerading as reading comprehension

---

# 6. Targeted Repair Only

Do not regenerate an entire material package because one item fails.

Reuse the existing targeted-repair philosophy.

For failed items:

```text
original item
+
AssessmentItemPlan
+
CAP design anchors
+
critic failure evidence
        ↓
repair only that item / local cluster
```

Preserve already-valid material.

Retry must be bounded.

If an item repeatedly cannot meet the CAP quality floor, fail honestly according to the existing generation lifecycle rather than silently accepting weak material.

---

# 7. Assessment Mix

Do NOT turn every weekly material into a mock CAP exam.

CAP is the quality reference, not the required visual format of every page.

Weekly materials should still serve teaching and personalization.

Allow mixtures such as:

```text
instruction
scaffold
guided practice
intentional retrieval
contextual application
reading comprehension
CAP-inspired assessment
homework
```

The CAP quality floor applies strongest to the latter assessment/application portions.

A student who needs vocabulary recall should still receive vocabulary recall.

Do not reject a pedagogically intentional D1 drill merely because CAP contains deeper questions.

Instead, distinguish:

```text
intentional retrieval practice
```

from:

```text
accidentally shallow assessment
```

---

# 8. Retrieval Must Be Mandatory When Relevant

Do not make CAP retrieval an optional inspirational hint.

For normal assessment-style generation:

```text
relevant CAP precedent exists
→ precedent retrieval required
```

If no good precedent exists:

```text
no relevant precedent
→ generation may proceed from higher-level CAP recipes / blueprint
→ record why direct precedent was unavailable
```

The generator should never silently skip retrieval.

Add provenance showing which CAP anchors influenced each generated assessment item internally.

This provenance does NOT need to appear in parent/student PDFs.

It should be inspectable in generation/debug/admin provenance.

---

# 9. No Runtime Dependency on Historical PDFs

Production generation must NOT parse the five original PDFs.

Production should consume deterministic/versioned compiled CAP knowledge.

Build a compact production bundle from authoritative historical outputs.

For example:

```text
history_exams authoritative corpus
        ↓
compile
        ↓
versioned CAP runtime bundle
        ↓
production generator
```

The runtime bundle should contain only the fields needed for:

* retrieval
* planning
* authoring anchors
* quality criticism
* provenance

Keep source PDFs and heavy assets outside normal production prompts.

---

# 10. Authority Gate

Production must consume CAP knowledge only when the historical subsystem reports:

```text
structurallyValid = true
authorityEligible = true
authorityStatus = authoritative
```

Do not silently consume provisional/mock knowledge.

If the authoritative bundle is unavailable:

choose a fail-safe behavior consistent with current production reliability.

Do NOT secretly downgrade to provisional CAP data.

Existing generation behavior may remain available as an explicit fallback only if it cannot falsely claim CAP grounding.

---

# 11. Versioning & Provenance

Every production package influenced by CAP should internally record:

```text
capKnowledgeVersion
capCorpusHash
capBundleVersion
plannerVersion
qualityFloorVersion
precedentRefs
```

This should be sufficient to answer:

> Which CAP knowledge caused this item to be designed this way?

without exposing internal engineering metadata in student PDFs.

---

# 12. Evaluation Before Rollout

Do not immediately flip all production generation to the new system.

Create a deterministic evaluation harness comparing:

```text
current production generation
vs
CAP-grounded generation
```

Use representative student profiles / curriculum targets.

Evaluate at least:

```text
question mechanism diversity
context necessity
cognitive depth
language-level adherence
distractor quality
single-correct-answer validity
shallow-assessment rate
CAP precedent coverage
copy-overlap rate
```

Generate several synthetic material packages using the existing production pipeline.

Do not send them to users.

Render PDFs using the existing deterministic renderer and inspect them.

---

# 13. Regression Examples

Add tests demonstrating that the new system rejects or repairs examples equivalent to:

```text
What is the meaning of "brave"?
```

when placed inside a normal comprehension/application section without an intentional retrieval objective.

But this remains valid:

```text
Vocabulary Recall
1. brave = ?
```

when the planner explicitly marks it as intentional retrieval practice.

Also test:

* decorative passage
* answer obvious without context
* three absurd distractors
* low vocabulary + high cognitive depth
* CAP precedent retrieval
* no precedent fallback
* copy-overlap rejection
* targeted repair
* authority gate
* provenance recording

---

# 14. Scope

Do NOT redesign:

* historical CAP extraction
* CAP deep digestion
* student-facing PDF visual design
* billing
* Supabase unrelated schemas
* email delivery
* waitlist
* announcements

Do NOT modify curriculum content merely to make tests pass.

Do not optimize unrelated code.

---

# Desired Production Behavior

The final system should behave conceptually like:

```text
"We need a D2 contextual grammar exercise
for this student's current level."

↓ search CAP precedent library

"These authentic CAP items use this evidence structure
and these distractor mechanics."

↓ plan

"Use the same assessment logic,
but adapt vocabulary / context / topic for this student."

↓ author

"Did the adaptation preserve the quality floor?"

↓ critic

YES → accept

NO → targeted repair
```

And for richer reading/application tasks:

```text
student objective
↓
retrieve authentic CAP design precedents
↓
reuse assessment mechanics, not wording
↓
adapt to student language level
↓
validate cognitive depth + evidence + distractors
↓
accept only above CAP-derived quality floor
```

---

# Success Criteria

This task is complete only when both product goals are demonstrably true:

## A. Permanent Direction

Generated assessment content is explicitly anchored to searchable authentic CAP precedent or authoritative CAP-derived mechanics.

The model no longer invents assessment structure from scratch by default.

## B. High Quality Floor

A weak generic AI worksheet item cannot enter normal assessment/application material when a stronger CAP-grounded adaptation is available.

The worst acceptable assessment output is now constrained by authentic CAP design precedent rather than by generic LLM habits.

This does NOT mean all content must be difficult.

It means:

> language may be easier, but assessment design must remain intentional.

---

# Verification

Before completion:

* run all relevant targeted tests
* run full workspace tests
* run typecheck
* run lint
* run build
* generate representative synthetic packages
* render PDFs
* compare current vs CAP-grounded outputs
* inspect provenance
* verify CAP authority gate
* verify copy-overlap protection
* verify intentional retrieval remains allowed
* verify targeted repair
* verify no production database migration was introduced unless absolutely required

Report:

* current HEAD
* exact production flow changed
* CAP runtime bundle design
* retrieval algorithm
* planner contract
* quality-floor critic contract
* repair behavior
* CAP provenance fields
* test results
* synthetic evaluation results
* examples of before/after assessment design
* anything intentionally deferred

Do not claim completion merely because CAP knowledge can be loaded.

The completion standard is:

> Authentic CAP assessment design is now an unavoidable production reference for relevant exercises, and it measurably raises the minimum quality of generated assessment content without forcing all instructional material to look like an exam.
