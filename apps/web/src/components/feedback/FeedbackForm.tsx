import { useState, type FormEvent } from 'react'
import { saveFeedback, type FeedbackInput, type Material } from '../../lib/materials'

type FeedbackFormProps = { material: Material; onSaved: () => void }

export function FeedbackForm({ material, onSaved }: FeedbackFormProps) {
  const existing = material.feedback
  const hasExistingDetails = Boolean(existing?.mistakes_text || existing?.child_comments || existing?.parent_comments)
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
  const [detailsOpen, setDetailsOpen] = useState(hasExistingDetails)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await saveFeedback(material.child_id, material.id, input)
      onSaved()
    } catch (caught) {
      console.error('Weekly feedback save failed', caught)
      setError('目前無法儲存回饋，請稍後再試。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="feedback-form" onSubmit={submit}>
      <div className="feedback-intro field-wide">
        <h3>用幾個選項告訴我們這週的狀況</h3>
        <p className="muted">不用寫文字也可以送出，大約十幾秒就能完成。</p>
      </div>

      <FeedbackChoice
        legend="這週完成多少？"
        name={`completion-${material.id}`}
        value={input.completion_rate}
        options={[[0, '還沒開始'], [50, '做了一部分'], [75, '大部分完成'], [100, '全部完成']]}
        onChange={(completion_rate) => setInput({ ...input, completion_rate })}
      />
      <FeedbackChoice
        legend="整體難度如何？"
        name={`difficulty-${material.id}`}
        value={input.difficulty}
        options={[[1, '太簡單'], [3, '剛剛好'], [5, '太難']]}
        onChange={(difficulty) => setInput({ ...input, difficulty })}
      />
      <fieldset className="feedback-question field-wide">
        <legend>最需要加強哪裡？</legend>
        <div className="choice-group">
          {[
            ['', '沒有特別'], ['vocabulary', '單字'], ['grammar', '文法'],
            ['reading', '閱讀'], ['writing', '寫作'], ['mixed', '不只一項'],
          ].map(([value, label]) => (
            <label className="choice-chip" key={value}>
              <input
                type="radio"
                name={`weak-area-${material.id}`}
                value={value}
                checked={(input.weak_area ?? '') === value}
                onChange={() => setInput({ ...input, weak_area: value || null })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="feedback-details-toggle field-wide">
        <button
          className="button-link text-link"
          type="button"
          aria-expanded={detailsOpen}
          aria-controls={`feedback-details-${material.id}`}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? '－ 收起選填細節' : '＋ 有錯題或其他觀察想補充'}
        </button>
        <span>選填，不影響送出</span>
      </div>

      {detailsOpen && (
        <div className="feedback-details field-wide" id={`feedback-details-${material.id}`}>
          <label>哪裡容易錯、哪些內容還不熟？
            <span>例如：do / does 常分不清，或第 3 題看不懂。</span>
            <textarea maxLength={4000} placeholder="有觀察到再填就好" value={input.mistakes_text} onChange={(event) => setInput({ ...input, mistakes_text: event.target.value })} />
          </label>
          <label>孩子怎麼說？
            <span>例如：這篇很好看、文章太簡單、文法看不懂。</span>
            <textarea maxLength={2000} placeholder="可以記下孩子的原話" value={input.child_comments} onChange={(event) => setInput({ ...input, child_comments: event.target.value })} />
          </label>
          <label>還有什麼想讓下週教材知道？
            <span>例如：學校開始教現在進行式，或最近迷上新的動漫。</span>
            <textarea maxLength={2000} placeholder="學校進度、考試、興趣變化或其他觀察" value={input.parent_comments} onChange={(event) => setInput({ ...input, parent_comments: event.target.value })} />
          </label>
        </div>
      )}

      <div className="feedback-submit field-wide">
        <button className="button" type="submit" disabled={busy}>{busy ? '儲存中…' : existing ? '更新本週回饋' : '送出本週回饋'}</button>
        <p className="muted">回饋會用於下一份教材，不會改動這一週的內容。</p>
      </div>
      {error && <p className="field-wide notice notice-error" role="alert">{error}</p>}
    </form>
  )
}

type FeedbackChoiceProps = {
  legend: string
  name: string
  value: number
  options: Array<[number, string]>
  onChange: (value: number) => void
}

function FeedbackChoice({ legend, name, value, options, onChange }: FeedbackChoiceProps) {
  return (
    <fieldset className="feedback-question field-wide">
      <legend>{legend}</legend>
      <div className="choice-group">
        {options.map(([optionValue, label]) => (
          <label className="choice-chip" key={optionValue}>
            <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
