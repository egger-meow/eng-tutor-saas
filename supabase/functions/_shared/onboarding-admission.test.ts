import { describe, expect, it } from 'vitest'
import { onboardingAdmissionKey, readOnboardingBody, OnboardingPayloadTooLarge } from './onboarding-admission'

describe('onboarding admission boundary', () => {
  it('uses normalized, secret-keyed opaque identifiers without persisting email', async () => {
    const key = await onboardingAdmissionKey(' A@example.invalid ', 'secret')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).toBe(await onboardingAdmissionKey('a@example.invalid', 'secret'))
    expect(key).not.toBe(await onboardingAdmissionKey('a@example.invalid', 'different-secret'))
  })
  it('bounds streamed bytes even when Content-Length is absent', async () => {
    const request = new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ data: 'x'.repeat(70 * 1024) }) })
    await expect(readOnboardingBody(request)).rejects.toBeInstanceOf(OnboardingPayloadTooLarge)
  })
  it('accepts an object and rejects malformed or non-object JSON', async () => {
    await expect(readOnboardingBody(new Request('https://example.invalid', { method: 'POST', body: '{"draft":{}}' }))).resolves.toEqual({ draft: {} })
    await expect(readOnboardingBody(new Request('https://example.invalid', { method: 'POST', body: 'null' }))).rejects.toThrow()
  })
})
