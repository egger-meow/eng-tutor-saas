import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmAdditionalChildOnboarding,
  discardPendingOnboarding,
  finalizePendingOnboarding,
  readOnboardingToken,
} from './onboarding-handoff'

const rpc = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ rpc })),
}))

describe('onboarding handoff', () => {
  beforeEach(() => rpc.mockReset())

  it('finalizes a first child after auth and returns a created result', async () => {
    rpc.mockResolvedValueOnce({ data: '11111111-1111-1111-1111-111111111111', error: null })

    await expect(finalizePendingOnboarding('opaque-token')).resolves.toEqual({
      status: 'created',
      childId: '11111111-1111-1111-1111-111111111111',
    })
    expect(rpc).toHaveBeenCalledWith('finalize_pending_onboarding', { p_token: 'opaque-token' })
  })

  it('turns the returning-parent database guard into an explicit confirmation state', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ADDITIONAL_CHILD_CONFIRMATION_REQUIRED' },
    })

    await expect(finalizePendingOnboarding('opaque-token')).resolves.toEqual({
      status: 'additional_child_confirmation_required',
    })
  })

  it('does not leak RPC or database errors to the parent UI', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint pending_onboarding_parent_user_id_key' },
    })

    let message = ''
    try {
      await finalizePendingOnboarding('opaque-token')
    } catch (caught) {
      message = caught instanceof Error ? caught.message : String(caught)
    }

    expect(message).toBe('孩子資料還在，帳號連結目前尚未完成。請重新整理再試一次。')
    expect(message).not.toContain('duplicate key')
    expect(message).not.toContain('constraint')
  })

  it('creates an additional child only through the explicit authenticated confirmation RPC', async () => {
    rpc.mockResolvedValueOnce({ data: '22222222-2222-2222-2222-222222222222', error: null })

    await expect(confirmAdditionalChildOnboarding('opaque-token')).resolves.toBe('22222222-2222-2222-2222-222222222222')
    expect(rpc).toHaveBeenCalledWith('confirm_additional_child_onboarding', { p_token: 'opaque-token' })
  })

  it('can discard the pending landing draft without creating another child', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })

    await expect(discardPendingOnboarding('opaque-token')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('discard_pending_onboarding', { p_token: 'opaque-token' })
  })

  it('reads only a bounded onboarding token from the magic-link return URL', () => {
    expect(readOnboardingToken('?aid=a1&onboarding=abc-123')).toBe('abc-123')
    expect(readOnboardingToken(`?onboarding=${'x'.repeat(257)}`)).toBeNull()
    expect(readOnboardingToken('?onboarding=%20%20')).toBeNull()
  })
})
