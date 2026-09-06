import { z } from 'zod'

const Text = z.string().trim().min(1)
const StableId = Text.regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Must be a stable identifier')
const Evidence = z.strictObject({ source: z.enum(['profile', 'school', 'learning-state', 'vocabulary', 'grammar', 'weekly-history', 'feedback', 'curriculum']), detail: Text })

export const ResponseGridCellSchema = z.strictObject({
  text: Text.optional(),
  responseUnitId: StableId.optional(),
  placeholder: Text.optional(),
})

export type ResponseGridCell = z.infer<typeof ResponseGridCellSchema>

export const SequenceItemSchema = z.strictObject({
  stepNumber: z.union([z.number().int(), Text]).optional(),
  label: Text.optional(),
  content: Text.optional(),
  placeholder: Text.optional(),
  responseUnitId: StableId.optional(),
  relationToNext: Text.optional(),
})

export type SequenceItem = z.infer<typeof SequenceItemSchema>

export const ResponseLayoutRowSchema = z.strictObject({
  label: Text.optional(),
  values: z.array(Text).optional(),
  cells: z.array(ResponseGridCellSchema).optional(),
}).refine((row) => !(row.values !== undefined && row.cells !== undefined), {
  message: 'Row cannot define both values and cells simultaneously',
})

export type ResponseLayoutRow = z.infer<typeof ResponseLayoutRowSchema>

function refineGridRowHeaderShape(
  layout: { headers: string[]; rows: Array<{ label?: string; values?: string[]; cells?: any[] }> },
  ctx: z.RefinementCtx,
): void {
  const headerCount = layout.headers.length
  for (let i = 0; i < layout.rows.length; i++) {
    const row = layout.rows[i]!
    const labelCount = row.label !== undefined ? 1 : 0
    if (row.cells !== undefined) {
      const colCount = labelCount + row.cells.length
      if (colCount !== headerCount) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'cells'],
          message: `Row column count (${colCount}: ${labelCount ? '1 label + ' : ''}${row.cells.length} cells) does not match header count (${headerCount})`,
        })
      }
    } else if (row.values !== undefined && row.values.length > 0) {
      const colCount = labelCount + row.values.length
      if (colCount !== headerCount) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'values'],
          message: `Row column count (${colCount}: ${labelCount ? '1 label + ' : ''}${row.values.length} values) does not match header count (${headerCount})`,
        })
      }
    }
  }
}

export const ResponseLayoutSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('lines'),
    lineCount: z.number().int().min(1).max(10).optional(),
  }),
  z.strictObject({
    type: z.literal('table'),
    headers: z.array(Text).min(2).max(6),
    rows: z.array(ResponseLayoutRowSchema).min(1).max(8),
  }).superRefine(refineGridRowHeaderShape),
  z.strictObject({
    type: z.literal('organizer'),
    headers: z.array(Text).min(2).max(6),
    rows: z.array(ResponseLayoutRowSchema).min(1).max(8),
  }).superRefine(refineGridRowHeaderShape),
  z.strictObject({
    type: z.literal('sequence'),
    layoutDirection: z.enum(['vertical', 'horizontal']).optional().default('vertical'),
    items: z.array(SequenceItemSchema).min(2).max(8),
  }),
])

export type ResponseLayout = z.infer<typeof ResponseLayoutSchema>

function requireWritingSpace(question: { itemType: string; options?: string[]; writingLines: number; responseLayout?: ResponseLayout }, ctx: z.RefinementCtx): void {
  const writtenResponse = !question.options && ['translation', 'sentence-production', 'short-response'].includes(question.itemType)
  const hasWritingSpace = question.writingLines >= 1
    || (question.responseLayout?.type === 'lines' && (question.responseLayout.lineCount ?? 0) >= 1)
    || question.responseLayout?.type === 'table'
    || question.responseLayout?.type === 'organizer'
    || question.responseLayout?.type === 'sequence'
  if (writtenResponse && !hasWritingSpace) {
    ctx.addIssue({ code: 'custom', path: ['writingLines'], message: 'Written responses require writing space' })
  }
}

export const QuestionLegacySchema = z.strictObject({
  id: StableId,
  targetIds: z.array(StableId).min(1).max(4),
  itemType: z.enum(['vocabulary', 'grammar', 'main-idea', 'detail', 'sequence', 'inference', 'context-clue', 'author-purpose', 'cloze', 'translation', 'sentence-production', 'short-response']),
  prompt: Text,
  options: z.array(Text).length(4).optional(),
  writingLines: z.number().int().min(0).max(10),
  difficulty: z.enum(['supported', 'on-level', 'stretch']),
}).superRefine(requireWritingSpace)

export type QuestionLegacy = z.infer<typeof QuestionLegacySchema>

