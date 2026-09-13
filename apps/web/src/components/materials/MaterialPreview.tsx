import { useEffect, useState } from 'react'

export type MaterialPreviewProps = {
  pdfUrl?: string | null
  hasError?: boolean
  isLoading?: boolean
  onRetry?: () => void
  label?: string
}

export function MaterialPreview({
  pdfUrl,
  hasError = false,
  isLoading = false,
  onRetry,
  label = '學生學習版',
}: MaterialPreviewProps) {
  const [embedFailed, setEmbedFailed] = useState(false)

  useEffect(() => {
    setEmbedFailed(false)
  }, [pdfUrl])

  const effectiveError = hasError || (!isLoading && !pdfUrl)

  return (
    <div className="material-preview-wrapper">
      <div className="material-preview-badge-row">
        <span className="scoped-download-badge">{label}</span>
      </div>

      {effectiveError ? (
        <div className="material-preview-surface material-preview-error-surface" role="alert">
          <p>教材預覽暫時無法載入</p>
          {onRetry && (
            <button className="button button-secondary" type="button" onClick={onRetry}>
              再試一次
            </button>
          )}
        </div>
      ) : isLoading ? (
        <div className="material-preview-surface material-preview-loading-surface" role="status">
          <div className="loading-spinner" />
          <p>正在載入教材預覽…</p>
        </div>
      ) : embedFailed ? (
        <div className="material-preview-surface material-preview-fallback" role="region" aria-label="教材預覽備案">
          <p>你的瀏覽器無法直接顯示教材。</p>
          <a
            className="button button-secondary"
            href={pdfUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            開啟學生教材預覽
          </a>
        </div>
      ) : (
        <div className="material-preview-surface">
          <object
            data={pdfUrl && !pdfUrl.includes('#') ? `${pdfUrl}#toolbar=0&navpanes=0` : (pdfUrl ?? undefined)}
            type="application/pdf"
            className="material-preview-object"
            aria-label="學生教材預覽"
            onError={() => setEmbedFailed(true)}
          >
            <div className="material-preview-fallback">
              <p>你的瀏覽器無法直接顯示教材。</p>
              <a
                className="button button-secondary"
                href={pdfUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
              >
                開啟學生教材預覽
              </a>
            </div>
          </object>
        </div>
      )}
    </div>
  )
}
