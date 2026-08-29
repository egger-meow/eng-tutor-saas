import { createHash } from 'node:crypto'

import runtimeJson from '../curriculum/cap-precedent-cards.json' with { type: 'json' }
import {
  validateCapAssessmentPlan,
  type CapAssessmentIntent,
  type CapAssessmentPlan,
} from './cap-assessment-plan-contract.js'
import { isPromptVersionGte } from './engine-version.js'

export type { CapAssessmentIntent, CapAssessmentPlan } from './cap-assessment-plan-contract.js'

export interface CapPrecedentAuditInput {
  capTransferQuestionCount: number
  precedentRefs: string[]
  availableRefs: ReadonlySet<string>
}

export interface CapPrecedentAuditResult {
  passed: boolean
  findings: string[]
}

export interface CapDesignAnchor {
  ref: string
  genre: string
  primarySkill: string
  secondarySkills: string[]
  cognitiveDepth: string
  languageDifficulty: string
  evidenceMode: string
  evidenceNecessity: string
  evidenceSpan: string
  reasoningOperations: string[]
  questionMechanism: string
  whyTheQuestionWorks: string
  correctAnswerConstructionPrinciple: string
  distractorStrategies: string[]
  reusableDesignPrinciple: string
  difficultyAdjustment: {
    simplificationConstraints: string[]
    depthAdjustmentStrategies: string[]
  }
  copyGuardHashes: string[]
}

export interface CapPrecedentRuntimeBundle {
  version: string
  authorityStatus: 'authoritative'
  capKnowledgeVersion: string
  capCorpusHash: string
  capBundleVersion: string
  plannerVersion: string
  qualityFloorVersion: string
  cards: CapDesignAnchor[]
}

export interface CapRetrievalPreferences {
  selectionKey?: string
  recentPrecedentRefs?: readonly string[]
  recentMechanisms?: readonly string[]
}

interface QuestionLike {
  id: string
  itemType: string
  prompt: string
  options?: string[]
}

interface PackageLike {
  studentLesson: {
    reading?: {
      blocks?: Array<Record<string, unknown>>
    }
    practice: Array<{ stage: string; questions: QuestionLike[] }>
    homework: { questions: QuestionLike[] }
  }
  qualityEvidence: {
    precedentRefs?: string[]
    criticalChecks: Array<{ id: string; passed: boolean; evidence: string }>
  }
}

const runtime = runtimeJson as unknown as CapPrecedentRuntimeBundle
const CAP_REF = /^cap-[a-f0-9]{12}$/
const DEPTH_RANK: Record<string, number> = {
  D1_verbatim_retrieval: 1,
  D2_single_step_inference: 2,
  D3_multi_step_synthesis: 3,
  D4_evaluative_pragmatic: 4,
}
const COMPREHENSION_TYPES = new Set(['main-idea', 'detail', 'sequence', 'inference', 'context-clue', 'author-purpose', 'cloze'])
const RECALL_TYPES = new Set(['vocabulary', 'grammar'])

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function fiveGramHashes(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []
  const hashes = new Set<string>()
  for (let index = 0; index <= tokens.length - 5; index += 1) {
    hashes.add(hash(tokens.slice(index, index + 5).join(' ')).slice(0, 16))
  }
  return hashes
}

function parseJsonCheck<T>(pkg: PackageLike, id: string): T | null {
  const check = pkg?.qualityEvidence?.criticalChecks?.find((item) => item.id === id && item.passed)
  if (!check) return null
  try {
    return JSON.parse(check.evidence) as T
  } catch {
    return null
  }
}

