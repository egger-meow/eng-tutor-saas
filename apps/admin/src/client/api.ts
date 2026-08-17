import type {
  OperationsOverview,
  FailureIntelligence,
  ParentFeedbackIntelligence,
  ProductFeedbackIntelligence,
  ChildWeekTimeline,
  AiExportDataset,
  HealthState,
  GrantRetryResult,
} from './types.js'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const errorText = await res.text()
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

export const adminApi = {
  getHealth: () => fetchJson<HealthState>('/api/health'),
  getOverview: () => fetchJson<OperationsOverview>('/api/operations/overview'),
  getFailures: () => fetchJson<FailureIntelligence>('/api/intelligence/failures'),
  getFeedback: () => fetchJson<ParentFeedbackIntelligence>('/api/intelligence/feedback'),
  getProductFeedback: () => fetchJson<ProductFeedbackIntelligence>('/api/intelligence/product-feedback'),
  getTimeline: (childId?: string, week?: string) => {
    const params = new URLSearchParams()
    if (childId) params.append('childId', childId)
    if (week) params.append('week', week)
    const qs = params.toString()
    return fetchJson<ChildWeekTimeline>(`/api/timeline${qs ? `?${qs}` : ''}`)
  },
  getAiExport: () => fetchJson<AiExportDataset>('/api/export/ai-dataset'),
  grantJobRetry: (jobId: string) => postJson<GrantRetryResult>('/api/jobs/grant-retry', { jobId }),
}
