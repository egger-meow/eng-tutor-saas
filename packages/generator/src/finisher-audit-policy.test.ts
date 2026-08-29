import { describe, expect, it } from 'vitest'
import { applyFinisherAuditPolicy, type CurriculumAuditReport } from './index.js'

function report(findings: CurriculumAuditReport['findings']): CurriculumAuditReport {
  return {
    passed: false,
    findings,
    summary: { questions: 1, words: 1, targets: 1, tokenEfficiencySignals: 0 },
  }
}

describe('Finisher audit authority boundary', () => {
  it('keeps Critic bookkeeping and semantic recall classification advisory', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'critic-coverage',
        severity: 'critical',
        message: 'missing canonical critic dimension label',
      },
      {
        tier: 'semantic-critical',
        dimension: 'critic-acceptance',
        severity: 'critical',
        message: 'missing canonical passed label',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_RECALL_EXEMPTION_INVALID:I3: lexical retrieval classification mismatch',
      },
    ]))

    expect(result.passed).toBe(true)
    expect(result.findings.every((finding) => finding.severity === 'warning')).toBe(true)
  })

  it('still hard-fails objective CAP provenance and evidence integrity', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_PROVENANCE_MISMATCH: wrong corpus hash',
      },
      {
        tier: 'semantic-critical',
        dimension: 'evidence-boundary',
        severity: 'critical',
        message: 'EVIDENCE_ANCHOR_TEXT_MISSING:C1',
      },
    ]))

    expect(result.passed).toBe(false)
    expect(result.findings.every((finding) => finding.severity === 'critical')).toBe(true)
  })
})