export const QuestionV24Schema = z.strictObject({
  id: StableId,
  targetIds: z.array(StableId).min(1).max(4),
  itemType: z.enum(['vocabulary', 'grammar', 'main-idea', 'detail', 'sequence', 'inference', 'context-clue', 'author-purpose', 'cloze', 'translation', 'sentence-production', 'short-response']),
  prompt: Text,
  options: z.array(Text).length(4).optional(),
  writingLines: z.number().int().min(0).max(10),
  difficulty: z.enum(['supported', 'on-level', 'stretch']),
  responseLayout: ResponseLayoutSchema.optional(),
}).superRefine(requireWritingSpace)

export type QuestionV24 = z.infer<typeof QuestionV24Schema>

export const QuestionV25Schema = QuestionV24Schema
export type QuestionV25 = QuestionV24
export const QuestionSchema = QuestionV25Schema
export type Question = QuestionV25

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

export const AdaptiveExtensionPurposeSchema = z.enum([
  'strategy',
  'reasoning',
  'pronunciation',
  'real-world-application',
  'creative-depth',
])

export type AdaptiveExtensionPurpose = z.infer<typeof AdaptiveExtensionPurposeSchema>

export const AdaptiveExtensionPlacementSchema = z.enum([
  'after-reading',
  'after-practice',
])

export type AdaptiveExtensionPlacement = z.infer<typeof AdaptiveExtensionPlacementSchema>

export const AdaptiveExtensionSchema = z.strictObject({
  id: StableId,
  placement: AdaptiveExtensionPlacementSchema,
  purpose: AdaptiveExtensionPurposeSchema,
  titleZh: Text,
  contentZh: Text,
  taskZh: Text.nullable().optional().default(null),
  taskWritingLines: z.number().int().min(0).max(6).optional().default(0),
})

export type AdaptiveExtension = z.infer<typeof AdaptiveExtensionSchema>

export const GroundingSourceSchema = z.strictObject({
  id: StableId,
  url: z.url(),
  title: Text,
  publisher: Text,
  publishedAt: z.iso.datetime().optional(),
  accessedAt: z.iso.datetime(),
})

export const GroundingFactSchema = z.strictObject({
  id: StableId,
  text: Text,
  sourceIds: z.array(StableId).min(1),
  classification: z.enum(['fact', 'inference']),
})

export const GroundingClaimSchema = z.strictObject({
  id: StableId,
  factIds: z.array(StableId).min(1),
  location: Text,
  text: Text,
})

export const GroundingSchema = z.strictObject({
  topic: Text,
  knowledgeType: z.enum(['event', 'person', 'place', 'process', 'concept', 'comparison', 'other']),
  temporalMode: z.enum(['evergreen', 'current']),
  researchedAt: z.iso.datetime(),
  sources: z.array(GroundingSourceSchema).min(1),
  facts: z.array(GroundingFactSchema).min(1),
  claims: z.array(GroundingClaimSchema).min(1),
})

// Legacy 2.2.0 production schema. Historical packages remain renderable but are
// never upgraded by inventing grounding metadata.
export const CurriculumPackageV22Schema = z.strictObject({
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
    engineVersion: Text.optional(),
    workerVersion: Text.optional(),
    releaseId: Text.optional(),
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
      sourceNote: Text.nullable().optional(),
    }),
    adaptiveExtension: AdaptiveExtensionSchema.nullable().optional(),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(QuestionLegacySchema).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(QuestionLegacySchema).min(3).max(20) }),
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

// Legacy 2.3.0 Production Schema
export const CurriculumPackageV23Schema = CurriculumPackageV22Schema.extend({
  metadata: CurriculumPackageV22Schema.shape.metadata.extend({
    schemaVersion: z.literal('2.3.0'),
  }),
  grounding: GroundingSchema,
  qualityEvidence: CurriculumPackageV22Schema.shape.qualityEvidence.extend({
    precedentRefs: z.array(z.string().regex(/^cap-[a-f0-9]{12}$/)).max(20).default([]),
  }),
})

// Canonical 2.4.0 Production Schema
export const CurriculumPackageV24Schema = CurriculumPackageV23Schema.extend({
  metadata: CurriculumPackageV23Schema.shape.metadata.extend({
    schemaVersion: z.literal('2.4.0'),
  }),
  studentLesson: CurriculumPackageV23Schema.shape.studentLesson.extend({
    vocabulary: z.array(z.strictObject({
      id: StableId,
      word: Text,
      partOfSpeech: Text,
      meaningZh: Text,
      pronunciationHint: Text.nullable(),
      exampleEn: Text,
      exampleZh: Text,
      status: z.enum(['new', 'review', 'repeated-miss', 'extension']),
    })).min(1).max(30),
    practice: z.array(z.strictObject({
      id: StableId,
      stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']),
      titleZh: Text,
      instructionsZh: Text,
      hintZh: Text.nullable(),
      questions: z.array(QuestionV24Schema).min(1).max(20),
    })).min(4).max(10),
    homework: z.strictObject({
      purposeZh: Text,
      estimatedMinutes: z.number().int().min(5).max(90),
      questions: z.array(QuestionV24Schema).min(3).max(20),
    }),
  }),
})

