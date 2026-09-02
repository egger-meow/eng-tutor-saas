type AdditionalChildConfirmationProps = {
  existingChildName: string
  busy: boolean
  error: string
  onConfirm: () => void
  onDiscard: () => void
}

export function AdditionalChildConfirmation({
  existingChildName,
  busy,
  error,
  onConfirm,
  onDiscard,
}: AdditionalChildConfirmationProps) {
  return (
    <main className="loading-state additional-child-confirmation" aria-labelledby="additional-child-title">
      <section className="auth-panel">
        <p className="overline">帳號已存在</p>
        <h1 id="additional-child-title">這個帳號已經有孩子</h1>
        <p>
          目前帳號裡已有 <strong>{existingChildName || '一位孩子'}</strong>。剛剛填的是另一位孩子嗎？
        </p>
        <p className="muted">我們不會自動新增第二份孩子資料。請確認後再繼續。</p>
        <div className="onboarding-actions">
          <button className="button" type="button" disabled={busy} onClick={onConfirm}>
            {busy ? '處理中…' : '是，新增另一位孩子'}
          </button>
          <button className="button button-secondary" type="button" disabled={busy} onClick={onDiscard}>
            不是，回到原本孩子管理
          </button>
        </div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
      </section>
    </main>
  )
}
