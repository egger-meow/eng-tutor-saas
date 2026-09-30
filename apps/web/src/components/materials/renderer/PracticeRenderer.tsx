import type {
  PracticeStage,
  AdaptiveExtension,
} from '../../../types/student-material'
import { QuestionRenderer } from './QuestionRenderer'

export interface PracticeRendererProps {
  practice?: PracticeStage[]
  adaptiveExtension?: AdaptiveExtension | null
  draftAnswers: Record<string, string>
  onAnswerChange: (key: string, value: string, immediate?: boolean) => void
}

function getStageBadge(stage?: string): string {
  switch (stage) {
    case 'guided':
      return '引導式練習 · Guided Practice'
    case 'independent':
      return '獨立演練 · Independent Practice'
    case 'cap-transfer':
      return '會考題型遷移 · CAP Transfer'
    case 'production':
      return '寫作與產出 · Production'
    case 'retrieval':
      return '記憶提取演練 · Retrieval'
    default:
      return '課堂實戰練習'
  }
}

export function PracticeRenderer({
  practice,
  adaptiveExtension,
  draftAnswers,
  onAnswerChange,
}: PracticeRendererProps) {
  const readOnly = useAnswerReadOnly()
  if (!practice || practice.length === 0) return null

  const isExtensionAfterPractice = adaptiveExtension && adaptiveExtension.placement === 'after-practice'

  let globalQuestionIndex = 0

  return (
    <section id="chapter-practice" className="paper-sheet" aria-labelledby="heading-practice">
      <div className="paper-section-header">
        <span className="paper-section-step">Step 5 · 綜合演練</span>
        <h2 id="heading-practice" className="paper-section-title">
          課堂實戰與理解檢核
        </h2>
        <p className="paper-section-desc">
          包含引導題型與多元會考題型，即刻檢核所學觀念。你的作答會自動保存為草稿。
        </p>
      </div>

      <div className="practice-stage-container">
        {practice.map((stage) => {
          const badgeText = getStageBadge(stage.stage)

          return (
            <div key={stage.id} className="practice-stage-card">
              <div>
                <span className="practice-stage-badge">{badgeText}</span>
                <h3 style={{ margin: 'var(--space-1) 0 var(--space-2) 0', fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                  {stage.titleZh}
                </h3>
                {stage.instructionsZh && (
                  <p className="paper-section-desc" style={{ margin: 0 }}>
                    {stage.instructionsZh}
                  </p>
                )}
                {stage.hintZh && (
                  <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-canvas)', borderRadius: 'var(--radius-control)', fontSize: '0.875rem', color: 'var(--color-action)' }}>
                    💡 提示：{stage.hintZh}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {stage.questions.map((question) => {
                  const idx = globalQuestionIndex++
                  return (
                    <QuestionRenderer
                      key={question.id || question.questionId || idx}
                      question={question}
                      index={idx}
                      draftAnswers={draftAnswers}
                      onAnswerChange={onAnswerChange}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Adaptive Extension (Placement: after-practice) */}
      {isExtensionAfterPractice && adaptiveExtension && (
        <div className="adaptive-extension-card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="adaptive-extension-header">
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-ink)' }}>
              🌟 {adaptiveExtension.titleZh}
            </h4>
            <span className="adaptive-badge">深入延伸</span>
          </div>

          <div style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
            {adaptiveExtension.contentZh}
          </div>

          {adaptiveExtension.taskZh && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-action)', marginBottom: 'var(--space-2)' }}>
                ✍️ 延伸思考練習：{adaptiveExtension.taskZh}
              </p>
              <textarea
                readOnly={readOnly}
                className="ruled-textarea"
                placeholder="寫下你的延伸思考…"
                value={draftAnswers[`adaptive-${adaptiveExtension.id}`] ?? ''}
                onChange={(e) => onAnswerChange(`adaptive-${adaptiveExtension.id}`, e.target.value)}
                rows={adaptiveExtension.taskWritingLines || 2}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
import { useAnswerReadOnly } from './AnswerReadOnlyContext'
