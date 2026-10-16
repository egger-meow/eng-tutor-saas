import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConversionFunnelData,
  FunnelChannelMetric,
  FunnelDeviceMetric,
  FunnelStepMetric,
  FunnelStepName,
  FunnelTrendPoint,
} from '../client/types.js'
import { AdminService } from './admin-service.js'

export type ReturningParentFunnelSummary = {
  detected: number
  additionalChildConfirmed: number
  pendingOnboardingDiscarded: number
  confirmationPercent: number
  discardPercent: number
}

export type ExtendedConversionFunnelData = ConversionFunnelData & {
  authCompletedCount: number
  returningParent: ReturningParentFunnelSummary
  childArchivedCount: number
}

const STEP_DEFS: Array<{ name: FunnelStepName; label: string; description: string }> = [
  { name: 'landing_view', label: '首頁瀏覽 (Landing View)', description: '新訪客進入紙屬英文公開首頁' },
  { name: 'sample_click', label: '範例查看 (Sample Click)', description: '新訪客點擊教材範例或下載預覽 PDF' },
  { name: 'free_trial_click', label: '點擊體驗 (CTA Click)', description: '新訪客點擊免費體驗或立即開始按鈕' },
  { name: 'child_form_start', label: '開始填寫孩子資料 (Form Start)', description: '開始 Landing-first 孩子資料流程' },
  { name: 'email_submit', label: '送出 Email (Email Submit)', description: '孩子資料填完後送出安全登入連結' },
  { name: 'child_created', label: '建立第一位孩子 (Child Created)', description: 'Email 送出後由可信任伺服器流程建立第一位孩子' },
  { name: 'onboarding_complete', label: '完成第一週設定 (Onboarded)', description: '第一位孩子完成個人化學習資料設定；此步驟是新客 acquisition KPI' },
]

const ACQUISITION_EVENT_NAMES = new Set<string>([
  ...STEP_DEFS.map((step) => step.name),
  'auth_complete',
])

