/**
 * Canonical Central Engine Versioning for 紙屬英文
 *
 * - `CURRENT_ENGINE_VERSION`: Semantic version of the generation & pedagogy engine (currently '1.3.0')
 * - `CURRENT_SCHEMA_VERSION`: Canonical schema version for curriculum package structure ('2.3.0')
 * - `CURRENT_PROMPT_VERSION`: Active prompt suite version ('2.7.0')
 * - `CURRENT_ERA_TAG`: Stable machine era identifier ('engine_v1')
 * - `CURRENT_QUALITY_PROFILE_VERSION`: Quality profile revision ('1.1.0')
 */

export const CURRENT_ENGINE_VERSION = '1.3.0'
export const CURRENT_SCHEMA_VERSION = '2.3.0'
export const CURRENT_PROMPT_VERSION = '2.7.0'
export const CURRENT_ERA_TAG = 'engine_v1' as const
export const CURRENT_QUALITY_PROFILE_VERSION = '1.1.0'
export const CURRENT_WORKER_VERSION = '1.3.0'
export const CURRENT_PDF_RENDERER_VERSION = '1.0.0'

export const CURRENT_ENGINE_MANIFEST = {
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
