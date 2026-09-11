import { claimAuthoringContract } from './authoring-claim-contract.js'
import {
  adaptAssessmentIntent,
  type RawAssessmentPlan,
  type FormatPlanningCapsule,
  buildFormatPlanningCapsule,
  resolveLearnerEvidence,
} from '@paper-english/generator'

export interface PacketPlanItem {
  itemId: string
  targetSkill: string
  primarySkill: string
  targetLanguageDifficulty: string
  targetCognitiveDepth: string
  genre?: string
  keywords?: string[]
  learningFunction: string
  reasoningOperation: string
  responseFormat: string
  formatRationale: string
  scaffoldLevel: 'supported' | 'on-level' | 'stretch'
  intentionalRecall?: boolean
  isRetrievalExempt?: boolean
}

export interface PacketPlan {
  selectedAngle: string
  evidenceRationale: string
  selectedLearningTargets: {
    vocabulary: string[]
    grammar: string[]
  }
  assessmentPlans: PacketPlanItem[]
}

/**
 * Builds the private packet planning prompt combining:
 * 1. Learner profile, preferences, and demonstrated memory
 * 2. Retrieved targeted older evidence (if any)
 * 3. Recent format memory and FormatPlanningCapsule recommendations
 * 4. Public research grounding propositions and sources
 * 5. Optional repair diagnostic if a previous planning attempt failed
 */
