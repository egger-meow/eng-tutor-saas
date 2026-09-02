import { getSupabaseClient } from './supabase'

export type FunnelEventName =
  | 'landing_view'
  | 'sample_click'
  | 'free_trial_click'
  | 'email_submit'
  | 'auth_complete'
  | 'child_form_start'
  | 'child_created'
  | 'onboarding_complete'
  | 'existing_parent_detected'
  | 'additional_child_confirmed'
  | 'pending_onboarding_discarded'
  | 'child_archived'

export type DeviceClass = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface AttributionContext {
  anonymousId: string
  path: string
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  deviceClass: DeviceClass
}

const AID_STORAGE_KEY = 'paper_analytics_aid'
const INITIAL_ATTRIBUTION_KEY = 'paper_analytics_initial_attribution'
const RECENT_EVENTS_WINDOW_MS = 2500

const inMemoryStore = new Map<string, string>()
const recentEvents = new Map<string, number>()

export function clearInMemoryAnalyticsStore(): void {
  inMemoryStore.clear()
  recentEvents.clear()
}

function getStorageSafe(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storage = window.localStorage
      const testKey = '__test_local_storage__'
      storage.setItem(testKey, '1')
      storage.removeItem(testKey)
      return storage
    }
  } catch {}
  return {
    getItem: (k: string) => inMemoryStore.get(k) ?? null,
    setItem: (k: string, v: string) => { inMemoryStore.set(k, v) },
  }
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getAnonymousId(overrideUrlSearch?: string): string {
  const storage = getStorageSafe()

  try {
    let search = overrideUrlSearch
    if (search === undefined && typeof window !== 'undefined' && window.location) {
      search = window.location.search
    }
    if (search) {
      const searchParams = new URLSearchParams(search)
      const aidParam = searchParams.get('aid')?.trim()
      if (aidParam && aidParam.length <= 64) {
        storage.setItem(AID_STORAGE_KEY, aidParam)
        return aidParam
      }
    }

    const stored = storage.getItem(AID_STORAGE_KEY)?.trim()
    if (stored && stored.length <= 64) {
      return stored
    }

    const newId = generateUuid()
    storage.setItem(AID_STORAGE_KEY, newId)
    return newId
  } catch {
    return 'fallback_' + generateUuid().slice(0, 16)
  }
}

export function deriveDeviceClass(overrideUa?: string, overrideWidth?: number): DeviceClass {
  const ua = (overrideUa !== undefined ? overrideUa : (typeof navigator !== 'undefined' ? navigator.userAgent : '')).toLowerCase()
  const width = overrideWidth !== undefined ? overrideWidth : (typeof window !== 'undefined' ? window.innerWidth : 1024)
  const isTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window))

  if (!ua && typeof window === 'undefined') return 'unknown'

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua) || (isTouch && width >= 768 && width <= 1024)) {
    return 'tablet'
  }
  if (/iphone|ipod|android.*mobile|windows phone|mobile/i.test(ua) || (isTouch && width < 768)) {
    return 'mobile'
  }
  return 'desktop'
}

interface StoredAttribution {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  referrer: string | null
}

