import { describe, expect, it } from 'vitest'
import { auditReadingEvidenceBoundary } from './cap-precedent-audit.js'
import { applyFinisherAuditPolicy } from './finisher-audit-policy.js'

function packageWithQuestion(question: Record<string, unknown>, criticalChecks: Array<Record<string, unknown>> = []) {
  return {
    metadata: { promptVersion: '2.11.1' },
    studentLesson: {
      reading: {
        blocks: [{ type: 'paragraph', text: 'Mia checks the weather before school. She takes an umbrella because rain is likely.' }],
      },
      instruction: [{
        id: 'inst-be',
        titleZh: 'be 動詞造句',
        explanationZh: '用 be 動詞描述自己的狀態。',
        patterns: ['I am + adjective.'],
        workedExamples: [{ example: 'I am ready.', walkthroughZh: 'I 搭配 am。' }],
        commonMistakes: [],
      }],
      practice: [{ stage: 'production', questions: [question] }],
      homework: { questions: [] },
    },
    qualityEvidence: {
      precedentRefs: [],
      criticalChecks,
    },
  }
}

function finisherEvidenceReport(pkg: ReturnType<typeof packageWithQuestion>) {
  const strict = auditReadingEvidenceBoundary(pkg)
  return applyFinisherAuditPolicy({
    passed: strict.passed,
    findings: strict.findings.map((message) => ({
      tier: 'semantic-critical' as const,
      dimension: 'evidence-boundary',
      severity: 'critical' as const,
      message,
    })),
    summary: { questions: 1, words: 1, targets: 1, tokenEfficiencySignals: 0 },
  }, pkg)
}

describe('quoted instruction text evidence-boundary regression', () => {
  it('does not hard-fail a constructed grammar phrase merely because it also appears in instruction content', () => {
    const pkg = packageWithQuestion({
      id: 'P1',
      itemType: 'sentence-production',
      targetIds: ['grammar-be'],
      prompt: 'Use "I am" to write one true sentence about yourself.',
    })

    const report = finisherEvidenceReport(pkg)

    expect(report.passed).toBe(true)
    expect(report.findings).toContainEqual(expect.objectContaining({
      severity: 'warning',
      message: 'EVIDENCE_BOUNDARY_LEAKAGE:P1: quoted prompt text "I am" exists only in instruction/box content, not in primary reading prose',
    }))
  })

  it('still hard-fails an instruction-only quote when the question explicitly attributes that quote to the reading', () => {
    const pkg = packageWithQuestion(
      {
        id: 'G1',
        itemType: 'detail',
        targetIds: ['reading-detail'],
        prompt: 'According to the reading, what does "I am" show?',
        options: ['A', 'B', 'C', 'D'],
      },
      [{
        id: 'evidence-plan:G1',
        passed: true,
        evidence: JSON.stringify({
          evidenceScope: 'primary_reading',
          evidenceAnchors: [{
            location: 'studentLesson.reading.blocks.0.text',
            anchorText: 'Mia checks the weather before school.',
          }],
        }),
      }],
    )

    const report = finisherEvidenceReport(pkg)

    expect(report.passed).toBe(false)
    expect(report.findings).toContainEqual(expect.objectContaining({
      severity: 'critical',
      message: 'EVIDENCE_BOUNDARY_LEAKAGE:G1: quoted prompt text "I am" exists only in instruction/box content, not in primary reading prose',
    }))
  })
})