function scoreAnchor(intent: CapAssessmentIntent, card: CapDesignAnchor): number {
  let score = 0
  if (card.primarySkill === intent.primarySkill) score += 6
  if (card.cognitiveDepth === intent.targetCognitiveDepth) score += 3
  if (card.evidenceSpan === intent.evidenceSpan) score += 2
  if (card.evidenceMode === intent.evidenceMode) score += 1
  if (card.languageDifficulty === intent.targetLanguageDifficulty) score += 1
  if (intent.genre && card.genre === intent.genre) score += 2

  const secondary = new Set(intent.secondarySkills ?? [])
  score += card.secondarySkills.filter((skill) => secondary.has(skill)).length
  const distractors = new Set(intent.distractorStrategies ?? [])
  score += card.distractorStrategies.filter((strategy) => distractors.has(strategy)).length * 0.5
  const operations = new Set(intent.reasoningOperations.map((operation) => operation.trim().toLowerCase()))
  score += card.reasoningOperations.filter((operation) => operations.has(operation.trim().toLowerCase())).length * 3
  return score
}

function stableRotation(key: string, length: number): number {
  if (length <= 1) return 0
  return Number.parseInt(hash(key).slice(0, 8), 16) % length
}

function rotateEqualScoreGroups<T extends { score: number }>(entries: T[], selectionKey?: string): T[] {
  if (!selectionKey) return entries
  const result: T[] = []
  for (let start = 0; start < entries.length;) {
    let end = start + 1
    while (end < entries.length && entries[end]!.score === entries[start]!.score) end += 1
    const group = entries.slice(start, end)
    const offset = stableRotation(`${selectionKey}:${entries[start]!.score}`, group.length)
    result.push(...group.slice(offset), ...group.slice(0, offset))
    start = end
  }
  return result
}

/** Deterministic compact-index retrieval. Returns at most five design anchors. */
export function retrieveCapPrecedents(
  intent: CapAssessmentIntent,
  bundle: CapPrecedentRuntimeBundle = runtime,
  limit = 5,
  preferences: CapRetrievalPreferences = {},
): CapDesignAnchor[] {
  if (bundle.authorityStatus !== 'authoritative') return []
  const recentRefs = new Set(preferences.recentPrecedentRefs ?? [])
  const recentMechanisms = new Set((preferences.recentMechanisms ?? []).map((item) => item.trim().toLowerCase()))
  const ranked = bundle.cards
    .map((card) => ({
      card,
      score: scoreAnchor(intent, card)
        - (recentRefs.has(card.ref) ? 0.75 : 0)
        - (recentMechanisms.has(card.questionMechanism.trim().toLowerCase()) ? 0.5 : 0),
    }))
    .filter((entry) => entry.score >= 6)
    .sort((a, b) => b.score - a.score || a.card.ref.localeCompare(b.card.ref))
  return rotateEqualScoreGroups(ranked, preferences.selectionKey)
    .slice(0, Math.max(1, Math.min(5, limit)))
    .map((entry) => entry.card)
}

function isRelevantPrecedent(intent: CapAssessmentIntent, card: CapDesignAnchor): boolean {
  const skills = new Set([intent.primarySkill, ...(intent.secondarySkills ?? [])])
  const operations = new Set(intent.reasoningOperations.map((item) => item.trim().toLowerCase()))
  const distractors = new Set(intent.distractorStrategies ?? [])
  const signals = [
    skills.has(card.primarySkill) || card.secondarySkills.some((skill) => skills.has(skill)),
    card.reasoningOperations.some((operation) => operations.has(operation.trim().toLowerCase())),
    card.evidenceMode === intent.evidenceMode,
    card.evidenceSpan === intent.evidenceSpan,
    Boolean(intent.genre && card.genre === intent.genre),
    card.distractorStrategies.some((strategy) => distractors.has(strategy)),
    Math.abs((DEPTH_RANK[card.cognitiveDepth] ?? 0) - (DEPTH_RANK[intent.targetCognitiveDepth] ?? 0)) <= 1,
  ].filter(Boolean).length
  return signals >= 2
}

function hasModeEvidence(plan: CapAssessmentPlan): boolean {
  if (plan.precedentMode === 'anchor') return Boolean(plan.borrowedDesignPrinciples?.some((item) => item.trim()))
  if (plan.precedentMode === 'blend') return Boolean(plan.synthesizedDesignPrinciples?.some((item) => item.trim()))
  if (plan.precedentMode === 'calibration') {
    return Boolean(plan.benchmarkQualities?.some((item) => item.trim()) && plan.noveltyRationale?.trim())
  }
  return false
}

