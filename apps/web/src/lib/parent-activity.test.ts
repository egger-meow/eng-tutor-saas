import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetTouchTimestampForTesting, touchParentActivity } from './parent-activity'

const rpc = vi.fn()
const getSession = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    rpc,
    auth: { getSession },
  })),
}))

describe('touchParentActivity', () => {
  beforeEach(() => {
    rpc.mockReset()
    getSession.mockReset()
    _resetTouchTimestampForTesting()
    vi.restoreAllMocks()
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })
  })

  it('calls rpc on first touch for authenticated user', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('touch_parent_activity')
  })

  it('does not call rpc if user is not authenticated', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    await touchParentActivity()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('throttles subsequent calls within 1 hour for the same user', async () => {
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

  it('does not throttle calls across different users on the same browser', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    // User 1 touches
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)

    // User 2 logs in immediately
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-2' } } }, error: null })
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('does not throttle next call if RPC returned an error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(1)

    // Next call should NOT be throttled because error occurred
    rpc.mockResolvedValueOnce({ data: null, error: null })
    await touchParentActivity()
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('swallows rejected promises silently without throwing', async () => {
    rpc.mockRejectedValueOnce(new Error('Network error'))
    await expect(touchParentActivity()).resolves.toBeUndefined()
  })
})
