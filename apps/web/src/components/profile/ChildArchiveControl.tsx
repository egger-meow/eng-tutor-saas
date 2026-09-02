type ChildArchiveControlProps = {
  childName: string
  confirming: boolean
  busy: boolean
  error: string
  onRequestArchive: () => void
  onConfirmArchive: () => void
  onCancelArchive: () => void
}

export function ChildArchiveControl({
  childName,
  confirming,
  busy,
  error,
  onRequestArchive,
  onConfirmArchive,
  onCancelArchive,
}: ChildArchiveControlProps) {
  return (
    <section className="empty-state" aria-label={`移除 ${childName}`}>
      <h3>移除孩子</h3>
      {confirming ? <>
        <p>確定要移除 {childName} 嗎？移除後會從家長介面隱藏，過往教材與帳務紀錄仍會保留。</p>
        <p className="muted">若這位孩子仍有付費訂閱，系統會阻止移除，請先到訂閱頁取消並等方案結束。</p>
        <div className="onboarding-actions">
          <button className="button" type="button" disabled={busy} onClick={onConfirmArchive}>{busy ? '處理中…' : '確認移除'}</button>
          <button className="button button-secondary" type="button" disabled={busy} onClick={onCancelArchive}>保留孩子</button>
        </div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
      </> : <>
        <p className="muted">如果是不小心重複建立，或之後不再使用這份孩子資料，可以從這裡安全移除。</p>
        <button className="button button-secondary" type="button" onClick={onRequestArchive}>移除孩子</button>
      </>}
    </section>
  )
}
