import { Disclosure } from '../layout/Disclosure'
import { parentLearningCopy } from '../../lib/parent-learning-copy'
import { useState, useEffect } from 'react'
import { handleInternalLink } from '../../app/use-route'
import { getSupabaseClient } from '../../lib/supabase'
import type { ParentMaterialEvidenceSummary } from '../../lib/parent-material-evidence'
import { fetchParentMaterialEvidenceSummary } from '../../lib/parent-material-evidence'

export interface MaterialEvidenceCardProps {
  materialId: string
  answerUnlockRequiresSubmission?: boolean
  nextRequested?: boolean
  nextRequestStatus?: string | null
  initialEvidence?: ParentMaterialEvidenceSummary | null
  onOpenFeedback?: () => void
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export function MaterialEvidenceCard({
  materialId,
  answerUnlockRequiresSubmission = true,
  nextRequested = false,
  nextRequestStatus,
  initialEvidence,
  onOpenFeedback,
}: MaterialEvidenceCardProps) {
  const [evidence, setEvidence] = useState<ParentMaterialEvidenceSummary | null>(initialEvidence ?? null)
  const [loading, setLoading] = useState(initialEvidence === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialEvidence !== undefined) {
      setEvidence(initialEvidence)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    const client = getSupabaseClient()
    fetchParentMaterialEvidenceSummary(client, materialId)
      .then((res) => {
        if (!active) return
        setEvidence(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : '載入學習證據失敗')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [materialId, initialEvidence])

  if (loading) {
    return (
      <section className="material-evidence-card" aria-busy="true">
        <p className="muted">正在整理學習證據與調整記錄…</p>
      </section>
    )
  }

  if (error || !evidence) {
    return null
  }

  const {
    source,
    submittedAt,
    objectiveCorrect,
    objectiveIncorrect,
    unanswered,
    openReview,
    reportedCompletionRate,
    adjustmentNotes,
    targets,
  } = evidence

  return (
    <section className="material-evidence-card" aria-label="學習證據與調整記錄">
      {/* 區塊一：這次的學習記錄 */}
      <div className="evidence-section performance-section">
        <div className="evidence-header-row">
          <h3 className="evidence-title">這次的學習記錄</h3>
          {source === 'student_submission' && (
            <span className="status-badge status-badge-mastered">線上提交記錄</span>
          )}
          {source === 'parent_report' && (
            <span className="status-badge">家長紙筆回報</span>
          )}
          {source === 'none' && (
            <span className="status-badge status-badge-review">尚無作答記錄</span>
          )}
        </div>

        {source === 'student_submission' && (
          <div className="submission-evidence-body">
            {submittedAt && (
              <p className="evidence-timestamp muted">
                提交時間：{formatDate(submittedAt)}
              </p>
            )}

            <p className="muted">僅統計已填入網頁的作答；紙本答案未自動評分。</p>
            <div className="objective-counts-grid" role="group" aria-label="本次作答統計">
              <div className="count-card count-correct">
                <span className="count-number">{objectiveCorrect}</span>
                <span className="count-label">答對</span>
              </div>
              <div className="count-card count-incorrect">
                <span className="count-number">{objectiveIncorrect}</span>
                <span className="count-label">待複習</span>
              </div>
              <div className="count-card count-unanswered">
                <span className="count-number">{unanswered}</span>
                <span className="count-label">未作答</span>
              </div>
              <div className="count-card count-open">
                <span className="count-number">{openReview}</span>
                <span className="count-label">開放題・未自動評分</span>
              </div>
            </div>

            <a className="evidence-review-link" href={`/materials/${materialId}`} onClick={handleInternalLink}>回教材複習 <span aria-hidden="true">→</span></a>

            {reportedCompletionRate !== null && (
              <p className="supplementary-feedback-note muted">
                家長觀察回報進度：{reportedCompletionRate}%（家長觀察記錄，未覆蓋客觀答題結果）
              </p>
            )}

            <Disclosure className="evidence-targets-group" title="查看能力指標" hint="依本次作答整理">
              {targets.length > 0 ? (
                <ul className="targets-badge-list">
                  {targets.map((target, idx) => (
                    <li key={`${target.label}-${idx}`} className="target-badge-item">
                      <span className="target-label">{parentLearningCopy(target.label)}</span>
                      <span
                        className={`status-badge ${
                          target.state === 'observed_correct'
                            ? 'status-badge-mastered'
                            : target.state === 'needs_review'
                            ? 'status-badge-review'
                            : ''
                        }`}
                      >
                        {target.state === 'observed_correct'
                          ? '作答正確'
                          : target.state === 'needs_review'
                          ? '需再複習'
                          : '自評/開放'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-targets-note muted">
                  目前尚無足夠資料整理能力指標。
                </p>
              )}
            </Disclosure>
          </div>
        )}

        {source === 'parent_report' && (
          <div className="paper-evidence-body">
            {submittedAt && (
              <p className="evidence-timestamp muted">
                回報時間：{formatDate(submittedAt)}
              </p>
            )}
            <div className="paper-rate-box">
              <span className="paper-rate-label">家長回報進度：</span>
              <strong className="paper-rate-value">{reportedCompletionRate ?? 0}%</strong>
              <span className="paper-rate-hint muted">（由家長回報之紙筆進度，未經線上評分）</span>
            </div>
            {targets.length > 0 ? (
              <Disclosure className="evidence-targets-group" title="查看觀察能力指標">
                <ul className="targets-badge-list">
                  {targets.map((target, idx) => (
                    <li key={`${target.label}-${idx}`} className="target-badge-item">
                      <span className="target-label">{parentLearningCopy(target.label)}</span>
                      <span
                        className={`status-badge ${
                          target.state === 'observed_correct'
                            ? 'status-badge-mastered'
                            : target.state === 'needs_review'
                            ? 'status-badge-review'
                            : ''
                        }`}
                      >
                        {target.state === 'observed_correct'
                          ? '掌握'
                          : target.state === 'needs_review'
                          ? '需再複習'
                          : '記錄'}
                      </span>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            ) : (
              <p className="no-targets-note muted">尚無足夠能力指標證據</p>
            )}
          </div>
        )}

        {source === 'none' && (
          <div className="none-evidence-body">
            <p className="none-evidence-text">
              目前只有教材設計記錄，尚無提交作答或家長回報。
            </p>
            <div className="none-evidence-actions">
              <a
                href={`/materials/${materialId}`}
                onClick={handleInternalLink}
                className="button button-primary button-sm"
              >
                前往線上閱讀與作答
              </a>
              {!answerUnlockRequiresSubmission && onOpenFeedback && (
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={onOpenFeedback}
                >
                  紙筆做過了，填寫學習觀察
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 區塊二：這份教材為什麼調整 */}
      <div className="evidence-section rationale-section">
        <Disclosure title="這份教材為什麼調整" hint="閱讀重點與複習安排">
          {adjustmentNotes.length > 0 ? (
            <ul className="adjustment-notes-list">
              {adjustmentNotes.map((note, index) => (
                <li key={index} className="adjustment-note-item">
                  <span className="adjustment-bullet" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span>{parentLearningCopy(note)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">依設定之年級程度與學習進度規劃。</p>
          )}

        </Disclosure>
        <footer className="next-design-commitment">
          <p className="commitment-text muted">
            {nextRequestStatus === 'failed' || nextRequestStatus === 'canceled' ? '下一份教材未完成，已提交的作答仍會保留。' : nextRequested ? '✓ 已收到下一份教材申請，本次作答記錄已保留供後續規劃參考。' : '申請下一份教材時，將以本次作答記錄作為規劃參考。'}
          </p>
        </footer>
      </div>
    </section>
  )
}
