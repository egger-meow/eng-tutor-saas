import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { ChildSubscription } from '../components/billing/ChildSubscription'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { listChildren, type Child } from '../lib/children'
import { cancelSubscription, listOwnedSubscriptions, prepareCheckout, resumeSubscription, type SubscriptionView } from '../lib/subscriptions'
import { listOwnedWaitlist, type OwnedWaitlistEntry } from '../lib/waitlist'
import { closePaddleCheckout, openPaddleCheckout } from '../lib/paddle'
import { getSupabaseClient } from '../lib/supabase'
import { annualMonthlyEquivalentTwd, annualSavingsTwd, billingPlans, formatPrice, type BillingPlan } from '../lib/billing-plans'
import { legalConfig } from '../lib/config'
import { acceptCurrentTermsVersion } from '../lib/legal-acceptance'
import { useEnrollmentState } from '../lib/enrollment'

export function getCheckoutPriceDisplay(
  plan: BillingPlan,
  checkoutPriceTwd: number | undefined,
  foundingAvailable: boolean,
) {
  if (plan === 'monthly' && checkoutPriceTwd === undefined && foundingAvailable) {
    return '正在確認付款金額…'
  }
  return `NT$${formatPrice(checkoutPriceTwd ?? billingPlans[plan].priceTwd)}`
}

export function getCheckoutPriceDescription(
  plan: BillingPlan,
  checkoutPriceTwd: number | undefined,
  foundingApplies: boolean | undefined,
  foundingAvailable: boolean,
) {
  if (plan === 'annual') {
    return `平均每月約 NT$${formatPrice(annualMonthlyEquivalentTwd)}，相較月繳一年省 NT$${formatPrice(annualSavingsTwd)}。年繳不套用 Founding 30 月繳優惠；稅額由 Paddle 依付款資料計算。`
  }
  if (checkoutPriceTwd === undefined && foundingAvailable) {
    return '正在確認這次月繳的實際付款金額與創始 30 優惠。'
  }
  if (foundingApplies) {
    return '創始 30 優惠已套用：只要同一月繳訂閱不中斷，固定 NT$349／月。稅額由 Paddle 依付款資料計算。'
  }
  return '每月 NT$499 自動續訂。稅額由 Paddle 依付款資料計算。'
}

