import { describe, expect, it } from 'vitest'
import { LandingFunnelAdminService } from './landing-funnel-admin-service.js'

function createMockSupabaseClient(tableData: Record<string, any[]>) {
  return {
    from: (tableName: string) => {
      const rows = tableData[tableName] || []
      const filters: Array<(row: any) => boolean> = []
      let sliceRange: [number, number] | null = null
      const filtered = () => {
        const result = filters.reduce((current, filter) => current.filter(filter), [...rows])
        if (sliceRange) {
          return result.slice(sliceRange[0], sliceRange[1] + 1)
        }
        return result
      }
      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        range: (from: number, to: number) => { sliceRange = [from, to]; return builder },
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

function eventSeries(
  prefix: string,
  anonymousId: string,
  names: string[],
  startedAt: number,
  options: { userId?: string; childId?: string; authIndex?: number; childIndex?: number } = {},
) {
  return names.map((event_name, index) => ({
    id: `${prefix}-${index}`,
    event_name,
    anonymous_id: anonymousId,
    user_id: options.userId && index >= (options.authIndex ?? Number.POSITIVE_INFINITY) ? options.userId : null,
    child_id: options.childId && index >= (options.childIndex ?? Number.POSITIVE_INFINITY) ? options.childId : null,
    utm_source: 'fb_ad',
    referrer: 'https://l.facebook.com',
    device_class: 'mobile',
    created_at: new Date(startedAt + index * 1000).toISOString(),
  }))
}

describe('AdminService returning-parent funnel split', () => {
  it('keeps returning parents out of first-child acquisition conversion and reports auth separately', async () => {
    const now = Date.now() - 60_000
    const events = [
      ...eventSeries(
        'new',
        'aid-new',
        ['landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'child_created', 'onboarding_complete', 'auth_complete'],
        now,
        { userId: 'user-new', childId: 'child-new', authIndex: 5, childIndex: 5 },
      ),
      ...eventSeries(
        'return',
        'aid-return',
        ['landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'auth_complete', 'existing_parent_detected', 'additional_child_confirmed', 'child_created', 'onboarding_complete'],
        now + 20_000,
        { userId: 'user-return', childId: 'child-second', authIndex: 5, childIndex: 8 },
      ),
      {
        id: 'archive-1',
        event_name: 'child_archived',
        anonymous_id: 'aid-return',
        user_id: 'user-return',
        child_id: 'child-second',
        utm_source: 'fb_ad',
        referrer: 'https://l.facebook.com',
        device_class: 'mobile',
        created_at: new Date(now + 40_000).toISOString(),
      },
    ]

    const client = createMockSupabaseClient({
      funnel_events: events,
      children: [
        { id: 'child-new', parent_id: 'user-new', is_internal_test: false },
        { id: 'child-second', parent_id: 'user-return', is_internal_test: false },
      ],
    })

    const result = await new LandingFunnelAdminService({ client: client as any }).getConversionFunnelData(7)

    expect(result.uniqueLandingVisitors).toBe(1)
    expect(result.overallConversionPercent).toBe(100)
    expect(result.steps.map((step) => step.name)).toEqual([
      'landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'child_created', 'onboarding_complete',
    ])
    expect(result.authCompletedCount).toBe(1)
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

  it('keeps an earlier first-child conversion when the same anonymous browser returns in a later landing visit', async () => {
    const startedAt = Date.now() - 2 * 60 * 60 * 1000
    const firstVisit = eventSeries(
      'first',
      'aid-shared',
      ['landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'child_created', 'onboarding_complete', 'auth_complete'],
      startedAt,
      { userId: 'user-shared', childId: 'child-first', authIndex: 5, childIndex: 5 },
    )
    const returningVisit = eventSeries(
      'later',
      'aid-shared',
      ['landing_view', 'free_trial_click', 'child_form_start', 'email_submit', 'auth_complete', 'existing_parent_detected', 'pending_onboarding_discarded'],
      startedAt + 60 * 60 * 1000,
      { userId: 'user-shared', authIndex: 4 },
    )

    const client = createMockSupabaseClient({
      funnel_events: [...firstVisit, ...returningVisit],
      children: [{ id: 'child-first', parent_id: 'user-shared', is_internal_test: false }],
    })

    const result = await new LandingFunnelAdminService({ client: client as any }).getConversionFunnelData(7)

    expect(result.uniqueLandingVisitors).toBe(1)
    expect(result.steps.find((step) => step.name === 'onboarding_complete')?.uniqueVisitors).toBe(1)
    expect(result.authCompletedCount).toBe(1)
    expect(result.overallConversionPercent).toBe(100)
    expect(result.returningParent.detected).toBe(1)
    expect(result.returningParent.pendingOnboardingDiscarded).toBe(1)
  })

  it('keeps first-child acquisition conversion at onboarded even before the parent opens the Magic Link', async () => {
    const startedAt = Date.now() - 60_000
    const events = eventSeries(
      'new-no-auth',
      'aid-no-auth',
      ['landing_view', 'free_trial_click', 'child_form_start', 'email_submit', 'child_created', 'onboarding_complete'],
      startedAt,
      { userId: 'user-no-auth', childId: 'child-no-auth', authIndex: 4, childIndex: 4 },
    )
    const client = createMockSupabaseClient({
      funnel_events: events,
      children: [{ id: 'child-no-auth', parent_id: 'user-no-auth', is_internal_test: false }],
    })

    const result = await new LandingFunnelAdminService({ client: client as any }).getConversionFunnelData(7)

    expect(result.steps.map((step) => step.name)).toEqual([
      'landing_view', 'sample_click', 'free_trial_click', 'child_form_start', 'email_submit', 'child_created', 'onboarding_complete',
    ])
    expect(result.steps.find((step) => step.name === 'onboarding_complete')?.uniqueVisitors).toBe(1)
    expect(result.steps.some((step) => step.name === 'auth_complete')).toBe(false)
    expect(result.authCompletedCount).toBe(0)
    expect(result.overallConversionPercent).toBe(100)
  })

  it('paginates through more than 1000 events without data truncation', async () => {
    const startedAt = Date.now() - 60_000
    // Generate 1,200 unique landing_view events
    const largeEvents = Array.from({ length: 1200 }, (_, i) => ({
      id: `evt-${i}`,
      event_name: 'landing_view',
      anonymous_id: `aid-paginated-${i}`,
      user_id: null,
      utm_source: null,
      referrer: null,
      device_class: 'desktop',
      created_at: new Date(startedAt + i * 10).toISOString(),
    }))

    const client = createMockSupabaseClient({
      funnel_events: largeEvents,
      children: [],
    })

    const result = await new LandingFunnelAdminService({ client: client as any }).getConversionFunnelData(7)
    expect(result.totalEvents).toBe(1200)
    expect(result.uniqueLandingVisitors).toBe(1200)
  })

  it('identifies real biggestDropOff along linear funnel rather than false sample_click drop', async () => {
    const startedAt = Date.now() - 60_000
    // 100 landing, 10 sample, 80 trial click, 70 form start, 30 email submit
    const events: any[] = []
    for (let i = 0; i < 100; i++) {
      events.push({
        id: `landing-${i}`,
        event_name: 'landing_view',
        anonymous_id: `user-${i}`,
        created_at: new Date(startedAt + i * 10).toISOString(),
      })
    }
    // Only 10 check sample
    for (let i = 0; i < 10; i++) {
      events.push({
        id: `sample-${i}`,
        event_name: 'sample_click',
        anonymous_id: `user-${i}`,
        created_at: new Date(startedAt + 1000 + i * 10).toISOString(),
      })
    }
    // 80 click CTA directly
    for (let i = 0; i < 80; i++) {
      events.push({
        id: `trial-${i}`,
        event_name: 'free_trial_click',
        anonymous_id: `user-${i}`,
        created_at: new Date(startedAt + 2000 + i * 10).toISOString(),
      })
    }
    // 70 start form
    for (let i = 0; i < 70; i++) {
      events.push({
        id: `form-${i}`,
        event_name: 'child_form_start',
        anonymous_id: `user-${i}`,
        created_at: new Date(startedAt + 3000 + i * 10).toISOString(),
      })
    }
    // 30 submit email (drop of 40 people!)
    for (let i = 0; i < 30; i++) {
      events.push({
        id: `email-${i}`,
        event_name: 'email_submit',
        anonymous_id: `user-${i}`,
        created_at: new Date(startedAt + 4000 + i * 10).toISOString(),
      })
    }

    const client = createMockSupabaseClient({
      funnel_events: events,
      children: [],
    })

    const result = await new LandingFunnelAdminService({ client: client as any }).getConversionFunnelData(7)
    // Real biggest drop-off should be child_form_start -> email_submit (40 dropped), NOT landing_view -> sample_click
    expect(result.biggestDropOff).not.toBeNull()
    expect(result.biggestDropOff?.fromStep).toBe('child_form_start')
    expect(result.biggestDropOff?.toStep).toBe('email_submit')
    expect(result.biggestDropOff?.dropCount).toBe(40)
  })
})

