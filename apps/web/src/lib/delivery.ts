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
    timeZone: 'Asia/Taipei', month: 'long', day: 'numeric', weekday: 'short',
  }).format(date)
}

export function getDeliveryViewModel(child: Child, latestMaterial: Material | null, now = new Date()): DeliveryViewModel {
  if (!child.next_generation_at) {
    return {
      nextDeliveryAt: null,
      feedbackCutoffAt: null,
      feedbackState: latestMaterial?.feedback ? 'received' : 'waiting',
      headline: latestMaterial ? '下一週教材排程確認中' : '第一週教材準備中',
      detail: latestMaterial ? '排程確認後會在這裡顯示下一次交付日期。' : '完成孩子資料後，我們會開始準備第一份教材。',
    }
  }

  const generationAt = new Date(child.next_generation_at)
  if (Number.isNaN(generationAt.getTime())) return getDeliveryViewModel({ ...child, next_generation_at: null }, latestMaterial, now)
  const nextDeliveryAt = new Date(generationAt.getTime() + day)
  const feedbackCutoffAt = new Date(nextDeliveryAt.getTime() - (2 * day))
  const feedbackState = latestMaterial?.feedback
    ? 'received'
    : now < feedbackCutoffAt
      ? 'open'
      : 'closed'

  return {
    nextDeliveryAt,
    feedbackCutoffAt,
    feedbackState,
    headline: `預計 ${formatTaipeiDate(nextDeliveryAt)} 交付下一週教材`,
    detail: feedbackState === 'received'
      ? '本週回饋已收到，會用於下一份教材。'
      : feedbackState === 'open'
        ? `請盡量在 ${formatTaipeiDate(feedbackCutoffAt)} 前填寫回饋。`
        : '回饋時間已截止；下一份教材仍會依照既有進度繼續準備。',
  }
}

