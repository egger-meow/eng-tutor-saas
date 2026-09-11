import { z } from 'zod'
import { getSupabaseClient } from './supabase'

// 1. Domain and Skill Enums & Mappings
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

export const SKILLS_BY_DOMAIN: Record<AssessmentDomain, readonly AssessmentSkill[]> = {
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
}

// User-facing Traditional Chinese labels per Section 10
export const DOMAIN_DISPLAY_LABELS: Record<AssessmentDomain, string> = {
  vocabulary: '單字',
  grammar: '文法',
  reading: '閱讀',
}

export const SKILL_DISPLAY_LABELS: Record<AssessmentSkill, string> = {
  core_vocabulary: '核心單字',
  contextual_meaning: '情境字義',
  word_form_usage: '詞性與用法',
  basic_sentence_structure: '基本句型',
  verb_tense_agreement: '時態與主詞動詞一致',
  questions_and_negatives: '問句與否定',
  modifiers_and_relations: '修飾語與關係表達',
  complex_structures: '複合句型',
  explicit_information: '明確資訊擷取',
  main_idea: '主旨理解',
  vocabulary_in_context: '上下文字義',
  inference: '推論理解',
  information_integration: '資訊整合',
}

export const RESULT_DISPLAY_LABELS: Record<'needs_support' | 'developing' | 'secure', string> = {
  needs_support: '需要加強',
  developing: '正在建立',
  secure: '掌握穩定',
}

export const LOW_CONFIDENCE_LABEL = '目前資料較少'

export const ASSESSMENT_RETAKE_COOLDOWN_DAYS = 90

// 2. Client Zod Schemas
export const AssessmentOverviewSchema = z.object({
  childId: z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  sessionId: z.string().uuid().nullable(),
  itemsCompleted: z.number().int().nonnegative(),
  targetItemCount: z.number().int().positive(),
  completedAt: z.string().nullable(),
  retakeEligible: z.boolean().default(false),
  daysSinceCompleted: z.number().int().nullable().default(null),
  cooldownDays: z.number().int().default(90),
})
export type AssessmentOverview = z.infer<typeof AssessmentOverviewSchema>

export const AssessmentChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
})
export type AssessmentChoice = z.infer<typeof AssessmentChoiceSchema>

export const AssessmentPassageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
})
export type AssessmentPassage = z.infer<typeof AssessmentPassageSchema>

export const AssessmentClientItemSchema = z.object({
  id: z.string().min(1),
  responseType: z.enum(['single_choice', 'short_answer']),
  prompt: z.string().min(1),
  choices: z.array(AssessmentChoiceSchema).nullable().optional(),
  passage: AssessmentPassageSchema.nullable().optional(),
})
export type AssessmentClientItem = z.infer<typeof AssessmentClientItemSchema>

export const AssessmentSessionStateSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['in_progress', 'completed']),
  itemsCompleted: z.number().int().nonnegative(),
  targetItemCount: z.number().int().positive(),
  currentItem: AssessmentClientItemSchema.nullable(),
})
export type AssessmentSessionState = z.infer<typeof AssessmentSessionStateSchema>

export const SkillEvaluationViewSchema = z.object({
  skill: z.string(),
  domain: z.string(),
  result: z.enum(['needs_support', 'developing', 'secure']),
  confidence: z.enum(['low', 'medium', 'high']),
})
export type SkillEvaluationView = z.infer<typeof SkillEvaluationViewSchema>

export const DomainSummaryViewSchema = z.object({
  domain: z.string(),
  result: z.enum(['needs_support', 'developing', 'secure']),
  confidence: z.enum(['low', 'medium', 'high']),
  summaryZh: z.string(),
})
export type DomainSummaryView = z.infer<typeof DomainSummaryViewSchema>

export const SanitizedAssessmentResultSchema = z.object({
  sessionId: z.string().uuid(),
  childId: z.string().uuid(),
  completedAt: z.string(),
  totalItems: z.number().int().positive(),
  overallNarrativeZh: z.string(),
  domainSummaries: z.record(z.string(), DomainSummaryViewSchema),
  skillEvaluations: z.record(z.string(), SkillEvaluationViewSchema),
})
export type SanitizedAssessmentResult = z.infer<typeof SanitizedAssessmentResultSchema>

// 3. Client RPC Functions
export async function getChildAssessmentOverview(childId: string): Promise<AssessmentOverview> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_child_assessment_overview', {
    p_child_id: childId,
  })

  if (error) {
    throw new Error(`無法取得評估狀態: ${error.message}`)
  }

  return AssessmentOverviewSchema.parse(data)
}

export async function startOrResumeAssessmentSession(childId: string): Promise<AssessmentSessionState> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('start_or_resume_assessment_session', {
    p_child_id: childId,
  })

  if (error) {
    throw new Error(`無法開始或繼續評估: ${error.message}`)
  }

  return AssessmentSessionStateSchema.parse(data)
}

export async function startAssessmentRetake(childId: string): Promise<AssessmentSessionState> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('start_assessment_retake', {
    p_child_id: childId,
  })

  if (error) {
    throw new Error(`無法開始重新診斷: ${error.message}`)
  }

  return AssessmentSessionStateSchema.parse(data)
}

export async function submitAssessmentResponse(
  sessionId: string,
  itemId: string,
  answer: {
    rawAnswer?: string | null
    isSkip?: boolean
    activeResponseMs?: number | null
  }
): Promise<AssessmentSessionState> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('submit_assessment_response', {
    p_session_id: sessionId,
    p_item_id: itemId,
    p_raw_answer: answer.rawAnswer ?? null,
    p_is_skip: answer.isSkip ?? false,
    p_active_response_ms: answer.activeResponseMs ?? null,
  })

  if (error) {
    throw new Error(`作答送出失敗: ${error.message}`)
  }

  return AssessmentSessionStateSchema.parse(data)
}

export async function getAssessmentSessionState(sessionId: string): Promise<AssessmentSessionState> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_assessment_session_state', {
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(`無法取得測驗狀態: ${error.message}`)
  }

  return AssessmentSessionStateSchema.parse(data)
}

export async function getAssessmentSessionResult(sessionId: string): Promise<SanitizedAssessmentResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_assessment_session_result', {
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(`無法取得評估結果: ${error.message}`)
  }

  return SanitizedAssessmentResultSchema.parse(data)
}

export async function getChildLatestAssessmentResult(childId: string): Promise<SanitizedAssessmentResult | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_child_latest_assessment_result', {
    p_child_id: childId,
  })

  if (error) {
    throw new Error(`無法取得最新評估結果: ${error.message}`)
  }

  if (!data) return null
  return SanitizedAssessmentResultSchema.parse(data)
}
