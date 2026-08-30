import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getAnonymousId,
  deriveDeviceClass,
  getAttributionContext,
  trackFunnelEvent,
  clearInMemoryAnalyticsStore,
} from './analytics'
import * as supabaseModule from './supabase'

describe('analytics client', () => {
  beforeEach(() => {
    clearInMemoryAnalyticsStore()
    vi.restoreAllMocks()
  })

  it('generates and persists an anonymous ID', () => {
    const aid = getAnonymousId()
    expect(aid).toBeTruthy()
    expect(typeof aid).toBe('string')

    // Second call returns the same ID
    const aid2 = getAnonymousId()
    expect(aid2).toBe(aid)
  })

  it('restores anonymous ID from URL search params when present', () => {
    const aid = getAnonymousId('?aid=custom-magic-aid-999')
    expect(aid).toBe('custom-magic-aid-999')

    // Preserved for subsequent call without search param
    const aid2 = getAnonymousId('')
    expect(aid2).toBe('custom-magic-aid-999')
  })

  it('derives device class safely', () => {
    expect(deriveDeviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', 390)).toBe('mobile')
    expect(deriveDeviceClass('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 820)).toBe('tablet')
    expect(deriveDeviceClass('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 1440)).toBe('desktop')
  })

  it('captures UTM parameters and referrer in attribution context', () => {
    const attr = getAttributionContext('?utm_source=facebook&utm_medium=cpc&utm_campaign=beta_launch&utm_content=v1', 'https://facebook.com')
    expect(attr.utmSource).toBe('facebook')
    expect(attr.utmMedium).toBe('cpc')
    expect(attr.utmCampaign).toBe('beta_launch')
    expect(attr.utmContent).toBe('v1')
    expect(attr.referrer).toBe('https://facebook.com')
  })

  it('trackFunnelEvent calls supabase RPC record_funnel_event and handles errors gracefully without throwing', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: 'mock-event-uuid', error: null })
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue({
      rpc: rpcMock,
    } as any)

    const eventId = await trackFunnelEvent('landing_view', { force: true })
    expect(eventId).toBe('mock-event-uuid')
    expect(rpcMock).toHaveBeenCalledWith(
      'record_funnel_event',
      expect.objectContaining({
        p_event_name: 'landing_view',
        p_anonymous_id: expect.any(String),
      }),
    )

    // When RPC returns error, does NOT throw and returns null
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })
    const failedEvent = await trackFunnelEvent('free_trial_click', { force: true })
    expect(failedEvent).toBeNull()

    // When getSupabaseClient throws, does NOT throw and returns null
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockImplementationOnce(() => {
      throw new Error('Supabase client failed')
    })
    const threwEvent = await trackFunnelEvent('email_submit', { force: true })
    expect(threwEvent).toBeNull()
  })
})
