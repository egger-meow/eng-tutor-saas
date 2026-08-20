import { describe, expect, it } from 'vitest'
import { buildMaterialHistoryView, materialDownloadFilename, materialWeekNumber, type Material } from './materials'

const material = (id: string, releaseAt: string | null): Material => ({
  id,
  child_id: 'child-1',
  material_week: '2026-08-01',
  revision: 1,
  student_pdf_path: `${id}/student.pdf`,
  parent_answer_pdf_path: `${id}/parent.pdf`,
  generation_summary: {},
  created_at: '2026-08-01T00:00:00Z',
  release_at: releaseAt,
  feedback: null,
})

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

describe('buildMaterialHistoryView', () => {
  it('keeps future prepared materials out of released history and reports the true server count', () => {
    const view = buildMaterialHistoryView([
      material('future', '2026-09-01T00:00:00Z'),
      material('latest', '2026-08-19T00:00:00Z'),
      material('older-loaded', '2026-08-12T00:00:00Z'),
    ], 12, new Date('2026-08-20T00:00:00Z'))

    expect(view.latestMaterial?.id).toBe('latest')
    expect(view.pastMaterials.map((item) => item.id)).toEqual(['older-loaded'])
    expect(view.futureMaterials.map((item) => item.id)).toEqual(['future'])
    expect(view.historyCount).toBe(11)
  })
})
