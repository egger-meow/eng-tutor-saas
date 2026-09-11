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

  interface MockAssessmentState {
    projectionVersion: string
    assessedAt: string
    overallBand?: string
    overallEstimatedDifficulty?: number
    domains?: Record<string, any>
    skills?: Record<string, any>
  }

  // Helper simulating the worker_generation_context logic:
  // When snapshot exists: reuse snapshot.assessmentEvidence and snapshot.cutoffTimestamp directly.
  // When snapshot does NOT exist: query child_assessment_state where assessed_at <= cutoffTimestamp.
  function resolveWorkerContext(
    jobClaimTimestamp: string,
    storedAssessment: MockAssessmentState | null,
    existingSnapshot?: { assessmentEvidence?: any; cutoffTimestamp?: string } | null,
  ) {
    let assessmentEvidence: any = null
    let cutoffTimestamp = jobClaimTimestamp

    if (existingSnapshot !== undefined && existingSnapshot !== null) {
      cutoffTimestamp = existingSnapshot.cutoffTimestamp ?? jobClaimTimestamp
      assessmentEvidence = existingSnapshot.assessmentEvidence ?? null
    } else if (storedAssessment) {
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
      cutoffTimestamp,
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

  it('Scenario 6: Claim snapshot freeze & overwrite regression (Assessment A -> Claim 1 -> Assessment B -> Replay 1 -> Claim 2 & Inverse)', () => {
    // T0: Assessment A completed
    const t0 = '2026-08-01T10:00:00.000Z'
    const assessmentA = {
      projectionVersion: 'child-assessment-state-v1' as const,
      assessedAt: t0,
      overallBand: 'developing',
      overallEstimatedDifficulty: 1.8,
      domains: {
        reading: { domain: 'reading' as const, level: 'needs_support' as const, confidence: 'high' as const },
        grammar: { domain: 'grammar' as const, level: 'developing' as const, confidence: 'medium' as const },
        vocabulary: { domain: 'vocabulary' as const, level: 'developing' as const, confidence: 'high' as const },
      },
      skills: {
        inference: { level: 'needs_support' as const, confidence: 'high' as const },
      },
    }

    // T1: Job 1 claimed
    const t1 = '2026-08-15T10:00:00.000Z'
    const contextJob1 = resolveWorkerContext(t1, assessmentA)
    const snapshotJob1 = {
      generation_context: contextJob1,
      cutoffTimestamp: t1,
      assessmentEvidence: contextJob1.assessmentEvidence,
    }
    const fingerprint1 = JSON.stringify(contextJob1)

    // T2: Assessment B completed (> T1), child_assessment_state latest projection becomes B
    const t2 = '2026-08-20T10:00:00.000Z'
    const assessmentB = {
      projectionVersion: 'child-assessment-state-v1' as const,
      assessedAt: t2,
      overallBand: 'secure',
      overallEstimatedDifficulty: 2.8,
      domains: {
        reading: { domain: 'reading' as const, level: 'secure' as const, confidence: 'high' as const },
        grammar: { domain: 'grammar' as const, level: 'secure' as const, confidence: 'high' as const },
        vocabulary: { domain: 'vocabulary' as const, level: 'secure' as const, confidence: 'high' as const },
      },
      skills: {
        inference: { level: 'secure' as const, confidence: 'high' as const },
      },
    }

    // T3: Replay Job 1 (> T2)
    // Worker context replayed with snapshot present
    const replayJob1 = resolveWorkerContext(t1, assessmentB, snapshotJob1)
    const replayFingerprint1 = JSON.stringify(replayJob1)

    // Assertions for Job 1 replay:
    // - Job 1 still receives Assessment A
    expect(replayJob1.assessmentEvidence?.domains?.reading?.level).toBe('needs_support')
    // - Job 1 does NOT receive Assessment B
    expect(replayJob1.assessmentEvidence?.domains?.reading?.level).not.toBe('secure')
    // - Capsule is byte/JSON equivalent to frozen snapshot capsule
    expect(replayJob1.assessmentEvidence).toEqual(snapshotJob1.assessmentEvidence)
    // - Input fingerprint remains authoritative and unchanged
    expect(replayFingerprint1).toBe(fingerprint1)

    // T4: Job 2 claimed (> T2) without prior snapshot
    const t4 = '2026-08-25T10:00:00.000Z'
    const contextJob2 = resolveWorkerContext(t4, assessmentB)
    // Job 2 receives Assessment B
    expect(contextJob2.assessmentEvidence?.domains?.reading?.level).toBe('secure')

    // Inverse test: Job 3 claimed with no assessment, assessment completed later, Job 3 replay remains assessment-free
    const contextJob3 = resolveWorkerContext(t1, null)
    expect(contextJob3.assessmentEvidence).toBeNull()
    const snapshotJob3 = {
      generation_context: contextJob3,
      cutoffTimestamp: t1,
      assessmentEvidence: null,
    }

    // Assessment completed later (assessmentB), then Job 3 replayed
    const replayJob3 = resolveWorkerContext(t1, assessmentB, snapshotJob3)
    expect(replayJob3.assessmentEvidence).toBeNull()
  })
})
