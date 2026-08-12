import { readFile } from 'node:fs/promises'
import { validateCurriculumPackage } from './validate-curriculum-package.js'
import type { CurriculumPackage } from './curriculum-package-schema.js'

export type CurriculumAuditFinding = { dimension: string; severity: 'info' | 'warning' | 'critical'; message: string }
export type CurriculumAuditReport = { passed: boolean; findings: CurriculumAuditFinding[]; summary: { questions: number; words: number; targets: number; tokenEfficiencySignals: number } }

function words(value: string): number { return value.trim().split(/\s+/u).filter(Boolean).length }

export function auditCurriculumPackage(input: unknown): CurriculumAuditReport {
  const parsed = validateCurriculumPackage(input)
  if (!parsed.success) return { passed: false, findings: parsed.issues.map((issue) => ({ dimension: 'deterministic-validation', severity: 'critical', message: `${issue.path}: ${issue.message}` })), summary: { questions: 0, words: 0, targets: 0, tokenEfficiencySignals: 0 } }
  const pkg: CurriculumPackage = parsed.curriculumPackage
  const questions = [...pkg.studentLesson.practice.flatMap((stage) => stage.questions), ...pkg.studentLesson.homework.questions]
  const passageWords = pkg.studentLesson.reading.paragraphs.reduce((total, paragraph) => total + words(paragraph), 0)
  const findings: CurriculumAuditFinding[] = []
  const add = (dimension: string, severity: CurriculumAuditFinding['severity'], message: string) => findings.push({ dimension, severity, message })

  if (pkg.studentLesson.opening.goalsZh.length < 2) add('self-study', 'critical', '學生教材沒有足夠明確的本週目標。')
  if (pkg.studentLesson.instruction.some((section) => section.workedExamples.length < 2)) add('self-study', 'critical', '每個教學區都需要至少兩個 worked examples。')
  if (pkg.studentLesson.reading.paragraphs.length < 3 || passageWords < 180) add('substance', 'warning', `閱讀只有 ${passageWords} 字，可能不足以承載推論練習。`)
  if (pkg.studentLesson.vocabulary.length > 15) add('cognitive-load', 'critical', '核心單字超過每週上限。')
  if (questions.length > 70) add('token-efficiency', 'warning', '題目數過高，應檢查是否重複測量同一能力。')
  if (pkg.learnerSnapshot.specificInterests.length === 0) add('personalization', 'info', '本週沒有具體興趣；確認這是資料缺漏還是刻意不使用。')
  if (pkg.qualityEvidence.feedbackApplied.length === 0) add('feedback-loop', 'critical', '沒有記錄本次如何應用回饋。')
  if (pkg.trackingDelta.hypothesesToVerify.length === 0) add('tracking', 'critical', '沒有下一週待驗證假設。')
  if (pkg.metadata.inputFingerprint === 'unknown') add('provenance', 'critical', '缺少可重現的 input fingerprint。')

  const tokenEfficiencySignals = [pkg.learnerSnapshot.recurringMistakes.length > 12, pkg.learnerSnapshot.reviewDue.length > 20, pkg.learnerSnapshot.specificInterests.length > 12, questions.length > 50].filter(Boolean).length
  if (tokenEfficiencySignals >= 2) add('token-efficiency', 'warning', `context 有 ${tokenEfficiencySignals} 個膨脹訊號，應壓縮歷史或移除無關資料。`)
  return { passed: !findings.some((finding) => finding.severity === 'critical'), findings, summary: { questions: questions.length, words: passageWords, targets: pkg.learningPlan.targets.length, tokenEfficiencySignals } }
}

if (process.argv[1]?.endsWith('audit-curriculum.ts')) {
  const path = process.argv[2]
  if (!path) throw new Error('Usage: tsx src/audit-curriculum.ts <curriculum-package.json>')
  const input = JSON.parse(await readFile(path, 'utf8')) as unknown
  process.stdout.write(`${JSON.stringify(auditCurriculumPackage(input), null, 2)}\n`)
}
