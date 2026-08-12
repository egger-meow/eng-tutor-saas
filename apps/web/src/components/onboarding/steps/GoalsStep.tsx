import type { OnboardingStepProps } from '../step-types'

export function GoalsStep({ draft, errors, update }: OnboardingStepProps) {
  return <>
    <label>這段時間最希望改善什麼？<textarea value={draft.learningGoals} onChange={(event) => update({ learningGoals: event.target.value })} aria-invalid={Boolean(errors.learningGoals)} />{errors.learningGoals && <span className="field-error">{errors.learningGoals}</span>}</label>
    <label>已知比較弱的地方 <span className="optional">選填</span><textarea value={draft.knownWeaknesses} onChange={(event) => update({ knownWeaknesses: event.target.value })} /></label>
    <label>家長的期待 <span className="optional">選填</span><textarea value={draft.parentExpectations} onChange={(event) => update({ parentExpectations: event.target.value })} /></label>
    <label>其他補充 <span className="optional">選填</span><textarea value={draft.notes} onChange={(event) => update({ notes: event.target.value })} /></label>
    <div className="review-summary"><strong>建立後仍可修改</strong><p>新資料只會影響未來教材，已完成的 PDF 不會被改動。</p></div>
  </>
}
