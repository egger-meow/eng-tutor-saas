import { describe, expect, it } from 'vitest'
import { applyFinisherAuditPolicy, type CurriculumAuditReport } from './index.js'

function report(findings: CurriculumAuditReport['findings']): CurriculumAuditReport {
  return {
    passed: false,
    findings,
    summary: { questions: 1, words: 1, targets: 1, tokenEfficiencySignals: 0 },
  }
}

const explicitLexicalRecallPackage = {
  studentLesson: {
    practice: [
      {
        stage: 'independent',
        questions: [{ id: 'I3', itemType: 'context-clue', prompt: 'The scientist repeats the test to ______ the cause of the error.' }],
      },
    ],
  },
  qualityEvidence: {
    criticalChecks: [
      {
        id: 'cap-plan:I3',
        passed: true,
        evidence: JSON.stringify({
          learningObjective: 'Infer the contextual meaning of isolate from the reading.',
          primarySkill: 'vocabulary_in_context',
          targetCognitiveDepth: 'D1_verbatim_retrieval',
          intentionalRecall: true,
        }),
      },
    ],
  },
}

describe('Finisher audit authority boundary', () => {
  it('keeps Critic bookkeeping and proven lexical recall classification advisory', () => {
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
    ]), explicitLexicalRecallPackage)

    expect(result.passed).toBe(true)
    expect(result.findings.every((finding) => finding.severity === 'warning')).toBe(true)
  })

  it('never downgrades a bare bilingual lookup even when intentionalRecall is true', () => {
    const barePackage = structuredClone(explicitLexicalRecallPackage)
    barePackage.studentLesson.practice[0]!.questions[0]!.prompt = 'Write the English word for「海岸」.'

    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_RECALL_EXEMPTION_INVALID:I3: lexical retrieval classification mismatch',
      },
      {
        tier: 'semantic-critical',
        dimension: 'lexical-retrieval-quality',
        severity: 'critical',
        message: 'BARE_BILINGUAL_LOOKUP:I3:independent: context required',
      },
    ]), barePackage)

    expect(result.passed).toBe(false)
    expect(result.findings.every((finding) => finding.severity === 'critical')).toBe(true)
  })

  it('still hard-fails a recall exemption without package evidence proving lexical or grammar retrieval', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_RECALL_EXEMPTION_INVALID:I3: unsupported exemption',
      },
    ]), {
      studentLesson: { practice: [{ stage: 'independent', questions: [{ id: 'I3', itemType: 'inference' }] }] },
      qualityEvidence: { criticalChecks: [] },
    })

    expect(result.passed).toBe(false)
    expect(result.findings[0]?.severity).toBe('critical')
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
