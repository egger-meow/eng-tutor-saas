import { useCallback, useEffect, useRef } from 'react'

/**
 * Pure class for accurately tracking active learner response time per question item.
 */
export class ActiveItemTimer {
  private elapsedMs = 0
  private lastActiveTimestamp: number | null = null
  private currentItemId: string | null = null
  private isReady = false

  constructor(initialItemId: string | null = null, initialReady: boolean = true) {
    this.setItem(initialItemId, initialReady)
  }

  setItem(id: string | null, ready: boolean = true) {
    this.currentItemId = id
    this.isReady = ready
    this.elapsedMs = 0
    const isHidden = typeof document !== 'undefined' && Boolean(document.hidden)
    if (id && ready && !isHidden) {
      this.lastActiveTimestamp = Date.now()
    } else {
      this.lastActiveTimestamp = null
    }
  }

  handleVisibilityChange(hidden: boolean) {
    const now = Date.now()
    if (hidden) {
      if (this.lastActiveTimestamp !== null) {
        this.elapsedMs += Math.max(0, now - this.lastActiveTimestamp)
        this.lastActiveTimestamp = null
      }
    } else {
      if (this.currentItemId && this.isReady && this.lastActiveTimestamp === null) {
        this.lastActiveTimestamp = now
      }
    }
  }

  getActiveMs(): number {
    let total = this.elapsedMs
    if (this.lastActiveTimestamp !== null) {
      total += Math.max(0, Date.now() - this.lastActiveTimestamp)
    }
    return Math.round(total)
  }

  reset() {
    this.elapsedMs = 0
    const isHidden = typeof document !== 'undefined' && Boolean(document.hidden)
    if (this.currentItemId && this.isReady && !isHidden) {
      this.lastActiveTimestamp = Date.now()
    } else {
      this.lastActiveTimestamp = null
    }
  }
}

/**
 * Custom hook for accurately tracking active learner response time per question item.
 */
export function useActiveTimer(itemId: string | null, isReady: boolean = true) {
  const timerRef = useRef<ActiveItemTimer>(new ActiveItemTimer(itemId, isReady))

  useEffect(() => {
    timerRef.current.setItem(itemId, isReady)
  }, [itemId, isReady])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      timerRef.current.handleVisibilityChange(document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const getActiveMs = useCallback((): number => {
    return timerRef.current.getActiveMs()
  }, [])

  const resetTimer = useCallback(() => {
    timerRef.current.reset()
  }, [])

  return {
    getActiveMs,
    resetTimer,
  }
}
