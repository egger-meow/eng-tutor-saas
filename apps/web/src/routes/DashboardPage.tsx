import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { ChildCard } from '../components/dashboard/ChildCard'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { PageTransition } from '../components/motion/PageTransition'
import { useParentData } from '../hooks/use-parent-data'
import { useEnrollmentState } from '../lib/enrollment'
import { readDraft } from '../lib/profile-form'
import { getSupabaseClient } from '../lib/supabase'

export function DashboardPage({ session }: { session: Session }) {
  const data = useParentData(session.user.id)
  const { state: enrollment } = useEnrollmentState()
  const capacityFull = Boolean(enrollment && (enrollment.status !== 'open' || enrollment.remaining <= 0))

  return (
    <AppShell
      header={
        <ParentNavigation
          email={session.user.email}
          childHref={data.children[0] ? `/children/${data.children[0].id}` : '/children/new'}
          onSignOut={() => void getSupabaseClient().auth.signOut()}
        />
      }
    >
      <PageTransition>
        {data.loading ? (
          <div className="loading-state" role="status">
            <div className="loading-spinner" />
            <p>正在整理孩子的本週學習…</p>
          </div>
        ) : data.error ? (
          <section className="error-state">
            <h1>目前無法載入</h1>
            <p>{data.error}</p>
            <button className="button" type="button" onClick={() => void data.refresh()}>
              再試一次
            </button>
          </section>
        ) : data.children.length === 0 ? (
          <section className="zero-state onboarding-card-hero">
            {(() => {
              const savedLandingDraft = typeof window !== 'undefined'
                ? (readDraft('paper-english:profile-draft:new') ?? readDraft('paper-english:landing-profile-draft'))
                : null
              if (!savedLandingDraft?.displayName) return null
              return (
                <div
                  className="orphan-recovery-banner"
                  style={{
                    background: 'var(--color-success-soft)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-control)',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--color-action)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-action)', fontWeight: 600 }}>
                    ✨ 系統已為你暫存之前填寫的孩子資料（<strong>{savedLandingDraft.displayName}</strong>），點擊下方按鈕即可直接載入接續完成！
                  </p>
                </div>
              )
            })()}
            <div className="onboarding-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✅ 家長帳號已認證成功</span>
              <span>·</span>
              <span>
                {capacityFull
                  ? '名額候補'
                  : enrollment?.freePilotActive
                    ? '🧪 紙屬英文 Beta · 目前 NT$0'
                    : '免費體驗第一週'}
              </span>
            </div>
            <h1>
              {capacityFull
                ? '目前名額已滿，完成基本資料保留候補席次'
                : enrollment?.freePilotActive
                  ? '只差最後一步：告訴我們孩子的基本資料，就會開始準備第一份專屬教材'
                  : '只差最後一步：告訴我們孩子的基本資料，就能免費取得第一週教材'}
            </h1>
            <p>
              {capacityFull
                ? '建立資料不會收費，也不需綁定信用卡。有名額釋出時我們會寄 Email 通知你，再決定是否開始。'
                : enrollment?.freePilotActive
                  ? '你已成功登入家長帳號！只需 60 秒點選孩子的年級與興趣，系統將立即在畫面現場製作第 1 週專屬教材（Beta 期間目前每週專屬教材 NT$0，免填信用卡、免綁卡。提交教材後可選填回饋，再明確申請下一份教材）。'
                  : '完全免費生成第一週專屬學習包（含學生教材與家長解答），不需綁定信用卡，2 分鐘即可完成。'}
            </p>

            <div
              className="orphan-recovery-highlights"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                margin: '1.5rem 0',
                padding: '1rem',
                background: 'rgba(40, 79, 62, 0.04)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-rule-strong)',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '0.9375rem', marginBottom: '0.25rem', color: 'var(--color-ink)' }}>
                  🎯 100% 量身打造
                </strong>
                <span style={{ fontSize: '0.84rem', color: 'var(--color-muted)' }}>
                  依孩子年級與熱門興趣（動漫、籃球、電玩等）客製真實文章。
                </span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9375rem', marginBottom: '0.25rem', color: 'var(--color-ink)' }}>
                  📄 雙面紙本零分心
                </strong>
                <span style={{ fontSize: '0.84rem', color: 'var(--color-muted)' }}>
                  學生自主練習本 ＋ 家長解答指引，擺脫 3C 遊戲干擾。
                </span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9375rem', marginBottom: '0.25rem', color: 'var(--color-ink)' }}>
                  ⚡ 現場 60 秒生成
                </strong>
                <span style={{ fontSize: '0.84rem', color: 'var(--color-muted)' }}>
                  填妥送出後無須等待，直接在畫面實時排版下載。
                </span>
              </div>
            </div>

            <button className="button button-large" type="button" onClick={() => navigate('/children/new')}>
              {capacityFull
                ? '開始填寫候補資料'
                : enrollment?.freePilotActive
                  ? '立即為孩子準備專屬教材（目前 NT$0）'
                  : '立即為孩子準備第一週教材'}
            </button>
            <p className="zero-state-footnote">所有填寫資料日後都可以修改，不確定的欄位先選大概就好。</p>
          </section>

        ) : (
          <div className="dashboard-container">
            <header className="dashboard-top-header">
              <div>
                <p className="eyebrow">本週教材</p>
                <h1 style={{ maxWidth: '40rem' }}>每個孩子，都有自己的下一步。</h1>
                <p className="dashboard-subtitle">繼續閱讀與作答；提交後可選填回饋，再申請下一份。</p>
              </div>
              <button className="button button-secondary" type="button" onClick={() => navigate('/children/new')}>
                ＋ 新增孩子
              </button>
            </header>

            <StaggerContainer className="children-cards-list" staggerDelay={0.08} id="children">
              {data.children.map((child, index) => (
                <StaggerItem key={child.id} initial={false} data-revealed="true">
                  <ChildCard
                    child={child}
                    materials={data.getMaterialsForChild(child.id)}
                    onRefresh={() => void data.refresh()}
                    onLoadMoreMaterials={() => void data.loadMoreMaterials(child.id)}
                    hasMoreMaterials={Boolean(data.materialHasMore[child.id])}
                    releasedMaterialCount={data.releasedMaterialCounts[child.id] ?? 0}
                    loadingMoreMaterials={Boolean(data.loadingMoreMaterials[child.id])}
                    defaultExpanded={index === 0}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}
      </PageTransition>
    </AppShell>
  )
}
