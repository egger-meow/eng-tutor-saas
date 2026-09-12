import { describe, expect, it } from 'vitest'
import {
  AssessmentSessionResultSchema,
  type AssessmentItem,
} from '../contracts.js'
import { CANONICAL_ITEMS } from '../bank/index.js'
import { AdaptiveEngine } from './adaptive-engine.js'

describe('Deterministic Adaptive Engine Simulation Suite', () => {
  function getCorrectAnswer(item: AssessmentItem): string {
    if (item.responseType === 'single_choice') {
      return item.correctChoice || 'A'
    }
    return item.acceptedAnswers && item.acceptedAnswers.length > 0
      ? item.acceptedAnswers[0]
      : 'answer'
  }

  function runSimulation(params: {
    learnerName: string
    gradeStage: string
    onboardingLevel?: string
    answerStrategy: (item: AssessmentItem, step: number) => {
      rawAnswer: string | null
      isSkipped: boolean
    }
  }) {
    const sessionId = '123e4567-e89b-42d3-a456-426614174000'
    const childId = '123e4567-e89b-42d3-a456-426614174001'

    let { state, decision } = AdaptiveEngine.initSession({
      sessionId,
      childId,
      gradeStage: params.gradeStage,
      onboardingLevel: params.onboardingLevel,
      availableItems: CANONICAL_ITEMS,
    })

    let steps = 0
    const maxSafetyLimit = 30

    while (!decision.isComplete && steps < maxSafetyLimit) {
      steps++
      const currentItem = decision.nextItem!
      expect(currentItem).toBeDefined()

      const simulatedResponse = params.answerStrategy(currentItem, steps)

      const result = AdaptiveEngine.processResponse({
        sessionId,
        childId,
        state,
        response: {
          itemId: currentItem.id,
          rawAnswer: simulatedResponse.rawAnswer,
          isSkipped: simulatedResponse.isSkipped,
          activeResponseMs: 3500,
        },
        availableItems: CANONICAL_ITEMS,
      })

      state = result.state
      decision = result.decision
    }

    // Must terminate within absolute hard max of 25 items
    expect(steps).toBeGreaterThanOrEqual(13) // at least broad probe completed
    expect(steps).toBeLessThanOrEqual(25)
    expect(decision.isComplete).toBe(true)
    expect(state.phase).toBe('completed')
    expect(state.itemsCompleted).toBe(steps)

    // Zero duplicate questions
    expect(new Set(state.itemHistory).size).toBe(steps)

    // Valid frozen final session result
    expect(decision.finalResult).not.toBeNull()
    const parsed = AssessmentSessionResultSchema.safeParse(decision.finalResult)
    expect(parsed.success).toBe(true)

    return {
      steps,
      finalResult: decision.finalResult!,
      state,
    }
  }

  it('Simulation 1: Clearly struggling learner (Grade 7, needs-support)', () => {
    // Fails almost everything above difficulty 1; succeeds occasionally on diff 1
    const res = runSimulation({
      learnerName: 'struggling',
      gradeStage: 'grade_7',
      onboardingLevel: 'needs-support',
      answerStrategy: (item) => {
        if (item.difficulty === 1) {
          return { rawAnswer: getCorrectAnswer(item), isSkipped: false }
        }
        // Skips or gives incorrect answer
        return { rawAnswer: 'wrong', isSkipped: false }
      },
    })

    expect(res.steps).toBeLessThanOrEqual(25)
    expect(res.state.startingDifficulty).toBe(1)
    // Most skills should evaluate to needs_support or developing
    const evalValues = Object.values(res.finalResult.skillEvaluations)
    const needsSupportCount = evalValues.filter((e) => e.result === 'needs_support').length
    const secureCount = evalValues.filter((e) => e.result === 'secure').length
    expect(needsSupportCount).toBeGreaterThan(0)
    expect(secureCount).toBe(0)
    expect(res.finalResult.correctCount).toBeLessThanOrEqual(Math.ceil(res.steps * 0.6))
  })

  it('Simulation 2: Grade-level mixed learner (Grade 8, on-level)', () => {
    // Solves difficulty 1 and 2 easily; mixed on diff 3; fails diff 4 and 5
    const res = runSimulation({
      learnerName: 'grade_level_mixed',
      gradeStage: 'grade_8',
      onboardingLevel: 'on-level',
      answerStrategy: (item, step) => {
        if (item.difficulty <= 2) {
          return { rawAnswer: getCorrectAnswer(item), isSkipped: false }
        }
        if (item.difficulty === 3) {
          return { rawAnswer: step % 2 === 0 ? getCorrectAnswer(item) : 'wrong', isSkipped: false }
        }
        return { rawAnswer: 'wrong', isSkipped: false }
      },
    })

    expect(res.steps).toBeLessThanOrEqual(25)
    expect(res.state.startingDifficulty).toBe(3)
    const evalValues = Object.values(res.finalResult.skillEvaluations)
    const developingCount = evalValues.filter((e) => e.result === 'developing').length
    expect(developingCount).toBeGreaterThan(0)
  })

  it('Simulation 3: Advanced learner (Grade 9, advanced)', () => {
    // Solves 100% of questions correctly across all difficulties
    const res = runSimulation({
      learnerName: 'advanced',
      gradeStage: 'grade_9',
      onboardingLevel: 'advanced',
      answerStrategy: (item) => ({
        rawAnswer: getCorrectAnswer(item),
        isSkipped: false,
      }),
    })

    expect(res.steps).toBeLessThanOrEqual(25)
    expect(res.state.startingDifficulty).toBe(5)
    // All items correct
    expect(res.finalResult.correctCount).toBe(res.steps)
    expect(res.finalResult.skipCount).toBe(0)

    // All skills secure with high or medium confidence
    const evalValues = Object.values(res.finalResult.skillEvaluations)
    for (const ev of evalValues) {
      expect(ev.result).toBe('secure')
      expect(ev.estimatedDifficulty).toBeGreaterThanOrEqual(3)
    }

    // All domains secure
    expect(res.finalResult.domainSummaries.vocabulary.result).toBe('secure')
    expect(res.finalResult.domainSummaries.grammar.result).toBe('secure')
    expect(res.finalResult.domainSummaries.reading.result).toBe('secure')
  })

  it('Simulation 4: Contradictory / noisy learner (Grade 8, developing)', () => {
    // Alternates between getting questions right and wrong irrespective of difficulty
    const res = runSimulation({
      learnerName: 'noisy_contradictory',
      gradeStage: 'grade_8',
      onboardingLevel: 'developing',
      answerStrategy: (item, step) => {
        // Step 1: correct, Step 2: wrong, Step 3: correct...
        if (step % 2 === 1) {
          return { rawAnswer: getCorrectAnswer(item), isSkipped: false }
        }
        return { rawAnswer: 'mistake', isSkipped: false }
      },
    })

    // Contradictions are detected and handled without infinite loops, strictly within 25 items
    expect(res.steps).toBeLessThanOrEqual(25)
    expect(res.steps).toBeGreaterThanOrEqual(18) // Confirmation spent on contradictions

    // Assert no skill exceeded max attempts of 4
    for (const ev of Object.values(res.state.skillEvidence)) {
      expect(ev.attempts).toBeLessThanOrEqual(4)
    }
  })

  it('Simulation 5: Heavy skip learner (Grade 7, developing)', () => {
    // Chooses "I don't know / skip" on 70% of questions
    const res = runSimulation({
      learnerName: 'heavy_skip',
      gradeStage: 'grade_7',
      onboardingLevel: 'developing',
      answerStrategy: (item, step) => {
        if (step % 3 === 0) {
          return { rawAnswer: getCorrectAnswer(item), isSkipped: false }
        }
        // Skip explicitly
        return { rawAnswer: null, isSkipped: true }
      },
    })

    expect(res.steps).toBeLessThanOrEqual(25)
    expect(res.finalResult.skipCount).toBeGreaterThan(5)
    expect(res.finalResult.skipCount + res.finalResult.correctCount).toBeLessThanOrEqual(res.steps)
  })
})
