import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { AnalyzedExamSchema } from '../schemas/analyzed.ts'
import { HoldoutManifestSchema } from '../schemas/benchmark.ts'

export interface PrecedentCard {
  ref: string
  genre: string
  primarySkill: string
  secondarySkills: string[]
  cognitiveDepth: string
  languageDifficulty: string
  evidenceMode: string
  evidenceSpan: string
  distractorStrategies: string[]
}

export function buildPrecedentCards(analyzedDir: string, benchmarkDir: string): PrecedentCard[] {
  const manifest = HoldoutManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(benchmarkDir, 'holdout-manifest.json'), 'utf8')))
  const holdouts = new Set(manifest.holdoutQuestions.map((item) => `${item.examId}-Q${item.questionNumber}`))
  const cards: PrecedentCard[] = []
  for (const file of fs.readdirSync(analyzedDir).filter((name) => /^\d{3}\.json$/.test(name)).sort()) {
    const exam = AnalyzedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(analyzedDir, file), 'utf8')))
    for (const question of exam.questions) {
      const key = `${question.examId}-Q${question.questionNumber}`
      if (holdouts.has(key)) continue
      const a = question.analysis
      cards.push({
        ref: `cap-${createHash('sha256').update(`${key}:${question.contentHash}`).digest('hex').slice(0, 12)}`,
        genre: question.extracted.section,
        primarySkill: a.primarySkill,
        secondarySkills: a.secondarySkills,
        cognitiveDepth: a.cognitiveDepth,
        languageDifficulty: a.languageDifficulty,
        evidenceMode: a.evidenceMode,
        evidenceSpan: a.evidenceSpan,
        distractorStrategies: a.optionAnalyses.flatMap((option) => option.distractorStrategy ? [option.distractorStrategy] : []),
      })
    }
  }
  return cards
}

export function writePrecedentCards(analyzedDir: string, benchmarkDir: string, outputPath: string): PrecedentCard[] {
  const cards = buildPrecedentCards(analyzedDir, benchmarkDir)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify({ version: '1.0.0', cards }, null, 0)}\n`)
  return cards
}
