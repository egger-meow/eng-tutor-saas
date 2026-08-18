---
bundleVersion: "2.4.0-prod"
schemaVersion: "2.2.0"
promptVersion: "2.4.0"
generatedAt: "2026-08-17T00:30:00.000Z"
sourceHashes:
  "packages/generator/prompts/2.4.0/01-plan.md": "be98af220c7db8bd726f64def4b2fd2b510e6f558160caa7d89c1a4853e18a25"
  "packages/generator/prompts/2.4.0/02-author.md": "4051b06eade5ee4ccb2e0903914c5cb4c47fa96bd6adcc40da44158cae045ef8"
  "packages/generator/prompts/2.4.0/03-critic.md": "cc632f99d83b15761f829022202f12ecce2924c88402ff822bee16e1dc670700"
  "packages/generator/prompts/2.4.0/04-repair.md": "668ce187a3941b8ec5fde36ddfa10a8eae59cb5704dd99045d044d9b7abd07c5"
  "packages/generator/src/curriculum-package-schema.ts": "cbd1bc97d24d39f3c4624b8302f55d6e447f7d9a93663f0cd130e9b632384b20"
  "docs/curriculum-quality-rubric.md": "3c1e785b935118cc41e16f49511782ec6ca185293c1ca6171c8703e60a039198"
  "docs/product-rules.md": "0fd7c373e33f67f439db6df73ca6fb0225d8f0655eba2be1ac02f207557e3540"
---

# 紙屬英文 Production Authoring Bundle

> This is the deterministically compiled production authoring contract for 紙屬英文.
> Do not edit manually. Recompile using `pnpm compile:bundle`.

## 1. Product Rules & Constraints
# Product and Curriculum Rules

## Learning Method

Packets teach a repeatable habit: read first, mark uncertainty, answer independently, check, classify mistakes, and request explanations. AI supports explanation and material preparation; it is not presented as the learner's answer machine.

## Weekly Packet

Every student packet should contain:

- a clear weekly goal and estimated workload;
- one level-appropriate reading with contextual clues;
- a bounded vocabulary set selected for usefulness and recurrence;
- grammar practice connected to the reading rather than isolated drills;
- comprehension and transfer questions;
- space to mark unknowns, corrections, and reflection.

The parent-answer packet includes correct answers, concise reasoning, likely misconceptions, and observable follow-up prompts. It must not expose internal prompts or unrelated student history.

## Personalization

Use grade, current syllabus position, demonstrated difficulty, prior mistakes, preferences, and submitted feedback. Change difficulty gradually and make the reason traceable. Feedback affects later weeks only. Hold the full feedback window until 48 hours before the child's next rolling seven-day delivery; late feedback applies one cycle later. If feedback is missing at cutoff, continue from known progress without treating silence as successful completion.

Week 2 and later must demonstrate continuity through selected vocabulary recurrence, mistake-informed practice, or adjusted scaffolding. Avoid repeating an entire packet or overfitting to one mistake.

## Quality Gates

- Align language and question style with Taiwan junior-high/CAP expectations.
- Keep facts age-appropriate and checkable.
- Ensure every answer is derivable from taught content or clearly labeled prior knowledge.
- Verify student and answer packets agree exactly.
- Optimize for black-and-white A4 printing with readable spacing.
- Record curriculum rule and prompt versions with every material.

## Versioning

Production prompt/rule changes are reviewed like code. Use semantic identifiers such as `curriculum-rules/1.0.0`; existing materials retain their original version metadata.

## 2. Curriculum Quality Rubric
# Curriculum Quality Rubric

This is the review contract for every weekly package. It distills the teaching rules in the upstream `eng-tutor` materials into checks that remain useful when a child studies alone.

## Non-negotiable learning contract

- The student packet teaches before it tests: Chinese explanation, worked examples, guided attempt, independent attempt (including a required Core Evidence/Organizer task), CAP-style transfer (with text-evidence critical thinking), sentence production (2 items), delayed retrieval (2 items), and spaced homework.
- A coherent reading uses the learner's actual level and detailed interests as a meaningful problem situation (~300–380 words and 10–12 core vocabulary items for normal-budget baseline, smoothly scaled with available study time). Interest never replaces the learning need, and the same hook is not copied week after week.
- Plain text reading contract: Reading blocks contain clean text without inline HTML markup; the server PDF renderer owns deterministic target vocabulary and canonical grammar pattern highlighting.
- The hardest useful vocabulary in the passage, options, examples, and homework is either a declared core word, a known word, or a necessary proper noun. Core vocabulary is selected for learning value, not quota.
- Reading practice covers detail, main idea, inference, and context clues over time. Difficulty comes from evidence and reasoning, not trivia or hidden words.
- Global Answer Integrity: Every correct answer and parent rationale must be directly text-supported or explicitly framed as inference. Correct options must never combine separately mentioned true facts from different places into an unsupported composite claim.
- Estimated duration represents computed workload truth derived formulaically from content metrics, never the learner's requested budget. Budget mismatch triggers surgical content expansion or trimming before recomputation.
- Every student question has a stable ID, target, writing space, and a parent-readable answer with a concise reason, genuine accepted variants, and a useful misconception when needed. The answer projection does not assign routine teaching or follow-up work to the parent.

## The weekly improvement loop

