export interface SelfCheckRendererProps {
  selfCheckZh?: string[]
  draftSelfCheck: string[]
  onToggleSelfCheck: (itemText: string) => void
}

export function SelfCheckRenderer({
  selfCheckZh,
  draftSelfCheck,
  onToggleSelfCheck,
}: SelfCheckRendererProps) {
  if (!selfCheckZh || selfCheckZh.length === 0) return null

  const checkedCount = selfCheckZh.filter((item) => draftSelfCheck.includes(item)).length
  const totalCount = selfCheckZh.length
  const allCompleted = checkedCount === totalCount && totalCount > 0

  return (
    <section id="chapter-selfcheck" className="paper-sheet" aria-labelledby="heading-selfcheck">
      <div className="paper-section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="paper-section-step">Step 6 · 學習檢核</span>
            <h2 id="heading-selfcheck" className="paper-section-title">
              自我學習狀態檢核
            </h2>
          </div>
          <span
            className="vocab-status-badge"
            style={{
              background: allCompleted ? 'var(--color-success-soft)' : 'var(--color-paper-deep)',
              color: allCompleted ? 'var(--color-success)' : 'var(--color-muted)',
              fontWeight: 600,
            }}
          >
            進度：{checkedCount} / {totalCount}
          </span>
        </div>
        <p className="paper-section-desc">
          勾選你已確信掌握的觀念，誠實面對尚未熟悉的項目：
        </p>
      </div>

      <ul className="self-check-list">
        {selfCheckZh.map((item, idx) => {
          const isChecked = draftSelfCheck.includes(item)

          return (
            <li
              key={idx}
              className="self-check-item"
              onClick={() => onToggleSelfCheck(item)}
              role="checkbox"
              aria-checked={isChecked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  onToggleSelfCheck(item)
                }
              }}
            >
              <input
                type="checkbox"
                className="self-check-checkbox"
                checked={isChecked}
                onChange={() => {}} // handled by parent onClick
                tabIndex={-1}
              />
              <span className={`self-check-text ${isChecked ? 'checked' : ''}`}>
                {item}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
