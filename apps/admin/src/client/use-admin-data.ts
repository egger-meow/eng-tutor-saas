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
  const [timeline, setTimeline] = useState<ChildWeekTimeline | null>(() => adminApi.getCachedTimeline())
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
      // Execute health check concurrently with tab query
      const healthPromise = refreshHealth()

      let tabPromise: Promise<void>
      switch (activeTab) {
        case 'overview': {
          tabPromise = adminApi.getOverview(qualityEra).then((res) => {
            setOverview(res)
          })
          break
        }
        case 'failures': {
          tabPromise = adminApi.getFailures(qualityEra).then((res) => {
            setFailures(res)
          })
          break
        }
        case 'feedback': {
          tabPromise = adminApi.getFeedback().then((res) => {
            setFeedback(res)
          })
          break
        }
        case 'product': {
          tabPromise = adminApi.getProductFeedback().then((res) => {
            setProductFeedback(res)
          })
          break
        }
        case 'timeline': {
          tabPromise = adminApi.getTimeline(timelineChildId || undefined, timelineWeek || undefined).then((res) => {
            setTimeline(res)
            // Auto-prefetch all other available children in background
            if (res.availableChildren && res.availableChildren.length > 0) {
              adminApi.prefetchAllChildren(res.availableChildren)
            }
          })
          break
        }
        case 'export': {
          tabPromise = adminApi.getAiExport(qualityEra).then((res) => {
            setAiExport(res)
          })
          break
        }
      }

      await Promise.all([healthPromise, tabPromise])
      setLastRefreshedAt(new Date().toLocaleTimeString('zh-TW', { hour12: false }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [activeTab, qualityEra, refreshHealth, timelineChildId, timelineWeek])

  // Instant Child Switching via Cache + Background Revalidation
  const selectChildTimeline = useCallback((childId: string, week?: string) => {
    const targetChildId = childId.trim()
    const targetWeek = typeof week === 'string' ? week.trim() : ''

    setTimelineChildId(targetChildId)
    if (typeof week === 'string') {
      setTimelineWeek(targetWeek)
    }

    // 1. Instant synchronous cache lookup (0ms render)
    const cached = adminApi.getCachedTimeline(targetChildId, targetWeek)
    if (cached) {
      setTimeline(cached)
      if (cached.availableChildren) {
        adminApi.prefetchAllChildren(cached.availableChildren)
      }
    }

    // 2. Silent background revalidation
    adminApi.getTimeline(targetChildId || undefined, targetWeek || undefined).then((fresh) => {
      setTimeline(fresh)
      if (fresh.availableChildren) {
        adminApi.prefetchAllChildren(fresh.availableChildren)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Only show full loading if we have no data for current tab
    const hasData = (
      (activeTab === 'overview' && overview) ||
      (activeTab === 'failures' && failures) ||
      (activeTab === 'feedback' && feedback) ||
      (activeTab === 'product' && productFeedback) ||
      (activeTab === 'timeline' && timeline) ||
      (activeTab === 'export' && aiExport)
    )
    if (!hasData) {
      setLoading(true)
    }
    refreshCurrentTab(false)
  }, [refreshCurrentTab, activeTab])

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
    selectChildTimeline,
    timelineChildId,
    setTimelineChildId,
    timelineWeek,
    setTimelineWeek,
    qualityEra,
    setQualityEra,
  }
}

