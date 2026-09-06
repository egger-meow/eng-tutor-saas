import { describe, expect, it } from 'vitest'
import {
  runRetrievalBenchmark,
  assertChildIsolation,
  buildContextualHeader,
  CANONICAL_BENCHMARK_CASES,
} from './hybrid-search-eval.js'
import { filterAndRankCapPrecedents } from '../cap-retrieval.js'

describe('Hybrid Search Evaluation and Child Isolation Benchmark', () => {
  it('enforces strict server-side child isolation without cross-tenant leakage', () => {
    const childA = '00000000-0000-0000-0000-000000000001'
    const childB = '00000000-0000-0000-0000-000000000002'

    expect(assertChildIsolation(childA, childA)).toBe(true)

    expect(() => assertChildIsolation(childA, childB)).toThrow(
      'CHILD_ISOLATION_VIOLATION',
    )
  })

  it('builds contextual header with core pedagogical dimensions', () => {
    const card = {
      ref: 'cap-test',
      genre: 'article',
      primarySkill: 'discourse_relationship',
      secondarySkills: ['inference'],
      cognitiveDepth: 'D2_single_step_inference',
      languageDifficulty: 'A2_basic',
      evidenceMode: 'text_only',
      evidenceSpan: 'single_sentence',
      shard: 'test.json',
    }

    const header = buildContextualHeader(card)
    expect(header).toContain('[Skill: discourse_relationship]')
    expect(header).toContain('[Depth: D2_single_step_inference]')
    expect(header).toContain('[Span: single_sentence]')
    expect(header).toContain('[Genre: article]')
    expect(header).toContain('[Diff: A2_basic]')
  })

  it('executes retrieval benchmark comparing exact metadata vs hybrid fusion', () => {
    const report = runRetrievalBenchmark(CANONICAL_BENCHMARK_CASES)

    expect(report.totalCases).toBe(CANONICAL_BENCHMARK_CASES.length)
    expect(report.baseline.recallAt5).toBeGreaterThanOrEqual(0.75)
    expect(report.baseline.childIsolationEnforced).toBe(true)
    expect(report.hybridFusion.childIsolationEnforced).toBe(true)
    expect(typeof report.baseline.avgLatencyMs).toBe('number')
    expect(typeof report.hybridFusion.avgLatencyMs).toBe('number')

    // Documented recommendation
    expect(report.recommendation).toBe('keep_exact_metadata_baseline')
    expect(report.rationale).toContain('Exact metadata/keyword filtering provides high Recall@5')
  })
})
