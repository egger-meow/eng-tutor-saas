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
  WaitlistData,
  SubscriptionRevenueData,
  ConversionFunnelData,
  AnnouncementsAdminData,
  AnnouncementStatus,
} from './types.js'

export function useAdminData(activeTab: TabId, refreshIntervalSec = 30) {
  const [health, setHealth] = useState<HealthState | null>(null)
  const [overview, setOverview] = useState<OperationsOverview | null>(null)
  const [funnel, setFunnel] = useState<ConversionFunnelData | null>(null)
  const [funnelRangeDays, setFunnelRangeDays] = useState(7)
  const [announcements, setAnnouncements] = useState<AnnouncementsAdminData | null>(null)

  const [announcementsFilter, setAnnouncementsFilter] = useState<AnnouncementStatus | 'all'>('all')
  const [failures, setFailures] = useState<FailureIntelligence | null>(null)
  const [feedback, setFeedback] = useState<ParentFeedbackIntelligence | null>(null)
  const [productFeedback, setProductFeedback] = useState<ProductFeedbackIntelligence | null>(null)
  const [timeline, setTimeline] = useState<ChildWeekTimeline | null>(() => adminApi.getCachedTimeline())
  const [aiExport, setAiExport] = useState<AiExportDataset | null>(null)
  const [waitlist, setWaitlist] = useState<WaitlistData | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionRevenueData | null>(null)
  const [subscriptionRangeDays, setSubscriptionRangeDays] = useState(90)

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
        case 'funnel': {
          tabPromise = adminApi.getFunnel(funnelRangeDays).then((res) => {
            setFunnel(res)
          })
          break
        }
        case 'subscriptions': {
          tabPromise = adminApi.getSubscriptions(subscriptionRangeDays).then((res) => {
            setSubscriptions(res)
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
        case 'waitlist': {
          tabPromise = adminApi.getWaitlist().then((res) => {
            setWaitlist(res)
          })
          break
        }
        case 'export': {
          tabPromise = adminApi.getAiExport(qualityEra).then((res) => {
            setAiExport(res)
          })
          break
        }
        case 'announcements': {
          tabPromise = adminApi.getAnnouncements(announcementsFilter).then((res) => {
            setAnnouncements(res)
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
  }, [activeTab, qualityEra, refreshHealth, timelineChildId, timelineWeek, subscriptionRangeDays, funnelRangeDays, announcementsFilter])

  // Instant Child Switching via Cache + Background Revalidation
  const selectChildTimeline = useCallback((childId: string, week?: string) => {
    const targetChildId = childId.trim()
    const targetWeek = typeof week === 'string' ? week.trim() : ''

    setTimelineChildId(targetChildId)
    setTimelineWeek(targetWeek)

    // Check fast cache first for zero-latency UI transition
    const cached = adminApi.getCachedTimeline(targetChildId, targetWeek)
    if (cached) {
      setTimeline(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    // Revalidate in background
    adminApi
      .getTimeline(targetChildId || undefined, targetWeek || undefined)
      .then((fresh) => {
        setTimeline(fresh)
      })
      .catch((err) => {
        if (!cached) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Proactive background prefetch for timeline on startup
  useEffect(() => {
    if (activeTab !== 'timeline' && !timeline) {
      adminApi.getTimeline().then((res) => {
        setTimeline((prev) => prev ?? res)
      }).catch(() => {})
    }
  }, [])

  // Trigger tab refresh on tab or era change
  useEffect(() => {
    // If switching to timeline tab and no state exists yet, immediately check cache
    if (activeTab === 'timeline' && !timeline) {
      const cached = adminApi.getCachedTimeline(timelineChildId || undefined, timelineWeek || undefined)
      if (cached) {
        setTimeline(cached)
      }
    }

    const hasData = Boolean(
      (activeTab === 'overview' && overview) ||
      (activeTab === 'funnel' && funnel) ||
      (activeTab === 'subscriptions' && subscriptions) ||
      (activeTab === 'failures' && failures) ||
      (activeTab === 'feedback' && feedback) ||
      (activeTab === 'product' && productFeedback) ||
      (activeTab === 'timeline' && (timeline || adminApi.getCachedTimeline(timelineChildId || undefined, timelineWeek || undefined))) ||
      (activeTab === 'waitlist' && waitlist) ||
      (activeTab === 'export' && aiExport) ||
      (activeTab === 'announcements' && announcements)
    )
    if (!hasData) {
      setLoading(true)
    }
    refreshCurrentTab(false)
  }, [refreshCurrentTab, activeTab, funnelRangeDays])

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
    funnel,
    funnelRangeDays,
    setFunnelRangeDays,
    subscriptions,
    subscriptionRangeDays,
    setSubscriptionRangeDays,
    failures,
    feedback,
    productFeedback,
    timeline,
    waitlist,
    aiExport,
    announcements,
    announcementsFilter,
    setAnnouncementsFilter,
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


