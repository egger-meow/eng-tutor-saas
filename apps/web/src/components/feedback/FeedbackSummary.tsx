import type { MaterialFeedback } from '../../lib/materials'

export function FeedbackSummary({ feedback }: { feedback: MaterialFeedback | null }) {
  if (!feedback) return <p className="muted">尚未填寫本週回饋。完成後只需要幾分鐘告訴我們孩子的感受。</p>
  return (
    <div className="feedback-summary">
      <span className="status-label status-success">已收到回饋</span>
      <p>完成 {feedback.completion_rate ?? 0}% · 難度 {feedback.difficulty ?? 3}/5{feedback.weak_area ? ` · 加強 ${feedback.weak_area}` : ''}</p>
    </div>
  )
}