function visitorId(event: any): string {
  return String(event.anonymous_id || event.user_id || event.id || '')
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function splitLandingVisits(events: any[]): { acquisitionEvents: any[]; returningVisitEvents: any[] } {
  const byVisitor = new Map<string, any[]>()
  for (const event of events) {
    const id = visitorId(event)
    if (!id) continue
    byVisitor.set(id, [...(byVisitor.get(id) || []), event])
  }

  const acquisitionEvents: any[] = []
  const returningVisitEvents: any[] = []

  for (const visitorEvents of byVisitor.values()) {
    const ordered = visitorEvents.slice().sort((left, right) => {
      const timeOrder = String(left.created_at || '').localeCompare(String(right.created_at || ''))
      return timeOrder !== 0 ? timeOrder : String(left.id || '').localeCompare(String(right.id || ''))
    })

    let visit: any[] = []
    const flushVisit = () => {
      if (visit.length === 0) return
      const isReturningVisit = visit.some((event) => event.event_name === 'existing_parent_detected')
      if (isReturningVisit) {
        returningVisitEvents.push(...visit)
      } else {
        acquisitionEvents.push(...visit.filter((event) => ACQUISITION_EVENT_NAMES.has(String(event.event_name))))
      }
      visit = []
    }

    for (const event of ordered) {
      if (event.event_name === 'landing_view' && visit.length > 0) flushVisit()
      visit.push(event)
    }
    flushVisit()
  }

  return { acquisitionEvents, returningVisitEvents }
}

function buildStepMetrics(events: any[]): { steps: FunnelStepMetric[]; uniqueLandingVisitors: number; biggestDropOff: ConversionFunnelData['biggestDropOff']; overallConversionPercent: number } {
  const byStep = new Map<FunnelStepName, any[]>(STEP_DEFS.map((step) => [step.name, []]))
  for (const event of events) {
    const list = byStep.get(event.event_name as FunnelStepName)
    if (list) list.push(event)
  }

  const landingEvents = byStep.get('landing_view') || []
  const uniqueLandingVisitors = new Set(landingEvents.map(visitorId).filter(Boolean)).size

  const uniqueByStep = new Map<FunnelStepName, number>()
  for (const def of STEP_DEFS) {
    const stepEvents = byStep.get(def.name) || []
    uniqueByStep.set(def.name, new Set(stepEvents.map(visitorId).filter(Boolean)).size)
  }

  const steps = STEP_DEFS.map((definition) => {
    const stepEvents = byStep.get(definition.name) || []
    const uniqueVisitors = uniqueByStep.get(definition.name) || 0

    let previousUnique = 0
    if (definition.name === 'landing_view') {
      previousUnique = 0
    } else if (definition.name === 'sample_click') {
      previousUnique = uniqueLandingVisitors
    } else if (definition.name === 'free_trial_click') {
      previousUnique = uniqueLandingVisitors
    } else if (definition.name === 'child_form_start') {
      previousUnique = uniqueByStep.get('free_trial_click') || 0
    } else if (definition.name === 'email_submit') {
      previousUnique = uniqueByStep.get('child_form_start') || 0
    } else if (definition.name === 'child_created') {
      previousUnique = uniqueByStep.get('email_submit') || 0
    } else if (definition.name === 'onboarding_complete') {
      previousUnique = uniqueByStep.get('child_created') || 0
    }

    const conversionFromPrevPercent = definition.name === 'landing_view'
      ? 100
      : previousUnique > 0
        ? round1((uniqueVisitors / previousUnique) * 100)
        : 0
    const conversionFromLandingPercent = uniqueLandingVisitors > 0
      ? round1((uniqueVisitors / uniqueLandingVisitors) * 100)
      : 0
    const dropOffCount = definition.name === 'landing_view'
      ? 0
      : Math.max(0, previousUnique - uniqueVisitors)
    const dropOffPercent = definition.name === 'landing_view' || previousUnique === 0
      ? 0
      : round1((dropOffCount / previousUnique) * 100)

    return {
      ...definition,
      count: stepEvents.length,
      uniqueVisitors,
      conversionFromPrevPercent,
      conversionFromLandingPercent,
      dropOffCount,
      dropOffPercent,
    }
  })

  // Core linear pipeline for real drop-off analysis:
  // landing_view -> free_trial_click -> child_form_start -> email_submit -> child_created -> onboarding_complete
  const coreStepNames: FunnelStepName[] = [
    'landing_view',
    'free_trial_click',
    'child_form_start',
    'email_submit',
    'child_created',
    'onboarding_complete',
  ]

  let biggestDropOff: ConversionFunnelData['biggestDropOff'] = null
  let maxDropCount = -1

  for (let i = 1; i < coreStepNames.length; i++) {
    const prevName = coreStepNames[i - 1]!
    const currName = coreStepNames[i]!
    const prevStep = steps.find((s) => s.name === prevName)!
    const currStep = steps.find((s) => s.name === currName)!

    const dropCount = Math.max(0, prevStep.uniqueVisitors - currStep.uniqueVisitors)
    const dropPercent = prevStep.uniqueVisitors > 0 ? round1((dropCount / prevStep.uniqueVisitors) * 100) : 0

    if (dropCount > maxDropCount && prevStep.uniqueVisitors > 0) {
      maxDropCount = dropCount
      biggestDropOff = {
        fromStep: prevStep.name,
        fromLabel: prevStep.label,
        toStep: currStep.name,
        toLabel: currStep.label,
        dropCount,
        dropPercent,
      }
    }
  }

  const onboardedUnique = steps.find((step) => step.name === 'onboarding_complete')?.uniqueVisitors ?? 0
  return {
    steps,
    uniqueLandingVisitors,
    biggestDropOff,
    overallConversionPercent: uniqueLandingVisitors > 0 ? round1((onboardedUnique / uniqueLandingVisitors) * 100) : 0,
  }
}

function classifyChannel(event: any): FunnelChannelMetric['channel'] {
  const src = String(event.utm_source || '').toLowerCase()
  const ref = String(event.referrer || '').toLowerCase()
  if (src.includes('fb') || src.includes('facebook') || src.includes('instagram') || src.includes('meta') || src === 'ig' || ref.includes('facebook.com') || ref.includes('fb.me') || ref.includes('instagram.com')) return 'facebook'
  if (src.includes('google') || src.includes('search') || src.includes('bing') || src.includes('yahoo') || ref.includes('google.com') || ref.includes('bing.com') || ref.includes('yahoo.com')) return 'google'
  if (!event.utm_source && !event.referrer) return 'direct'
  return 'other'
}

function buildChannels(events: any[]): FunnelChannelMetric[] {
  const buckets = {
    facebook: { landing: new Set<string>(), auth: new Set<string>(), created: new Set<string>(), onboarded: new Set<string>() },
    direct: { landing: new Set<string>(), auth: new Set<string>(), created: new Set<string>(), onboarded: new Set<string>() },
    google: { landing: new Set<string>(), auth: new Set<string>(), created: new Set<string>(), onboarded: new Set<string>() },
    other: { landing: new Set<string>(), auth: new Set<string>(), created: new Set<string>(), onboarded: new Set<string>() },
  }
  for (const event of events) {
    const channel = classifyChannel(event)
    const id = visitorId(event)
    if (!id) continue
    if (event.event_name === 'landing_view') buckets[channel].landing.add(id)
    if (event.event_name === 'auth_complete') buckets[channel].auth.add(id)
    if (event.event_name === 'child_created') buckets[channel].created.add(id)
    if (event.event_name === 'onboarding_complete') buckets[channel].onboarded.add(id)
  }
  const labels = { facebook: 'Facebook / Meta 廣告與社群', direct: '直接流量 (Direct)', google: 'Google / 搜尋引擎 (Search)', other: '其他來源與 UTM 標記' }
  return (['facebook', 'direct', 'google', 'other'] as const).map((channel) => ({
    channel,
    label: labels[channel],
    landingViews: buckets[channel].landing.size,
    authCompleted: buckets[channel].auth.size,
    childrenCreated: buckets[channel].created.size,
    onboarded: buckets[channel].onboarded.size,
    conversionPercent: buckets[channel].landing.size > 0 ? round1((buckets[channel].onboarded.size / buckets[channel].landing.size) * 100) : 0,
  }))
}

function buildDevices(events: any[]): FunnelDeviceMetric[] {
  const counts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 }
  for (const event of events) {
    const device = event.device_class in counts ? event.device_class as keyof typeof counts : 'unknown'
    counts[device] += 1
  }
  const total = events.length || 1
  const labels = { mobile: '行動手機 (Mobile)', desktop: '桌上型電腦 (Desktop)', tablet: '平板 (Tablet)', unknown: '未知/其他' }
  return (['mobile', 'desktop', 'tablet', 'unknown'] as const).map((device) => ({ device, label: labels[device], count: counts[device], percent: round1((counts[device] / total) * 100) }))
}

