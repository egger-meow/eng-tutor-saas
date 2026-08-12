import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { ProfileSummary } from '../components/profile/ProfileSummary'
import { useParentData } from '../hooks/use-parent-data'
import { getSupabaseClient } from '../lib/supabase'

export function ChildProfilePage({ session, childId }: { session: Session; childId: string }) {
  const data = useParentData()
  const child = data.children.find((item) => item.id === childId) ?? null
  return <AppShell header={<ParentNavigation email={session.user.email} activeChildId={childId} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    {data.loading ? <p className="loading-state" role="status">正在載入孩子資料…</p> : data.error ? <p className="notice notice-error">{data.error}</p> : !child ? <p className="notice notice-error">找不到這位孩子，或你沒有存取權限。</p> : <>
      <header className="profile-header"><div><p className="overline">孩子學習資料</p><h1>{child.display_name}</h1><p>國中 {child.grade} 年級</p></div><button className="button" type="button" onClick={() => navigate(`/children/${child.id}/edit`)}>編輯未來教材設定</button></header>
      <p className="profile-note">修改只會影響未來產生的教材，已完成的 PDF 會保持原樣。</p>
      <ProfileSummary child={child} />
    </>}
  </AppShell>
}

