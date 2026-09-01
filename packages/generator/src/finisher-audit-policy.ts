import {
  auditCurriculumPackage as auditCurriculumPackageStrict,
  type CurriculumAuditFinding,
  type CurriculumAuditReport,
} from './audit-curriculum.js'
import { classifyBareLexicalLookupPrompt } from './lexical-retrieval-audit.js'

function isExplicitLexicalOrGrammarRecall(pkgInput: unknown, message: string): boolean {
  const id = /^CAP_RECALL_EXEMPTION_INVALID:([^:]+):/u.exec(message)?.[1]
  if (!id || !pkgInput || typeof pkgInput !== 'object') return false

  const pkg = pkgInput as any
  const section = (pkg.studentLesson?.practice ?? []).find((candidate: any) =>
    candidate?.stage !== 'cap-transfer' && (candidate?.questions ?? []).some((question: any) => question?.id === id),
  )
  if (!section) return false

  const question = section.questions.find((candidate: any) => candidate?.id === id)
  if (typeof question?.prompt !== 'string' || classifyBareLexicalLookupPrompt(question.prompt)) return false

  const check = (pkg.qualityEvidence?.criticalChecks ?? []).find((candidate: any) =>
    candidate?.id === `cap-plan:${id}` && candidate?.passed === true && typeof candidate?.evidence === 'string',
  )
  if (!check) return false

  try {
    const plan = JSON.parse(check.evidence) as Record<string, unknown>
    const skill = typeof plan.primarySkill === 'string' ? plan.primarySkill : ''
    const objective = typeof plan.learningObjective === 'string' ? plan.learningObjective.toLocaleLowerCase() : ''
    const depth = typeof plan.targetCognitiveDepth === 'string' ? plan.targetCognitiveDepth : ''
    const explicitDomain = skill === 'vocabulary_in_context' || skill === 'grammar_in_context'
    const explicitRetrieval = depth === 'D1_verbatim_retrieval' || /retrieve|recover|meaning|form/u.test(objective)
    return plan.intentionalRecall === true && explicitDomain && explicitRetrieval
  } catch {
    return false
  }
}

/**
 * The strict audit remains useful as diagnostic evidence for Author/Critic repair.
 * The deterministic Finisher only hard-fails objective integrity. Critic dimension
 * naming/coverage is bookkeeping, while a recall exemption remains hard unless the
 * package itself proves it is explicit lexical/grammar retrieval outside CAP transfer.
 */
export function applyFinisherAuditPolicy(report: CurriculumAuditReport, pkgInput?: unknown): CurriculumAuditReport {
  const findings = report.findings.map((finding): CurriculumAuditFinding => {
    const criticBookkeeping = finding.dimension === 'critic-coverage' || finding.dimension === 'critic-acceptance'
    const supportedRecallClassification = finding.dimension === 'cap-precedent-floor'
      && finding.message.startsWith('CAP_RECALL_EXEMPTION_INVALID:')
      && isExplicitLexicalOrGrammarRecall(pkgInput, finding.message)

    if (finding.severity === 'critical' && (criticBookkeeping || supportedRecallClassification)) {
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
