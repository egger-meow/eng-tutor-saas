import { useState } from 'react'
import { isMaterialReleased, openMaterialDownload, type Material } from '../../lib/materials'

type MaterialActionsProps = { material: Material; childName: string }

export function MaterialActions({ material, childName }: MaterialActionsProps) {
  const [busy, setBusy] = useState<'student' | 'parent' | null>(null)
  const [error, setError] = useState('')
  const released = isMaterialReleased(material)

  async function download(kind: 'student' | 'parent') {
    setBusy(kind)
    setError('')
    const path = kind === 'student' ? material.student_pdf_path : material.parent_answer_pdf_path
    const suffix = kind === 'student' ? '學生教材' : '家長解答'
    try { await openMaterialDownload(path, `${childName}-${material.material_week}-${suffix}.pdf`) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '下載失敗，請稍後再試。') }
    finally { setBusy(null) }
  }

  return (
    <div>
      {!released && material.release_at && <p className="muted">教材已準備完成，於 {new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(material.release_at))} 開放下載。</p>}
      <div className="material-actions">
        <button className="button" type="button" disabled={!released || busy !== null} onClick={() => void download('student')}>{busy === 'student' ? '準備中…' : released ? '下載學生教材' : '尚未開放下載'}</button>
        <button className="button button-secondary" type="button" disabled={!released || busy !== null} onClick={() => void download('parent')}>{busy === 'parent' ? '準備中…' : released ? '下載家長解答' : '尚未開放下載'}</button>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
    </div>
  )
}
