import { handleInternalLink } from '../../app/use-route'
import type { Material } from '../../lib/materials'
import { useMaterialProgress } from './MaterialProgress'

export function MaterialFeedbackAction({ material, open, onToggle }: { material: Material; open: boolean; onToggle: () => void }) {
  const progress = useMaterialProgress(material.id)
  if (progress.loading) return null
  if (progress.failed) return <p className="muted">確認提交狀態後即可補充觀察。<button type="button" className="button-link text-link" onClick={progress.retry}>重試進度</button></p>
  if (progress.submission || material.answer_unlock_requires_submission === false) return <button type="button" className="button-link text-link" aria-expanded={open} aria-controls={`feedback-${material.id}`} onClick={onToggle}>{open ? '收起回饋' : material.feedback ? '修改回饋' : progress.submission ? '＋ 補充家長觀察／回饋（選填）' : '紙筆做過了，填寫學習觀察'}</button>
  return <a className="text-link" href={`/materials/${material.id}`} onClick={handleInternalLink}>前往教材閱讀與作答，提交後可補充家長觀察</a>
}