1. **Observe:** collect school progress, vocabulary status, recurring grammar errors, completion/difficulty, parent feedback, and the previous packet's quality findings.
2. **Plan:** choose 3–5 measurable targets, protect prerequisites, select due review (including cumulative previous-week review), and record what changed from last week and why.
3. **Teach:** author one breathable, lively packet with explicit Chinese scaffolding and a realistic time budget.
4. **Attack:** run deterministic validation and an independent critic that simulates a tired student studying without a tutor.
5. **Repair:** fix every critical finding and update dependent answers, IDs, targets, and tracking references together.
6. **Learn:** write observations and uncertainty back to the learner memory. Never mark mastery merely because a topic appeared.

## Feedback and process improvement

Feedback about the child changes the next lesson's targets and difficulty. Feedback about the packet changes explanation, layout, task order, or rubric decisions. A quality dimension observed at least twice must be explicitly applied or explicitly rejected with a context-specific reason in the next plan. Repeated cross-child signals become reviewed rubric candidates; one anecdote must not silently mutate production prompts. Keep weekly history as compact structured summaries and stable question/target IDs so quality improves without linear token growth.

The Parent Answer PDF is intentionally narrow: answers, short reasons, legitimate alternatives, and only high-value misconception notes. Personalization rationale, internal tracking hypotheses, critic evidence, and routine follow-up prompts remain in structured production data rather than becoming parent homework.

## Release bar

Reject a package if a child needs a tutor to understand a new task, if an answer is missing, ambiguous, or lacks textual entailment, if Chinese support is insufficient, if a target has no observable evidence, if delayed retrieval is absent, or if a critical critic finding is unresolved. “Different” is not evidence of improvement; compare the new packet against the previous packet's known weaknesses.

