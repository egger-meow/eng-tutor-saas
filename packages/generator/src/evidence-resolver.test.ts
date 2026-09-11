import { describe, it, expect } from 'vitest'
import {
  calculateAssessmentFreshness,
  resolveLearnerEvidence,
  ASSESSMENT_EVIDENCE_POLICY_VERSION,
  ASSESSMENT_READING_TO_CAP_SKILL_MAP,
  type AssessmentEvidenceCapsule,
} from './evidence-resolver.js'

describe('evidence-resolver', () => {
  describe('calculateAssessmentFreshness', () => {
    const cutoff = '2026-09-12T12:00:00.000Z'

    it('identifies fresh assessment (<= 90 days)', () => {
      // 10 days old
      const assessedAt = '2026-09-02T12:00:00.000Z'
      const res = calculateAssessmentFreshness(assessedAt, cutoff)
      expect(res.freshness).toBe('fresh')
      expect(res.ageDays).toBe(10)

      // exactly 90 days old
      const ninetyDays = new Date(Date.parse(cutoff) - 90 * 86400 * 1000).toISOString()
      expect(calculateAssessmentFreshness(ninetyDays, cutoff).freshness).toBe('fresh')
    })

    it('identifies aging assessment (91 to 180 days)', () => {
      // 91 days old
      const ninetyOneDays = new Date(Date.parse(cutoff) - 91 * 86400 * 1000).toISOString()
      const res1 = calculateAssessmentFreshness(ninetyOneDays, cutoff)
      expect(res1.freshness).toBe('aging')
      expect(res1.ageDays).toBe(91)

      // 180 days old
      const oneEightyDays = new Date(Date.parse(cutoff) - 180 * 86400 * 1000).toISOString()
      const res2 = calculateAssessmentFreshness(oneEightyDays, cutoff)
      expect(res2.freshness).toBe('aging')
      expect(res2.ageDays).toBe(180)
    })

    it('identifies stale assessment (> 180 days)', () => {
      // 181 days old
      const oneEightyOneDays = new Date(Date.parse(cutoff) - 181 * 86400 * 1000).toISOString()
      const res = calculateAssessmentFreshness(oneEightyOneDays, cutoff)
      expect(res.freshness).toBe('stale')
      expect(res.ageDays).toBe(181)
    })

    it('rejects post-cutoff assessments (out of snapshot boundary)', () => {
      // 1 hour after cutoff
      const postCutoff = '2026-09-12T13:00:00.000Z'
      const res = calculateAssessmentFreshness(postCutoff, cutoff)
      expect(res.freshness).toBe('none')
      expect(res.ageDays).toBeNull()
    })

    it('handles missing or invalid assessedAt', () => {
      expect(calculateAssessmentFreshness(undefined, cutoff).freshness).toBe('none')
      expect(calculateAssessmentFreshness('invalid-date', cutoff).freshness).toBe('none')
    })
  })

  describe('CAP skill mapping', () => {
    it('accurately maps reading skills to canonical CAP skills', () => {
      expect(ASSESSMENT_READING_TO_CAP_SKILL_MAP).toEqual({
        explicit_information: 'explicit_detail',
        main_idea: 'main_idea',
        vocabulary_in_context: 'vocabulary_in_context',
        inference: 'local_inference',
        information_integration: 'information_integration',
      })
    })
  })

  describe('Conflict Resolution Tests (Section 11)', () => {
    const cutoffTimestamp = '2026-09-12T12:00:00.000Z'

    it('1. Parent vs assessment: fresh high-confidence assessment beats parent self-report', () => {
      const context = {
        cutoffTimestamp,
        profile: {
          reading_level: 'advanced',
          baseline_level: 'advanced',
        },
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-09-02T12:00:00.000Z', // 10 days old (fresh)
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
          },
          domains: {
            reading: { level: 'needs_support', confidence: 'high' },
            vocabulary: { level: 'secure', confidence: 'high' },
            grammar: { level: 'developing', confidence: 'medium' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      expect(resolved.policyVersion).toBe(ASSESSMENT_EVIDENCE_POLICY_VERSION)
      expect(resolved.assessmentFreshness).toBe('fresh')
      // Fresh assessment outranks parent advanced report for reading
      expect(resolved.signals.reading.level).toBe('needs_support')
      expect(resolved.signals.reading.confidence).toBe('high')
      expect(resolved.signals.reading.source).toBe('assessment')

      // Inference skill is prioritized with support direction
      const infSkill = resolved.prioritySkills.find(s => s.skill === 'inference')
      expect(infSkill).toBeDefined()
      expect(infSkill?.canonicalCapSkill).toBe('local_inference')
      expect(infSkill?.direction).toBe('support')
      expect(infSkill?.confidence).toBe('high')
      expect(resolved.scaffoldEmphasis).toBe('supported')
    })

    it('2. Assessment vs newer demonstrated weakness: specific weekly evidence wins over broad assessment', () => {
      const context = {
        cutoffTimestamp,
        profile: {
          grammar_level: 'intermediate',
        },
        lifetimeLearningMemory: {
          grammar: {
            verifiedWeakTargetIds: ['g_irregular_past'],
          },
        },
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-09-02T12:00:00.000Z',
          skills: {
            verb_tense_agreement: { level: 'secure', confidence: 'high' },
          },
          domains: {
            grammar: { level: 'secure', confidence: 'high' },
            vocabulary: { level: 'secure', confidence: 'high' },
            reading: { level: 'secure', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      // Weekly evidence wins: grammar signal reflects mixed state with specific weaknesses
      expect(resolved.signals.grammar.source).toBe('mixed')
      expect(resolved.signals.grammar.level).toBe('developing')
      expect(resolved.guidanceSummary.some(g => g.includes('specific verified weaknesses require continued targeting'))).toBe(true)
    })

    it('3. Old assessment vs newer success: recent demonstrated weekly successes supersede older assessment weakness', () => {
      const context = {
        cutoffTimestamp,
        profile: {
          reading_level: 'intermediate',
        },
        targetedOlderEvidence: [
          { targetSkill: 'local_inference', result: 'correct', observedAt: '2026-09-08T10:00:00.000Z' },
          { targetSkill: 'inference', result: 'correct', observedAt: '2026-09-10T10:00:00.000Z' },
        ],
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-07-02T12:00:00.000Z', // 72 days old
          skills: {
            inference: { level: 'needs_support', confidence: 'medium' },
          },
          domains: {
            reading: { level: 'needs_support', confidence: 'medium' },
            vocabulary: { level: 'developing', confidence: 'medium' },
            grammar: { level: 'developing', confidence: 'medium' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      // Demonstrated successes supersede older assessment weakness
      expect(resolved.signals.reading.source).toBe('demonstrated')
      expect(resolved.signals.reading.level).toBe('developing')
      // Inference is NOT included as a priority weakness needing support
      expect(resolved.prioritySkills.some(s => s.skill === 'inference' && s.direction === 'support')).toBe(false)
      expect(resolved.guidanceSummary.some(g => g.includes('superseded older assessment'))).toBe(true)
    })

    it('4. Low confidence assessment is advisory: guides confirmation opportunity, not aggressive remediation', () => {
      const context = {
        cutoffTimestamp,
        profile: {
          reading_level: 'intermediate',
        },
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-09-02T12:00:00.000Z',
          skills: {
            information_integration: { level: 'needs_support', confidence: 'low' },
          },
          domains: {
            reading: { level: 'developing', confidence: 'medium' },
            vocabulary: { level: 'developing', confidence: 'medium' },
            grammar: { level: 'developing', confidence: 'medium' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      const skill = resolved.prioritySkills.find(s => s.skill === 'information_integration')
      expect(skill).toBeDefined()
      // Advisory confirmation direction, NOT support
      expect(skill?.direction).toBe('confirm')
      expect(skill?.confidence).toBe('low')
      expect(skill?.scaffoldGuidance).toContain('Advisory diagnostic signal')
    })

    it('5. Stale assessment (> 180 days): historical reference only, does not override current profile or demonstrated performance', () => {
      const context = {
        cutoffTimestamp,
        profile: {
          reading_level: 'advanced',
          vocabulary_level: 'advanced',
          grammar_level: 'advanced',
        },
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-01-01T12:00:00.000Z', // 254 days old (> 180d)
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
            main_idea: { level: 'needs_support', confidence: 'high' },
          },
          domains: {
            reading: { level: 'needs_support', confidence: 'high' },
            vocabulary: { level: 'needs_support', confidence: 'high' },
            grammar: { level: 'needs_support', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      expect(resolved.assessmentFreshness).toBe('stale')
      expect(resolved.ageDays).toBeGreaterThan(180)
      // Stale assessment does NOT override parent advanced profile
      expect(resolved.signals.reading.level).toBe('secure')
      expect(resolved.signals.reading.source).toBe('parent')
      expect(resolved.signals.vocabulary.level).toBe('secure')
      expect(resolved.signals.grammar.level).toBe('secure')
      // Priority skills from stale assessment are excluded
      expect(resolved.prioritySkills.length).toBe(0)
      expect(resolved.guidanceSummary.some(g => g.includes('stale'))).toBe(true)
    })

    it('6. Mixed-domain learner: preserves separate domain signals without flattening to a single global level', () => {
      const context = {
        cutoffTimestamp,
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-09-02T12:00:00.000Z',
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
            core_vocabulary: { level: 'secure', confidence: 'high' },
          },
          domains: {
            vocabulary: { level: 'secure', confidence: 'high' },
            grammar: { level: 'developing', confidence: 'medium' },
            reading: { level: 'needs_support', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      expect(resolved.signals.vocabulary.level).toBe('secure')
      expect(resolved.signals.grammar.level).toBe('developing')
      expect(resolved.signals.reading.level).toBe('needs_support')
      // Global scaffold emphasis remains supported due to reading needs_support
      expect(resolved.scaffoldEmphasis).toBe('supported')
    })
  })

  describe('Context-size discipline and bounding', () => {
    const cutoffTimestamp = '2026-09-12T12:00:00.000Z'

    it('caps priority skills to maximum 8 entries and orders deterministically', () => {
      const skills: Record<string, { level: 'needs_support' | 'developing' | 'secure'; confidence: 'low' | 'medium' | 'high' }> = {
        inference: { level: 'needs_support', confidence: 'high' },
        main_idea: { level: 'needs_support', confidence: 'medium' },
        explicit_information: { level: 'needs_support', confidence: 'low' },
        vocabulary_in_context: { level: 'developing', confidence: 'high' },
        information_integration: { level: 'developing', confidence: 'medium' },
        core_vocabulary: { level: 'developing', confidence: 'medium' },
        contextual_meaning: { level: 'developing', confidence: 'high' },
        word_form_usage: { level: 'developing', confidence: 'medium' },
        basic_sentence_structure: { level: 'developing', confidence: 'high' },
        verb_tense_agreement: { level: 'developing', confidence: 'medium' },
      }

      const context = {
        cutoffTimestamp,
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: '2026-09-02T12:00:00.000Z',
          skills,
          domains: {
            vocabulary: { level: 'developing', confidence: 'medium' },
            grammar: { level: 'developing', confidence: 'medium' },
            reading: { level: 'developing', confidence: 'medium' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)

      expect(resolved.prioritySkills.length).toBeLessThanOrEqual(8)
      // Check deterministic sorting: support items appear before confirm items
      const directions = resolved.prioritySkills.map(s => s.direction)
      const firstConfirmIdx = directions.indexOf('confirm')
      if (firstConfirmIdx !== -1) {
        const supportAfterConfirm = directions.slice(firstConfirmIdx).includes('support')
        expect(supportAfterConfirm).toBe(false)
      }
    })
  })

  describe('Evidence chronology & temporal conflict resolution (A-E)', () => {
    const cutoffTimestamp = '2026-09-20T00:00:00.000Z'
    const assessmentDate = '2026-09-01T00:00:00.000Z'

    it('A. Old success must not beat newer assessment (pre-assessment successes do not erase later diagnostic weakness)', () => {
      const context = {
        cutoffTimestamp,
        profile: { reading_level: 'intermediate' },
        // Two successes observed BEFORE the assessment
        targetedOlderEvidence: [
          { targetSkill: 'local_inference', result: 'correct', observedAt: '2026-08-01T10:00:00.000Z' },
          { targetSkill: 'inference', result: 'correct', observedAt: '2026-08-08T10:00:00.000Z' },
        ],
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: assessmentDate,
          domains: {
            reading: { level: 'needs_support', confidence: 'high' },
          },
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)
      // Assessment weakness remains active!
      expect(resolved.signals.reading.level).toBe('needs_support')
      expect(resolved.signals.reading.source).toBe('assessment')
      expect(resolved.prioritySkills.some(s => s.skill === 'inference' && s.direction === 'support')).toBe(true)
    })

    it('B. New success can beat older assessment (post-assessment successes supersede older assessment weakness)', () => {
      const context = {
        cutoffTimestamp,
        profile: { reading_level: 'intermediate' },
        // Two successes observed AFTER the assessment and before cutoff
        targetedOlderEvidence: [
          { targetSkill: 'local_inference', result: 'correct', observedAt: '2026-09-08T10:00:00.000Z' },
          { targetSkill: 'inference', result: 'correct', observedAt: '2026-09-15T10:00:00.000Z' },
        ],
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: assessmentDate,
          domains: {
            reading: { level: 'needs_support', confidence: 'high' },
          },
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)
      // Rule C applies: Newer weekly success supersedes older assessment weakness
      expect(resolved.signals.reading.level).toBe('developing')
      expect(resolved.signals.reading.source).toBe('demonstrated')
      expect(resolved.prioritySkills.some(s => s.skill === 'inference' && s.direction === 'support')).toBe(false)
      expect(resolved.guidanceSummary.some(g => g.includes('superseded older assessment'))).toBe(true)
    })

    it('C. Mixed chronology: one success before assessment, one after must NOT count as two newer successes', () => {
      const context = {
        cutoffTimestamp,
        profile: { reading_level: 'intermediate' },
        // 1 before assessment, 1 after assessment
        targetedOlderEvidence: [
          { targetSkill: 'local_inference', result: 'correct', observedAt: '2026-08-10T10:00:00.000Z' },
          { targetSkill: 'inference', result: 'correct', observedAt: '2026-09-08T10:00:00.000Z' },
        ],
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: assessmentDate,
          domains: {
            reading: { level: 'needs_support', confidence: 'high' },
          },
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)
      // Only 1 newer success -> does not meet 2-success threshold -> assessment weakness remains active
      expect(resolved.signals.reading.level).toBe('needs_support')
      expect(resolved.signals.reading.source).toBe('assessment')
      expect(resolved.prioritySkills.some(s => s.skill === 'inference' && s.direction === 'support')).toBe(true)
    })

    it('D. Newer failure beats secure assessment (post-assessment struggle overrides secure assessment)', () => {
      const context = {
        cutoffTimestamp,
        profile: { reading_level: 'intermediate' },
        // Post-assessment failure on inference
        targetedOlderEvidence: [
          { targetSkill: 'local_inference', result: 'incorrect', observedAt: '2026-09-08T10:00:00.000Z' },
        ],
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: assessmentDate,
          domains: {
            reading: { level: 'secure', confidence: 'high' },
          },
          skills: {
            inference: { level: 'secure', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)
      // Demonstrated weakness wins over secure assessment
      expect(resolved.signals.reading.level).toBe('needs_support')
      expect(resolved.signals.reading.source).toBe('demonstrated')
      // Inference is marked as needing support, NOT stretch
      const inferenceSkill = resolved.prioritySkills.find(s => s.skill === 'inference')
      expect(inferenceSkill?.direction).toBe('support')
      expect(inferenceSkill?.level).toBe('needs_support')
      expect(inferenceSkill?.source).toBe('demonstrated')
    })

    it('E. Evidence after claim cutoff must never influence the claimed job even if newer than assessment', () => {
      const context = {
        cutoffTimestamp: '2026-09-10T00:00:00.000Z',
        profile: { reading_level: 'intermediate' },
        // Evidence observed on Sep 15 (AFTER cutoff of Sep 10)
        targetedOlderEvidence: [
          { targetSkill: 'local_inference', result: 'correct', observedAt: '2026-09-15T10:00:00.000Z' },
          { targetSkill: 'inference', result: 'correct', observedAt: '2026-09-16T10:00:00.000Z' },
        ],
        assessmentEvidence: {
          projectionVersion: 'assessment-projection-v1',
          assessedAt: assessmentDate, // Sep 1
          domains: {
            reading: { level: 'needs_support', confidence: 'high' },
          },
          skills: {
            inference: { level: 'needs_support', confidence: 'high' },
          },
        } as AssessmentEvidenceCapsule,
      }

      const resolved = resolveLearnerEvidence(context)
      // Evidence after cutoff is strictly excluded by snapshot boundary; assessment weakness remains active
      expect(resolved.signals.reading.level).toBe('needs_support')
      expect(resolved.signals.reading.source).toBe('assessment')
      expect(resolved.prioritySkills.some(s => s.skill === 'inference' && s.direction === 'support')).toBe(true)
    })
  })
})
