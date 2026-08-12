import type { Child } from '../../lib/children'
import type { SubscriptionView } from '../../lib/subscriptions'

const labels = {
  trialing: ['第一週體驗中', '第一週教材免費；體驗結束前不會在這個頁面直接扣款。'],
  active: ['訂閱進行中', '教材會依每位孩子自己的七天週期持續準備。'],
  past_due: ['付款需要處理', '付款狀態尚未完成，請聯絡我們協助確認。'],
  paused: ['訂閱已暫停', '暫停期間不會建立新的付費週次。'],
  canceled: ['訂閱已取消', '已完成的教材仍會保留在孩子的歷史紀錄。'],
} as const

function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeZone: 'Asia/Taipei' }).format(new Date(value)) : null }

export function ChildSubscription({ child, subscription }: { child: Child; subscription?: SubscriptionView }) {
  if (!subscription) return <article className="subscription-card"><h2>{child.display_name}</h2><p>尚未建立訂閱。完成第一週體驗後，我們會再引導你確認方案。</p></article>
  const [title, description] = labels[subscription.status]
  const periodEnd = formatDate(subscription.currentPeriodEnd)
  return <article className="subscription-card"><div><p className="overline">{child.grade} 年級</p><h2>{child.display_name}</h2></div><p><span className={`status-label status-${subscription.status}`}>{title}</span></p><p>{description}</p>{subscription.priceTwd !== null && <p><strong>目前方案：</strong>每月 NT${subscription.priceTwd}</p>}{periodEnd && <p><strong>{subscription.cancelAtPeriodEnd ? '使用至' : '本期至'}：</strong>{periodEnd}</p>}{subscription.cancelAtPeriodEnd && <p className="notice">本期結束後不再續訂。</p>}</article>
}