function governedAssessmentItems(pkg: PackageLike): Array<{ stage: string; question: QuestionLike }> {
  const items = pkg.studentLesson.practice.flatMap((section) =>
    section.questions
      .filter((question) => section.stage === 'cap-transfer' || (section.stage === 'independent' && question.options?.length === 4))
      .map((question) => ({ stage: section.stage, question })),
  )

  for (const question of pkg.studentLesson.homework.questions) {
    if (question.options?.length === 4 && !['translation', 'sentence-production', 'short-response'].includes(question.itemType)) {
      items.push({ stage: 'homework', question })
    }
  }
  return items
}

function studentAssessmentText(pkg: PackageLike, question: QuestionLike): string {
  const reading = (pkg.studentLesson.reading?.blocks ?? [])
    .flatMap((block) => Object.values(block).filter((value): value is string => typeof value === 'string'))
    .join(' ')
  return `${reading} ${question.prompt} ${(question.options ?? []).join(' ')}`
}

const PASSAGE_QUOTE_ATTRIBUTION = /(?:\b(?:according to|from)\s+(?:the\s+)?(?:reading|passage|article|text)\b|\bin\s+(?:the\s+)?(?:reading|passage|article|text|sentence|paragraph(?:\s+\d+)?)\b|\b(?:the\s+)?(?:reading|passage|article|text|writer|author)\s+(?:says?|states?|writes?|notes?|explains?|mentions?|includes?|uses?)\b)/iu
const CONSTRUCTED_QUOTE_SPEAKER = /\b(?:(?:a|one|another|your)\s+)?(?:student|classmate|learner|reader|friend|person|someone|somebody)\s+(?:says?|claims?|argues?|thinks?|suggests?|writes?)\s*,?\s*$/iu

/**
 * Quote-verbatim checking is defense-in-depth for text attributed to the passage.
 * A clearly constructed speaker quote takes precedence over nearby instructions such
 * as "According to the reading"; canonical evidence anchors still govern the answer.
 */
function quoteClaimsPassageSource(prompt: string, rawQuoted: string): boolean {
  const quoteIndex = prompt.indexOf(rawQuoted)
  if (quoteIndex < 0) return false
  const prefix = prompt.slice(Math.max(0, quoteIndex - 160), quoteIndex)
  if (CONSTRUCTED_QUOTE_SPEAKER.test(prefix)) return false
  const start = Math.max(0, quoteIndex - 180)
  const end = Math.min(prompt.length, quoteIndex + rawQuoted.length + 180)
  return PASSAGE_QUOTE_ATTRIBUTION.test(prompt.slice(start, end))
}

/**
 * Deterministic production CAP quality floor.
 *
 * Prompt-level critic still judges semantic quality; this gate makes provenance,
 * mandatory retrieval, anti-copy, intentional-recall boundaries, and several
 * common worksheet regressions non-optional before rendering.
 */
