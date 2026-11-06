import type { MaterialSessionPlan } from '../../../lib/material-session-plan'
import { getCurrentStep, isStepCompleted } from '../../../lib/material-session-plan'

export interface LearningStartPanelProps {
  plan: MaterialSessionPlan
  answers?: Record<string, string> | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'unsaved' | 'conflict' | 'error'
  isReadOnly?: boolean
  onJumpToChapter: (chapterId: string) => void
  onJumpToQuestion: (questionId: string) => void
  onPauseAndLeave: () => void
}

export function LearningStartPanel({
  plan,
  answers = {},
  saveStatus,
  isReadOnly = false,
  onJumpToChapter,
  onJumpToQuestion,
  onPauseAndLeave,
}: LearningStartPanelProps) {
  if (isReadOnly || plan.steps.length === 0) {
    return null
  }

  const currentStep = getCurrentStep(plan, answers)
  const stage1 = currentStep ?? plan.steps[0]
  const returning = Object.values(answers ?? {}).some(value => value.trim().length > 0)
  const hasStage1Questions = stage1.questionIds.length > 0
  const firstQuestionId = stage1.questionIds[0]

  return (
    <section
      className="paper-learning-start-panel"
      aria-label="今天先安排約 10 分鐘"
    >
      <div className="learning-start-header">
        <div className="learning-start-badge">
          <span className="learning-start-icon" aria-hidden="true">⏱️</span>
          <strong>{returning ? currentStep ? '接著完成這一段' : '作答已填寫，可以回顧檢查' : '今天先安排約 10 分鐘'}</strong>
        </div>
        <p className="learning-start-desc">
          {returning && !currentStep ? '填寫完成不代表答對或學會；仍可回看閱讀與講解，確認後再自行提交整份教材。' : stage1.descriptionZh}
        </p>
      </div>

      {/* Stage Walkway Indicators */}
      <div className="learning-stages-progress" role="navigation" aria-label="分次學習階段">
        {plan.steps.map((step, idx) => {
          const completed = isStepCompleted(step, answers)
          return (
            <div
              key={step.id}
              className={`learning-stage-chip ${completed ? 'completed' : ''}`}
            >
              <span className="stage-chip-status" aria-hidden="true">
                {completed ? '✓' : `${idx + 1}`}
              </span>
              <span className="stage-chip-label">{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Quick Action Navigation */}
      <div className="learning-start-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onJumpToChapter(stage1.chapterId)}
        >
          {returning ? '回看這一段' : '先讀這一段'}
        </button>

        {hasStage1Questions && currentStep && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onJumpToQuestion(firstQuestionId)}
          >
            {returning ? '接著作答' : stage1.questionIds.length === 1 ? '試第 1 題' : '試試前兩題'}
          </button>
        )}

        <button
          type="button"
          className="button button-secondary button-pause-learning"
          onClick={onPauseAndLeave}
          title={
            saveStatus === 'saved'
              ? '草稿已保存，可安心先停'
              : '離開前請確認草稿已完成儲存'
          }
        >
          先停，之後繼續
        </button>
      </div>

      <div className="learning-start-footnote">
        <span>{saveStatus === 'saved' ? '草稿已同步，可在其他裝置接續。' : '請確認草稿儲存成功後再離開或換裝置；尚未同步的內容可能無法接續。'}</span>
      </div>
    </section>
  )
}
