import { useEffect, useRef, useState } from 'react'
import { readOwnedWeek1Progress, type Week1Progress } from '../../lib/week1-progress'
import { Week1FastProgress } from './Week1FastProgress'

export function OwnedWeek1FastProgress({ childId, onReady }: { childId: string; onReady: () => void }) {
  const [progress, setProgress] = useState<Week1Progress | null>({
    stage: 'queued',
    stageUpdatedAt: null,
    ready: false,
  })
  const readyNotified = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null
    let inFlight = false

    const poll = async () => {
      if (cancelled || inFlight || document.hidden) return
      inFlight = true
      try {
        const next = await readOwnedWeek1Progress(childId)
        if (!cancelled && next) {
          setProgress(next)
          if (next.ready && !readyNotified.current) {
            readyNotified.current = true
            onReady()
            return
          }
        }
      } finally {
        inFlight = false
      }
      if (!cancelled) timer = window.setTimeout(poll, 3000)
    }

    void poll()
    const onVisibility = () => {
      if (!document.hidden && !cancelled) void poll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [childId, onReady])

  return <Week1FastProgress progress={progress} />
}
