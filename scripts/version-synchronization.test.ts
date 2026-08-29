import { readdirSync, readFileSync } from 'node:fs'
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
  })

  it('ensures the latest advance release migration in Supabase emits CURRENT_RELEASE_ID', () => {
    const migrationsDir = resolve(REPO_ROOT, 'supabase/migrations')
    const migrationFiles = readdirSync(migrationsDir).sort()
    const releaseMigrations = migrationFiles.filter((f) => f.includes('advance_generation_release_to_') || f.includes('harden_chatgpt_submission_bridge'))
    expect(releaseMigrations.length).toBeGreaterThan(0)
    const latestReleaseMigration = releaseMigrations[releaseMigrations.length - 1]!
    const content = readFileSync(resolve(migrationsDir, latestReleaseMigration), 'utf8')

    // Must emit CURRENT_RELEASE_ID in chatgpt_claim_generation_batch
    expect(content).toContain(`'targetReleaseId', '${CURRENT_RELEASE_ID}'`)
  })

  it('ensures supabase/tests/smoke.sql tests CURRENT_RELEASE_ID in claim contexts', () => {
    const smokeSql = readFileSync(resolve(REPO_ROOT, 'supabase/tests/smoke.sql'), 'utf8')
    expect(smokeSql).toContain(`'targetReleaseId' <> '${CURRENT_RELEASE_ID}'`)
    expect(smokeSql).toContain(`targetReleaseId ${CURRENT_RELEASE_ID}`)
  })
})