function getStoredInitialAttribution(): StoredAttribution | null {
  const storage = getStorageSafe()
  try {
    const raw = storage.getItem(INITIAL_ATTRIBUTION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredAttribution
  } catch {
    return null
  }
}

function saveInitialAttribution(attr: StoredAttribution): void {
  const storage = getStorageSafe()
  try {
    if (!storage.getItem(INITIAL_ATTRIBUTION_KEY)) {
      storage.setItem(INITIAL_ATTRIBUTION_KEY, JSON.stringify(attr))
    }
  } catch {}
}

export function getAttributionContext(overrideSearch?: string, overrideReferrer?: string): AttributionContext {
  const anonymousId = getAnonymousId(overrideSearch)
  const path = typeof window !== 'undefined' && window.location ? window.location.pathname || '/' : '/'
  const searchStr = overrideSearch !== undefined ? overrideSearch : (typeof window !== 'undefined' && window.location ? window.location.search : '')
  const searchParams = new URLSearchParams(searchStr)
  const currentReferrer = overrideReferrer !== undefined ? overrideReferrer : (typeof document !== 'undefined' ? document.referrer || null : null)

  const currentUtmSource = searchParams.get('utm_source')?.trim() || null
  const currentUtmMedium = searchParams.get('utm_medium')?.trim() || null
  const currentUtmCampaign = searchParams.get('utm_campaign')?.trim() || null
  const currentUtmContent = searchParams.get('utm_content')?.trim() || null

  if (currentUtmSource || currentReferrer) {
    saveInitialAttribution({
      utmSource: currentUtmSource,
      utmMedium: currentUtmMedium,
      utmCampaign: currentUtmCampaign,
      utmContent: currentUtmContent,
      referrer: currentReferrer,
    })
  }

  const initial = getStoredInitialAttribution()

  return {
    anonymousId,
    path,
    referrer: currentReferrer || initial?.referrer || null,
    utmSource: currentUtmSource || initial?.utmSource || null,
    utmMedium: currentUtmMedium || initial?.utmMedium || null,
    utmCampaign: currentUtmCampaign || initial?.utmCampaign || null,
    utmContent: currentUtmContent || initial?.utmContent || null,
    deviceClass: deriveDeviceClass(),
  }
}

export interface TrackFunnelOptions {
  path?: string
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  childId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  force?: boolean
}

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  options: TrackFunnelOptions = {},
): Promise<string | null> {
  try {
    const attr = getAttributionContext()
    const path = options.path || attr.path
    const now = Date.now()

    const dedupeKey = `${eventName}:${path}:${attr.anonymousId}:${options.childId || ''}`
    if (!options.force) {
      const lastFired = recentEvents.get(dedupeKey)
      if (lastFired && now - lastFired < RECENT_EVENTS_WINDOW_MS) {
        return null
      }
    }
    recentEvents.set(dedupeKey, now)

    for (const [key, timestamp] of recentEvents.entries()) {
      if (now - timestamp > 10000) {
        recentEvents.delete(key)
      }
    }

    const client = getSupabaseClient()
    const payload = {
      p_event_name: eventName,
      p_anonymous_id: attr.anonymousId,
      p_path: path,
      p_referrer: options.referrer !== undefined ? options.referrer : attr.referrer,
      p_utm_source: options.utmSource !== undefined ? options.utmSource : attr.utmSource,
      p_utm_medium: options.utmMedium !== undefined ? options.utmMedium : attr.utmMedium,
      p_utm_campaign: options.utmCampaign !== undefined ? options.utmCampaign : attr.utmCampaign,
      p_utm_content: options.utmContent !== undefined ? options.utmContent : attr.utmContent,
      p_device_class: attr.deviceClass,
      p_metadata: options.metadata || {},
      p_session_id: options.sessionId || null,
      p_child_id: options.childId || null,
    }

    const { data, error } = await client.rpc('record_funnel_event', payload)
    if (error) {
      if (import.meta.env?.DEV) {
        console.warn('[Analytics] record_funnel_event error:', error.message)
      }
      return null
    }

    return (data as string) || null
  } catch (caught) {
    if (import.meta.env?.DEV) {
      console.warn('[Analytics] trackFunnelEvent exception:', caught)
    }
    return null
  }
}

export function trackLandingView(metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('landing_view', { metadata })
}

export function trackSampleClick(sampleName: string, metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('sample_click', {
    metadata: { sample_name: sampleName, ...metadata },
    force: true,
  })
}

export function trackFreeTrialClick(ctaLocation: string, metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('free_trial_click', {
    metadata: { cta_location: ctaLocation, ...metadata },
    force: true,
  })
}

export function trackEmailSubmit(metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('email_submit', { metadata, force: true })
}

export function trackAuthComplete(metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('auth_complete', { metadata })
}

export function trackChildFormStart(metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('child_form_start', { metadata })
}

export function trackChildCreated(childId: string, metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('child_created', { childId, metadata, force: true })
}

export function trackOnboardingComplete(childId: string, metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('onboarding_complete', { childId, metadata, force: true })
}

export function trackExistingParentDetected(metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('existing_parent_detected', { metadata, force: true })
}

export function trackAdditionalChildConfirmed(childId: string, metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('additional_child_confirmed', { childId, metadata, force: true })
}

export function trackPendingOnboardingDiscarded(metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('pending_onboarding_discarded', { metadata, force: true })
}

export function trackChildArchived(childId: string, metadata?: Record<string, unknown>): void {
  void trackFunnelEvent('child_archived', { childId, metadata, force: true })
}