export function buildPacketPlanningPrompt(
  context: Record<string, unknown>,
  grounding: string,
  previousPlanOutput?: string,
  repairIssue?: string,
): string {
  const contract = claimAuthoringContract(context)
  const profile = (context.profile ?? {}) as Record<string, unknown>
  const child = (context.child ?? {}) as Record<string, unknown>
  const preferences = (context.preferences ?? child.preferences ?? profile.preferences ?? {}) as Record<string, unknown>
  const lifetime = (context.lifetimeLearningMemory ?? {}) as Record<string, unknown>
  const targetedEvidence = Array.isArray(context.targetedOlderEvidence) ? context.targetedOlderEvidence : []
  let diversityCapsule = (context.diversityCapsule ?? {}) as Record<string, unknown>
  let formatCapsule = diversityCapsule.formatPlanningCapsule as FormatPlanningCapsule | undefined
  if (!formatCapsule || !Array.isArray(formatCapsule.availableButRecentlyUnused)) {
    const memory = (context.recentDeliveryMemory ?? diversityCapsule.recentDeliveryMemory ?? []) as any[]
    formatCapsule = buildFormatPlanningCapsule(memory, 4)
    diversityCapsule = { ...diversityCapsule, formatPlanningCapsule: formatCapsule }
  }

  const resolvedEvidence = resolveLearnerEvidence(context)

  const planningContext = {
    profile: {
      grade: profile.grade ?? child.grade,
      grade_level: profile.grade_level,
      gradeStage: profile.gradeStage ?? child.gradeStage,
      textbookVersion: child.textbookVersion,
      baseline_level: profile.baseline_level,
      reading_level: profile.reading_level,
      vocabulary_level: profile.vocabulary_level,
      grammar_level: profile.grammar_level,
      learning_goals: profile.learning_goals,
      parent_expectations: profile.parent_expectations,
      school_progress: profile.school_progress,
      weekly_minutes: profile.weekly_minutes,
    },
    preferences: {
      ...preferences,
    },
    learningState: context.learningState,
    recentFeedback: context.recentFeedback ?? context.feedback,
    capCoverageCapsule: context.capCoverageCapsule,
    communicationCapsule: context.communicationCapsule,
    vocabularyCapsule: context.vocabularyCapsule,
    grammarCapsule: context.grammarCapsule,
    assessmentEvidence: context.assessmentEvidence ?? null,
    resolvedEvidence,
    sourceMaterial: context.sourceMaterial,
    schoolProgress: context.schoolProgress,
    learningMemory: context.learningMemory,
    recentHistory: context.recentHistory,
    lifetimeLearningTargets: {
      dueVocabulary: (lifetime.vocabulary as any)?.dueTargetIds ?? [],
      weakVocabulary: (lifetime.vocabulary as any)?.verifiedWeakTargetIds ?? [],
      dueGrammar: (lifetime.grammar as any)?.dueTargetIds ?? [],
      weakGrammar: (lifetime.grammar as any)?.verifiedWeakTargetIds ?? [],
    },
    targetedOlderEvidence: targetedEvidence,
    formatPlanningGuidance: {
      recentFormatUse: formatCapsule.recentFormatUse ?? {},
      recentOpeningUse: formatCapsule.recentOpeningUse ?? {},
      recentInstructionUse: formatCapsule.recentInstructionUse ?? {},
      recentResponseItemCounts: formatCapsule.recentResponseItemCounts ?? {},
      responseCountCoverage: formatCapsule.responseCountCoverage,
      avoidMechanicalRepeat: formatCapsule.avoidMechanicalRepeat ?? [],
      availableRecommendedFormats: formatCapsule.availableButRecentlyUnused ?? [],
    },
  }

  return [
    `You are the Private Packet Planner for 紙屬英文 (Schema ${contract.schemaVersion} / Prompt ${contract.promptVersion}).`,
    'Your task is to plan this week\'s personalized English packet based on the learner\'s memory and public research grounding.',
    'Do not write full student lesson prose or parent answers yet. Output only a structured JSON packet plan.',
    '',
    '## 1. Learner Context & Pedagogical Constraints',
    JSON.stringify(planningContext),
    '',
    '## 2. Public Research Grounding',
    grounding,
    '',
    '## 3. Planning Requirements',
    '1. Selected Angle: Choose a specific, age-appropriate angle connecting the learner\'s interests with curriculum goals.',
    '2. Evidence Rationale: Explain why the factual evidence supports this angle and serves the learning target.',
    '3. Select meaningful vocabulary and grammar from demonstrated needs and passage burden within weekly_minutes; no fixed vocabulary quota. Explicit feedback takes precedence. Exposure alone is not weakness.',
    '4. Calibrate difficulty and scaffolding using `resolvedEvidence`: specific weekly learning evidence takes highest precedence; fresh high-confidence assessment evidence (<= 90 days) guides initial difficulty and scaffolding when weekly evidence is absent; aging assessment (91-180 days) is soft guidance; stale assessment (> 180 days) must not constrain ceilings or difficulty. Never let low-confidence diagnostic signals restrict learner growth. Provide "supported" scaffolding for skills marked needs_support, and "on-level" or "stretch" for secure skills.',
    '5. Plan all intended assessment items across reading, practice and homework with distinct IDs. Preserve cognitive depth when simplifying language.',
    'Choose exact artists, groups, works or characters and an evidence-supported origin, turning point, creative process, choice or mechanism when relevant. Do not flatten specific interests into generic useful knowledge.',
    'Formats are recommendations, not quotas. Timeline/process/cause chain -> sequence; comparison/classification/before-after -> table; evidence-inference -> organizer. Reuse when pedagogically useful. Preserve answer-cell IDs, Student/Parent answer coverage and truthful workload.',
    '   For each item, specify:',
    '   - itemId: stable identifier (e.g. "q1_reading", "q2_practice", "q3_homework")',
    '   - targetSkill / primarySkill: canonical CAP skill (e.g. "main_idea", "detail", "local_inference", "vocabulary_in_context", "author_purpose")',
    '   - targetLanguageDifficulty: "A1_elementary" | "A2_basic" | "B1_intermediate" | "B2_independent" (match learner level; do not default junior high to A1)',
    '   - targetCognitiveDepth: "D1_recall_locate" | "D2_single_step_inference" | "D3_multi_step_synthesis" | "D4_applied_evaluation"',
    '   - learningFunction: what the item accomplishes pedagogically',
    '   - reasoningOperation: thinking operation (e.g. "sequence", "comparison", "inference", "cause_effect", "classification")',
    '   - responseFormat: format choice (e.g. "sequence:horizontal", "table:grid", "table:organizer", "written:lines", "mcq:4-option")',
    '   - formatRationale: why this format best serves the task',
    '   - scaffoldLevel: "supported" | "on-level" | "stretch"',
    ...(repairIssue
      ? [
          '',
          '## 4. Plan Repair Required',
          `The previous packet plan attempt failed validation: ${repairIssue}`,
          'Please address this specific issue, revise the plan, and output ONLY valid JSON matching the schema.',
          ...(previousPlanOutput ? ['', 'Previous attempt output:', '```json', previousPlanOutput, '```'] : []),
        ]
      : []),
    '',
    'Return ONLY valid JSON shaped as:',
    '```json',
    '{',
    '  "selectedAngle": "string",',
    '  "evidenceRationale": "string",',
    '  "selectedLearningTargets": {',
    '    "vocabulary": ["string"],',
    '    "grammar": ["string"]',
    '  },',
    '  "assessmentPlans": [',
    '    {',
    '      "itemId": "string",',
    '      "targetSkill": "string",',
    '      "targetLanguageDifficulty": "A2_basic",',
    '      "targetCognitiveDepth": "D2_single_step_inference",',
    '      "genre": "article",',
    '      "learningFunction": "string",',
    '      "reasoningOperation": "string",',
    '      "responseFormat": "string",',
    '      "formatRationale": "string",',
    '      "scaffoldLevel": "on-level"',
    '    }',
    '  ]',
    '}',
    '```',
  ].join('\n')
}

/**
 * Validates and normalizes raw JSON output from the packet planner into a typed PacketPlan.
 */
