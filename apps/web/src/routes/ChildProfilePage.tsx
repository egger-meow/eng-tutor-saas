import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { ProfileSummary } from '../components/profile/ProfileSummary'
import { useParentData } from '../hooks/use-parent-data'
import { archiveChild } from '../lib/children'
import { gradeStageLabel } from '../lib/grade-stage'
import { getSupabaseClient } from '../lib/supabase'

export function ChildProfilePage({ session, childId }: { session: Session; childId?: string }) {
  const data = useParentData(session.user.id)
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState('')
  const requestedChild = data.children.find((item) => item.id === childId) ?? null

  async function confirmArchive(targetChildId: string) {
    if (archiveBusyId) return
    setArchiveBusyId(targetChildId)
    setArchiveError('')
    try {
      await archiveChild(targetChildId)
      setArchiveConfirmId(null)
      await data.refresh()
      if (childId === targetChildId) navigate('/')
    } catch (caught) {
      setArchiveError(caught instanceof Error ? caught.message : '無法移除孩子，請稍後再試。')
    } finally {
      setArchiveBusyId(null)
    }
  }

  return <AppShell header={<ParentNavigation email={session.user.email} childHref={requestedChild ? `/children/${requestedChild.id}` : '/children'} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <PageTransition>
      {data.loading ? <div className="loading-state" role="status"><div className="loading-spinner" /><p>載入孩子資料中…</p></div> : data.error ? <p className="notice notice-error">{data.error}</p> : data.children.length === 0 ? <p className="notice notice-error">找不到可查看的孩子資料。</p> : <>
        <header className="profile-header"><div><p className="overline">孩子資料</p><h1>所有孩子的學習資料</h1><p>{requestedChild ? `目前從 ${requestedChild.display_name} 進入` : '查看每個孩子的程度、進度與學習目標'}</p></div></header>
        <p className="profile-note">每個孩子的資料會分開呈現，更新資料不會影響其他孩子。</p>
        <div className="all-child-profiles">{data.children.map((child, index) => <section className="child-profile-section" key={child.id}>
          <header className="child-profile-heading"><div><p className="overline">孩子資料</p><h2>{child.display_name}</h2><p>{gradeStageLabel(child)}</p></div><button className="button" type="button" onClick={() => navigate(`/children/${child.id}/edit`)}>編輯 {child.display_name} 資料</button></header>
          <ProfileSummary child={child} />
          <section className="empty-state" aria-label={`移除 ${child.display_name}`}>
            <h3>移除孩子</h3>
            {archiveConfirmId === child.id ? <>
              <p>確定要移除 {child.display_name} 嗎？移除後會從家長介面隱藏，過往教材與帳務紀錄仍會保留。</p>
              <p className="muted">若這位孩子仍有付費訂閱，系統會阻止移除，請先到訂閱頁取消並等方案結束。</p>
              <div className="onboarding-actions">
                <button className="button" type="button" disabled={archiveBusyId === child.id} onClick={() => void confirmArchive(child.id)}>{archiveBusyId === child.id ? '處理中…' : '確認移除'}</button>
                <button className="button button-secondary" type="button" disabled={archiveBusyId === child.id} onClick={() => { setArchiveConfirmId(null); setArchiveError('') }}>保留孩子</button>
              </div>
              {archiveError && <p className="notice notice-error" role="alert">{archiveError}</p>}
            </> : <>
              <p className="muted">如果是不小心重複建立，或之後不再使用這份孩子資料，可以從這裡安全移除。</p>
              <button className="button button-secondary" type="button" onClick={() => { setArchiveConfirmId(child.id); setArchiveError('') }}>移除孩子</button>
            </>}
          </section>
          {index < data.children.length - 1 && <div className="child-profile-divider" aria-hidden="true"><span>下一位孩子</span></div>}
        </section>)}</div>
      </>}
    </PageTransition>
  </AppShell>
}
