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
  it('defaults unknown and pseudo-semantic critical findings to advisory', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'future-new-quality-rule',
        severity: 'critical',
        message: 'A future heuristic was added without explicit Finisher authority.',
      },
      {
        tier: 'semantic-critical',
        dimension: 'retrieval',
        severity: 'critical',
        message: '缺少隔天或延遲提取練習。',
      },
      {
        tier: 'semantic-critical',
        dimension: 'self-study',
        severity: 'critical',
        message: '中文任務說明可能不夠可執行。',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_PRECEDENT_IRRELEVANT:C1: consultation must be relevant by skill or reasoning structure',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_DEPTH_COLLAPSE:C2: D3/D4 reasoning cannot claim only word/clause evidence',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_COPY_OVERLAP:C3: multiple five-word phrase fingerprints overlap historical anchor material',
      },
    ]))

    expect(result.passed).toBe(true)
    expect(result.findings.every((finding) => finding.severity === 'warning')).toBe(true)
  })

  it('keeps Critic bookkeeping and CAP recall classification advisory', () => {
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

  it('never downgrades exact bare bilingual or dictionary lookup blockers', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'lexical-retrieval-quality',
        severity: 'critical',
        message: 'BARE_BILINGUAL_LOOKUP:I3:independent: context required',
      },
      {
        tier: 'semantic-critical',
        dimension: 'lexical-retrieval-quality',
        severity: 'critical',
        message: 'BARE_DICTIONARY_DEFINITION:H1:homework: context required',
      },
    ]))

    expect(result.passed).toBe(false)
    expect(result.findings.every((finding) => finding.severity === 'critical')).toBe(true)
  })

  it('still hard-fails objective CAP authority, provenance, required-reference, and evidence integrity', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_AUTHORITY_UNAVAILABLE: production CAP runtime is not authoritative',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_PROVENANCE_MISMATCH: wrong corpus hash',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_ITEM_PLAN_MISSING:C1: every normal assessment/application item requires an internal CAP assessment plan',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_PRECEDENT_UNKNOWN:C1:cap-ffffffffffff',
      },
      {
        tier: 'semantic-critical',
        dimension: 'cap-precedent-floor',
        severity: 'critical',
        message: 'CAP_PROVENANCE_INCONSISTENT: aggregate refs do not match per-item refs',
      },
      {
        tier: 'semantic-critical',
        dimension: 'evidence-boundary',
        severity: 'critical',
        message: 'EVIDENCE_ANCHOR_TEXT_MISSING:C1',
      },
      {
        tier: 'semantic-critical',
        dimension: 'evidence-boundary',
        severity: 'critical',
        message: 'EVIDENCE_LOCATION_INVALID:C2:studentLesson.instruction.0.explanationZh',
      },
    ]))

    expect(result.passed).toBe(false)
    expect(result.findings.every((finding) => finding.severity === 'critical')).toBe(true)
  })

  it('keeps objective metadata contradictions blocking while percentage/count heuristics stay advisory', () => {
    const result = applyFinisherAuditPolicy(report([
      {
        tier: 'semantic-critical',
        dimension: 'grounding-freshness',
        severity: 'critical',
        message: 'Current grounding cannot cite a publication timestamp later than researchedAt.',
      },
      {
        tier: 'semantic-critical',
        dimension: 'alignment',
        severity: 'critical',
        message: '閱讀體裁標示為對話 (dialogue)，但內容未包含任何 dialogue blocks。',
      },
      {
        tier: 'semantic-critical',
        dimension: 'provenance',
        severity: 'critical',
        message: '缺少可重現的 input fingerprint。',
      },
      {
        tier: 'semantic-critical',
        dimension: 'mcq-position-leakage',
        severity: 'critical',
        message: '選擇題正確答案位置比例超過 60%。',
      },
      {
        tier: 'semantic-critical',
        dimension: 'workload-calibration',
        severity: 'critical',
        message: 'BUDGET_UNDERFILLED: fixed percentage band heuristic.',
      },
    ]))

    expect(result.passed).toBe(false)
    expect(result.findings.slice(0, 3).every((finding) => finding.severity === 'critical')).toBe(true)
    expect(result.findings.slice(3).every((finding) => finding.severity === 'warning')).toBe(true)
  })
})
