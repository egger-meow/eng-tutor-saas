import { useEffect, useState } from 'react'
import type { Child } from '../../lib/children'
import { gradeStageLabel } from '../../lib/grade-stage'
import type { SubscriptionView } from '../../lib/subscriptions'
import type { OwnedWaitlistEntry } from '../../lib/waitlist'
import { annualMonthlyEquivalentTwd, annualSavingsTwd, billingPlans, formatPrice, planForSubscription, type BillingPlan } from '../../lib/billing-plans'

export const founderCancellationWarning = '本期結束前仍保留創始價格；若訂閱於期末真正終止，創始 NT$349/月資格將永久失效。到期前恢復續訂即可保留。'

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
  waitlist?: OwnedWaitlistEntry | null
  busy?: boolean
  activationPending?: boolean
  foundingAvailable?: boolean
  foundingRemaining?: number | null
  freePilotActive?: boolean
  onSubscribe: (childId: string, plan: BillingPlan) => void
  onCancel: (childId: string, reason: string) => void
  onResume: (childId: string) => void
}

export function ChildSubscription({
  child,
  subscription,
  waitlist,
  busy,
  activationPending,
  foundingAvailable,
  foundingRemaining,
  freePilotActive,
  onSubscribe,
  onCancel,
  onResume,
}: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [reason, setReason] = useState('')
  const isFounderEligible = Boolean(foundingAvailable && subscription?.foundingStatus !== 'forfeited')
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(
    isFounderEligible ? 'monthly' : 'annual',
  )

  useEffect(() => {
    setConfirmingCancel(false)
    setReason('')
  }, [subscription?.cancelAtPeriodEnd, subscription?.status])

  useEffect(() => {
    setSelectedPlan(isFounderEligible ? 'monthly' : 'annual')
  }, [child.id, isFounderEligible])

  function renderPlanSelector() {
    return (
      <div className="subscription-action">
        {isFounderEligible && (
          <div className="founder-badge-ribbon">
            <span>👑 創始 30 名限定</span>
            {typeof foundingRemaining === 'number' && foundingRemaining > 0 && (
              <span className="founder-seat-urgency">・目前仍有創始優惠名額</span>
            )}
          </div>
        )}
        <fieldset className="billing-plan-selector">
          <legend>選擇付款週期</legend>
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
                {isFounderEligible ? (
                  <>
                    <ins className="highlight-price">月繳 NT$349</ins>
                    <del className="strike-price">NT${formatPrice(billingPlans.monthly.priceTwd)}</del>
                    <span className="badge badge-discount">創始 30 限定</span>
                  </>
                ) : (
                  `月繳 NT$${formatPrice(billingPlans.monthly.priceTwd)}`
                )}
              </strong>
              <small>
                {isFounderEligible ? (
                  <>
                    <strong>持續訂閱期間，NT$349 創始價固定保留。</strong>
                    若中途取消訂閱且到期未恢復，日後重新訂閱將以當時標準定價（NT$499/月）計算。
                  </>
                ) : (
                  '每月自動續訂；可隨時取消下一期續訂'
                )}
              </small>
            </span>
          </label>
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
              <small>平均每月約 NT${formatPrice(annualMonthlyEquivalentTwd)}，相較月繳一年省 NT${formatPrice(annualSavingsTwd)}。年繳方案不適用創始優惠。</small>
            </span>
          </label>
        </fieldset>
        {freePilotActive && (
          <div className="free-pilot-voluntary-notice" style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.875rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '0.875rem' }}>
              🔥 前 100 位學員每週專屬教材完全免費，現在不訂閱也能正常使用！
            </p>
            <p style={{ margin: '0.375rem 0 0', color: '#166534', fontSize: '0.8125rem' }}>
              若您希望在創始 30 名額用完前永久鎖定 NT$349/月席次，可自願提前訂閱。<strong>請注意：自願訂閱會立即開始扣款計費</strong>，並為孩子保留創始資格。
            </p>
          </div>
        )}
        <p className="muted">方案會自動續訂；可隨時取消下一期續訂，已付款期間的權益會保留到期末。</p>
        <button
          className="button"
          type="button"
          disabled={busy}
          onClick={() => onSubscribe(child.id, selectedPlan)}
        >
          {busy
            ? '正在準備安全付款…'
            : freePilotActive
              ? selectedPlan === 'monthly' && isFounderEligible
                ? '自願訂閱並鎖定 NT$349 創始價（立即扣款）'
                : `自願${selectedPlan === 'annual' ? '年繳' : '月繳'}訂閱（立即扣款）`
              : selectedPlan === 'monthly' && isFounderEligible
                ? '鎖定 NT$349 創始價'
                : `選擇${selectedPlan === 'annual' ? '年繳' : '月繳'}並開始訂閱`}
        </button>
      </div>
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

  const hasLivePaidSubscription = Boolean(subscription && ['active', 'past_due', 'paused'].includes(subscription.status))

  if (waitlist?.status === 'waiting' && !hasLivePaidSubscription) {
    return (
      <article className="subscription-card">
        <div className="subscription-card-body">
          <div>
            <p className="overline">{gradeStageLabel(child)}</p>
            <h2>{child.display_name}</h2>
          </div>
          <p>
            <span className="status-label status-waitlist" style={{ background: '#78350f', color: '#fde68a' }}>
              等候名單中
            </span>
          </p>
          <p>目前學習名額等候中。我們會在名額開放時以 Email 通知您，屆時再啟用訂閱，目前不會產生任何費用。</p>
        </div>
      </article>
    )
  }

  if (waitlist?.status === 'released' && !hasLivePaidSubscription) {
    return (
      <article className="subscription-card">
        <div className="subscription-card-body">
          <div>
            <p className="overline">{gradeStageLabel(child)}</p>
            <h2>{child.display_name}</h2>
          </div>
          <p>
            <span className="status-label status-released" style={{ background: '#064e3b', color: '#a7f3d0' }}>
              名額已開放
            </span>
          </p>
          <p>🎉 學習名額已為孩子開放！請選擇訂閱方案以啟用每週教材生成。</p>
        </div>
        {renderPlanSelector()}
      </article>
    )
  }

  if (!subscription) {
    return (
      <article className="subscription-card">
        <div className="subscription-card-body">
          <h2>{child.display_name}</h2>
          <p>
            {freePilotActive
              ? '前 100 位學員每週教材全面免費！完成孩子資料後，每週填寫回饋即可持續免費生成專屬教材（NT$0）。'
              : '尚未建立訂閱。完成第一週體驗後，我們會再引導你確認方案。'}
          </p>
        </div>
      </article>
    )
  }

  const periodEnd = formatDate(subscription.currentPeriodEnd)
  const isCanceledAutoRenew = Boolean(subscription.cancelAtPeriodEnd && ['active', 'past_due', 'paused'].includes(subscription.status))
  const isFreePilotActiveChild = Boolean(freePilotActive && subscription.status === 'trialing')
  const isPilotEndedChild = Boolean(!freePilotActive && subscription.status === 'trialing' && !subscription.currentPeriodEnd)

  const [title, description] = isCanceledAutoRenew
    ? ['已取消自動續訂', `目前方案仍可使用至 ${periodEnd ?? '本期結束'}。到期後可以重新選擇月繳或年繳方案。`]
    : isFreePilotActiveChild
      ? ['每週專屬教材全面免費中', '前 100 位學員期間，每週專屬教材完全免費（免填信用卡、免綁卡）。孩子每週只要填寫回饋，系統持續每週為他準備專屬新教材！現在不訂閱也能持續免費使用。']
      : isPilotEndedChild
        ? ['初期免費階段已結束', '已完成的教材都會保留。若要繼續每週產生新教材，請選擇月繳或年繳方案。']
        : labels[subscription.status]

  const canSubscribe = subscription.status === 'trialing' || subscription.status === 'canceled'
  const canCancel = ['active', 'past_due', 'paused'].includes(subscription.status) && !subscription.cancelAtPeriodEnd
  const canResume = isCanceledAutoRenew
  const currentPlan = planForSubscription(subscription.planCode, subscription.billingInterval)
  const isRedeemedFounder = subscription.foundingStatus === 'redeemed'
  const displayedPriceTwd = isRedeemedFounder && currentPlan.key === 'monthly' ? 349 : subscription.priceTwd

  return (
    <article className="subscription-card">
      <div className="subscription-card-body">
        <div>
          <p className="overline">{gradeStageLabel(child)}</p>
          <h2>{child.display_name}</h2>
        </div>
        <p>
          <span
            className={`status-label status-${isFreePilotActiveChild ? 'free-pilot' : isPilotEndedChild ? 'pilot-ended' : isCanceledAutoRenew ? 'paused' : subscription.status}`}
            style={
              isFreePilotActiveChild
                ? { background: '#16a34a', color: '#fff' }
                : isPilotEndedChild
                  ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                  : undefined
            }
          >
            {title}
          </span>
        </p>
        <p>{description}</p>
        {isRedeemedFounder && <p><span className="status-label status-founder">創始 30</span></p>}
        {subscription.priceTwd !== null && (
          <p>
            <strong>目前方案：</strong>
            {currentPlan.label}・{currentPlan.cadenceLabel} NT${formatPrice(displayedPriceTwd ?? subscription.priceTwd)}
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
            {isRedeemedFounder && <> {founderCancellationWarning}</>}
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
                取消的是「下一期自動續訂」，本期教材與學習權益會完整保留至 {periodEnd ?? '本期結束'}。孩子的學習紀錄與過去每週教材都不會消失。{isRedeemedFounder && <> {founderCancellationWarning}</>}
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

      {canSubscribe && renderPlanSelector()}
    </article>
  )
}
