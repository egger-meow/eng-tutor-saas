import { useEffect, useState } from 'react'
import { fetchMaterialDraft, fetchStudentSubmission } from '../../lib/student-material-api'

export function MaterialLearningStatus({ materialId }: { materialId: string }) {
  const [label, setLabel] = useState('正在確認學習進度…')
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    setFailed(false)
    setLabel('正在確認學習進度…')
    void (async () => {
      const submission = await fetchStudentSubmission(materialId)
      if (submission) {
        if (submission.next_request_status === 'failed' || submission.next_request_status === 'canceled') {
          return '已提交 · 下一份未完成，請聯絡我們協助恢復'
        }
        return submission.next_requested ? '已提交 · 已申請下一份' : '已提交 · 可查看結果及申請下一份'
      }
      const { data, error } = await fetchMaterialDraft(materialId)
      if (error) throw error
      return data?.updated_at ? '草稿已保存 · 繼續作答' : '可開始閱讀與作答'
    })().then((next) => { if (active) setLabel(next) }).catch(() => {
      if (active) { setLabel('進度暫時無法確認，仍可開啟教材'); setFailed(true) }
    })
    return () => { active = false }
  }, [materialId, attempt])
  return <p className="muted" role="status">{label} {failed && <button type="button" className="button-link text-link" onClick={() => setAttempt((n) => n + 1)}>重試進度</button>}</p>
}
