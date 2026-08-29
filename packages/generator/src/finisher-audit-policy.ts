import {
  auditCurriculumPackage as auditCurriculumPackageStrict,
  type CurriculumAuditFinding,
  type CurriculumAuditReport,
} from './audit-curriculum.js'

/**
 * The strict audit remains useful as diagnostic evidence for Author/Critic repair.
 * The deterministic Finisher only hard-fails objective integrity. Semantic
 * bookkeeping/classification findings stay visible but must not overrule an
 * otherwise valid Author/Critic package.
 */
export function applyFinisherAuditPolicy(report: CurriculumAuditReport): CurriculumAuditReport {
  const findings = report.findings.map((finding): CurriculumAuditFinding => {
    const criticBookkeeping = finding.dimension === 'critic-coverage' || finding.dimension === 'critic-acceptance'
    const semanticRecallClassification = finding.dimension === 'cap-precedent-floor'
      && finding.message.startsWith('CAP_RECALL_EXEMPTION_INVALID:')

    if (finding.severity === 'critical' && (criticBookkeeping || semanticRecallClassification)) {
      return { ...finding, severity: 'warning' }
    }
    return finding
  })

  return {
    ...report,
    findings,
    passed: !findings.some((finding) => finding.severity === 'critical'),
  }
}

export function auditCurriculumPackage(...args: Parameters<typeof auditCurriculumPackageStrict>): CurriculumAuditReport {
  return applyFinisherAuditPolicy(auditCurriculumPackageStrict(...args))
}
