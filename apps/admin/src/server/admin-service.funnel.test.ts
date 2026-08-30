import { describe, expect, it } from 'vitest'
import { AdminService } from './admin-service.js'

function createMockSupabaseClient(
  tableData: Record<string, any[]>,
  tableErrors: Record<string, any> = {},
  rpcHandlers: Record<string, any> = {}
) {
  return {
    from: (tableName: string) => {
      const error = tableErrors[tableName] || null
      const rows = tableData[tableName] || []
      const filters: Array<(row: any) => boolean> = []

      const getFilteredRows = () => {
        let result = [...rows]
        for (const f of filters) {
          result = result.filter(f)
        }
        return result
      }

      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        or: () => builder,
        in: (col: string, vals: any[]) => {
          filters.push((r) => Array.isArray(vals) && vals.includes(r[col]))
          return builder
        },
        eq: (col: string, val: any) => {
          filters.push((r) => {
            if (r[col] === val) return true
            if (col.includes('.')) {
              const parts = col.split('.')
              const nested = parts.reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), r)
              return nested === val
            }
            return false
          })
          return builder
        },
        neq: (col: string, val: any) => {
          filters.push((r) => r[col] !== val)
          return builder
        },
        gte: (col: string, val: any) => {
          filters.push((r) => r[col] >= val)
          return builder
        },
        lte: (col: string, val: any) => {
          filters.push((r) => r[col] <= val)
          return builder
        },
        gt: (col: string, val: any) => {
          filters.push((r) => r[col] > val)
          return builder
        },
        lt: (col: string, val: any) => {
          filters.push((r) => r[col] < val)
          return builder
        },
        single: async () => {
          const filtered = getFilteredRows()
          return { data: error ? null : filtered[0] || null, error }
        },
        maybeSingle: async () => {
          const filtered = getFilteredRows()
          return { data: error ? null : filtered[0] || null, error }
        },
        then: (resolve: (res: { data: any[] | null; error: any }) => void) => {
          const filtered = getFilteredRows()
          return Promise.resolve({ data: error ? null : filtered, error }).then(resolve)
        },
      }
      return builder
    },
    rpc: async (fnName: string, params: any) => {
      if (rpcHandlers[fnName]) {
        return rpcHandlers[fnName](params)
      }
      return { data: null, error: { message: `RPC ${fnName} not available in mock` } }
    },
  }
}

