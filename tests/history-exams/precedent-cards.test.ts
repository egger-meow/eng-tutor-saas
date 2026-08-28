import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPrecedentCards, buildPrecedentRuntimeBundle } from '../../scripts/history-exams/src/precedents/build-precedent-cards.ts'

describe('production CAP precedent cards', () => {
  it('separates compact routing from rich authoritative non-holdout design anchors', () => {
    const root = process.cwd()
    const analyzed = path.join(root, 'history_exams/analyzed')
    const benchmark = path.join(root, 'history_exams/benchmark')
    const cards = buildPrecedentCards(analyzed, benchmark)
    expect(cards).toHaveLength(195)
    expect(new Set(cards.map((card) => card.ref)).size).toBe(195)
    expect(cards.every((card) => /^cap-[a-f0-9]{12}$/.test(card.ref))).toBe(true)
    expect(cards.every((card) => card.questionMechanism && card.reasoningOperations.length > 0 && card.reusableDesignPrinciple)).toBe(true)
    expect(cards.some((card) => card.copyGuardHashes.length > 0)).toBe(true)

    const runtime = buildPrecedentRuntimeBundle(analyzed, benchmark)
    expect(runtime.authorityStatus).toBe('authoritative')
    expect(runtime.capCorpusHash).toMatch(/^[a-f0-9]{64}$/)

    const routing = JSON.parse(fs.readFileSync(path.join(root, 'packages/generator/curriculum/cap-precedent-routing-index.json'), 'utf8'))
    expect(routing.cards).toHaveLength(195)
    expect(JSON.stringify(routing)).not.toMatch(/111-Q\d|112-Q\d|113-Q\d|114-Q\d|115-Q\d/)
    expect(JSON.stringify(routing)).not.toContain('questionMechanism')
    for (const row of routing.cards) {
      expect(row.shard).toMatch(/^packages\/generator\/curriculum\/cap-precedent-shards\//)
      expect(fs.existsSync(path.join(root, row.shard))).toBe(true)
    }

    const shardPaths = [...new Set(routing.cards.map((row: { shard: string }) => row.shard))]
    expect(shardPaths.length).toBeGreaterThan(5)
    for (const shardPath of shardPaths) {
      const shard = JSON.parse(fs.readFileSync(path.join(root, shardPath), 'utf8'))
      expect(shard.authorityStatus).toBe('authoritative')
      expect(shard.cards.length).toBeGreaterThan(0)
      expect(shard.cards.every((card: { questionMechanism?: string; copyGuardHashes?: unknown }) => Boolean(card.questionMechanism) && card.copyGuardHashes === undefined)).toBe(true)
    }
  })
})
