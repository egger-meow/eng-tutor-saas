import {
  ASSESSMENT_DOMAINS,
  ASSESSMENT_PROJECTION_VERSION,
  ASSESSMENT_SKILLS,
  CONFIDENCE_LEVELS,
  SKILL_RESULTS,
  type AssessmentDomain,
  type AssessmentSkill,
  type ChildAssessmentState,
  ChildAssessmentStateSchema,
  type CompactAssessmentDomainState,
  type CompactAssessmentSkillState,
} from '../contracts.js'

export interface ProjectAssessmentSessionParams {
  childId: string
  sessionId: string
  assessedAt: string
  finalResult: unknown
}

export function projectFrozenResultToCompactState(
  params: ProjectAssessmentSessionParams,
): ChildAssessmentState {
  const { childId, sessionId, assessedAt, finalResult } = params

  if (!childId || typeof childId !== 'string') {
    throw new Error('childId is required and must be a string')
  }

  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('sessionId is required and must be a string')
  }

  if (!assessedAt || typeof assessedAt !== 'string') {
    throw new Error('assessedAt is required and must be a string')
  }

  if (!finalResult || typeof finalResult !== 'object' || Array.isArray(finalResult)) {
    throw new Error('finalResult must be a non-null object')
  }

  const raw = finalResult as Record<string, any>

  if (raw.childId !== childId) {
    throw new Error(`Child ID mismatch: expected ${childId}, got ${raw.childId}`)
  }

  if (!raw.skillEvaluations || typeof raw.skillEvaluations !== 'object' || Array.isArray(raw.skillEvaluations)) {
    throw new Error('finalResult missing valid skillEvaluations object')
  }

  if (!raw.domainSummaries || typeof raw.domainSummaries !== 'object' || Array.isArray(raw.domainSummaries)) {
    throw new Error('finalResult missing valid domainSummaries object')
  }

  const validSkillsSet = new Set<string>(ASSESSMENT_SKILLS)
  const validDomainsSet = new Set<string>(ASSESSMENT_DOMAINS)
  const validResultsSet = new Set<string>(SKILL_RESULTS)
  const validConfidenceSet = new Set<string>(CONFIDENCE_LEVELS)

  const skillResults: Partial<Record<AssessmentSkill, CompactAssessmentSkillState>> = {}

  for (const [key, value] of Object.entries(raw.skillEvaluations)) {
    if (!validSkillsSet.has(key)) {
      throw new Error(`Unknown skill evaluation key: ${key}`)
    }
    if (!value || typeof value !== 'object') {
      throw new Error(`Skill evaluation for ${key} must be an object`)
    }
    const valObj = value as Record<string, any>
    const level = valObj.result
    const confidence = valObj.confidence

    if (!validResultsSet.has(level)) {
      throw new Error(`Invalid skill result level "${level}" for skill "${key}"`)
    }
    if (!validConfidenceSet.has(confidence)) {
      throw new Error(`Invalid skill confidence "${confidence}" for skill "${key}"`)
    }

    skillResults[key as AssessmentSkill] = {
      level,
      confidence,
    }
  }

  const domainSummaries: Partial<Record<AssessmentDomain, CompactAssessmentDomainState>> = {}

  for (const [key, value] of Object.entries(raw.domainSummaries)) {
    if (!validDomainsSet.has(key)) {
      throw new Error(`Unknown domain summary key: ${key}`)
    }
    if (!value || typeof value !== 'object') {
      throw new Error(`Domain summary for ${key} must be an object`)
    }
    const valObj = value as Record<string, any>
    const level = valObj.result
    const confidence = valObj.confidence

    if (!validResultsSet.has(level)) {
      throw new Error(`Invalid domain result level "${level}" for domain "${key}"`)
    }
    if (!validConfidenceSet.has(confidence)) {
      throw new Error(`Invalid domain confidence "${confidence}" for domain "${key}"`)
    }

    domainSummaries[key as AssessmentDomain] = {
      level,
      confidence,
    }
  }

  const projected = {
    childId,
    lastSessionId: sessionId,
    status: 'completed' as const,
    skillResults,
    domainSummaries,
    assessedAt,
    projectionVersion: ASSESSMENT_PROJECTION_VERSION,
  }

  return ChildAssessmentStateSchema.parse(projected)
}
