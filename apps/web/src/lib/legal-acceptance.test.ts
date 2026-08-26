import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPendingLegalAcceptance,
  acceptCurrentTermsVersion,
  flushPendingLegalAcceptance,
  getPendingLegalAcceptance,
  recordPendingLegalAcceptance,
} from './legal-acceptance'
import { getSupabaseClient } from './supabase'

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('Legal Acceptance Event Architecture', () => {
  const rpcMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    clearPendingLegalAcceptance()
    vi.mocked(getSupabaseClient).mockReturnValue({
      rpc: rpcMock,
    } as unknown as ReturnType<typeof getSupabaseClient>)
  })

  it('1. Auth submit creates a short-lived pending acceptance marker in sessionStorage with versions and expiry', () => {
    expect(getPendingLegalAcceptance()).toBeNull()

    recordPendingLegalAcceptance('2026-08-16-v1', '2026-08-16-v1')

    const pending = getPendingLegalAcceptance()
    expect(pending).not.toBeNull()
    expect(pending?.termsVersion).toBe('2026-08-16-v1')
    expect(pending?.privacyVersion).toBe('2026-08-16-v1')
    expect(pending?.expiresAt).toBeGreaterThan(Date.now())
  })

  it('2. Pending marker + successful authentication calls RPC exactly once and clears the marker', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })
    recordPendingLegalAcceptance('2026-08-16-v1', '2026-08-16-v1')

    const result = await flushPendingLegalAcceptance()

    expect(result.attempted).toBe(true)
    expect(result.success).toBe(true)
    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(rpcMock).toHaveBeenCalledWith('accept_legal_terms', {
      p_terms_version: '2026-08-16-v1',
      p_privacy_version: '2026-08-16-v1',
    })

    // Marker must be cleared after successful persistence
    expect(getPendingLegalAcceptance()).toBeNull()

    // Second call (e.g. subsequent auth state change or re-render) does NOT call RPC again
    const secondResult = await flushPendingLegalAcceptance()
    expect(secondResult.attempted).toBe(false)
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('3. If signInWithOtp fails before auth succeeds, clearPendingLegalAcceptance immediately removes the marker', async () => {
    // User submits form -> creates pending marker
    recordPendingLegalAcceptance('2026-08-16-v1', '2026-08-16-v1')
    expect(getPendingLegalAcceptance()).not.toBeNull()

    // signInWithOtp returns an error -> AuthPanel immediately clears marker
    clearPendingLegalAcceptance()

    expect(getPendingLegalAcceptance()).toBeNull()

    // Subsequent session init will NOT attempt RPC
    const result = await flushPendingLegalAcceptance()
    expect(result.attempted).toBe(false)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('4. Page reload with existing authenticated session but NO pending marker does NOT call RPC', async () => {
    // Session exists but user did not submit AuthPanel in this flow (no pending marker)
    expect(getPendingLegalAcceptance()).toBeNull()

    const result = await flushPendingLegalAcceptance()

    expect(result.attempted).toBe(false)
    expect(result.success).toBe(true)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('5. Token/session refresh does NOT call RPC when no pending marker exists', async () => {
    expect(getPendingLegalAcceptance()).toBeNull()

    // Simulate token refresh events
    await flushPendingLegalAcceptance()
    await flushPendingLegalAcceptance()

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('6. RPC failure remains non-destructive, retains pending marker for retry, and reports error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Network offline' } })
    recordPendingLegalAcceptance('2026-08-16-v1', '2026-08-16-v1')

    const result = await flushPendingLegalAcceptance()

    expect(result.attempted).toBe(true)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Network offline')

    // Marker must NOT be cleared on failure, allowing future retry
    expect(getPendingLegalAcceptance()).not.toBeNull()
  })

  it('7. clearPendingLegalAcceptance clears storage correctly', () => {
    recordPendingLegalAcceptance()
    expect(getPendingLegalAcceptance()).not.toBeNull()

    clearPendingLegalAcceptance()
    expect(getPendingLegalAcceptance()).toBeNull()
  })

  it('8. checkout reacceptance updates Terms only and never resubmits Privacy', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })

    await acceptCurrentTermsVersion()

    expect(rpcMock).toHaveBeenCalledWith('accept_current_terms', {
      p_terms_version: '2026-08-26-v2',
    })
    expect(rpcMock).not.toHaveBeenCalledWith(
      'accept_legal_terms',
      expect.anything(),
    )
  })
})
