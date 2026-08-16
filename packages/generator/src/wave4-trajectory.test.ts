import { describe, it, expect } from 'vitest'
import { multiWeekTrajectoryFixtures } from './fixtures/multi-week-trajectory.js'
import { ReadingGenreSchema } from './curriculum-package-schema.js'

describe('Wave 4 Multi-Week Trajectory Diversity & Genre Fit', () => {
  it('contains 20 deterministic multi-week trajectories (5 learners × 4 weeks)', () => {
    expect(multiWeekTrajectoryFixtures.length).toBe(20)
    const learnerIds = new Set(multiWeekTrajectoryFixtures.map((f) => f.childId))
    expect(learnerIds.size).toBe(5)
  })

  it('validates that every expectedGenre adheres to ReadingGenreSchema', () => {
    for (const fixture of multiWeekTrajectoryFixtures) {
      const parsed = ReadingGenreSchema.safeParse(fixture.expectedGenre)
      expect(parsed.success).toBe(true)
    }
  })

  it('verifies that no learner experiences >2 consecutive weeks of identical genres without justification', () => {
    const learners = ['alex', 'bella', 'chris', 'diana', 'ethan']
    for (const childId of learners) {
      const weeks = multiWeekTrajectoryFixtures.filter((f) => f.childId === childId)
      for (let i = 1; i < weeks.length; i++) {
        const prev = weeks[i - 1]!
        const curr = weeks[i]!
        if (prev.expectedGenre === curr.expectedGenre) {
          expect(curr.rationaleZh).toMatch(/延續|進階|多步驟/)
        }
      }
    }
  })

  it('verifies deep situational immersion: no generic or superficial context keys', () => {
    for (const fixture of multiWeekTrajectoryFixtures) {
      expect(fixture.situationalContextKey).not.toContain('generic')
      expect(fixture.situationalContextKey.length).toBeGreaterThan(8)
      // Must contain a problem, guide, schedule, or meeting indicator
      expect(fixture.situationalContextKey).toMatch(
        /troubleshooting|rules|guide|schedule|announcement|interview|roster|summary|program|calibration|survival|debate|audit|meeting|strategy|timeline|bulletin|breakdown/
      )
    }
  })

  it('verifies that diversityCapsule matches previous week history', () => {
    const alexWeeks = multiWeekTrajectoryFixtures.filter((f) => f.childId === 'alex')
    expect(alexWeeks[0]!.diversityCapsule.recentGenres).toEqual([])
    expect(alexWeeks[1]!.diversityCapsule.recentGenres).toEqual(['dialogue'])
    expect(alexWeeks[2]!.diversityCapsule.recentGenres).toEqual(['notice', 'dialogue'])
    expect(alexWeeks[3]!.diversityCapsule.recentGenres).toEqual(['instructions', 'notice', 'dialogue'])
  })
})
