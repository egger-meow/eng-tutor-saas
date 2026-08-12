import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { ChildIdentity } from '../components/children/ChildIdentity'
import { ChildSwitcher } from '../components/children/ChildSwitcher'
import { DeliveryStatus } from '../components/dashboard/DeliveryStatus'
import { PersonalizationSummary } from '../components/dashboard/PersonalizationSummary'
import { WeeklyLearningPanel } from '../components/dashboard/WeeklyLearningPanel'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { MaterialHistory } from '../components/materials/MaterialHistory'
import { useParentData } from '../hooks/use-parent-data'
import { getDeliveryViewModel } from '../lib/delivery'
import { getSupabaseClient } from '../lib/supabase'

export function DashboardPage({ session }: { session: Session }) {
  const data = useParentData()
  const latestMaterial = data.materials[0] ?? null

  return (
    <AppShell header={<ParentNavigation email={session.user.email} activeChildId={data.selectedChild?.id} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
      {data.loading ? <p className="loading-state" role="status">正在整理孩子的本週學習…</p> : data.error ? (
        <section className="error-state"><h1>目前無法載入</h1><p>{data.error}</p><button className="button" type="button" onClick={() => void data.refresh()}>再試一次</button></section>
      ) : !data.selectedChild ? (
        <section className="zero-state"><p className="eyebrow">從第一週開始</p><h1>先告訴我們孩子現在的學習狀態</h1><p>大約幾分鐘即可完成；資料越具體，第一份教材越貼近孩子。</p><button className="button" type="button" onClick={() => navigate('/children/new')}>建立孩子學習資料</button></section>
      ) : (
        <>
          <section className="dashboard-heading">
            <ChildIdentity child={data.selectedChild} />
            <ChildSwitcher options={data.children} selectedChildId={data.selectedChild.id} onChange={data.selectChild} />
          </section>
          {latestMaterial ? (
            <>
              <WeeklyLearningPanel material={latestMaterial} childName={data.selectedChild.display_name} onFeedbackSaved={() => void data.refresh()} />
              <div className="dashboard-support">
                <PersonalizationSummary material={latestMaterial} />
                <DeliveryStatus delivery={getDeliveryViewModel(data.selectedChild, latestMaterial)} />
              </div>
              <section className="history-section" aria-labelledby="history-title"><p className="overline">學習紀錄</p><h2 id="history-title">過去教材</h2><MaterialHistory materials={data.materials.slice(1)} childName={data.selectedChild.display_name} onFeedbackSaved={() => void data.refresh()} /></section>
            </>
          ) : (
            <div className="dashboard-support"><section className="empty-state"><h2>第一份教材準備中</h2><p>完成學習資料後，教材會在這裡提供下載。</p></section><DeliveryStatus delivery={getDeliveryViewModel(data.selectedChild, null)} /></div>
          )}
        </>
      )}
    </AppShell>
  )
}