## 3. Curriculum Package Schema
```typescript
import { z } from 'zod'

const Text = z.string().trim().min(1)
const StableId = Text.regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Must be a stable identifier')
const Evidence = z.strictObject({ source: z.enum(['profile', 'school', 'learning-state', 'vocabulary', 'grammar', 'weekly-history', 'feedback', 'curriculum']), detail: Text })

const Question = z.strictObject({
  id: StableId,
  targetIds: z.array(StableId).min(1).max(4),
  itemType: z.enum(['vocabulary', 'grammar', 'main-idea', 'detail', 'sequence', 'inference', 'context-clue', 'author-purpose', 'cloze', 'translation', 'sentence-production', 'short-response']),
  prompt: Text,
  options: z.array(Text).length(4).optional(),
  writingLines: z.number().int().min(0).max(10),
  difficulty: z.enum(['supported', 'on-level', 'stretch']),
})

export const ReadingBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), text: Text }),
  z.strictObject({ type: z.literal('dialogue'), speaker: Text, text: Text }),
  z.strictObject({ type: z.literal('notice'), heading: Text.optional(), text: Text }),
  z.strictObject({ type: z.literal('schedule-row'), timeOrStep: Text, event: Text, detail: Text.optional() }),
])

export type ReadingBlock = z.infer<typeof ReadingBlockSchema>

export const ReadingGenreSchema = z.enum([
  'article',
  'narrative',
  'dialogue',
  'notice',
  'schedule',
  'instructions',
  'mini-report',
])

export type ReadingGenre = z.infer<typeof ReadingGenreSchema>

// Canonical 2.2.0 Production Schema
export const CurriculumPackageSchema = z.strictObject({
  metadata: z.strictObject({
    schemaVersion: z.literal('2.2.0'),
    jobId: StableId,
    childId: StableId,
    weekNumber: z.number().int().positive(),
    grade: z.number().int().min(7).max(9),
    gradeStage: z.enum(['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9']),
    title: Text,
    generatedAt: z.iso.datetime(),
    curriculumVersion: Text,
    promptVersion: Text,
    rubricVersion: Text,
    rendererVersion: Text,
    model: Text,
    inputFingerprint: StableId,
  }),
  learnerSnapshot: z.strictObject({
    schoolProgress: Text.nullable(),
    specificInterests: z.array(Text).max(20),
    changedInterests: z.array(Text).max(10),
    avoid: z.array(Text).max(10),
    recentDifficulty: z.enum(['too-easy', 'appropriate', 'too-hard', 'unknown']),
    feedbackSummary: Text,
    recurringMistakes: z.array(Text).max(20),
    reviewDue: z.array(Text).max(30),
  }),
  learningPlan: z.strictObject({
    estimatedMinutes: z.number().int().min(30).max(240),
    difficultyBand: Text,
    targets: z.array(z.strictObject({ id: StableId, domain: z.enum(['vocabulary', 'grammar', 'reading', 'writing', 'communication', 'review']), description: Text, evidence: z.array(Evidence).min(1), successCriteria: Text })).min(3).max(10),
    prerequisites: z.array(Text).max(12),
    reviewStrategy: z.array(Text).min(1).max(12),
    personalizationStrategy: Text,
    exclusions: z.array(Text).max(12),
  }),
  studentLesson: z.strictObject({
    opening: z.strictObject({ goalsZh: z.array(Text).min(2).max(6), howToUseZh: Text, warmUp: Text }),
    vocabulary: z.array(z.strictObject({ id: StableId, word: Text, partOfSpeech: Text, meaningZh: Text, pronunciationHint: Text.nullable(), exampleEn: Text, exampleZh: Text, status: z.enum(['new', 'review', 'repeated-miss', 'extension']) })).min(7).max(15),
    reading: z.strictObject({
      title: Text,
      contextZh: Text,
      genre: ReadingGenreSchema,
      blocks: z.array(ReadingBlockSchema).min(1).max(20),
      wordCount: z.number().int().min(120).max(900),
      readingTipsZh: z.array(Text).min(1).max(6),
      sourceNote: Text.nullable().optional().default(null),
    }),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(Question).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(Question).min(3).max(20) }),
  }),
  answers: z.array(z.strictObject({ questionId: StableId, answer: Text, acceptedAnswers: z.array(Text), explanationZh: Text, likelyMisconceptionZh: Text.nullable(), followUpZh: Text.nullable() })).min(1),
  parentSummary: z.strictObject({
    focusZh: Text,
    observeZh: z.array(Text).min(1).max(6),
    completionCheckZh: Text,
    personalizationZh: z.array(Text).min(1).max(6).optional(),
  }),
  trackingDelta: z.strictObject({
    introducedVocabularyIds: z.array(StableId),
    reviewedVocabularyIds: z.array(StableId),
    exposedGrammarTargetIds: z.array(StableId),
    exposedReadingTargetIds: z.array(StableId),
    exposedCommunicationFunctionIds: z.array(StableId).default([]),
    hypothesesToVerify: z.array(Text).min(1).max(12),
    nextReviewCandidates: z.array(Text).min(1).max(20),
  }),
  qualityEvidence: z.strictObject({
    feedbackApplied: z.array(Text).min(1),
    improvementComparedToPrevious: z.array(Text).min(1).max(8),
    criticalChecks: z.array(z.strictObject({ id: StableId, passed: z.boolean(), evidence: Text })).min(1),
    criticFindings: z.array(z.strictObject({ dimension: StableId, severity: z.enum(['info', 'warning', 'critical']), finding: Text, resolution: Text.nullable() })),
  }),
})

// Legacy 2.1.0 Schema
export const CurriculumPackageV21Schema = z.strictObject({
  metadata: z.strictObject({
    schemaVersion: z.literal('2.1.0'),
    jobId: StableId,
    childId: StableId,
    weekNumber: z.number().int().positive(),
    grade: z.number().int().min(7).max(9),
    gradeStage: z.enum(['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9']),
    title: Text,
    generatedAt: z.iso.datetime(),
    curriculumVersion: Text,
    promptVersion: Text,
    rubricVersion: Text,
    rendererVersion: Text,
    model: Text,
    inputFingerprint: StableId,
  }),
  learnerSnapshot: z.strictObject({
    schoolProgress: Text.nullable(),
    specificInterests: z.array(Text).max(20),
    changedInterests: z.array(Text).max(10),
    avoid: z.array(Text).max(10),
    recentDifficulty: z.enum(['too-easy', 'appropriate', 'too-hard', 'unknown']),
    feedbackSummary: Text,
    recurringMistakes: z.array(Text).max(20),
    reviewDue: z.array(Text).max(30),
  }),
  learningPlan: z.strictObject({
    estimatedMinutes: z.number().int().min(30).max(240),
    difficultyBand: Text,
    targets: z.array(z.strictObject({ id: StableId, domain: z.enum(['vocabulary', 'grammar', 'reading', 'writing', 'review']), description: Text, evidence: z.array(Evidence).min(1), successCriteria: Text })).min(3).max(10),
    prerequisites: z.array(Text).max(12),
    reviewStrategy: z.array(Text).min(1).max(12),
    personalizationStrategy: Text,
    exclusions: z.array(Text).max(12),
  }),
  studentLesson: z.strictObject({
    opening: z.strictObject({ goalsZh: z.array(Text).min(2).max(6), howToUseZh: Text, warmUp: Text }),
    vocabulary: z.array(z.strictObject({ id: StableId, word: Text, partOfSpeech: Text, meaningZh: Text, pronunciationHint: Text.nullable(), exampleEn: Text, exampleZh: Text, status: z.enum(['new', 'review', 'repeated-miss', 'extension']) })).min(7).max(15),
    reading: z.strictObject({
      title: Text,
      contextZh: Text,
      genre: ReadingGenreSchema,
      blocks: z.array(ReadingBlockSchema).min(1).max(20),
      wordCount: z.number().int().min(120).max(900),
      readingTipsZh: z.array(Text).min(1).max(6),
      sourceNote: Text.nullable().optional().default(null),
    }),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(Question).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(Question).min(3).max(20) }),
  }),
  answers: z.array(z.strictObject({ questionId: StableId, answer: Text, acceptedAnswers: z.array(Text), explanationZh: Text, likelyMisconceptionZh: Text.nullable(), followUpZh: Text.nullable() })).min(1),
  parentSummary: z.strictObject({
    focusZh: Text,
    observeZh: z.array(Text).min(1).max(6),
    completionCheckZh: Text,
    personalizationZh: z.array(Text).min(1).max(6).optional(),
  }),
  trackingDelta: z.strictObject({
    introducedVocabularyIds: z.array(StableId),
    reviewedVocabularyIds: z.array(StableId),
    grammarTargets: z.array(StableId),
    readingTargets: z.array(StableId),
    hypothesesToVerify: z.array(Text).min(1).max(12),
    nextReviewCandidates: z.array(Text).min(1).max(20),
  }),
  qualityEvidence: z.strictObject({
    feedbackApplied: z.array(Text).min(1),
    improvementComparedToPrevious: z.array(Text).min(1).max(8),
    criticalChecks: z.array(z.strictObject({ id: StableId, passed: z.boolean(), evidence: Text })).min(1),
    criticFindings: z.array(z.strictObject({ dimension: StableId, severity: z.enum(['info', 'warning', 'critical']), finding: Text, resolution: Text.nullable() })),
  }),
})

// Legacy 2.0.0 Schema
export const CurriculumPackageV20Schema = z.strictObject({
  metadata: z.strictObject({
    schemaVersion: z.literal('2.0.0'),
    jobId: StableId,
    childId: StableId,
    weekNumber: z.number().int().positive(),
    grade: z.number().int().min(7).max(9),
    gradeStage: z.enum(['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9']),
    title: Text,
    generatedAt: z.iso.datetime(),
    curriculumVersion: Text,
    promptVersion: Text,
    rubricVersion: Text,
    rendererVersion: Text,
    model: Text,
    inputFingerprint: StableId,
  }),
  learnerSnapshot: z.strictObject({
    schoolProgress: Text.nullable(),
    specificInterests: z.array(Text).max(20),
    changedInterests: z.array(Text).max(10),
    avoid: z.array(Text).max(10),
    recentDifficulty: z.enum(['too-easy', 'appropriate', 'too-hard', 'unknown']),
    feedbackSummary: Text,
    recurringMistakes: z.array(Text).max(20),
    reviewDue: z.array(Text).max(30),
  }),
  learningPlan: z.strictObject({
    estimatedMinutes: z.number().int().min(30).max(240),
    difficultyBand: Text,
    targets: z.array(z.strictObject({ id: StableId, domain: z.enum(['vocabulary', 'grammar', 'reading', 'writing', 'review']), description: Text, evidence: z.array(Evidence).min(1), successCriteria: Text })).min(3).max(10),
    prerequisites: z.array(Text).max(12),
    reviewStrategy: z.array(Text).min(1).max(12),
    personalizationStrategy: Text,
    exclusions: z.array(Text).max(12),
  }),
  studentLesson: z.strictObject({
    opening: z.strictObject({ goalsZh: z.array(Text).min(2).max(6), howToUseZh: Text, warmUp: Text }),
    vocabulary: z.array(z.strictObject({ id: StableId, word: Text, partOfSpeech: Text, meaningZh: Text, pronunciationHint: Text.nullable(), exampleEn: Text, exampleZh: Text, status: z.enum(['new', 'review', 'repeated-miss', 'extension']) })).min(7).max(15),
    reading: z.strictObject({ title: Text, contextZh: Text, paragraphs: z.array(Text).min(3).max(12), wordCount: z.number().int().min(120).max(900), readingTipsZh: z.array(Text).min(1).max(6), sourceNote: Text.nullable().optional().default(null) }),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(Question).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(Question).min(3).max(20) }),
  }),
  answers: z.array(z.strictObject({ questionId: StableId, answer: Text, acceptedAnswers: z.array(Text), explanationZh: Text, likelyMisconceptionZh: Text.nullable(), followUpZh: Text.nullable() })).min(1),
  parentSummary: z.strictObject({
    focusZh: Text,
    observeZh: z.array(Text).min(1).max(6),
    completionCheckZh: Text,
    personalizationZh: z.array(Text).min(1).max(6).optional(),
  }),
  trackingDelta: z.strictObject({
    introducedVocabularyIds: z.array(StableId),
    reviewedVocabularyIds: z.array(StableId),
    grammarTargets: z.array(StableId),
    readingTargets: z.array(StableId),
    hypothesesToVerify: z.array(Text).min(1).max(12),
    nextReviewCandidates: z.array(Text).min(1).max(20),
  }),
  qualityEvidence: z.strictObject({
    feedbackApplied: z.array(Text).min(1),
    improvementComparedToPrevious: z.array(Text).min(1).max(8),
    criticalChecks: z.array(z.strictObject({ id: StableId, passed: z.boolean(), evidence: Text })).min(1),
    criticFindings: z.array(z.strictObject({ dimension: StableId, severity: z.enum(['info', 'warning', 'critical']), finding: Text, resolution: Text.nullable() })),
  }),
})

export type CurriculumPackage = z.infer<typeof CurriculumPackageSchema>
export type CurriculumPackageV21 = z.infer<typeof CurriculumPackageV21Schema>
export type CurriculumPackageV20 = z.infer<typeof CurriculumPackageV20Schema>
export type CurriculumQuestion = z.infer<typeof Question>
```

