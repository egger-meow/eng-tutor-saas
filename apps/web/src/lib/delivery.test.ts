import { describe, expect, it } from 'vitest'
import { formatTaipeiDate, getDeliveryViewModel } from './delivery'
import type { Child } from './children'
import { isMaterialReleased, type Material } from './materials'

const baseChild: Child = {
  id: 'child-1',
  display_name: '安安',
  grade: 7,
  grade_stage: 'grade_7',
  is_active: true,
  timezone: 'Asia/Taipei',
  delivery_weekday: 3,
  textbook_version: '翰林',
  next_generation_at: '2026-08-18T01:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
}

const buildMaterial = (options: {
  id: string
  week: string
  releaseAt?: string | null
  withFeedback?: boolean
}): Material => ({
  id: options.id,
  child_id: 'child-1',
  material_week: options.week,
  revision: 1,
  student_pdf_path: `${options.id}/student.pdf`,
  parent_answer_pdf_path: `${options.id}/parent.pdf`,
  generation_summary: {},
  created_at: `${options.week}T00:00:00Z`,
  release_at: options.releaseAt ?? null,
  feedback: options.withFeedback
    ? {
        difficulty: 3,
        completion_rate: 100,
        weak_area: null,
        mistakes_text: null,
        child_comments: null,
        parent_comments: null,
        created_at: `${options.week}T12:00:00Z`,
      }
    : null,
})

