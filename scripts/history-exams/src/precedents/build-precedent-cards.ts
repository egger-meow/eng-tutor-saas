import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { AnalyzedExamSchema } from '../schemas/analyzed.ts'
import { HoldoutManifestSchema } from '../schemas/benchmark.ts'
import { ExtractedExamSchema } from '../schemas/extracted.ts'

const RUNTIME_VERSION = '1.1.0'
const PLANNER_VERSION = 'cap-planner-1.0.0'
const QUALITY_FLOOR_VERSION = 'cap-floor-1.0.0'

export interface PrecedentCard {
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

export interface PrecedentRuntimeBundle {
  version: string
  authorityStatus: 'authoritative'
  capKnowledgeVersion: string
  capCorpusHash: string
  capBundleVersion: string
  plannerVersion: string
  qualityFloorVersion: string
  cards: PrecedentCard[]
}

const compact = (value: string | undefined, max = 160) => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

const hashText = (value: string) => createHash('sha256').update(value).digest('hex')

function fiveGramHashes(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []
  const hashes = new Set<string>()
  for (let index = 0; index <= tokens.length - 5; index += 1) {
    hashes.add(hashText(tokens.slice(index, index + 5).join(' ')).slice(0, 16))
    if (hashes.size >= 16) break
  }
  return [...hashes]
}

function requireAuthoritativeRun(analyzedDir: string): { corpusHash: string } {
  const manifestPath = path.join(analyzedDir, 'run-manifest.json')
  if (!fs.existsSync(manifestPath)) throw new Error('[CAPAuthorityError] missing analyzed/run-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
  const passed = Number(manifest.criticPassedCount ?? 0)
  const repaired = Number(manifest.criticRepairedCount ?? 0)
  if (
    Number(manifest.totalQuestions) !== 215
    || Number(manifest.liveOrAgentQuestionCount) !== 215
    || Number(manifest.mockQuestionCount) !== 0
    || Number(manifest.unresolvedCount) !== 0
    || Number(manifest.criticFailedCount) !== 0
    || Number(manifest.criticNotReviewedCount) !== 0
    || passed + repaired !== 215
  ) {
    throw new Error('[CAPAuthorityError] precedent compilation requires 215 authoritative live/agent analyses with zero mock/unresolved/failed records')
  }
  const corpusHash = String(manifest.corpusHash ?? '')
  if (!/^[a-f0-9]{64}$/.test(corpusHash)) throw new Error('[CAPAuthorityError] missing canonical 64-char corpus hash')
  return { corpusHash }
}

function passageGenresForExam(analyzedDir: string, examId: string): Map<string, string> {
  const extractedPath = path.resolve(analyzedDir, '../extracted', `${examId}.json`)
  if (!fs.existsSync(extractedPath)) return new Map()
  const exam = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(extractedPath, 'utf8')))
  return new Map(exam.passages.map((passage) => [passage.id, passage.genre]))
}

