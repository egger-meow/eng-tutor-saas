import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { ChildCard } from '../components/dashboard/ChildCard'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { PageTransition } from '../components/motion/PageTransition'
import { useParentData } from '../hooks/use-parent-data'
import { useEnrollmentState } from '../lib/enrollment'
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
            <div className="onboarding-badge">
              {capacityFull
                ? '名額候補'
                : enrollment?.freePilotActive
                  ? '前 100 位全面免費'
                  : '免費體驗第一週'}
            </div>
            <h1>
              {capacityFull
                ? '目前名額已滿，完成基本資料保留候補席次'
                : enrollment?.freePilotActive
                  ? '只差最後一步：告訴我們孩子的基本資料，每週專屬教材全面免費！'
                  : '只差最後一步：告訴我們孩子的基本資料，就能免費取得第一週教材'}
            </h1>
            <p>
              {capacityFull
                ? '建立資料不會收費，也不需綁定信用卡。有名額釋出時我們會寄 Email 通知你，再決定是否開始。'
                : enrollment?.freePilotActive
                  ? '前 100 位學員期間，每週專屬教材完全免費（免填信用卡、免綁卡）。每週只要完成回饋，系統持續每週為孩子準備專屬教材。'
                  : '完全免費生成第一週專屬學習包（含學生教材與家長解答），不需綁定信用卡，2 分鐘即可完成。'}
            </p>

            <button className="button button-large" type="button" onClick={() => navigate('/children/new')}>
              {capacityFull
                ? '開始填寫候補資料'
                : enrollment?.freePilotActive
                  ? '立即為孩子準備專屬教材（每週 NT$0 免費）'
                  : '立即為孩子準備第一週教材'}
            </button>
            <p className="zero-state-footnote">✨ 所有填寫資料日後皆可隨時在後台修改，不確定的欄位可先選大概。</p>
          </section>

        ) : (
          <div className="dashboard-container">
            <header className="dashboard-top-header">
              <div>
                <p className="eyebrow">本週教材</p>
                <h1 style={{ maxWidth: '40rem' }}>每個孩子，都有自己的下一步。</h1>
                <p className="dashboard-subtitle">查看本週交付、完成回饋，讓下一份教材接著成長。</p>
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