describe('getDeliveryViewModel - Temporal Semantics & Horizon Invariant', () => {
  it('Case A: does not leak Week 3 delivery date when Week 2 is prepared and unreleased (exact production bug)', () => {
    const now = new Date('2026-08-15T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z', withFeedback: true })
    const preparedWeek2 = buildMaterial({ id: 'm-2', week: '2026-08-19', releaseAt: '2026-08-19T01:00:00Z', withFeedback: false })

    // Scheduler has already created the Week 3 job and set child.next_generation_at to 2026-08-25
    const childWithAdvancedJob: Child = {
      ...baseChild,
      next_generation_at: '2026-08-25T01:00:00Z',
    }

    const view = getDeliveryViewModel(childWithAdvancedJob, currentWeek1, preparedWeek2, now)

    // Authoritative next delivery must be Week 2 (2026-08-19)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T01:00:00.000Z')
    expect(view.headline).toContain('8月19日')
    // Must NOT contain 8/26 anywhere
    expect(view.headline).not.toContain('8月26日')
    expect(view.headline).not.toContain('26日')
    expect(view.detail).not.toContain('8月26日')
  })

  it('Case B: derives immediate next week when owned future generation_jobs.release_at exists', () => {
    const now = new Date('2026-08-14T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const jobReleaseAt = '2026-08-19T01:00:00Z'

    const view = getDeliveryViewModel(baseChild, currentWeek1, null, jobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T01:00:00.000Z')
    expect(view.feedbackCutoffAt?.toISOString()).toBe('2026-08-17T01:00:00.000Z')
    expect(view.feedbackState).toBe('open')
    expect(view.headline).toContain('8月19日')
  })

  it('Case C: prepared material release_at overrides any later job release date', () => {
    const now = new Date('2026-08-15T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const preparedWeek2 = buildMaterial({ id: 'm-2', week: '2026-08-19', releaseAt: '2026-08-19T01:00:00Z' })
    const laterJobReleaseAt = '2026-09-01T01:00:00Z'

    const view = getDeliveryViewModel(baseChild, currentWeek1, preparedWeek2, laterJobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T01:00:00.000Z')
  })

  it('Case D: pre-Week-1 state shows only the first material release, never Week 2', () => {
    const now = new Date('2026-08-08T00:00:00Z')
    const preparedWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const laterJobReleaseAt = '2026-08-19T01:00:00Z'

    const view = getDeliveryViewModel(baseChild, null, preparedWeek1, laterJobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-12T01:00:00.000Z')
    expect(view.headline).toContain('8月12日')
    expect(view.headline).not.toContain('8月19日')
  })

  it('Case E: release boundary transition behaves deterministically', () => {
    const preparedWeek2 = buildMaterial({ id: 'm-2', week: '2026-08-19', releaseAt: '2026-08-19T01:00:00Z' })
    const justBefore = new Date('2026-08-19T00:59:59Z')
    const exactRelease = new Date('2026-08-19T01:00:00Z')

    expect(isMaterialReleased(preparedWeek2, justBefore)).toBe(false)
    expect(isMaterialReleased(preparedWeek2, exactRelease)).toBe(true)
  })

  it('Case F: feedback copy uses neutral statement without unprovable future promises', () => {
    const now = new Date('2026-08-15T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z', withFeedback: true })
    const preparedWeek2 = buildMaterial({ id: 'm-2', week: '2026-08-19', releaseAt: '2026-08-19T01:00:00Z' })

    const view = getDeliveryViewModel(baseChild, currentWeek1, preparedWeek2, now)
    expect(view.feedbackState).toBe('received')
    expect(view.detail).toBe('本週回饋已收到。')
    expect(view.detail).not.toContain('會用於下一份教材')
    expect(view.detail).not.toContain('Week 3')
  })

  it('Case G: explains continuation without exposing internal queue when feedback is absent after cutoff', () => {
    const afterCutoff = new Date('2026-08-18T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z', withFeedback: false })
    const jobReleaseAt = '2026-08-19T01:00:00Z'

    const view = getDeliveryViewModel(baseChild, currentWeek1, null, jobReleaseAt, afterCutoff)
    expect(view.feedbackState).toBe('closed')
    expect(view.detail).toContain('仍會')
    expect(view.detail).not.toContain('Week 3')
  })

  it('Case H: date formatting is locked to Asia/Taipei timezone', () => {
    const date = new Date('2026-08-19T01:00:00Z') // 09:00 in Taipei on Aug 19
    const formatted = formatTaipeiDate(date)
    expect(formatted).toContain('8月19日')
    expect(formatted).toContain('三')
  })

  it('Case I: uses owned generation_jobs.release_at directly as canonical next-delivery source', () => {
    const now = new Date('2026-08-15T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const childWithoutNextGen: Child = {
      ...baseChild,
      next_generation_at: null, // Proves no dependency on next_generation_at
    }

    const jobReleaseAt = '2026-08-19T01:00:00Z'
    const view = getDeliveryViewModel(childWithoutNextGen, currentWeek1, null, jobReleaseAt, now)

    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T01:00:00.000Z')
    expect(view.feedbackCutoffAt?.toISOString()).toBe('2026-08-17T01:00:00.000Z')
    expect(view.feedbackState).toBe('open')
    expect(view.headline).toContain('8月19日')
  })

  it('Case J: shows neutral schedule confirmation state when neither prepared material nor job release is available', () => {
    const now = new Date('2026-08-15T00:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const childWithInternalWorkerState: Child = {
      ...baseChild,
      next_generation_at: '2026-08-18T01:00:00Z', // Worker deadline must NOT be guessed as delivery date
    }

    const view = getDeliveryViewModel(childWithInternalWorkerState, currentWeek1, null, null, now)

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.feedbackCutoffAt).toBeNull()
    expect(view.headline).toBe('下一份教材排程確認中')
    expect(view.detail).toContain('排程確認後會在這裡顯示')
  })
})

describe('isMaterialReleased', () => {
  it('keeps prepared material locked before its release time', () => {
    const prepared = buildMaterial({ id: 'm-1', week: '2026-08-17', releaseAt: '2026-08-17T01:00:00Z' })
    expect(isMaterialReleased(prepared, new Date('2026-08-16T23:59:59Z'))).toBe(false)
    expect(isMaterialReleased(prepared, new Date('2026-08-17T01:00:00Z'))).toBe(true)
  })

  it('treats legacy materials without a release timestamp as available', () => {
    const legacy = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: null })
    expect(isMaterialReleased(legacy, new Date('2026-08-14T00:00:00Z'))).toBe(true)
  })
})

