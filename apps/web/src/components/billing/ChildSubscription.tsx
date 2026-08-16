import { useEffect, useState } from 'react'
import type { Child } from '../../lib/children'
import { gradeStageLabel } from '../../lib/grade-stage'
import type { SubscriptionView } from '../../lib/subscriptions'
import { annualMonthlyEquivalentTwd, annualSavingsTwd, billingPlans, formatPrice, planForSubscription, type BillingPlan } from '../../lib/billing-plans'

const labels = {
  trialing: ['體驗期', '目前可以使用體驗內容，之後再決定是否開始訂閱。'],
  active: ['訂閱中', '每週教材會依照孩子目前的學習狀態持續準備。'],
  past_due: ['付款需要處理', '請確認付款方式，避免後續教材服務中斷。'],
  paused: ['訂閱暫停', '訂閱目前暫停中，處理完成後服務會恢復。'],
  canceled: ['訂閱已到期', '已完成的教材仍會完整保留在孩子的歷史紀錄。'],
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

  useEffect(() => {
    setConfirmingCancel(false)
    setReason('')
  }, [subscription?.cancelAtPeriodEnd, subscription?.status])

  if (!subscription) {
    return (
      <article className="subscription-card">
        <div className="subscription-card-body">
          <h2>{child.display_name}</h2>
          <p>尚未建立訂閱。完成第一週體驗後，我們會再引導你確認方案。</p>
        </div>
      </article>
    )
  }

  if (activationPending) {
    return (
      <article className="subscription-card">
        <div className="subscription-card-body">
          <div>
            <p className="overline">{gradeStageLabel(child)}</p>
            <h2>{child.display_name}</h2>
          </div>
          <p><span className="status-label status-success">付款成功・訂閱啟用中</span></p>
          <p>付款已完成，正在同步 Paddle 的確認結果，完成後這個頁面會自動更新。</p>
        </div>
      </article>
    )
  }

  const periodEnd = formatDate(subscription.currentPeriodEnd)
  const isCanceledAutoRenew = Boolean(subscription.cancelAtPeriodEnd && ['active', 'past_due', 'paused'].includes(subscription.status))

  const [title, description] = isCanceledAutoRenew
    ? ['已取消自動續訂', `目前方案仍可使用至 ${periodEnd ?? '本期結束'}。到期後可以重新選擇月繳或年繳方案。`]
    : labels[subscription.status]

  const canSubscribe = subscription.status === 'trialing' || subscription.status === 'canceled'
  const canCancel = ['active', 'past_due', 'paused'].includes(subscription.status) && !subscription.cancelAtPeriodEnd
  const canResume = isCanceledAutoRenew
  const currentPlan = planForSubscription(subscription.planCode, subscription.billingInterval)

  return (
    <article className="subscription-card">
      <div className="subscription-card-body">
        <div>
          <p className="overline">{gradeStageLabel(child)}</p>
          <h2>{child.display_name}</h2>
        </div>
        <p>
          <span className={`status-label status-${isCanceledAutoRenew ? 'paused' : subscription.status}`}>
            {title}
          </span>
        </p>
        <p>{description}</p>
        {subscription.priceTwd !== null && (
          <p>
            <strong>目前方案：</strong>
            {currentPlan.label}・{currentPlan.cadenceLabel} NT${formatPrice(subscription.priceTwd)}
          </p>
        )}
        {periodEnd && (
          <p>
            <strong>{isCanceledAutoRenew ? '使用至' : '本期至'}：</strong>
            {periodEnd}
          </p>
        )}
        {isCanceledAutoRenew && (
          <p className="notice">
            已取消自動續訂。目前方案仍可使用至 {periodEnd ?? '本期結束'}。到期後可以重新選擇月繳或年繳方案。
          </p>
        )}
      </div>

      {canCancel && (
        <div className="subscription-action">
          <button
            className="button-link text-link"
            type="button"
            disabled={busy}
            onClick={() => setConfirmingCancel((current) => !current)}
          >
            {confirmingCancel ? '先不要取消' : '取消續訂'}
          </button>
          <p className="muted">
            如果只是想改付款週期也沒問題。本期結束後，可以重新選擇月繳或年繳方案。
          </p>
          {confirmingCancel && (
            <div className="cancel-confirmation">
              <p><strong>確定要取消續訂嗎？</strong></p>
              <p>
                取消的是「下一期自動續訂」，本期教材與學習權益會完整保留至 {periodEnd ?? '本期結束'}。孩子的學習紀錄與過去每週教材都不會消失。
              </p>
              <p className="cancel-hint">
                如果只是想改付款週期也沒問題。本期結束後，可以隨時重新選擇月繳或年繳方案。
              </p>
              <label htmlFor={`cancel-reason-${child.id}`}>想告訴我們原因嗎？（選填）</label>
              <textarea
                id={`cancel-reason-${child.id}`}
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="例如：想改選年繳、先暫停一陣子、孩子最近比較忙…"
              />
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmingCancel(false)
                  setReason('')
                  onCancel(child.id, reason)
                }}
              >
                {busy ? '正在取消續訂…' : '確認取消續訂'}
              </button>
            </div>
          )}
        </div>
      )}

      {canResume && (
        <div className="subscription-action">
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirmingCancel(false)
              setReason('')
              onResume(child.id)
            }}
          >
            {busy ? '正在恢復續訂…' : '恢復自動續訂'}
          </button>
          <p className="muted">
            點擊代表放棄更換／停止方案，繼續目前方案的自動續訂。若想更換為其他方案，請等本期結束後重新選擇。
          </p>
        </div>
      )}

      {canSubscribe && (
        <div className="subscription-action">
          <fieldset className="billing-plan-selector">
            <legend>選擇付款週期</legend>
            <label className={selectedPlan === 'annual' ? 'is-selected' : ''}>
              <input
                type="radio"
                name={`billing-plan-${child.id}`}
                value="annual"
                checked={selectedPlan === 'annual'}
                onChange={() => setSelectedPlan('annual')}
              />
              <span>
                <strong className="plan-price-line">
                  年繳 NT${formatPrice(billingPlans.annual.priceTwd)}
                  <span className="badge badge-savings">省 NT${formatPrice(annualSavingsTwd)}</span>
                </strong>
                <small>平均每月約 NT${formatPrice(annualMonthlyEquivalentTwd)}，相較月繳一年省 NT${formatPrice(annualSavingsTwd)}</small>
              </span>
            </label>
            <label className={selectedPlan === 'monthly' ? 'is-selected' : ''}>
              <input
                type="radio"
                name={`billing-plan-${child.id}`}
                value="monthly"
                checked={selectedPlan === 'monthly'}
                onChange={() => setSelectedPlan('monthly')}
              />
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
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() => onSubscribe(child.id, selectedPlan)}
          >
            {busy ? '正在準備安全付款…' : `選擇${selectedPlan === 'annual' ? '年繳' : '月繳'}並開始訂閱`}
          </button>
        </div>
      )}
    </article>
  )
}

