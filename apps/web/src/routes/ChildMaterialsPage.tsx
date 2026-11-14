import type { Session } from '@supabase/supabase-js'
import { handleInternalLink } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { MaterialHistory } from '../components/materials/MaterialHistory'
import { useParentData } from '../hooks/use-parent-data'
import { isMaterialReleased } from '../lib/materials'
import { getSupabaseClient } from '../lib/supabase'

export function ChildMaterialsPage({ session, childId }: { session: Session; childId: string }) {
  const data = useParentData(session.user.id)
  const child = data.children.find(item => item.id === childId)
  const materials = data.getMaterialsForChild(childId).filter(material => isMaterialReleased(material))

  return <AppShell header={<ParentNavigation email={session.user.email} childHref={child ? `/children/${child.id}` : '/children'} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <PageTransition>
      <header className="profile-header"><div><p className="overline">教材紀錄</p><h1>{child ? `${child.display_name} 的所有教材` : '所有教材'}</h1><p>從這裡接續作答、查看提交結果，或下載已開放的教材。</p></div></header>
      <a className="text-link" href="/dashboard" onClick={handleInternalLink}>← 返回學習總覽</a>
      {data.loading ? <p role="status">正在載入教材…</p> : <>
        {data.error && <div className="notice notice-error" role="alert"><p>{data.error}</p><button type="button" className="button button-secondary" onClick={() => void data.refresh()}>重試載入</button></div>}
        {!data.error && !child ? <p className="notice">找不到可查看的孩子資料。</p> : child && <MaterialHistory materials={materials} childName={child.display_name} onFeedbackSaved={() => void data.refresh()} hasMore={Boolean(data.materialHasMore[childId])} loadingMore={Boolean(data.loadingMoreMaterials[childId])} onLoadMore={() => void data.loadMoreMaterials(childId)} />}
      </>}
    </PageTransition>
  </AppShell>
}
