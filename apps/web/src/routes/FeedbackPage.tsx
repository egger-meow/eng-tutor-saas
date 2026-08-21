import type { Session } from '@supabase/supabase-js'
import { FeedbackForm } from '../components/feedback/FeedbackForm'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { useParentData } from '../hooks/use-parent-data'
import { getSupabaseClient } from '../lib/supabase'

export function FeedbackPage({ session, materialId }: { session: Session; materialId: string }) {
  const data = useParentData(session.user.id)
  const material = data.materials.find((item) => item.id === materialId) ?? null
  const child = material ? data.children.find((item) => item.id === material.child_id) ?? null : null

  return (
    <AppShell header={<ParentNavigation email={session.user.email} childHref={child ? `/children/${child.id}` : '/dashboard'} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
      <PageTransition>
        {data.loading ? <div className="loading-state" role="status"><div className="loading-spinner" /><p>正在載入本週回饋…</p></div>
          : data.error ? <p className="notice notice-error" role="alert">{data.error}</p>
            : !material ? <section className="error-state"><h1>找不到這份教材</h1><p>這份教材可能不存在，或不屬於目前登入的家庭。</p></section>
              : <section className="feedback-page narrow-page"><p className="overline">每週回饋</p><h1>{child?.display_name ?? '孩子'}的學習觀察</h1><p className="lede">幾個簡短訊號會成為下一週教材的調整依據。</p><FeedbackForm material={material} onSaved={() => void data.refresh()} /></section>}
      </PageTransition>
    </AppShell>
  )
}
