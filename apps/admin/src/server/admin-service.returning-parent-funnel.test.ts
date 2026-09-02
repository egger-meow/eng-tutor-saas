import { describe, expect, it } from 'vitest'
import { AdminService } from './admin-service.js'

function createMockSupabaseClient(tableData: Record<string, any[]>) {
  return {
    from: (tableName: string) => {
      const rows = tableData[tableName] || []
      const filters: Array<(row: any) => boolean> = []
      const filtered = () => filters.reduce((current, filter) => current.filter(filter), [...rows])
      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        in: (column: string, values: any[]) => { filters.push((row) => values.includes(row[column])); return builder },
        eq: (column: string, value: any) => { filters.push((row) => row[column] === value); return builder },
        neq: (column: string, value: any) => { filters.push((row) => row[column] !== value); return builder },
        gte: (column: string, value: any) => { filters.push((row) => row[column] >= value); return builder },
        lte: (column: string, value: any) => { filters.push((row) => row[column] <= value); return builder },
        gt: (column: string, value: any) => { filters.push((row) => row[column] > value); return builder },
        lt: (column: string, value: any) => { filters.push((row) => row[column] < value); return builder },
        then: (resolve: (result: { data: any[]; error: null }) => void) => Promise.resolve({ data: filtered(), error: null }).then(resolve),
      }
      return builder
    },
    rpc: async () => ({ data: null, error: null }),
  }
}

describe('AdminService returning-parent funnel split', () => {
  it('keeps returning parents out of first-child acquisition conversion and reports their branch separately', async () => {
    const nowIso = new Date().toISOString()
    const base = { utm_source: 'fb_ad', referrer: 'https://l.facebook.com', device_class: 'mobile', created_at: nowIso }
    const events = [
      // Brand-new parent completes the first-child funnel.
      ...['landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'auth_complete', 'child_created', 'onboarding_complete'].map((event_name, index) => ({
        id: `new-${index}`,
        event_name,
        anonymous_id: 'aid-new',
        user_id: index >= 5 ? 'user-new' : null,
        child_id: index >= 6 ? 'child-new' : null,
        ...base,
      })),

      // Returning parent reaches the same landing flow but is detected after auth.
      ...['landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'auth_complete', 'existing_parent_detected', 'additional_child_confirmed', 'child_created', 'onboarding_complete'].map((event_name, index) => ({
        id: `return-${index}`,
        event_name,
        anonymous_id: 'aid-return',
        user_id: index >= 5 ? 'user-return' : null,
        child_id: index >= 8 ? 'child-second' : null,
        ...base,
      })),
      { id: 'archive-1', event_name: 'child_archived', anonymous_id: 'aid-return', user_id: 'user-return', child_id: 'child-second', ...base },
    ]

    const client = createMockSupabaseClient({
      funnel_events: events,
      children: [
        { id: 'child-new', parent_id: 'user-new', is_internal_test: false },
        { id: 'child-second', parent_id: 'user-return', is_internal_test: false },
      ],
    })

    const result = await new AdminService({ client: client as any }).getConversionFunnelData(7)

    expect(result.uniqueLandingVisitors).toBe(1)
    expect(result.overallConversionPercent).toBe(100)
    expect(result.steps.find((step) => step.name === 'child_created')?.uniqueVisitors).toBe(1)
    expect(result.returningParent).toEqual({
      detected: 1,
      additionalChildConfirmed: 1,
      pendingOnboardingDiscarded: 0,
      confirmationPercent: 100,
      discardPercent: 0,
    })
    expect(result.childArchivedCount).toBe(1)
  })
})
