from pathlib import Path


builder = r'''import { createHash } from 'node:crypto'
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

export interface PrecedentRoutingCard {
  ref: string
  genre: string
  primarySkill: string
  secondarySkills: string[]
  cognitiveDepth: string
  languageDifficulty: string
  evidenceMode: string
  evidenceSpan: string
  shard: string
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
    if (hashes.size >= 24) break
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

function passageContextForExam(analyzedDir: string, examId: string): Map<string, { genre: string; copyText: string }> {
  const extractedPath = path.resolve(analyzedDir, '../extracted', `${examId}.json`)
  if (!fs.existsSync(extractedPath)) return new Map()
  const exam = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(extractedPath, 'utf8')))
  return new Map(exam.passages.map((passage) => [passage.id, {
    genre: passage.genre,
    copyText: [
      passage.title ?? '',
      passage.text,
      ...(passage.subDocuments ?? []).flatMap((doc) => [doc.title ?? '', doc.author ?? '', doc.text]),
    ].join(' '),
  }]))
}

export function buildPrecedentCards(analyzedDir: string, benchmarkDir: string): PrecedentCard[] {
  requireAuthoritativeRun(analyzedDir)
  const manifest = HoldoutManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(benchmarkDir, 'holdout-manifest.json'), 'utf8')))
  const holdouts = new Set(manifest.holdoutQuestions.map((item) => `${item.examId}-Q${item.questionNumber}`))
  const cards: PrecedentCard[] = []

  for (const file of fs.readdirSync(analyzedDir).filter((name) => /^\d{3}\.json$/.test(name)).sort()) {
    const exam = AnalyzedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(analyzedDir, file), 'utf8')))
    const passageContext = passageContextForExam(analyzedDir, exam.examId)
    for (const question of exam.questions) {
      const key = `${question.examId}-Q${question.questionNumber}`
      if (holdouts.has(key)) continue
      const analysis = question.analysis
      const linkedPassage = question.extracted.passageId ? passageContext.get(question.extracted.passageId) : undefined
      const sourceText = `${linkedPassage?.copyText ?? ''} ${question.extracted.stem} ${Object.values(question.extracted.options).join(' ')}`
      cards.push({
        ref: `cap-${hashText(`${key}:${question.contentHash}`).slice(0, 12)}`,
        genre: linkedPassage?.genre ?? question.extracted.section,
        primarySkill: analysis.primarySkill,
        secondarySkills: analysis.secondarySkills.slice(0, 3),
        cognitiveDepth: analysis.cognitiveDepth,
        languageDifficulty: analysis.languageDifficulty,
        evidenceMode: analysis.evidenceMode,
        evidenceNecessity: analysis.evidenceNecessity,
        evidenceSpan: analysis.evidenceSpan,
        reasoningOperations: analysis.reasoningOperations.slice(0, 3).map((item) => compact(item, 100)),
        questionMechanism: compact(analysis.questionMechanism, 160),
        whyTheQuestionWorks: compact(analysis.whyTheQuestionWorks, 140),
        correctAnswerConstructionPrinciple: compact(
          `Construct exactly one option supported by the planned ${analysis.evidenceSpan} evidence after ${analysis.reasoningOperations.slice(0, 2).join(' + ')}; competing options must fail a specific evidence constraint.`,
          170,
        ),
        distractorStrategies: [...new Set(analysis.optionAnalyses.flatMap((option) => option.distractorStrategy ? [option.distractorStrategy] : []))],
        reusableDesignPrinciple: compact(analysis.reusableDesignPrinciple, 140),
        difficultyAdjustment: {
          simplificationConstraints: analysis.difficultyAdjustment.simplificationConstraints.slice(0, 2).map((item) => compact(item, 90)),
          depthAdjustmentStrategies: analysis.difficultyAdjustment.depthAdjustmentStrategies.slice(0, 2).map((item) => compact(item, 90)),
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

const shardName = (card: Pick<PrecedentCard, 'primarySkill' | 'cognitiveDepth'>) => `${card.primarySkill}--${card.cognitiveDepth}.json`

/**
 * Write three layers:
 * 1. full rich runtime for deterministic Finisher auditing;
 * 2. compact 195-card routing index embedded in the production bundle;
 * 3. small skill×depth shards that Scheduled Work reads only after routing.
 *
 * The optional debug index maps opaque refs back to historical IDs for operator
 * provenance. It lives under history_exams/ and is never compiled into prompts.
 */
export function writePrecedentCards(
  analyzedDir: string,
  benchmarkDir: string,
  outputPath: string,
  indexPath?: string,
): PrecedentCard[] {
  const runtime = buildPrecedentRuntimeBundle(analyzedDir, benchmarkDir)
  const outputDir = path.dirname(outputPath)
  const routingPath = path.join(outputDir, 'cap-precedent-routing-index.json')
  const shardDir = path.join(outputDir, 'cap-precedent-shards')
  fs.mkdirSync(outputDir, { recursive: true })
  fs.rmSync(shardDir, { recursive: true, force: true })
  fs.mkdirSync(shardDir, { recursive: true })

  fs.writeFileSync(outputPath, `${JSON.stringify(runtime)}\n`)

  const routingCards: PrecedentRoutingCard[] = runtime.cards.map((card) => ({
    ref: card.ref,
    genre: card.genre,
    primarySkill: card.primarySkill,
    secondarySkills: card.secondarySkills,
    cognitiveDepth: card.cognitiveDepth,
    languageDifficulty: card.languageDifficulty,
    evidenceMode: card.evidenceMode,
    evidenceSpan: card.evidenceSpan,
    shard: `packages/generator/curriculum/cap-precedent-shards/${shardName(card)}`,
  }))
  const metadata = {
    version: runtime.version,
    authorityStatus: runtime.authorityStatus,
    capKnowledgeVersion: runtime.capKnowledgeVersion,
    capCorpusHash: runtime.capCorpusHash,
    capBundleVersion: runtime.capBundleVersion,
    plannerVersion: runtime.plannerVersion,
    qualityFloorVersion: runtime.qualityFloorVersion,
  }
  fs.writeFileSync(routingPath, `${JSON.stringify({ ...metadata, cards: routingCards })}\n`)

  const groups = new Map<string, PrecedentCard[]>()
  for (const card of runtime.cards) {
    const key = shardName(card)
    const group = groups.get(key) ?? []
    group.push(card)
    groups.set(key, group)
  }
  for (const [file, cards] of groups) {
    const authorCards = cards.map(({ copyGuardHashes: _hidden, ...card }) => card)
    fs.writeFileSync(path.join(shardDir, file), `${JSON.stringify({ ...metadata, cards: authorCards })}\n`)
  }

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
'''
Path('scripts/history-exams/src/precedents/build-precedent-cards.ts').write_text(builder, encoding='utf-8')