export function auditCapPrecedentPackage(
  pkg: PackageLike,
  bundle: CapPrecedentRuntimeBundle = runtime,
): CapPrecedentAuditResult {
  const findings: string[] = []
  if (bundle.authorityStatus !== 'authoritative' || !/^[a-f0-9]{64}$/.test(bundle.capCorpusHash) || bundle.cards.length === 0) {
    return {
      passed: false,
      findings: ['CAP_AUTHORITY_UNAVAILABLE: production CAP runtime is not authoritative'],
    }
  }

  const available = new Map(bundle.cards.map((card) => [card.ref, card]))
  const provenance = parseJsonCheck<Record<string, string>>(pkg, 'cap-provenance')
  const expectedProvenance: Record<string, string> = {
    capKnowledgeVersion: bundle.capKnowledgeVersion,
    capCorpusHash: bundle.capCorpusHash,
    capBundleVersion: bundle.capBundleVersion,
    plannerVersion: bundle.plannerVersion,
    qualityFloorVersion: bundle.qualityFloorVersion,
  }
  if (!provenance || Object.entries(expectedProvenance).some(([key, value]) => provenance[key] !== value)) {
    findings.push('CAP_PROVENANCE_MISMATCH: cap-provenance must exactly match the authoritative runtime versions and corpus hash')
  }

  const planRefs = new Set<string>()
  const requiredItems = governedAssessmentItems(pkg)
  for (const { stage, question } of requiredItems) {
    const plan = parseJsonCheck<CapAssessmentPlan>(pkg, `cap-plan:${question.id}`)
    if (!plan) {
      findings.push(`CAP_ITEM_PLAN_MISSING:${question.id}: every normal assessment/application item requires an internal CAP assessment plan`)
      continue
    }

    const contractResult = validateCapAssessmentPlan(plan)
    if (!contractResult.valid) {
      findings.push(`CAP_ITEM_PLAN_INCOMPLETE:${question.id}: ${contractResult.errors.join('; ')}`)
      continue
    }

    if (!plan.learningObjective?.trim() || !plan.primarySkill?.trim() || !plan.targetLanguageDifficulty?.trim() || !plan.targetCognitiveDepth?.trim()) {
      findings.push(`CAP_ITEM_PLAN_INCOMPLETE:${question.id}: learning objective, skill, language difficulty, and cognitive depth are required`)
    }
    if (!Array.isArray(plan.reasoningOperations) || plan.reasoningOperations.length === 0) {
      findings.push(`CAP_ITEM_PLAN_INCOMPLETE:${question.id}: reasoning operations are required`)
    }
    if (!hasModeEvidence(plan)) {
      findings.push(`CAP_PRECEDENT_MODE_INVALID:${question.id}: anchor, blend, or calibration mode requires its specific CAP-use evidence`)
    }

    if (plan.intentionalRecall === true) {
      if (stage === 'cap-transfer' || !RECALL_TYPES.has(question.itemType)) {
        findings.push(`CAP_RECALL_EXEMPTION_INVALID:${question.id}: intentional recall is only valid for explicit vocabulary/grammar retrieval outside cap-transfer`)
      }
      continue
    }

    const relevant = retrieveCapPrecedents(plan, bundle, 5)
    if ((!plan.precedentRefs || plan.precedentRefs.length === 0) && relevant.length > 0) {
      findings.push(`CAP_PRECEDENT_MISSING:${question.id}: relevant authentic CAP precedents exist, so blank-page assessment authoring is forbidden`)
      continue
    }
    if ((!plan.precedentRefs || plan.precedentRefs.length === 0) && relevant.length === 0 && (!plan.noPrecedentReason || plan.noPrecedentReason.trim().length < 20)) {
      findings.push(`CAP_FALLBACK_REASON_MISSING:${question.id}: no-precedent fallback requires a specific reason`)
      continue
    }

    const referenced: CapDesignAnchor[] = []
    for (const ref of plan.precedentRefs ?? []) {
      planRefs.add(ref)
      const card = available.get(ref)
      if (!CAP_REF.test(ref) || !card) {
        findings.push(`CAP_PRECEDENT_UNKNOWN:${question.id}:${ref}`)
        continue
      }
      referenced.push(card)
    }

    if (referenced.length > 0 && !referenced.some((card) => isRelevantPrecedent(plan, card))) {
      findings.push(`CAP_PRECEDENT_IRRELEVANT:${question.id}: consultation must be relevant by skill or reasoning/evidence/distractor structure`)
    }

    if (question.options?.length === 4 && (!plan.distractorStrategies || plan.distractorStrategies.length === 0)) {
      findings.push(`CAP_DISTRACTOR_PLAN_MISSING:${question.id}: four-option assessment needs explicit distractor mechanisms`)
    }

    const depth = DEPTH_RANK[plan.targetCognitiveDepth] ?? 0
    if (depth >= 3 && ['single_word', 'single_clause'].includes(plan.evidenceSpan)) {
      findings.push(`CAP_DEPTH_COLLAPSE:${question.id}: D3/D4 reasoning cannot claim only word/clause evidence after simplification`)
    }
    if (COMPREHENSION_TYPES.has(question.itemType) && plan.evidenceSpan === 'single_word') {
      findings.push(`CAP_DECORATIVE_CONTEXT:${question.id}: comprehension/application cannot reduce evidence to an isolated word`)
    }
    if (/^\s*what\s+is\s+the\s+meaning\s+of\b/i.test(question.prompt) || /^\s*what\s+does\s+.+\s+mean\??\s*$/i.test(question.prompt)) {
      findings.push(`CAP_SHALLOW_ASSESSMENT:${question.id}: naked dictionary-definition prompt is not valid normal comprehension/application assessment`)
    }

    if (referenced.length > 0) {
      const authoredHashes = fiveGramHashes(studentAssessmentText(pkg, question))
      const sourceHashes = new Set(referenced.flatMap((card) => card.copyGuardHashes))
      const overlap = [...authoredHashes].filter((item) => sourceHashes.has(item))
      if (overlap.length >= 2) {
        findings.push(`CAP_COPY_OVERLAP:${question.id}: multiple five-word phrase fingerprints overlap historical anchor material; adapt mechanics, not wording`)
      }
    }

    // Explicit Per-Item Evidence Boundary & Anchor Validation
    const isReadingDependent =
      stage === 'cap-transfer' ||
      COMPREHENSION_TYPES.has(question.itemType) ||
      plan.evidenceMode === 'text_only' ||
      plan.evidenceMode === 'multi_document'

    if (isReadingDependent) {
      if (plan.evidenceScope && plan.evidenceScope !== 'primary_reading') {
        findings.push(
          `CAP_EVIDENCE_BOUNDARY_VIOLATION:${question.id}: reading-dependent question cannot claim evidence from "${plan.evidenceScope}"; evidenceScope must be primary_reading`,
        )
      }
      if (plan.evidenceScope === 'primary_reading' || (!plan.evidenceScope && !plan.intentionalRecall)) {
        if (!Array.isArray(plan.evidenceAnchors) || plan.evidenceAnchors.length === 0) {
          findings.push(
            `CAP_EVIDENCE_ANCHORS_MISSING:${question.id}: reading-dependent question requires at least one canonical evidence anchor`,
          )
        } else {
          for (const anchor of plan.evidenceAnchors) {
            const locMatch = /^studentLesson\.reading\.blocks\.(\d+)\.(text|heading|timeOrStep|event|detail)$/u.exec(
              anchor.location ?? '',
            )
            if (!locMatch) {
              findings.push(
                `CAP_EVIDENCE_LOCATION_INVALID:${question.id}:${anchor.location}: location must resolve to a studentLesson.reading.blocks field`,
              )
            } else {
              const blockIndex = Number(locMatch[1])
              const field = locMatch[2]!
              const block = pkg.studentLesson.reading?.blocks?.[blockIndex] as unknown as Record<string, unknown> | undefined
              const prose = block?.[field]
              if (typeof prose !== 'string') {
                findings.push(`CAP_EVIDENCE_LOCATION_NOT_FOUND:${question.id}:${anchor.location}`)
              } else if (typeof anchor.anchorText === 'string' && anchor.anchorText.trim().length > 0) {
                const normProse = prose.toLowerCase().replace(/\s+/gu, ' ')
                const normAnchor = anchor.anchorText.toLowerCase().replace(/\s+/gu, ' ').trim()
                if (!normProse.includes(normAnchor)) {
                  findings.push(
                    `CAP_EVIDENCE_ANCHOR_TEXT_MISSING:${question.id}: anchor text "${anchor.anchorText}" not found at ${anchor.location}`,
                  )
                }
              } else {
                findings.push(`CAP_EVIDENCE_ANCHOR_TEXT_MISSING:${question.id}: anchorText must be non-empty string`)
              }
            }
          }
        }
      }

      // Defense-in-depth: verify exact quoted reading phrases in question prompt exist in reading text
      const quotedMatches = question.prompt.match(/(?:["“]([^"”]+)["”]|(?:'|‘)([^'’]{4,})(?:'|’))/gu) ?? []
      if (quotedMatches.length > 0 && pkg.studentLesson.reading?.blocks) {
        const readingFullText = (pkg.studentLesson.reading.blocks ?? [])
          .flatMap((b) => Object.values(b).filter((v): v is string => typeof v === 'string'))
          .join(' ')
          .toLowerCase()
          .replace(/\s+/gu, ' ')
        for (const rawQuoted of quotedMatches) {
          const cleanQuote = rawQuoted.replace(/^["“'‘]|["”'’]$/gu, '').trim()
          if (cleanQuote.length >= 4 && !/^(?:A|B|C|D|\d+)$/i.test(cleanQuote)) {
            const normQuote = cleanQuote.toLowerCase().replace(/\s+/gu, ' ')
            if (!readingFullText.includes(normQuote) && quoteClaimsPassageSource(question.prompt, rawQuoted)) {
              findings.push(
                `CAP_QUOTE_EVIDENCE_MISMATCH:${question.id}: quoted prompt text "${cleanQuote}" does not exist in declared reading evidence`,
              )
            }
          }
        }
      }
    }
  }

  const packageRefs = new Set(pkg.qualityEvidence.precedentRefs ?? [])
  const unknownPackageRefs = [...packageRefs].filter((ref) => !CAP_REF.test(ref) || !available.has(ref))
  if (unknownPackageRefs.length > 0) findings.push(`CAP_PRECEDENT_UNKNOWN: ${unknownPackageRefs.join(', ')}`)

  const missingAggregateRefs = [...planRefs].filter((ref) => !packageRefs.has(ref))
  const extraAggregateRefs = [...packageRefs].filter((ref) => !planRefs.has(ref))
  if (missingAggregateRefs.length > 0 || extraAggregateRefs.length > 0) {
    findings.push('CAP_PROVENANCE_INCONSISTENT: qualityEvidence.precedentRefs must equal the union of per-item cap-plan precedentRefs')
  }

  return { passed: findings.length === 0, findings }
}

export interface GenericEvidencePlan {
  evidenceScope?: string
  evidenceAnchors?: Array<{
    location: string
    anchorText: string
  }>
  intentionalRecall?: boolean
  evidenceMode?: string
}

export interface EvidenceBoundaryAuditResult {
  passed: boolean
  findings: string[]
}

/**
 * Generic deterministic evidence-boundary audit for all reading-dependent questions across practice and homework.
 * Ensures questions claiming reading evidence draw exclusively from primary reading prose,
 * and detects cross-section instruction leakage without forcing vocabulary/grammar recall into CAP precedent machinery.
 */
export function auditReadingEvidenceBoundary(pkgInput: unknown): EvidenceBoundaryAuditResult {
  const pkg = pkgInput as PackageLike
  const findings: string[] = []
  if (!pkg?.studentLesson) return { passed: true, findings }

  const rawPrompt = (pkg as any).metadata?.promptVersion
  const isGoverned = !rawPrompt || isPromptVersionGte(rawPrompt, 2, 9)

  const readingBlocks = (pkg.studentLesson.reading?.blocks ?? []) as Array<Record<string, unknown>>
  const readingFullText = readingBlocks
    .flatMap((b) => Object.values(b).filter((v): v is string => typeof v === 'string'))
    .join(' ')
    .toLowerCase()
    .replace(/\s+/gu, ' ')

  // Extract non-reading instruction / box content to detect cross-section leakage
  const instructionSections = (pkg as any).studentLesson?.instruction ?? []
  const instructionTexts: string[] = []
  for (const inst of instructionSections) {
    if (inst.titleZh) instructionTexts.push(inst.titleZh)
    if (inst.explanationZh) instructionTexts.push(inst.explanationZh)
    for (const p of inst.patterns ?? []) instructionTexts.push(p)
    for (const ex of inst.workedExamples ?? []) {
      if (ex.example) instructionTexts.push(ex.example)
      if (ex.walkthroughZh) instructionTexts.push(ex.walkthroughZh)
    }
    for (const cm of inst.commonMistakes ?? []) {
      if (cm.wrong) instructionTexts.push(cm.wrong)
      if (cm.corrected) instructionTexts.push(cm.corrected)
      if (cm.whyZh) instructionTexts.push(cm.whyZh)
    }
  }
  const instructionFullText = instructionTexts.join(' ').toLowerCase().replace(/\s+/gu, ' ')

  const allPractice = pkg.studentLesson?.practice ?? []
  const allHomework = pkg.studentLesson?.homework?.questions ?? []
  const allQuestions: Array<{ stage: string; question: QuestionLike }> = [
    ...allPractice.flatMap((stage) => stage.questions.map((q) => ({ stage: stage.stage, question: q }))),
    ...allHomework.map((q) => ({ stage: 'homework', question: q })),
  ]

  for (const { stage, question } of allQuestions) {
    const plan =
      parseJsonCheck<GenericEvidencePlan>(pkg, `cap-plan:${question.id}`) ||
      parseJsonCheck<GenericEvidencePlan>(pkg, `evidence-plan:${question.id}`) ||
      parseJsonCheck<GenericEvidencePlan>(pkg, `cap-plan-${question.id}`) ||
      parseJsonCheck<GenericEvidencePlan>(pkg, `evidence-plan-${question.id}`)

    const hasReadingTarget =
      Array.isArray((question as any).targetIds) &&
      (question as any).targetIds.some((t: string) => {
        const lower = t.toLowerCase()
        return (
          lower.includes('reading') ||
          lower.includes('inference') ||
          lower.includes('detail') ||
          lower.includes('main-idea') ||
          lower.includes('evidence')
        )
      })

    const isComprehension = COMPREHENSION_TYPES.has(question.itemType)
    const isRecallType = RECALL_TYPES.has(question.itemType)
    const isExplicitRecall =
      plan?.intentionalRecall === true || (isRecallType && !hasReadingTarget && !plan?.evidenceAnchors?.length)

    const isReadingDependent =
      stage === 'cap-transfer' ||
      isComprehension ||
      hasReadingTarget ||
      plan?.evidenceMode === 'text_only' ||
      plan?.evidenceMode === 'multi_document' ||
      plan?.evidenceScope === 'primary_reading'

    if (isReadingDependent && !isExplicitRecall) {
      if (isGoverned && !plan) {
        findings.push(
          `EVIDENCE_PLAN_MISSING:${question.id}: reading-dependent question requires an internal evidence-plan:<id> or cap-plan:<id> check`,
        )
      } else if (plan) {
        if (isGoverned && (!plan.evidenceScope || plan.evidenceScope.trim().length === 0)) {
          findings.push(
            `EVIDENCE_SCOPE_MISSING:${question.id}: governed reading-dependent question must explicitly declare evidenceScope as primary_reading`,
          )
        } else if (plan.evidenceScope && plan.evidenceScope !== 'primary_reading') {
          findings.push(
            `EVIDENCE_BOUNDARY_VIOLATION:${question.id}: reading-dependent question cannot claim evidence from "${plan.evidenceScope}"; evidenceScope must be primary_reading`,
          )
        }

        if (!Array.isArray(plan.evidenceAnchors) || plan.evidenceAnchors.length === 0) {
          findings.push(
            `EVIDENCE_ANCHORS_MISSING:${question.id}: reading-dependent question requires at least one canonical evidence anchor`,
          )
        } else {
          for (const anchor of plan.evidenceAnchors) {
            const locMatch = /^studentLesson\.reading\.blocks\.(\d+)\.(text|heading|timeOrStep|event|detail|speaker|note)$/u.exec(
              anchor.location ?? '',
            )
            if (!locMatch) {
              findings.push(
                `EVIDENCE_LOCATION_INVALID:${question.id}:${anchor.location}: location must resolve to a studentLesson.reading.blocks field`,
              )
            } else {
              const blockIndex = Number(locMatch[1])
              const field = locMatch[2]!
              const block = readingBlocks[blockIndex]
              const prose = block?.[field]
              if (typeof prose !== 'string') {
                findings.push(`EVIDENCE_LOCATION_NOT_FOUND:${question.id}:${anchor.location}`)
              } else if (typeof anchor.anchorText === 'string' && anchor.anchorText.trim().length > 0) {
                const normProse = prose.toLowerCase().replace(/\s+/gu, ' ')
                const normAnchor = anchor.anchorText.toLowerCase().replace(/\s+/gu, ' ').trim()
                if (!normProse.includes(normAnchor)) {
                  if (instructionFullText.includes(normAnchor)) {
                    findings.push(
                      `EVIDENCE_BOUNDARY_LEAKAGE:${question.id}: declared evidence anchor "${anchor.anchorText}" exists only in instruction/box content, not in primary reading prose at ${anchor.location}`,
                    )
                  } else {
                    findings.push(
                      `EVIDENCE_ANCHOR_TEXT_MISSING:${question.id}: anchor text "${anchor.anchorText}" not found at ${anchor.location}`,
                    )
                  }
                }
              } else {
                findings.push(`EVIDENCE_ANCHOR_TEXT_MISSING:${question.id}: anchorText must be non-empty string`)
              }
            }
          }
        }
      }
    }

    // Defense-in-depth: verify exact quoted reading phrases in question prompt against reading text
    const quotedMatches = question.prompt.match(/(?:["“]([^"”]+)["”]|(?:'|‘)([^'’]{4,})(?:'|’))/gu) ?? []
    for (const rawQuoted of quotedMatches) {
      const cleanQuote = rawQuoted.replace(/^["“'‘]|["”'’]$/gu, '').trim()
      if (cleanQuote.length >= 4 && !/^(?:A|B|C|D|\d+)$/i.test(cleanQuote)) {
        const normQuote = cleanQuote.toLowerCase().replace(/\s+/gu, ' ')
        if (!readingFullText.includes(normQuote)) {
          if (instructionFullText.includes(normQuote)) {
            findings.push(
              `EVIDENCE_BOUNDARY_LEAKAGE:${question.id}: quoted prompt text "${cleanQuote}" exists only in instruction/box content, not in primary reading prose`,
            )
          } else if (isReadingDependent && !isExplicitRecall && quoteClaimsPassageSource(question.prompt, rawQuoted)) {
            findings.push(
              `EVIDENCE_QUOTE_MISMATCH:${question.id}: quoted prompt text "${cleanQuote}" does not exist in primary reading prose`,
            )
          }
        }
      }
    }
  }

  return { passed: findings.length === 0, findings }
}

/** Backwards-compatible low-level primitive retained for direct callers/tests. */
export function auditCapPrecedentFloor(input: CapPrecedentAuditInput): CapPrecedentAuditResult {
  const findings: string[] = []
  if (input.capTransferQuestionCount > 0 && input.precedentRefs.length === 0) {
    findings.push('CAP_PRECEDENT_MISSING: cap-transfer assessment started without an internal precedent reference')
  }
  const invalid = input.precedentRefs.filter((ref) => !CAP_REF.test(ref) || !input.availableRefs.has(ref))
  if (invalid.length > 0) findings.push(`CAP_PRECEDENT_UNKNOWN: ${[...new Set(invalid)].join(', ')}`)
  return { passed: findings.length === 0, findings }
}

export function capRuntimeMetadata(bundle: CapPrecedentRuntimeBundle = runtime) {
  return {
    capKnowledgeVersion: bundle.capKnowledgeVersion,
    capCorpusHash: bundle.capCorpusHash,
    capBundleVersion: bundle.capBundleVersion,
    plannerVersion: bundle.plannerVersion,
    qualityFloorVersion: bundle.qualityFloorVersion,
  }
}
