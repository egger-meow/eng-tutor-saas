import { useCallback, useEffect, useState } from 'react'
import { adminApi } from './api.js'
import type {
  OperationsOverview,
  FailureIntelligence,
  ParentFeedbackIntelligence,
  ProductFeedbackIntelligence,
  ChildWeekTimeline,
  AiExportDataset,
  HealthState,
  TabId,
  QualityEra,
} from './types.js'

export function useAdminData(activeTab: TabId, refreshIntervalSec = 30) {
  const [health, setHealth] = useState<HealthState | null>(null)
  const [overview, setOverview] = useState<OperationsOverview | null>(null)
  const [failures, setFailures] = useState<FailureIntelligence | null>(null)
  const [feedback, setFeedback] = useState<ParentFeedbackIntelligence | null>(null)
  const [productFeedback, setProductFeedback] = useState<ProductFeedbackIntelligence | null>(null)
  const [timeline, setTimeline] = useState<ChildWeekTimeline | null>(null)
  const [aiExport, setAiExport] = useState<AiExportDataset | null>(null)

  const [loading, setLoading] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Timeline query params
  const [timelineChildId, setTimelineChildId] = useState<string>('')
  const [timelineWeek, setTimelineWeek] = useState<string>('')

  const [qualityEra, setQualityEra] = useState<QualityEra>('current')

  const refreshHealth = useCallback(async () => {
    try {
      const h = await adminApi.getHealth()
      setHealth(h)
    } catch (e) {
      console.error('Health check failed', e)
    }
  }, [])

  const refreshCurrentTab = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true)
    setError(null)
    try {
      await refreshHealth()
      switch (activeTab) {
        case 'overview': {
          const res = await adminApi.getOverview(qualityEra)
          setOverview(res)
          break
        }
        case 'failures': {
          const res = await adminApi.getFailures(qualityEra)
          setFailures(res)
          break
        }
        case 'feedback': {
          const res = await adminApi.getFeedback()
          setFeedback(res)
          break
        }
        case 'product': {
          const res = await adminApi.getProductFeedback()
          setProductFeedback(res)
          break
        }
        case 'timeline': {
          const res = await adminApi.getTimeline(timelineChildId || undefined, timelineWeek || undefined)
          setTimeline(res)
          break
        }
        case 'export': {
          const res = await adminApi.getAiExport(qualityEra)
          setAiExport(res)
          break
        }
      }
      setLastRefreshedAt(new Date().toLocaleTimeString('zh-TW', { hour12: false }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [activeTab, qualityEra, refreshHealth, timelineChildId, timelineWeek])

  useEffect(() => {
    setLoading(true)
    refreshCurrentTab(false)
  }, [refreshCurrentTab])

  // Periodic background refresh
  useEffect(() => {
    if (refreshIntervalSec <= 0) return
    const timer = setInterval(() => {
      refreshCurrentTab(true)
    }, refreshIntervalSec * 1000)
    return () => clearInterval(timer)
  }, [refreshCurrentTab, refreshIntervalSec])

  return {
    health,
    overview,
    failures,
    feedback,
    productFeedback,
    timeline,
    aiExport,
    loading,
    isRefreshing,
    error,
    lastRefreshedAt,
    refreshCurrentTab,
    timelineChildId,
    setTimelineChildId,
    timelineWeek,
    setTimelineWeek,
    qualityEra,
    setQualityEra,
  }
}
