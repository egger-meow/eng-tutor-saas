import { describe, expect, it } from 'vitest'
import { materialDownloadFilename, materialWeekNumber } from './materials'

describe('materialDownloadFilename', () => {
  it('creates a parent-readable Unicode filename without storage IDs', () => {
    expect(materialDownloadFilename('Kobe', '2026-08-12', 'student', 1)).toBe('Kobe-Week-1-2026-08-12-學生教材.pdf')
    expect(materialDownloadFilename('Kobe', '2026-08-12', 'parent', 1)).toBe('Kobe-Week-1-2026-08-12-家長解答.pdf')
  })

  it('keeps a child name safe for a downloaded file', () => {
    expect(materialDownloadFilename('小明/家用', '2026-08-12', 'student', 1)).toBe('小明-家用-Week-1-2026-08-12-學生教材.pdf')
  })
})

describe('materialWeekNumber', () => {
  it('numbers each scheduled weekly material from the first one', () => {
    expect(materialWeekNumber('2026-08-12', '2026-08-12')).toBe(1)
    expect(materialWeekNumber('2026-08-12', '2026-08-19')).toBe(2)
  })
})
