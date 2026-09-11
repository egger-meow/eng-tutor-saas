import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetTouchTimestampForTesting, touchParentActivity } from './parent-activity'

const rpc = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ rpc })),
}))

describe('touchParentActivity', () => {
  beforeEach(() => {
    rpc.mockReset()
    _resetTouchTimestampForTesting()
    vi.restoreAllMocks()
  })

  it('calls rpc on first touch', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('touch_parent_activity')
  })

  it('throttles subsequent calls within 1 hour', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)

    // Call immediately again
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)

    // Call after 30 minutes
    const baseTime = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 30 * 60 * 1000)
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)

    // Call after 61 minutes
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 61 * 60 * 1000)
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('swallows errors silently without throwing', async () => {
    rpc.mockRejectedValueOnce(new Error('Network error'))
    await expect(touchParentActivity()).resolves.toBeUndefined()
  })
})
