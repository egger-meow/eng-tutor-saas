import { useState, type FormEvent } from 'react'
import { productFeedbackCategories, saveProductFeedback, type ProductFeedbackCategory } from '../../lib/product-feedback'

const labels: Record<ProductFeedbackCategory, string> = {
  bug: '發現問題', flow: '操作流程', materials: '教材內容', other: '其他建議',
}

export function ProductFeedbackForm() {
  const [category, setCategory] = useState<ProductFeedbackCategory>('flow')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setStatus('')
    try {
      await saveProductFeedback({ category, message })
      setMessage(''); setStatus('謝謝你！你的回饋已送出。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '回饋暫時無法送出，請稍後再試。')
    } finally { setBusy(false) }
  }

  return <form className="product-feedback-form" onSubmit={submit}>
    <fieldset>
      <legend>這是哪一類回饋？</legend>
      <div className="choice-group">{productFeedbackCategories.map((option) => <label className="choice-chip" key={option}>
        <input type="radio" name="feedback-category" value={option} checked={category === option} onChange={() => setCategory(option)} />
        <span>{labels[option]}</span>
      </label>)}</div>
    </fieldset>
    <label className="product-feedback-message">想告訴我們什麼？
      <span>例如遇到的問題、哪一個步驟不清楚，或你對教材的建議。</span>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} required placeholder="請寫下你的想法…" />
    </label>
    <div className="product-feedback-submit"><button className="button" type="submit" disabled={busy}>{busy ? '送出中…' : '送出回饋'}</button><span className="muted">回饋只會儲存在系統中，不會寄送 email。</span></div>
    {status && <p className="notice notice-success" role="status">{status}</p>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
  </form>
}
