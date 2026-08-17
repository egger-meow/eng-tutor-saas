import React, { useState } from 'react'
import type { ChildWeekTimeline as ChildWeekTimelineType } from '../../client/types.js'

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
    events,
    rawMetadata,
  } = data

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
                    ⚠️ 異常退回: {event.error}
                  </div>
                )}

                {/* Visual Attempts breakdown for Authoring & Finisher */}
                {Array.isArray((event.details as any)?.attempts) && ((event.details as any).attempts as any[]).length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {((event.details as any).attempts as any[]).map((att: any, attIdx: number) => (
                      <div
                        key={attIdx}
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          borderLeft: att.status === 'quality_rejected' ? '3px solid var(--status-rose)' : att.status === 'completed' ? '3px solid var(--status-emerald)' : '3px solid var(--status-amber)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            Attempt #{att.attempt || attIdx + 1}
                          </span>
                          <span className={`status-pill ${att.status}`}>{att.status}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          提交時間: {att.submittedAt ? new Date(att.submittedAt).toLocaleString('zh-TW', { hour12: false }) : 'N/A'}
                          {att.processorId ? ` | 處理 Finisher: ${att.processorId}` : ''}
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
                      </div>
                    ))}
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
          <span>原始資料庫多表關聯快照 (Raw Joined Records)</span>
          <button
            className="refresh-btn"
            onClick={() => setShowRawJson(!showRawJson)}
          >
            {showRawJson ? '▲ 收起 Raw JSON' : '▼ 展開完整多表 Raw JSON'}
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
