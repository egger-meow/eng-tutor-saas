# Adaptive Curriculum Engine Redesign

## Decision

Replace the proof-of-concept lesson contract with a self-study-first, CAP-oriented curriculum pipeline. The supplied `eng-tutor` worksheet is the minimum quality baseline, not a template to copy. A child should be able to move through the Student PDF without a tutor; the Parent Answer PDF should mainly provide answers, concise reasoning, likely misconceptions, and observable follow-up checks.

The engine must improve from accumulated learner evidence. Personal interests change what is inviting to read; demonstrated knowledge, school progress, recurring errors, and feedback determine what must be taught and practised next.

## Non-negotiable Learning Experience

The product serves current and incoming Taiwanese junior-high students and develops the abilities required for CAP while following the child's actual school progression. Each packet must be:

- self-explanatory, with concise Traditional Chinese directions and teaching;
- substantial enough to teach, not merely quiz;
- lively and visually breathable without becoming childish or sparse;
- sequenced from activation and worked examples to guided practice, independent practice, CAP transfer, and retrieval;
- calibrated so undeclared vocabulary does not create hidden difficulty;
- traceably adapted from the child's state and previous week;
- answerable, internally consistent, and printable in black and white.

A stable weekly spine is preferable to a rigid page template. Sections may expand, contract, or occasionally rotate, but normally include goals, prior-knowledge activation, contextual reading or dialogue, core vocabulary, explicit grammar/pattern instruction, worked examples, staged practice, CAP-style comprehension, productive use, self-check, and spaced-review homework.

## Canonical Curriculum Package

The versioned canonical source contains four connected projections:

1. **Learning plan** — selected targets, prerequisites, evidence, difficulty budget, review items, personalization strategy, and exclusions.
2. **Student lesson** — all instructional content, activities, writing space, hints, and self-check prompts.
3. **Parent answer material** — exact answers, short explanations, acceptable variants, misconceptions, and minimal follow-up checks.
4. **Tracking delta** — vocabulary, grammar, reading skills, observed weaknesses, review schedule, and signals to verify after completion.

The tracking delta is proposed by generation but is not treated as demonstrated mastery. Parent feedback and later performance evidence confirm, weaken, or revise it.

Every material records schema, curriculum-rule, prompt, rubric, renderer, and model versions plus an input fingerprint. A published packet is immutable. A quality replacement is a new revision linked to the original, never a silent overwrite.

## Child Memory and Context

Normal generation loads compact state rather than all historical PDFs:

- grade stage, textbook version/chapter, school and exam context;
- specific current interests, recent changes, and avoided themes;
- vocabulary state: new, learning, secure, repeatedly missed, and review-due;
- grammar and reading-skill progression with prerequisites;
- recent weekly summaries, difficulty, completion, errors, and feedback;
- unresolved quality or learner hypotheses from previous packets.

Interest capture uses optional guided lists rather than generic category chips: anime/films/books/channels, games, music, sports/activities, projects or current fascinations, newly changed interests, and themes to avoid. Grade stage explicitly supports `incoming_grade_7` separately from `grade_7`.

Feedback is normalized into separate signals. Learner evidence (for example, `do/does repeatedly missed`) influences curriculum state. Product-quality evidence (for example, `too little Chinese explanation`) influences packet generation and may become a system-level improvement candidate. Emotional or irrelevant text is never copied into the lesson.

## Multi-stage Generation

```text
context assembly
  -> diagnostic curriculum plan
  -> student lesson authoring
  -> answer + tracking projection
  -> deterministic validation
  -> independent pedagogical/CAP critique
  -> targeted repair of failed sections
  -> deterministic PDF rendering
  -> visual/artifact inspection
  -> publish pair + versioned audit record
```

The model first plans what the child needs; it must not improvise the entire packet in one pass. A separate critic receives the rules, plan, and draft and must identify concrete defects rather than assign a vague score. Failed sections are repaired in isolation when safe, controlling token use while preserving cross-section consistency. Repair attempts are capped and fail closed for human/admin review.

## Quality Gates

Deterministic validation covers schema and answer integrity plus minimum instructional substance, Traditional Chinese scaffolding, reading-length band, vocabulary bounds, hidden vocabulary, unique and plausible options, question-type distribution, writing space, answer variants, target coverage, prior-review coverage, and forbidden answer leakage.

The pedagogical critic checks:

- whether a learner can understand each transition without a tutor;
- explanation-to-practice alignment and gradual release;
- CAP authenticity rather than superficial multiple choice;
- age-appropriate but not childish language;
- genuine use of interests without gimmicky name/topic substitution;
- cognitive load, page density, repetition, ambiguity, factual risk, and tone;
- visible application of recent feedback and unresolved mistakes;
- whether the next packet is demonstrably at least as well calibrated as the last.

No single numeric score may override a critical failure. Publishing requires all critical gates and configured dimension thresholds to pass.

## Continuous Improvement

Store structured quality observations for every generated packet. Aggregate recurring feedback by rubric dimension while retaining child-level privacy and provenance. A repeated pattern becomes a review candidate, not an automatic production prompt mutation.

A periodic adversarial review compares recent packets, feedback, failure/repair logs, token consumption, and selected `eng-tutor` teaching observations. It proposes changes to prompts, rubrics, curriculum assets, validators, or rendering. Production changes require an intentional Git-reviewed version bump, a regression corpus, and before/after evaluation. This preserves continuous improvement without allowing an experiment to silently affect every child.

Token efficiency is measured per successful packet. Compact memory, staged generation, targeted repair, cached curriculum references, and omission of irrelevant history are preferred; quality gates cannot be disabled merely to reduce cost.

## Kobe Acceptance Case

Kobe's current Week 1 output is a known failed artifact. The pending Week 2 job must not be completed by the old contract. The rebuilt pipeline must consume his current profile and submitted feedback, classify the previous packet as too easy and instructionally insufficient, and produce a replacement candidate through the same production path used for future children. Acceptance requires rendered page-by-page inspection and comparison against the supplied `eng-tutor` Week 2 baseline.

