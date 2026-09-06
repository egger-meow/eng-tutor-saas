import {
  adaptAssessmentIntent,
  type CapRetrievalIntent,
  type RawAssessmentPlan,
  type FormatPlanningCapsule,
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
 */
export function buildPacketPlanningPrompt(
  context: Record<string, unknown>,
  grounding: string,
): string {
  const profile = (context.profile ?? {}) as Record<string, unknown>
  const preferences = (context.preferences ?? {}) as Record<string, unknown>
  const lifetime = (context.lifetimeLearningMemory ?? {}) as Record<string, unknown>
  const targetedEvidence = Array.isArray(context.targetedOlderEvidence) ? context.targetedOlderEvidence : []
  const diversityCapsule = (context.diversityCapsule ?? {}) as Record<string, unknown>
  const formatCapsule = (diversityCapsule.formatPlanningCapsule ?? {}) as FormatPlanningCapsule

  const planningContext = {
    profile: {
      grade: profile.grade,
      grade_level: profile.grade_level,
      gradeStage: profile.gradeStage,
      weekly_minutes: profile.weekly_minutes,
    },
    preferences: {
      topics: preferences.topics,
      interests: preferences.interests,
    },
    lifetimeLearningTargets: {
      dueVocabulary: (lifetime.vocabulary as any)?.dueTargetIds ?? [],
      weakVocabulary: (lifetime.vocabulary as any)?.verifiedWeakTargetIds ?? [],
      dueGrammar: (lifetime.grammar as any)?.dueTargetIds ?? [],
      weakGrammar: (lifetime.grammar as any)?.verifiedWeakTargetIds ?? [],
    },
    targetedOlderEvidence: targetedEvidence.slice(0, 10),
    formatPlanningGuidance: {
      recentFormatUse: formatCapsule.recentFormatUse ?? {},
      avoidMechanicalRepeat: formatCapsule.avoidMechanicalRepeat ?? [],
      availableRecommendedFormats: formatCapsule.availableButRecentlyUnused ?? [],
    },
  }

  return [
    'You are the Private Packet Planner for 紙屬英文 (Schema 2.5.0 / Prompt 2.13.1).',
    'Your task is to plan this week\'s personalized English packet based on the learner\'s memory and public research grounding.',
    'Do not write full student lesson prose or parent answers yet. Output only a structured JSON packet plan.',
    '',
    '## 1. Learner Context & Pedagogical Constraints',
    JSON.stringify(planningContext, null, 2),
    '',
    '## 2. Public Research Grounding',
    grounding,
    '',
    '## 3. Planning Requirements',
    '1. Selected Angle: Choose a specific, age-appropriate angle connecting the learner\'s interests with curriculum goals.',
    '2. Evidence Rationale: Explain why the factual evidence supports this angle and serves the learning target.',
    '3. Selected Learning Targets: Pick 3–5 vocabulary words and 1–2 grammar targets from due/weak targets or the passage burden.',
    '4. Assessment Items: Plan at least 3 distinct assessment items (e.g. reading comprehension, guided practice, homework).',
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

  const targets = (obj.selectedLearningTargets ?? {}) as Record<string, unknown>
  const vocab = Array.isArray(targets.vocabulary) ? targets.vocabulary.map((v) => String(v).trim()).filter(Boolean) : []
  const grammar = Array.isArray(targets.grammar) ? targets.grammar.map((g) => String(g).trim()).filter(Boolean) : []

  const rawPlans = Array.isArray(obj.assessmentPlans) ? obj.assessmentPlans : []
  if (rawPlans.length < 1) {
    throw new Error('PACKET_PLAN_INVALID: assessmentPlans must contain at least 1 item')
  }

  const profile = (context.profile ?? {}) as Record<string, unknown>
  const preferences = (context.preferences ?? {}) as Record<string, unknown>

  const assessmentPlans: PacketPlanItem[] = rawPlans.map((rawItem, idx) => {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      throw new Error(`PACKET_PLAN_INVALID: assessmentPlans[${idx}] is not an object`)
    }
    const item = rawItem as RawAssessmentPlan
    const adapted = adaptAssessmentIntent(item, profile, preferences)

    const skill = adapted.primarySkill || 'local_inference'
    const itemId = String(item.itemId || `q_${idx + 1}`)

    return {
      itemId,
      targetSkill: skill,
      primarySkill: skill,
      targetLanguageDifficulty: adapted.targetLanguageDifficulty || 'A2_basic',
      targetCognitiveDepth: adapted.targetCognitiveDepth || 'D2_single_step_inference',
      genre: adapted.genre || 'article',
      keywords: adapted.keywords,
      learningFunction: typeof item.learningFunction === 'string' ? item.learningFunction : 'comprehension',
      reasoningOperation: typeof item.reasoningOperation === 'string' ? item.reasoningOperation : 'inference',
      responseFormat: typeof item.responseFormat === 'string' ? item.responseFormat : 'written:lines',
      formatRationale: typeof item.formatRationale === 'string' ? item.formatRationale : 'Appropriate response format for task',
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

/**
 * Creates a deterministic default packet plan when planner is bootstrapped or in test mode.
 */
export function createDefaultPacketPlan(
  context: Record<string, unknown>,
  grounding?: string,
): PacketPlan {
  const profile = (context.profile ?? {}) as Record<string, unknown>
  const preferences = (context.preferences ?? {}) as Record<string, unknown>
  const lifetime = (context.lifetimeLearningMemory ?? {}) as Record<string, unknown>
  const diversity = (context.diversityCapsule ?? {}) as Record<string, unknown>
  const formatCapsule = (diversity.formatPlanningCapsule ?? {}) as FormatPlanningCapsule

  const targetDifficulty = adaptAssessmentIntent({}, profile).targetLanguageDifficulty || 'A2_basic'

  const dueVocab = (lifetime.vocabulary as any)?.dueTargetIds ?? []
  const weakVocab = (lifetime.vocabulary as any)?.verifiedWeakTargetIds ?? []
  const dueGrammar = (lifetime.grammar as any)?.dueTargetIds ?? []
  const weakGrammar = (lifetime.grammar as any)?.verifiedWeakTargetIds ?? []

  const selectedVocab = [...dueVocab, ...weakVocab].slice(0, 4)
  if (selectedVocab.length === 0) selectedVocab.push('journey', 'discover', 'challenge')

  const selectedGrammar = [...dueGrammar, ...weakGrammar].slice(0, 2)
  if (selectedGrammar.length === 0) selectedGrammar.push('past_simple_vs_continuous')

  const recommended = formatCapsule.availableButRecentlyUnused ?? [
    'sequence:horizontal',
    'table:grid',
    'table:organizer',
    'written:lines',
  ]

  const format1 = recommended[0] || 'table:organizer'
  const format2 = recommended[1] || 'sequence:horizontal'

  const assessmentPlans: PacketPlanItem[] = [
    {
      itemId: 'q1_reading_clues',
      targetSkill: 'local_inference',
      primarySkill: 'local_inference',
      targetLanguageDifficulty: targetDifficulty,
      targetCognitiveDepth: 'D2_single_step_inference',
      genre: 'article',
      learningFunction: 'evidence_extraction',
      reasoningOperation: 'inference',
      responseFormat: format1,
      formatRationale: `Selected ${format1} to systematically organize textual clues and inferences`,
      scaffoldLevel: 'supported',
    },
    {
      itemId: 'q2_reading_synthesis',
      targetSkill: 'information_integration',
      primarySkill: 'information_integration',
      targetLanguageDifficulty: targetDifficulty,
      targetCognitiveDepth: 'D3_multi_step_synthesis',
      genre: 'article',
      learningFunction: 'chronology_and_turning_points',
      reasoningOperation: 'sequence',
      responseFormat: format2,
      formatRationale: `Selected ${format2} to track developmental milestones or turning points`,
      scaffoldLevel: 'on-level',
    },
    {
      itemId: 'q3_practice_application',
      targetSkill: 'detail',
      primarySkill: 'detail',
      targetLanguageDifficulty: targetDifficulty,
      targetCognitiveDepth: 'D2_single_step_inference',
      genre: 'article',
      learningFunction: 'application_and_reflection',
      reasoningOperation: 'application',
      responseFormat: 'written:lines',
      formatRationale: 'Structured lines provide student space for personal expression and synthesis',
      scaffoldLevel: 'on-level',
    },
  ]

  return {
    selectedAngle: 'Evidence-based exploration of learner interest domain with focused skill progression',
    evidenceRationale: 'Grounding facts provide authentic context for target vocabulary and reading comprehension',
    selectedLearningTargets: {
      vocabulary: selectedVocab,
      grammar: selectedGrammar,
    },
    assessmentPlans,
  }
}