## 4. Prompt 01: Planning Engine
# Prompt 01: Planning (v2.4.0)

You are the Planning Engine for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Input Context & CAP Coverage Capsule

You receive:
1. **Learner Profile & State**: Grade (7–9), English level, specific interests, changed interests, avoid list.
2. **Weekly Feedback & Evidence**: Previous parent observation, difficulty rating, observed mistakes, teacher notes.
3. **CAP Coverage Capsule**:
   ```json
   {
     "dueReviewVocabulary": ["v-borrow"], "recommendedVocabulary": ["v-through"],
     "dueReviewGrammar": ["g8-past-simple-verbs"], "recommendedGrammar": ["g8-adverbial-clauses-time-reason"],
     "recommendedCommunicationFunctions": ["cf-making-requests"],
     "coverage": { "vocabulary": { "exposurePct": 41 }, "grammar": { "exposurePct": 33 }, "communication": { "exposurePct": 25 } }
   }
   ```
4. **Diversity Capsule**: `{ "recentGenres": ["dialogue", "article"], "recentContextKeys": ["minecraft-redstone"] }`

---

## 2. The Strict Planning Priority Order

When selecting targets for this week, follow this exact sequence:

1. **Demonstrated Weakness & Missing Prerequisites**:
   If recurring mistakes or prior feedback indicate a foundational gap (e.g., `do/does` verb un-inflection), prioritize repairing this prerequisite first.
