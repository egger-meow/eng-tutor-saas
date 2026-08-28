import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { OFFICIAL_CAP_ANSWERS } from '../extractor/official-answers.ts'

export interface RollingWindowOptions {
  rawDir: string
  extractedDir: string
  analyzedDir: string
  assetsDir: string
  agentAnalysisDir?: string
}

export interface RollingWindowResult {
  examIds: string[]
  unchangedExamIds: string[]
  changedExamIds: string[]
  removedExamIds: string[]
  sourceHashes: Record<string, string>
}

const sha256 = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

function artifactIds(directory: string): string[] {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory).flatMap((name) => {
    const match = name.match(/^(\d{3})(?:\.json)?$/)
    return match ? [match[1]!] : []
  })
}

/** Reconciles derived artifacts to the five consecutive PDFs in raw/. It never mutates raw/. */
export function reconcileRollingWindow(options: RollingWindowOptions): RollingWindowResult {
  const rawFiles = fs.readdirSync(options.rawDir).filter((name) => /^\d{3}P_English\.pdf$/i.test(name)).sort()
  const examIds = rawFiles.map((name) => name.slice(0, 3))
  if (examIds.length !== 5 || examIds.some((id, index) => index > 0 && Number(id) !== Number(examIds[index - 1]) + 1)) {
    throw new Error(`[RollingWindowError] raw/ must contain exactly five consecutive CAP years; found ${examIds.join(', ')}`)
  }
  for (const examId of examIds) {
    const answers = OFFICIAL_CAP_ANSWERS[examId]
    if (!answers || Object.keys(answers).length !== 43) {
      throw new Error(`[OfficialAnswerKeyError] ${examId} has no verified official 43-item answer key`)
    }
  }

  const sourceHashes = Object.fromEntries(rawFiles.map((name) => [name.slice(0, 3), sha256(path.join(options.rawDir, name))]))
  const manifestPath = path.resolve(options.rawDir, '../rolling-window-manifest.json')
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { sourceHashes?: Record<string, string> } : {}
  const unchangedExamIds = examIds.filter((id) => previous.sourceHashes?.[id] === sourceHashes[id] && fs.existsSync(path.join(options.analyzedDir, `${id}.json`)))
  const changedExamIds = examIds.filter((id) => !unchangedExamIds.includes(id))
  const active = new Set(examIds)
  const derivedDirs = [options.extractedDir, options.analyzedDir, options.assetsDir, ...(options.agentAnalysisDir ? [options.agentAnalysisDir] : [])]
  const removedExamIds = [...new Set(derivedDirs.flatMap(artifactIds))].filter((id) => !active.has(id)).sort()
  for (const directory of derivedDirs) {
    for (const id of removedExamIds) {
      const file = path.join(directory, `${id}.json`)
      const folder = path.join(directory, id)
      if (fs.existsSync(file)) fs.rmSync(file)
      if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true })
    }
  }
  fs.mkdirSync(options.analyzedDir, { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify({ version: '1.0.0', examIds, sourceHashes }, null, 2))
  return { examIds, unchangedExamIds, changedExamIds, removedExamIds, sourceHashes }
}
