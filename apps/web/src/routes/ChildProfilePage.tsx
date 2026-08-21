import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { ProfileSummary } from '../components/profile/ProfileSummary'
import { useParentData } from '../hooks/use-parent-data'
import { gradeStageLabel } from '../lib/grade-stage'
import { getSupabaseClient } from '../lib/supabase'

export function ChildProfilePage({ session, childId }: { session: Session; childId: string }) {
  const data = useParentData(session.user.id)
  const requestedChild = data.children.find((item) => item.id === childId) ?? null
  return <AppShell header={<ParentNavigation email={session.user.email} childHref={requestedChild ? `/children/${requestedChild.id}` : '/dashboard'} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <PageTransition>
      {data.loading ? <div className="loading-state" role="status"><div className="loading-spinner" /><p>載入孩子資料中…</p></div> : data.error ? <p className="notice notice-error">{data.error}</p> : data.children.length === 0 ? <p className="notice notice-error">找不到可查看的孩子資料。</p> : <>
        <header className="profile-header"><div><p className="overline">孩子資料</p><h1>所有孩子的學習資料</h1><p>{requestedChild ? `目前從 ${requestedChild.display_name} 進入` : '查看每個孩子的程度、進度與學習目標'}</p></div></header>
        <p className="profile-note">每個孩子的資料會分開呈現，更新資料不會影響其他孩子。</p>
        <div className="all-child-profiles">{data.children.map((child, index) => <section className="child-profile-section" key={child.id}>
          <header className="child-profile-heading"><div><p className="overline">孩子資料</p><h2>{child.display_name}</h2><p>{gradeStageLabel(child)}</p></div><button className="button" type="button" onClick={() => navigate(`/children/${child.id}/edit`)}>編輯 {child.display_name} 資料</button></header>
          <ProfileSummary child={child} />
          {index < data.children.length - 1 && <div className="child-profile-divider" aria-hidden="true"><span>下一位孩子</span></div>}
        </section>)}</div>
      </>}
    </PageTransition>
  </AppShell>
}
