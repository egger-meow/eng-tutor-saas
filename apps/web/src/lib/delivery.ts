import type { Child } from './children'
import type { Material } from './materials'

export type DeliveryViewModel = {
  nextDeliveryAt: Date | null
  feedbackCutoffAt: Date | null
  feedbackState: 'received' | 'open' | 'closed' | 'waiting'
  headline: string
  detail: string
}

const day = 24 * 60 * 60 * 1000

export function formatTaipeiDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function getDeliveryViewModel(
  child: Child | null,
  currentMaterial: Material | null,
  nextPreparedMaterial?: Material | null | Date,
  nextJobReleaseAtOrNow?: string | null | Date,
  nowInput?: Date,
  hasPastDueJobInput?: boolean,
): DeliveryViewModel {
  let nextPrepared: Material | null = null
  let nextJobReleaseAt: string | null = null
  let now = new Date()
  let hasPastDueJob = typeof hasPastDueJobInput === 'boolean'
    ? hasPastDueJobInput
    : Boolean((child as { has_past_due_job?: boolean } | null)?.has_past_due_job)

  if (nextPreparedMaterial instanceof Date) {
    now = nextPreparedMaterial
    nextPrepared = null
  } else {
    nextPrepared = nextPreparedMaterial ?? null
  }

  if (nextJobReleaseAtOrNow instanceof Date) {
    now = nextJobReleaseAtOrNow
  } else if (typeof nextJobReleaseAtOrNow === 'string') {
    nextJobReleaseAt = nextJobReleaseAtOrNow
  }

  if (nowInput instanceof Date) {
    now = nowInput
  }

  // Precedence 1: An unreleased prepared material has an authoritative release_at timestamp
  if (nextPrepared?.release_at) {
    const releaseAt = new Date(nextPrepared.release_at)
    if (!Number.isNaN(releaseAt.getTime())) {
      const isPreWeek1 = !currentMaterial
      const feedbackReceived = Boolean(currentMaterial?.feedback)
      return {
        nextDeliveryAt: releaseAt,
        feedbackCutoffAt: null,
        feedbackState: feedbackReceived ? 'received' : 'waiting',
        headline: isPreWeek1
          ? `第一份教材將於 ${formatTaipeiDate(releaseAt)} 開放下載`
          : `預計 ${formatTaipeiDate(releaseAt)} 開放下一份教材`,
        detail: feedbackReceived
          ? '本週回饋已收到。'
          : isPreWeek1
            ? '內容已先完成準備，到了開放日期即可下載。'
            : '隨時填寫本週回饋，我們會接續安排在後續教材。',
      }
    }
  }

  // Precedence 2: The canonical next release timestamp from the owned generation_job record
  if (nextJobReleaseAt) {
    const releaseAt = new Date(nextJobReleaseAt)
    if (!Number.isNaN(releaseAt.getTime())) {
      const isPreWeek1 = !currentMaterial

      // Stale-date fallback: if the expected delivery has already passed
      // but no material exists (quality rejection or delayed authoring),
      // show a truthful preparation state instead of a stale promise.
      if (releaseAt <= now && !currentMaterial && !nextPrepared) {
        return {
          nextDeliveryAt: null,
          feedbackCutoffAt: null,
          feedbackState: 'waiting',
          headline: '第一份教材準備中',
          detail: '教材正在完成最後檢查，準備完成後即可下載。',
        }
      }

      const feedbackCutoffAt = new Date(releaseAt.getTime() - (2 * day))
      const feedbackState = currentMaterial?.feedback
        ? 'received'
        : now < feedbackCutoffAt
          ? 'open'
          : 'closed'

      return {
        nextDeliveryAt: releaseAt,
        feedbackCutoffAt,
        feedbackState,
        headline: isPreWeek1
          ? `預計 ${formatTaipeiDate(releaseAt)} 交付第一份教材`
          : `預計 ${formatTaipeiDate(releaseAt)} 交付下一週教材`,
        detail: feedbackState === 'received'
          ? '本週回饋已收到。'
          : feedbackState === 'open'
            ? `請盡量在 ${formatTaipeiDate(feedbackCutoffAt)} 前填寫回饋。`
            : '回饋時間已截止；下一份教材仍會依照既有進度繼續準備。',
      }
    }
  }

  // Precedence 3: If neither a prepared material release_at nor an owned future generation_jobs.release_at
  // is available, distinguish whether a past-due unmaterialized job exists (under retry/preparation) vs no job at all.
  return {
    nextDeliveryAt: null,
    feedbackCutoffAt: null,
    feedbackState: currentMaterial?.feedback ? 'received' : 'waiting',
    headline: currentMaterial ? '下一份教材排程確認中' : '第一份教材準備中',
    detail: currentMaterial
      ? '排程確認後會在這裡顯示下一次交付日期。'
      : hasPastDueJob
        ? '教材正在完成最後檢查，準備完成後即可下載。'
        : '完成孩子資料後，我們會開始準備第一份教材。',
  }
}