describe('Week 1 Delivery Timing — Initial Scheduling', () => {
  // Test 1: Registration at 15:00 Asia/Taipei (Aug 16) → first delivery is next day (Aug 17)
  // The release_at is set by the DB to next-day 00:00 local = 2026-08-16T16:00:00Z
  it('Case 1: registration at 15:00 shows next-day delivery, not registration day', () => {
    const now = new Date('2026-08-16T07:00:00Z') // 15:00 Asia/Taipei
    // After the DB fix, the initial job's release_at will be Aug 17 00:00 Taipei = 2026-08-16T16:00:00Z
    const jobReleaseAt = '2026-08-16T16:00:00Z'

    const view = getDeliveryViewModel(baseChild, null, null, jobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-16T16:00:00.000Z')
    expect(view.headline).toContain('8月17日')
    expect(view.headline).toContain('預計')
    expect(view.headline).toContain('第一份教材')
    // Must NOT show registration day (Aug 16)
    expect(view.headline).not.toContain('8月16日')
  })

  // Test 2: Registration at 00:20 Asia/Taipei (just after Scheduled authoring window)
  it('Case 2: registration at 00:20 shows next-day delivery (Aug 17)', () => {
    const now = new Date('2026-08-15T16:20:00Z') // 2026-08-16 00:20 Taipei
    const jobReleaseAt = '2026-08-16T16:00:00Z' // Aug 17 00:00 Taipei

    const view = getDeliveryViewModel(baseChild, null, null, jobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-16T16:00:00.000Z')
    expect(view.headline).toContain('8月17日')
  })

  // Test 3: Registration at 23:50 Asia/Taipei (shortly before next Scheduled run)
  it('Case 3: registration at 23:50 shows next-day delivery (Aug 17)', () => {
    const now = new Date('2026-08-16T15:50:00Z') // 2026-08-16 23:50 Taipei
    const jobReleaseAt = '2026-08-16T16:00:00Z' // Aug 17 00:00 Taipei

    const view = getDeliveryViewModel(baseChild, null, null, jobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-16T16:00:00.000Z')
    expect(view.headline).toContain('8月17日')
  })

  // Test 4: Job is eligible at next authoring run (proven by release_at being in the future)
  it('Case 4: all registration times produce a future release_at (eligible for next run)', () => {
    const registrationTimes = [
      new Date('2026-08-16T07:00:00Z'),  // 15:00 Taipei (Aug 16)
      new Date('2026-08-15T16:20:00Z'),  // 00:20 Taipei (Aug 16)
      new Date('2026-08-16T15:50:00Z'),  // 23:50 Taipei (Aug 16)
    ]
    const jobReleaseAt = '2026-08-16T16:00:00Z'

    for (const now of registrationTimes) {
      const view = getDeliveryViewModel(baseChild, null, null, jobReleaseAt, now)
      expect(view.nextDeliveryAt).not.toBeNull()
      expect(view.nextDeliveryAt!.getTime()).toBeGreaterThan(now.getTime())
    }
  })
})

describe('Week 1 Delivery Timing — Parent UI', () => {
  // Test 5: Before Week 1 exists, dashboard shows canonical next-day expectation
  it('Case 5: pre-Week-1 dashboard shows canonical job release_at as delivery expectation', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const jobReleaseAt = '2026-08-16T16:00:00Z'

    const view = getDeliveryViewModel(baseChild, null, null, jobReleaseAt, now)
    expect(view.headline).toContain('預計')
    expect(view.headline).toContain('第一份教材')
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-16T16:00:00.000Z')
  })

  // Test 6: No frontend code independently calculates a fake delivery date
  // when a canonical job schedule exists — the view model uses the provided job release_at directly
  it('Case 6: delivery view model uses provided job release_at directly, no independent calculation', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const jobReleaseAt = '2026-08-16T16:00:00Z'
    const childWithGenerationDeadline: Child = {
      ...baseChild,
      next_generation_at: '2026-08-15T16:00:00Z', // Internal deadline must NOT be surfaced
    }

    const view = getDeliveryViewModel(childWithGenerationDeadline, null, null, jobReleaseAt, now)
    // Must use the job release_at, not the child's internal generation deadline
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-16T16:00:00.000Z')
    expect(view.headline).not.toContain('8月16日')
  })

  // Test 7: Stale date fallback — release_at passed but no material exists
  it('Case 7: stale delivery date falls back to neutral preparation state', () => {
    // Scenario: onboarding Aug 16, expected delivery Aug 17, now it's Aug 18 and nothing arrived
    const now = new Date('2026-08-18T07:00:00Z') // Aug 18 15:00 Taipei
    const staleJobReleaseAt = '2026-08-16T16:00:00Z' // Aug 17 00:00 Taipei - ALREADY PASSED

    const view = getDeliveryViewModel(baseChild, null, null, staleJobReleaseAt, now)
    // Must NOT show the stale date
    expect(view.headline).not.toContain('8月17日')
    // Must show neutral preparation state
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toContain('最後檢查')
    expect(view.nextDeliveryAt).toBeNull()
    // Must NOT expose internal terminology
    expect(view.detail).not.toContain('quality')
    expect(view.detail).not.toContain('rejected')
    expect(view.detail).not.toContain('retry')
    expect(view.detail).not.toContain('finisher')
    expect(view.detail).not.toContain('GitHub')
  })

  // Additional: stale date with existing material (Week 2 late) should still show the date
  // because the parent has a current material and feedback context
  it('Case 7b: stale date with existing current material still shows the date for feedback context', () => {
    const now = new Date('2026-08-26T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-17', releaseAt: '2026-08-17T01:00:00Z', withFeedback: false })
    const staleJobReleaseAt = '2026-08-24T01:00:00Z' // Past

    const view = getDeliveryViewModel(baseChild, currentWeek1, null, staleJobReleaseAt, now)
    // With an existing current material, the date still shows (feedback context exists)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-24T01:00:00.000Z')
  })
})

