import { describe, expect, it } from 'vitest'
import { getDeliveryViewModel } from './delivery'
import type { Child } from './children'
import type { Material } from './materials'

const child: Child = {
  id: 'child', display_name: '安安', grade: 7, is_active: true, timezone: 'Asia/Taipei', delivery_weekday: 1,
  textbook_version: null, next_generation_at: '2026-08-16T01:00:00Z', created_at: '2026-08-01T00:00:00Z',
}

const material = (withFeedback: boolean): Material => ({
  id: 'material', child_id: 'child', material_week: '2026-08-10', revision: 1,
  student_pdf_path: 'student.pdf', parent_answer_pdf_path: 'parent.pdf', generation_summary: {}, created_at: '2026-08-10T00:00:00Z',
  feedback: withFeedback ? { difficulty: 3, completion_rate: 100, weak_area: null, mistakes_text: null, child_comments: null, parent_comments: null, created_at: '2026-08-14T00:00:00Z' } : null,
})

describe('getDeliveryViewModel', () => {
  it('derives delivery and feedback cutoff from the generation deadline', () => {
    const view = getDeliveryViewModel(child, material(false), new Date('2026-08-14T00:00:00Z'))
    expect(view.nextDeliveryAt?.toISOString()).toBe('2026-08-17T01:00:00.000Z')
    expect(view.feedbackCutoffAt?.toISOString()).toBe('2026-08-15T01:00:00.000Z')
    expect(view.feedbackState).toBe('open')
  })

  it('keeps received feedback authoritative after the cutoff', () => {
    expect(getDeliveryViewModel(child, material(true), new Date('2026-08-16T00:00:00Z')).feedbackState).toBe('received')
  })

  it('explains that generation continues when feedback is absent after cutoff', () => {
    const view = getDeliveryViewModel(child, material(false), new Date('2026-08-16T00:00:00Z'))
    expect(view.feedbackState).toBe('closed')
    expect(view.detail).toContain('仍會')
  })
})

