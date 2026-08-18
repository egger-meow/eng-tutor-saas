import { access, readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { findForbiddenPersonalizationJargon, validateCurriculumPackage } from './validate-curriculum-package.js'
import type { CurriculumPackage } from './curriculum-package-schema.js'
import { extractBlockTexts } from './normalize-curriculum-package.js'
import vocabulary2000 from './curriculum-maps/official/vocabulary-2000.json' with { type: 'json' }

export type CurriculumAuditTier = 'auto-derived' | 'structural-critical' | 'semantic-critical'

export type CurriculumAuditFinding = {
  tier: CurriculumAuditTier
  dimension: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export type CurriculumAuditReport = {
  passed: boolean
  findings: CurriculumAuditFinding[]
  summary: { questions: number; words: number; targets: number; tokenEfficiencySignals: number }
}

const canonicalVocabSet = new Set(vocabulary2000.map((v) => v.word.toLowerCase()))

function isApprovedWord(word: string, taughtWords: Set<string>): boolean {
  const w = word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gu, '')
  if (!w || /^\d+$/u.test(w) || w.length <= 2) return true
  if (taughtWords.has(w) || canonicalVocabSet.has(w)) return true

  // Common basic contractions / auxiliaries / compounds / test instructional terms
  if ([
    'cannot', 'don', 't', 'doesn', 'didn', 'won', 'can', 'could', 'not', 'isn', 'aren', 'wasn', 'weren',
    'hasn', 'haven', 'hadn', 'couldn', 'shouldn', 'wouldn', 'should', 'would', 'might', 'must',
    's', 're', 've', 'll', 'd', 'm',
    'option', 'opt', 'recall', 'blank', 'item', 'choice', 'passage', 'sentence', 'statement', 'question',
  ].includes(w)) {
    return true
  }

  // Common inflections & stems (against both official 2000 vocabulary and weekly taught words)
  const isBase = (stem: string) => taughtWords.has(stem) || canonicalVocabSet.has(stem)

  if (w.endsWith('s') && isBase(w.slice(0, -1))) return true
  if (w.endsWith('es') && isBase(w.slice(0, -2))) return true
  if (w.endsWith('ies') && isBase(w.slice(0, -3) + 'y')) return true
  if (w.endsWith('ed') && (isBase(w.slice(0, -2)) || isBase(w.slice(0, -1)))) return true
  if (w.endsWith('ied') && isBase(w.slice(0, -3) + 'y')) return true
  if (w.endsWith('ing') && (isBase(w.slice(0, -3)) || isBase(w.slice(0, -3) + 'e') || isBase(w.slice(0, -4)))) return true
  if (w.endsWith('ly') && (isBase(w.slice(0, -2)) || isBase(w.slice(0, -1)))) return true
  if (w.endsWith('y') && isBase(w.slice(0, -1))) return true // e.g. shine -> shiny
  if (w.endsWith('er') && (isBase(w.slice(0, -2)) || isBase(w.slice(0, -1)))) return true
  if (w.endsWith('est') && (isBase(w.slice(0, -3)) || isBase(w.slice(0, -2)))) return true
  if (w.endsWith('ty') && (isBase(w.slice(0, -2)) || isBase(w.slice(0, -1)))) return true
  if (w.endsWith('ion') && (isBase(w.slice(0, -3)) || isBase(w.slice(0, -3) + 'e') || isBase(w.slice(0, -4)) || isBase(w.slice(0, -4) + 'e') || isBase(w.slice(0, -5)))) return true

  return false
}

function getValidWordVariants(word: string): Set<string> {
  const w = word.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gu, '')
  const variants = new Set<string>([w])
  if (!w || w.length < 2) return variants

  // Controlled inflection rules
  // 1. Plural / 3rd person singular s/es/ies
  if (w.endsWith('y') && !/[aeiou]y$/u.test(w)) {
    variants.add(w.slice(0, -1) + 'ies')
    variants.add(w.slice(0, -1) + 'ied')
  } else if (/(?:s|sh|ch|x|z|o)$/u.test(w)) {
    variants.add(w + 'es')
  } else if (w.endsWith('e')) {
    variants.add(w + 's')
    variants.add(w + 'd')
    variants.add(w.slice(0, -1) + 'ing')
  } else {
    variants.add(w + 's')
  }

  // 2. Past tense & participles ed / ing
  if (!w.endsWith('e')) {
    variants.add(w + 'ed')
    variants.add(w + 'ing')
    if (/[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnprstvz]$/u.test(w) && w.length >= 3) {
      const lastChar = w.slice(-1)
      variants.add(w + lastChar + 'ed')
      variants.add(w + lastChar + 'ing')
      variants.add(w + lastChar + 'er')
    }
  }

  // 3. Adverb / adjective / comparative
  variants.add(w + 'ly')
  variants.add(w + 'er')
  variants.add(w + 'est')

  // 4. Reverse stem (in case target word in vocab list is already inflected)
  if (w.endsWith('ies') && w.length > 4) variants.add(w.slice(0, -3) + 'y')
  if (w.endsWith('ied') && w.length > 4) variants.add(w.slice(0, -3) + 'y')
  if (w.endsWith('ing') && w.length > 4) {
    variants.add(w.slice(0, -3))
    variants.add(w.slice(0, -3) + 'e')
  }
  if (w.endsWith('ed') && w.length > 3) {
    variants.add(w.slice(0, -2))
    variants.add(w.slice(0, -1))
  }
  if (w.endsWith('es') && w.length > 3) {
    variants.add(w.slice(0, -2))
  }
  if (w.endsWith('s') && w.length > 2) {
    variants.add(w.slice(0, -1))
  }

  return variants
}