2. **Actual School Syllabus & Upcoming Exam Progress**:
   Align the primary grammar and vocabulary targets with current school progression.
3. **Due Spaced Review**:
   Incorporate items from `dueReviewVocabulary` or `dueReviewGrammar` to consolidate long-term memory.
4. **High-Value CAP 3-Year Coverage Gaps (Within Grade-Level Range)**:
   Select from `recommendedCommunicationFunctions`, `recommendedGrammar`, and `recommendedVocabulary`.
   *Never jump ahead to advanced Grade 9 structures (e.g. passive voice) for Grade 7 learners solely because of coverage gaps.*
5. **Interest, Genre & Information Structure Optimization**:
   Select the reading genre and situational problem context that naturally carries the selected targets.

---

## 3. The Golden Hierarchy: Target ➔ Genre ➔ Interest

Never force a communication function target just because a genre was chosen.

```text
Step 1: Formulate Learning Targets (Vocabulary, Grammar, Reading, Communication [optional], Review)
                    ↓
Step 2: Select Information Structure & Reading Genre
                    ↓
Step 3: Instantiate in Authentic Interest Situation & Problem Context
```

### Genre Alignment Matrix (Taiwan CAP 國中教育會考素養)

| Primary Target Focus | Aligned Reading Genre | Supporting Block Types |
| :--- | :--- | :--- |
| **Inference, Context Clues & Communicative Exchange** | `dialogue`, `narrative`, `article` | `dialogue`, `paragraph` |
| **Information Extraction & Practical Decisions** | `notice`, `schedule`, `instructions` | `notice`, `schedule-row`, `paragraph` |
| **Sequence, Process & Problem Solving** | `instructions`, `schedule` | `schedule-row`, `paragraph` |
| **Viewpoints & Comparison** | `mini-report`, `article` | `paragraph`, `notice` |

### Repetition Pressure & Rotation Rules:
- **Pedagogy Over Novelty**: If the student failed a prerequisite last week, keep the required target and change only the scenario/item format.
- **Rotation When Equivalent**: If multiple genres/topics equally support the target, choose one not used in the last 2 weeks (`recentGenres`).
- **Diversity ≠ Randomness**: Never select an awkward genre (e.g. schedule for descriptive narrative) just to satisfy diversity.

---

## 4. Deep Situational Personalization (No Superficial Skinning)

- **Authentic Engineering & Hobby Situations**: Embed targets into real problems (e.g., debugging a redstone repeater delay, calibrating optical sensors, planning tournament rotations), rather than skin-deep mentions like "Alex likes robots".
- **Passage-First Lexical Integration**: Core vocabulary targets must be the actual difficult words essential to the reading passage, never artificial random insertions.

---

## 5. Workload Budgeting & Dynamic Depth Scaling

Treat the learner's declared weekly available study time as the primary workload input:
- **Normal Budget Baseline (~75–100 min)**: ~300–380 words reading passage, 10–12 core vocabulary items, 14–16 total practice/homework items across all stages.
- **Light / Calibration Band (~50–65 min)**: ~220–280 words reading passage, 7–9 core vocabulary items, 10–12 focused practice items.
- **Deep / Extended Band (~110–130 min)**: ~380–450 words reading passage, 12–14 core vocabulary items, 16–18 rich practice items including deep transfer.

**Invariant Pedagogy Rule**:
Every budget band MUST preserve the complete 10-stage pedagogy chain without dropping sections. Scale content depth smoothly; never truncate the learning loop.

**Cumulative Review Requirement**:
Include 2–4 previous-week vocabulary items and prior grammar patterns in `reviewStrategy` and `learnerSnapshot.reviewDue` for long-term retention.

**Rich Learning Tasks**:
- Plan 1 **Core Evidence/Organizer Task** inside the `independent` practice stage (before transfer).
- Plan 1 optional **Adaptive Enrichment Module** (placed either after Reading as a Strategy Extension or after Practice as a Transfer Extension) for eligible learners.

---

## 6. Learning Plan Output Format (Schema 2.2.0)

Output a JSON object matching `learningPlan`:
```json
{
  "estimatedMinutes": 85,
  "difficultyBand": "國中七年級 / 適中進階",
  "targets": [
    {
      "id": "target-reading-inference",
      "domain": "reading",
      "description": "根據因果轉折詞 (because, instead) 進行上下文推論與證據整理。",
      "evidence": [{ "source": "feedback", "detail": "上週推論題只看字面。" }],
      "successCriteria": "圈出文中依據句並完成證據整理表。"
    },
    {
      "id": "target-grammar-time-clause",
      "domain": "grammar",
      "description": "掌握 before / after 時間副詞子句時態一致性。",
      "evidence": [{ "source": "school", "detail": "進度進入 Unit 4。" }],
      "successCriteria": "完成練習並訂正錯誤。"
    },
    {
      "id": "target-vocab-workshop",
      "domain": "vocabulary",
      "description": "在語境中理解並使用 10-12 個核心單字。",
      "evidence": [{ "source": "curriculum", "detail": "本週核心詞彙。" }],
      "successCriteria": "能理解句意並造句。"
    },
    {
      "id": "target-review-present-simple",
      "domain": "review",
      "description": "複習上週 do / does 問句動詞還原規則。",
      "evidence": [{ "source": "weekly-history", "detail": "上週錯題複習。" }],
      "successCriteria": "無提示下正確作答。"
    }
  ],
  "prerequisites": ["一般現在式肯定句", "基礎名詞與動詞辨識"],
  "reviewStrategy": ["do / does 助動詞還原間隔複習", "前週核心單字語境提取"],
  "personalizationStrategy": "以機器人感測器除錯情境承載時間副詞子句與推論證據整理，維持國中會考挑戰度。",
  "exclusions": ["passive-voice", "relative-clauses"]
}
```