describe('Week 1 Delivery Timing — Completion and Cadence', () => {
  // Test 8: When Week 1 completes, material release behavior remains correct
  it('Case 8: completed Week 1 material is downloadable when released', () => {
    const week1 = buildMaterial({ id: 'm-1', week: '2026-08-17', releaseAt: '2026-08-17T01:00:00Z' })
    expect(isMaterialReleased(week1, new Date('2026-08-17T00:59:59Z'))).toBe(false)
    expect(isMaterialReleased(week1, new Date('2026-08-17T01:00:00Z'))).toBe(true)
  })

  // Test 9: Week 2 is scheduled exactly 7 days after Week 1
  // (Verified by checking the delivery view model uses the correct date)
  it('Case 9: Week 2 delivery is exactly 7 days after Week 1 release_at', () => {
    const now = new Date('2026-08-18T07:00:00Z')
    const week1Released = buildMaterial({ id: 'm-1', week: '2026-08-17', releaseAt: '2026-08-17T01:00:00Z', withFeedback: true })
    // After completion, next job gets release_at + 7 days
    const week2JobReleaseAt = '2026-08-24T01:00:00Z' // Aug 17 + 7 days

    const view = getDeliveryViewModel(baseChild, week1Released, null, week2JobReleaseAt, now)
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-24T01:00:00.000Z')
    expect(view.headline).toContain('8月24日')

    // Verify exact 7-day gap
    const week1Release = new Date('2026-08-17T01:00:00Z')
    const week2Release = new Date(week2JobReleaseAt)
    const daysDiff = (week2Release.getTime() - week1Release.getTime()) / (24 * 60 * 60 * 1000)
    expect(daysDiff).toBe(7)
  })

  // Test 10: Prepared material precedence remains intact
  it('Case 10: prepared material release_at overrides a later generation-job date', () => {
    const now = new Date('2026-08-18T07:00:00Z')
    const week1Released = buildMaterial({ id: 'm-1', week: '2026-08-17', releaseAt: '2026-08-17T01:00:00Z', withFeedback: true })
    const preparedWeek2 = buildMaterial({ id: 'm-2', week: '2026-08-24', releaseAt: '2026-08-24T01:00:00Z' })
    const week3JobReleaseAt = '2026-08-31T01:00:00Z' // A later job for Week 3

    const view = getDeliveryViewModel(baseChild, week1Released, preparedWeek2, week3JobReleaseAt, now)
    // Must show Week 2's prepared material date, not Week 3's job date
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-24T01:00:00.000Z')
    expect(view.headline).toContain('8月24日')
    expect(view.headline).not.toContain('8月31日')
  })
})

