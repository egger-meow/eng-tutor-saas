import { access, readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { validateCurriculumPackage } from './validate-curriculum-package.js'
import type { CurriculumPackage } from './curriculum-package-schema.js'

export type CurriculumAuditFinding = { dimension: string; severity: 'info' | 'warning' | 'critical'; message: string }
export type CurriculumAuditReport = { passed: boolean; findings: CurriculumAuditFinding[]; summary: { questions: number; words: number; targets: number; tokenEfficiencySignals: number } }

function words(value: string): number { return value.trim().split(/\s+/u).filter(Boolean).length }
function cjk(value: string): number { return (value.match(/[\u3400-\u9fff]/gu) ?? []).length }

/** Deterministic publish gate. This complements (never replaces) the independent LLM critic. */
export function auditCurriculumPackage(input: unknown): CurriculumAuditReport {
  const parsed = validateCurriculumPackage(input)
  if (!parsed.success) return { passed: false, findings: parsed.issues.map((issue) => ({ dimension: 'deterministic-validation', severity: 'critical', message: `${issue.path}: ${issue.message}` })), summary: { questions: 0, words: 0, targets: 0, tokenEfficiencySignals: 0 } }
  const pkg: CurriculumPackage = parsed.curriculumPackage
  const questions = [...pkg.studentLesson.practice.flatMap((stage) => stage.questions), ...pkg.studentLesson.homework.questions]
  const passageWords = pkg.studentLesson.reading.paragraphs.reduce((total, paragraph) => total + words(paragraph), 0)
  const findings: CurriculumAuditFinding[] = []
  const add = (dimension: string, severity: CurriculumAuditFinding['severity'], message: string) => findings.push({ dimension, severity, message })

  if (pkg.studentLesson.opening.goalsZh.length < 2 || cjk(pkg.studentLesson.opening.howToUseZh) < 8) add('self-study', 'critical', '開場沒有足夠的中文目標或使用說明。')
  if (pkg.studentLesson.instruction.some((section) => section.workedExamples.length < 2 || section.commonMistakes.length < 1)) add('self-study', 'critical', '每個新概念都需要至少兩個 worked examples 與一個錯誤對照。')
  if (pkg.studentLesson.reading.paragraphs.length < 3 || passageWords < 180) add('substance', 'warning', `閱讀只有 ${passageWords} 字，可能不足以承載 planned skill。`)
  if (pkg.studentLesson.vocabulary.length > 15) add('cognitive-load', 'critical', '核心單字超過 15 個，可能造成不必要負擔。')
  if (!pkg.studentLesson.practice.some((stage) => stage.stage === 'retrieval')) add('retrieval', 'critical', '缺少隔天或延遲提取練習。')
  if (questions.length > 70) add('token-efficiency', 'warning', '題目超過 70 題；請刪除重複題並保留能區分學習狀態的證據。')

  const targetIds = new Set(pkg.learningPlan.targets.map((target) => target.id))
  const covered = new Set(questions.flatMap((question) => question.targetIds))
  for (const targetId of targetIds) if (!covered.has(targetId)) add('alignment', 'critical', `學習目標 ${targetId} 沒有任何可觀察題目。`)
  const targetStages = new Map<string, Set<string>>()
  for (const section of pkg.studentLesson.practice) {
    if (cjk(section.instructionsZh) < 4) add('self-study', 'critical', `${section.id} 缺少足以讓孩子獨立執行的中文任務說明。`)
    for (const question of section.questions) {
      for (const targetId of question.targetIds) {
        const stages = targetStages.get(targetId) ?? new Set<string>()
        stages.add(section.stage)
        targetStages.set(targetId, stages)
      }
    }
  }
  for (const question of pkg.studentLesson.homework.questions) {
    for (const targetId of question.targetIds) {
      const stages = targetStages.get(targetId) ?? new Set<string>()
      stages.add('homework')
      targetStages.set(targetId, stages)
    }
  }
  for (const targetId of targetIds) {
    const stages = targetStages.get(targetId) ?? new Set<string>()
    if (stages.size < 2) add('evidence-plan', 'critical', `學習目標 ${targetId} 只在單一階段出現，無法比較提示前後的表現。`)
    if (![...stages].some((stage) => ['independent', 'cap-transfer', 'production', 'retrieval', 'homework'].includes(stage))) {
      add('evidence-plan', 'critical', `學習目標 ${targetId} 沒有無提示、轉移或延遲提取證據。`)
    }
  }
  const stageNames = new Set(pkg.studentLesson.practice.map((stage) => stage.stage))
  for (const stage of ['guided', 'independent', 'cap-transfer', 'production', 'retrieval'] as const) if (!stageNames.has(stage)) add('self-study', 'critical', `缺少 ${stage} 階段。`)

  const interestText = [...pkg.learnerSnapshot.specificInterests, ...pkg.learnerSnapshot.changedInterests].join(' ').toLocaleLowerCase()
  const lessonText = JSON.stringify({ title: pkg.studentLesson.reading.title, context: pkg.studentLesson.reading.contextZh, paragraphs: pkg.studentLesson.reading.paragraphs, strategy: pkg.learningPlan.personalizationStrategy }).toLocaleLowerCase()
  if (interestText && !interestText.split(/[,，、;；\s]+/u).filter((term) => term.length >= 2).some((term) => lessonText.includes(term))) add('personalization', 'warning', '具體興趣沒有在教材情境或個人化策略留下可追溯證據。')
  if (pkg.qualityEvidence.feedbackApplied.length === 0) add('feedback-loop', 'critical', '沒有記錄本週如何使用回饋。')
  if (pkg.trackingDelta.hypothesesToVerify.length === 0) add('tracking', 'critical', '沒有下一週待驗證假設。')
  if (pkg.metadata.inputFingerprint === 'unknown') add('provenance', 'critical', '缺少可重現的 input fingerprint。')
  if (pkg.answers.some((answer) => cjk(answer.explanationZh) < 4)) add('answer-integrity', 'critical', '每個答案都需要能協助孩子自行訂正的簡短中文理由。')
  const followUpCount = pkg.answers.filter((answer) => answer.followUpZh !== null).length
  if (followUpCount > Math.max(2, Math.ceil(pkg.answers.length / 4))) add('parent-burden', 'warning', `有 ${followUpCount} 題要求額外追問；家長答案應以核對答案為主。`)

  const tokenEfficiencySignals = [pkg.learnerSnapshot.recurringMistakes.length > 12, pkg.learnerSnapshot.reviewDue.length > 20, pkg.learnerSnapshot.specificInterests.length > 12, questions.length > 50].filter(Boolean).length
  if (tokenEfficiencySignals >= 2) add('token-efficiency', 'warning', `context 有 ${tokenEfficiencySignals} 個過長訊號，應改用摘要與穩定 ID。`)
  return { passed: !findings.some((finding) => finding.severity === 'critical'), findings, summary: { questions: questions.length, words: passageWords, targets: pkg.learningPlan.targets.length, tokenEfficiencySignals } }
}

if (process.argv[1]?.endsWith('audit-curriculum.ts')) {
  const path = process.argv.slice(2).find((argument) => argument !== '--')
  if (!path) throw new Error('Usage: tsx src/audit-curriculum.ts <curriculum-package.json>')
  const candidates = isAbsolute(path) ? [path] : [resolve(process.cwd(), path), resolve(process.cwd(), '..', '..', path)]
  let filePath: string | undefined
  for (const candidate of candidates) {
    try { await access(candidate); filePath = candidate; break } catch { /* try next base */ }
  }
  if (!filePath) throw new Error(`Curriculum package not found. Tried: ${candidates.join(', ')}`)
  const input = JSON.parse(await readFile(filePath, 'utf8')) as unknown
  process.stdout.write(`${JSON.stringify(auditCurriculumPackage(input), null, 2)}\n`)
}