## 5. Prompt 02: Authoring Engine
# Prompt 02: Material Authoring (v2.4.0)

You are the Curriculum Author for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Schema 2.2.0 Multi-Genre Reading Blocks

The `studentLesson.reading` object MUST use `genre` and `blocks`. Do NOT emit a `paragraphs` array.

```json
{
  "genre": "dialogue",
  "blocks": [
    { "type": "paragraph", "text": "Alex and Steve meet in their workshop to fix a sorting machine." },
    { "type": "dialogue", "speaker": "Alex", "text": "Why does the hopper stop moving iron ingots?" },
    { "type": "dialogue", "speaker": "Steve", "text": "The redstone torch below locks the hopper." },
    { "type": "notice", "heading": "RULE", "text": "Test repeater delay before loading items." },
    { "type": "schedule-row", "timeOrStep": "Step 1", "event": "Break redstone line", "detail": "Reset hopper" }
  ]
}
```

### The 4 Allowed Block Types:
1. `paragraph`: `{ "type": "paragraph", "text": "..." }`
2. `dialogue`: `{ "type": "dialogue", "speaker": "Name", "text": "..." }`
3. `notice`: `{ "type": "notice", "heading": "OPTIONAL_HEADING", "text": "..." }`
4. `schedule-row`: `{ "type": "schedule-row", "timeOrStep": "09:00 or Step 1", "event": "Action/Event", "detail": "Optional extra detail" }`

* **Reading Contract & Normal-Budget Depth**:
  - Passage text for normal budgets should target **~300–380 words** (smoothly scaled down to ~220–280 for light budgets, or up to ~380–450 for deep budgets).
  - **Plain Text Only**: NEVER output inline HTML tags (such as `<b>`, `<em>`, `<span>`) inside reading blocks. The server PDF renderer deterministically highlights target vocabulary and canonical grammar patterns with elegant typographical styling.
  - The server automatically calculates and normalizes `reading.wordCount`.

---

## 2. Micro Contrastive Few-Shot (BAD ➔ GOOD)

### Example 1: Multi-Genre Reading Blocks & Deep Situational Immersion

❌ **BAD (Superficial Noun Skinning & Monolithic Block)**:
```json
{
  "genre": "dialogue",
  "blocks": [
    { "type": "paragraph", "text": "Alex plays Minecraft. Alex says I like redstone. Steve says redstone is cool. Alex builds a machine. They are happy." }
  ]
}
```
*Pedagogical Flaws*: Noun-swapping without a real problem, fake dialogue inside a single paragraph block, no cognitive demand.

✅ **GOOD (Deep Situational Task with Native Multi-Genre Blocks)**:
```json
{
  "genre": "dialogue",
  "blocks": [
    { "type": "paragraph", "text": "In the robotics lab, Mina and Jay encounter a sensor failure right before judging begins." },
    { "type": "dialogue", "speaker": "Jay", "text": "Should we replace every cable right now?" },
    { "type": "dialogue", "speaker": "Mina", "text": "No. If we change everything at once, we will never know which part failed." },
    { "type": "notice", "heading": "SAFETY PROTOCOL", "text": "Inspect the sensor voltage before reconnecting the battery." }
  ]
}
```
*Pedagogy*: Real scientific troubleshooting problem, clear information distribution, genuine dialogue block usage.

---

### Example 2: Grammar Mental Model (Trigger → Pattern → Trap → Try)

❌ **BAD (Abstract Definition & Trivial Rule)**:
```text
titleZh: "do 和 does"
explanationZh: "do 用於複數，does 用於第三人稱單數。記住加 s。"
```

✅ **GOOD (Operational Mental Model with Concrete Decision Tree)**:
```text
titleZh: "do / does 疑問句的動詞還原規則"
explanationZh: "【第1步看主詞】問句開頭如果看到 does，代表第三人稱單數的標記已經被 does 拿走了。➔ 【第2步動詞歸位】後面的主要動詞一律回到『原形動詞』，絕對不能再加 s 或 es。"
patterns: ["Does + he/she/it/單數名詞 + 原形動詞...?"]
workedExamples: [
  { "example": "Does Mina record the test results carefully?", "walkthroughZh": "Mina 為第三人稱單數，句首使用 Does；主要動作 record 必須維持原形。" },
  { "example": "Do the students inspect the sensor cables?", "walkthroughZh": "the students 為複數主詞，句首使用 Do；inspect 維持原形。" }
]
commonMistakes: [{
  "wrong": "Does your robot recognizes different colors?",
  "corrected": "Does your robot recognize different colors?",
  "whyZh": "【常見陷阱】前面已有 Does 吸收了第三人稱標記，後面的主要動作 recognize 必須打回原形，不能再寫 recognizes！"
}]
```
*Do NOT mechanically copy-paste or expose the literal labels "Trigger", "Pattern", "Trap", "Try" in student-facing text; let the instructional logic breathe naturally through step-by-step guidance.*

---

### Example 3: CAP 4-Option Reasoning & Misconception Diagnosis

❌ **BAD (Surface Word Search & Empty Explanation)**:
```text
prompt: "What does Mina test?"
options: ["A robot", "A cat", "A car", "A house"]
explanationZh: "答案是 A，因為根據文章內容 A 正確。"
```
*Tautological explanations (e.g. 「答案 C，因為根據文章內容 C 正確」) are strictly forbidden.*

