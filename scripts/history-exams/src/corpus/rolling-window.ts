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

interface RollingWindowManifest {
  version: '1.1.0'
  authorityStatus: 'authoritative'
  examIds: string[]
  sourceHashes: Record<string, string>
  sealedAt: string
}

const sha256 = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

function artifactIds(directory: string): string[] {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory).flatMap((name) => {
    const match = name.match(/^(\d{3})(?:\.json)?$/)
    return match ? [match[1]!] : []
  })
}

function manifestPath(rawDir: string): string {
  return path.resolve(rawDir, '../rolling-window-manifest.json')
}

function readTrustedManifest(rawDir: string): RollingWindowManifest | null {
  const file = manifestPath(rawDir)
  if (!fs.existsSync(file)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<RollingWindowManifest>
    if (parsed.version !== '1.1.0' || parsed.authorityStatus !== 'authoritative' || !parsed.sourceHashes || !Array.isArray(parsed.examIds)) {
      return null
    }
    return parsed as RollingWindowManifest
  } catch {
    return null
  }
}

/**
 * Reconciles derived artifacts to the five consecutive PDFs in raw/.
 *
 * This function deliberately does NOT persist the new PDF hashes. The caller may
 * seal them with commitRollingWindowManifest() only after extraction, analysis,
 * synthesis, benchmark construction, and authoritative validation all succeed.
 * A crashed build therefore cannot make a later run reuse stale analyzed data.
 */
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
  const previous = readTrustedManifest(options.rawDir)
  const unchangedExamIds = examIds.filter((id) =>
    previous?.sourceHashes[id] === sourceHashes[id]
    && previous.examIds.includes(id)
    && fs.existsSync(path.join(options.extractedDir, `${id}.json`))
    && fs.existsSync(path.join(options.analyzedDir, `${id}.json`)),
  )
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

  return { examIds, unchangedExamIds, changedExamIds, removedExamIds, sourceHashes }
}

/** Seal a rolling window only after the full corpus is certified authoritative. */
export function commitRollingWindowManifest(rawDir: string, result: RollingWindowResult): string {
  const file = manifestPath(rawDir)
  const manifest: RollingWindowManifest = {
    version: '1.1.0',
    authorityStatus: 'authoritative',
    examIds: result.examIds,
    sourceHashes: result.sourceHashes,
    sealedAt: new Date().toISOString(),
  }
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return file
}
