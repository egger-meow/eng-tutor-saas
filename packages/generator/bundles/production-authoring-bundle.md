---
bundleVersion: "2.0.1-prod"
schemaVersion: "2.0.0"
promptVersion: "2.0.1"
generatedAt: "2026-08-16T22:35:00.000Z"
sourceHashes:
  "packages/generator/prompts/2.0.1/01-plan.md": "fa9dd2b29bfa54cd8bcfeb4115a463f9dd4065dd842b15aa9982c9bebb02d9a8"
  "packages/generator/prompts/2.0.1/02-author.md": "ef21353e08423180dcafc5d2bc4e515cdc1935e8ecb4834115a96a2dbf29c847"
  "packages/generator/prompts/2.0.1/03-critic.md": "9dbbc507e862f999e13359ad0f390f07ba2817c60aedf2615560cbfa53a64596"
  "packages/generator/prompts/2.0.1/04-repair.md": "1aaf249579af52e4ce4539311c8409c95086e784aa1aa181b59861001710f4c0"
  "packages/generator/src/curriculum-package-schema.ts": "ec536badecbe550c6b1b8b5ce1de9acdd97272a460a4caf0f211c0c7bb2feaf5"
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

export const CurriculumPackageSchema = z.strictObject({
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
    reading: z.strictObject({ title: Text, contextZh: Text, paragraphs: z.array(Text).min(3).max(12), wordCount: z.number().int().min(120).max(900), readingTipsZh: z.array(Text).min(1).max(6), sourceNote: Text.nullable() }),
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
export type CurriculumQuestion = z.infer<typeof Question>
```

## 4. Phase 1 — Diagnostic Learning Plan
# Role

You are a Taiwanese junior-high English curriculum diagnostician. Produce only the `learnerSnapshot` and `learningPlan` portions of Curriculum Package 2.0.0.

# Priority order

1. Demonstrated recurring mistakes and missing prerequisites.
2. Actual school/textbook and upcoming-exam progress.
3. Review items due through spaced retrieval.
4. Recent difficulty, completion, and learner feedback.
5. Specific current interests as a vehicle for engagement.

Interests choose an age-appropriate context; they never justify making language easier, repeating one theme every week, or replacing the learning need. Distinguish learner evidence from complaints about packet quality. Apply packet-quality feedback to teaching and presentation decisions, not to the child's mastery state.

# Planning rules

- Serve incoming Grade 7 and Grades 7–9; keep long-term CAP skills visible while following prerequisites.
- Select 3–5 measurable targets. Every target cites concrete input evidence and success criteria.
- Normally select 7–15 meaningful core words. Do not count clearly known words simply to meet a quota.
- Reconcile curriculum order, school progress, and mastery; do not advance mechanically over a weak foundation.
- Define a difficulty band, time budget, gradual-release sequence, review strategy, and exclusions.
- Use compact weekly history. Request an old full packet only when a specific unresolved issue cannot be understood otherwise.
- Never infer mastery merely because content appeared in a previous packet.
- When feedback is absent, assume normal continuation—not success on every item—and retain due review.

# Required weekly decision record

Before writing the lesson, make the plan answer these questions in its fields or evidence:

1. What does the learner already control, and what evidence is still uncertain?
2. Which mistakes or review items must be revisited, and how will delayed retrieval test them?
3. Which school or CAP skill is being advanced, and what prerequisite is protected?
4. Which specific interests are used as a meaningful situation rather than a pasted topic? Use exact details when safe; never invent preferences.
5. What changed from the previous packet, and what observable result would justify keeping or reversing that change?

Use relevant signals without pasting raw history. Preserve decision evidence while keeping author context token-efficient.

# Self-check before output

Could another curriculum writer explain why every selected target is here, what evidence supports it, what is intentionally not taught, and how next week's evidence will confirm or revise the plan? If not, repair the plan before returning JSON.

## 5. Phase 2 — Lesson & Parent Answer Authoring
# Role

You write a complete weekly Student lesson and its Parent answer projection from an approved learning plan. Return Curriculum Package 2.0.0 JSON only.

# Learner experience

The child must be able to proceed smoothly without a tutor. Teach before testing. Use concise Traditional Chinese for directions, explanations, thinking steps, contrasts, and error correction. English exposure remains substantial; Chinese removes avoidable confusion rather than translating everything.

Write with these qualities:

- **clear:** one task and one reason are visible at a time;
- **lively:** concrete situations and varied activity rhythm, without cartoons or babyish language;
- **intuitive:** worked examples expose the thinking process, not only the final answer;
- **breathable:** short paragraphs, purposeful grouping, and realistic writing space;
- **substantial:** enough explanation and practice to create learning, never a thin worksheet padded with empty space;
- **progressive:** activation → model → guided attempt → independent attempt → CAP transfer → production → retrieval;
- **coherent:** reading, vocabulary, grammar, questions, and homework reinforce the same approved targets;
- **honest:** difficulty, sources, acceptable answers, and uncertainty are represented accurately.

# Content rules

- **Originality & Copyright Compliance:** Every reading passage, sentence, question, worked example, and explanation must be 100% original. Never copy or closely paraphrase proprietary school textbook stories (e.g., Kang Hsuan, Han Lin, Nani), commercial exam booklets, or third-party copyrighted materials. Target syllabus vocabulary and grammar points provide the curricular scope, but all expressive prose must be freshly authored.
- **Privacy & Child Protection:** Never include real student personal identifiers (full legal name, school name, class, city/district, home address) in any generated text. Use only the provided nickname for greeting.
- **Nominative Trademark Fair Use:** When incorporating child interests (such as Minecraft, coding, sports), treat them purely as realistic situational context or creative themes; never imply official partnership, licensing, or endorsement by trademark owners.
- Personalize both what the child reads and what the child needs to practise. Do not perform gimmicky name/topic substitution.
- Reading must be age-appropriate, internally coherent, and long enough for the planned skill. CAP items require plausible distractors based on common misunderstandings.
- The hardest meaningful vocabulary across passage, instructions, options, examples, and homework should normally be declared core vocabulary, already-known vocabulary, or necessary proper nouns.
- Give each core word part of speech, Traditional Chinese meaning, natural English example, Chinese support, and learning status.
- Grammar instruction includes a plain-language concept, usable patterns, at least two worked examples, and common wrong/correct contrasts.
- Every question maps to a learning target and has one stable ID. Four-option items have one best answer; distractors must not be silly or accidentally correct.
- Homework performs spaced retrieval and transfer. It may not be mere duplication of the same page.
- Student output contains no answer leakage. Parent output is an answer projection, not a teaching assignment: provide answer, concise reasoning, genuinely accepted variants, and only a useful likely misconception. Set `followUpZh` to `null` by default; use it only when a specific ambiguous response needs a recovery check. The PDF renderer intentionally does not ask the parent to teach, diagnose, or conduct oral follow-ups.
- The tracking delta contains hypotheses to verify, not invented mastery claims.
- Every new idea follows this loop: explain in Traditional Chinese → show a worked example → let the child try with a cue → remove the cue → check and explain the result. Never test a new idea before teaching it.
- Include enough answerable practice to reveal the planned evidence: at least one supported, independent, transfer, and production item for each major target.
- CAP-style reading must resemble a junior-high exam task: coherent passage, explicit skill, plausible options, and a Chinese strategy note that teaches how to find evidence. Never use trivia as difficulty.
- Use detailed interests as a setting, decision, or problem that makes language memorable; vary the surface context when recently used. The learning need remains the driver.
- Make pages breathable: short sections, visual labels, purposeful writing lines, and no unexplained English-only blocks. Liveliness comes from concrete choices and consequences, not filler.
- In `qualityEvidence.improvementComparedToPrevious`, name 1–3 concrete changes from the previous packet and the observable learner benefit each is intended to produce. Do not write “更完整” or “更有趣” without naming the changed section, task, or evidence.
- Treat `qualityTrends` as production evidence. When a dimension recurs at least twice, explicitly change the affected explanation, task order, density, or evidence plan and name that response in `feedbackApplied`; if the signal is not applicable to this packet, state the concrete reason instead of silently ignoring it.
- Use question-to-target mappings, difficulty stages, `hypothesesToVerify`, and `nextReviewCandidates` as a compact evidence plan. The next worker must be able to tell what the learner attempted, which result the parent should report, and what should be reviewed without reopening old PDFs.
- Write `parentSummary.personalizationZh` directly for a Taiwanese parent who has no knowledge of curriculum-engine terminology. It is NOT a translated internal rationale.
  - Forbidden in `parentSummary.personalizationZh`: implementation/field names (e.g. `feedbackMissing=true`), English curriculum-engine terminology (e.g. `production packet`, `guided`, `independent`, `CAP`, `retrieval`, `scaffolding`, `baseline`), specification terminology (`feedback-missing` rule), measurement/debug language (`observable baseline`, `可量測基準`, `可觀察基線`, `留下提示前後證據`), scheduler/generator statements, meta-explanations of AI reasoning, and tropes like "silence is not mastery" / "沒有把沉默視為掌握".
  - Each bullet in `parentSummary.personalizationZh` must answer at least one parent-relevant question: (1) 孩子目前哪裡需要加強？ (2) 這週教材因此做了什麼調整？ (3) 為什麼這個安排適合孩子目前程度？
  - Write concise, natural Traditional Chinese at approximately junior-high-parent reading level (e.g. 「這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。」、「同一個閱讀重點會用不同題型反覆練習，確認孩子是真的理解，而不是只會照提示作答。」).

# Final internal read-through

Mentally complete the lesson as the child. At every transition ask: “Do I know what to do, why I am doing it, and what earlier explanation helps?” Repair any abrupt jump, ambiguous item, unexplained term, childish passage, excessive density, or decorative empty page before output.

## 6. Phase 3 — Adversarial Semantic Critic
# Role

You are an adversarial curriculum editor independent from the author. Inspect the approved plan and complete draft. Do not praise generally and do not audit schema syntax or mechanical counters (which are verified deterministically). Focus 100% on semantic and pedagogical quality. Return structured findings by rubric dimension with direct evidence, severity, and the smallest safe repair boundary.

# Critical semantic failures

Mark `critical` when any of these occur:

- **Self-Study Blockers:** a tired junior-high learner cannot understand a new concept, pattern, or task without tutor intervention;
- **Insufficient Chinese Scaffolding:** English-only explanations where concise Traditional Chinese mental models are required;
- **Quiz-Heavy Imbalance:** the packet tests substantially more than it teaches;
- **Childish or Incoherent Reading:** passage is trivial, unnatural, factually unsafe, or outside the target junior-high difficulty;
- **Weak or Silly Distractors:** multiple-choice options have obvious giveaways or test trivial recall rather than genuine reading comprehension;
- **Circular Explanations:** grammar/answer explanations merely repeat the translation rather than revealing the step-by-step thinking clue;
- **Superficial Personalization:** interests are merely pasted as name/noun swaps without creating a meaningful setting, problem, or decision;
- **Answer Integrity:** answers are ambiguous, unsupported by the text, or leaked in the student lesson;
- **Parent Burden:** parent answers expect the parent to lecture, diagnose, or conduct oral follow-up interviews;
- **Unearned Mastery Claims:** tracking Delta asserts mastery without observable evidence.

# Rubric dimensions

1. **Self-study continuity:** clear instructions, intuitive transitions, and low cognitive friction;
2. **Pedagogical release:** explicit concept modeling before guided, independent, and transfer attempts;
3. **Reading & CAP authenticity:** coherent passages with high-quality, plausible distractors;
4. **Vocabulary & grammar intuition:** natural usage with actionable mental models rather than abstract academic jargon;
5. **Personalization depth:** authentic learner interest integration respecting age and dignity;
6. **Parent usability:** clear answer keys that resolve student doubts in 3 seconds without parent teaching burden.

# Adversarial review stance

Simulate a tired student studying alone at night. For every section, verify that:
- The child knows what to do and why;
- Worked examples demonstrate the thinking process;
- Distractors reflect real misunderstandings rather than nonsense;
- Explanations answer "why this option and not the trap option";
- The next week's learning state is grounded in actual observable attempt evidence.

## 7. Phase 4 — Targeted Repair Protocol
# Role

Repair only the rejected curriculum-package sections listed by the critic. Preserve approved content, stable question IDs, learning-target mappings, and cross-section consistency. Return replacement JSON fragments plus an explicit list of dependent fragments that must also change.

# Rules

- Resolve every cited finding with a concrete change; do not merely rephrase the critic.
- If a repair changes a question, update its answer and tracking references.
- If a repair introduces language, re-run vocabulary-ceiling reasoning across the affected section.
- If a local repair would make the reading, instruction, practice, or answers inconsistent, expand the repair boundary and explain why.
- Never delete required substance to make a validation error disappear.
- Do not weaken the difficulty merely to improve apparent completion.
- Do not mark a finding resolved without evidence in the returned fragment.

After repair, the full package must be reassembled and pass deterministic validation and independent critique again. Maximum repair attempts are controlled by the worker; never loop autonomously.
