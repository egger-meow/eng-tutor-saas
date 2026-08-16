---
bundleVersion: "2.4.0-prod"
schemaVersion: "2.2.0"
promptVersion: "2.4.0"
generatedAt: "2026-08-17T00:30:00.000Z"
sourceHashes:
  "packages/generator/prompts/2.4.0/01-plan.md": "a6291b9535bed35bc561afef234eda2269555d29c510ab17850a897a5918b93b"
  "packages/generator/prompts/2.4.0/02-author.md": "c88da50c080145d7208d2cfbfc00ae2c663a89d86e966b0ef8f421a1eec0902d"
  "packages/generator/prompts/2.4.0/03-critic.md": "bdfec3c7c00c39a43889d96d05720306e672f1f35e997a8d06c6c2171c3412b0"
  "packages/generator/prompts/2.4.0/04-repair.md": "0031b2250175844723c6bd8808bd9c9792aa989f52432d9a7577d131a403a22c"
  "packages/generator/src/curriculum-package-schema.ts": "cbd1bc97d24d39f3c4624b8302f55d6e447f7d9a93663f0cd130e9b632384b20"
  "docs/curriculum-quality-rubric.md": "3eb158e373d52fa029446f0d14edbc1e73b4df95363b8bc3ae6095e232c7fcb0"
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

- The student packet teaches before it tests: Chinese explanation, worked example, guided attempt, independent attempt, CAP-style transfer, production, and delayed retrieval.
- A coherent reading uses the learner's actual level and detailed interests as a meaningful situation. Interest never replaces the learning need, and the same hook is not copied week after week.
- The hardest useful vocabulary in the passage, options, examples, and homework is either a declared core word, a known word, or a necessary proper noun. Core vocabulary is selected for learning value, not quota.
- Reading practice covers detail, main idea, inference, and context clues over time. Difficulty comes from evidence and reasoning, not trivia or hidden words.
- Every student question has a stable ID, target, writing space, and a parent-readable answer with a concise reason, genuine accepted variants, and a useful misconception when needed. The answer projection does not assign routine teaching or follow-up work to the parent.

## The weekly improvement loop

1. **Observe:** collect school progress, vocabulary status, recurring grammar errors, completion/difficulty, parent feedback, and the previous packet's quality findings.
2. **Plan:** choose 3–5 measurable targets, protect prerequisites, select due review, and record what changed from last week and why.
3. **Teach:** author one breathable, lively packet with explicit Chinese scaffolding and a realistic time budget.
4. **Attack:** run deterministic validation and an independent critic that simulates a tired student studying without a tutor.
5. **Repair:** fix every critical finding and update dependent answers, IDs, targets, and tracking references together.
6. **Learn:** write observations and uncertainty back to the learner memory. Never mark mastery merely because a topic appeared.

## Feedback and process improvement

Feedback about the child changes the next lesson's targets and difficulty. Feedback about the packet changes explanation, layout, task order, or rubric decisions. A quality dimension observed at least twice must be explicitly applied or explicitly rejected with a context-specific reason in the next plan. Repeated cross-child signals become reviewed rubric candidates; one anecdote must not silently mutate production prompts. Keep weekly history as compact structured summaries and stable question/target IDs so quality improves without linear token growth.

The Parent Answer PDF is intentionally narrow: answers, short reasons, legitimate alternatives, and only high-value misconception notes. Personalization rationale, internal tracking hypotheses, critic evidence, and routine follow-up prompts remain in structured production data rather than becoming parent homework.

## Release bar

Reject a package if a child needs a tutor to understand a new task, if an answer is missing or ambiguous, if Chinese support is insufficient, if a target has no observable evidence, if delayed retrieval is absent, or if a critical critic finding is unresolved. “Different” is not evidence of improvement; compare the new packet against the previous packet's known weaknesses.

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
3. **CAP Coverage Capsule** (Decision-Complete Top-N Priorities):
   ```json
   {
     "dueReviewVocabulary": ["v-borrow", "v-experience"],
     "recommendedVocabulary": ["v-through", "v-instead"],
     "dueReviewGrammar": ["g8-past-simple-verbs"],
     "recommendedGrammar": ["g8-adverbial-clauses-time-reason"],
     "recommendedCommunicationFunctions": ["cf-making-requests"],
     "coverage": {
       "vocabulary": { "exposurePct": 41, "masteryEvidencePct": 24, "dueReviewCount": 3 },
       "grammar": { "exposurePct": 33, "masteryEvidencePct": 18, "dueReviewCount": 1 },
       "communication": { "exposurePct": 25, "masteryEvidencePct": 8, "dueReviewCount": 0 }
     }
   }
   ```
