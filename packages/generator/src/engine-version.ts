/**
 * Canonical Central Engine Versioning for 紙屬英文
 *
 * - `CURRENT_ENGINE_VERSION`: Semantic version of the generation & pedagogy engine (currently '1.6.0')
 * - `CURRENT_SCHEMA_VERSION`: Canonical schema version for curriculum package structure ('2.4.0')
 * - `CURRENT_PROMPT_VERSION`: Active consolidated prompt suite version ('2.11.1')
 * - `CURRENT_ERA_TAG`: Stable machine era identifier ('engine_v1')
 * - `CURRENT_QUALITY_PROFILE_VERSION`: Quality profile revision ('1.2.0')
 */

export const CURRENT_RELEASE_ID = 'rel_1.6.0'
export const CURRENT_ENGINE_VERSION = '1.6.0'
export const CURRENT_SCHEMA_VERSION = '2.4.0'
export const CURRENT_PROMPT_VERSION = '2.11.1'
export const CURRENT_ERA_TAG = 'engine_v1' as const
export const CURRENT_QUALITY_PROFILE_VERSION = '1.2.0'
export const CURRENT_WORKER_VERSION = '1.5.0'
export const CURRENT_PDF_RENDERER_VERSION = '1.5.0'

export const CURRENT_ENGINE_MANIFEST = {
  releaseId: CURRENT_RELEASE_ID,
  engine: CURRENT_ENGINE_VERSION,
  schema: CURRENT_SCHEMA_VERSION,
  prompt: CURRENT_PROMPT_VERSION,
  qualityProfile: CURRENT_QUALITY_PROFILE_VERSION,
  worker: CURRENT_WORKER_VERSION,
  pdfRenderer: CURRENT_PDF_RENDERER_VERSION,
} as const

export type EraTag = typeof CURRENT_ERA_TAG | 'historical'

/**
 * Returns the human-readable display label for an engine era and optional per-submission engine version.
 * - For era 'engine_v1': returns `Engine v${engineVersion}` if provided, or `Engine v${CURRENT_ENGINE_VERSION}`.
 * - For era 'historical': returns `Historical (v${engineVersion})` if provided, or `Historical`.
 */
export function formatEngineEraLabel(era: EraTag, engineVersion?: string | null): string {
  if (era === 'engine_v1') {
    return engineVersion ? `Engine v${engineVersion}` : `Engine v${CURRENT_ENGINE_VERSION}`
  }
  return engineVersion ? `Historical (v${engineVersion})` : 'Historical'
}

/**
 * Formats an engine version into a standard label (e.g. 'Engine v1.0.1').
 */
export function formatEngineVersion(engineVersion?: string | null): string {
  return `Engine v${engineVersion || CURRENT_ENGINE_VERSION}`
}

/** Normalizes prompt version strings by removing optional "prompt/" prefix */
export function normalizePromptVersion(rawPromptVersion?: string | null): string {
  if (!rawPromptVersion) return ''
  return rawPromptVersion.replace(/^prompt\//u, '').trim()
}

/** Checks whether a prompt version string meets or exceeds the specified target major/minor version */
export function isPromptVersionGte(rawPromptVersion: string | undefined | null, targetMajor: number, targetMinor: number, targetPatch = 0): boolean {
  const norm = normalizePromptVersion(rawPromptVersion)
  const match = norm.match(/^(\d+)\.(\d+)(?:\.(\d+))?/u)
  if (!match) return false
  const major = parseInt(match[1]!, 10)
  const minor = parseInt(match[2]!, 10)
  const patch = parseInt(match[3] ?? '0', 10)
  if (major > targetMajor) return true
  if (major === targetMajor && minor > targetMinor) return true
  if (major === targetMajor && minor === targetMinor && patch >= targetPatch) return true
  return false
}
