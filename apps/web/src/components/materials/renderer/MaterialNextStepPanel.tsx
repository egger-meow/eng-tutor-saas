export interface MaterialNextStepPanelProps {
  materialId: string
  nextRequested: boolean
  nextRequestStatus?: 'pending' | 'claimed' | 'completed' | 'failed' | 'canceled' | null
  requestMessage?: string | null
  actionBusy: boolean
  onRequestNext: () => void
  feedbackChoice: 'ask' | 'form' | 'saved' | 'skip'
  onOpenFeedback: () => void
  onSkipFeedback: () => void
}

export function MaterialNextStepPanel({
  nextRequested,
  nextRequestStatus,
  requestMessage,
  actionBusy,
  onRequestNext,
  feedbackChoice,
  onOpenFeedback,
  onSkipFeedback,
}: MaterialNextStepPanelProps) {
  const isAlreadyRequested = nextRequested || requestMessage === '已收到下一份申請。'
  const isLimitReached = requestMessage && requestMessage.includes('已使用')

  return (
    <div className="material-next-step-panel" role="region" aria-label="教材後續動作">
      <div className="next-step-header">
        <h3 className="next-step-title">下一步：接續學習與教材安排</h3>
      </div>

      {nextRequestStatus === 'failed' || nextRequestStatus === 'canceled' ? (
        <p className="notice notice-error" role="status">下一份教材未完成，請聯絡我們協助恢復；已提交的作答仍會保留。</p>
      ) : isAlreadyRequested ? (
        <div className="next-step-status status-requested">
          <p className="next-step-message">
            ✓ <strong>已收到下一份教材申請</strong>
          </p>
          <p className="next-step-detail muted">
            系統正在為孩子依最新答題狀況規劃下一份教材。完成後會更新於首頁並寄送通知信。
          </p>
          <div
            className="next-week-preview-card"
            style={{
              marginTop: '1.25rem',
              padding: '1.1rem 1.25rem',
              border: '1.5px solid var(--color-action)',
              borderRadius: 'var(--radius-control)',
              background: 'var(--color-success-soft)',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--color-action)', color: '#fff' }}>
                🚀 下週教材已排入客製序列
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>預計 7 天後完成</span>
            </div>
            <strong style={{ display: 'block', fontSize: '0.96rem', color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
              為孩子預備的下一個進步方向
            </strong>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--color-ink)', lineHeight: 1.55 }}>
              系統已記錄本週作答表現與錯題分析。第 2 週教材將延續孩子的喜好主題，並在閱讀篇章中自然融入【長難句拆解與情節轉折推論】微練習，穩健銜接會考進度！
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              💡 每週一份，不是重複抽固定題庫，而是真的記得孩子走過的每一步。
            </p>
          </div>
        </div>
      ) : isLimitReached ? (
        <div className="next-step-status status-limit">
          <p className="next-step-message">
            ⚠️ <strong>達到每服務月教材上限</strong>
          </p>
          <p className="next-step-detail muted">{requestMessage}</p>
        </div>
      ) : (
        <div className="next-step-actions-container">
          <div className="next-step-primary-group">
            <button
              type="button"
              className="button button-primary"
              disabled={actionBusy}
              onClick={onRequestNext}
            >
              {actionBusy ? '申請中…' : '申請下一份教材'}
            </button>
            <p className="next-step-hint muted">
              回饋為選填；若無特別觀察，可直接申請下一份。系統將根據本週成果自動調整難度與進步重點。
            </p>
          </div>

          {feedbackChoice === 'ask' && (
            <div className="next-step-secondary-group">
              <button
                type="button"
                className="button button-secondary"
                disabled={actionBusy}
                onClick={onOpenFeedback}
              >
                補充學習回饋（選填）
              </button>
              <button
                type="button"
                className="button button-quiet"
                disabled={actionBusy}
                onClick={onSkipFeedback}
              >
                略過回饋
              </button>
            </div>
          )}

          {feedbackChoice === 'form' && (
            <p className="next-step-hint muted">
              正在下方編輯家長回饋。若不需填寫，可隨時點擊上方按鈕直接申請。
            </p>
          )}

          {feedbackChoice === 'saved' && (
            <p className="next-step-saved-note">
              ✓ 家長回饋已儲存，將一併納入下一份教材參考。
            </p>
          )}
        </div>
      )}

      {requestMessage && !isAlreadyRequested && !isLimitReached && (
        <p className="notice notice-info" role="status">
          {requestMessage}
        </p>
      )}
    </div>
  )
}
