import { z } from 'zod'

// 1. Domains & Skills
export const ASSESSMENT_DOMAINS = ['vocabulary', 'grammar', 'reading'] as const
export type AssessmentDomain = (typeof ASSESSMENT_DOMAINS)[number]

export const ASSESSMENT_SKILLS = [
  // Vocabulary (3)
  'core_vocabulary',
  'contextual_meaning',
  'word_form_usage',
  // Grammar (5)
  'basic_sentence_structure',
  'verb_tense_agreement',
  'questions_and_negatives',
  'modifiers_and_relations',
  'complex_structures',
  // Reading (5)
  'explicit_information',
  'main_idea',
  'vocabulary_in_context',
  'inference',
  'information_integration',
] as const
export type AssessmentSkill = (typeof ASSESSMENT_SKILLS)[number]

export const DOMAIN_SKILLS_MAP: Record<AssessmentDomain, readonly AssessmentSkill[]> = {
  vocabulary: ['core_vocabulary', 'contextual_meaning', 'word_form_usage'],
  grammar: [
    'basic_sentence_structure',
    'verb_tense_agreement',
    'questions_and_negatives',
    'modifiers_and_relations',
    'complex_structures',
  ],
  reading: [
    'explicit_information',
    'main_idea',
    'vocabulary_in_context',
    'inference',
    'information_integration',
  ],
} as const

export const SKILL_TO_DOMAIN_MAP: Record<AssessmentSkill, AssessmentDomain> = {
  core_vocabulary: 'vocabulary',
  contextual_meaning: 'vocabulary',
  word_form_usage: 'vocabulary',
  basic_sentence_structure: 'grammar',
  verb_tense_agreement: 'grammar',
  questions_and_negatives: 'grammar',
  modifiers_and_relations: 'grammar',
  complex_structures: 'grammar',
  explicit_information: 'reading',
  main_idea: 'reading',
  vocabulary_in_context: 'reading',
  inference: 'reading',
  information_integration: 'reading',
} as const

// Friendly names in Traditional Chinese (Taiwan junior high curriculum context)
export const SKILL_LABELS: Record<AssessmentSkill, string> = {
  core_vocabulary: '核心字彙',
  contextual_meaning: '語境字義',
  word_form_usage: '詞形變化與搭配',
  basic_sentence_structure: '基本句型結構',
  verb_tense_agreement: '動詞時態與主謂一致',
  questions_and_negatives: '疑問與否定句構',
  modifiers_and_relations: '修飾與關係連接',
  complex_structures: '複合句與從屬子句',
  explicit_information: '篇章明示細節',
  main_idea: '主旨大意與段落核心',
  vocabulary_in_context: '語境推詞推義',
  inference: '邏輯推論與作者意圖',
  information_integration: '跨句段資訊整合',
} as const

export const DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  vocabulary: '字彙',
  grammar: '文法',
  reading: '閱讀理解',
} as const

// 2. Difficulty (1 to 5)
export const ASSESSMENT_DIFFICULTIES = [1, 2, 3, 4, 5] as const
export type AssessmentDifficulty = (typeof ASSESSMENT_DIFFICULTIES)[number]

// 3. Response Type
export const ASSESSMENT_RESPONSE_TYPES = ['single_choice', 'short_answer'] as const
export type AssessmentResponseType = (typeof ASSESSMENT_RESPONSE_TYPES)[number]

// 4. Session Lifecycle
export const ASSESSMENT_SESSION_STATUSES = ['in_progress', 'completed', 'abandoned'] as const
export type AssessmentSessionStatus = (typeof ASSESSMENT_SESSION_STATUSES)[number]

// 5. Response Outcomes
export const ASSESSMENT_RESPONSE_OUTCOMES = ['correct', 'incorrect', 'skipped'] as const
export type AssessmentResponseOutcome = (typeof ASSESSMENT_RESPONSE_OUTCOMES)[number]

// 6. Skill Results & Confidence
export const SKILL_RESULTS = ['needs_support', 'developing', 'secure'] as const
export type SkillResult = (typeof SKILL_RESULTS)[number]

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export const SKILL_RESULT_LABELS: Record<SkillResult, string> = {
  needs_support: '待加強',
  developing: '發展中',
  secure: '精熟穩固',
} as const

// 7. Grade Bands & Item Status
export const GRADE_BANDS = ['grade_7', 'grade_8', 'grade_9', 'all'] as const
export type AssessmentGradeBand = (typeof GRADE_BANDS)[number]

export const ITEM_STATUSES = ['draft', 'review', 'active', 'archived'] as const
export type AssessmentItemStatus = (typeof ITEM_STATUSES)[number]

// 8. Session Sizing Constants
export const TARGET_SESSION_ITEMS = 18
export const SOFT_MAX_SESSION_ITEMS = 22
export const HARD_MAX_SESSION_ITEMS = 25
export const MIN_SESSION_ITEMS = 10

// 9. Zod Schemas & Interfaces

export const AssessmentChoiceSchema = z.object({
  id: z.string().min(1).max(10),
  text: z.string().min(1).max(500),
})
export type AssessmentChoice = z.infer<typeof AssessmentChoiceSchema>

