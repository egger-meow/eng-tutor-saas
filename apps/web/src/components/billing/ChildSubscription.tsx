import { useState } from 'react'
import type { Child } from '../../lib/children'
import { gradeStageLabel } from '../../lib/grade-stage'
import type { SubscriptionView } from '../../lib/subscriptions'
import { annualMonthlyEquivalentTwd, annualSavingsTwd, billingPlans, formatPrice, planForSubscription, type BillingPlan } from '../../lib/billing-plans'

const labels = {
  trialing: ['體驗期', '目前可以使用體驗內容，之後再決定是否開始訂閱。'],
  active: ['訂閱中', '每週教材會依照孩子目前的學習狀態持續準備。'],
  past_due: ['付款需要處理', '請確認付款方式，避免後續教材服務中斷。'],
  paused: ['訂閱暫停', '訂閱目前暫停中，處理完成後服務會恢復。'],
  canceled: ['訂閱已取消', '已完成的教材仍會保留在孩子的歷史紀錄。'],
} as const

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeZone: 'Asia/Taipei' }).format(new Date(value)) : null
}

type Props = {
  child: Child
  subscription?: SubscriptionView
  busy?: boolean
  activationPending?: boolean
  onSubscribe: (childId: string, plan: BillingPlan) => void
  onCancel: (childId: string, reason: string) => void
  onResume: (childId: string) => void
}

export function ChildSubscription({ child, subscription, busy, activationPending, onSubscribe, onCancel, onResume }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('annual')

  if (!subscription) return <article className="subscription-card"><div className="subscription-card-body"><h2>{child.display_name}</h2><p>尚未建立訂閱。完成第一週體驗後，我們會再引導你確認方案。</p></div></article>
  if (activationPending) return <article className="subscription-card"><div className="subscription-card-body"><div><p className="overline">{gradeStageLabel(child)}</p><h2>{child.display_name}</h2></div><p><span className="status-label status-success">付款成功・訂閱啟用中</span></p><p>付款已完成，正在同步 Paddle 的確認結果，完成後這個頁面會自動更新。</p></div></article>

  const [title, description] = subscription.cancelAtPeriodEnd && subscription.status === 'active'
    ? ['已取消續訂', '本期教材與權益仍可完整使用。期間結束前隨時可一鍵恢復自動續訂。']
    : labels[subscription.status]
  const periodEnd = formatDate(subscription.currentPeriodEnd)
  const canSubscribe = subscription.status === 'trialing' || subscription.status === 'canceled'
  const canCancel = ['active', 'past_due', 'paused'].includes(subscription.status) && !subscription.cancelAtPeriodEnd
  const canResume = ['active', 'past_due', 'paused'].includes(subscription.status) && subscription.cancelAtPeriodEnd
  const currentPlan = planForSubscription(subscription.planCode, subscription.billingInterval)

  return <article className="subscription-card">
    <div className="subscription-card-body">
      <div><p className="overline">{gradeStageLabel(child)}</p><h2>{child.display_name}</h2></div>
      <p><span className={`status-label status-${subscription.cancelAtPeriodEnd ? 'paused' : subscription.status}`}>{title}</span></p>
      <p>{description}</p>
      {subscription.priceTwd !== null && <p><strong>目前方案：</strong>{currentPlan.label}・{currentPlan.cadenceLabel} NT${formatPrice(subscription.priceTwd)}</p>}
      {periodEnd && <p><strong>{subscription.cancelAtPeriodEnd ? '使用至' : '本期至'}：</strong>{periodEnd}</p>}
      {subscription.cancelAtPeriodEnd && <p className="notice">已取消續訂；本期結束前仍可使用。歡迎隨時恢復自動續訂。</p>}
    </div>
    {canCancel && <div className="subscription-action">
      <button className="button-link text-link" type="button" disabled={busy} onClick={() => setConfirmingCancel((current) => !current)}>
        {confirmingCancel ? '先不要取消' : '取消續訂'}
      </button>
      {confirmingCancel && <div className="cancel-confirmation">
        <p><strong>確定要取消續訂嗎？</strong></p>
        <p>不會再產生下一期扣款，本期教材與權益會保留到{periodEnd ?? '本期結束'}。之後想回來時，隨時都可以重新續訂。</p>
        <label htmlFor={`cancel-reason-${child.id}`}>想告訴我們原因嗎？（選填）</label>
        <textarea id={`cancel-reason-${child.id}`} rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：先暫停一陣子、孩子最近比較忙…" />
        <button className="button secondary" type="button" disabled={busy} onClick={() => onCancel(child.id, reason)}>{busy ? '正在取消續訂…' : '確認取消續訂'}</button>
      </div>}
    </div>}
    {canResume && <div className="subscription-action">
      <button className="button" type="button" disabled={busy} onClick={() => onResume(child.id)}>
        {busy ? '正在恢復續訂…' : '恢復自動續訂'}
      </button>
      <p className="muted">隨時可恢復每週專屬教材的自動交付，次期將依原方案持續為孩子準備。</p>
    </div>}
    {canSubscribe && <div className="subscription-action">
      <fieldset className="billing-plan-selector">
        <legend>選擇付款週期</legend>
        <label className={selectedPlan === 'annual' ? 'is-selected' : ''}>
          <input type="radio" name={`billing-plan-${child.id}`} value="annual" checked={selectedPlan === 'annual'} onChange={() => setSelectedPlan('annual')} />
          <span>
            <strong className="plan-price-line">
              年繳 NT${formatPrice(billingPlans.annual.priceTwd)}
              <span className="badge badge-savings">省 NT${formatPrice(annualSavingsTwd)}</span>
            </strong>
            <small>平均每月約 NT${formatPrice(annualMonthlyEquivalentTwd)}，相較月繳一年省 NT${formatPrice(annualSavingsTwd)}</small>
          </span>
        </label>
        <label className={selectedPlan === 'monthly' ? 'is-selected' : ''}>
          <input type="radio" name={`billing-plan-${child.id}`} value="monthly" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} />
          <span>
            <strong className="plan-price-line">
              月繳 {subscription.foundingStatus === 'eligible' ? (
                <>
                  <del className="strike-price">NT${formatPrice(billingPlans.monthly.priceTwd)}</del>
                  <ins className="highlight-price">NT$299</ins>
                  <span className="badge badge-discount">創始早鳥優惠</span>
                </>
              ) : (
                <>NT${formatPrice(billingPlans.monthly.priceTwd)}</>
              )}
            </strong>
            <small>
              {subscription.foundingStatus === 'eligible'
                ? 'Founding 30 創始優惠：第一個付費月折為 NT$299，第二個付費月起 NT$499／月'
                : '每月自動續訂；可隨時取消下一期續訂'}
            </small>
          </span>
        </label>
      </fieldset>
      <p className="muted">方案會自動續訂；可隨時取消下一期續訂，已付款期間的權益會保留到期末。</p>
      <button className="button" type="button" disabled={busy} onClick={() => onSubscribe(child.id, selectedPlan)}>{busy ? '正在準備安全付款…' : `選擇${selectedPlan === 'annual' ? '年繳' : '月繳'}並開始訂閱`}</button>
    </div>}
  </article>
}

