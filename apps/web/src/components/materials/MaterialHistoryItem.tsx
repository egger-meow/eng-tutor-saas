import { useState } from 'react'
import { handleInternalLink } from '../../app/use-route'
import { FeedbackForm } from '../feedback/FeedbackForm'
import { FeedbackSummary } from '../feedback/FeedbackSummary'
import { MaterialActions } from './MaterialActions'
import { isMaterialReleased, readGenerationSummary, type Material } from '../../lib/materials'

type MaterialHistoryItemProps = { material: Material; childName: string; onFeedbackSaved: () => void }

export function MaterialHistoryItem({ material, childName, onFeedbackSaved }: MaterialHistoryItemProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const summary = readGenerationSummary(material.generation_summary)
  const released = isMaterialReleased(material)
  return (
    <article className="material-history-item">
      <div className="material-heading">
        <div>
          <p className="overline">{material.material_week}</p>
          <h3>
            {released ? (
              <a
                href={`/materials/${material.id}`}
                onClick={handleInternalLink}
                className="text-link"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {summary.title ?? `第 ${material.material_week} 週教材`}
              </a>
            ) : (
              summary.title ?? `第 ${material.material_week} 週教材`
            )}
          </h3>
        </div>
        <span className="revision">第 {material.revision} 版</span>
      </div>
      {summary.learningAdjustmentSummary && <p className="muted">{summary.learningAdjustmentSummary}</p>}
      <MaterialActions material={material} childName={childName} showPreviewLink={true} />
      <FeedbackSummary feedback={material.feedback} />
      {released && material.feedback ? (
        <button className="text-link button-link" type="button" onClick={() => setFeedbackOpen((open) => !open)}>{feedbackOpen ? '收起回饋' : '修改回饋'}</button>
      ) : released ? (
        material.answer_unlock_requires_submission === false ? (
          <button className="text-link button-link" type="button" onClick={() => setFeedbackOpen((open) => !open)}>
            {feedbackOpen ? '收起回饋' : '紙筆做過了，填寫學習觀察'}
          </button>
        ) : (
          <a className="text-link" href={`/materials/${material.id}`} onClick={handleInternalLink}>閱讀並提交教材後，可選填回饋</a>
        )
      ) : null}
      {feedbackOpen && <FeedbackForm material={material} onSaved={() => { setFeedbackOpen(false); onFeedbackSaved() }} />}
    </article>
  )
}
