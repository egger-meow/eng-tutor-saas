import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CURRENT_ENGINE_MANIFEST,
  CURRENT_ENGINE_VERSION,
  CURRENT_PDF_RENDERER_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_QUALITY_PROFILE_VERSION,
  CURRENT_RELEASE_ID,
  CURRENT_SCHEMA_VERSION,
  CURRENT_WORKER_VERSION,
} from '../packages/generator/src/engine-version.js'

const REPO_ROOT = resolve(import.meta.dirname, '..')

describe('Canonical Version Synchronization Guardrails', () => {
  it('synchronizes CURRENT_ENGINE_MANIFEST with central version constants', () => {
    expect(CURRENT_ENGINE_MANIFEST.releaseId).toBe(CURRENT_RELEASE_ID)
    expect(CURRENT_ENGINE_MANIFEST.engine).toBe(CURRENT_ENGINE_VERSION)
    expect(CURRENT_ENGINE_MANIFEST.schema).toBe(CURRENT_SCHEMA_VERSION)
    expect(CURRENT_ENGINE_MANIFEST.prompt).toBe(CURRENT_PROMPT_VERSION)
    expect(CURRENT_ENGINE_MANIFEST.qualityProfile).toBe(CURRENT_QUALITY_PROFILE_VERSION)
    expect(CURRENT_ENGINE_MANIFEST.worker).toBe(CURRENT_WORKER_VERSION)
    expect(CURRENT_ENGINE_MANIFEST.pdfRenderer).toBe(CURRENT_PDF_RENDERER_VERSION)
    expect(CURRENT_PDF_RENDERER_VERSION).toBe('1.6.0')
  })

  it('binds both claim paths to the deployed contract independently of desired release', () => {
    const content = readFileSync(resolve(REPO_ROOT,
      'supabase/migrations/20260910133101_prepare_curriculum_diversity_consumers.sql'), 'utf8')
    expect(content).toContain('private_generation.chatgpt_claim_generation_batch(text)')
    expect(content).toContain('private_generation.claim_week1_fast_generation_batch(text)')
    expect(content).toContain("'targetReleaseId', public.worker_current_authoring_contract()->>'releaseId'")
    // Consumer preparation must not activate the desired release.
    expect(content).not.toContain(`'releaseId', '${CURRENT_RELEASE_ID}'`)
  })

  it('checks actual claim contexts against the deployed active contract in SQL smoke tests', () => {
    const smokeSql = readFileSync(resolve(REPO_ROOT, 'supabase/tests/smoke.sql'), 'utf8')
    expect(smokeSql.match(/->> 'targetReleaseId' is distinct from public\.worker_current_authoring_contract\(\)->>'releaseId'/gu)).toHaveLength(4)
    expect(smokeSql).not.toContain("->> 'targetReleaseId' <> 'rel_1.8.2'")
  })
})