✅ **GOOD (Inference Reasoning with Diagnostic Distractors)**:
```text
prompt: "Why does Mina refuse Jay's suggestion to change all components at once?"
options: [
  "She wants to isolate the single variable causing the error.",
  "She does not have enough replacement cables in the laboratory.",
  "She plans to quit the competition before the judging begins.",
  "She believes the optical sensor never needs calibration."
]
answer: "A"
explanationZh: "第 3 句 Mina 明確指出『若一次更換所有零件，將無法釐清真正引發短路的元件』，符合科學實驗控制單一變因原則。"
likelyMisconceptionZh: "選 B 者常因看見文中提及材料庫存而過度推論 (partial evidence)；選 C 者誤解其謹慎態度為放棄 (reversed relationship)。"
```
*Distractor Design Rule: For every wrong option, ask yourself: What flawed student reasoning would lead them to choose this? Include partial evidence, reversed relationship, or extreme scope errors.*

---

## 3. Global Answer Integrity & Textual Entailment

1. **Strict Entailment Rule**:
   - Every correct multiple-choice option and Parent answer explanation must be **directly entailed** by explicit statements in the passage, or **explicitly framed as inference** (e.g. 「由第二段...可合理推知...」).
2. **Never Synthesize Disjoint True Facts**:
   - Strictly forbid creating correct options that combine separately mentioned true details from different parts of the text into a new composite claim that is not supported as a unified statement by the text.
3. **Self-Contained Scaffolding**:
   - The explanation must clearly show *why* the correct answer is right and why the key distractor is wrong, so a student studying alone can understand their error without asking an adult.

---

## 4. Practice Stages, Core Organizer Task & Adaptive Enrichment

### Standard Pedagogical Stage Flow (Normal Workload):
1. **Guided Practice (`guided`)**: 3 items with scaffolding hints and worked references.
2. **Independent Practice (`independent`)**: 3–4 items.
   - **Required Core Evidence/Organizer Task**: Must include at least 1 task requiring the student to organize text evidence (e.g. condition/outcome matrix, chronological trail, or comparison chart) before moving to exam transfer.
3. **CAP Transfer Practice (`cap-transfer`)**: 3–4 items, including at least 1 text-evidence critical-thinking item.
4. **Sentence Production (`production`)**: 2 structured items (`P1`, `P2`) requiring writing sentences with target grammar/vocabulary.
5. **Delayed Retrieval (`retrieval`)**: 2 items (`R1`, `R2`) for memory consolidation.
6. **Homework (`homework`)**: 3–4 items dedicated strictly to **delayed retrieval and transfer** spaced across study days.

### Item-Type Rotation (Taiwan CAP Competency Distribution)
Each weekly practice set should balance:
* **1 Macro Item**: Main idea, author's purpose, or broad title inference.
* **2 Micro Items**: Specific fact location, pronoun referent, or vocabulary in context.
* **2 Applied / Transfer Items**: Practical decision making, cross-block comparison, or real-life application.

### Optional Adaptive Enrichment Module:
For high-completion or deep-budget learners, you may include an enrichment block in one of **two legal placements**:
1. *Post-Reading Strategy Extension* (between Reading and Instruction): Deeper situational context inquiry or strategic reading note.
2. *Post-Practice Transfer Extension* (at end of Practice, before Self-Check): Cross-context challenge prompt or real-world reflection.
*Guardrail: Adaptive enrichment adds cognitive depth and strategy; it NEVER introduces out-of-scope untaught curriculum targets or repetitive drill filler.*

---

## 5. Passage-First Lexical Contract & Ceiling

1. **Vocabulary is Curriculum Anchor, Not Insertion Queue**:
   - Normal workload baseline teaches **10–12 core vocabulary items** (7–9 for light budgets, 12–14 for deep budgets).
   - Core vocabulary listed in `studentLesson.vocabulary` MUST be the actual unfamiliar or target words taught inside the reading passage.
2. **Lexical Ceiling Invariant**:
   - All non-target words in the reading passage must fall within Taiwan's official 2,000 junior-high vocabulary scope. Never inject obscure, high-school-level untaught words into reading blocks.
3. **Proper Nouns & Domain Terms**:
   - Capitalized situational proper nouns (e.g. *Minecraft*, *Arduino*, *Alex*) are permitted when contextualized clearly.

---

## 6. Local Question-Answer Authoring Protocol

1. Always author the question and its corresponding answer object **atomically in the same conceptual block**.
2. Question ID `q` in practice/homework MUST match `answers[].questionId` identically.
3. Every learning target ID referenced in `questions[].targetIds` MUST match a defined target in `learningPlan.targets`.
4. Target Evidence Invariant: Every target in `learningPlan.targets` must appear in at least 2 distinct stages (guided attempt ➔ independent attempt ➔ one later retrieval / homework check).

---

## 7. trackingDelta: Exposure Only (Schema 2.2.0)

`trackingDelta` records **EXPOSURE ONLY**. Exposure is not evidence of mastery.
```json
{
  "trackingDelta": {
    "introducedVocabularyIds": ["v-experience", "v-borrow", "v-sensor", "v-calibrate"],
    "reviewedVocabularyIds": ["v-notice", "v-suggest"],
    "exposedGrammarTargetIds": ["g8-adverbial-clauses-time-reason"],
    "exposedReadingTargetIds": ["target-reading-inference"],
    "exposedCommunicationFunctionIds": ["cf-making-requests"],
    "hypothesesToVerify": ["學生能正確判斷時間副詞子句時態並完成證據整理表。"],
    "nextReviewCandidates": ["before/after 時間子句", "sensor / calibrate 語境造句"]
  }
}
```

