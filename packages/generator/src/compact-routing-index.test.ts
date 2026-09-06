import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { compactRoutingIndex } from './compact-routing-index.js'

it('round-trips every production routing field, card, and shard reference', async () => {
  const raw = await readFile(new URL('../curriculum/cap-precedent-routing-index.json', import.meta.url), 'utf8')
  const original = JSON.parse(raw)
  const compact = compactRoutingIndex(original)
  const { encoding, columns, dictionary, rows, ...metadata } = JSON.parse(compact)
  const cards = rows.map((row: number[]) => Object.fromEntries(row.flatMap((id, i) => id < 0 ? [] : [[columns[i], dictionary[id]]])))
  expect(encoding).toBe('dictionary-table-v1')
  expect({ ...metadata, cards }).toEqual(original)
  expect(compact.length).toBeLessThan(JSON.stringify(original).length * 0.75)
})
