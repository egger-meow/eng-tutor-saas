import { stageIndex, type Week1Progress, type Week1ProgressStage } from '../../lib/week1-progress'

const steps: Array<{ stage: Week1ProgressStage; label: string; detail: string }> = [
  { stage: 'received', label: '資料已收到', detail: '孩子的程度與學習資料已安全收到。' },
  { stage: 'queued', label: '已排入教材製作', detail: '加速通道已啟動，第一份專屬教材正在安排製作。' },
  { stage: 'authoring', label: '正在製作內容', detail: '正在依孩子的程度、興趣與學習目標編寫第一週教材。' },
  { stage: 'publishing', label: '品質檢查與排版', detail: '內容已經成形，正在整理學生教材與家長解答。' },
  { stage: 'ready', label: '教材可以下載', detail: '第一週教材已完成，可以開始使用了。' },
]

export function Week1FastProgress({ progress }: { progress: Week1Progress | null }) {
  const currentStage = progress?.stage ?? 'received'
  const currentIndex = stageIndex(currentStage)

  return (
    <div className="week1-fast-progress" role="status" aria-live="polite" aria-label="第一週教材即時製作進度">
      <div className="week1-fast-progress-head">
        <span className={progress?.ready ? 'week1-fast-ready-dot' : 'week1-fast-orbit'} aria-hidden="true" />
        <div>
          <strong>{progress?.ready ? '第一週教材完成了' : '第一週教材正在加速製作'}</strong>
          <p>{progress?.ready ? '現在就可以到孩子頁面下載。' : '這裡顯示的每一步都來自實際製作狀態。'}</p>
        </div>
      </div>
      <ol className="week1-fast-steps">
        {steps.map((step, index) => {
          const complete = index < currentIndex || (progress?.ready === true && index <= currentIndex)
          const active = index === currentIndex && !progress?.ready
          return (
            <li
              key={step.stage}
              className={`week1-fast-step${complete ? ' is-complete' : ''}${active ? ' is-active' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="week1-fast-marker" aria-hidden="true">
                {complete ? '✓' : active ? <span className="week1-fast-spinner" /> : '•'}
              </span>
              <span className="week1-fast-copy">
                <strong>{step.label}</strong>
                {(active || complete || step.stage === 'ready') && <small>{step.detail}</small>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
