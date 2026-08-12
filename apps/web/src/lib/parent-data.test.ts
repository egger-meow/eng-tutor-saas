import { describe, expect, it } from 'vitest'
import { chooseOwnedChild, type ChildWithProfile } from '../hooks/use-parent-data'
import { readGenerationSummary } from './materials'

const child = (id: string): ChildWithProfile => ({
  id,
  display_name: id,
  grade: 7,
  is_active: true,
  timezone: 'Asia/Taipei',
  delivery_weekday: 1,
  textbook_version: null,
  next_generation_at: null,
  created_at: '2026-08-12T00:00:00Z',
  profile: null,
})

describe('chooseOwnedChild', () => {
  it('accepts only a child present in the owned collection', () => {
    const children = [child('first'), child('second')]
    expect(chooseOwnedChild(children, 'second')?.id).toBe('second')
    expect(chooseOwnedChild(children, 'not-owned')?.id).toBe('first')
  })

  it('returns null when the parent has no children', () => {
    expect(chooseOwnedChild([], 'anything')).toBeNull()
  })
})

describe('readGenerationSummary', () => {
  it('keeps meaningful strings and rejects unknown values', () => {
    expect(readGenerationSummary({ title: 'Ocean Week', learningFocus: 42, learningAdjustmentSummary: 'More reading' })).toEqual({
      title: 'Ocean Week',
      learningFocus: null,
      learningAdjustmentSummary: 'More reading',
    })
  })
})
