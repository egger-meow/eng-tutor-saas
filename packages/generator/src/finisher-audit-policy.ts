import {
  auditCurriculumPackage as auditCurriculumPackageStrict,
  type CurriculumAuditFinding,
  type CurriculumAuditReport,
} from './audit-curriculum.js'

const OBJECTIVE_CAP_PREFIXES = [
  'CAP_AUTHORITY_UNAVAILABLE:',
  'CAP_PROVENANCE_MISMATCH:',
  'CAP_ITEM_PLAN_MISSING:',
  'CAP_ITEM_PLAN_INCOMPLETE:',
  'CAP_PRECEDENT_MISSING:',
  'CAP_PRECEDENT_UNKNOWN:',
  'CAP_EVIDENCE_BOUNDARY_VIOLATION:',
  'CAP_EVIDENCE_ANCHORS_MISSING:',
  'CAP_EVIDENCE_LOCATION_INVALID:',
  'CAP_EVIDENCE_LOCATION_NOT_FOUND:',
  'CAP_EVIDENCE_ANCHOR_TEXT_MISSING:',
  'CAP_QUOTE_EVIDENCE_MISMATCH:',
  'CAP_PROVENANCE_INCONSISTENT:',
] as const

const OBJECTIVE_EVIDENCE_PREFIXES = [
  'EVIDENCE_PLAN_MISSING:',
  'EVIDENCE_SCOPE_MISSING:',
  'EVIDENCE_BOUNDARY_VIOLATION:',
  'EVIDENCE_ANCHORS_MISSING:',
  'EVIDENCE_LOCATION_INVALID:',
  'EVIDENCE_LOCATION_NOT_FOUND:',
  'EVIDENCE_ANCHOR_TEXT_MISSING:',
  'EVIDENCE_BOUNDARY_LEAKAGE:',
  'EVIDENCE_QUOTE_MISMATCH:',
] as const

function startsWithAny(message: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => message.startsWith(prefix))
}

/**
 * Finisher is an integrity gate, not a second semantic Critic.
 *
 * Strict audit intentionally reports rich semantic/pedagogical findings so Author/Critic
 * can repair them. Publication is blocked here only when the finding is machine-provable
 * from canonical package/runtime state. Unknown future critical findings therefore default
 * to advisory instead of silently gaining production-blocking authority.
 */
function isObjectiveFinisherFinding(finding: CurriculumAuditFinding): boolean {
  if (finding.tier === 'structural-critical') return true

  if (finding.dimension === 'lexical-retrieval-quality') {
    return finding.message.startsWith('BARE_BILINGUAL_LOOKUP:')
      || finding.message.startsWith('BARE_DICTIONARY_DEFINITION:')
  }

  if (finding.dimension === 'cap-precedent-floor') {
    return startsWithAny(finding.message, OBJECTIVE_CAP_PREFIXES)
  }

  if (finding.dimension === 'evidence-boundary') {
    return startsWithAny(finding.message, OBJECTIVE_EVIDENCE_PREFIXES)
  }

  if (finding.dimension === 'grounding-freshness') {
    return finding.message.startsWith('Current grounding cannot cite a publication timestamp later than researchedAt.')
  }

  if (finding.dimension === 'alignment') {
    return finding.message.startsWith('閱讀體裁標示為對話 (dialogue)')
      || finding.message.startsWith('閱讀體裁標示為時刻表/日程 (schedule)')
      || finding.message.startsWith('閱讀體裁標示為公告 (notice)')
  }

  if (finding.dimension === 'provenance') {
    return finding.message.includes('input fingerprint')
  }

  return false
}

export function applyFinisherAuditPolicy(report: CurriculumAuditReport, _pkgInput?: unknown): CurriculumAuditReport {
  const findings = report.findings.map((finding): CurriculumAuditFinding => {
    if (finding.severity === 'critical' && !isObjectiveFinisherFinding(finding)) {
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
  return applyFinisherAuditPolicy(auditCurriculumPackageStrict(...args), args[0])
}