function wordAppearsInText(word: string, text: string): boolean {
  const cleanWord = word.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gu, '')
  if (!cleanWord) return true
  const tokens = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/gu) ?? []
  const tokenSet = new Set(tokens)
  const variants = getValidWordVariants(cleanWord)
  for (const variant of variants) {
    if (tokenSet.has(variant)) return true
  }
  return false
}

const STANDARD_EDUCATIONAL_PROPER_NOUNS = [
  // Days of the week
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  // Months
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  // Common educational character names in Taiwanese junior-high textbooks
  'alex', 'allen', 'amy', 'andy', 'ann', 'bella', 'ben', 'chris', 'cindy', 'david', 'diana', 'emma', 'eric', 'ethan', 'eva', 'gary', 'grace', 'hank', 'helen', 'jack', 'jay', 'jerry', 'john', 'jonathan', 'kelly', 'ken', 'kevin', 'kobe', 'leo', 'lisa', 'lucy', 'mary', 'max', 'may', 'mia', 'mike', 'mina', 'patty', 'paul', 'peggy', 'peter', 'ross', 'roy', 'sam', 'sara', 'sarah', 'tom', 'tony', 'vicky', 'willy', 'zoe',
  // Common geographical names in curriculum
  'taiwan', 'taipei', 'kaohsiung', 'taichung', 'tainan', 'taitung', 'hualien', 'yilan', 'japan', 'tokyo', 'america', 'usa', 'uk', 'london', 'canada', 'australia', 'china', 'asia', 'europe',
]

function buildAllowedEntitiesSet(pkg: CurriculumPackage): Set<string> {
  const allowed = new Set<string>(STANDARD_EDUCATIONAL_PROPER_NOUNS)

  // 1. Dialogue speakers
  for (const block of pkg.studentLesson.reading.blocks) {
    if (block.type === 'dialogue' && block.speaker) {
      for (const token of block.speaker.toLowerCase().match(/[a-z0-9]+/gu) ?? []) {
        if (token.length >= 2) allowed.add(token)
      }
    }
  }

  // 2. Child interests & profile identifiers
  const interestSources = [
    ...pkg.learnerSnapshot.specificInterests,
    ...pkg.learnerSnapshot.changedInterests,
    pkg.metadata.childId,
  ]
  for (const source of interestSources) {
    if (typeof source === 'string') {
      for (const token of source.toLowerCase().match(/[a-z0-9]+/gu) ?? []) {
        if (token.length >= 2) allowed.add(token)
      }
    }
  }

  return allowed
}

