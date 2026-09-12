import {
  ASSESSMENT_SKILLS,
  type AssessmentItem,
  type AssessmentSkill,
} from '../contracts.js'
import { computeStartingDifficulty } from './starting-difficulty.js'
import { selectCandidateItem } from './selector.js'
import {
  createInitialSkillEvidence,
  gradeAssessmentAnswer,
  recordSkillResponse,
} from './evaluator.js'
import { buildFinalSessionResult } from './final-result.js'
import {
  DEFAULT_ENGINE_CONFIG,
  ENGINE_VERSION,
  type AdaptiveEngineConfig,
  type ChildGradeStage,
  type NextItemDecision,
  type OnboardingLevel,
  type ProvisionalEngineState,
  type SkillEvidence,
} from './types.js'

/**
 * Ordered sequence for broad probe covering all 13 coarse diagnostic skills.
 * Probes Vocabulary (3) -> Grammar (5) -> Reading (5).
 */
export const DEFAULT_BROAD_PROBE_SKILLS: readonly AssessmentSkill[] = [
  'core_vocabulary',
  'contextual_meaning',
  'word_form_usage',
  'basic_sentence_structure',
  'verb_tense_agreement',
  'questions_and_negatives',
  'modifiers_and_relations',
  'complex_structures',
  'explicit_information',
  'main_idea',
  'vocabulary_in_context',
  'inference',
  'information_integration',
]

export interface InitSessionParams {
  sessionId: string
  childId: string
  gradeStage?: ChildGradeStage | string | null
  onboardingLevel?: OnboardingLevel | string | null
  availableItems: readonly AssessmentItem[]
  config?: Partial<AdaptiveEngineConfig>
  previousSessionItemIds?: readonly string[] | null
  randomizer?: () => number
}

export interface ProcessResponseParams {
  sessionId: string
  childId: string
  state: ProvisionalEngineState
  response: {
    itemId: string
    rawAnswer?: string | null
    isSkipped: boolean
    activeResponseMs?: number | null
  }
  availableItems: readonly AssessmentItem[]
  config?: Partial<AdaptiveEngineConfig>
  randomizer?: () => number
}

export class AdaptiveEngine {
  /**
   * Initializes an authoritative assessment session state and selects the first item.
   */
  static initSession(params: InitSessionParams): {
    state: ProvisionalEngineState
    decision: NextItemDecision
  } {
    const { sessionId, childId, gradeStage, onboardingLevel, availableItems, previousSessionItemIds } = params
    const randomizer = params.randomizer ?? params.config?.randomizer
    const startingDifficulty = computeStartingDifficulty(gradeStage, onboardingLevel)

    const broadProbeRemaining = [...DEFAULT_BROAD_PROBE_SKILLS]
    const initialEvidenceMap = {} as Record<AssessmentSkill, SkillEvidence>
    for (const s of ASSESSMENT_SKILLS) {
      initialEvidenceMap[s] = createInitialSkillEvidence(s)
    }

    let firstSkill: AssessmentSkill | undefined
    let firstItem: AssessmentItem | null = null
    while (broadProbeRemaining.length > 0 && !firstItem) {
      firstSkill = broadProbeRemaining.shift()!
      firstItem = selectCandidateItem(
        availableItems,
        firstSkill,
        startingDifficulty,
        new Set<string>(),
        null,
        previousSessionItemIds,
        randomizer
      )
    }

    if (!firstItem || !firstSkill) {
      throw new Error('No available items in question bank for broad probe.')
    }

    const state: ProvisionalEngineState = {
      version: ENGINE_VERSION,
      phase: 'broad_probe',
      startingDifficulty,
      broadProbeRemainingSkills: broadProbeRemaining,
      skillEvidence: initialEvidenceMap,
      currentPresentedItemId: firstItem.id,
      itemsCompleted: 0,
      itemHistory: [firstItem.id],
      previousSessionItemIds: previousSessionItemIds ? [...previousSessionItemIds] : undefined,
    }

    const decision: NextItemDecision = {
      phase: 'broad_probe',
      isComplete: false,
      nextItem: firstItem,
      targetSkill: firstSkill,
      targetDifficulty: startingDifficulty,
      reason: `Broad probe initialization: starting with skill "${firstSkill}" at baseline difficulty ${startingDifficulty}`,
      finalResult: null,
    }

    return { state, decision }
  }

