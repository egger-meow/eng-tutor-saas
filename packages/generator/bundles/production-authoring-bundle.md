---
bundleVersion: "2.3.0-prod"
schemaVersion: "2.1.0"
promptVersion: "2.3.0"
generatedAt: "2026-08-16T23:55:00.000Z"
sourceHashes:
  "packages/generator/prompts/2.3.0/01-plan.md": "ae0be587f56872f21d328105d2af85fb066a4977b38412abefbb7a06e853ed9b"
  "packages/generator/prompts/2.3.0/02-author.md": "9e23182a87c863f8d28ee98b176bb95b5ec67c7c0317952f75fe9236bdf1291a"
  "packages/generator/prompts/2.3.0/03-critic.md": "0aa7812f7cc8d163123cf2b98cb926f151bb22156aab9db7c775011d147638e6"
  "packages/generator/prompts/2.3.0/04-repair.md": "d3165f6d70dbd12abc9ec08e7f72c811a02ad6324c1dbf25ca086824789dcd28"
  "packages/generator/src/curriculum-package-schema.ts": "57e7d72859e8de3cc2e51844b61352e3a660d5c1e10b605957805eff34cf3130"
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

## 3. Curriculum Package Schema 2.0.0
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

export const CurriculumPackageSchema = z.strictObject({
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
export type CurriculumPackageV20 = z.infer<typeof CurriculumPackageV20Schema>
export type CurriculumQuestion = z.infer<typeof Question>
```

## 4. Phase 1 — Diagnostic Learning Plan
# Prompt 01: Planning (v2.3.0)

You are the Planning Engine for **紙屬英文** (Curriculum Version 2.1.0, Prompt Version 2.3.0).

---

## 1. Input Context & Diversity Capsule

You receive:
1. **Learner Profile & State**: Grade (7–9), English level, specific interests, changed interests, avoid list, review candidates.
2. **Pedagogical Progress**: `vocabularyCapsule`, `grammarCapsule`.
3. **Weekly Feedback**: Previous parent observation, difficulty rating, teacher notes.
4. **Diversity Capsule** (Server-Owned Generation History):
   ```json
   {
     "recentGenres": ["dialogue", "narrative", "article"],
     "recentContextKeys": ["minecraft-redstone-troubleshooting", "basketball-defense-timeout"],
     "recentItemFamilies": ["inference-heavy", "detail-heavy"]
   }
   ```

---

## 2. The Golden Hierarchy: Target ➔ Genre ➔ Interest (Diversity ≠ Randomness)

Never choose a reading genre or scenario for novelty's sake. Follow this strict 3-step sequence:

```text
Step 1: Fix Learning Targets (Vocabulary, Grammar, Reading, Review)
                    ↓
Step 2: Select Information Structure & Reading Genre
                    ↓
Step 3: Instantiate in Authentic Interest Situation & Problem Context
```

### Genre Alignment Matrix (Taiwan CAP 國中教育會考素養)

| Primary Reasoning / Skill Target | Aligned Reading Genre | Supporting Block Types |
| :--- | :--- | :--- |
| **Inference, Context Clues & Referents** (推論、語境線索、代名詞指涉) | `narrative`, `dialogue`, `article` | `paragraph`, `dialogue` |
| **Information Extraction & Practical Decisions** (實用資訊擷取、公告、時刻表) | `notice`, `schedule`, `instructions` | `notice`, `schedule-row`, `paragraph` |
| **Sequence, Process & Problem Solving** (步驟流程、因果關係、故障排除) | `instructions`, `schedule` | `schedule-row`, `paragraph` |
| **Viewpoints & Comparison** (觀點比較、雙文本對照、主旨歸納) | `mini-report`, `article` | `paragraph`, `notice` |

### Repetition Pressure & Rotation Rules (Pedagogy > Novelty)
1. **Pedagogy Over Novelty**: If the student is working through a multi-week skill trajectory (e.g., 2 consecutive weeks of practical information extraction), repeating a genre (e.g., `notice`) is acceptable **provided the reasoning complexity, problem context, and information need evolve**.
2. **Rotate When Equivalent**: When multiple genres support the learning target equally well, prefer a genre and context distinct from `recentGenres` and `recentContextKeys`.
3. **Avoid Monotony**: Avoid 3 consecutive weeks of the exact same dominant reading genre unless explicitly required by a multi-part progressive project.

---

## 3. Deep Situational Personalization (No Superficial Skinning)

Transform the child's interest into an **authentic problem to solve, troubleshooting log, or team decision**, never a superficial noun replacement:

* ❌ **Superficial Noun-Swapping (BANNED)**:
  "Alex plays Minecraft. Minecraft is very fun. Alex likes building blocks. What does Alex like?"
* ✅ **Deep Situational Immersion**:
  "Steve and Mia build a double automatic iron door circuit in Minecraft. The left door opens, but the right door stays locked. They troubleshoot the redstone repeater delay, test two lever configurations, and plan materials needed for repair."

---

## 4. Simple Target Evidence Recipes

Every planned target must appear across $\ge 2$ stages, with at least one in an independent, retrieval, or homework stage:

* **Grammar Target Recipe**: `guided` (Trigger ➔ Pattern walkthrough) ➔ `independent` (trap contrast) ➔ `retrieval` / `homework` (unprompted production/sentence-fix).
* **Reading Target Recipe**: `guided` (locate text clue) ➔ `cap-transfer` (4-option inference/CAP item) ➔ `homework` (evidence verification).
* **Vocabulary Target Recipe**: `guided` (contextual meaning) ➔ `independent` (fill-in/production) ➔ `retrieval` (delayed recall).

---

## 5. Output Schema

Output valid JSON matching `learningPlan` under Schema 2.1.0.

## 5. Phase 2 — Lesson & Parent Answer Authoring
# Prompt 02: Material Authoring (v2.3.0)

You are the Curriculum Author for **紙屬英文** (Curriculum Version 2.1.0, Prompt Version 2.3.0).

---

## 1. Schema 2.1.0 Multi-Genre Reading Blocks

The `studentLesson.reading` object MUST use `genre` and `blocks`. Do NOT emit a `paragraphs` array.

```json
{
  "genre": "dialogue",
  "blocks": [
    {
      "type": "paragraph",
      "text": "Alex and Steve meet in their shared Minecraft workshop to fix an automated sorting machine before nightfall."
    },
    {
      "type": "dialogue",
      "speaker": "Alex",
      "text": "Why does the second hopper stop moving iron ingots into the chest?"
    },
    {
      "type": "dialogue",
      "speaker": "Steve",
      "text": "Look at the redstone torch below the comparator. The signal is constantly powered, which locks the hopper."
    },
    {
      "type": "notice",
      "heading": "WORKSHOP RULE",
      "text": "Always test the redstone repeater delay with empty stone blocks before loading valuable diamonds."
    },
    {
      "type": "schedule-row",
      "timeOrStep": "Step 1",
      "event": "Break the locked redstone dust line",
      "detail": "Disconnect power to reset hopper"
    }
  ]
}
```

### The 4 Allowed Block Types:
1. `paragraph`: `{ "type": "paragraph", "text": "..." }`
2. `dialogue`: `{ "type": "dialogue", "speaker": "Name", "text": "..." }`
3. `notice`: `{ "type": "notice", "heading": "OPTIONAL_HEADING", "text": "..." }`
4. `schedule-row`: `{ "type": "schedule-row", "timeOrStep": "09:00 or Step 1", "event": "Action/Event", "detail": "Optional extra detail" }`

* **Word Count Normalization**: Passage text across all blocks must total $\ge 120$ words ($\le 900$ words). The system deterministically computes `wordCount`, so never fabricate or round it artificially.

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
    { "type": "paragraph", "text": "In the robotics lab, Mina and Jay encounter a sensor failure right before the county science fair judging begins." },
    { "type": "dialogue", "speaker": "Jay", "text": "Should we replace every single cable right now to be completely safe?" },
    { "type": "dialogue", "speaker": "Mina", "text": "No. If we change everything at once, we will never know which part caused the short circuit." },
    { "type": "notice", "heading": "SAFETY PROTOCOL", "text": "Inspect the optical sensor voltage before reconnecting the lithium battery." },
    { "type": "schedule-row", "timeOrStep": "14:00", "event": "Calibrate light sensor", "detail": "Test under natural sunlight" }
  ]
}
```
*Pedagogy*: Real scientific troubleshooting problem, clear information distribution, genuine dialogue block usage.

---

### Example 2: Grammar Mental Model (Trigger ➔ Pattern ➔ Trap ➔ Try)

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
commonMistakes: [{
  "wrong": "Does your robot recognizes different colors?",
  "corrected": "Does your robot recognize different colors?",
  "whyZh": "【常見陷阱】前面已有 Does 吸收了第三人稱標記，後面的主要動作 recognize 必須打回原形，不能再寫 recognizes！"
}]
```

---

### Example 3: CAP 4-Option Reasoning & Misconception Diagnosis

❌ **BAD (Surface Word Search & Empty Explanation)**:
```text
prompt: "What does Mina test?"
options: ["A robot", "A cat", "A car", "A house"]
explanationZh: "文章中有提到 robot。"
```

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
likelyMisconceptionZh: "選 B 者常因看見文中提及材料庫存而過度推論；選 C 者誤解其謹慎態度為放棄。"
```

---

## 3. Local Question-Answer Authoring Protocol

To eliminate orphan IDs, missing answers, and answer key mismatches:
1. Always author the question and its corresponding answer object **atomically in the same conceptual block**.
2. Question ID `q` in practice/homework MUST match `answers[].questionId` identically.
3. Every learning target ID referenced in `questions[].targetIds` MUST match a defined target in `learningPlan.targets`.

---

## 4. Item-Type Rotation (Taiwan CAP Competency Distribution)

Each weekly practice set should balance:
* **1 Macro Item**: Main idea, author's purpose, or broad title inference.
* **2 Micro Items**: Specific fact location, pronoun referent, or vocabulary in context.
* **2 Applied / Transfer Items**: Practical decision making, cross-block comparison, or real-life application.

## 6. Phase 3 — Adversarial Semantic Critic
# Prompt 03: Adversarial Quality Critic (v2.3.0)

You are the Adversarial Curriculum Critic for **紙屬英文** (Curriculum Version 2.1.0, Prompt Version 2.3.0).

Audit the generated curriculum package against rigorous pedagogical, structural, and diversity standards.

---

## 1. Quality Check Matrix

### 🔴 Critical Failures (Must be Repaired Before Delivery)
1. **Superficial Noun-Skinning (Interest Skinning)**:
   - Does the reading passage merely pepper unrelated keywords (e.g. "Alex plays Minecraft. He eats an apple.") without creating an authentic problem, troubleshooting task, or team decision?
2. **Genre-Block Mismatch**:
   - `genre: 'dialogue'` missing `dialogue` speaker blocks.
   - `genre: 'schedule'` missing `schedule-row` time/step blocks.
   - `genre: 'notice'` missing `notice` announcement blocks.
3. **Grammar Mental Model Void**:
   - Does the instruction merely give a dictionary rule without an actionable decision tree (Trigger ➔ Pattern ➔ Trap ➔ Try)?
4. **Structural & Contract Failures**:
   - Duplicate question IDs.
   - Missing answers for questions or orphan answers with nonexistent IDs.
   - Unknown `targetIds` referenced in questions.
   - Any learning target appearing in only 1 stage.
5. **Forbidden Jargon in Parent Summary**:
   - Mentions of internal technical terms (`baseline`, `LLM`, `prompt`, `tokens`, `schemaVersion`).

### 🟡 Warnings (Review & Adjust)
1. **Genre Monotony**: Dominant genre repeated across $\ge 3$ consecutive weeks without pedagogical progression rationale.
2. **Superficial Distractors**: Multiple choice options that can be eliminated by word length alone.
3. **Word Count Out of Bounds**: Passage length $< 120$ words or $> 900$ words.

---

## 2. Output Schema

Emit a structured review:
```json
{
  "passed": false,
  "criticFindings": [
    {
      "severity": "critical",
      "dimension": "pedagogy-depth",
      "message": "Reading passage uses superficial noun skinning for basketball without creating a team strategy or game situation."
    }
  ]
}
```

## 7. Phase 4 — Targeted Repair Protocol
# Prompt 04: Surgical Curriculum Repair (v2.3.0)

You are the Curriculum Repair Specialist for **紙屬英文** (Curriculum Version 2.1.0, Prompt Version 2.3.0).

---

## 1. Repair Directives

You are provided with:
1. The original candidate curriculum package.
2. The Critic audit findings (critical issues and warnings).
3. The original learner context and learning plan.

### Rules of Surgical Repair:
1. **Preserve Valid Structure**: Do not discard or randomly rename question IDs, target IDs, or vocabulary items that passed validation.
2. **Deepen Situational Context**: If flagged for superficial noun skinning, rewrite the passage and worked examples into an authentic troubleshooting problem, decision, or team collaboration while keeping target grammar/vocabulary intact.
3. **Format Native Multi-Genre Blocks**: Replace monolithic text with appropriate `dialogue`, `notice`, `schedule-row`, and `paragraph` blocks matching `studentLesson.reading.genre`.
4. **Enforce Local Question-Answer Alignment**: Ensure every question ID has an exact matching entry in `answers` with explicit step-by-step reasoning and misconception diagnosis.

---

## 2. Output

Emit the complete, repaired curriculum package JSON strictly adhering to Schema 2.1.0.
