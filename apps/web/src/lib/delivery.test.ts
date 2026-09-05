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

describe('getDeliveryViewModel — released weekly cadence', () => {
  it('uses a prepared next material before any later job date', () => {
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z', withFeedback: true })
    const preparedWeek2 = buildMaterial({ id: 'm-2', week: '2026-08-19', releaseAt: '2026-08-19T01:00:00Z' })

    const view = getDeliveryViewModel(
      baseChild,
      currentWeek1,
      preparedWeek2,
      '2026-09-01T01:00:00Z',
      new Date('2026-08-15T00:00:00Z'),
    )

    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T01:00:00.000Z')
    expect(view.headline).toContain('8月19日')
    expect(view.headline).not.toContain('9月1日')
    expect(view.feedbackState).toBe('received')
  })

  it('uses the owned Week 2 generation job release as the next delivery date', () => {
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const view = getDeliveryViewModel(
      { ...baseChild, next_generation_at: null },
      currentWeek1,
      null,
      '2026-08-19T01:00:00Z',
      new Date('2026-08-14T00:00:00Z'),
    )

    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T01:00:00.000Z')
    expect(view.feedbackCutoffAt?.toISOString()).toBe('2026-08-17T01:00:00.000Z')
    expect(view.feedbackState).toBe('open')
    expect(view.headline).toContain('8月19日')
  })

  it('keeps the next-week cadence exactly seven days after the actual Week 1 release when that is the owned job schedule', () => {
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T03:42:00Z' })
    const week2Release = new Date(new Date(currentWeek1.release_at!).getTime() + 7 * 24 * 60 * 60 * 1000)
    const view = getDeliveryViewModel(baseChild, currentWeek1, null, week2Release.toISOString(), new Date('2026-08-13T00:00:00Z'))

    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-19T03:42:00.000Z')
  })

  it('shows neutral schedule confirmation when a released child has no authoritative next schedule yet', () => {
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const view = getDeliveryViewModel(baseChild, currentWeek1, null, null, new Date('2026-08-15T00:00:00Z'))

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.headline).toBe('下一份教材排程確認中')
    expect(view.detail).toContain('排程確認後')
  })

  it('keeps feedback acknowledgement factual after cutoff or submission', () => {
    const current = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z', withFeedback: true })
    const view = getDeliveryViewModel(baseChild, current, null, '2026-08-19T01:00:00Z', new Date('2026-08-18T00:00:00Z'))

    expect(view.feedbackState).toBe('received')
    expect(view.detail).toBe('本週回饋已收到。')
  })
})