  /**
   * Processes a submitted answer, grades it server-side, updates evidence,
   * checks stopping criteria, and selects the next item or produces the final session result.
   */
  static processResponse(params: ProcessResponseParams): {
    state: ProvisionalEngineState
    decision: NextItemDecision
  } {
    const { sessionId, childId, response, availableItems } = params
    const cfg: AdaptiveEngineConfig = {
      ...DEFAULT_ENGINE_CONFIG,
      ...params.config,
    }

    const randomizer = params.randomizer ?? cfg.randomizer
    const state: ProvisionalEngineState = {
      ...params.state,
      broadProbeRemainingSkills: [...params.state.broadProbeRemainingSkills],
      itemHistory: [...params.state.itemHistory],
      skillEvidence: { ...params.state.skillEvidence },
    }

    if (state.phase === 'completed') {
      const finalResult = buildFinalSessionResult(sessionId, childId, state.skillEvidence)
      return {
        state,
        decision: {
          phase: 'completed',
          isComplete: true,
          nextItem: null,
          reason: 'Session is already completed.',
          finalResult,
        },
      }
    }

    if (response.itemId !== state.currentPresentedItemId) {
      throw new Error(
        `Submitted itemId "${response.itemId}" does not match currently presented itemId "${state.currentPresentedItemId}".`
      )
    }

    const currentItem = availableItems.find((i) => i.id === response.itemId)
    if (!currentItem) {
      throw new Error(`Item "${response.itemId}" not found in available item bank.`)
    }

    // 1. Grade the item (zero effect from activeResponseMs)
    const outcome = gradeAssessmentAnswer(currentItem, response.rawAnswer, response.isSkipped)

    // 2. Update skill evidence
    const updatedEvidence = recordSkillResponse(
      state.skillEvidence[currentItem.skill],
      currentItem,
      outcome
    )
    state.skillEvidence[currentItem.skill] = updatedEvidence
    state.itemsCompleted++

    const usedItemSet = new Set(state.itemHistory)
    const lastPassageId = currentItem.passageId || null

    // 3. Check Broad Probe phase continuation
    if (state.broadProbeRemainingSkills.length > 0) {
      let nextSkill: AssessmentSkill | undefined
      let nextItem: AssessmentItem | null = null

      while (state.broadProbeRemainingSkills.length > 0 && !nextItem) {
        nextSkill = state.broadProbeRemainingSkills.shift()!
        nextItem = selectCandidateItem(
          availableItems,
          nextSkill,
          state.startingDifficulty,
          usedItemSet,
          lastPassageId,
          state.previousSessionItemIds,
          randomizer
        )
      }

      if (nextItem && nextSkill) {
        state.phase = 'broad_probe'
        state.currentPresentedItemId = nextItem.id
        state.itemHistory.push(nextItem.id)

        return {
          state,
          decision: {
            phase: 'broad_probe',
            isComplete: false,
            nextItem,
            targetSkill: nextSkill,
            targetDifficulty: state.startingDifficulty,
            reason: `Broad probe: probing skill "${nextSkill}" at starting difficulty ${state.startingDifficulty}`,
            finalResult: null,
          },
        }
      }
    }

    // 4. Broad probe completed -> transition to targeted confirmation
    state.phase = 'targeted_confirmation'

    // 5. Evaluate stopping conditions
    const shouldStop = this.evaluateStopCondition(state, cfg)
    if (shouldStop) {
      state.phase = 'completed'
      state.currentPresentedItemId = null
      const finalResult = buildFinalSessionResult(sessionId, childId, state.skillEvidence)

      return {
        state,
        decision: {
          phase: 'completed',
          isComplete: true,
          nextItem: null,
          reason: shouldStop.reason,
          finalResult,
        },
      }
    }

    // 6. Select next skill and difficulty for targeted confirmation
    const nextTarget = this.pickNextTargetSkill(state, availableItems, usedItemSet, cfg, randomizer)
    if (!nextTarget || !nextTarget.item) {
      // If no valid candidate item can be chosen anywhere, terminate session
      state.phase = 'completed'
      state.currentPresentedItemId = null
      const finalResult = buildFinalSessionResult(sessionId, childId, state.skillEvidence)

      return {
        state,
        decision: {
          phase: 'completed',
          isComplete: true,
          nextItem: null,
          reason: 'No further valid candidate items available for any eligible skill; finalizing.',
          finalResult,
        },
      }
    }

    state.currentPresentedItemId = nextTarget.item.id
    state.itemHistory.push(nextTarget.item.id)

    return {
      state,
      decision: {
        phase: 'targeted_confirmation',
        isComplete: false,
        nextItem: nextTarget.item,
        targetSkill: nextTarget.skill,
        targetDifficulty: nextTarget.difficulty,
        reason: nextTarget.reason,
        finalResult: null,
      },
    }
  }

