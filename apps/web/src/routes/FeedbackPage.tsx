import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { FeedbackForm } from '../components/feedback/FeedbackForm'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'
import type { OwnedMaterial } from '../lib/authenticated-material-loader'
import { handleInternalLink } from '../app/use-route'

export function FeedbackPage({ session, materialId }: { session: Session; materialId: string }) {
  const [material, setMaterial] = useState<OwnedMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    void (async () => {
      const client = getSupabaseClient()
      const { data, error } = await client.rpc('get_owned_released_material', { p_material_id: materialId }).maybeSingle()
      if (error) throw error
      if (!data) return null
      const { data: feedback, error: feedbackError } = await client.from('feedback')
        .select('difficulty, completion_rate, weak_area, mistakes_text, child_comments, parent_comments, created_at, updated_at')
        .eq('material_id', materialId).maybeSingle()
      if (feedbackError) throw feedbackError
      return { ...data, feedback } as OwnedMaterial
    })().then((next) => { if (active) setMaterial(next) }).catch(() => { if (active) setFailed(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [materialId, session.user.id, attempt])
  return <AppShell header={<ParentNavigation email={session.user.email} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <PageTransition>
      <section className="feedback-page narrow-page">
        {loading ? <p role="status">正在載入本週回饋…</p> : failed ? <div role="alert"><h1>回饋暫時無法載入</h1><button className="button" type="button" onClick={() => setAttempt((n) => n + 1)}>再試一次</button></div>
          : !material ? <><h1>找不到這份教材</h1><p>教材尚未開放，或不屬於目前登入的家庭。</p></>
            : <><p className="overline">家長回饋（選填）</p><h1>{material.child_name}的學習觀察</h1>
              <a className="button" href={`/materials/${material.id}`} onClick={handleInternalLink}>返回教材／查看結果／申請下一份</a>
              {material.feedback ? <FeedbackForm key={material.id} material={material} onSaved={() => setAttempt((n) => n + 1)} />
                : <p className="lede">請從教材提交頁選擇填寫或略過回饋，再申請下一份。</p>}</>}
        <p><a className="text-link" href="/dashboard" onClick={handleInternalLink}>返回所有教材與學習紀錄</a></p>
      </section>
    </PageTransition>
  </AppShell>
}
