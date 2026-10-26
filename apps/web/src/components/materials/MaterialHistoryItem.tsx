import { parentLearningCopy } from '../../lib/parent-learning-copy'
import { handleInternalLink } from '../../app/use-route'
import { MaterialFeedbackPanel } from '../feedback/MaterialFeedbackPanel'
import { MaterialProgressProvider } from './MaterialProgress'
import { MaterialActions } from './MaterialActions'
import { isMaterialReleased, readGenerationSummary, type Material } from '../../lib/materials'

type MaterialHistoryItemProps = { material: Material; childName: string; onFeedbackSaved: () => void }

export function MaterialHistoryItem({ material, childName, onFeedbackSaved }: MaterialHistoryItemProps) {
  return <MaterialProgressProvider key={material.id} materialId={material.id}><MaterialHistoryContent material={material} childName={childName} onFeedbackSaved={onFeedbackSaved} /></MaterialProgressProvider>
}

function MaterialHistoryContent({ material, childName, onFeedbackSaved }: MaterialHistoryItemProps) {
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
      {summary.learningAdjustmentSummary && <p className="muted">{parentLearningCopy(summary.learningAdjustmentSummary)}</p>}
      <MaterialActions material={material} childName={childName} showPreviewLink={true} />
      {released && <MaterialFeedbackPanel material={material} onSaved={onFeedbackSaved} />}
    </article>
  )
}
