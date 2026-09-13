import { useState } from 'react'
import { handleInternalLink } from '../../app/use-route'
import type { Material } from '../../lib/materials'
import { isMaterialReleased, readGenerationSummary } from '../../lib/materials'
import { FeedbackForm } from '../feedback/FeedbackForm'
import { FeedbackSummary } from '../feedback/FeedbackSummary'
import { MaterialActions } from '../materials/MaterialActions'

type WeeklyLearningPanelProps = { material: Material; childName: string; onFeedbackSaved: () => void }

export function WeeklyLearningPanel({ material, childName, onFeedbackSaved }: WeeklyLearningPanelProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const summary = readGenerationSummary(material.generation_summary)
  const released = isMaterialReleased(material)
  return (
    <section className="weekly-panel" aria-labelledby="weekly-title">
      <div className="weekly-copy">
        <p className="overline">本週學習 · {material.material_week}</p>
        <h2 id="weekly-title">
          {released ? (
            <a
              href={`/materials/${material.id}`}
              onClick={handleInternalLink}
              className="text-link"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {summary.title ?? '本週個人化英文教材'}
            </a>
          ) : (
            summary.title ?? '本週個人化英文教材'
          )}
        </h2>
        <p className="weekly-focus">{summary.learningFocus ?? '從自然閱讀開始，再練習單字、文法與理解。'}</p>
      </div>
      <MaterialActions material={material} childName={childName} showPreviewLink={true} />
      <div className="weekly-feedback">
        <FeedbackSummary feedback={material.feedback} />
        <button className="button-link text-link" type="button" onClick={() => setFeedbackOpen((open) => !open)}>{feedbackOpen ? '收起' : material.feedback ? '修改回饋' : '填寫本週回饋'}</button>
      </div>
      {feedbackOpen && <FeedbackForm material={material} onSaved={() => { setFeedbackOpen(false); onFeedbackSaved() }} />}
    </section>
  )
}

