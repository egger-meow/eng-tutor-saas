import { useState } from 'react'
import { FeedbackForm } from '../feedback/FeedbackForm'
import { FeedbackSummary } from '../feedback/FeedbackSummary'
import { MaterialActions } from './MaterialActions'
import { readGenerationSummary, type Material } from '../../lib/materials'

type MaterialHistoryItemProps = { material: Material; childName: string; onFeedbackSaved: () => void }

export function MaterialHistoryItem({ material, childName, onFeedbackSaved }: MaterialHistoryItemProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const summary = readGenerationSummary(material.generation_summary)
  return (
    <article className="material-history-item">
      <div className="material-heading">
        <div><p className="overline">{material.material_week}</p><h3>{summary.title ?? `第 ${material.material_week} 週教材`}</h3></div>
        <span className="revision">第 {material.revision} 版</span>
      </div>
      {summary.learningAdjustmentSummary && <p className="muted">{summary.learningAdjustmentSummary}</p>}
      <MaterialActions material={material} childName={childName} />
      <FeedbackSummary feedback={material.feedback} />
      <button className="text-link button-link" type="button" onClick={() => setFeedbackOpen((open) => !open)}>{feedbackOpen ? '收起回饋' : material.feedback ? '修改回饋' : '填寫回饋'}</button>
      {feedbackOpen && <FeedbackForm material={material} onSaved={() => { setFeedbackOpen(false); onFeedbackSaved() }} />}
    </article>
  )
}