  /**
   * Evaluates whether the session should stop.
   */
  private static evaluateStopCondition(
    state: ProvisionalEngineState,
    cfg: AdaptiveEngineConfig
  ): { reason: string } | null {
    // 1. Absolute hard limit
    if (state.itemsCompleted >= cfg.hardMaxItemCount) {
      return { reason: `Reached absolute hard maximum session limit of ${cfg.hardMaxItemCount} items.` }
    }

    // 2. Soft maximum check (22 items)
    if (state.itemsCompleted >= cfg.softMaxItemCount) {
      const unresolvedContradictions = Object.values(state.skillEvidence).filter(
        (ev) => ev.hasContradiction && ev.attempts < cfg.maxItemsPerSkill
      )
      if (unresolvedContradictions.length === 0) {
        return { reason: `Reached soft maximum of ${cfg.softMaxItemCount} items without pending high contradictions.` }
      }
    }

    // 3. Target session limit check (~18 items)
    if (state.itemsCompleted >= cfg.targetItemCount) {
      const activeContradictions = Object.values(state.skillEvidence).filter(
        (ev) => ev.hasContradiction && ev.attempts < cfg.maxItemsPerSkill
      )
      // If all skills are stable (no contradictions pending further attempts), we can safely conclude
      if (activeContradictions.length === 0) {
        return {
          reason: `Reached target session size of ${cfg.targetItemCount} items with stable diagnostic resolution across skills.`,
        }
      }
    }

    return null
  }

  /**
   * Prioritizes which skill to confirm next and chooses the target difficulty.
   */
  private static pickNextTargetSkill(
    state: ProvisionalEngineState,
    availableItems: readonly AssessmentItem[],
    usedItemIds: Set<string>,
    cfg: AdaptiveEngineConfig,
    randomizer?: () => number
  ): { skill: AssessmentSkill; difficulty: number; item: AssessmentItem; reason: string } | null {
    // Filter skills that have not yet reached max items per skill
    const eligibleSkills = ASSESSMENT_SKILLS.filter((skill) => {
      const ev = state.skillEvidence[skill]
      return !ev || ev.attempts < cfg.maxItemsPerSkill
    })

    if (eligibleSkills.length === 0) {
      return null
    }

    // Priority scoring:
    // Priority 1: Has contradiction (score = 100 - attempts)
    // Priority 2: Borderline (1 attempt only and was right/wrong on diff 3) (score = 50 - attempts)
    // Priority 3: Lowest number of attempts (score = 10 - attempts)
    const sortedSkills = [...eligibleSkills].sort((a, b) => {
      const evA = state.skillEvidence[a]
      const evB = state.skillEvidence[b]

      const scoreA = (evA?.hasContradiction ? 100 : 0) + (10 - (evA?.attempts || 0))
      const scoreB = (evB?.hasContradiction ? 100 : 0) + (10 - (evB?.attempts || 0))

      if (scoreA !== scoreB) {
        return scoreB - scoreA
      }
      return a.localeCompare(b)
    })

    for (const skill of sortedSkills) {
      const ev = state.skillEvidence[skill]
      let targetDiff = state.startingDifficulty
      let reason = `Confirming skill "${skill}"`

      if (ev && ev.attempts > 0) {
        const lastOutcome = ev.outcomes[ev.outcomes.length - 1]
        const lastDiff = ev.difficulties[ev.difficulties.length - 1]

        if (ev.hasContradiction) {
          // If contradictory, test at the difficulty where the learner failed to confirm floor
          const failedDiffs = ev.difficulties.filter(
            (_, i) => ev.outcomes[i] === 'incorrect' || ev.outcomes[i] === 'skipped'
          )
          targetDiff = failedDiffs.length > 0 ? failedDiffs[0] : lastDiff
          reason = `Resolving contradiction in skill "${skill}" at difficulty ${targetDiff}`
        } else if (lastOutcome === 'correct') {
          targetDiff = Math.min(5, lastDiff + 1)
          reason = `Upward confirmation for skill "${skill}" after correct answer (diff ${lastDiff} -> ${targetDiff})`
        } else {
          targetDiff = Math.max(1, lastDiff - 1)
          reason = `Downward confirmation for skill "${skill}" after ${lastOutcome} (diff ${lastDiff} -> ${targetDiff})`
        }
      }

      const item = selectCandidateItem(
        availableItems,
        skill,
        targetDiff,
        usedItemIds,
        null,
        state.previousSessionItemIds,
        randomizer
      )
      if (item) {
        return {
          skill,
          difficulty: targetDiff,
          item,
          reason,
        }
      }
    }

    return null
  }
}
