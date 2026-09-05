import { useState, type FormEvent } from 'react'
import { productFeedbackCategories, saveProductFeedback, type ProductFeedbackCategory } from '../../lib/product-feedback'

const labels: Record<ProductFeedbackCategory, string> = {
  bug: '發現問題',
  flow: '操作流程',
  materials: '教材內容',
  other: '其他建議',
}

export function ProductFeedbackForm() {
  const [category, setCategory] = useState<ProductFeedbackCategory>('flow')
  const [message, setMessage] = useState('')
  const [wantsPrintedDelivery, setWantsPrintedDelivery] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const trimmed = message.trim()
      const finalMessage = wantsPrintedDelivery
        ? (trimmed ? `[需求：希望未來提供紙本教材寄送到家（若約 NT$699/月）]\n${trimmed}` : '我希望未來提供紙本教材寄送到家（若約 NT$699／月）。')
        : trimmed

      await saveProductFeedback({ category, message: finalMessage })
      setMessage('')
      setWantsPrintedDelivery(false)
      setStatus('謝謝你！你的回饋已送出。')
    } catch (caught) {
      console.error('Product feedback save failed', caught)
      setError('目前無法送出回饋，請稍後再試。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="product-feedback-form" onSubmit={submit}>
      <fieldset>
        <legend>這是哪一類回饋？</legend>
        <div className="choice-group">
          {productFeedbackCategories.map((option) => (
            <label className="choice-chip" key={option}>
              <input
                type="radio"
                name="feedback-category"
                value={option}
                checked={category === option}
                onChange={() => setCategory(option)}
              />
              <span>{labels[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="feedback-demand-option">
        <label className="choice-checkbox-label">
          <input
            type="checkbox"
            name="wants-printed-delivery"
            checked={wantsPrintedDelivery}
            onChange={(e) => setWantsPrintedDelivery(e.target.checked)}
          />
          <span>我希望未來提供紙本教材寄送到家（若約 NT$699／月）</span>
        </label>
      </div>

      <label className="product-feedback-message">
        想告訴我們什麼？
        <span>例如遇到的問題、哪一個步驟不清楚，或你對教材的建議。</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={4000}
          required={!wantsPrintedDelivery}
          placeholder={wantsPrintedDelivery ? '若有其他建議可填寫（選填）…' : '請寫下你的想法…'}
        />
      </label>
      <div className="product-feedback-submit">
        <button className="button" type="submit" disabled={busy}>
          {busy ? '送出中…' : '送出回饋'}
        </button>
        <span className="muted">回饋只會儲存在系統中，不會寄送 email。</span>
      </div>
      {status && <p className="notice notice-success" role="status">{status}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
    </form>
  )
}
