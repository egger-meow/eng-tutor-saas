import { useState } from 'react'
import { openMaterialDownload, type Material } from '../../lib/materials'

type MaterialActionsProps = { material: Material; childName: string }

export function MaterialActions({ material, childName }: MaterialActionsProps) {
  const [busy, setBusy] = useState<'student' | 'parent' | null>(null)
  const [error, setError] = useState('')

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
      <div className="material-actions">
        <button className="button" type="button" disabled={busy !== null} onClick={() => void download('student')}>{busy === 'student' ? '準備中…' : '下載學生教材'}</button>
        <button className="button button-secondary" type="button" disabled={busy !== null} onClick={() => void download('parent')}>{busy === 'parent' ? '準備中…' : '下載家長解答'}</button>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
    </div>
  )
}