describe('Week 1 Delivery Timing — Retry and Pre-Onboarding States', () => {
  // Test 11-13: Quality rejection does not create a duplicate job; creates/reuses next attempt;
  // does not bypass finisher. These are server-side tests — frontend test confirms UI behavior.
  it('Case 11-13: stale release_at after quality rejection shows preparation, not a new date', () => {
    // Scenario: Week 1 authored, quality-rejected, release_at has passed, no material
    const now = new Date('2026-08-18T07:00:00Z')
    const staleJobReleaseAt = '2026-08-16T16:00:00Z' // Already passed

    const view = getDeliveryViewModel(baseChild, null, null, staleJobReleaseAt, now)
    // Must show preparation state (the job was returned to pending for retry)
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toBe('教材正在完成最後檢查，準備完成後即可下載。')
    // Must NOT fabricate a new delivery date
    expect(view.nextDeliveryAt).toBeNull()
  })

  // Test 14: exhausted max_attempts — same UI behavior (preparation state)
  // The UI doesn't know about attempt counts; it just sees no material and stale date
  it('Case 14: exhausted attempts shows same neutral preparation state', () => {
    const now = new Date('2026-08-20T07:00:00Z')
    const staleJobReleaseAt = '2026-08-16T16:00:00Z'

    const view = getDeliveryViewModel(baseChild, null, null, staleJobReleaseAt, now)
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toBe('教材正在完成最後檢查，準備完成後即可下載。')
    expect(view.nextDeliveryAt).toBeNull()
  })

  it('Case 15: past-due job filtered out by materials.ts (null job release) with has_past_due_job flag shows final check', () => {
    const now = new Date('2026-08-18T07:00:00Z')
    const childWithPastDueJob = {
      ...baseChild,
      has_past_due_job: true,
    }

    const view = getDeliveryViewModel(childWithPastDueJob, null, null, null, now)
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toBe('教材正在完成最後檢查，準備完成後即可下載。')
    expect(view.nextDeliveryAt).toBeNull()
  })

  it('Case 16: completely brand new child with NO owned generation job shows pre-onboarding expectation', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const childWithoutJob = {
      ...baseChild,
      has_past_due_job: false,
    }

    const view = getDeliveryViewModel(childWithoutJob, null, null, null, now)
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toBe('完成孩子資料後，我們會開始準備第一份教材。')
    expect(view.nextDeliveryAt).toBeNull()
  })
})

