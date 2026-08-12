import { useState, type FormEvent } from 'react'
import { saveFeedback, type FeedbackInput, type Material } from '../../lib/materials'

type FeedbackFormProps = { material: Material; onSaved: () => void }

export function FeedbackForm({ material, onSaved }: FeedbackFormProps) {
  const existing = material.feedback
  const [input, setInput] = useState<FeedbackInput>({
    difficulty: existing?.difficulty ?? 3,
    completion_rate: existing?.completion_rate ?? 100,
    weak_area: existing?.weak_area ?? null,
    mistakes_text: existing?.mistakes_text ?? '',
    child_comments: existing?.child_comments ?? '',
    parent_comments: existing?.parent_comments ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await saveFeedback(material.child_id, material.id, input)
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '回饋儲存失敗，請稍後再試。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="feedback-form" onSubmit={submit}>
      <label>完成程度
        <select value={input.completion_rate} onChange={(event) => setInput({ ...input, completion_rate: Number(event.target.value) })}>
          {[0, 25, 50, 75, 100].map((value) => <option key={value} value={value}>{value}%</option>)}
        </select>
      </label>
      <label>整體難度
        <select value={input.difficulty} onChange={(event) => setInput({ ...input, difficulty: Number(event.target.value) })}>
          <option value={1}>太簡單</option><option value={2}>稍簡單</option><option value={3}>剛好</option><option value={4}>稍難</option><option value={5}>太難</option>
        </select>
      </label>
      <label>最需要加強
        <select value={input.weak_area ?? ''} onChange={(event) => setInput({ ...input, weak_area: event.target.value || null })}>
          <option value="">沒有特別</option><option value="vocabulary">單字</option><option value="grammar">文法</option><option value="reading">閱讀</option><option value="writing">寫作</option><option value="mixed">綜合</option>
        </select>
      </label>
      <label className="field-wide">常見錯誤或不熟的地方<textarea maxLength={4000} value={input.mistakes_text} onChange={(event) => setInput({ ...input, mistakes_text: event.target.value })} /></label>
      <label className="field-wide">孩子怎麼說<textarea maxLength={2000} value={input.child_comments} onChange={(event) => setInput({ ...input, child_comments: event.target.value })} /></label>
      <label className="field-wide">家長補充<textarea maxLength={2000} value={input.parent_comments} onChange={(event) => setInput({ ...input, parent_comments: event.target.value })} /></label>
      <div className="field-wide"><button className="button" type="submit" disabled={busy}>{busy ? '儲存中…' : existing ? '更新本週回饋' : '送出本週回饋'}</button></div>
      {error && <p className="field-wide notice notice-error" role="alert">{error}</p>}
    </form>
  )
}

