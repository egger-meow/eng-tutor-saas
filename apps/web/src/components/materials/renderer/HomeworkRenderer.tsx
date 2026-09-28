import type { HomeworkSection } from '../../../types/student-material'
import { QuestionRenderer } from './QuestionRenderer'

export interface HomeworkRendererProps {
  homework?: HomeworkSection
  draftAnswers: Record<string, string>
  onAnswerChange: (key: string, value: string, immediate?: boolean) => void
}

export function HomeworkRenderer({
  homework,
  draftAnswers,
  onAnswerChange,
}: HomeworkRendererProps) {
  if (!homework || !homework.questions || homework.questions.length === 0) return null

  return (
    <section id="chapter-homework" className="paper-sheet" aria-labelledby="heading-homework">
      <div className="paper-section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="paper-section-step">Step 7 · 延遲提取作業</span>
            <h2 id="heading-homework" className="paper-section-title">
              課後自主複習與產出作業
            </h2>
          </div>
          {homework.estimatedMinutes && (
            <span className="vocab-status-badge status-review">
              預計需時 {homework.estimatedMinutes} 分鐘
            </span>
          )}
        </div>
        <p className="paper-section-desc">
          {homework.purposeZh || '建議於讀完教材隔日或週末進行，深化長期記憶提取能力。'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {homework.questions.map((question, idx) => (
          <QuestionRenderer
            key={question.id || question.questionId || idx}
            question={question}
            index={idx}
            draftAnswers={draftAnswers}
            onAnswerChange={onAnswerChange}
          />
        ))}
      </div>
    </section>
  )
}
