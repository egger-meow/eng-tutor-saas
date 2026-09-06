import { describe, expect, it } from 'vitest'
import {
  runLexicalTermBenchmark,
  runRetrievalBenchmark,
  assertChildIsolation,
  buildContextualHeader,
  CANONICAL_BENCHMARK_CASES,
} from './lexical-term-benchmark.js'

describe('Lexical Term-Matching Benchmark and Deferred Vector Isolation', () => {
  it('enforces multi-tenant isolation helper check without cross-tenant leakage', () => {
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

  it('executes lexical term benchmark comparing exact metadata vs term-vector fusion', () => {
    const report = runLexicalTermBenchmark(CANONICAL_BENCHMARK_CASES)

    expect(report.totalCases).toBe(CANONICAL_BENCHMARK_CASES.length)
    expect(report.baseline.hitRateAt5).toBeGreaterThanOrEqual(0.75)
    expect(report.baseline.recallAt5).toBeGreaterThanOrEqual(0.75)
    expect(typeof report.baseline.avgLatencyMs).toBe('number')
    expect(typeof report.lexicalFusion.avgLatencyMs).toBe('number')
    expect(report.infrastructureStatus).toBe('vector_infrastructure_deferred')

    // Documented recommendation: keep exact metadata baseline; vector infrastructure deferred
    expect(report.recommendation).toBe('keep_exact_metadata_baseline')
    expect(report.rationale).toContain('Exact metadata/keyword filtering provides high HitRate@5')
    expect(report.rationale).toContain('deferred per SPEC #183/184')
  })
})

