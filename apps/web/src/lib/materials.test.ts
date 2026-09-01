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

describe('listMaterialsWithClient - Service Time Week Numbering', () => {
  it('preserves canonical week_number from RPC across multi-month subscription gaps', async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === 'generation_jobs') {
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }
        }
        if (table === 'materials') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: { material_week: '2026-08-01' }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'feedback') {
          return {
            select: () => ({
              in: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      },
      rpc: (fn: string) => {
        if (fn === 'get_owned_released_materials_page') {
          return Promise.resolve({
            data: [
              {
                id: 'm-2',
                child_id: 'child-1',
                material_week: '2026-10-01',
                revision: 1,
                student_pdf_path: 's2.pdf',
                parent_answer_pdf_path: 'p2.pdf',
                generation_summary: {},
                created_at: '2026-10-01T00:00:00Z',
                release_at: '2026-10-01T00:00:00Z',
                week_number: 2,
                total_count: 2,
              },
              {
                id: 'm-1',
                child_id: 'child-1',
                material_week: '2026-08-01',
                revision: 1,
                student_pdf_path: 's1.pdf',
                parent_answer_pdf_path: 'p1.pdf',
                generation_summary: {},
                created_at: '2026-08-01T00:00:00Z',
                release_at: '2026-08-01T00:00:00Z',
                week_number: 1,
                total_count: 2,
              },
            ],
            error: null,
          })
        }
        throw new Error(`Unexpected rpc ${fn}`)
      },
    }

    const { listMaterialsWithClient } = await import('./materials')
    const res = await listMaterialsWithClient(mockClient as any, ['child-1'])
    expect(res.materials.map(m => ({ id: m.id, week: m.week_number }))).toEqual([
      { id: 'm-2', week: 2 },
      { id: 'm-1', week: 1 },
    ])
  })

  it('excludes canceled and failed generation jobs from hasPastDueUnmaterializedJobByChild', async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === 'generation_jobs') {
          return {
            select: () => ({
              in: () => Promise.resolve({
                data: [
                  {
                    material_id: null,
                    child_id: 'child-1',
                    release_at: '2026-01-01T00:00:00Z',
                    status: 'canceled',
                  },
                  {
                    material_id: null,
                    child_id: 'child-1',
                    release_at: '2026-01-02T00:00:00Z',
                    status: 'failed',
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'materials') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'feedback') {
          return {
            select: () => ({
              in: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      },
      rpc: (fn: string) => {
        if (fn === 'get_owned_released_materials_page') {
          return Promise.resolve({
            data: [],
            error: null,
          })
        }
        throw new Error(`Unexpected rpc ${fn}`)
      },
    }

    const { listMaterialsWithClient } = await import('./materials')
    const res = await listMaterialsWithClient(mockClient as any, ['child-1'])
    expect(res.hasPastDueUnmaterializedJobByChild['child-1']).toBe(false)
  })

  it('correctly computes hasActiveGenerationFailureByChild for unmaterialized failed jobs without active jobs', async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === 'generation_jobs') {
          return {
            select: () => ({
              in: () => Promise.resolve({
                data: [
                  {
                    material_id: null,
                    child_id: 'child-failed-only',
                    release_at: '2026-01-01T00:00:00Z',
                    status: 'failed',
                  },
                  {
                    material_id: null,
                    child_id: 'child-failed-with-pending',
                    release_at: '2026-01-01T00:00:00Z',
                    status: 'failed',
                  },
                  {
                    material_id: null,
                    child_id: 'child-failed-with-pending',
                    release_at: '2026-01-05T00:00:00Z',
                    status: 'pending',
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'materials') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'feedback') {
          return {
            select: () => ({
              in: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      },
      rpc: (fn: string) => {
        if (fn === 'get_owned_released_materials_page') {
          return Promise.resolve({
            data: [],
            error: null,
          })
        }
        throw new Error(`Unexpected rpc ${fn}`)
      },
    }

    const { listMaterialsWithClient } = await import('./materials')
    const res = await listMaterialsWithClient(mockClient as any, ['child-failed-only', 'child-failed-with-pending'])
    expect(res.hasActiveGenerationFailureByChild['child-failed-only']).toBe(true)
    expect(res.hasActiveGenerationFailureByChild['child-failed-with-pending']).toBe(false)
  })
})
