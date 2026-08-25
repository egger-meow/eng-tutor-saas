import { access, readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { findForbiddenPersonalizationJargon, validateCurriculumPackage } from './validate-curriculum-package.js'
import type { CurriculumPackage } from './curriculum-package-schema.js'
import { extractBlockTexts, resolveQuestionAnswerLetter } from './normalize-curriculum-package.js'
import vocabulary2000 from './curriculum-maps/official/vocabulary-2000.json' with { type: 'json' }
import { evaluateWorkloadFit, isWithinWorkloadExceptionBand, WORKLOAD_BUDGET_EXCEPTION_CHECK_ID } from './workload-fit.js'

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
const IRREGULAR_BASE_FORMS: Readonly<Record<string, string>> = {
  has: 'have',
  had: 'have',
  was: 'be',
  were: 'be',
}

function isApprovedWord(word: string, taughtWords: Set<string>): boolean {
  const w = word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gu, '')
  if (!w || /^\d+$/u.test(w) || w.length <= 2) return true

  if (w.includes('-')) {
    const parts = w.split(/-+/u).filter(Boolean)
    if (parts.length > 1 && parts.every((part) => isApprovedWord(part, taughtWords))) return true
  }

  if (taughtWords.has(w) || canonicalVocabSet.has(w)) return true

  // Common basic contractions / auxiliaries / compounds / test instructional terms
  if ([
    'cannot', 'don', 't', 'doesn', 'didn', 'won', 'can', 'could', 'not', 'isn', 'aren', 'wasn', 'weren',
    'hasn', 'haven', 'hadn', 'couldn', 'shouldn', 'wouldn', 'should', 'would', 'might', 'must',
    's', 're', 've', 'll', 'd', 'm',
    'option', 'opt', 'recall', 'blank', 'item', 'choice', 'passage', 'sentence', 'statement', 'question',
    'answer', 'code',
  ].includes(w)) {
    return true
  }

  // Common inflections & stems (against both official 2000 vocabulary and weekly taught words)
  const isBase = (stem: string) => taughtWords.has(stem) || canonicalVocabSet.has(stem)
  const irregularBase = IRREGULAR_BASE_FORMS[w]
  if (irregularBase && isBase(irregularBase)) return true

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

function lexicalUnitTokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/gu) ?? []
}

function wordAppearsInText(word: string, text: string): boolean {
  const unitTokens = lexicalUnitTokens(word)
  if (unitTokens.length === 0) return true
  const tokens = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/gu) ?? []
  const unitVariants = unitTokens.map(getValidWordVariants)
  for (let start = 0; start <= tokens.length - unitTokens.length; start += 1) {
    if (unitVariants.every((variants, offset) => variants.has(tokens[start + offset]!))) return true
  }
  return false
}

const STANDARD_EDUCATIONAL_PROPER_NOUNS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'alex', 'allen', 'amy', 'andy', 'ann', 'bella', 'ben', 'chris', 'cindy', 'david', 'diana', 'emma', 'eric', 'ethan', 'eva', 'gary', 'grace', 'hank', 'helen', 'jack', 'jay', 'jerry', 'john', 'jonathan', 'kelly', 'ken', 'kevin', 'kobe', 'leo', 'lisa', 'lucy', 'mary', 'max', 'may', 'mia', 'mike', 'mina', 'patty', 'paul', 'peggy', 'peter', 'ross', 'roy', 'sam', 'sara', 'sarah', 'tom', 'tony', 'vicky', 'willy', 'zoe',
  'taiwan', 'taipei', 'kaohsiung', 'taichung', 'tainan', 'taitung', 'hualien', 'yilan', 'japan', 'tokyo', 'america', 'usa', 'uk', 'london', 'canada', 'australia', 'china', 'asia', 'europe',
]

