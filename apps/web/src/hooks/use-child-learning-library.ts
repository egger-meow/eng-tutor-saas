import { useCallback, useEffect, useState } from 'react'
import { fetchLearningSummary, fetchLearningTimeline, type LearningLibrarySummary, type LearningTimelineItem } from '../lib/learning-library'

const cache = new Map<string, { summary: LearningLibrarySummary; timeline: LearningTimelineItem[] }>()

export function useChildLearningLibrary(childId: string, enabled = true) {
  const cached = cache.get(childId)
  const [summary, setSummary] = useState<LearningLibrarySummary | null>(cached?.summary ?? null)
  const [timeline, setTimeline] = useState<LearningTimelineItem[]>(cached?.timeline ?? [])
  const [loading, setLoading] = useState(enabled && !cached)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true); setError('')
    try {
      const [nextSummary, nextTimeline] = await Promise.all([fetchLearningSummary(childId), fetchLearningTimeline(childId)])
      cache.set(childId, { summary: nextSummary, timeline: nextTimeline })
      setSummary(nextSummary); setTimeline(nextTimeline)
    } catch (caught) { setError(caught instanceof Error ? caught.message : '無法讀取學習歷程。') }
    finally { setLoading(false) }
  }, [childId, enabled])

  useEffect(() => { if (enabled && !cache.has(childId)) void load() }, [childId, enabled, load])

  const loadMore = useCallback(async () => {
    const cursor = timeline.at(-1)?.sequenceNumber
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchLearningTimeline(childId, cursor)
      setTimeline((current) => [...current, ...page.filter((item) => !current.some((old) => old.sequenceNumber === item.sequenceNumber))])
    } catch (caught) { setError(caught instanceof Error ? caught.message : '無法讀取更多學習歷程。') }
    finally { setLoadingMore(false) }
  }, [childId, loadingMore, timeline])

  return { summary, timeline, loading, loadingMore, error, reload: load, loadMore }
}
