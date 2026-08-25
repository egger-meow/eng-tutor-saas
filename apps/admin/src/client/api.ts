import type {
  OperationsOverview,
  FailureIntelligence,
  ParentFeedbackIntelligence,
  ProductFeedbackIntelligence,
  ChildWeekTimeline,
  AiExportDataset,
  HealthState,
  GrantRetryResult,
  GenerationTestModeStatus,
  SetTestModeResult,
  AdvanceTestWeekResult,
  AdminTestFeedbackInput,
  RecordTestFeedbackResult,
  ResetTestChildResult,
  TestPdfSignedUrlResult,
  QualityEra,
  WaitlistData,
  RaiseCapacityAndReleaseResult,
  ReleaseWaitlistResult,
  UpdateCapacityResult,
  RetryNotificationResult,
  SubscriptionRevenueData,
  AnnouncementsAdminData,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementActionResult,
} from './types.js'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const errorText = await res.text()
    try {
      const parsed = JSON.parse(errorText)
      if (parsed && typeof parsed === 'object') {
        return parsed as T
      }
    } catch {}
    throw new Error(`API Error [${res.status}]: ${errorText}`)
  }
  return res.json() as Promise<T>
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    if (!res.ok) {
      throw new Error(`API Error [${res.status}]: ${text}`)
    }
    return {} as T
  }
}

// High-Performance In-Memory SWR Caches & In-Flight Request Deduplication
const timelineCache = new Map<string, { data: ChildWeekTimeline; timestamp: number }>()
const testModeCache = new Map<string, { data: GenerationTestModeStatus; timestamp: number }>()
const inFlightRequests = new Map<string, Promise<any>>()

function dedupeRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key)
  if (existing) return existing as Promise<T>
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key)
  })
  inFlightRequests.set(key, promise)
  return promise
}