function words(value: string): number { return value.trim().split(/\s+/u).filter(Boolean).length }
function cjk(value: string): number { return (value.match(/[\u3400-\u9fff]/gu) ?? []).length }

/** Deterministic publish gate. This complements (never replaces) the independent LLM critic. */
export function auditCurriculumPackage(input: unknown): CurriculumAuditReport {
  const parsed = validateCurriculumPackage(input)
  if (!parsed.success) {
    return {
      passed: false,
      findings: parsed.issues.map((issue) => ({
        tier: 'structural-critical',
        dimension: 'deterministic-validation',
        severity: 'critical',
        message: `${issue.path}: ${issue.message}`,
      })),
      summary: { questions: 0, words: 0, targets: 0, tokenEfficiencySignals: 0 },
    }
  }
  const pkg: CurriculumPackage = parsed.curriculumPackage
  const questions = [...pkg.studentLesson.practice.flatMap((stage) => stage.questions), ...pkg.studentLesson.homework.questions]
  const blockTexts = extractBlockTexts(pkg.studentLesson.reading.blocks)
  const passageWords = blockTexts.reduce((total, text) => total + words(text), 0)
  const findings: CurriculumAuditFinding[] = []
  const add = (tier: CurriculumAuditTier, dimension: string, severity: CurriculumAuditFinding['severity'], message: string) => findings.push({ tier, dimension, severity, message })

  if (pkg.studentLesson.opening.goalsZh.length < 2 || cjk(pkg.studentLesson.opening.howToUseZh) < 8) add('semantic-critical', 'self-study', 'critical', '開場沒有足夠的中文目標或使用說明。')
  if (pkg.studentLesson.instruction.some((section) => section.workedExamples.length < 2 || section.commonMistakes.length < 1)) add('semantic-critical', 'self-study', 'critical', '每個新概念都需要至少兩個 worked examples 與一個錯誤對照。')
  if (pkg.studentLesson.reading.blocks.length < 2 || passageWords < 120) add('semantic-critical', 'substance', 'warning', `閱讀只有 ${passageWords} 字，可能不足以承載 planned skill。`)
  if (pkg.studentLesson.vocabulary.length > 15) add('semantic-critical', 'cognitive-load', 'critical', '核心單字超過 15 個，可能造成不必要負擔。')
  if (!pkg.studentLesson.practice.some((stage) => stage.stage === 'retrieval')) add('semantic-critical', 'retrieval', 'critical', '缺少隔天或延遲提取練習。')
  if (questions.length > 70) add('auto-derived', 'token-efficiency', 'warning', '題目超過 70 題；請刪除重複題並保留能區分學習狀態的證據。')

  // Genre-Block Structural & Semantic Consistency
  if (pkg.studentLesson.reading.genre === 'dialogue' && !pkg.studentLesson.reading.blocks.some((b) => b.type === 'dialogue')) {
    add('semantic-critical', 'alignment', 'critical', '閱讀體裁標示為對話 (dialogue)，但內容未包含任何 dialogue blocks。')
  }
  if (pkg.studentLesson.reading.genre === 'schedule' && !pkg.studentLesson.reading.blocks.some((b) => b.type === 'schedule-row')) {
    add('semantic-critical', 'alignment', 'critical', '閱讀體裁標示為時刻表/日程 (schedule)，但內容未包含任何 schedule-row blocks。')
  }
  if (pkg.studentLesson.reading.genre === 'notice' && !pkg.studentLesson.reading.blocks.some((b) => b.type === 'notice')) {
    add('semantic-critical', 'alignment', 'critical', '閱讀體裁標示為公告 (notice)，但內容未包含任何 notice blocks。')
  }

  const interestText = [...pkg.learnerSnapshot.specificInterests, ...pkg.learnerSnapshot.changedInterests].join(' ').toLocaleLowerCase()
  const allowedEntities = buildAllowedEntitiesSet(pkg)

  // 1. Passage-First Lexical Anchor Check (Core words must be in the reading passage)
  const rawPassageText = blockTexts.join(' ')
  const taughtVocab = new Set(pkg.studentLesson.vocabulary.map((v) => v.word.toLowerCase()))

  for (const vocab of pkg.studentLesson.vocabulary) {
    if (!wordAppearsInText(vocab.word, rawPassageText)) {
      add('semantic-critical', 'lexical-anchor', 'critical', `核心單字 "${vocab.word}" 未出現在閱讀文章中。文章是單字學習的語境錨點，核心單字必須來自文章。`)
    }
  }

  // 2. Comprehensive Lexical Ceiling & Hidden Difficulty Scan
  // Scan across reading, worked examples, practice prompts/options, and homework
  const studentFacingTexts: string[] = [
    rawPassageText,
    ...pkg.studentLesson.instruction.flatMap((inst) => inst.workedExamples.map((ex) => ex.example)),
    ...questions.map((q) => `${q.prompt} ${(q.options ?? []).join(' ')}`),
  ]
  const allStudentTokens = studentFacingTexts.join(' ').split(/\s+/u).filter(Boolean)

  const unapprovedWords: string[] = []
  for (const token of allStudentTokens) {
    const clean = token.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/gu, '')
    if (!clean) continue
    if (isApprovedWord(clean, taughtVocab)) continue
    if (allowedEntities.has(clean.toLowerCase())) continue

    unapprovedWords.push(clean)
  }

  const uniqueUnapproved = Array.from(new Set(unapprovedWords))
  if (uniqueUnapproved.length > 3) {
    add('semantic-critical', 'lexical-ceiling', 'critical', `教材中出現多個未在課綱 2000 單字表內、亦未列入本週核心單字說明的生難詞彙 (${uniqueUnapproved.slice(0, 4).join(', ')})，違反國中會考難度上限。請將其替換為課綱單字或加入核心單字教學。`)
  } else if (uniqueUnapproved.length >= 1) {
    add('semantic-critical', 'lexical-ceiling', 'warning', `教材中出現少數超綱且未說明的單字 (${uniqueUnapproved.join(', ')})。`)
  }

  const targetIds = new Set(pkg.learningPlan.targets.map((target) => target.id))
  const covered = new Set(questions.flatMap((question) => question.targetIds))
  for (const targetId of targetIds) if (!covered.has(targetId)) add('semantic-critical', 'alignment', 'critical', `學習目標 ${targetId} 沒有任何可觀察題目。`)
  const targetStages = new Map<string, Set<string>>()
  for (const section of pkg.studentLesson.practice) {
    if (cjk(section.instructionsZh) < 4) add('semantic-critical', 'self-study', 'critical', `${section.id} 缺少足以讓孩子獨立執行的中文任務說明。`)
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
    if (stages.size < 2) add('semantic-critical', 'evidence-plan', 'critical', `學習目標 ${targetId} 只在單一階段出現，無法比較提示前後的表現。`)
    if (![...stages].some((stage) => ['independent', 'cap-transfer', 'production', 'retrieval', 'homework'].includes(stage))) {
      add('semantic-critical', 'evidence-plan', 'critical', `學習目標 ${targetId} 沒有無提示、轉移或延遲提取證據。`)
    }
  }
  const stageNames = new Set(pkg.studentLesson.practice.map((stage) => stage.stage))
  for (const stage of ['guided', 'independent', 'cap-transfer', 'production', 'retrieval'] as const) if (!stageNames.has(stage)) add('semantic-critical', 'self-study', 'critical', `缺少 ${stage} 階段。`)

  // 3. Core Evidence / Organizer Task Verification (Must be in Independent stage before transfer)
  const independentSection = pkg.studentLesson.practice.find((s) => s.stage === 'independent')
  if (independentSection) {
    const hasOrganizerTask = independentSection.questions.some((q) =>
      q.itemType === 'short-response' ||
      q.itemType === 'sequence' ||
      q.writingLines >= 1 ||
      (q.targetIds && q.targetIds.some((tid: string) => tid.includes('reading') || tid.includes('inference') || tid.includes('evidence')))
    )
    if (!hasOrganizerTask) {
      add('semantic-critical', 'evidence-organizer', 'warning', 'independent 階段應包含至少一題引導孩子整理文本證據（如條件/結果對照、因果脈絡或結構化檢索）的任務，以建立轉移作答的依據。')
    }
  }

  // 4. Global Deterministic Workload Calibration
  if (typeof pkg.learningPlan.estimatedMinutes === 'number') {
    if (pkg.learningPlan.estimatedMinutes < 55) {
      add('semantic-critical', 'workload-calibration', 'warning', `教材總預估時間 (${pkg.learningPlan.estimatedMinutes} 分鐘) 顯著低於正常每週學習量，請擴充閱讀篇幅、核心單字或轉移寫作任務。`)
    } else if (pkg.learningPlan.estimatedMinutes > 140) {
      add('semantic-critical', 'workload-calibration', 'warning', `教材總預估時間 (${pkg.learningPlan.estimatedMinutes} 分鐘) 過高，可能造成國中生認知負荷過重，請適度收斂題目數量。`)
    }
  }

  const lessonText = JSON.stringify({ title: pkg.studentLesson.reading.title, context: pkg.studentLesson.reading.contextZh, blocks: pkg.studentLesson.reading.blocks, strategy: pkg.learningPlan.personalizationStrategy }).toLocaleLowerCase()
  if (interestText && !interestText.split(/[,，、;；\s]+/u).filter((term) => term.length >= 2).some((term) => lessonText.includes(term))) add('semantic-critical', 'personalization', 'warning', '具體興趣沒有在教材情境或個人化策略留下可追溯證據。')
  if (pkg.qualityEvidence.feedbackApplied.length === 0) add('semantic-critical', 'feedback-loop', 'critical', '沒有記錄本週如何使用回饋。')
  if (pkg.trackingDelta.hypothesesToVerify.length === 0) add('semantic-critical', 'tracking', 'critical', '沒有下一週待驗證假設。')
  if (pkg.metadata.inputFingerprint === 'unknown') add('semantic-critical', 'provenance', 'critical', '缺少可重現的 input fingerprint。')
  if (pkg.answers.some((answer) => cjk(answer.explanationZh) < 4)) add('semantic-critical', 'answer-integrity', 'critical', '每個答案都需要能協助孩子自行訂正的簡短中文理由。')
  const followUpCount = pkg.answers.filter((answer) => answer.followUpZh !== null).length
  if (followUpCount > Math.max(2, Math.ceil(pkg.answers.length / 4))) add('semantic-critical', 'parent-burden', 'warning', `有 ${followUpCount} 題要求額外追問；家長答案應以核對答案為主。`)

  if (pkg.parentSummary.personalizationZh) {
    for (const reason of pkg.parentSummary.personalizationZh) {
      const jargon = findForbiddenPersonalizationJargon(reason)
      if (jargon) {
        add('semantic-critical', 'parent-personalization', 'critical', `parentSummary.personalizationZh 含有內部引擎專有名詞或量測術語 ("${jargon}")，必須以家長視角的正體中文撰寫。`)
      }
    }
  }

  const tokenEfficiencySignals = [pkg.learnerSnapshot.recurringMistakes.length > 12, pkg.learnerSnapshot.reviewDue.length > 20, pkg.learnerSnapshot.specificInterests.length > 12, questions.length > 50].filter(Boolean).length
  if (tokenEfficiencySignals >= 2) add('auto-derived', 'token-efficiency', 'warning', `context 有 ${tokenEfficiencySignals} 個過長訊號，應改用摘要與穩定 ID。`)
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
