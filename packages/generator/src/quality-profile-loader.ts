import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_QUALITY_PROFILES_DIR = resolve(currentDir, '../quality-profiles')

export type QualityProfileTargetArea =
  | 'english-naturalness'
  | 'grammar-collocations'
  | 'chinese-naturalness'
  | 'explanation-causality'
  | 'formatting-content'
  | 'general'

export interface QualityProfileRule {
  id: string
  title: string
  targetArea: QualityProfileTargetArea
  description: string
  checkPoints: string[]
}

export interface QualityProfile {
  name: string
  version: string
  modelId: string
  modelPatterns: string[]
  isFallback: boolean
  description: string
  activeRules: QualityProfileRule[]
  observations: string[]
  rawContent: string
}

function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const rawYaml = match[1]
  const body = match[2]
  const frontmatter: Record<string, any> = {}

  let currentArrayKey: string | null = null

  for (const line of rawYaml.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('- ') && currentArrayKey) {
      const item = trimmed.slice(2).trim().replace(/^["']|["']$/g, '')
      if (!Array.isArray(frontmatter[currentArrayKey])) {
        frontmatter[currentArrayKey] = []
      }
      frontmatter[currentArrayKey].push(item)
      continue
    }

    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const val = line.slice(colonIndex + 1).trim()
      if (!val) {
        currentArrayKey = key
        frontmatter[key] = []
      } else {
        currentArrayKey = null
        frontmatter[key] = val.replace(/^["']|["']$/g, '')
      }
    }
  }

  return { frontmatter, body }
}

export function parseQualityProfileMarkdown(
  filename: string,
  rawContent: string,
  isFallback = false,
): QualityProfile {
  const { frontmatter, body } = parseFrontmatter(rawContent)

  const name = filename.replace(/\.md$/i, '')
  const version = (frontmatter.profileVersion as string) || '1.0.0'
  const modelId = (frontmatter.modelId as string) || name
  const rawPatterns = frontmatter.modelPatterns
  const modelPatterns: string[] = Array.isArray(rawPatterns)
    ? rawPatterns.map((p) => String(p).toLowerCase().trim())
    : [modelId.toLowerCase().trim()]

  const description = (frontmatter.description as string) || ''

  const activeRules: QualityProfileRule[] = []
  const observations: string[] = []

  // Extract sections
  const activeRulesSectionMatch = body.match(/## Active Quality Rules\r?\n([\s\S]*?)(?=\r?\n## |\r?\n# |$)/i)
  const observationsSectionMatch = body.match(/## Human-Maintained Observations\r?\n([\s\S]*?)(?=\r?\n## |\r?\n# |$)/i)

  if (activeRulesSectionMatch) {
    const rulesText = activeRulesSectionMatch[1]
    const ruleBlocks = rulesText.split(/(?=\r?\n### |\r?\n\d+\.\s+)/).filter((b) => {
      const trimmed = b.trim()
      return trimmed.length > 0 && !trimmed.startsWith('<!--')
    })

    for (const block of ruleBlocks) {
      const titleMatch = block.match(/###\s+(?:[\d.]+\s*)?([^\r\n]+)/) || block.match(/^(?:[\d.]+\s*)?([^\r\n]+)/)
      const targetAreaMatch = block.match(/-\s*\*\*Target Area:\*\*\s*`?([a-zA-Z0-9_-]+)`?/i)
      const ruleIdMatch = block.match(/-\s*\*\*Rule ID:\*\*\s*`?([a-zA-Z0-9_-]+)`?/i)
      const descMatch = block.match(/-\s*\*\*Description:\*\*\s*([^\r\n]+)/i)

      if (!targetAreaMatch && !ruleIdMatch && !block.includes('###')) {
        // Skip non-rule text paragraphs or comments
        continue
      }

      const rawTitle = titleMatch ? titleMatch[1].trim() : ''
      if (!rawTitle || rawTitle.startsWith('<!--')) continue

      const targetArea = (targetAreaMatch ? targetAreaMatch[1].trim() : 'general') as QualityProfileTargetArea
      const ruleId = ruleIdMatch ? ruleIdMatch[1].trim() : rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const ruleDesc = descMatch ? descMatch[1].trim() : ''

      const checkPoints: string[] = []
      const checkPointsMatch = block.match(/-\s*\*\*Check Points:\*\*([\s\S]*?)(?=\r?\n- \*\*|$)/i)
      if (checkPointsMatch) {
        for (const line of checkPointsMatch[1].split(/\r?\n/)) {
          const m = line.match(/^\s*-\s+(.+)$/)
          if (m) checkPoints.push(m[1].trim())
        }
      }

      activeRules.push({
        id: ruleId,
        title: rawTitle,
        targetArea,
        description: ruleDesc,
        checkPoints,
      })
    }
  }

  if (observationsSectionMatch) {
    const obsText = observationsSectionMatch[1]
    for (const line of obsText.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed.startsWith('- [') || trimmed.startsWith('* [')) {
        observations.push(trimmed.slice(2).trim())
      }
    }
  }

  return {
    name,
    version,
    modelId,
    modelPatterns,
    isFallback,
    description,
    activeRules,
    observations,
    rawContent,
  }
}

export function normalizeModelIdentifier(modelName?: string): string {
  if (!modelName) return 'default'
  let normalized = modelName.trim().toLowerCase()
  if (normalized.startsWith('models/')) {
    normalized = normalized.slice(7)
  }
  return normalized
}

export async function loadQualityProfileFromFile(
  filePath: string,
  isFallback = false,
): Promise<QualityProfile> {
  const content = await readFile(filePath, 'utf8')
  const filename = filePath.split(/[/\\]/).pop() || 'profile.md'
  return parseQualityProfileMarkdown(filename, content, isFallback)
}

export async function resolveQualityProfile(
  modelName?: string,
  profilesDir: string = DEFAULT_QUALITY_PROFILES_DIR,
): Promise<QualityProfile> {
  const normalized = normalizeModelIdentifier(modelName)

  if (normalized === 'default' || normalized === 'unknown') {
    const defaultPath = resolve(profilesDir, 'default.md')
    return loadQualityProfileFromFile(defaultPath, true)
  }

  // 1. Try direct filename match: e.g. gemini-3.7-flash.md
  const directPath = resolve(profilesDir, `${normalized}.md`)
  try {
    const directProfile = await loadQualityProfileFromFile(directPath, false)
    return directProfile
  } catch {
    // try pattern scanning
  }

  // 2. Scan all .md files in the profiles directory
  try {
    const entries = await readdir(profilesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      if (entry.name === 'observations.md') continue // skip cross-model log

      const fullPath = resolve(profilesDir, entry.name)
      const profile = await loadQualityProfileFromFile(fullPath, entry.name === 'default.md')

      if (
        profile.modelPatterns.includes(normalized) ||
        profile.modelId.toLowerCase() === normalized ||
        profile.modelPatterns.some((pattern) => {
          if (pattern === '*') return false
          return normalized.includes(pattern) || pattern.includes(normalized)
        })
      ) {
        return profile
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to read quality profiles directory at "${profilesDir}": ${message}`)
  }

  // 3. Fallback to default.md
  const defaultPath = resolve(profilesDir, 'default.md')
  try {
    return await loadQualityProfileFromFile(defaultPath, true)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Fallback quality profile default.md not found or corrupted: ${message}`)
  }
}
