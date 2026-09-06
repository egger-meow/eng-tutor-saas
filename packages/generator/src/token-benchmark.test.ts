import { describe, it, expect } from 'vitest'
import { compileProductionBundle, REPO_ROOT } from './bundle-compiler.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

describe('serialized context size benchmark', () => {
  it('bounds bundle character size relative to scattered sources', async () => {
    const bundle = await compileProductionBundle(REPO_ROOT)
    const bundleChars = bundle.content.length

    // Scattered legacy files baseline:
    const scatteredPaths = [
      'docs/SPEC.md',
      'docs/curriculum-quality-rubric.md',
      'docs/generation-workflow.md',
      'docs/product-rules.md',
      'packages/generator/prompts/2.0.1/01-plan.md',
      'packages/generator/prompts/2.0.1/02-author.md',
      'packages/generator/prompts/2.0.1/03-critic.md',
      'packages/generator/prompts/2.0.1/04-repair.md',
      'packages/generator/src/curriculum-package-schema.ts',
      'packages/generator/src/validate-curriculum-package.ts',
      'packages/generator/src/audit-curriculum.ts',
    ]

    let scatteredChars = 0
    for (const file of scatteredPaths) {
      try {
        const text = await readFile(resolve(REPO_ROOT, file), 'utf8')
        scatteredChars += text.length
      } catch {
        // ignore missing
      }
    }

    // Grounding remains compact relative to scattered context while retaining
    // the full inherited pedagogy and the auditable research contract.
    expect(bundleChars).toBeLessThan(scatteredChars * 0.50)
    expect(bundleChars).toBeLessThan(110000)
  })

  it('demonstrates context capsule character efficiency over raw database table dumps', () => {
    // Simulate 50 raw vocabulary items with table columns
    const rawVocabRows = Array.from({ length: 50 }, (_, i) => ({
      id: `vocab-uuid-${i}`,
      child_id: 'child-uuid-12345',
      vocabulary_id: `word-${i}`,
      status: i % 4 === 0 ? 'reviewing' : i % 3 === 0 ? 'mastered' : 'learning',
      mastery_score: (i * 17) % 100,
      exposure_count: (i % 5) + 1,
      correct_count: (i % 3),
      last_seen_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const rawPayload = JSON.stringify(rawVocabRows)

    // Context capsule representation:
    const vocabCapsule = {
      dueForReview: rawVocabRows.filter(r => r.status === 'reviewing').map(r => r.vocabulary_id),
      weakRecent: rawVocabRows.filter(r => r.mastery_score < 60).map(r => r.vocabulary_id),
      uncertain: rawVocabRows.filter(r => r.exposure_count === 1).map(r => r.vocabulary_id),
      recentlyMastered: rawVocabRows.filter(r => r.status === 'mastered').map(r => r.vocabulary_id),
      historicalCount: rawVocabRows.length,
    }

    const capsulePayload = JSON.stringify(vocabCapsule)

    const rawChars = rawPayload.length
    const capsuleChars = capsulePayload.length

    expect(capsuleChars).toBeLessThan(rawChars * 0.3) // > 70% reduction in context size!
  })
})
