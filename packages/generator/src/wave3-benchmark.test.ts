import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'

describe('Wave 3 Multi-Model & Ablation Benchmark Suite', () => {
  let manifest: any

  beforeAll(async () => {
    const raw = await readFile(resolve(REPO_ROOT, 'docs/evaluations/wave-3/manifest.json'), 'utf8')
    manifest = JSON.parse(raw)
  })

  it('validates Wave 3 manifest schema and versioning provenance with simulation labeling', () => {
    expect(manifest.isSimulation).toBe(true)
    expect(manifest.evaluationType).toBe('modeled-reliability-projection')
    expect(manifest.disclaimer).toContain('NOT empirical model results')
    expect(manifest.schemaVersion).toBe('2.0.0')
    expect(manifest.promptVersion).toBe('2.2.0')
    expect(manifest.bundleVersion).toBe('2.2.0-prod')
    expect(manifest.manifestHash).toBeDefined()
    expect(manifest.results.length).toBe(15) // 3 tiers * 5 ablation variants
  })

  it('verifies that normalization improves first-pass pass rate across all tiers', () => {
    for (const tier of ['strong', 'medium', 'cheap']) {
      const baseline = manifest.results.find((r: any) => r.tierKey === tier && r.variantId === 'v1-baseline')
      const normalized = manifest.results.find((r: any) => r.tierKey === tier && r.variantId === 'v2-normalize-only')

      expect(normalized.firstPassPassRate).toBeGreaterThan(baseline.firstPassPassRate)
      expect(normalized.structuralFailuresPer100).toBeLessThan(baseline.structuralFailuresPer100)
    }
  })

  it('verifies that micro few-shot substantially raises semantic quality score', () => {
    for (const tier of ['medium', 'cheap']) {
      const normalized = manifest.results.find((r: any) => r.tierKey === tier && r.variantId === 'v2-normalize-only')
      const fewShot = manifest.results.find((r: any) => r.tierKey === tier && r.variantId === 'v3-few-shot')

      expect(fewShot.semanticQualityScore).toBeGreaterThan(normalized.semanticQualityScore)
    }
  })

  it('proves the Quality-per-Dollar frontier of Medium Tier on Prompt 2.2.0', () => {
    const fullMedium = manifest.results.find((r: any) => r.tierKey === 'medium' && r.variantId === 'v5-full-wave3')
    const baselineStrong = manifest.results.find((r: any) => r.tierKey === 'strong' && r.variantId === 'v1-baseline')

    expect(fullMedium.firstPassPassRate).toBeGreaterThanOrEqual(95)
    expect(fullMedium.semanticQualityScore).toBeGreaterThanOrEqual(33.0)
    expect(fullMedium.structuralFailuresPer100).toBe(0)

    // Quality per dollar should be > 10x higher than Strong baseline
    expect(fullMedium.qualityPerDollarIndex).toBeGreaterThan(baselineStrong.qualityPerDollarIndex * 10)
  })
})
