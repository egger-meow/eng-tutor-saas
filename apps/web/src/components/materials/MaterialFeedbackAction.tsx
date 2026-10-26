import { handleInternalLink } from '../../app/use-route'
import type { RefObject } from 'react'
import type { Material } from '../../lib/materials'
import { useMaterialProgress } from './MaterialProgress'

export function MaterialFeedbackAction({ material, open, onToggle, buttonRef }: { material: Material; open: boolean; onToggle: () => void; buttonRef?: RefObject<HTMLButtonElement | null> }) {
  const progress = useMaterialProgress(material.id)
  if (progress.loading) return <span className="muted feedback-progress-hint">正在確認回饋入口…</span>
  if (progress.failed) return <button type="button" className="button button-secondary" onClick={progress.retry}>重試進度</button>
  if (progress.submission || material.answer_unlock_requires_submission === false) {
    const label = open ? '收起回饋' : material.feedback ? '修改回饋' : progress.submission ? '＋ 補充家長觀察／回饋（選填）' : '紙筆做過了，填寫學習觀察'
    return <button ref={buttonRef} type="button" className="button button-secondary feedback-entry-action" aria-label={label} aria-expanded={open} aria-controls={`feedback-${material.id}`} onClick={onToggle}>
      <span aria-hidden="true">{open ? '−' : material.feedback ? '↗' : '+'}</span>{open ? '收起回饋' : material.feedback ? '修改回饋' : '補充觀察'}
    </button>
  }
  return <a className="feedback-start-link" href={`/materials/${material.id}`} onClick={handleInternalLink}>先到教材完成提交 <span aria-hidden="true">→</span></a>
}
