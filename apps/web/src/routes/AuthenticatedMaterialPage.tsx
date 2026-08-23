import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { MaterialActions } from '../components/materials/MaterialActions'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'
import type { Material } from '../lib/materials'

type OwnedMaterial = Material & { child_name: string }

export function AuthenticatedMaterialPage({ session, materialId }: { session: Session; materialId: string }) {
  const [material, setMaterial] = useState<OwnedMaterial | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void getSupabaseClient().rpc('get_owned_released_material', { p_material_id: materialId }).maybeSingle()
      .then(({ data }) => { setMaterial(data as OwnedMaterial | null); setReady(true) }, () => setReady(true))
  }, [materialId])
  return <AppShell header={<ParentNavigation email={session.user.email} onSignOut={() => void getSupabaseClient().auth.signOut()} />}><PageTransition>
    {!ready ? <div className="loading-state" role="status"><div className="loading-spinner" /><p>正在載入教材…</p></div> : !material ? <section className="surface-card"><h1>找不到這份教材</h1><p className="muted">教材尚未開放，或不屬於這個帳戶。</p><a className="button" href="/dashboard">返回 Dashboard</a></section> : <section className="surface-card"><p className="overline">{material.child_name} · {material.material_week}</p><h1>本週教材</h1><MaterialActions material={material} childName={material.child_name} /><p><a className="text-link" href="/dashboard">查看所有教材與學習紀錄</a></p></section>}
  </PageTransition></AppShell>
}