export function buildPrecedentCards(analyzedDir: string, benchmarkDir: string): PrecedentCard[] {
  requireAuthoritativeRun(analyzedDir)
  const manifest = HoldoutManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(benchmarkDir, 'holdout-manifest.json'), 'utf8')))
  const holdouts = new Set(manifest.holdoutQuestions.map((item) => `${item.examId}-Q${item.questionNumber}`))
  const cards: PrecedentCard[] = []

  for (const file of fs.readdirSync(analyzedDir).filter((name) => /^\d{3}\.json$/.test(name)).sort()) {
    const exam = AnalyzedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(analyzedDir, file), 'utf8')))
    const passageGenres = passageGenresForExam(analyzedDir, exam.examId)
    for (const question of exam.questions) {
      const key = `${question.examId}-Q${question.questionNumber}`
      if (holdouts.has(key)) continue
      const a = question.analysis
      const sourceText = `${question.extracted.stem} ${Object.values(question.extracted.options).join(' ')}`
      cards.push({
        ref: `cap-${hashText(`${key}:${question.contentHash}`).slice(0, 12)}`,
        genre: question.extracted.passageId ? (passageGenres.get(question.extracted.passageId) ?? question.extracted.section) : question.extracted.section,
        primarySkill: a.primarySkill,
        secondarySkills: a.secondarySkills.slice(0, 3),
        cognitiveDepth: a.cognitiveDepth,
        languageDifficulty: a.languageDifficulty,
        evidenceMode: a.evidenceMode,
        evidenceNecessity: a.evidenceNecessity,
        evidenceSpan: a.evidenceSpan,
        reasoningOperations: a.reasoningOperations.slice(0, 3).map((item) => compact(item, 100)),
        questionMechanism: compact(a.questionMechanism, 160),
        whyTheQuestionWorks: compact(a.whyTheQuestionWorks, 140),
        correctAnswerConstructionPrinciple: compact(
          `Construct exactly one option supported by the planned ${a.evidenceSpan} evidence after ${a.reasoningOperations.slice(0, 2).join(' + ')}; competing options must fail a specific evidence constraint.`,
          170,
        ),
        distractorStrategies: [...new Set(a.optionAnalyses.flatMap((option) => option.distractorStrategy ? [option.distractorStrategy] : []))],
        reusableDesignPrinciple: compact(a.reusableDesignPrinciple, 140),
        difficultyAdjustment: {
          simplificationConstraints: a.difficultyAdjustment.simplificationConstraints.slice(0, 2).map((item) => compact(item, 90)),
          depthAdjustmentStrategies: a.difficultyAdjustment.depthAdjustmentStrategies.slice(0, 2).map((item) => compact(item, 90)),
        },
        copyGuardHashes: fiveGramHashes(sourceText),
      })
    }
  }

  if (cards.length !== 195) throw new Error(`[CAPAuthorityError] expected 195 non-holdout precedent cards, found ${cards.length}`)
  if (new Set(cards.map((card) => card.ref)).size !== cards.length) throw new Error('[CAPAuthorityError] precedent refs must be unique')
  return cards
}

export function buildPrecedentRuntimeBundle(analyzedDir: string, benchmarkDir: string): PrecedentRuntimeBundle {
  const { corpusHash } = requireAuthoritativeRun(analyzedDir)
  return {
    version: RUNTIME_VERSION,
    authorityStatus: 'authoritative',
    capKnowledgeVersion: `cap-knowledge-${corpusHash.slice(0, 16)}`,
    capCorpusHash: corpusHash,
    capBundleVersion: `cap-runtime-${RUNTIME_VERSION}`,
    plannerVersion: PLANNER_VERSION,
    qualityFloorVersion: QUALITY_FLOOR_VERSION,
    cards: buildPrecedentCards(analyzedDir, benchmarkDir),
  }
}

/**
 * Writes the compact production runtime. Optionally writes a separate debug-only
 * opaque-ref map under history_exams/. The debug map is never compiled into the
 * production authoring bundle.
 */
export function writePrecedentCards(
  analyzedDir: string,
  benchmarkDir: string,
  outputPath: string,
  indexPath?: string,
): PrecedentCard[] {
  const runtime = buildPrecedentRuntimeBundle(analyzedDir, benchmarkDir)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(runtime)}\n`)

  if (indexPath) {
    const manifest = HoldoutManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(benchmarkDir, 'holdout-manifest.json'), 'utf8')))
    const holdouts = new Set(manifest.holdoutQuestions.map((item) => `${item.examId}-Q${item.questionNumber}`))
    const rows: Array<{ ref: string; examId: string; questionNumber: number; contentHash: string }> = []
    for (const file of fs.readdirSync(analyzedDir).filter((name) => /^\d{3}\.json$/.test(name)).sort()) {
      const exam = AnalyzedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(analyzedDir, file), 'utf8')))
      for (const question of exam.questions) {
        const key = `${question.examId}-Q${question.questionNumber}`
        if (holdouts.has(key)) continue
        rows.push({
          ref: `cap-${hashText(`${key}:${question.contentHash}`).slice(0, 12)}`,
          examId: question.examId,
          questionNumber: question.questionNumber,
          contentHash: question.contentHash,
        })
      }
    }
    fs.mkdirSync(path.dirname(indexPath), { recursive: true })
    fs.writeFileSync(indexPath, `${JSON.stringify({ version: RUNTIME_VERSION, capCorpusHash: runtime.capCorpusHash, rows }, null, 2)}\n`)
  }

  return runtime.cards
}