export const AssessmentPassageSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  wordCount: z.number().int().positive(),
  gradeBand: z.enum(['grade_7', 'grade_8', 'grade_9', 'mixed']),
  status: z.enum(ITEM_STATUSES).default('active'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type AssessmentPassage = z.infer<typeof AssessmentPassageSchema>

export const AssessmentItemSchema = z.object({
  id: z.string().min(1).max(80),
  domain: z.enum(ASSESSMENT_DOMAINS),
  skill: z.enum(ASSESSMENT_SKILLS),
  difficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  gradeBand: z.enum(GRADE_BANDS),
  responseType: z.enum(ASSESSMENT_RESPONSE_TYPES),
  passageId: z.string().nullable().optional(),
  prompt: z.string().min(1).max(2000),
  choices: z.array(AssessmentChoiceSchema).nullable().optional(),
  correctChoice: z.string().min(1).max(10).nullable().optional(),
  acceptedAnswers: z.array(z.string().min(1).max(200)).nullable().optional(),
  analysisTags: z.array(z.string()).default([]),
  status: z.enum(ITEM_STATUSES).default('active'),
  version: z.number().int().positive().default(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).refine(
  (item) => {
    if (item.responseType === 'single_choice') {
      return (
        Array.isArray(item.choices) &&
        item.choices.length >= 2 &&
        typeof item.correctChoice === 'string' &&
        item.choices.some((c) => c.id === item.correctChoice)
      )
    }
    if (item.responseType === 'short_answer') {
      return Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length >= 1
    }
    return false
  },
  {
    message:
      'single_choice requires valid choices and matching correctChoice; short_answer requires acceptedAnswers',
  }
).refine(
  (item) => SKILL_TO_DOMAIN_MAP[item.skill] === item.domain,
  {
    message: 'domain does not match skill',
  }
)
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>

// Client rendering projection: strictly excludes correctChoice, acceptedAnswers, difficulty, tags, and internals
export const AssessmentClientItemSchema = z.object({
  id: z.string().min(1).max(80),
  responseType: z.enum(ASSESSMENT_RESPONSE_TYPES),
  passageId: z.string().nullable().optional(),
  prompt: z.string().min(1).max(2000),
  choices: z.array(AssessmentChoiceSchema).nullable().optional(),
})
export type AssessmentClientItem = z.infer<typeof AssessmentClientItemSchema>

export const AssessmentResponseSchema = z.object({
  id: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  childId: z.string().uuid(),
  itemId: z.string().min(1),
  sequenceNumber: z.number().int().positive(),
  responseType: z.enum(ASSESSMENT_RESPONSE_TYPES),
  rawAnswer: z.string().nullable(),
  isSkipped: z.boolean().default(false),
  outcome: z.enum(ASSESSMENT_RESPONSE_OUTCOMES),
  activeResponseMs: z.number().int().nonnegative().nullable().optional(),
  createdAt: z.string().optional(),
})
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>

export const SkillEvaluationSchema = z.object({
  skill: z.enum(ASSESSMENT_SKILLS),
  domain: z.enum(ASSESSMENT_DOMAINS),
  result: z.enum(SKILL_RESULTS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  itemsAttempted: z.number().int().nonnegative(),
  itemsCorrect: z.number().int().nonnegative(),
  estimatedDifficulty: z.number().min(1).max(5),
  notes: z.string().optional(),
})
export type SkillEvaluation = z.infer<typeof SkillEvaluationSchema>

export const DomainSummarySchema = z.object({
  domain: z.enum(ASSESSMENT_DOMAINS),
  result: z.enum(SKILL_RESULTS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  summaryZh: z.string(),
})
export type DomainSummary = z.infer<typeof DomainSummarySchema>

export const AssessmentSessionResultSchema = z.object({
  sessionId: z.string().uuid(),
  childId: z.string().uuid(),
  completedAt: z.string(),
  totalItems: z.number().int().positive(),
  correctCount: z.number().int().nonnegative(),
  skipCount: z.number().int().nonnegative(),
  skillEvaluations: z.record(z.enum(ASSESSMENT_SKILLS), SkillEvaluationSchema),
  domainSummaries: z.record(z.enum(ASSESSMENT_DOMAINS), DomainSummarySchema),
  overallNarrativeZh: z.string(),
})
export type AssessmentSessionResult = z.infer<typeof AssessmentSessionResultSchema>

export const ASSESSMENT_PROJECTION_VERSION = 'assessment-projection-v1' as const
export type AssessmentProjectionVersion = typeof ASSESSMENT_PROJECTION_VERSION

export const CompactAssessmentSkillStateSchema = z.object({
  level: z.enum(SKILL_RESULTS),
  confidence: z.enum(CONFIDENCE_LEVELS),
})
export type CompactAssessmentSkillState = z.infer<typeof CompactAssessmentSkillStateSchema>

export const CompactAssessmentDomainStateSchema = z.object({
  level: z.enum(SKILL_RESULTS),
  confidence: z.enum(CONFIDENCE_LEVELS),
})
export type CompactAssessmentDomainState = z.infer<typeof CompactAssessmentDomainStateSchema>

export const ChildAssessmentStateSchema = z.object({
  childId: z.string().uuid(),
  lastSessionId: z.string().uuid(),
  status: z.literal('completed'),
  skillResults: z.record(z.enum(ASSESSMENT_SKILLS), CompactAssessmentSkillStateSchema),
  domainSummaries: z.record(z.enum(ASSESSMENT_DOMAINS), CompactAssessmentDomainStateSchema),
  assessedAt: z.string(),
  projectionVersion: z.literal(ASSESSMENT_PROJECTION_VERSION),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type ChildAssessmentState = z.infer<typeof ChildAssessmentStateSchema>

export const ASSESSMENT_RETAKE_COOLDOWN_DAYS = 90

