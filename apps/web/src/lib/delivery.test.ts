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
