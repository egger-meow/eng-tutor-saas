export interface MaterialNextStepPanelProps {
  materialId: string
  nextRequested: boolean
  requestMessage?: string | null
  actionBusy: boolean
  onRequestNext: () => void
  feedbackChoice: 'ask' | 'form' | 'saved' | 'skip'
  onOpenFeedback: () => void
  onSkipFeedback: () => void
}

export function MaterialNextStepPanel({
  nextRequested,
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

      {isAlreadyRequested ? (
        <div className="next-step-status status-requested">
          <p className="next-step-message">
            ✓ <strong>已收到下一份教材申請</strong>
          </p>
          <p className="next-step-detail muted">
            系統正在為孩子依最新答題狀況規劃下一份教材。完成後會更新於首頁並寄送通知信。
          </p>
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
              回饋為選填；若無特別觀察，可直接申請下一份。
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