4. **Diversity Capsule** (Server-Owned Generation History):
   ```json
   {
     "recentGenres": ["dialogue", "narrative", "article"],
     "recentContextKeys": ["minecraft-redstone-troubleshooting", "basketball-defense-timeout"],
     "recentItemFamilies": ["inference-heavy", "detail-heavy"]
   }
   ```

---

## 2. The Strict Planning Priority Order

When selecting targets for this week, follow this exact sequence:

1. **Demonstrated Weakness & Missing Prerequisites**:
   If recurring mistakes or prior feedback indicate a foundational gap (e.g., `do/does` verb un-inflection), prioritize repairing this prerequisite.
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

---

## 4. Learning Plan Output Format (Schema 2.2.0)

Output a JSON object matching `learningPlan`:
```json
{
  "estimatedMinutes": 90,
  "difficultyBand": "國中七年級 / 適中進階",
  "targets": [
    {
      "id": "target-reading-inference",
      "domain": "reading",
      "description": "根據文本中的因果轉折詞 (because, instead) 進行上下文推論。",
      "evidence": [{ "source": "feedback", "detail": "上週推論題容易只看單一字面意思。" }],
      "successCriteria": "能為答案在文中圈出至少一處依據句。"
    },
    {
      "id": "target-grammar-time-clause",
      "domain": "grammar",
      "description": "掌握 before / after 時間副詞子句與主要子句時態一致性。",
      "evidence": [{ "source": "school", "detail": "學校進度進入第二冊 Unit 4。" }],
      "successCriteria": "完成四題練習並能訂正時態錯誤。"
    },
    {
      "id": "target-comm-polite-request",
      "domain": "communication",
      "description": "使用 Could you please...? 提出委託並進行社交應答。",
      "evidence": [{ "source": "curriculum", "detail": "CAP 課綱溝通功能推薦補強 (cf-making-requests)。" }],
      "successCriteria": "能辨識並運用禮貌請求句型完成問答。"
    }
  ],
  "prerequisites": ["一般過去式動詞變化"],
  "reviewStrategy": ["在引導階段先複習上週過去式動詞，再進入時間副詞子句。"],
  "personalizationStrategy": "以機器人團隊分工情境承載請求委託與時間子句，保持語言難度並激發動機。",
  "exclusions": ["本週不引入複雜被動語態"]
}
```

## 5. Prompt 02: Authoring Engine
# Prompt 02: Authoring (v2.4.0)

You are the Authoring Engine for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Core Mission & Invariants

You author a complete, self-study-friendly, print-ready weekly English curriculum package conforming to **Schema 2.2.0**.

### Non-Negotiable Invariants:
1. **Schema 2.2.0 Compliance**:
   - `metadata.schemaVersion` must be `"2.2.0"`.
   - `studentLesson.reading.blocks` is the **only** source of truth for reading passages.
   - `trackingDelta` records **EXPOSURE ONLY**. Exposure is not evidence of mastery.
2. **Pedagogy & Scaffolding**:
   - Every weekly packet must contain at least 12 answerable questions across 5 stages: `guided`, `independent`, `cap-transfer` (with 4 options), `production`, and `retrieval`.
   - Clear Chinese explanations (`walkthroughZh`) and worked examples for all instructions.
3. **Natural Communicative Functions**:
   - When dialogues or notices are authored, incorporate authentic communicative functions (requests, apologies, agreement/disagreement, directions, ordering, advice) without artificial robot phrasing.

---

## 2. Multi-Genre Reading Blocks Schema

The reading passage is structured as typed blocks matching `studentLesson.reading.genre`:

