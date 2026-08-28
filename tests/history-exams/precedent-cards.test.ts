import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPrecedentCards } from '../../scripts/history-exams/src/precedents/build-precedent-cards.ts'

describe('production CAP precedent cards', () => {
  it('exposes every authoritative non-holdout analysis and no holdout question identity or wording', () => {
    const root = process.cwd()
    const cards = buildPrecedentCards(path.join(root, 'history_exams/analyzed'), path.join(root, 'history_exams/benchmark'))
    expect(cards).toHaveLength(195)
    expect(new Set(cards.map((card) => card.ref)).size).toBe(195)
    expect(cards.every((card) => /^cap-[a-f0-9]{12}$/.test(card.ref))).toBe(true)
    expect(JSON.stringify(cards)).not.toContain('111-Q1')
    expect(cards.every((card) => card.primarySkill && card.cognitiveDepth && card.languageDifficulty && card.evidenceSpan)).toBe(true)
  })
})