export function BillingPage({
  session,
  initialChildren,
  initialSubscriptions,
  initialWaitlist,
  initialAcceptedTermsVersion,
  initialLegalLoaded,
  initialLegalError,
}: {
  session: Session
  initialChildren?: Child[]
  initialSubscriptions?: SubscriptionView[]
  initialWaitlist?: OwnedWaitlistEntry[]
  initialAcceptedTermsVersion?: string | null
  initialLegalLoaded?: boolean
  initialLegalError?: string
}) {
  const [children, setChildren] = useState<Child[]>(initialChildren ?? [])
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>(initialSubscriptions ?? [])
  const [waitlistEntries, setWaitlistEntries] = useState<OwnedWaitlistEntry[]>(initialWaitlist ?? [])
  const [loading, setLoading] = useState(initialChildren === undefined && initialSubscriptions === undefined)
  const [error, setError] = useState('')
  const [legalError, setLegalError] = useState(initialLegalError ?? '')
  const [legalLoaded, setLegalLoaded] = useState(initialLegalLoaded ?? (initialAcceptedTermsVersion !== undefined))
  const [checkoutChildId, setCheckoutChildId] = useState<string | null>(null)
  const [activeCheckout, setActiveCheckout] = useState<{ childId: string; plan: BillingPlan; checkoutPriceTwd?: number; foundingApplies?: boolean } | null>(null)
  const [activatingChildId, setActivatingChildId] = useState<string | null>(null)
  const [checkoutNotice, setCheckoutNotice] = useState('')
  const [cancelingChildId, setCancelingChildId] = useState<string | null>(null)
  const [resumingChildId, setResumingChildId] = useState<string | null>(null)
  const [acceptedTermsVersion, setAcceptedTermsVersion] = useState<string | null>(initialAcceptedTermsVersion ?? null)
  const [termsChecked, setTermsChecked] = useState(false)
  const [acceptingTerms, setAcceptingTerms] = useState(false)
  const { state: enrollment } = useEnrollmentState()
  const foundingRemaining = enrollment ? Math.max(enrollment.foundingLimit - enrollment.foundingCount, 0) : null
  const foundingAvailable = Boolean(enrollment !== null && enrollment.status === 'open' && foundingRemaining !== null && foundingRemaining > 0)
  const capacityFull = Boolean(enrollment && (enrollment.status !== 'open' || enrollment.remaining <= 0))

  async function refreshSubscriptions() {
    const nextSubscriptions = await listOwnedSubscriptions()
    setSubscriptions(nextSubscriptions)
    return nextSubscriptions
  }

  async function waitForSubscriptionActivation(childId: string) {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
      const nextSubscriptions = await refreshSubscriptions()
      const current = nextSubscriptions.find((subscription) => subscription.childId === childId)
      if (current?.status === 'active') {
        setActivatingChildId(null)
        setCheckoutNotice('訂閱已啟用。之後會依這位孩子自己的七天週期持續準備教材。')
        return
      }
    }
    setCheckoutNotice('付款已完成，Paddle 狀態仍在同步中；稍後重新整理即可看到最新訂閱狀態。')
  }

  async function startCheckout(childId: string, plan: BillingPlan) {
    if (!legalLoaded || legalError) {
      setError(legalError || '目前無法確認服務條款同意紀錄，請稍後再試。')
      return
    }
    if (acceptedTermsVersion !== legalConfig.termsVersion) {
      setError('開始付款前，請先閱讀並同意目前版本的服務條款。')
      return
    }
    setCheckoutChildId(childId)
    setActiveCheckout({ childId, plan })
    setCheckoutNotice('')
    setError('')
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      const checkout = await prepareCheckout(childId, plan)
      setActiveCheckout((current) => current?.childId === childId && current.plan === plan
        ? { ...current, checkoutPriceTwd: checkout.checkoutPriceTwd, foundingApplies: checkout.foundingApplies }
        : current)
      await openPaddleCheckout(checkout.transactionId, 'paddle-checkout-frame', () => {
        setActivatingChildId(childId)
        setCheckoutNotice('付款完成，正在同步訂閱狀態，通常約 10 秒。這個頁面會自動更新。')
        setActiveCheckout(null)
        void closePaddleCheckout()
        void waitForSubscriptionActivation(childId).catch(() => {
          setCheckoutNotice('付款已完成，但目前無法自動讀取最新狀態；稍後重新整理即可再次確認。')
        })
      })
    } catch (caught) {
      setActiveCheckout(null)
      setError(caught instanceof Error ? caught.message : '目前無法開啟安全付款，請稍後再試。')
    } finally {
      setCheckoutChildId(null)
    }
  }

  async function acceptTermsForCheckout() {
    if (!termsChecked) return
    setAcceptingTerms(true)
    setError('')
    try {
      await acceptCurrentTermsVersion()
      setAcceptedTermsVersion(legalConfig.termsVersion)
      setLegalLoaded(true)
      setLegalError('')
      setTermsChecked(false)
      setCheckoutNotice('新版服務條款已記錄同意；隱私權政策版本未變更，不需要重新同意。')
    } catch {
      setError('目前無法記錄服務條款同意，請稍後再試。')
    } finally {
      setAcceptingTerms(false)
    }
  }

  async function closeCheckout() {
    await closePaddleCheckout()
    setActiveCheckout(null)
  }

  async function waitForSubscriptionReconciliation(childId: string, expectedCancelAtPeriodEnd: boolean) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500))
      const nextSubscriptions = await refreshSubscriptions()
      const current = nextSubscriptions.find((sub) => sub.childId === childId)
      if (current && current.cancelAtPeriodEnd === expectedCancelAtPeriodEnd) {
        return
      }
    }
  }

  async function cancelChildSubscription(childId: string, reason: string) {
    setCancelingChildId(childId)
    setError('')
    setCheckoutNotice('')
    try {
      const result = await cancelSubscription(childId, reason)
      setSubscriptions((current) => current.map((sub) => sub.childId === childId ? { ...sub, cancelAtPeriodEnd: result.cancelAtPeriodEnd } : sub))
      setCheckoutNotice('已取消續訂。本期結束前仍保留目前方案；創始 30 若在到期前恢復續訂，NT$349／月價格也會保留。')
      if (result.reconciliationPending) {
        void waitForSubscriptionReconciliation(childId, result.cancelAtPeriodEnd).catch(() => {})
      } else {
        await refreshSubscriptions()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '取消訂閱時發生問題，請稍後再試。')
    } finally {
      setCancelingChildId(null)
    }
  }

  async function resumeChildSubscription(childId: string) {
    setResumingChildId(childId)
    setError('')
    setCheckoutNotice('')
    try {
      const result = await resumeSubscription(childId)
      setSubscriptions((current) => current.map((sub) => sub.childId === childId ? { ...sub, cancelAtPeriodEnd: result.cancelAtPeriodEnd } : sub))
      setCheckoutNotice('已恢復自動續訂。將於下個計費週期持續為孩子準備每週專屬教材。')
      if (result.reconciliationPending) {
        void waitForSubscriptionReconciliation(childId, result.cancelAtPeriodEnd).catch(() => {})
      } else {
        await refreshSubscriptions()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '恢復續訂時發生問題，請稍後再試。')
    } finally {
      setResumingChildId(null)
    }
  }

  useEffect(() => {
    let isMounted = true
    const supabase = getSupabaseClient()

    const loadSubscriptionData = Promise.all([
      listChildren(),
      listOwnedSubscriptions(),
      listOwnedWaitlist(supabase),
    ])
      .then(([nextChildren, nextSubscriptions, nextWaitlist]) => {
        if (!isMounted) return
        setChildren(nextChildren)
        setSubscriptions(nextSubscriptions)
        setWaitlistEntries(nextWaitlist)
      })
      .catch(() => {
        if (!isMounted) return
        setError('目前無法讀取訂閱資料，請稍後再試。')
      })

    const loadLegalData = Promise.resolve(
      supabase
        .from('profiles')
        .select('terms_version')
        .eq('id', session.user.id)
        .maybeSingle()
    )
      .then(({ data, error: profileError }) => {
        if (!isMounted) return
        if (profileError) {
          setLegalLoaded(false)
          setLegalError('目前無法確認服務條款同意紀錄，暫時無法開啟付款。')
          return
        }
        setAcceptedTermsVersion(data?.terms_version ?? null)
        setLegalLoaded(true)
        setLegalError('')
      })
      .catch(() => {
        if (!isMounted) return
        setLegalLoaded(false)
        setLegalError('目前無法確認服務條款同意紀錄，暫時無法開啟付款。')
      })

    void Promise.allSettled([loadSubscriptionData, loadLegalData]).finally(() => {
      if (isMounted) {
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [session.user.id])

  return (
    <AppShell
      header={
        <ParentNavigation
          email={session.user.email}
          onSignOut={() => void getSupabaseClient().auth.signOut()}
        />
      }
    >
      <PageTransition>
        <header className="page-heading">
          <p className="eyebrow">帳戶設定</p>
          <h1>每位孩子的訂閱</h1>
          <p>方案與交付週期彼此獨立。此頁目前只顯示由後端確認的狀態，不會在瀏覽器直接變更付款。</p>
        </header>

        {loading && (
          <div className="loading-state" role="status">
            <div className="loading-spinner" />
            <p>正在讀取訂閱…</p>
          </div>
        )}

        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {legalError && <p className="notice notice-error" role="alert">{legalError}</p>}
        {checkoutNotice && <p className="notice" role="status">{checkoutNotice}</p>}
        {enrollment?.freePilotActive && (
          <aside className="notice free-pilot-notice" style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#14532d', marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '8px' }}>
            <strong style={{ fontSize: '1rem' }}>🔥 前 100 位學員・每週專屬教材全面免費！</strong>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#166534', lineHeight: '1.6' }}>
              前 100 位學員期間，已加入的孩子每週專屬教材完全免費（免填信用卡、免綁卡）。每週只要完成回饋，系統持續每週為孩子準備專屬新教材。<br />
              若希望在 30 席額滿前永久鎖定未來的創始優惠（NT$349/月），亦可自願提前訂閱（會立即開始計費並保留創始價）。
            </p>
          </aside>
        )}
        {!loading && legalLoaded && acceptedTermsVersion !== legalConfig.termsVersion && (
          <section className="notice" aria-labelledby="terms-reacceptance-title">
            <h2 id="terms-reacceptance-title">付款前請確認新版服務條款</h2>
            <p>
              Founder 30 的持續訂閱價格契約已更新。請先閱讀
              <a href="/terms" target="_blank" rel="noreferrer">目前版本服務條款</a>；
              隱私權政策內容與版本沒有變更，不需要重新同意。
            </p>
            <label>
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={(event) => setTermsChecked(event.target.checked)}
              />
              我已閱讀並同意 {legalConfig.termsVersion} 服務條款
            </label>
            <p>
              <button
                className="button"
                type="button"
                disabled={!termsChecked || acceptingTerms}
                onClick={() => void acceptTermsForCheckout()}
              >
                {acceptingTerms ? '正在記錄…' : '同意新版服務條款'}
              </button>
            </p>
          </section>
        )}

        {!loading && children.length === 0 && (
          <div className="empty-state">
            <h2>{capacityFull ? '目前名額已滿，先建立孩子學習資料' : '先新增孩子'}</h2>
            <p>{capacityFull
              ? '先把孩子的學習資料準備好即可，不會收費，也不會先開始訂閱或產生教材。有名額時我們會寄 Email 通知你。'
              : '方案以每位孩子為單位。完成孩子資料後，第一份專屬教材預計隔天開放下載。'}</p>
            <button className="button" type="button" onClick={() => navigate('/children/new')}>
              ＋ {capacityFull ? '建立孩子學習資料' : '新增孩子'}
            </button>
          </div>
        )}

        <div className={`billing-layout ${activeCheckout ? 'has-active-checkout' : ''}`}>
          <StaggerContainer className="subscription-list" staggerDelay={0.08}>
            {children.map((child) => (
              <StaggerItem key={child.id}>
                <ChildSubscription
                  child={child}
                  subscription={subscriptions.find((item) => item.childId === child.id)}
                  waitlist={waitlistEntries.find((item) => item.childId === child.id)}
                  busy={checkoutChildId === child.id || cancelingChildId === child.id || resumingChildId === child.id}
                  activationPending={activatingChildId === child.id}
                  foundingAvailable={foundingAvailable}
                  foundingRemaining={foundingRemaining}
                  freePilotActive={enrollment?.freePilotActive}
                  onSubscribe={(childId, plan) => void startCheckout(childId, plan)}
                  onCancel={(childId, reason) => void cancelChildSubscription(childId, reason)}
                  onResume={(childId) => void resumeChildSubscription(childId)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {activeCheckout && (
            <aside className="checkout-panel" aria-label="安全付款">
              <div className="checkout-panel-heading">
                <div>
                  <p className="overline">安全付款</p>
                  <h2>為 {children.find((child) => child.id === activeCheckout.childId)?.display_name} 開始訂閱</h2>
                </div>
                <button className="button-link text-link" type="button" onClick={() => void closeCheckout()}>
                  稍後再付
                </button>
              </div>
              <div className="checkout-plan-summary">
                <span>紙屬英文{activeCheckout.plan === 'annual' ? '年繳' : '月繳'}方案</span>
                <strong>
                  {getCheckoutPriceDisplay(activeCheckout.plan, activeCheckout.checkoutPriceTwd, foundingAvailable)}
                  {' '}<small>／{activeCheckout.plan === 'annual' ? '年' : '月'}</small>
                </strong>
                <p>{getCheckoutPriceDescription(
                  activeCheckout.plan,
                  activeCheckout.checkoutPriceTwd,
                  activeCheckout.foundingApplies,
                  foundingAvailable,
                )}</p>
              </div>
              <div className="paddle-checkout-frame" />
              <p className="checkout-security-note">
                付款資料由 Paddle 安全處理，紙屬英文不會接觸或保存完整卡號。完成付款即代表同意 <a href="/terms" target="_blank" rel="noreferrer">服務條款</a> 與 <a href="/privacy" target="_blank" rel="noreferrer">隱私權政策</a>。
              </p>
            </aside>
          )}
        </div>
        <p className="muted">
          付款由 Paddle 安全處理。訂閱狀態以伺服器收到的 Paddle 通知為準；需要取消或處理付款問題時，請透過聯絡管道協助。
        </p>
      </PageTransition>
    </AppShell>
  )
}
