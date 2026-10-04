import { describe, it, expect, vi } from 'vitest'
import {
  parseMaterialLearningCheckin,
  isCheckinDismissed,
  fetchMaterialLearningCheckin,
  saveMaterialLearningCheckin,
} from './material-learning-checkin'

describe('parseMaterialLearningCheckin', () => {
  it('returns null for invalid inputs', () => {
    expect(parseMaterialLearningCheckin(null)).toBeNull()
    expect(parseMaterialLearningCheckin(undefined)).toBeNull()
    expect(parseMaterialLearningCheckin('string')).toBeNull()
  })

  it('correctly parses valid checkin', () => {
    const raw = {
      barrier: 'no_time',
      paper_started_at: '2026-10-04T08:00:00Z',
      dismissed_until: '2026-10-11T08:00:00Z',
    }
    expect(parseMaterialLearningCheckin(raw)).toEqual({
      barrier: 'no_time',
      paper_started_at: '2026-10-04T08:00:00Z',
      dismissed_until: '2026-10-11T08:00:00Z',
    })
  })

  it('filters invalid barrier to null', () => {
    const raw = { barrier: 'invalid_barrier', paper_started_at: null, dismissed_until: null }
    expect(parseMaterialLearningCheckin(raw)?.barrier).toBeNull()
  })
})

describe('isCheckinDismissed', () => {
  it('returns false when null or dismissed_until is absent', () => {
    expect(isCheckinDismissed(null)).toBe(false)
    expect(isCheckinDismissed({ barrier: null, paper_started_at: null, dismissed_until: null })).toBe(false)
  })

  it('returns true when dismissed_until is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isCheckinDismissed({ barrier: null, paper_started_at: null, dismissed_until: future })).toBe(true)
  })

  it('returns false when dismissed_until is in the past', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isCheckinDismissed({ barrier: null, paper_started_at: null, dismissed_until: past })).toBe(false)
  })
})

describe('fetchMaterialLearningCheckin & saveMaterialLearningCheckin', () => {
  it('invokes get_material_learning_checkin RPC', async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: { barrier: 'cannot_print', paper_started_at: null, dismissed_until: null },
        error: null,
      }),
    } as unknown as Parameters<typeof fetchMaterialLearningCheckin>[0]

    const res = await fetchMaterialLearningCheckin(mockClient, 'mat-1')
    expect(mockClient.rpc).toHaveBeenCalledWith('get_material_learning_checkin', { p_material_id: 'mat-1' })
    expect(res?.barrier).toBe('cannot_print')
  })

  it('invokes save_material_learning_checkin RPC', async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: { barrier: null, paper_started_at: '2026-10-04T08:00:00Z', dismissed_until: null },
        error: null,
      }),
    } as unknown as Parameters<typeof saveMaterialLearningCheckin>[0]

    const res = await saveMaterialLearningCheckin(mockClient, 'mat-1', 'paper_started')
    expect(mockClient.rpc).toHaveBeenCalledWith('save_material_learning_checkin', {
      p_material_id: 'mat-1',
      p_action: 'paper_started',
      p_barrier: null,
    })
    expect(res?.paper_started_at).toBe('2026-10-04T08:00:00Z')
  })
})