describe('AdminService - Conversion Funnel Analytics', () => {
  it('correctly calculates 8 funnel steps, conversions, drop-offs, and channel attributions', async () => {
    const nowIso = new Date().toISOString()
    const mockEvents = [
      // Visitor 1: Full journey from Facebook
      { id: '1', event_name: 'landing_view', anonymous_id: 'aid-1', user_id: null, utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '2', event_name: 'sample_click', anonymous_id: 'aid-1', user_id: null, utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '3', event_name: 'free_trial_click', anonymous_id: 'aid-1', user_id: null, utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '4', event_name: 'email_submit', anonymous_id: 'aid-1', user_id: null, utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '5', event_name: 'auth_complete', anonymous_id: 'aid-1', user_id: 'user-1', utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '6', event_name: 'child_form_start', anonymous_id: 'aid-1', user_id: 'user-1', utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '7', event_name: 'child_created', anonymous_id: 'aid-1', user_id: 'user-1', child_id: 'child-1', utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },
      { id: '8', event_name: 'onboarding_complete', anonymous_id: 'aid-1', user_id: 'user-1', child_id: 'child-1', utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso },

      // Visitor 2: Direct visitor dropped after email submit
      { id: '9', event_name: 'landing_view', anonymous_id: 'aid-2', user_id: null, utm_source: null, referrer: null, device_class: 'desktop', created_at: nowIso },
      { id: '9b', event_name: 'sample_click', anonymous_id: 'aid-2', user_id: null, utm_source: null, referrer: null, device_class: 'desktop', created_at: nowIso },
      { id: '10', event_name: 'free_trial_click', anonymous_id: 'aid-2', user_id: null, utm_source: null, referrer: null, device_class: 'desktop', created_at: nowIso },
      { id: '11', event_name: 'email_submit', anonymous_id: 'aid-2', user_id: null, utm_source: null, referrer: null, device_class: 'desktop', created_at: nowIso },


      // Visitor 3: Internal test user (should be completely excluded)
      { id: '12', event_name: 'landing_view', anonymous_id: 'aid-internal', user_id: 'user-test', utm_source: null, referrer: null, device_class: 'desktop', created_at: nowIso },
      { id: '13', event_name: 'child_created', anonymous_id: 'aid-internal', user_id: 'user-test', child_id: 'child-test', utm_source: null, referrer: null, device_class: 'desktop', created_at: nowIso },
    ]

    const mockChildren = [
      { id: 'child-1', parent_id: 'user-1', is_internal_test: false },
      { id: 'child-test', parent_id: 'user-test', is_internal_test: true },
    ]

    const mockClient = createMockSupabaseClient({
      funnel_events: mockEvents,
      children: mockChildren,
    })

    const service = new AdminService({ client: mockClient as any })
    const result = await service.getConversionFunnelData(7)

    expect(result.internalTestEventsFiltered).toBe(2)
    expect(result.totalEvents).toBe(12) // 14 - 2 internal


    // Step metrics assertions
    expect(result.steps).toHaveLength(8)
    const landingStep = result.steps[0]!
    expect(landingStep.name).toBe('landing_view')
    expect(landingStep.uniqueVisitors).toBe(2)

    const emailSubmitStep = result.steps.find((s: any) => s.name === 'email_submit')!
    expect(emailSubmitStep.uniqueVisitors).toBe(2)
    expect(emailSubmitStep.conversionFromLandingPercent).toBe(100)

    const authStep = result.steps.find((s: any) => s.name === 'auth_complete')!
    expect(authStep.uniqueVisitors).toBe(1)
    expect(authStep.conversionFromPrevPercent).toBe(50) // 1 of 2 from email_submit

    const onboardingStep = result.steps.find((s: any) => s.name === 'onboarding_complete')!
    expect(onboardingStep.uniqueVisitors).toBe(1)
    expect(onboardingStep.conversionFromLandingPercent).toBe(50)

    // Overall conversion & drop-off
    expect(result.overallConversionPercent).toBe(50)
    expect(result.biggestDropOff).not.toBeNull()
    expect(result.biggestDropOff?.fromStep).toBe('email_submit')
    expect(result.biggestDropOff?.toStep).toBe('auth_complete')
    expect(result.biggestDropOff?.dropCount).toBe(1)

    // Channels
    const fbChannel = result.channels.find((c: any) => c.channel === 'facebook')!
    expect(fbChannel.landingViews).toBe(1)
    expect(fbChannel.onboarded).toBe(1)
    expect(fbChannel.conversionPercent).toBe(100)

    const directChannel = result.channels.find((c: any) => c.channel === 'direct')!
    expect(directChannel.landingViews).toBe(1)
    expect(directChannel.onboarded).toBe(0)
    expect(directChannel.conversionPercent).toBe(0)

  })

  it('handles empty events gracefully without NaN or errors', async () => {
    const mockClient = createMockSupabaseClient({
      funnel_events: [],
      children: [],
    })

    const service = new AdminService({ client: mockClient as any })
    const result = await service.getConversionFunnelData(7)

    expect(result.totalEvents).toBe(0)
    expect(result.uniqueLandingVisitors).toBe(1)
    expect(result.overallConversionPercent).toBe(0)
    expect(result.steps).toHaveLength(8)
    for (const step of result.steps) {
      expect(step.count).toBe(0)
      expect(step.uniqueVisitors).toBe(0)
      expect(isNaN(step.conversionFromPrevPercent)).toBe(false)
      expect(isNaN(step.conversionFromLandingPercent)).toBe(false)
    }
  })
})