export const adminApi = {
  getHealth: () => fetchJson<HealthState>('/api/health'),
  getOverview: (era?: QualityEra) => fetchJson<OperationsOverview>(`/api/operations/overview${era ? `?era=${era}` : ''}`),
  getFailures: (era?: QualityEra) => fetchJson<FailureIntelligence>(`/api/intelligence/failures${era ? `?era=${era}` : ''}`),
  getFeedback: () => fetchJson<ParentFeedbackIntelligence>('/api/intelligence/feedback'),
  getProductFeedback: () => fetchJson<ProductFeedbackIntelligence>('/api/intelligence/product-feedback'),
  getSubscriptions: (days = 90) => fetchJson<SubscriptionRevenueData>('/api/subscriptions?days=' + days),
  getAnnouncements: (status?: string) => fetchJson<AnnouncementsAdminData>(`/api/announcements${status && status !== 'all' ? `?status=${status}` : ''}`),
  createAnnouncement: (input: CreateAnnouncementInput) => postJson<AnnouncementActionResult>('/api/announcements/create', input as unknown as Record<string, unknown>),
  updateAnnouncement: (input: UpdateAnnouncementInput) => postJson<AnnouncementActionResult>('/api/announcements/update', input as unknown as Record<string, unknown>),
  archiveAnnouncement: (id: string) => postJson<AnnouncementActionResult>('/api/announcements/archive', { id }),

  // Fast Synchronous Cache Readers
  getCachedTimeline: (childId?: string, week?: string): ChildWeekTimeline | null => {
    const key = `${childId || ''}:${week || ''}`
    const entry = timelineCache.get(key)
    if (entry) return entry.data
    // Also check wildcard key if week is omitted
    if (!week && childId) {
      for (const [k, v] of timelineCache.entries()) {
        if (k.startsWith(`${childId}:`)) return v.data
      }
    }
    return null
  },

  getCachedTestModeStatus: (childId: string): GenerationTestModeStatus | null => {
    const entry = testModeCache.get(childId)
    return entry ? entry.data : null
  },

  setCachedTimeline: (data: ChildWeekTimeline) => {
    if (!data?.childId) return
    const key = `${data.childId}:${data.targetWeek || ''}`
    const defaultKey = `${data.childId}:`
    timelineCache.set(key, { data, timestamp: Date.now() })
    timelineCache.set(defaultKey, { data, timestamp: Date.now() })
    if (data.testModeStatus) {
      testModeCache.set(data.childId, { data: data.testModeStatus, timestamp: Date.now() })
    }
  },

  setCachedTestModeStatus: (childId: string, status: GenerationTestModeStatus) => {
    if (!childId || !status) return
    testModeCache.set(childId, { data: status, timestamp: Date.now() })
  },

  prefetchChildTimeline: async (childId: string, week?: string): Promise<ChildWeekTimeline | null> => {
    if (!childId) return null
    const key = `timeline:${childId}:${week || ''}`
    return dedupeRequest(key, async () => {
      const params = new URLSearchParams()
      params.append('childId', childId)
      if (week) params.append('week', week)
      const qs = params.toString()
      const data = await fetchJson<ChildWeekTimeline>(`/api/timeline?${qs}`)
      adminApi.setCachedTimeline(data)
      return data
    }).catch(() => null)
  },

  prefetchAllChildren: (children: Array<{ id: string }>) => {
    if (!Array.isArray(children)) return
    // Prefetch all children in background concurrently without blocking UI
    for (const c of children) {
      if (c?.id) {
        adminApi.prefetchChildTimeline(c.id)
      }
    }
  },

  getTimeline: (childId?: string, week?: string) => {
    const key = `timeline:${childId || ''}:${week || ''}`
    return dedupeRequest(key, async () => {
      const params = new URLSearchParams()
      if (childId) params.append('childId', childId)
      if (week) params.append('week', week)
      const qs = params.toString()
      const res = await fetchJson<ChildWeekTimeline>(`/api/timeline${qs ? `?${qs}` : ''}`)
      adminApi.setCachedTimeline(res)
      return res
    })
  },

  getAiExport: (era?: QualityEra) => fetchJson<AiExportDataset>(`/api/export/ai-dataset${era ? `?era=${era}` : ''}`),
  grantJobRetry: (jobId: string) => postJson<GrantRetryResult>('/api/jobs/grant-retry', { jobId }),

  // Generation Test Mode API
  getTestModeStatus: (childId: string) => {
    const key = `test-mode:${childId}`
    return dedupeRequest(key, async () => {
      const res = await fetchJson<GenerationTestModeStatus>(`/api/test-mode/status?childId=${encodeURIComponent(childId)}`)
      adminApi.setCachedTestModeStatus(childId, res)
      return res
    })
  },

  enableTestMode: async (childId: string, targetWeek = 9) => {
    const res = await postJson<SetTestModeResult>('/api/test-mode/enable', { childId, targetWeek })
    testModeCache.delete(childId)
    return res
  },

  disableTestMode: async (childId: string, force = false) => {
    const res = await postJson<SetTestModeResult>('/api/test-mode/disable', { childId, force })
    testModeCache.delete(childId)
    return res
  },

  advanceTestWeek: async (childId: string) => {
    const res = await postJson<AdvanceTestWeekResult>('/api/test-mode/advance', { childId })
    testModeCache.delete(childId)
    return res
  },

  recordTestFeedback: async (input: AdminTestFeedbackInput) => {
    const res = await postJson<RecordTestFeedbackResult>('/api/test-mode/feedback', input as unknown as Record<string, unknown>)
    testModeCache.delete(input.childId)
    return res
  },

  resetTestChildToOnboarding: async (childId: string) => {
    const res = await postJson<ResetTestChildResult>('/api/test-mode/reset', { childId, confirm: true })
    testModeCache.delete(childId)
    return res
  },

  getTestPdfSignedUrl: (childId: string, materialId: string, type: 'student' | 'parent') =>
    fetchJson<TestPdfSignedUrlResult>(
      `/api/test-mode/pdf-url?childId=${encodeURIComponent(childId)}&materialId=${encodeURIComponent(materialId)}&type=${type}`
    ),

  // Waitlist & Scaling Gate API
  getWaitlist: () => fetchJson<WaitlistData>('/api/waitlist'),
  raiseCapacityAndRelease: (newCapacity: number, releaseAll = true) =>
    postJson<RaiseCapacityAndReleaseResult>('/api/waitlist/raise-and-release', { newCapacity, releaseAll }),
  releaseWaitlistChildren: (childIds: string[]) =>
    postJson<ReleaseWaitlistResult>('/api/waitlist/release', { childIds }),
  updateCapacity: (capacity: number) =>
    postJson<UpdateCapacityResult>('/api/waitlist/capacity', { capacity }),
  retryFailedNotifications: () =>
    postJson<RetryNotificationResult>('/api/waitlist/retry-notifications', {}),
}

