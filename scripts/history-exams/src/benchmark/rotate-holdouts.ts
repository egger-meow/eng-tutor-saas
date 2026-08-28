import fs from 'node:fs'
import path from 'node:path'
import { AnalyzedExamSchema } from '../schemas/analyzed.ts'
import { HoldoutManifestSchema } from '../schemas/benchmark.ts'

export function rotateHoldoutManifest(analyzedDir: string, benchmarkDir: string, examIds: string[]) {
  const manifestPath = path.join(benchmarkDir, 'holdout-manifest.json')
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { holdoutQuestions: [] }
  const retained = (previous.holdoutQuestions as any[]).filter((item) => examIds.includes(item.examId))
  const items = [...retained]
  for (const examId of examIds) {
    if (items.filter((item) => item.examId === examId).length === 4) continue
    const exam = AnalyzedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(analyzedDir, `${examId}.json`), 'utf8')))
    const singles = exam.questions.filter((q) => q.extracted.section === 'single')
    const passages = exam.questions.filter((q) => q.extracted.section !== 'single')
    const selected = [
      exam.questions.find((q) => q.questionNumber === 1)!,
      singles[Math.floor(singles.length / 2)]!,
      passages[Math.floor(passages.length / 3)]!,
      passages[Math.floor(passages.length * 3 / 4)]!,
    ]
    for (const q of selected) items.push({
      examId,
      questionNumber: q.questionNumber,
      section: q.extracted.section,
      genre: q.extracted.section,
      evidenceMode: q.extracted.evidenceMode,
      primarySkillTarget: q.analysis.primarySkill,
      cognitiveDepthTarget: q.analysis.cognitiveDepth,
      rationale: 'Deterministic rolling-window stratification across visual, single-item, and passage assessment mechanics',
    })
  }
  const result = HoldoutManifestSchema.parse({
    version: '1.1.0',
    generatedAt: new Date().toISOString(),
    description: 'Rolling stratified 4-per-year holdout set. Strictly isolated from synthesis and production retrieval.',
    totalHoldoutQuestions: 20,
    stratificationRules: ['Exactly 4 items per active raw/ year', 'Strict isolation from synthesis and production precedent retrieval'],
    holdoutQuestions: items.sort((a, b) => a.examId.localeCompare(b.examId) || a.questionNumber - b.questionNumber),
  })
  fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2))
  return result
}