export const UnitAnswerSchema = z.strictObject({
  unitId: StableId,
  answer: Text,
  acceptedAnswers: z.array(Text).default([]),
  explanationZh: Text.optional(),
})

export type UnitAnswer = z.infer<typeof UnitAnswerSchema>

export const AnswerItemV25Schema = z.strictObject({
  questionId: StableId,
  answer: Text,
  acceptedAnswers: z.array(Text),
  explanationZh: Text,
  likelyMisconceptionZh: Text.nullable(),
  followUpZh: Text.nullable(),
  unitAnswers: z.array(UnitAnswerSchema).optional(),
}).superRefine((item, ctx) => {
  if (item.unitAnswers && item.unitAnswers.length > 0) {
    const seen = new Set<string>()
    for (let i = 0; i < item.unitAnswers.length; i++) {
      const u = item.unitAnswers[i]!
      if (seen.has(u.unitId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['unitAnswers', i, 'unitId'],
          message: `Duplicate unitAnswer for unitId "${u.unitId}" in question "${item.questionId}"`,
        })
      }
      seen.add(u.unitId)
    }
  }
})

export type AnswerItemV25 = z.infer<typeof AnswerItemV25Schema>

// Canonical 2.5.0 Production Schema
export const CurriculumPackageV25Schema = CurriculumPackageV24Schema.extend({
  metadata: CurriculumPackageV24Schema.shape.metadata.extend({
    schemaVersion: z.literal('2.5.0'),
  }),
  studentLesson: CurriculumPackageV24Schema.shape.studentLesson.extend({
    practice: z.array(z.strictObject({
      id: StableId,
      stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']),
      titleZh: Text,
      instructionsZh: Text,
      hintZh: Text.nullable(),
      questions: z.array(QuestionV25Schema).min(1).max(20),
    })).min(4).max(10),
    homework: z.strictObject({
      purposeZh: Text,
      estimatedMinutes: z.number().int().min(5).max(90),
      questions: z.array(QuestionV25Schema).min(3).max(20),
    }),
  }),
  answers: z.array(AnswerItemV25Schema).min(1),
})

/** The one canonical schema used for all newly authored production packages. */
export const CurriculumPackageSchema = CurriculumPackageV25Schema

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
    engineVersion: Text.optional(),
    workerVersion: Text.optional(),
    releaseId: Text.optional(),
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
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(QuestionLegacySchema).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(QuestionLegacySchema).min(3).max(20) }),
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
    engineVersion: Text.optional(),
    workerVersion: Text.optional(),
    releaseId: Text.optional(),
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
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(QuestionLegacySchema).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(QuestionLegacySchema).min(3).max(20) }),
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

export type CurriculumPackageV25 = z.infer<typeof CurriculumPackageV25Schema>
export type CurriculumPackageV24 = z.infer<typeof CurriculumPackageV24Schema>
export type CurriculumPackageV23 = z.infer<typeof CurriculumPackageV23Schema>
export type CurriculumPackageV22 = z.infer<typeof CurriculumPackageV22Schema>
export type CurriculumPackage = CurriculumPackageV25 | CurriculumPackageV24 | CurriculumPackageV23 | CurriculumPackageV22
export type CurriculumPackageV21 = z.infer<typeof CurriculumPackageV21Schema>
export type CurriculumPackageV20 = z.infer<typeof CurriculumPackageV20Schema>
export type CurriculumQuestionV25 = z.infer<typeof QuestionV25Schema>
export type CurriculumQuestionV24 = z.infer<typeof QuestionV24Schema>
export type CurriculumQuestionLegacy = z.infer<typeof QuestionLegacySchema>
export type CurriculumQuestion = CurriculumQuestionV25 | CurriculumQuestionV24 | (CurriculumQuestionLegacy & { responseLayout?: undefined })

export function upgradeV23ToV24(pkg: CurriculumPackageV23): CurriculumPackageV24 {
  return {
    ...pkg,
    metadata: {
      ...pkg.metadata,
      schemaVersion: '2.4.0',
    },
    studentLesson: {
      ...pkg.studentLesson,
      practice: pkg.studentLesson.practice.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) => ({ ...q })),
      })),
      homework: {
        ...pkg.studentLesson.homework,
        questions: pkg.studentLesson.homework.questions.map((q) => ({ ...q })),
      },
    },
  }
}

export function upgradeV24ToV25(pkg: CurriculumPackageV24): CurriculumPackageV25 {
  return {
    ...pkg,
    metadata: {
      ...pkg.metadata,
      schemaVersion: '2.5.0',
    },
    studentLesson: {
      ...pkg.studentLesson,
      practice: pkg.studentLesson.practice.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) => ({ ...q })),
      })),
      homework: {
        ...pkg.studentLesson.homework,
        questions: pkg.studentLesson.homework.questions.map((q) => ({ ...q })),
      },
    },
    answers: pkg.answers.map((ans) => ({ ...ans })),
  }
}
