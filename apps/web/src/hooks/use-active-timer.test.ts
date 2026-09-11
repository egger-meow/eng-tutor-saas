import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ActiveItemTimer } from './use-active-timer'

describe('ActiveItemTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('accumulates active time when item is presented', () => {
    const timer = new ActiveItemTimer('item_01', true)

    vi.advanceTimersByTime(2500)

    expect(timer.getActiveMs()).toBe(2500)
  })

  it('pauses accumulation when document becomes hidden and resumes when visible', () => {
    const timer = new ActiveItemTimer('item_01', true)

    // Active for 1000ms
    vi.advanceTimersByTime(1000)
    expect(timer.getActiveMs()).toBe(1000)

    // Tab hidden
    timer.handleVisibilityChange(true)

    // Advance 5000ms while tab is hidden
    vi.advanceTimersByTime(5000)
    // Elapsed time should still be 1000ms
    expect(timer.getActiveMs()).toBe(1000)

    // Tab visible again
    timer.handleVisibilityChange(false)

    // Active for another 1500ms
    vi.advanceTimersByTime(1500)
    expect(timer.getActiveMs()).toBe(2500)
  })

  it('resets timing when item changes', () => {
    const timer = new ActiveItemTimer('item_01', true)

    vi.advanceTimersByTime(3000)
    expect(timer.getActiveMs()).toBe(3000)

    // Switch to item_02
    timer.setItem('item_02', true)

    // Immediately after switch, elapsed time is 0
    expect(timer.getActiveMs()).toBe(0)

    vi.advanceTimersByTime(1200)
    expect(timer.getActiveMs()).toBe(1200)
  })

  it('explicit reset sets elapsed time back to 0', () => {
    const timer = new ActiveItemTimer('item_01', true)

    vi.advanceTimersByTime(4000)
    expect(timer.getActiveMs()).toBe(4000)

    timer.reset()
    expect(timer.getActiveMs()).toBe(0)

    vi.advanceTimersByTime(500)
    expect(timer.getActiveMs()).toBe(500)
  })
})