# The compiled bundle hashes the full deterministic runtime but embeds only the
# compact routing index. Rich mechanics are fetched from one or two routed shards.
bundle_path = Path('packages/generator/src/bundle-compiler.ts')
bundle = bundle_path.read_text(encoding='utf-8')
old_sources = """  'packages/generator/curriculum/cap-precedent-contract.md',
  'packages/generator/curriculum/cap-precedent-cards.json',
] as const"""
new_sources = """  'packages/generator/curriculum/cap-precedent-contract.md',
  'packages/generator/curriculum/cap-precedent-cards.json',
  'packages/generator/curriculum/cap-precedent-routing-index.json',
] as const"""
if old_sources not in bundle:
    raise SystemExit('bundle SOURCE_FILES anchor missing')
bundle = bundle.replace(old_sources, new_sources, 1)
bundle = bundle.replace(
    "const precedentCards = await readFile(resolve(repoRoot, 'packages/generator/curriculum/cap-precedent-cards.json'), 'utf8')",
    "const precedentRoutingIndex = await readFile(resolve(repoRoot, 'packages/generator/curriculum/cap-precedent-routing-index.json'), 'utf8')",
)
bundle = bundle.replace("'## 2B. Searchable CAP Precedent Cards'", "'## 2B. Compact CAP Precedent Routing Index'")
bundle = bundle.replace('    precedentCards.trim(),', '    precedentRoutingIndex.trim(),')
bundle_path.write_text(bundle, encoding='utf-8')


test_path = Path('packages/generator/src/bundle-compiler.test.ts')
test = test_path.read_text(encoding='utf-8')
test = test.replace('expect(Object.keys(freshBundle.metadata.sourceHashes).length).toBe(27)', 'expect(Object.keys(freshBundle.metadata.sourceHashes).length).toBe(28)')
needle = "expect(freshBundle.content).toContain('A weaker learner may receive A1/A2 language with D2/D3 thinking')"
if needle in test and "cap-precedent-shards" not in test:
    test = test.replace(needle, needle + "\n    expect(freshBundle.content).toContain('cap-precedent-shards')\n    expect(freshBundle.content).not.toContain('copyGuardHashes')", 1)
test_path.write_text(test, encoding='utf-8')


contract_path = Path('packages/generator/curriculum/cap-precedent-contract.md')
contract = contract_path.read_text(encoding='utf-8')
old = """2. retrieve 1–5 best-matching cards by those dimensions plus distractor mechanics;
3. preserve evidence topology, reasoning operation, cognitive demand, and distractor logic;"""
new = """2. use the compact routing index in this bundle to select the best `skill × depth` shard path; read only the 1–2 routed shard files needed for this item from the exact same Git SHA, then retrieve 1–5 best-matching rich cards;
3. preserve evidence topology, reasoning operation, cognitive demand, and distractor logic;"""
if old in contract:
    contract = contract.replace(old, new, 1)
