import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { ChildCard } from '../components/dashboard/ChildCard'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { PageTransition } from '../components/motion/PageTransition'
import { useParentData } from '../hooks/use-parent-data'
import { getSupabaseClient } from '../lib/supabase'

export function DashboardPage({ session }: { session: Session }) {
  const data = useParentData()

  return (
    <AppShell
      header={
        <ParentNavigation
          email={session.user.email}
          activeChildId={data.children[0]?.id}
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
          <section className="zero-state">
            <p className="eyebrow">從第一週開始</p>
            <h1>先告訴我們孩子現在的學習狀態</h1>
            <p>大約幾分鐘即可完成；資料越具體，第一份教材越貼近孩子。</p>
            <button className="button" type="button" onClick={() => navigate('/children/new')}>
              建立孩子學習資料
            </button>
          </section>
        ) : (
          <div className="dashboard-container">
            <header className="dashboard-top-header">
              <div>
                <p className="eyebrow">家長儀表板</p>
                <h1>本週教材與交付狀態</h1>
              </div>
              <button className="button button-secondary" type="button" onClick={() => navigate('/children/new')}>
                ＋ 新增孩子
              </button>
            </header>

            <StaggerContainer className="children-cards-list" staggerDelay={0.1}>
              {data.children.map((child) => (
                <StaggerItem key={child.id}>
                  <ChildCard
                    child={child}
                    materials={data.getMaterialsForChild(child.id)}
                    onRefresh={() => void data.refresh()}
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