describe('getDeliveryViewModel — Week 1 Fast Lane', () => {
  it('never turns the old Week 1 release_at placeholder into a parent-facing date promise', () => {
    const view = getDeliveryViewModel(
      baseChild,
      null,
      null,
      '2026-08-16T16:00:00Z',
      new Date('2026-08-16T07:00:00Z'),
    )

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.feedbackCutoffAt).toBeNull()
    expect(view.headline).toBe('第一份教材正在加速製作')
    expect(view.detail).toContain('立即開始製作')
    expect(view.detail).toContain('完成後直接開放下載')
    expect(view.headline).not.toContain('預計')
    expect(view.headline).not.toMatch(/\d+月\d+日/u)
  })

  it('behaves the same regardless of registration clock time', () => {
    const registrationTimes = [
      new Date('2026-08-16T07:00:00Z'),
      new Date('2026-08-15T16:20:00Z'),
      new Date('2026-08-16T15:50:00Z'),
    ]

    for (const now of registrationTimes) {
      const view = getDeliveryViewModel(baseChild, null, null, '2026-08-16T16:00:00Z', now)
      expect(view.nextDeliveryAt).toBeNull()
      expect(view.headline).toBe('第一份教材正在加速製作')
    }
  })

  it('shows ready/syncing instead of a future date when the first material has already been prepared', () => {
    const preparedWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const view = getDeliveryViewModel(baseChild, null, preparedWeek1, '2026-08-19T01:00:00Z', new Date('2026-08-08T00:00:00Z'))

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.headline).toBe('第一份教材已完成')
    expect(view.detail).toContain('正在同步')
    expect(view.headline).not.toContain('8月12日')
    expect(view.headline).not.toContain('8月19日')
  })

  it('shows active repair without fabricating a new delivery date after a Week 1 generation failure', () => {
    const view = getDeliveryViewModel(
      baseChild,
      null,
      null,
      '2026-08-16T16:00:00Z',
      new Date('2026-08-17T01:00:00Z'),
      true,
      true,
    )

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.headline).toBe('第一份教材正在重新整理')
    expect(view.detail).toContain('正在重新處理')
    expect(view.detail).toContain('完成後會直接開放下載')
  })

  it('keeps a past-due first job calm and date-free when no usable job release is exposed', () => {
    const view = getDeliveryViewModel(baseChild, null, null, null, new Date('2026-08-20T00:00:00Z'), true, false)

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toBe('第一份教材仍在製作中；完成後會直接開放下載。')
  })

  it('gives a brand-new child a truthful immediate-start expectation without inventing a date', () => {
    const view = getDeliveryViewModel({ ...baseChild, next_generation_at: null }, null, null, null, new Date('2026-08-16T07:00:00Z'))

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.headline).toBe('第一份教材準備中')
    expect(view.detail).toBe('完成孩子資料後就會立即開始製作第一份教材。')
  })

  it('does not expose internal/artificial manual-review claims when a later-week generation fails', () => {
    const current = buildMaterial({ id: 'm-1', week: '2026-08-12', releaseAt: '2026-08-12T01:00:00Z' })
    const view = getDeliveryViewModel(baseChild, current, null, null, new Date('2026-08-20T00:00:00Z'), false, true)

    expect(view.nextDeliveryAt).toBeNull()
    expect(view.headline).toBe('教材正在進行品質複檢')
    expect(view.detail).toContain('正在重新處理')
    expect(view.detail).not.toContain('人工')
    expect(view.detail).not.toContain('教學團隊已接手')
  })

  it('does not subscription-gate an unreleased first packet for a trialing child', () => {
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

    const view = getDeliveryViewModel(trialingChild, null, null, '2026-08-17T16:00:00Z', new Date('2026-08-16T07:00:00Z'))
    expect(view.headline).toBe('第一份教材正在加速製作')
    expect(view.action).toBeUndefined()
    expect(view.nextDeliveryAt).toBeNull()
  })
})

describe('subscription gating after Week 1', () => {
  it('requires a subscription for the next packet when Week 1 has completed and no paid subscription exists', () => {
    const currentWeek1 = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z' })
    const view = getDeliveryViewModel(
      { ...baseChild, subscription: null },
      currentWeek1,
      null,
      '2026-08-21T01:00:00Z',
      new Date('2026-08-16T07:00:00Z'),
    )

    expect(view.headline).toBe('需訂閱以開啟下一週教材')
    expect(view.action).toEqual({ label: '前往選擇方案訂閱', href: '/billing' })
  })

  it('shows canceled state without promising a future delivery', () => {
    const current = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: '2026-08-14T01:00:00Z' })
    const child = {
      ...baseChild,
      subscription: {
        id: 'sub-1',
        childId: 'child-1',
        status: 'canceled' as const,
        planCode: 'standard_monthly',
        billingInterval: 'month' as const,
        priceTwd: 499,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        foundingStatus: 'none' as const,
      },
    }

    const view = getDeliveryViewModel(child, current, null, '2026-08-21T01:00:00Z', new Date('2026-08-16T07:00:00Z'))
    expect(view.headline).toBe('訂閱已到期')
    expect(view.nextDeliveryAt).toBeNull()
    expect(view.action?.href).toBe('/billing')
  })
})

describe('material release and formatting helpers', () => {
  it('keeps prepared material locked before release and available at the release boundary', () => {
    const prepared = buildMaterial({ id: 'm-1', week: '2026-08-17', releaseAt: '2026-08-17T01:00:00Z' })
    expect(isMaterialReleased(prepared, new Date('2026-08-17T00:59:59Z'))).toBe(false)
    expect(isMaterialReleased(prepared, new Date('2026-08-17T01:00:00Z'))).toBe(true)
  })

  it('treats legacy materials without a release timestamp as available', () => {
    const legacy = buildMaterial({ id: 'm-1', week: '2026-08-14', releaseAt: null })
    expect(isMaterialReleased(legacy, new Date('2026-08-14T00:00:00Z'))).toBe(true)
  })

  it('formats parent-facing schedule dates in Asia/Taipei', () => {
    const formatted = formatTaipeiDate(new Date('2026-08-19T01:00:00Z'))
    expect(formatted).toContain('8月19日')
    expect(formatted).toContain('三')
  })
})