export function validatePacketPlan(raw: unknown, context: Record<string, unknown>): PacketPlan {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('PACKET_PLAN_INVALID: Expected an object')
  }

  const obj = raw as Record<string, unknown>

  if (typeof obj.selectedAngle !== 'string' || obj.selectedAngle.trim().length === 0) {
    throw new Error('PACKET_PLAN_INVALID: selectedAngle is required')
  }

  if (typeof obj.evidenceRationale !== 'string' || obj.evidenceRationale.trim().length === 0) {
    throw new Error('PACKET_PLAN_INVALID: evidenceRationale is required')
  }

  const rawPlans = Array.isArray(obj.assessmentPlans) ? obj.assessmentPlans : []
  if (rawPlans.length < 1) {
    throw new Error('PACKET_PLAN_INVALID: assessmentPlans must contain at least 1 item')
  }

  const targets = (obj.selectedLearningTargets ?? {}) as Record<string, unknown>
  const strings = (value: unknown, field: string): string[] => {
    if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !v.trim())) {
      throw new Error(`PACKET_PLAN_INVALID: ${field} must be an array of non-empty strings`)
    }
    return [...new Set(value.map(v => v.trim()))]
  }
  const vocab = strings(targets.vocabulary, 'selectedLearningTargets.vocabulary')
  const grammar = strings(targets.grammar, 'selectedLearningTargets.grammar')

  const profile = (context.profile ?? {}) as Record<string, unknown>
  const preferences = (context.preferences ?? {}) as Record<string, unknown>

  const itemIds = new Set<string>()
  const assessmentPlans: PacketPlanItem[] = rawPlans.map((rawItem, idx) => {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      throw new Error(`PACKET_PLAN_INVALID: assessmentPlans[${idx}] is not an object`)
    }
    const item = rawItem as RawAssessmentPlan
    for (const field of ['itemId', 'learningFunction', 'reasoningOperation', 'responseFormat', 'formatRationale']) {
      if (typeof item[field] !== 'string' || !(item[field] as string).trim()) {
        throw new Error(`PACKET_PLAN_INVALID: assessmentPlans[${idx}].${field} is required`)
      }
    }
    for (const [field, value] of Object.entries({
      primarySkill: item.primarySkill ?? item.targetSkill,
      targetLanguageDifficulty: item.targetLanguageDifficulty ?? item.difficulty,
      targetCognitiveDepth: item.targetCognitiveDepth ?? item.cognitiveDepth,
    })) {
      if (typeof value !== 'string' || !value.trim()) throw new Error(`PACKET_PLAN_INVALID: assessmentPlans[${idx}].${field} is required`)
    }
    if (!['supported', 'on-level', 'stretch'].includes(item.scaffoldLevel ?? '')) {
      throw new Error(`PACKET_PLAN_INVALID: assessmentPlans[${idx}].scaffoldLevel is invalid`)
    }
    const adapted = adaptAssessmentIntent(item, profile, preferences)
    if (!['A1_elementary', 'A2_basic', 'B1_intermediate', 'B2_independent'].includes(adapted.targetLanguageDifficulty ?? '')
      || !['D1_recall_locate', 'D2_single_step_inference', 'D3_multi_step_synthesis', 'D4_applied_evaluation'].includes(adapted.targetCognitiveDepth ?? '')) {
      throw new Error(`PACKET_PLAN_INVALID: assessmentPlans[${idx}] has invalid difficulty or depth`)
    }

    const skill = adapted.primarySkill
    const itemId = item.itemId!.trim()
    if (itemIds.has(itemId)) throw new Error(`PACKET_PLAN_INVALID: duplicate itemId ${itemId}`)
    itemIds.add(itemId)

    return {
      itemId,
      targetSkill: skill,
      primarySkill: skill,
      targetLanguageDifficulty: adapted.targetLanguageDifficulty || 'A2_basic',
      targetCognitiveDepth: adapted.targetCognitiveDepth || 'D2_single_step_inference',
      genre: adapted.genre || 'article',
      keywords: adapted.keywords,
      learningFunction: item.learningFunction!.trim(),
      reasoningOperation: item.reasoningOperation!.trim(),
      responseFormat: item.responseFormat!.trim(),
      formatRationale: item.formatRationale!.trim(),
      scaffoldLevel: (['supported', 'on-level', 'stretch'].includes(item.scaffoldLevel as string) ? item.scaffoldLevel : 'on-level') as any,
      intentionalRecall: item.intentionalRecall === true,
      isRetrievalExempt: adapted.isRetrievalExempt,
    }
  })

  return {
    selectedAngle: obj.selectedAngle.trim(),
    evidenceRationale: obj.evidenceRationale.trim(),
    selectedLearningTargets: {
      vocabulary: vocab,
      grammar: grammar,
    },
    assessmentPlans,
  }
}

