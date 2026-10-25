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
  const isAlreadyRequested = nextRequested
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
            本次作答記錄已保留供後續規劃參考。下一份教材開放後會顯示於首頁，並寄送通知信。
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
              回饋為選填；若無特別觀察，可直接申請下一份。本次作答記錄會作為後續規劃參考。
            </p>
          </div>

        </div>
      )}

      <div className="next-step-secondary-group" aria-label="家長觀察">
        {feedbackChoice === 'form' ? (
          <p className="muted">正在下方編輯家長觀察；儲存回饋不會另行申請教材。</p>
        ) : (
          <button type="button" className="button button-secondary" disabled={actionBusy} onClick={onOpenFeedback}>
            {feedbackChoice === 'saved' ? '修改家長觀察／回饋' : '新增／修改家長觀察（選填）'}
          </button>
        )}
        {feedbackChoice === 'ask' && <button type="button" className="button button-quiet" disabled={actionBusy} onClick={onSkipFeedback}>略過回饋</button>}
        {feedbackChoice === 'saved' && <p className="next-step-saved-note" role="status">✓ 家長回饋已儲存。</p>}
        <p className="next-step-hint muted">觀察可隨時補充，供後續教材規劃參考；已進入製作的教材不會因此重新製作。</p>
      </div>

      {requestMessage && !isAlreadyRequested && !isLimitReached && (
        <p className="notice notice-info" role="status">
          {requestMessage}
        </p>
      )}
    </div>
  )
}