function buildTrends(events: any[], days: number): FunnelTrendPoint[] {
  const map = new Map<string, FunnelTrendPoint>()
  for (const event of events) {
    const date = days === 1 ? `${String(event.created_at).slice(0, 13)}:00` : String(event.created_at).slice(0, 10)
    if (!map.has(date)) map.set(date, { date, landing_view: 0, sample_click: 0, free_trial_click: 0, email_submit: 0, auth_complete: 0, child_form_start: 0, child_created: 0, onboarding_complete: 0 })
    const point = map.get(date)!
    if (event.event_name in point && event.event_name !== 'date') {
      const key = event.event_name as FunnelStepName
      point[key] += 1
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export class LandingFunnelAdminService extends AdminService {
  public override async getConversionFunnelData(rangeDays = 7): Promise<ExtendedConversionFunnelData> {
    const base = await super.getConversionFunnelData(rangeDays)
    const client = (this as unknown as { client: SupabaseClient | null }).client
    if (!client) {
      return {
        ...base,
        authCompletedCount: 0,
        returningParent: { detected: 0, additionalChildConfirmed: 0, pendingOnboardingDiscarded: 0, confirmationPercent: 0, discardPercent: 0 },
        childArchivedCount: 0,
      }
    }

    const PAGE_SIZE = 1000
    const rawEvents: any[] = []
    let offset = 0
    let eventError: any = null

    while (offset < 50000) {
      const query = client
        .from('funnel_events')
        .select('*')
        .gte('created_at', base.startDate)
        .order('created_at', { ascending: true })

      if (typeof query.range === 'function') {
        const { data: batch, error } = await query.range(offset, offset + PAGE_SIZE - 1)
        if (error) {
          eventError = error
          break
        }
        const rows = (batch || []) as any[]
        rawEvents.push(...rows)
        if (rows.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      } else {
        const { data: batch, error } = await query.limit(50000)
        if (error) {
          eventError = error
        } else {
          rawEvents.push(...(batch || []))
        }
        break
      }
    }

    const { data: rawChildren, error: childError } = await client
      .from('children')
      .select('id, parent_id, is_internal_test')
    if (eventError || childError) {
      return {
        ...base,
        authCompletedCount: 0,
        returningParent: { detected: 0, additionalChildConfirmed: 0, pendingOnboardingDiscarded: 0, confirmationPercent: 0, discardPercent: 0 },
        childArchivedCount: 0,
      }
    }

    const children = (rawChildren || []) as any[]
    const internalChildIds = new Set(children.filter((child) => child.is_internal_test).map((child) => child.id))
    const internalUserIds = new Set(children.filter((child) => child.is_internal_test && child.parent_id).map((child) => child.parent_id))
    const events = ((rawEvents || []) as any[]).filter((event) => {
      if (event.child_id && internalChildIds.has(event.child_id)) return false
      if (event.user_id && internalUserIds.has(event.user_id)) return false
      return !event.metadata?.is_internal && !event.metadata?.test_mode
    })

    const { acquisitionEvents } = splitLandingVisits(events)
    const acquisitionStepEvents = acquisitionEvents.filter((event) => event.event_name !== 'auth_complete')
    const firstChild = buildStepMetrics(acquisitionStepEvents)
    const authCompletedCount = new Set(
      acquisitionEvents
        .filter((event) => event.event_name === 'auth_complete')
        .map(visitorId)
        .filter(Boolean),
    ).size

    const detected = new Set(events.filter((event) => event.event_name === 'existing_parent_detected').map(visitorId).filter(Boolean)).size
    const additionalChildConfirmed = new Set(events.filter((event) => event.event_name === 'additional_child_confirmed').map(visitorId).filter(Boolean)).size
    const pendingOnboardingDiscarded = new Set(events.filter((event) => event.event_name === 'pending_onboarding_discarded').map(visitorId).filter(Boolean)).size
    const archivedChildIds = new Set(events.filter((event) => event.event_name === 'child_archived').map((event) => String(event.child_id || visitorId(event))).filter(Boolean))

    return {
      ...base,
      totalEvents: events.length,
      uniqueLandingVisitors: firstChild.uniqueLandingVisitors,
      steps: firstChild.steps,
      overallConversionPercent: firstChild.overallConversionPercent,
      biggestDropOff: firstChild.biggestDropOff,
      authCompletedCount,
      channels: buildChannels(acquisitionEvents),
      devices: buildDevices(acquisitionStepEvents),
      trends: buildTrends(acquisitionEvents, base.rangeDays),
      returningParent: {
        detected,
        additionalChildConfirmed,
        pendingOnboardingDiscarded,
        confirmationPercent: detected > 0 ? round1((additionalChildConfirmed / detected) * 100) : 0,
        discardPercent: detected > 0 ? round1((pendingOnboardingDiscarded / detected) * 100) : 0,
      },
      childArchivedCount: archivedChildIds.size,
    }
  }
}
