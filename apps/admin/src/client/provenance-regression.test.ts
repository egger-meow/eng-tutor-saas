import { describe, expect, it } from 'vitest'
import {
  assessModelQualityProfileProvenance,
  classifyQualityEra,
  hasModelQualityProfileProvenance,
  isCompleteProfileEvidence,
} from './types.js'

describe('current production provenance classification', () => {
  it('identifies complete and valid model-profile provenance', () => {
    const validItem = {
      canonicalSource: {
        metadata: {
          schemaVersion: '2.2.0',
          promptVersion: '2.4.0',
        },
        qualityEvidence: {
          criticalChecks: [
            {
              id: 'model-quality-profile',
              passed: true,
              evidence: 'actualModel=gemini-3.7-flash | resolvedQualityProfile=gemini-3.7-flash | qualityProfileVersion=1.0.0 | engineVersion=1.0.1',
            },
          ],
        },
      },
    }

    expect(isCompleteProfileEvidence(validItem.canonicalSource.qualityEvidence.criticalChecks[0].evidence)).toBe(true)
    expect(hasModelQualityProfileProvenance(validItem)).toBe(true)
    const assessment = assessModelQualityProfileProvenance(validItem)
    expect(assessment.status).toBe('valid')
    expect(assessment.isValid).toBe(true)
    expect(classifyQualityEra(validItem)).toBe('engine_v1')
  })

  it('surfaces malformed or incomplete provenance as INVALID', () => {
    const malformedIncompleteEvidence = {
      schemaVersion: '2.2.0',
      promptVersion: '2.4.0',
      engineVersion: '1.0.1',
      qualityEvidence: {
        criticalChecks: [
          {
            id: 'model-quality-profile',
            passed: true,
            evidence: 'actualModel=gpt-5', // missing resolvedQualityProfile, qualityProfileVersion, engineVersion
          },
        ],
      },
    }

    expect(hasModelQualityProfileProvenance(malformedIncompleteEvidence)).toBe(false)
    const assessment = assessModelQualityProfileProvenance(malformedIncompleteEvidence)
    expect(assessment.status).toBe('invalid')
    expect(assessment.isValid).toBe(false)
    expect(assessment.rule).toBe('MODEL_QUALITY_PROFILE_PROVENANCE_INVALID')
    // Still kept in Current (engine_v1) so the violation is surfaced, not laundered as Historical
    expect(classifyQualityEra(malformedIncompleteEvidence)).toBe('engine_v1')

    const failedCheck = {
      schemaVersion: '2.2.0',
      promptVersion: '2.4.0',
      engineVersion: '1.0.1',
      qualityEvidence: {
        criticalChecks: [
          {
            id: 'model-quality-profile',
            passed: false,
            evidence: 'actualModel=gemini-3.7-flash | resolvedQualityProfile=gemini-3.7-flash | qualityProfileVersion=1.0.0 | engineVersion=1.0.1',
          },
        ],
      },
    }

    expect(hasModelQualityProfileProvenance(failedCheck)).toBe(false)
    const assessmentFailed = assessModelQualityProfileProvenance(failedCheck)
    expect(assessmentFailed.status).toBe('invalid')
    expect(assessmentFailed.rule).toBe('MODEL_QUALITY_PROFILE_PROVENANCE_INVALID')
    expect(classifyQualityEra(failedCheck)).toBe('engine_v1')
  })

  it('keeps current schema/prompt submissions in Engine v1 even when provenance is missing and flags as MISSING', () => {
    const currentWithoutProfile = {
      schemaVersion: '2.2.0',
      promptVersion: '2.4.0',
      engineVersion: '1.0.1',
    }

    expect(hasModelQualityProfileProvenance(currentWithoutProfile)).toBe(false)
    const assessment = assessModelQualityProfileProvenance(currentWithoutProfile)
    expect(assessment.status).toBe('missing')
    expect(assessment.rule).toBe('MODEL_QUALITY_PROFILE_PROVENANCE_MISSING')
    expect(classifyQualityEra(currentWithoutProfile)).toBe('engine_v1')
  })

  it('still classifies genuinely legacy schema/prompt evidence as historical', () => {
    expect(classifyQualityEra({ schemaVersion: '2.1.0', promptVersion: '2.3.0' })).toBe('historical')
  })
})
