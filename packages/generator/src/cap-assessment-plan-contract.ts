export const CAP_ASSESSMENT_PLAN_BASE_KEYS = [
  'learningObjective',
  'primarySkill',
  'secondarySkills',
  'genre',
  'targetLanguageDifficulty',
  'targetCognitiveDepth',
  'evidenceMode',
  'evidenceSpan',
  'evidenceScope',
  'evidenceAnchors',
  'reasoningOperations',
  'distractorStrategies',
  'precedentRefs',
  'precedentMode',
  'intentionalRecall',
  'noPrecedentReason',
] as const

export const CAP_ASSESSMENT_PLAN_MODE_KEYS = {
  anchor: ['borrowedDesignPrinciples'],
  blend: ['synthesizedDesignPrinciples'],
  calibration: ['benchmarkQualities', 'noveltyRationale'],
} as const

export const CAP_ASSESSMENT_PLAN_FORBIDDEN_ALIASES = [
  'objective',
  'languageDifficulty',
  'cognitiveDepth',
  'isRecall',
] as const

export type CapPrecedentMode = keyof typeof CAP_ASSESSMENT_PLAN_MODE_KEYS

export type CapEvidenceScope =
  | 'primary_reading'
  | 'instruction'
  | 'prior_knowledge'
  | 'vocabulary_table'
  | 'standalone'

export interface CapEvidenceAnchor {
  location: string
  anchorText: string
  isExplicit?: boolean
}

export interface CapAssessmentIntent {
  learningObjective: string
  primarySkill: string
  secondarySkills: string[]
  genre: string
  targetLanguageDifficulty: string
  targetCognitiveDepth: string
  evidenceMode: string
  evidenceSpan: string
  evidenceScope: CapEvidenceScope
  evidenceAnchors: CapEvidenceAnchor[]
  reasoningOperations: string[]
  distractorStrategies: string[]
}

export interface CapAssessmentPlan extends CapAssessmentIntent {
  precedentRefs: string[]
  precedentMode: CapPrecedentMode
  intentionalRecall: boolean
  noPrecedentReason: string | null
  borrowedDesignPrinciples?: string[]
  synthesizedDesignPrinciples?: string[]
  benchmarkQualities?: string[]
  noveltyRationale?: string
}

export const CAP_ASSESSMENT_PLAN_CONTRACT = {
  contractVersion: '1.1.0',
  additionalProperties: false,
  required: CAP_ASSESSMENT_PLAN_BASE_KEYS,
  forbiddenAliases: CAP_ASSESSMENT_PLAN_FORBIDDEN_ALIASES,
  modes: CAP_ASSESSMENT_PLAN_MODE_KEYS,
  serializedExamples: {
    anchor: {
      learningObjective: 'Infer a result by combining two clues.',
      primarySkill: 'local_inference',
      secondarySkills: ['information_integration'],
      genre: 'article_informational',
      targetLanguageDifficulty: 'A2_basic',
      targetCognitiveDepth: 'D2_single_step_inference',
      evidenceMode: 'text_only',
      evidenceSpan: 'cross_sentence_local',
      evidenceScope: 'primary_reading',
      evidenceAnchors: [
        {
          location: 'studentLesson.reading.blocks.0.text',
          anchorText: 'Mia saw wet streets.',
          isExplicit: true,
        },
      ],
      reasoningOperations: ['connect two clues'],
      distractorStrategies: ['partial_truth'],
      precedentRefs: ['cap-0123456789ab'],
      precedentMode: 'anchor',
      intentionalRecall: false,
      noPrecedentReason: null,
      borrowedDesignPrinciples: ['make both clues necessary'],
    },
    blend: {
      learningObjective: 'Compare evidence before choosing a claim.',
      primarySkill: 'information_integration',
      secondarySkills: ['local_inference'],
      genre: 'multi_document_comparison',
      targetLanguageDifficulty: 'A2_basic',
      targetCognitiveDepth: 'D3_multi_step_synthesis',
      evidenceMode: 'multi_document',
      evidenceSpan: 'multi_paragraph_global',
      evidenceScope: 'primary_reading',
      evidenceAnchors: [
        {
          location: 'studentLesson.reading.blocks.0.text',
          anchorText: 'The first report showed high numbers.',
          isExplicit: true,
        },
        {
          location: 'studentLesson.reading.blocks.1.text',
          anchorText: 'The second report showed lower numbers.',
          isExplicit: true,
        },
      ],
      reasoningOperations: ['compare claims across sources'],
      distractorStrategies: ['unsupported_world_knowledge'],
      precedentRefs: ['cap-0123456789ab'],
      precedentMode: 'blend',
      intentionalRecall: false,
      noPrecedentReason: null,
      synthesizedDesignPrinciples: ['combine comparison with causal elimination'],
    },
    calibration: {
      learningObjective: 'Evaluate which explanation best fits all evidence.',
      primarySkill: 'purpose_speaker_intent',
      secondarySkills: ['information_integration'],
      genre: 'dialogue',
      targetLanguageDifficulty: 'A2_basic',
      targetCognitiveDepth: 'D3_multi_step_synthesis',
      evidenceMode: 'text_only',
      evidenceSpan: 'multi_paragraph_global',
      evidenceScope: 'primary_reading',
      evidenceAnchors: [
        {
          location: 'studentLesson.reading.blocks.0.text',
          anchorText: 'Jay said the battery was hot.',
          isExplicit: true,
        },
      ],
      reasoningOperations: ['test each explanation against all evidence'],
      distractorStrategies: ['partial_truth'],
      precedentRefs: ['cap-0123456789ab'],
      precedentMode: 'calibration',
      intentionalRecall: false,
      noPrecedentReason: null,
      benchmarkQualities: ['requires evidence integration'],
      noveltyRationale: 'Uses a new evidence arrangement while preserving the reasoning floor.',
    },
  },
} as const

export function validateCapAssessmentPlan(value: unknown): { valid: boolean; errors: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: ['plan must be a JSON object'] }
  }

  const plan = value as Record<string, unknown>
  const mode = plan.precedentMode
  const modeKeys = typeof mode === 'string' && mode in CAP_ASSESSMENT_PLAN_MODE_KEYS
    ? CAP_ASSESSMENT_PLAN_MODE_KEYS[mode as CapPrecedentMode]
    : []
  const allowed = new Set<string>([...CAP_ASSESSMENT_PLAN_BASE_KEYS, ...modeKeys])
  const errors: string[] = []

  for (const key of CAP_ASSESSMENT_PLAN_BASE_KEYS) {
    if (!(key in plan)) errors.push(`missing canonical key: ${key}`)
  }
  for (const key of Object.keys(plan)) {
    if (!allowed.has(key)) errors.push(`unknown CAP-plan key: ${key}`)
  }
  if (!modeKeys.length) errors.push('precedentMode must be anchor, blend, or calibration')

  if (plan.evidenceScope !== undefined && typeof plan.evidenceScope !== 'string') {
    errors.push('evidenceScope must be a string')
  }
  if (plan.evidenceAnchors !== undefined && !Array.isArray(plan.evidenceAnchors)) {
    errors.push('evidenceAnchors must be an array')
  }

  return { valid: errors.length === 0, errors }
}

export function serializedCapAssessmentPlanContract(): string {
  return JSON.stringify(CAP_ASSESSMENT_PLAN_CONTRACT)
}
