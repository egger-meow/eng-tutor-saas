import type { OpeningSection } from '../../../types/student-material'

export interface OpeningRendererProps {
  opening?: OpeningSection
  draftAnswers: Record<string, string>
  onAnswerChange: (key: string, value: string) => void
}

export function OpeningRenderer({
  opening,
  draftAnswers,
  onAnswerChange,
}: OpeningRendererProps) {
  if (!opening) return null

  const activity = opening.activity
  const reflectionKey = 'opening-reflection'

  return (
    <section id="chapter-opening" className="paper-sheet" aria-labelledby="heading-opening">
      <div className="paper-section-header">
        <span className="paper-section-step">Step 1 · 學習導讀</span>
        <h2 id="heading-opening" className="paper-section-title">
          課前引導與學習目標
        </h2>
        {opening.howToUseZh && (
          <p className="paper-section-desc">{opening.howToUseZh}</p>
        )}
      </div>

      {opening.goalsZh && opening.goalsZh.length > 0 && (
        <div className="opening-goals">
          <p className="opening-goals-title">🎯 本週核心學習目標</p>
          <ul className="opening-goals-list">
            {opening.goalsZh.map((goal, idx) => (
              <li key={idx}>{goal}</li>
            ))}
          </ul>
        </div>
      )}

      {/* V26 Discriminated Union Activities */}
      {activity && (
        <div className="opening-activity-card">
          {activity.type === 'question' && (
            <div>
              <h4>🤔 {activity.titleZh}</h4>
              <p className="paper-section-desc" style={{ marginBottom: 'var(--space-3)' }}>
                {activity.prompt}
              </p>
              <textarea
                className="ruled-textarea"
                placeholder="寫下你的課前想法（不計分，幫助進入學習情境）…"
                value={draftAnswers[reflectionKey] ?? ''}
                onChange={(e) => onAnswerChange(reflectionKey, e.target.value)}
                rows={activity.writingLines ?? 2}
              />
            </div>
          )}

          {activity.type === 'observation' && (
            <div>
              <h4>👀 {activity.titleZh}</h4>
              <p className="paper-section-desc">仔細觀察以下語句：</p>
              <ul style={{ margin: 'var(--space-2) 0', paddingLeft: '1.25rem' }}>
                {activity.examples.map((ex, idx) => (
                  <li key={idx} style={{ fontStyle: 'italic', marginBottom: '0.25rem' }}>
                    {ex}
                  </li>
                ))}
              </ul>
              <p style={{ fontWeight: 600, color: 'var(--color-ink)', marginTop: 'var(--space-2)' }}>
                💡 觀察重點：{activity.noticeZh}
              </p>
            </div>
          )}

          {activity.type === 'reading-purpose' && (
            <div>
              <h4>🎯 {activity.titleZh}</h4>
              <p style={{ color: 'var(--color-text)', lineHeight: 1.6 }}>
                {activity.purposeZh}
              </p>
            </div>
          )}

          {activity.type === 'direct-reading' && (
            <p style={{ color: 'var(--color-muted)', fontStyle: 'italic', margin: 0 }}>
              請直接瀏覽本週精選單字，接著進入主文章閱讀。
            </p>
          )}
        </div>
      )}

      {/* Legacy Fallback warmUp */}
      {!activity && opening.warmUp && (
        <div className="opening-activity-card">
          <h4>🌟 課前暖身</h4>
          <p style={{ color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
            {opening.warmUp}
          </p>
        </div>
      )}
    </section>
  )
}
