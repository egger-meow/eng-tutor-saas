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
  'EVIDENCE_QUOTE_MISMATCH:',
] as const

const PEDAGOGICAL_STRUCTURAL_PATHS = [
  'learningPlan.targets',
  'studentLesson.opening.goalsZh',
  'studentLesson.reading.wordCount',
  'studentLesson.instruction.',
  'studentLesson.selfCheckZh',
  'studentLesson.homework.questions',
  'grounding.claims.',
] as const

const PASSAGE_QUOTE_ATTRIBUTION = /(?:\b(?:according to|from)\s+(?:the\s+)?(?:reading|passage|article|text)\b|\bin\s+(?:the\s+)?(?:reading|passage|article|text|sentence|paragraph(?:\s+\d+)?)\b|\b(?:the\s+)?(?:reading|passage|article|text|writer|author)\s+(?:says?|states?|writes?|notes?|explains?|mentions?|includes?|uses?)\b)/iu
const CONSTRUCTED_QUOTE_SPEAKER = /\b(?:(?:a|one|another|your)\s+)?(?:student|classmate|learner|reader|friend|person|someone|somebody)\s+(?:says?|claims?|argues?|thinks?|suggests?|writes?)\s*,?\s*$/iu

function startsWithAny(message: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => message.startsWith(prefix))
}

function findQuestionPrompt(pkgInput: unknown, questionId: string): string | null {
  if (!pkgInput || typeof pkgInput !== 'object') return null
  const lesson = (pkgInput as any).studentLesson
  const practice = Array.isArray(lesson?.practice) ? lesson.practice : []
  const homework = Array.isArray(lesson?.homework?.questions) ? lesson.homework.questions : []
  for (const question of [...practice.flatMap((section: any) => section?.questions ?? []), ...homework]) {
    if (question?.id === questionId && typeof question.prompt === 'string') return question.prompt
  }
  return null
}

function quotedLeakClaimsPassageSource(message: string, pkgInput: unknown): boolean {
  const match = /^EVIDENCE_BOUNDARY_LEAKAGE:([^:]+): quoted prompt text "([\s\S]+)" exists only in instruction\/box content/u.exec(message)
  if (!match) return false
  const prompt = findQuestionPrompt(pkgInput, match[1]!)
  if (!prompt) return false

  const cleanQuote = match[2]!
  const quotedForms = [`"${cleanQuote}"`, `“${cleanQuote}”`, `'${cleanQuote}'`, `‘${cleanQuote}’`]
  const rawQuoted = quotedForms.find((form) => prompt.includes(form))
  if (!rawQuoted) return false

  const quoteIndex = prompt.indexOf(rawQuoted)
  const prefix = prompt.slice(Math.max(0, quoteIndex - 160), quoteIndex)
  if (CONSTRUCTED_QUOTE_SPEAKER.test(prefix)) return false
  const start = Math.max(0, quoteIndex - 180)
  const end = Math.min(prompt.length, quoteIndex + rawQuoted.length + 180)
  return PASSAGE_QUOTE_ATTRIBUTION.test(prompt.slice(start, end))
}

function isPedagogicalStructuralCardinality(finding: CurriculumAuditFinding): boolean {
  if (finding.tier !== 'structural-critical' || finding.dimension !== 'deterministic-validation') return false
  if (!/(?:too_small|too_big|expected|at least|at most|>=|<=|minimum|maximum|items|number|characters|tokens)/iu.test(finding.message)) return false
  return PEDAGOGICAL_STRUCTURAL_PATHS.some((path) => finding.message.startsWith(path))
}

function isSemanticBookkeepingValidation(finding: CurriculumAuditFinding): boolean {
  if (finding.tier !== 'structural-critical' || finding.dimension !== 'deterministic-validation') return false
  return finding.message === 'qualityEvidence.criticalChecks: Every critical quality check must pass before publication'
    || finding.message === 'qualityEvidence.criticalChecks: Current grounding requires a passed grounding-freshness critical check'
}

/**
 * Finisher is an integrity gate, not a second semantic Critic.
 *
 * Strict audit intentionally reports rich semantic/pedagogical findings so Author/Critic
 * can repair them. Publication is blocked here only when the finding is machine-provable
 * from canonical package/runtime state. Unknown future critical findings therefore default
 * to advisory instead of silently gaining production-blocking authority.
 */
function isObjectiveFinisherFinding(finding: CurriculumAuditFinding, pkgInput?: unknown): boolean {
  if (isSemanticBookkeepingValidation(finding) || isPedagogicalStructuralCardinality(finding)) return false
  if (finding.tier === 'structural-critical') return true

  if (finding.dimension === 'lexical-retrieval-quality') {
    return finding.message.startsWith('BARE_BILINGUAL_LOOKUP:')
      || finding.message.startsWith('BARE_DICTIONARY_DEFINITION:')
  }

  if (finding.dimension === 'cap-precedent-floor') {
    return startsWithAny(finding.message, OBJECTIVE_CAP_PREFIXES)
  }

  if (finding.dimension === 'evidence-boundary') {
    if (finding.message.includes(': declared evidence anchor ')) return true
    if (finding.message.includes(': quoted prompt text ')) return quotedLeakClaimsPassageSource(finding.message, pkgInput)
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

export function applyFinisherAuditPolicy(report: CurriculumAuditReport, pkgInput?: unknown): CurriculumAuditReport {
  const findings = report.findings.map((finding): CurriculumAuditFinding => {
    if (finding.severity === 'critical' && !isObjectiveFinisherFinding(finding, pkgInput)) {
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
