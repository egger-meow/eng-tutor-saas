import { describe, expect, it } from 'vitest'
import { buildPacketPlanningPrompt } from './packet-planning.js'
import { resolveLearnerEvidence, calculateAssessmentFreshness } from '@paper-english/generator'

describe('Direct Assessment Generation Context & Claim Snapshot Boundaries (Scenarios 1-5)', () => {
  const baseChild = {
    id: 'child-001',
    grade: 7,
    baseline_level: 'intermediate',
  }

  const assessmentState = {
    projectionVersion: 'child-assessment-state-v1' as const,
    assessedAt: '2026-08-01T10:00:00.000Z',
    overallBand: 'developing',
    overallEstimatedDifficulty: 1.8,
    domains: {
      reading: { domain: 'reading' as const, level: 'needs_support' as const, confidence: 'high' as const },
      grammar: { domain: 'grammar' as const, level: 'developing' as const, confidence: 'medium' as const },
      vocabulary: { domain: 'vocabulary' as const, level: 'developing' as const, confidence: 'high' as const },
    },
    skills: {
      inference: { level: 'needs_support' as const, confidence: 'high' as const },
      verb_tense_agreement: { level: 'developing' as const, confidence: 'medium' as const },
      contextual_meaning: { level: 'secure' as const, confidence: 'high' as const },
    },
  }

  // Helper simulating the worker_generation_context logic:
  // Query child_assessment_state where assessed_at <= cutoffTimestamp
  function resolveWorkerContext(
    jobClaimTimestamp: string,
    storedAssessment: typeof assessmentState | null,
  ) {
    let assessmentEvidence: any = null

    if (storedAssessment) {
      const assessedMs = Date.parse(storedAssessment.assessedAt)
      const cutoffMs = Date.parse(jobClaimTimestamp)

      // Snapshot boundary enforcement (assessed_at <= v_cutoff)
      if (assessedMs <= cutoffMs) {
        const { freshness, ageDays } = calculateAssessmentFreshness(storedAssessment.assessedAt, jobClaimTimestamp)
        assessmentEvidence = {
          projectionVersion: storedAssessment.projectionVersion,
          assessedAt: storedAssessment.assessedAt,
          freshness,
          ageDays,
          domains: storedAssessment.domains,
          skills: storedAssessment.skills,
        }
      }
    }

    return {
      job: { id: 'job-123', childId: baseChild.id },
      child: baseChild,
      cutoffTimestamp: jobClaimTimestamp,
      claimSnapshotId: 'claim-snap-123',
      assessmentEvidence,
    }
  }

  it('Scenario 1: Assessment completed BEFORE claim is included in snapshot and prompt', () => {
    // Assessment on Aug 1, Claim at Aug 15
    const claimTime = '2026-08-15T08:00:00.000Z'
    const context = resolveWorkerContext(claimTime, assessmentState)

    expect(context.assessmentEvidence).not.toBeNull()
    expect(context.assessmentEvidence?.freshness).toBe('fresh')
    expect(context.assessmentEvidence?.ageDays).toBe(13)

    const resolved = resolveLearnerEvidence(context)
    expect(resolved.assessmentFreshness).toBe('fresh')
    expect(resolved.signals.reading.level).toBe('needs_support')
    expect(resolved.signals.reading.source).toBe('assessment')

    // Verify in packet planning prompt
    const prompt = buildPacketPlanningPrompt(context, 'Grounding evidence')
    expect(prompt).toContain('"assessmentEvidence"')
    expect(prompt).toContain('"resolvedEvidence"')
    expect(prompt).toContain('"canonicalCapSkill":"local_inference"')
    expect(prompt).toContain('"direction":"support"')
  })

  it('Scenario 2: Assessment completed AFTER claim cutoff is excluded from snapshot and prompt', () => {
    // Claim at July 20, Assessment completed on Aug 1
    const claimTime = '2026-07-20T08:00:00.000Z'
    const context = resolveWorkerContext(claimTime, assessmentState)

    // Snapshot boundary strictly excludes newer assessment
    expect(context.assessmentEvidence).toBeNull()

    const resolved = resolveLearnerEvidence(context)
    expect(resolved.assessmentFreshness).toBe('none')
    expect(resolved.signals.reading.source).toBe('parent') // falls back to parent baseline

    const prompt = buildPacketPlanningPrompt(context, 'Grounding evidence')
    expect(prompt).toContain('"assessmentEvidence":null')
    expect(prompt).not.toContain('"canonicalCapSkill":"local_inference"')
  })

  it('Scenario 3: Claim retry/replay at T3 preserves original T1 cutoff and excludes T2 assessment', () => {
    // T1: Initial claim cutoff at July 25
    const t1Cutoff = '2026-07-25T00:00:00.000Z'

    // T2: Assessment completed at Aug 1 (represented by assessmentState)

    // T3: Worker crashes and retries at Aug 10, but reads frozen snapshot with cutoff = T1
    const retryContext = resolveWorkerContext(t1Cutoff, assessmentState)

    expect(retryContext.cutoffTimestamp).toBe(t1Cutoff)
    expect(retryContext.assessmentEvidence).toBeNull()

    const resolved = resolveLearnerEvidence(retryContext)
    expect(resolved.assessmentFreshness).toBe('none')
  })

  it('Scenario 4: Next week claim at T4 (after assessment) includes assessment', () => {
    // T4: Next week's job claim at Aug 15
    const t4Cutoff = '2026-08-15T00:00:00.000Z'
    const nextWeekContext = resolveWorkerContext(t4Cutoff, assessmentState)

    expect(nextWeekContext.assessmentEvidence).not.toBeNull()
    expect(nextWeekContext.assessmentEvidence.freshness).toBe('fresh')
    expect(nextWeekContext.assessmentEvidence.ageDays).toBe(13)

    const resolved = resolveLearnerEvidence(nextWeekContext)
    expect(resolved.assessmentFreshness).toBe('fresh')
    expect(resolved.signals.reading.level).toBe('needs_support')
  })

  it('Scenario 5: Stale assessment (> 180 days) is marked stale and does not restrict curriculum', () => {
    // Claim on March 1, 2027 (approx 212 days after Aug 1, 2026)
    const futureClaimTime = '2027-03-01T00:00:00.000Z'
    const staleContext = resolveWorkerContext(futureClaimTime, assessmentState)

    expect(staleContext.assessmentEvidence).not.toBeNull()
    expect(staleContext.assessmentEvidence.freshness).toBe('stale')
    expect(staleContext.assessmentEvidence.ageDays).toBeGreaterThan(180)

    const resolved = resolveLearnerEvidence(staleContext)
    expect(resolved.assessmentFreshness).toBe('stale')
    // Stale assessment does not override parent baseline for domain signals
    expect(resolved.signals.reading.source).toBe('parent')
    expect(resolved.prioritySkills).toHaveLength(0)
    expect(resolved.guidanceSummary.some(g => g.includes('stale'))).toBe(true)
  })
})