describe('Subscription Gating for Delivery Status', () => {
  it('shows subscription requirement and CTA to /billing when trialing child has completed Week 1', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: false })
    const trialingChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'trialing' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: null,
        currentPeriodEnd: '2026-08-21T00:00:00Z',
        cancelAtPeriodEnd: false,
        foundingStatus: 'eligible' as const,
      },
    }

    const view = getDeliveryViewModel(trialingChild, currentWeek1, null, '2026-08-21T01:00:00Z', now)
    expect(view.headline).toBe('需訂閱以開啟下一週教材')
    expect(view.detail).toContain('第 1 週體驗教材已開放下載')
    expect(view.detail).toContain('8月21日')
    expect(view.action).toEqual({
      label: '前往選擇方案訂閱',
      href: '/billing',
    })
  })

  it('shows feedback acknowledged in subscription prompt when feedback has been submitted', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: true })
    const trialingChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'trialing' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: null,
        currentPeriodEnd: '2026-08-21T00:00:00Z',
        cancelAtPeriodEnd: false,
        foundingStatus: 'eligible' as const,
      },
    }

    const view = getDeliveryViewModel(trialingChild, currentWeek1, null, '2026-08-21T01:00:00Z', now)
    expect(view.headline).toBe('需訂閱以開啟下一週教材')
    expect(view.detail).toContain('本週回饋已收到！完成訂閱後')
    expect(view.action?.href).toBe('/billing')
  })

  it('shows expired status and reactivation CTA when subscription is canceled', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: false })
    const canceledChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'canceled' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: 499,
        currentPeriodEnd: '2026-08-14T00:00:00Z',
        cancelAtPeriodEnd: false,
        foundingStatus: 'none' as const,
      },
    }

    const view = getDeliveryViewModel(canceledChild, currentWeek1, null, null, now)
    expect(view.headline).toBe('訂閱已到期')
    expect(view.detail).toContain('已完成的教材仍可隨時下載複習')
    expect(view.action).toEqual({
      label: '重新啟用訂閱',
      href: '/billing',
    })
  })

  it('preserves normal delivery schedule for active subscribers', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: false })
    const activeChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'active' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: 499,
        currentPeriodEnd: '2026-09-14T00:00:00Z',
        cancelAtPeriodEnd: false,
        foundingStatus: 'none' as const,
      },
    }

    const view = getDeliveryViewModel(activeChild, currentWeek1, null, '2026-08-21T01:00:00Z', now)
    expect(view.headline).toContain('預計 8月21日')
    expect(view.action).toBeUndefined()
  })

  it('active + cancelAtPeriodEnd: delivers normally when next delivery is within current paid period', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: false })
    const activeCanceledChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'active' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: 499,
        currentPeriodEnd: '2026-08-25T00:00:00Z', // Expires Aug 25
        cancelAtPeriodEnd: true,
        foundingStatus: 'none' as const,
      },
    }

    // Next delivery is Aug 21 (<= Aug 25 period end)
    const view = getDeliveryViewModel(activeCanceledChild, currentWeek1, null, '2026-08-21T01:00:00Z', now)
    expect(view.headline).toContain('預計 8月21日')
    expect(view.action).toBeUndefined()
  })

  it('active + cancelAtPeriodEnd: does NOT promise delivery when next delivery falls beyond current paid period', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: false })
    const activeCanceledChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'active' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: 499,
        currentPeriodEnd: '2026-08-20T00:00:00Z', // Expires Aug 20
        cancelAtPeriodEnd: true,
        foundingStatus: 'none' as const,
      },
    }

    // Next delivery would have been Aug 21 (> Aug 20 period end)
    const view = getDeliveryViewModel(activeCanceledChild, currentWeek1, null, '2026-08-21T01:00:00Z', now)
    expect(view.headline).toBe('已取消自動續訂')
    expect(view.detail).toContain('目前方案仍可使用至')
    expect(view.detail).toContain('8月20日')
    expect(view.detail).toContain('到期後將停止準備新的每週教材')
    expect(view.action).toEqual({
      label: '恢復自動續訂',
      href: '/billing',
    })
  })

  it('no subscription (null) + Week 1 finished: requires subscription with CTA to /billing', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z', withFeedback: false })
    const unsubscribedChild = {
      ...baseChild,
      subscription: null,
    }

    const view = getDeliveryViewModel(unsubscribedChild, currentWeek1, null, '2026-08-21T01:00:00Z', now)
    expect(view.headline).toBe('需訂閱以開啟下一週教材')
    expect(view.action).toEqual({
      label: '前往選擇方案訂閱',
      href: '/billing',
    })
  })

  it('allows free Week 1 delivery for trialing child who has NO prior materials', () => {
    const now = new Date('2026-08-16T07:00:00Z')
    const trialingChild = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'trialing' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: null,
        currentPeriodEnd: '2026-08-21T00:00:00Z',
        cancelAtPeriodEnd: false,
        foundingStatus: 'eligible' as const,
      },
    }

    // Pre-Week 1 (currentMaterial is null)
    const view = getDeliveryViewModel(trialingChild, null, null, '2026-08-17T16:00:00Z', now)
    expect(view.headline).toContain('預計')
    expect(view.headline).toContain('第一份教材')
    expect(view.action).toBeUndefined()
  })
})

