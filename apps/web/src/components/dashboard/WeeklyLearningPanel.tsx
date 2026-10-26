import { useState } from 'react'
import { handleInternalLink } from '../../app/use-route'
import type { Material } from '../../lib/materials'
import { isMaterialReleased, readGenerationSummary } from '../../lib/materials'
import { MaterialFeedbackPanel } from '../feedback/MaterialFeedbackPanel'
import { MaterialActions } from '../materials/MaterialActions'
import { MaterialEvidenceCard } from './MaterialEvidenceCard'
import { MaterialProgressProvider, useMaterialProgress } from '../materials/MaterialProgress'
import { LearningBarrierCard } from './LearningBarrierCard'

type WeeklyLearningPanelProps = { material: Material; childName: string; onFeedbackSaved: () => void }

export function WeeklyLearningPanel({ material, childName, onFeedbackSaved }: WeeklyLearningPanelProps) {
  return <MaterialProgressProvider key={material.id} materialId={material.id}><WeeklyLearningContent material={material} childName={childName} onFeedbackSaved={onFeedbackSaved} /></MaterialProgressProvider>
}

function WeeklyLearningContent({ material, childName, onFeedbackSaved }: WeeklyLearningPanelProps) {
  const progress = useMaterialProgress(material.id)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const summary = readGenerationSummary(material.generation_summary)
  const released = isMaterialReleased(material)
  return (
    <section className="weekly-panel" aria-labelledby={`weekly-title-${material.id}`}>
      <div className="weekly-copy">
        <p className="overline">本週學習 · {material.material_week}</p>
        <h2 id={`weekly-title-${material.id}`}>
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
      {released && (
        <MaterialEvidenceCard
          materialId={material.id}
          answerUnlockRequiresSubmission={material.answer_unlock_requires_submission}
          nextRequested={Boolean(progress.submission?.next_requested)}
          nextRequestStatus={progress.submission?.next_request_status}
          onOpenFeedback={() => setFeedbackOpen(true)}
        />
      )}
      {released && !progress.loading && !progress.failed && (
        <LearningBarrierCard
          materialId={material.id}
          childId={material.child_id}
          releasedAt={material.release_at ?? material.created_at}
          hasSubmission={Boolean(progress.submission)}
          hasAnswerStarted={progress.started}
          hasPaperStarted={Boolean(material.feedback && !material.answer_unlock_requires_submission)}
          answerUnlockRequiresSubmission={material.answer_unlock_requires_submission}
        />
      )}
      {released && <MaterialFeedbackPanel material={material} open={feedbackOpen} onOpenChange={setFeedbackOpen} onSaved={onFeedbackSaved} />}
    </section>
  )
}
