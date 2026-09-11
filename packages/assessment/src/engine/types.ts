import type {
  AssessmentChoice,
  AssessmentDomain,
  AssessmentItem,
  AssessmentResponseType,
  AssessmentSessionResult,
  AssessmentSessionStatus,
  AssessmentSkill,
} from '../contracts.js'

export type ChildGradeStage = 'incoming_grade_7' | 'grade_7' | 'grade_8' | 'grade_9'

export type OnboardingLevel = 'needs-support' | 'developing' | 'on-level' | 'advanced'

export interface AdaptiveEngineConfig {
  targetItemCount: number
  softMaxItemCount: number
  hardMaxItemCount: number
  maxItemsPerSkill: number
}

export const DEFAULT_ENGINE_CONFIG: AdaptiveEngineConfig = {
  targetItemCount: 18,
  softMaxItemCount: 22,
  hardMaxItemCount: 25,
  maxItemsPerSkill: 4,
}

export const ENGINE_VERSION = 'v1.0.0'

export interface SkillEvidence {
  skill: AssessmentSkill
  domain: AssessmentDomain
  attempts: number
  correct: number
  incorrect: number
  skipped: number
  difficulties: number[]
  outcomes: ('correct' | 'incorrect' | 'skipped')[]
  itemIds: string[]
  hasContradiction: boolean
}

export interface ProvisionalEngineState {
  version: string
  phase: 'broad_probe' | 'targeted_confirmation' | 'completed'
  startingDifficulty: number
  broadProbeRemainingSkills: AssessmentSkill[]
  skillEvidence: Record<AssessmentSkill, SkillEvidence>
  currentPresentedItemId: string | null
  itemsCompleted: number
  itemHistory: string[]
  previousSessionItemIds?: string[]
}

export interface NextItemDecision {
  phase: 'broad_probe' | 'targeted_confirmation' | 'completed'
  isComplete: boolean
  nextItem: AssessmentItem | null
  targetSkill?: AssessmentSkill
  targetDifficulty?: number
  reason: string
  finalResult: AssessmentSessionResult | null
}

export interface ClientPresentedItem {
  id: string
  responseType: AssessmentResponseType
  prompt: string
  choices?: AssessmentChoice[] | null
  passage?: {
    id: string
    title: string
    content: string
  } | null
}

export interface ClientSessionState {
  sessionId: string
  status: AssessmentSessionStatus
  itemsCompleted: number
  targetItemCount: number
  currentItem: ClientPresentedItem | null
}