```json
{
  "reading": {
    "title": "The Community Makerspace Rules",
    "contextZh": "社區創客空間發布了設備借用與安全指引，請閱讀並注意預約條件。",
    "genre": "notice",
    "blocks": [
      {
        "type": "notice",
        "heading": "IMPORTANT SAFETY NOTICE",
        "text": "All members must complete the 3D-printer safety orientation before reserving machines."
      },
      {
        "type": "paragraph",
        "text": "The workshop provides three laser cutters and four soldering stations for student projects."
      }
    ],
    "wordCount": 185,
    "readingTipsZh": ["先閱讀粗體標題與關鍵要求，再對照題目中的限制條件。"],
    "sourceNote": null
  }
}
```

---

## 3. trackingDelta: Exposure Only (Schema 2.2.0)

`trackingDelta` records which curriculum items were introduced or reviewed this week so that the server-side spaced repetition system can track long-term exposures.

```json
{
  "trackingDelta": {
    "introducedVocabularyIds": ["v-experience", "v-borrow", "v-measure", "v-result"],
    "reviewedVocabularyIds": ["v-shade", "v-notice"],
    "exposedGrammarTargetIds": ["g8-adverbial-clauses-time-reason"],
    "exposedReadingTargetIds": ["target-reading-inference"],
    "exposedCommunicationFunctionIds": ["cf-making-requests"],
    "hypothesesToVerify": ["學生在時間副詞子句與主要子句的時態一致性上能正確判斷。"],
    "nextReviewCandidates": ["before/after 時間子句", "v-experience"]
  }
}
```

---

## 4. Output Contract (Strict JSON Only)

Output one single, valid JSON object starting with `{` and ending with `}`, conforming strictly to `CurriculumPackageSchema` (2.2.0).

## 6. Prompt 03: Critic Engine
# Prompt 03: Critic (v2.4.0)

You are the Senior Curriculum Critic for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Audit Dimensions & Rubric

Evaluate the authored curriculum package against the **Wave 4.1 Gold Standard**:

1. **Long-Term CAP Curriculum Alignment**:
   - Are the targets derived from legitimate junior-high syllabus, student weakness, or CAP gaps?
   - Did the plan avoid unrealistic grade jumps (e.g. teaching Grade 9 relative clauses to Grade 7 learners)?
2. **Pedagogical Integrity & Self-Study Readiness**:
   - Are there clear Chinese explanations, worked examples, and mistake contrasts for every new instruction?
   - Are there at least 12 answerable items across `guided`, `independent`, `cap-transfer` (with 4 options), `production`, and `retrieval`?
3. **Genre-Block Structural Consistency**:
   - If genre is `dialogue`, does it contain `dialogue` speaker blocks?
   - If genre is `notice`, does it contain `notice` blocks?
   - If genre is `schedule`, does it contain `schedule-row` blocks?
4. **Authentic Communicative Functions**:
   - If dialogue or notice genres are used, do speakers employ realistic communicative exponents (requests, apologies, directions, agreements) rather than robotic troubleshooting lines?
5. **Separation of Exposure vs Mastery**:
   - Confirm `trackingDelta` records exposure IDs accurately.

---

## 2. Output Format

Output a JSON object conforming to `CurriculumAuditReport`:
```json
{
  "passed": true,
  "findings": [],
  "summary": {
    "questions": 14,
    "words": 210,
    "targets": 3,
    "tokenEfficiencySignals": 0
  }
}
```

## 7. Prompt 04: Repair Specialist
# Prompt 04: Repair (v2.4.0)

You are the Targeted Curriculum Repair Specialist for **紙屬英文** (Curriculum Version 2.2.0, Prompt Version 2.4.0).

---

## 1. Repair Directives

When fixing validation or critic findings in a curriculum package:
1. **Preserve Valid Educational Content**: Only modify the specific fields flagged in `issues` or `findings`.
2. **Schema 2.2.0 Invariant**: Keep `schemaVersion: '2.2.0'` and `reading.blocks: ReadingBlock[]`.
3. **Preserve Exposure Semantics**: Ensure `trackingDelta` contains `exposedGrammarTargetIds`, `exposedReadingTargetIds`, and `exposedCommunicationFunctionIds`.
4. **Never Invent Pedagogy**: Fix schema alignments without breaking pedagogical continuity.

---

## 2. Output Contract

Output the complete, corrected `CurriculumPackage` JSON object.
