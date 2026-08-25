import { describe, expect, it } from 'vitest'
import { emptyProfileDraft, toChildProfileInput, validateProfileStep } from './profile-form'

describe('profile form', () => {
  it('requires only generation-critical fields', () => {
    expect(validateProfileStep(1, emptyProfileDraft)).toHaveProperty('displayName')
    expect(validateProfileStep(2, emptyProfileDraft)).toHaveProperty('baselineLevel')
    expect(validateProfileStep(3, emptyProfileDraft)).toEqual({})
    expect(validateProfileStep(6, emptyProfileDraft)).toHaveProperty('learningGoals')
  })

  it('accepts only a single-packet weekly workload domain', () => {
    expect(validateProfileStep(5, { ...emptyProfileDraft, weeklyMinutes: 30 })).toEqual({})
    expect(validateProfileStep(5, { ...emptyProfileDraft, weeklyMinutes: 240 })).toEqual({})
    expect(validateProfileStep(5, { ...emptyProfileDraft, weeklyMinutes: 29 })).toHaveProperty('weeklyMinutes')
    expect(validateProfileStep(5, { ...emptyProfileDraft, weeklyMinutes: 241 })).toHaveProperty('weeklyMinutes')
    expect(() => toChildProfileInput({ ...emptyProfileDraft, weeklyMinutes: 600 })).toThrow(RangeError)
  })

  it('maps flexible context into preferences without losing core profile fields', () => {
    const input = toChildProfileInput({ ...emptyProfileDraft, baselineLevel: 'grade-7', learningGoals: 'read independently', interests: ['動物'], upcomingTest: '9/15' })
    expect(input.baseline_level).toBe('grade-7')
    expect(input.preferences).toMatchObject({ interests: ['動物'], upcomingTest: '9/15' })
  })

  it('stores specific interests as generator-readable context', () => {
    const input = toChildProfileInput({
      ...emptyProfileDraft,
      favoriteStories: '排球少年\n葬送的芙莉蓮',
      favoriteGames: 'Minecraft 生存模式',
      activities: '跆拳道藍帶',
      currentFascinations: 'F1 進站策略',
    })
    expect(input.preferences).toMatchObject({
      schemaVersion: 2,
      favoriteStories: '排球少年\n葬送的芙莉蓮',
      favoriteGames: 'Minecraft 生存模式',
      activities: '跆拳道藍帶',
      currentFascinations: 'F1 進站策略',
    })
  })
})
