import { describe, expect, it, vi } from 'vitest'
import {
  fetchMaterialNavigation,
  saveMaterialNavigation,
} from './material-learning-navigation'

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('material-learning-navigation API', () => {
  it('fetches navigation position returning null when not found', async () => {
    const { getSupabaseClient } = await import('./supabase')
    vi.mocked(getSupabaseClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    } as any)

    const res = await fetchMaterialNavigation('mat-123')
    expect(res).toBeNull()
  })

  it('fetches existing navigation position', async () => {
    const { getSupabaseClient } = await import('./supabase')
    vi.mocked(getSupabaseClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          chapter_id: 'practice',
          question_id: 'q-1',
          version: 2,
          updated_at: '2026-10-04T12:00:00Z',
        },
        error: null,
      }),
    } as any)

    const res = await fetchMaterialNavigation('mat-123')
    expect(res).toEqual({
      chapter_id: 'practice',
      question_id: 'q-1',
      version: 2,
      updated_at: '2026-10-04T12:00:00Z',
    })
  })

  it('saves navigation position with version increment', async () => {
    const { getSupabaseClient } = await import('./supabase')
    vi.mocked(getSupabaseClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          conflict: false,
          version: 3,
          chapter_id: 'instruction',
          question_id: null,
          updated_at: '2026-10-04T12:05:00Z',
        },
        error: null,
      }),
    } as any)

    const res = await saveMaterialNavigation('mat-123', 'instruction', null, 2)
    expect(res).toEqual({
      saved: true,
      conflict: false,
      version: 3,
      chapter_id: 'instruction',
      question_id: null,
      updated_at: '2026-10-04T12:05:00Z',
    })
  })

  it('handles conflict when saving stale navigation version', async () => {
    const { getSupabaseClient } = await import('./supabase')
    vi.mocked(getSupabaseClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: false,
          conflict: true,
          version: 5,
          chapter_id: 'homework',
          question_id: 'hw-1',
        },
        error: null,
      }),
    } as any)

    const res = await saveMaterialNavigation('mat-123', 'practice', 'q-1', 2)
    expect(res.saved).toBe(false)
    expect(res.conflict).toBe(true)
    expect(res.version).toBe(5)
    expect(res.chapter_id).toBe('homework')
  })
})
