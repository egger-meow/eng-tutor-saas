import { beforeEach, describe, expect, it, vi } from 'vitest'
import { archiveChild } from './children'

const rpc = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ rpc })),
}))

describe('child lifecycle', () => {
  beforeEach(() => rpc.mockReset())

  it('archives an owned child only through the reviewed server-side lifecycle RPC', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })

    await expect(archiveChild('child-1')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('archive_owned_child', { p_child_id: 'child-1' })
  })

  it('surfaces a server-side billing guard instead of hiding a still-paid child', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: '這位孩子目前仍有付費訂閱，請先到訂閱頁取消，待方案結束後再移除孩子。' },
    })

    await expect(archiveChild('child-paid')).rejects.toMatchObject({
      message: expect.stringContaining('付費訂閱'),
    })
  })
})
