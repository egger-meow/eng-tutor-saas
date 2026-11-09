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
      <svg className="feedback-entry-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {open ? <path d="M5 12h14" /> : material.feedback ? <><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z" /></> : <path d="M5 12h14M12 5v14" />}
      </svg>{open ? '收起回饋' : material.feedback ? '修改回饋' : '補充觀察'}
    </button>
  }
  return <a className="feedback-start-link" href={`/materials/${material.id}`} onClick={handleInternalLink}>先到教材完成提交 <span aria-hidden="true">→</span></a>
}
