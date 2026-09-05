import type { Child } from './children'
import type { Material } from './materials'
import type { SubscriptionView } from './subscriptions'

export type DeliveryAction = {
  label: string
  href: string
}

export type DeliveryViewModel = {
  nextDeliveryAt: Date | null
  feedbackCutoffAt: Date | null
  feedbackState: 'received' | 'open' | 'closed' | 'waiting'
  headline: string
  detail: string
  action?: DeliveryAction | null
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
  hasActiveGenerationFailureInput?: boolean,
): DeliveryViewModel {
  let nextPrepared: Material | null = null
  let nextJobReleaseAt: string | null = null
  let now = new Date()
  const hasPastDueJob = typeof hasPastDueJobInput === 'boolean'
    ? hasPastDueJobInput
    : Boolean((child as { has_past_due_job?: boolean } | null)?.has_past_due_job)
  const hasActiveGenerationFailure = typeof hasActiveGenerationFailureInput === 'boolean'
    ? hasActiveGenerationFailureInput
    : Boolean((child as { has_active_generation_failure?: boolean } | null)?.has_active_generation_failure)

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

  if (nowInput instanceof Date) now = nowInput

  const subscription = (child as { subscription?: SubscriptionView | null } | null)?.subscription

  if (currentMaterial && subscription !== undefined) {
    const isUnsubscribed = !subscription || subscription.status === 'trialing'
    const isCanceled = subscription?.status === 'canceled'
    const isPastDue = subscription?.status === 'past_due'
    const isPaused = subscription?.status === 'paused'
    const isCanceledAutoRenew = Boolean(subscription?.status === 'active' && subscription.cancelAtPeriodEnd)

    if (isUnsubscribed) {
      const releaseAt = nextPrepared?.release_at
        ? new Date(nextPrepared.release_at)
        : nextJobReleaseAt
          ? new Date(nextJobReleaseAt)
          : null
      const isPastRelease = releaseAt && releaseAt <= now
      const effectiveNextDeliveryAt = isPastRelease ? null : releaseAt
      const feedbackReceived = Boolean(currentMaterial.feedback)
      return {
        nextDeliveryAt: effectiveNextDeliveryAt,
        feedbackCutoffAt: effectiveNextDeliveryAt ? new Date(effectiveNextDeliveryAt.getTime() - (2 * day)) : null,
        feedbackState: feedbackReceived ? 'received' : 'open',
        headline: '需訂閱以開啟下一週教材',
        detail: feedbackReceived
          ? (effectiveNextDeliveryAt
              ? `本週回饋已收到！完成訂閱後，系統將依回饋於 ${formatTaipeiDate(effectiveNextDeliveryAt)} 交付下一份專屬教材。`
              : '本週回饋已收到！完成訂閱後，系統將依回饋為孩子準備下一份專屬教材。')
          : (effectiveNextDeliveryAt
              ? `第 1 週體驗教材已開放下載。完成訂閱後，系統將依回饋於 ${formatTaipeiDate(effectiveNextDeliveryAt)} 繼續為孩子準備專屬教材。`
              : '第 1 週體驗教材已開放下載。完成訂閱後，系統將依回饋為孩子準備下一份專屬教材。'),
        action: { label: '前往選擇方案訂閱', href: '/billing' },
      }
    }

    if (isCanceled) {
      return {
        nextDeliveryAt: null,
        feedbackCutoffAt: null,
        feedbackState: currentMaterial.feedback ? 'received' : 'waiting',
        headline: '訂閱已到期',
        detail: '已完成的教材仍可隨時下載複習。若想繼續接收每週個人化教材，請重新啟用訂閱。',
        action: { label: '重新啟用訂閱', href: '/billing' },
      }
    }

    if (isPastDue) {
      return {
        nextDeliveryAt: nextJobReleaseAt ? new Date(nextJobReleaseAt) : null,
        feedbackCutoffAt: null,
        feedbackState: currentMaterial.feedback ? 'received' : 'waiting',
        headline: '付款需要處理',
        detail: '請至帳戶設定確認付款方式，避免後續每週教材服務中斷。',
        action: { label: '處理付款方式', href: '/billing' },
      }
    }

    if (isPaused) {
      return {
        nextDeliveryAt: null,
        feedbackCutoffAt: null,
        feedbackState: currentMaterial.feedback ? 'received' : 'waiting',
        headline: '訂閱暫停中',
        detail: '訂閱目前暫停中，處理完成後每週教材會繼續交付。',
        action: { label: '管理訂閱', href: '/billing' },
      }
    }

    if (isCanceledAutoRenew) {
      const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
      const candidateReleaseAt = nextPrepared?.release_at
        ? new Date(nextPrepared.release_at)
        : nextJobReleaseAt
          ? new Date(nextJobReleaseAt)
          : null
      if (!candidateReleaseAt || !periodEnd || candidateReleaseAt.getTime() > periodEnd.getTime()) {
        return {
          nextDeliveryAt: null,
          feedbackCutoffAt: null,
          feedbackState: currentMaterial.feedback ? 'received' : 'waiting',
          headline: '已取消自動續訂',
          detail: periodEnd
            ? `目前方案仍可使用至 ${formatTaipeiDate(periodEnd)}。到期後將停止準備新的每週教材；隨時歡迎恢復自動續訂。`
            : '已取消自動續訂。本期結束後將停止準備新的每週教材；隨時歡迎恢復自動續訂。',
          action: { label: '恢復自動續訂', href: '/billing' },
        }
      }
    }
  }

  // Before the first release, live Fast Lane state is authoritative. Do not turn the old
  // fallback release_at into a parent promise while the first packet is actively being made.
  const isPreWeek1 = !currentMaterial

  if (nextPrepared?.release_at) {
    const releaseAt = new Date(nextPrepared.release_at)
    if (!Number.isNaN(releaseAt.getTime())) {
      if (isPreWeek1) {
        return {
          nextDeliveryAt: null,
          feedbackCutoffAt: null,
          feedbackState: 'waiting',
          headline: '第一份教材已完成',
          detail: '學生教材與家長解答已完成，正在同步到孩子的教材區。',
        }
      }
      const feedbackReceived = Boolean(currentMaterial?.feedback)
      return {
        nextDeliveryAt: releaseAt,
        feedbackCutoffAt: null,
        feedbackState: feedbackReceived ? 'received' : 'waiting',
        headline: `預計 ${formatTaipeiDate(releaseAt)} 開放下一份教材`,
        detail: feedbackReceived ? '本週回饋已收到。' : '隨時填寫本週回饋，我們會接續安排在後續教材。',
      }
    }
  }

  if (nextJobReleaseAt) {
    const releaseAt = new Date(nextJobReleaseAt)
    if (!Number.isNaN(releaseAt.getTime())) {
      if (isPreWeek1) {
        return {
          nextDeliveryAt: null,
          feedbackCutoffAt: null,
          feedbackState: 'waiting',
          headline: hasActiveGenerationFailure ? '第一份教材正在重新整理' : '第一份教材正在加速製作',
          detail: hasActiveGenerationFailure
            ? '製作過程遇到需要調整的地方，系統正在重新處理；完成後會直接開放下載。'
            : '完成孩子資料後就會立即開始製作；完成後直接開放下載，你可以在這裡看即時進度。',
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
        headline: `預計 ${formatTaipeiDate(releaseAt)} 交付下一週教材`,
        detail: feedbackState === 'received'
          ? '本週回饋已收到。'
          : feedbackState === 'open'
            ? `請盡量在 ${formatTaipeiDate(feedbackCutoffAt)} 前填寫回饋。`
            : '回饋時間已截止；下一份教材仍會依照既有進度繼續準備。',
      }
    }
  }

  if (hasActiveGenerationFailure) {
    return {
      nextDeliveryAt: null,
      feedbackCutoffAt: null,
      feedbackState: currentMaterial?.feedback ? 'received' : 'waiting',
      headline: currentMaterial ? '教材正在進行品質複檢' : '第一份教材正在重新整理',
      detail: currentMaterial
        ? '本週教材在品質檢查時遇到需要調整的地方，正在重新處理，完成後將儘速開放下載。'
        : '第一份教材製作過程遇到需要調整的地方，正在重新處理；完成後會直接開放下載。',
    }
  }

  return {
    nextDeliveryAt: null,
    feedbackCutoffAt: null,
    feedbackState: currentMaterial?.feedback ? 'received' : 'waiting',
    headline: currentMaterial ? '下一份教材排程確認中' : '第一份教材準備中',
    detail: currentMaterial
      ? '排程確認後會在這裡顯示下一次交付日期。'
      : hasPastDueJob
        ? '第一份教材仍在製作中；完成後會直接開放下載。'
        : '完成孩子資料後就會立即開始製作第一份教材。',
  }
}