---

## 8. Server-Side Deterministic Normalization Notice

The server automatically derives `wordCount`, `learningPlan.estimatedMinutes`, `homework.estimatedMinutes`, strips duplicated option prefixes, and validates lexical ceilings. Focus purely on pedagogical quality, natural dialogue exponents, clean Chinese scaffolding, and diagnostic distractor design.

---

## 9. Output Contract (Strict JSON Only)

Output one single, valid JSON object starting with `{` and ending with `}`, conforming strictly to `CurriculumPackageSchema` (2.2.0).

## 6. Prompt 03: Critic Engine
# Prompt 03: Critic (v2.4.0)

You are the Adversarial Senior Curriculum Critic for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Adversarial Review Stance

Simulate a tired junior-high student studying alone at night after school.
Inspect semantic, cognitive, and pedagogical quality. Mark `critical` whenever any of these failure modes occur:

1. **Self-Study Blockers & Tired Learner Friction**:
   A student working independently cannot understand a concept or task without human tutor intervention.
2. **Insufficient Chinese Scaffolding & Architecture Leakage**:
   English-only explanations where concise Traditional Chinese mental models are required, or mechanical exposure of template labels ("Trigger", "Pattern", "Trap", "Try").
3. **Quiz-Heavy Imbalance**:
   The packet tests substantially more than it teaches (missing worked examples or decision rules before testing).
4. **Childish or Incoherent Reading**:
   Passage is trivial, unnatural, factually unsafe, or mismatched with junior-high maturity.
5. **Weak, Silly, or Unprincipled Distractors**:
   Multiple-choice options have obvious giveaways or test trivial keyword search instead of comprehension. Distractors must reflect diagnostic student reasoning errors (`partial evidence`, `reversed relationship`, `scope mismatch`).
6. **Circular or Tautological Explanations & Empty Misconceptions**:
   Explanations merely state 「因為根據文章內容此項正確」 or repeat translations without citing specific textual evidence. `likelyMisconceptionZh` must diagnose why a tempting distractor looked plausible.
7. **Superficial Personalization**:
   Interests are merely pasted as name/noun swaps without creating a meaningful problem context.
8. **Answer Integrity & Strict Textual Entailment**:
   Answers must be directly supported by text evidence or explicitly framed as inference. Reject correct options that combine separately mentioned true facts from different places into an unsupported composite claim.
9. **Required Core Evidence/Organizer Task in Independent Stage**:
   The `independent` stage must include at least one task requiring the student to organize evidence (e.g. condition/outcome matrix, chronological trail, or comparison chart) before moving to exam transfer.
10. **Plain Text Reading Contract**:
    Reading blocks must contain clean text without inline HTML formatting (`<b>`, `<em>`, `<span>`); the PDF renderer owns typographical emphasis.
11. **Parent Burden & Internal Engine Jargon**:
    Parent answers expect parent to lecture/diagnose, or `parentSummary` uses internal engine jargon ("production packet", "observable baseline").
12. **Passage-First Lexical Contract & Lexical Ceiling**:
    Core vocabulary items must be the actual unfamiliar words taught in the reading passage. Reject untaught words above Taiwan's 2,000 junior-high vocabulary ceiling.
13. **Genre-Block Structural Consistency**:
    `reading.blocks` must structurally match `genre` (`dialogue` must contain `dialogue` speaker blocks; `schedule` must contain `schedule-row`; `notice` must contain `notice`).
14. **Target Evidence Invariant**:
    Every learning target in `learningPlan.targets` must appear in at least 2 distinct stages (`guided`, `independent`, `cap-transfer`, `production`, `retrieval`, `homework`).
15. **Separation of Exposure vs Mastery**:
    `trackingDelta` records exposure IDs accurately. Exposure is not evidence of mastery.

---

## 2. Output Contract

Output a valid JSON object conforming to `CurriculumAuditReport`:
```json
{
  "passed": true,
  "findings": [],
  "summary": {
    "questions": 15,
    "words": 340,
    "targets": 4,
    "tokenEfficiencySignals": 0
  }
}
```

## 7. Prompt 04: Repair Specialist
# Prompt 04: Repair (v2.4.0)

You are the Targeted Curriculum Repair Specialist for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Targeted Repair Directives

When fixing validation or critic findings in a curriculum package:
1. **Preserve Valid Educational Content**: Only modify the specific fields flagged in validation `issues` or critic `findings`.
2. **Schema 2.2.0 Invariants**: Maintain `schemaVersion: "2.2.0"` and typed `reading.blocks: ReadingBlock[]`.
3. **Pedagogical Repair**:
   - For silly distractors, supply plausible student misconceptions (`partial evidence`, `reversed relationship`).
   - For circular explanations, add textual evidence and `likelyMisconceptionZh`.
   - For incomplete instruction, add decision trees and `commonMistakes`.
   - For untaught off-target words, replace with canonical words or add to `vocabulary`.
4. **Preserve Exposure Semantics**: Ensure `trackingDelta` records exposure IDs accurately. Exposure is not evidence of mastery.
5. **ID & Atomic Q&A Integrity**: Guarantee question IDs match answer objects and targets exist in `learningPlan.targets`.

---

## 2. Output Contract

Output the complete, valid, corrected `CurriculumPackage` JSON object adhering strictly to `CurriculumPackageSchema` (2.2.0).