function buildAllowedEntitiesSet(pkg: CurriculumPackage): Set<string> {
  const allowed = new Set<string>(STANDARD_EDUCATIONAL_PROPER_NOUNS)

  for (const block of pkg.studentLesson.reading.blocks) {
    if (block.type === 'dialogue' && block.speaker) {
      for (const token of block.speaker.toLowerCase().match(/[a-z0-9]+/gu) ?? []) {
        if (token.length >= 2) allowed.add(token)
      }
    }
  }

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
const NON_EXECUTABLE_INSTRUCTION_ZH = /^(?:加油|待補|待填|無|略|任務|說明|練習|題目|todo|tbd|n\/a)[！!。.？?\s]*$/iu

function hasExecutableInstructionZh(value: string): boolean { return cjk(value) >= 1 && !NON_EXECUTABLE_INSTRUCTION_ZH.test(value.trim()) }

/** Deterministic publish gate. This complements (never replaces) the independent LLM critic. */
export function auditCurriculumPackage(
  input: unknown,
  declaredBudgetMinutes?: number | { targetMinutes?: number; declaredWeeklyMinutes?: number; declaredBudgetMinutes?: number },
): CurriculumAuditReport {
  const declaredBudget = typeof declaredBudgetMinutes === 'number'
    ? declaredBudgetMinutes
    : typeof declaredBudgetMinutes === 'object' && declaredBudgetMinutes !== null
      ? (declaredBudgetMinutes.targetMinutes ?? declaredBudgetMinutes.declaredWeeklyMinutes ?? declaredBudgetMinutes.declaredBudgetMinutes)
      : undefined

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

  if ('grounding' in pkg) {
    const densityExceptionGenres = new Set(['notice', 'schedule', 'instructions'])
    const hasDensityException = densityExceptionGenres.has(pkg.studentLesson.reading.genre) && pkg.qualityEvidence.criticalChecks.some(
      (check) => check.id === 'grounding-density-exception' && check.passed && check.evidence.trim().length >= 60,
    )
    if (pkg.grounding.facts.length < 2 || (pkg.grounding.facts.length < 3 && !hasDensityException)) {
      add('semantic-critical', 'grounding-substance', 'critical', 'Grounded primary reading requires at least three concrete researched propositions or a specific passed grounding-density-exception check.')
    }
    if (pkg.grounding.claims.length < 2 || (pkg.grounding.claims.length < 3 && !hasDensityException)) {
      add('semantic-critical', 'grounding-coverage', 'critical', 'Grounding must bind at least three factual claims to actual primary-reading prose unless a specific density exception is justified.')
    }
    const claimedBlocks = new Set(pkg.grounding.claims.map((claim) => claim.location.split('.')[3]))
    if (claimedBlocks.size < 2 && pkg.studentLesson.reading.blocks.length >= 2 && !hasDensityException) {
      add('semantic-critical', 'grounding-coverage', 'critical', 'Grounded claims must inform more than one primary-reading block instead of appearing as a detachable fact label.')
    }
    if (pkg.grounding.temporalMode === 'current') {
      const researchedAt = Date.parse(pkg.grounding.researchedAt)
      const newestPublishedAt = Math.max(...pkg.grounding.sources.map((source) => Date.parse(source.publishedAt!)))
      if (newestPublishedAt > researchedAt) {
        add('semantic-critical', 'grounding-freshness', 'critical', 'Current grounding cannot cite a publication timestamp later than researchedAt.')
      }
    }
  }

  if (pkg.studentLesson.opening.goalsZh.length < 2 || cjk(pkg.studentLesson.opening.howToUseZh) < 8) add('semantic-critical', 'self-study', 'critical', '開場沒有足夠的中文目標或使用說明。')
  if (pkg.studentLesson.instruction.some((section) => section.workedExamples.length < 2 || section.commonMistakes.length < 1)) add('semantic-critical', 'self-study', 'critical', '每個新概念都需要至少兩個 worked examples 與一個錯誤對照。')
  if (pkg.studentLesson.reading.blocks.length < 2 || passageWords < 120) add('semantic-critical', 'substance', 'warning', `閱讀只有 ${passageWords} 字，可能不足以承載 planned skill。`)
  if (pkg.studentLesson.vocabulary.length > 15) add('semantic-critical', 'cognitive-load', 'critical', '核心單字超過 15 個，可能造成不必要負擔。')
  const phraseCount = pkg.studentLesson.vocabulary.filter((v) => lexicalUnitTokens(v.word).length > 1).length
  if (phraseCount > 3) add('semantic-critical', 'lexical-unit-mix', 'critical', `核心詞彙含 ${phraseCount} 個片語或搭配，超過 0–3 個的上限。請只保留比另一個單字更有學習價值的詞彙單位。`)
  if (!pkg.studentLesson.practice.some((stage) => stage.stage === 'retrieval')) add('semantic-critical', 'retrieval', 'critical', '缺少隔天或延遲提取練習。')
  if (questions.length > 70) add('auto-derived', 'token-efficiency', 'warning', '題目超過 70 題；請刪除重複題並保留能區分學習狀態的證據。')

  if (pkg.studentLesson.reading.genre === 'dialogue' && !pkg.studentLesson.reading.blocks.some((b) => b.type === 'dialogue')) add('semantic-critical', 'alignment', 'critical', '閱讀體裁標示為對話 (dialogue)，但內容未包含任何 dialogue blocks。')
  if (pkg.studentLesson.reading.genre === 'schedule' && !pkg.studentLesson.reading.blocks.some((b) => b.type === 'schedule-row')) add('semantic-critical', 'alignment', 'critical', '閱讀體裁標示為時刻表/日程 (schedule)，但內容未包含任何 schedule-row blocks。')
  if (pkg.studentLesson.reading.genre === 'notice' && !pkg.studentLesson.reading.blocks.some((b) => b.type === 'notice')) add('semantic-critical', 'alignment', 'critical', '閱讀體裁標示為公告 (notice)，但內容未包含任何 notice blocks。')

  const interestText = [...pkg.learnerSnapshot.specificInterests, ...pkg.learnerSnapshot.changedInterests].join(' ').toLocaleLowerCase()
  const allowedEntities = buildAllowedEntitiesSet(pkg)

  const rawPassageText = blockTexts.join(' ')
  const taughtVocab = new Set(pkg.studentLesson.vocabulary.flatMap((v) => lexicalUnitTokens(v.word)))

  for (const vocab of pkg.studentLesson.vocabulary) {
    if (!wordAppearsInText(vocab.word, rawPassageText)) {
      add('auto-derived', 'lexical-anchor', 'warning', `核心單字 "${vocab.word}" 未出現在閱讀文章中。文章是單字學習的語境錨點，建議核心單字來自文章。`)
    }
  }

  const adaptiveExtensionTexts: string[] = []
  if (pkg.studentLesson.adaptiveExtension) {
    if (pkg.studentLesson.adaptiveExtension.contentZh) {
      adaptiveExtensionTexts.push(pkg.studentLesson.adaptiveExtension.contentZh)
    }
    if (pkg.studentLesson.adaptiveExtension.taskZh) {
      adaptiveExtensionTexts.push(pkg.studentLesson.adaptiveExtension.taskZh)
    }
  }

  const studentFacingTexts: string[] = [
    rawPassageText,
    ...pkg.studentLesson.instruction.flatMap((inst) => inst.workedExamples.map((ex) => ex.example)),
    ...questions.map((q) => `${q.prompt} ${(q.options ?? []).join(' ')}`),
    ...adaptiveExtensionTexts,
  ]
  const allStudentTokens = studentFacingTexts.join(' ').split(/\s+/u).filter(Boolean)

  const unapprovedWords = new Set<string>()
  for (const token of allStudentTokens) {
    const clean = token.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/gu, '')
    if (!clean) continue
    if (isApprovedWord(clean, taughtVocab)) continue
    const normalized = clean.toLowerCase()
    if (allowedEntities.has(normalized)) continue

    unapprovedWords.add(normalized)
  }

  const uniqueUnapproved = Array.from(unapprovedWords)
  if (uniqueUnapproved.length > 3) {
    add('auto-derived', 'lexical-ceiling', 'warning', `教材中出現多個未在課綱 2000 單字表內、亦未列入本週核心單字說明的生難詞彙 (${uniqueUnapproved.slice(0, 4).join(', ')})，建議將其替換為課綱單字或加入核心單字教學。`)
  } else if (uniqueUnapproved.length >= 1) {
    add('auto-derived', 'lexical-ceiling', 'warning', `教材中出現少數超綱且未說明的單字 (${uniqueUnapproved.join(', ')})。`)
  }

  const targetIds = new Set(pkg.learningPlan.targets.map((target) => target.id))
  const covered = new Set(questions.flatMap((question) => question.targetIds))
  for (const targetId of targetIds) if (!covered.has(targetId)) add('semantic-critical', 'alignment', 'critical', `學習目標 ${targetId} 沒有任何可觀察題目。`)
  const targetStages = new Map<string, Set<string>>()
  const guidedTargetIds = new Set<string>()
  for (const section of pkg.studentLesson.practice) {
    if (!hasExecutableInstructionZh(section.instructionsZh)) add('semantic-critical', 'self-study', 'critical', `${section.id} 缺少可執行的中文任務說明。`)
    else if (cjk(section.instructionsZh) < 4) add('auto-derived', 'self-study', 'warning', `${section.id} 的中文任務說明很短；請確認孩子不需口頭補充也能執行。`)
    for (const question of section.questions) {
      for (const targetId of question.targetIds) {
        if (section.stage === 'guided') guidedTargetIds.add(targetId)
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
    const hasPostGuidedEvidence = [...stages].some((stage) => ['independent', 'cap-transfer', 'production', 'retrieval', 'homework'].includes(stage))
    if (guidedTargetIds.has(targetId) && !hasPostGuidedEvidence) add('semantic-critical', 'evidence-plan', 'critical', `主要學習目標 ${targetId} 只有引導練習，缺少獨立、轉移、產出、提取或作業證據。`)
    else if (!guidedTargetIds.has(targetId) && stages.size === 1) add('auto-derived', 'evidence-plan', 'warning', `輔助學習目標 ${targetId} 只在單一階段留下證據；若它是本週主要目標，應加入引導後的獨立、轉移、產出或提取證據。`)
  }
  const stageNames = new Set(pkg.studentLesson.practice.map((stage) => stage.stage))
  for (const stage of ['guided', 'independent', 'cap-transfer', 'production', 'retrieval'] as const) if (!stageNames.has(stage)) add('semantic-critical', 'self-study', 'critical', `缺少 ${stage} 階段。`)

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

  if (typeof pkg.learningPlan.estimatedMinutes === 'number') {
    const minutes = pkg.learningPlan.estimatedMinutes
    if (minutes < 55) {
      add('semantic-critical', 'workload-calibration', 'warning', `教材總預估時間 (${minutes} 分鐘) 顯著低於全系統最低安全下限 (55 分鐘)，無法確保每週基礎學習效果。`)
    } else if (minutes > 140) {
      add('semantic-critical', 'workload-calibration', 'warning', `教材總預估時間 (${minutes} 分鐘) 高於全系統最高安全上限 (140 分鐘)，可能造成國中生認知負荷過重。`)
    }

    if (typeof declaredBudget === 'number' && declaredBudget > 0) {
      const fit = evaluateWorkloadFit(declaredBudget, minutes)
      const exception = pkg.qualityEvidence.criticalChecks.find(
        (check) => check.id === WORKLOAD_BUDGET_EXCEPTION_CHECK_ID && check.passed,
      )
      const hasSubstantiveEvidence = Boolean(exception && exception.evidence.trim().length >= 80)
      const isWithinExceptionBand = isWithinWorkloadExceptionBand(declaredBudget, minutes)
      const hasEvidenceBackedException = hasSubstantiveEvidence && isWithinExceptionBand
      if (exception && !hasSubstantiveEvidence) {
        add('semantic-critical', 'workload-calibration', 'critical', `${WORKLOAD_BUDGET_EXCEPTION_CHECK_ID} requires at least 80 characters of specific evidence explaining why the learner benefits from this bounded exception.`)
      } else if (exception && !isWithinExceptionBand) {
        add('semantic-critical', 'workload-calibration', 'critical', `${WORKLOAD_BUDGET_EXCEPTION_CHECK_ID} cannot bypass the deterministic 75%-125% hard bound for targetMinutes=${declaredBudget}; actual workload is ${minutes} minutes.`)
      } else if (fit.code === 'BUDGET_UNDERFILLED' && !hasEvidenceBackedException) {
        add('semantic-critical', 'workload-calibration', 'critical', `BUDGET_UNDERFILLED: deterministic workload ${minutes} minutes is below the ${fit.minimumMinutes}-${fit.maximumMinutes} minute band for targetMinutes=${declaredBudget}. Add useful dependent practice, reasoning, retrieval, writing, or a justified adaptive extension; never alter duration metadata.`)
      } else if (fit.code === 'BUDGET_OVERFILLED' && !hasEvidenceBackedException) {
        add('semantic-critical', 'workload-calibration', 'critical', `BUDGET_OVERFILLED: deterministic workload ${minutes} minutes is above the ${fit.minimumMinutes}-${fit.maximumMinutes} minute band for targetMinutes=${declaredBudget}. Remove low-value redundancy while preserving every required stage and target evidence; never alter duration metadata.`)
      }
    }
  }

  const lessonText = JSON.stringify({ title: pkg.studentLesson.reading.title, context: pkg.studentLesson.reading.contextZh, blocks: pkg.studentLesson.reading.blocks, strategy: pkg.learningPlan.personalizationStrategy }).toLocaleLowerCase()
  if (interestText && !interestText.split(/[,，、;；\s]+/u).filter((term) => term.length >= 2).some((term) => lessonText.includes(term))) add('semantic-critical', 'personalization', 'warning', '具體興趣沒有在教材情境或個人化策略留下可追溯證據。')
  if (pkg.qualityEvidence.feedbackApplied.length === 0) add('semantic-critical', 'feedback-loop', 'critical', '沒有記錄本週如何使用回饋。')
  if (pkg.trackingDelta.hypothesesToVerify.length === 0) add('semantic-critical', 'tracking', 'critical', '沒有下一週待驗證假設。')
  if (pkg.metadata.inputFingerprint === 'unknown') add('semantic-critical', 'provenance', 'critical', '缺少可重現的 input fingerprint。')
  if (pkg.answers.some((answer) => cjk(answer.explanationZh) < 4)) add('semantic-critical', 'answer-explanation-depth', 'warning', '部分答案的中文理由較短；建議補充足以協助孩子自行訂正的線索或規則。')
  const followUpCount = pkg.answers.filter((answer) => answer.followUpZh !== null).length
  if (followUpCount > Math.max(2, Math.ceil(pkg.answers.length / 4))) add('semantic-critical', 'parent-burden', 'warning', `有 ${followUpCount} 題要求額外追問；家長答案應以核對答案為主。`)

  if (pkg.parentSummary.focusZh) {
    const jargon = findForbiddenPersonalizationJargon(pkg.parentSummary.focusZh)
    if (jargon) {
      add('semantic-critical', 'parent-personalization', 'critical', `parentSummary.focusZh 含有內部專有名詞或量測術語 ("${jargon}")，請改用家長易懂的學習重點說明。`)
    }
  }

  if (pkg.parentSummary.observeZh) {
    for (const item of pkg.parentSummary.observeZh) {
      const jargon = findForbiddenPersonalizationJargon(item)
      if (jargon) {
        add('semantic-critical', 'parent-personalization', 'critical', `parentSummary.observeZh 含有內部專有名詞或量測術語 ("${jargon}")，必須以家長觀察角度撰寫。`)
      }
    }
  }

  if (pkg.parentSummary.completionCheckZh) {
    const jargon = findForbiddenPersonalizationJargon(pkg.parentSummary.completionCheckZh)
    if (jargon) {
      add('semantic-critical', 'parent-personalization', 'critical', `parentSummary.completionCheckZh 含有內部專有名詞或量測術語 ("${jargon}")。`)
    }
  }

  if (pkg.parentSummary.personalizationZh) {
    for (const reason of pkg.parentSummary.personalizationZh) {
      const jargon = findForbiddenPersonalizationJargon(reason)
      if (jargon) {
        add('semantic-critical', 'parent-personalization', 'critical', `parentSummary.personalizationZh 含有內部引擎專有名詞或量測術語 ("${jargon}")，必須以家長視角的正體中文撰寫。`)
      }
    }
  }

  for (const goal of pkg.studentLesson.opening.goalsZh) {
    const jargon = findForbiddenPersonalizationJargon(goal)
    if (jargon) {
      add('semantic-critical', 'self-study', 'critical', `studentLesson.opening.goalsZh 含有內部術語 ("${jargon}")，必須以學生友善的正體中文撰寫。`)
    }
  }

  // Deterministic MCQ Answer-Position Leakage Gate
  const answerMap = new Map(pkg.answers.map((a) => [a.questionId, a]))
  const mcqLetters: { id: string; letter: string }[] = []

  for (const q of questions) {
    if (Array.isArray(q.options) && q.options.length === 4) {
      const ans = answerMap.get(q.id)
      const resolved = resolveQuestionAnswerLetter(q, ans)
      if (resolved) {
        mcqLetters.push({ id: q.id, letter: resolved.letter })
      }
    }
  }

  const mcqTotal = mcqLetters.length
  if (mcqTotal >= 4) {
    // 1. Identical-position run gate: reject runs >= 4
    let maxRun = 0
    let maxRunLetter = ''
    let curRun = 0
    let curLetter = ''
    for (const item of mcqLetters) {
      if (item.letter === curLetter) {
        curRun += 1
      } else {
        curLetter = item.letter
        curRun = 1
      }
      if (curRun > maxRun) {
        maxRun = curRun
        maxRunLetter = curLetter
      }
    }

    if (maxRun >= 4) {
      add(
        'semantic-critical',
        'mcq-position-leakage',
        'critical',
        `選擇題正確答案位置連續出現 ${maxRun} 次 "${maxRunLetter}"，存在明顯位置規律洩漏 (run >= 4)。請打散選項順序。`,
      )
    }

    // 2. Single-position concentration gate
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
    for (const item of mcqLetters) {
      counts[item.letter] = (counts[item.letter] ?? 0) + 1
    }
    const maxCount = Math.max(...Object.values(counts))
    const maxLetter = Object.keys(counts).find((k) => counts[k] === maxCount) ?? 'A'

    if (maxCount === mcqTotal) {
      add(
        'semantic-critical',
        'mcq-position-leakage',
        'critical',
        `所有 ${mcqTotal} 題選擇題的正確答案均為 "${maxLetter}"，存在嚴重答案位置集中洩漏。請將選項順序打散至 (A)、(B)、(C)、(D) 各位置。`,
      )
    } else if (mcqTotal >= 6 && maxCount / mcqTotal > 0.60) {
      add(
        'semantic-critical',
        'mcq-position-leakage',
        'critical',
        `選擇題正確答案過度集中於位置 "${maxLetter}" (${maxCount}/${mcqTotal} 題，佔比 ${Math.round((maxCount / mcqTotal) * 100)}% > 60%)。請打散選項順序，避免單一位置比例過高。`,
      )
    }
  }

  const tokenEfficiencySignals = [pkg.learnerSnapshot.recurringMistakes.length > 12, pkg.learnerSnapshot.reviewDue.length > 20, pkg.learnerSnapshot.specificInterests.length > 12, questions.length > 50].filter(Boolean).length
  if (tokenEfficiencySignals >= 2) add('auto-derived', 'token-efficiency', 'warning', `context 有 ${tokenEfficiencySignals} 個過長訊號，應改用摘要與穩定 ID。`)
  return { passed: !findings.some((finding) => finding.severity === 'critical'), findings, summary: { questions: questions.length, words: passageWords, targets: pkg.learningPlan.targets.length, tokenEfficiencySignals } }
}

async function runCli() {
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

if (process.argv[1]?.endsWith('audit-curriculum.ts')) {
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