contract += """

## Token-bounded runtime retrieval

The production bundle intentionally contains only a compact 195-card routing index. Rich design anchors live in `packages/generator/curriculum/cap-precedent-shards/`, partitioned by primary skill and cognitive depth. After the authoritative batch claim, read only shard paths named by the routing index and only from the same Git SHA as the bundle. Do not load the full rich 195-card runtime into the authoring context. Do not read `history_exams/` or raw PDFs during weekly generation.
"""
contract_path.write_text(contract, encoding='utf-8')


schedule_path = Path('docs/chatgpt-work-daily-schedule.md')
schedule = schedule_path.read_text(encoding='utf-8')
anchor = "This bundle is the authoritative, deterministically compiled production ruleset containing all product rules, rubric criteria, schema definitions, planning, authoring, critic, and repair instructions with cryptographic source hashes. Do not read raw source files, SPEC chunks, or egger-meow/eng-tutor during a production run. If GitHub is unavailable, the required bundle cannot be read, or the checked-out SHA cannot be identified, claim nothing and report PRECHECK_BLOCKED."
replacement = anchor + "\n\nCAP SHARD EXCEPTION — AFTER CLAIM ONLY: the bundle contains the authoritative compact CAP routing index. During per-item assessment planning, you may additionally read only the 1–2 `packages/generator/curriculum/cap-precedent-shards/*.json` paths selected by that routing index, and only at the exact same Git SHA. Never read the full rich runtime, `history_exams/`, raw CAP PDFs, benchmark holdouts, or any unlisted historical source during weekly generation."
if anchor in schedule and 'CAP SHARD EXCEPTION' not in schedule:
    schedule = schedule.replace(anchor, replacement, 1)
schedule_path.write_text(schedule, encoding='utf-8')


# Generated-artifact regression: routing has all 195 opaque refs; each shard is
# small and contains the rich mechanics that are intentionally absent from bundle.
precedent_test_path = Path('tests/history-exams/precedent-cards.test.ts')
precedent_test_path.write_text(r'''import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPrecedentCards, buildPrecedentRuntimeBundle } from '../../scripts/history-exams/src/precedents/build-precedent-cards.ts'

describe('production CAP precedent cards', () => {
  it('separates compact routing from rich authoritative non-holdout design anchors', () => {
    const root = process.cwd()
    const analyzed = path.join(root, 'history_exams/analyzed')
    const benchmark = path.join(root, 'history_exams/benchmark')
    const cards = buildPrecedentCards(analyzed, benchmark)
    expect(cards).toHaveLength(195)
    expect(new Set(cards.map((card) => card.ref)).size).toBe(195)
    expect(cards.every((card) => /^cap-[a-f0-9]{12}$/.test(card.ref))).toBe(true)
    expect(cards.every((card) => card.questionMechanism && card.reasoningOperations.length > 0 && card.reusableDesignPrinciple)).toBe(true)
    expect(cards.some((card) => card.copyGuardHashes.length > 0)).toBe(true)

    const runtime = buildPrecedentRuntimeBundle(analyzed, benchmark)
    expect(runtime.authorityStatus).toBe('authoritative')
    expect(runtime.capCorpusHash).toMatch(/^[a-f0-9]{64}$/)

    const routing = JSON.parse(fs.readFileSync(path.join(root, 'packages/generator/curriculum/cap-precedent-routing-index.json'), 'utf8'))
    expect(routing.cards).toHaveLength(195)
    expect(JSON.stringify(routing)).not.toMatch(/111-Q\d|112-Q\d|113-Q\d|114-Q\d|115-Q\d/)
    expect(JSON.stringify(routing)).not.toContain('questionMechanism')
    for (const row of routing.cards) {
      expect(row.shard).toMatch(/^packages\/generator\/curriculum\/cap-precedent-shards\//)
      expect(fs.existsSync(path.join(root, row.shard))).toBe(true)
    }

    const shardPaths = [...new Set(routing.cards.map((row: { shard: string }) => row.shard))]
    expect(shardPaths.length).toBeGreaterThan(5)
    for (const shardPath of shardPaths) {
      const shard = JSON.parse(fs.readFileSync(path.join(root, shardPath), 'utf8'))
      expect(shard.authorityStatus).toBe('authoritative')
      expect(shard.cards.length).toBeGreaterThan(0)
      expect(shard.cards.every((card: { questionMechanism?: string; copyGuardHashes?: unknown }) => Boolean(card.questionMechanism) && card.copyGuardHashes === undefined)).toBe(true)
    }
  })
})
''', encoding='utf-8')
