import React, { useState } from 'react'
import type { ChildWeekTimeline as ChildWeekTimelineType } from '../../client/types.js'
import { adminApi } from '../../client/api.js'
import { GenerationTestModePanel } from './GenerationTestModePanel.js'

interface ChildWeekTimelineProps {
  data: ChildWeekTimelineType | null
  childIdQuery: string
  weekQuery: string
  onSearch: (childId: string, week: string) => void
}

export const ChildWeekTimelineView: React.FC<ChildWeekTimelineProps> = ({
  data,
  childIdQuery,
  weekQuery,
  onSearch,
}) => {
  const [inputChildId, setInputChildId] = useState(childIdQuery)
  const [inputWeek, setInputWeek] = useState(weekQuery)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isGrantingRetry, setIsGrantingRetry] = useState(false)
  const [grantSuccessMessage, setGrantSuccessMessage] = useState<string | null>(null)
  const [grantErrorMessage, setGrantErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(inputChildId.trim(), inputWeek.trim())
  }

  if (!data) return <div>讀取中...</div>

  const {
    childId,
    childPseudonym,
    grade,
    textbookVersion,
    isActive,
    targetWeek,
    subscriptionStatus,
    planCode,
    currentLearningSummary,
    jobSummary,
    events,
    rawMetadata,
  } = data

  const job = (rawMetadata?.job as any) || jobSummary
  const isCompleted = job?.status === 'completed'
  const attemptCount = Number(job?.attempt_count) || 0
  const maxAttempts = Number(job?.max_attempts) || 3
  const isHumanReviewRequired = !isCompleted && (attemptCount >= maxAttempts || job?.error_code === 'HUMAN_REVIEW_REQUIRED' || job?.status === 'failed')
  const hasGrantedExtraRetry = !isCompleted && attemptCount < maxAttempts && maxAttempts > 3

  const handleGrantRetryConfirm = async () => {
    if (!job?.id) return
    setIsGrantingRetry(true)
    setGrantErrorMessage(null)
    setGrantSuccessMessage(null)
    try {
      const res = await adminApi.grantJobRetry(job.id)
      if (res.success) {
        setGrantSuccessMessage(`已允許額外 1 次重試 (最大嘗試次數: ${res.previousMaxAttempts} → ${res.newMaxAttempts})`)
        setShowConfirmModal(false)
        onSearch(childId, targetWeek)
      } else {
        setGrantErrorMessage(res.message || res.error || '重試授權失敗')
        setShowConfirmModal(false)
      }
    } catch (err) {
      setGrantErrorMessage(err instanceof Error ? err.message : String(err))
      setShowConfirmModal(false)
    } finally {
      setIsGrantingRetry(false)
    }
  }

  return (
    <div>
      {/* Search Header */}
      <div className="cockpit-card" style={{ marginBottom: '20px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {data.availableChildren && data.availableChildren.length > 0 && (
            <div style={{ minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                選擇在學孩子 (Quick Select)
              </label>
              <select
                value={inputChildId || data.childId}
                onChange={(e) => {
                  setInputChildId(e.target.value)
                  onSearch(e.target.value, inputWeek.trim())
                }}
                style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '13px' }}
              >
                {data.availableChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayPseudonym} (G{c.grade} / {c.subscriptionStatus})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              或手動輸入 Child ID
            </label>
            <input
              type="text"
              placeholder="輸入 Child UUID..."
              value={inputChildId}
              onChange={(e) => setInputChildId(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>

          <div style={{ width: '160px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              教材週次 (Target Week)
            </label>
            <input
              type="text"
              placeholder="YYYY-MM-DD"
              value={inputWeek}
              onChange={(e) => setInputWeek(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-strong)', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="submit"
              className="refresh-btn"
              style={{ background: '#2563eb', color: '#fff', borderColor: '#3b82f6', padding: '7px 16px', fontWeight: 600 }}
            >
              🔍 檢索生命週期
            </button>
          </div>
        </form>
      </div>

      {/* Human Review Required & Grant 1 Retry Banner */}
      {job && isHumanReviewRequired && (
        <div className="cockpit-card" style={{ marginBottom: '20px', border: '1px solid var(--status-rose)', background: 'rgba(244, 63, 94, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="status-pill failed" style={{ fontSize: '12px', padding: '3px 10px' }}>🚨 需人工審核 (HUMAN_REVIEW_REQUIRED)</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  目前嘗試次數：{attemptCount} / {maxAttempts}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                此任務嘗試次數已達上限，已自正常排程隔離。管理員可審閱下方各 Attempt 的品質退回原因，並決定是否賦予 1 次額外嘗試機會。
              </p>
            </div>
            <div>
              <button
                type="button"
                className="refresh-btn"
                style={{ background: '#b91c1c', color: '#fff', borderColor: '#ef4444', padding: '8px 18px', fontWeight: 700, fontSize: '13px' }}
                onClick={() => setShowConfirmModal(true)}
                disabled={isGrantingRetry}
              >
                {isGrantingRetry ? '處理中...' : '允許再重試 1 次'}
              </button>
            </div>
          </div>
          {grantSuccessMessage && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '4px', color: '#a7f3d0', fontSize: '12px' }}>
              ✓ {grantSuccessMessage}
            </div>
          )}
          {grantErrorMessage && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '4px', color: '#fca5a5', fontSize: '12px' }}>
              ⚠️ {grantErrorMessage}
            </div>
          )}
        </div>
      )}

      {/* Extra Retry Granted Status Banner */}
      {job && hasGrantedExtraRetry && (
        <div className="cockpit-card" style={{ marginBottom: '20px', border: '1px solid var(--status-emerald)', background: 'rgba(16, 185, 129, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="status-pill active">已排程等待重試</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginLeft: '8px' }}>
                目前嘗試次數：{attemptCount} / {maxAttempts}（已允許額外 1 次重試）
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              下次 ChatGPT Scheduled Work 將自動讀取歷史品質審核退回資料構建 retryContext 進行 Attempt #{attemptCount + 1} 生成。
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div className="cockpit-card" style={{ maxWidth: '520px', width: '100%', background: '#0f172a', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
              允許再重試 1 次？
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px' }}>
              這不會清除既有失敗紀錄，也不會重設嘗試次數。
              系統只會將最大嘗試次數增加 1，讓這份教材可以再次進入正常產生流程。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="refresh-btn"
                style={{ background: 'transparent', color: '#94a3b8', borderColor: '#475569' }}
                onClick={() => setShowConfirmModal(false)}
                disabled={isGrantingRetry}
              >
                取消
              </button>
              <button
                type="button"
                className="refresh-btn"
                style={{ background: '#2563eb', color: '#fff', borderColor: '#3b82f6', fontWeight: 700 }}
                onClick={handleGrantRetryConfirm}
                disabled={isGrantingRetry}
              >
                {isGrantingRetry ? '處理中...' : '允許重試'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation Test Mode Operational Control Panel */}
      <GenerationTestModePanel
        childId={childId}
        onRefreshTimeline={() => onSearch(childId, targetWeek)}
      />

      {/* Child Summary Capsule */}
      <div className="kpi-grid">
        <div className="cockpit-card featured">
          <div className="card-header-sm">
            <span>孩子檔案 (Child Profile)</span>
            <span className={`status-pill ${isActive ? 'active' : 'closed'}`}>{isActive ? '在學中' : '已封存'}</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>{childPseudonym}</div>
          <div className="kpi-subtext">年級: G{grade} | 版本: {textbookVersion || '通用'} | ID: <code>{childId.slice(0, 8)}</code></div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>訂閱狀態 (Subscription)</span>
            <span className={`status-pill ${subscriptionStatus}`}>{subscriptionStatus.toUpperCase()}</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>{planCode || 'Standard'}</div>
          <div className="kpi-subtext">一子一訂閱獨立計費</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>當前學習記憶狀態</span>
            <span className="status-pill pending">Memory</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>
            {currentLearningSummary.comprehensionAccuracy !== null ? `${currentLearningSummary.comprehensionAccuracy}%` : '-'}
          </div>
          <div className="kpi-subtext">難度趨勢: {currentLearningSummary.difficultyTrend} | 累計錯題: {currentLearningSummary.recurringMistakesCount} 題</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>檢視週次 (Cycle)</span>
            <span className="status-pill healthy">{targetWeek}</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>
            {events.every((e) => e.status === 'completed') ? '全部完成' : '處理中 / 待完成'}
          </div>
          <div className="kpi-subtext">包含生成、Finisher 與家長反饋端到端追蹤</div>
        </div>
      </div>

      {/* Interactive Step-by-Step Lifecycle Stepper */}
      <div className="cockpit-card" style={{ marginBottom: '24px' }}>
        <div className="section-title">
          <span>端到端生命週期軌跡 (End-to-End Lifecycle Events)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>點擊展開各階段詳細 Meta Payload</span>
        </div>

        <div className="timeline-container">
          {events.map((event, idx) => {
            const isExpanded = expandedStep === idx
            return (
              <div key={event.step} className="timeline-step-item">
                <div className={`timeline-marker ${event.status}`}>
                  {event.status === 'completed' ? '✓' : event.status === 'failed' ? '✗' : event.status === 'warning' ? '!' : idx + 1}
                </div>

                <div className="timeline-step-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="timeline-step-title">{event.label}</span>
                    <span className={`status-pill ${event.status}`}>{event.status}</span>
                  </div>
                  {event.timestamp && (
                    <span className="timeline-step-time">
                      {new Date(event.timestamp).toLocaleString('zh-TW', { hour12: false })}
                    </span>
                  )}
                </div>

                {event.error && (
                  <div style={{ fontSize: '12px', color: 'var(--status-rose)', marginTop: '4px', fontWeight: 600 }}>
                    ⚠️ {event.error}
                  </div>
                )}

                {/* Visual Attempts breakdown for Authoring & Finisher */}
                {Array.isArray((event.details as any)?.attempts) && ((event.details as any).attempts as any[]).length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {((event.details as any).attempts as any[]).map((att: any, attIdx: number) => {
                      const isNoSubmission = att.status === 'no_submission' || att.hasSubmission === false
                      return (
                        <div
                          key={attIdx}
                          style={{
                            background: 'var(--bg-elevated)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            borderLeft: att.status === 'quality_rejected'
                              ? '3px solid var(--status-rose)'
                              : att.status === 'completed'
                              ? '3px solid var(--status-emerald)'
                              : isNoSubmission
                              ? '3px solid var(--status-amber)'
                              : '3px solid #64748b',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                                Attempt #{att.attempt || attIdx + 1}
                              </span>
                              {!isNoSubmission && (
                                <span className={`status-pill ${att.era === 'engine_v1' ? 'active' : 'warning'}`} style={{ fontSize: '10px' }}>
                                  {att.era === 'engine_v1' ? 'Engine v1' : 'Historical'}
                                </span>
                              )}
                              {(att.schemaVersion || att.promptVersion) && (
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  v{att.schemaVersion || '2.2.0'} / p{att.promptVersion || '2.4.0'}
                                </span>
                              )}
                            </div>
                            <span className={`status-pill ${isNoSubmission ? 'warning' : att.status}`}>
                              {isNoSubmission ? 'NO SUBMISSION' : att.status}
                            </span>
                          </div>

                          {isNoSubmission ? (
                            <div style={{ color: 'var(--status-amber)', marginTop: '4px', fontSize: '11px' }}>
                              ⚠️ Claimed but no curriculum submission (認領逾時 / 未提交封包)
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                提交時間: {att.submittedAt ? new Date(att.submittedAt).toLocaleString('zh-TW', { hour12: false }) : 'N/A'}
                                {att.processorId ? ` | 處理 Finisher: ${att.processorId}` : ''}
                                {att.modelName ? ` | 模型: ${att.modelName}` : ''}
                              </div>
                              {att.errorMessage && (
                                <div style={{ color: 'var(--status-rose)', marginTop: '4px', fontSize: '11px' }}>
                                  ⚠️ {att.errorMessage}
                                </div>
                              )}
                              {Array.isArray(att.findings) && att.findings.length > 0 && (
                                <div style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid #ef4444' }}>
                                  {att.findings.map((f: any, fIdx: number) => (
                                    <div key={fIdx} style={{ fontSize: '11px', color: '#fca5a5' }}>
                                      • <strong>{f.rule || f.code}</strong>: {f.message || f.description}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ marginTop: '8px' }}>
                  <button
                    className="refresh-btn"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => setExpandedStep(isExpanded ? null : idx)}
                  >
                    {isExpanded ? '▲ 收起詳細參數' : '▼ 展開階段 Payload'}
                  </button>
                </div>

                {isExpanded && (
                  <pre className="code-inspector">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Raw Joined Supabase Metadata Explorer */}
      <div className="cockpit-card">
        <div className="section-title">
          <span>底層 Supabase 資料表原始紀錄 (Raw Joined DB Rows)</span>
          <button
            className="refresh-btn"
            style={{ fontSize: '12px' }}
            onClick={() => setShowRawJson(!showRawJson)}
          >
            {showRawJson ? '隱藏 JSON' : '檢視原始 JSON'}
          </button>
        </div>

        {showRawJson && (
          <div style={{ marginTop: '12px' }}>
            <pre className="code-inspector" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {JSON.stringify(rawMetadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
