import { z } from 'zod'

const RequiredText = z.string().trim().min(1)
const StableId = RequiredText.regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Must be a stable identifier')

const MetadataSchema = z.strictObject({
  jobId: StableId,
  childId: StableId,
  weekNumber: z.number().int().positive(),
  grade: z.number().int().min(7).max(9),
  title: RequiredText,
  generatedAt: z.iso.datetime(),
  ruleVersion: RequiredText,
})

const PersonalizationSchema = z.strictObject({
  interests: z.array(RequiredText).max(8),
  focusAreas: z.array(RequiredText).min(1).max(8),
  priorFeedbackSummary: RequiredText,
  rationale: RequiredText,
  personalizationZh: z.array(RequiredText).min(1).max(6).optional(),
})

const VocabularyItemSchema = z.strictObject({
  word: RequiredText,
  partOfSpeech: RequiredText,
  definition: RequiredText,
  example: RequiredText,
})

const ReadingSchema = z.strictObject({
  title: RequiredText,
  passage: RequiredText,
})

const GrammarSchema = z.strictObject({
  topic: RequiredText,
  explanation: RequiredText,
  examples: z.array(RequiredText).min(1).max(8),
})

const ExerciseQuestionSchema = z.strictObject({
  questionId: StableId,
  prompt: RequiredText,
  type: z.enum(['multiple-choice', 'short-answer', 'sentence-writing']),
  options: z.array(RequiredText).min(2).max(6).optional(),
  writingLines: z.number().int().min(1).max(8).default(2),
})

const ExerciseGroupSchema = z.strictObject({
  title: RequiredText,
  instructions: RequiredText,
  questions: z.array(ExerciseQuestionSchema).min(1),
})

const AnswerSchema = z.strictObject({
  questionId: StableId,
  answer: RequiredText,
  explanation: RequiredText,
})

export const WeeklyLessonSchema = z.strictObject({
  metadata: MetadataSchema,
  personalization: PersonalizationSchema,
  objectives: z.array(RequiredText).min(1).max(8),
  vocabulary: z.array(VocabularyItemSchema).min(7).max(15),
  reading: ReadingSchema,
  grammar: GrammarSchema,
  exercises: z.array(ExerciseGroupSchema).min(1),
  homework: z.strictObject({
    instructions: RequiredText,
    tasks: z.array(z.strictObject({ questionId: StableId, prompt: RequiredText, writingLines: z.number().int().min(1).max(8).default(2) })).min(1).max(8),
  }),
  answers: z.array(AnswerSchema).min(1),
  parentGuidance: z.strictObject({
    weeklyFocus: RequiredText,
    supportTips: z.array(RequiredText).min(1).max(8),
    completionCheck: RequiredText,
  }),
})

export type WeeklyLesson = z.infer<typeof WeeklyLessonSchema>
