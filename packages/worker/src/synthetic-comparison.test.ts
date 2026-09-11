import { describe, expect, it } from 'vitest'
import { buildPacketPlanningPrompt } from './packet-planning.js'
import { resolveLearnerEvidence } from '@paper-english/generator'

describe('Direct Assessment Synthetic Generation Comparison (Cases A, B, C, D)', () => {
  const baseChildContext = {
    job: { id: 'job-synth-001', childId: 'child-synth-001' },
    child: {
      id: 'child-synth-001',
      grade: 7,
      preferences: { interests: ['astronomy', 'James Webb Space Telescope'] },
    },
    profile: {
      grade: 7,
      baseline_level: 'intermediate',
      reading_level: 'intermediate',
      vocabulary_level: 'intermediate',
      grammar_level: 'intermediate',
      weekly_minutes: 45,
    },
    cutoffTimestamp: '2026-09-01T00:00:00.000Z',
    lifetimeLearningMemory: {
      vocabulary: { dueTargetIds: [], verifiedWeakTargetIds: [] },
      grammar: { dueTargetIds: [], verifiedWeakTargetIds: [] },
    },
    targetedOlderEvidence: [],
  }

  // Case A: Identical child without assessment
  const caseAContext = {
    ...baseChildContext,
    assessmentEvidence: null,
  }

  // Case B: Same child with fresh reading weakness (inference: needs_support/high)
  const caseBContext = {
    ...baseChildContext,
    assessmentEvidence: {
      projectionVersion: 'child-assessment-state-v1' as const,
      assessedAt: '2026-08-15T00:00:00.000Z', // 17 days old (fresh)
      freshness: 'fresh' as const,
      ageDays: 17,
      domains: {
        reading: { domain: 'reading' as const, level: 'needs_support' as const, confidence: 'high' as const },
        grammar: { domain: 'grammar' as const, level: 'developing' as const, confidence: 'medium' as const },
        vocabulary: { domain: 'vocabulary' as const, level: 'developing' as const, confidence: 'high' as const },
      },
      skills: {
        inference: { level: 'needs_support' as const, confidence: 'high' as const },
      },
    },
  }

  // Case C: Same child with fresh reading strength (reading: secure/high)
  const caseCContext = {
    ...baseChildContext,
    assessmentEvidence: {
      projectionVersion: 'child-assessment-state-v1' as const,
      assessedAt: '2026-08-15T00:00:00.000Z', // 17 days old (fresh)
      freshness: 'fresh' as const,
      ageDays: 17,
      domains: {
        reading: { domain: 'reading' as const, level: 'secure' as const, confidence: 'high' as const },
        grammar: { domain: 'grammar' as const, level: 'developing' as const, confidence: 'medium' as const },
        vocabulary: { domain: 'vocabulary' as const, level: 'developing' as const, confidence: 'high' as const },
      },
      skills: {
        inference: { level: 'secure' as const, confidence: 'high' as const },
      },
    },
  }

  // Case D: Same child with stale assessment (> 180 days)
  const caseDContext = {
    ...baseChildContext,
    assessmentEvidence: {
      projectionVersion: 'child-assessment-state-v1' as const,
      assessedAt: '2026-01-10T00:00:00.000Z', // ~234 days old (stale)
      freshness: 'stale' as const,
      ageDays: 234,
      domains: {
        reading: { domain: 'reading' as const, level: 'needs_support' as const, confidence: 'high' as const },
        grammar: { domain: 'grammar' as const, level: 'developing' as const, confidence: 'medium' as const },
        vocabulary: { domain: 'vocabulary' as const, level: 'developing' as const, confidence: 'high' as const },
      },
      skills: {
        inference: { level: 'needs_support' as const, confidence: 'high' as const },
      },
    },
  }

  const grounding = 'Public grounding on James Webb Space Telescope discoveries and distant galaxies.'

  it('Case A: generates baseline plan without assessment constraints', () => {
    const resolved = resolveLearnerEvidence(caseAContext)
    expect(resolved.assessmentFreshness).toBe('none')
    expect(resolved.signals.reading.source).toBe('parent')
    expect(resolved.signals.reading.level).toBe('developing')
    expect(resolved.scaffoldEmphasis).toBe('on-level')
    expect(resolved.prioritySkills).toHaveLength(0)

    const promptA = buildPacketPlanningPrompt(caseAContext, grounding)
    expect(promptA).toContain('"assessmentEvidence":null')
    expect(promptA).toContain('"scaffoldEmphasis":"on-level"')
  })

  it('Case B: prescribes supported scaffolding for fresh reading inference weakness', () => {
    const resolved = resolveLearnerEvidence(caseBContext)
    expect(resolved.assessmentFreshness).toBe('fresh')
    expect(resolved.signals.reading.source).toBe('assessment')
    expect(resolved.signals.reading.level).toBe('needs_support')
    expect(resolved.scaffoldEmphasis).toBe('supported')
    expect(resolved.prioritySkills).toHaveLength(1)
    expect(resolved.prioritySkills[0]).toEqual(expect.objectContaining({
      skill: 'inference',
      canonicalCapSkill: 'local_inference',
      direction: 'support',
      level: 'needs_support',
      confidence: 'high',
      source: 'assessment',
    }))

    const promptB = buildPacketPlanningPrompt(caseBContext, grounding)
    expect(promptB).toContain('"assessmentFreshness":"fresh"')
    expect(promptB).toContain('"scaffoldEmphasis":"supported"')
    expect(promptB).toContain('"canonicalCapSkill":"local_inference"')
    expect(promptB).toContain('"direction":"support"')
  })

  it('Case C: recognizes fresh reading strength and allows stretch scaffolding', () => {
    const resolved = resolveLearnerEvidence(caseCContext)
    expect(resolved.assessmentFreshness).toBe('fresh')
    expect(resolved.signals.reading.source).toBe('assessment')
    expect(resolved.signals.reading.level).toBe('secure')
    expect(resolved.prioritySkills).toHaveLength(1)
    expect(resolved.prioritySkills[0]).toEqual(expect.objectContaining({
      skill: 'inference',
      canonicalCapSkill: 'local_inference',
      direction: 'stretch',
      level: 'secure',
      confidence: 'high',
      source: 'assessment',
    }))

    const promptC = buildPacketPlanningPrompt(caseCContext, grounding)
    expect(promptC).toContain('"assessmentFreshness":"fresh"')
    expect(promptC).toContain('"level":"secure"')
    expect(promptC).toContain('"direction":"stretch"')
  })

  it('Case D: stale assessment (> 180d) is marked stale and does not restrict curriculum', () => {
    const resolved = resolveLearnerEvidence(caseDContext)
    expect(resolved.assessmentFreshness).toBe('stale')
    // Stale assessment does NOT override parent baseline
    expect(resolved.signals.reading.source).toBe('parent')
    expect(resolved.signals.reading.level).toBe('developing')
    expect(resolved.scaffoldEmphasis).toBe('on-level')
    expect(resolved.prioritySkills).toHaveLength(0)
    expect(resolved.guidanceSummary.some(g => g.includes('stale'))).toBe(true)

    const promptD = buildPacketPlanningPrompt(caseDContext, grounding)
    expect(promptD).toContain('"assessmentFreshness":"stale"')
    expect(promptD).toContain('"source":"parent"')
  })

  it('proves all 4 case prompts differ distinctly and leak no internal diagnostic questions or keys', () => {
    const promptA = buildPacketPlanningPrompt(caseAContext, grounding)
    const promptB = buildPacketPlanningPrompt(caseBContext, grounding)
    const promptC = buildPacketPlanningPrompt(caseCContext, grounding)
    const promptD = buildPacketPlanningPrompt(caseDContext, grounding)

    // All prompts are distinct
    expect(promptA).not.toBe(promptB)
    expect(promptA).not.toBe(promptC)
    expect(promptA).not.toBe(promptD)
    expect(promptB).not.toBe(promptC)
    expect(promptB).not.toBe(promptD)
    expect(promptC).not.toBe(promptD)

    // Verify no answer keys or test items leak
    for (const prompt of [promptA, promptB, promptC, promptD]) {
      expect(prompt).not.toContain('correct_choice')
      expect(prompt).not.toContain('accepted_answers')
      expect(prompt).not.toContain('item_id')
      expect(prompt).not.toContain('raw_responses')
      expect(prompt).not.toContain('assessment_items')
    }
  })
})
