import type { MaterialFeedback } from '../../lib/materials'

export function FeedbackSummary({ feedback }: { feedback: MaterialFeedback | null }) {
  if (!feedback) return <p className="muted">幾個選項，記下孩子這週的感受。</p>
  return (
    <div className="feedback-summary">
      <span className="status-label status-success">已收到回饋</span>
      <p>完成 {feedback.completion_rate ?? 0}% · {feedback.difficulty === 1 ? '覺得偏簡單' : feedback.difficulty === 5 ? '覺得偏難' : '難度剛剛好'}{feedback.weak_area ? ` · 加強 ${{ vocabulary: '單字', grammar: '文法', reading: '閱讀', writing: '寫作', mixed: '多個部分' }[feedback.weak_area] ?? '其他部分'}` : ''}</p>
    </div>
  )
}
