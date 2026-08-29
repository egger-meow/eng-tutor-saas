import React, { useState, useMemo } from 'react'
import type { FailureIntelligence, QualityEra } from '../../client/types.js'

interface Props {
  data: FailureIntelligence | null
  currentEra: QualityEra
  onSelectEra: (era: QualityEra) => void
  onDrillDownTimeline: (childId: string, week?: string) => void
}

function formatTimestamp(isoString?: string): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

export const FailureIntelligenceView: React.FC<Props> = ({
  data,
  currentEra,
  onSelectEra,
  onDrillDownTimeline,
}) => {
  const [selectedQualityRule, setSelectedQualityRule] = useState<FailureIntelligence['qualityRuleViolations'][number] | null>(null)
  const [selectedErrorCode, setSelectedErrorCode] = useState<FailureIntelligence['errorCodeClusters'][number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const activeOccurrences = useMemo(() => {
    if (selectedQualityRule) {
      return selectedQualityRule.recentExamples.map((ex) => ({
        id: `${ex.jobId}_${ex.attempt}`,
        jobId: ex.jobId,
        childId: ex.childId,
        childPseudonym: ex.childPseudonym,
        materialWeek: ex.materialWeek,
        attempt: ex.attempt,
        timestamp: ex.timestamp,
        message: ex.message,
        stage: 'finisher_audit',
        evidence: ex.evidence,
      }))
    }
    if (selectedErrorCode) {
      return (selectedErrorCode.occurrences || []).map((occ) => ({
        id: occ.id,
        jobId: occ.jobId,
        childId: occ.childId,
        childPseudonym: occ.childPseudonym,
        materialWeek: occ.materialWeek,
        attempt: occ.attempt,
        timestamp: occ.timestamp,
        message: occ.message,
        stage: occ.stage,
        evidence: occ.failureEvidence,
      }))
    }
    return []
  }, [selectedQualityRule, selectedErrorCode])

  const filteredOccurrences = useMemo(() => {
    if (!searchQuery.trim()) return activeOccurrences
    const q = searchQuery.toLowerCase().trim()
    return activeOccurrences.filter((item) =>
      item.childPseudonym.toLowerCase().includes(q) ||
      item.materialWeek.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      (item.childId && item.childId.toLowerCase().includes(q))
    )
  }, [activeOccurrences, searchQuery])

  if (!data) return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>載入失敗情報中…</div>

  const totalQualityViolations = data.qualityRuleViolations.reduce((sum, r) => sum + r.count, 0)

  return (
    <div>
      {/* Header & Era Selector */}
      <div className="section-title">
        <span>失敗與品質退回情報 (Failure & Quality Intelligence)</span>
        <select
          value={currentEra}
          onChange={(event) => onSelectEra(event.target.value as QualityEra)}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-strong)',
            borderRadius: '5px',
            padding: '6px 10px',
            fontSize: '13px',
          }}
        >
          <option value="current">目前引擎 (Engine v1)</option>
          <option value="historical">歷史版本</option>
          <option value="all">全部版本</option>
        </select>
      </div>

      {/* KPI Overview Cards */}
      <div className="failure-kpi-grid">
        <div className="failure-kpi-card">
          <div className="failure-kpi-title">Finisher 品質退回率</div>
          <div className="failure-kpi-val" style={{ color: data.finisherStats.rejectionRatePercent > 0 ? 'var(--status-rose)' : 'var(--status-emerald)' }}>
            {data.finisherStats.rejectionRatePercent}%
          </div>
          <div className="failure-kpi-sub">
            退回 {data.finisherStats.qualityRejectedSubmissions} 次 / 總評估 {data.finisherStats.totalSubmissions} 次
          </div>
        </div>

        <div className="failure-kpi-card">
          <div className="failure-kpi-title">排程生成失敗率</div>
          <div className="failure-kpi-val" style={{ color: data.generationStats.failureRatePercent > 0 ? 'var(--status-amber)' : 'var(--status-emerald)' }}>
            {data.generationStats.failureRatePercent}%
          </div>
          <div className="failure-kpi-sub">
            失敗 {data.generationStats.failedJobs} 筆 / 完成 {data.generationStats.completedJobs} 筆
          </div>
        </div>

        <div className="failure-kpi-card">
          <div className="failure-kpi-title">品質違規項目</div>
          <div className="failure-kpi-val">{data.qualityRuleViolations.length} 條規則</div>
          <div className="failure-kpi-sub">
            累計觸發 {totalQualityViolations} 次違規
          </div>
        </div>

        <div className="failure-kpi-card">
          <div className="failure-kpi-title">技術異常群組</div>
          <div className="failure-kpi-val">{data.errorCodeClusters.length} 個代碼</div>
          <div className="failure-kpi-sub">
            次要技術或排程錯誤
          </div>
        </div>
      </div>

      {/* Finisher Quality Rule Violations */}
      <div className="section-title" style={{ marginTop: '24px' }}>
        <span>Finisher 品質審核未通過原因（點擊可查看個別學員每週發生紀錄）</span>
      </div>

      <div className="quality-rule-grid">
        {data.qualityRuleViolations.map((rule) => (
          <button
            className="cockpit-card quality-rule-card"
            key={rule.rule}
            onClick={() => {
              setSelectedErrorCode(null)
              setSelectedQualityRule(rule)
              setSearchQuery('')
            }}
          >
            <div className="pipeline-title" style={{ padding: '0 0 10px 0', borderBottom: 'none' }}>
              <strong><code>{rule.rule}</code></strong>
              <b style={{ color: 'var(--status-rose)', fontSize: '20px' }}>{rule.count}</b>
            </div>
            <p style={{ fontSize: '13px', margin: '6px 0 10px 0', lineHeight: 1.4 }}>{rule.description}</p>
            <div className="pipeline-job-meta">
              <span>影響 {rule.affectedChildrenCount} 位學員</span>
              <span>嘗試次數：{rule.attempts.join('、') || '1'}</span>
            </div>
            <div className="quality-card-action">
              <span>查看個別發生明細 ({rule.recentExamples.length} 筆)</span>
              <span>→</span>
            </div>
          </button>
        ))}
      </div>

      {!data.qualityRuleViolations.length && (
        <div className="cockpit-card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          此範圍沒有品質未通過紀錄。
        </div>
      )}

      {/* Technical Failures */}
      <div style={{ marginTop: '24px' }}>
        <details className="cockpit-card technical-failures" open>
          <summary style={{ paddingBottom: '10px' }}>
            工程技術失敗（次要） · {data.errorCodeClusters.length} 個錯誤群組
          </summary>
          {data.errorCodeClusters.map((item) => (
            <div
              className="technical-row clickable"
              key={item.errorCode}
              onClick={() => {
                setSelectedQualityRule(null)
                setSelectedErrorCode(item)
                setSearchQuery('')
              }}
              title="點擊查看此錯誤的個別發生紀錄"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <code>{item.errorCode}</code>
                  <span className="occurrence-tag">{item.stage}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>影響 {item.affectedChildrenCount} 位學員</span>
                </div>
                <small>{item.sampleMessage}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b style={{ fontSize: '16px', color: 'var(--text-main)', marginRight: '8px' }}>{item.count}</b>
                <span style={{ color: '#60a5fa', fontSize: '12px' }}>查看明細 →</span>
              </div>
            </div>
          ))}
          {!data.errorCodeClusters.length && (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', paddingTop: '10px' }}>無技術失敗紀錄。</div>
          )}
        </details>
      </div>

      {/* Chronological Recent Failures Stream */}
      {data.recentFailures && data.recentFailures.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div className="section-title">
            <span>近期失敗事件紀錄流 (Recent Failure Events Stream)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>顯示最新 {data.recentFailures.length} 筆事件</span>
          </div>
          <div className="data-table-wrapper">
            <table className="cockpit-table">
              <thead>
                <tr>
                  <th>發生時間</th>
                  <th>學員</th>
                  <th>週次</th>
                  <th>階段</th>
                  <th>錯誤代碼 / 摘要</th>
                  <th>嘗試次數</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFailures.map((rf) => (
                  <tr key={rf.id}>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(rf.timestamp)}
                    </td>
                    <td><strong>{rf.childPseudonym}</strong></td>
                    <td><span className="occurrence-tag">{rf.materialWeek}</span></td>
                    <td><span className="occurrence-tag">{rf.stage}</span></td>
                    <td style={{ maxWidth: '380px' }}>
                      <div><code>{rf.errorCode}</code></div>
                      <small style={{ color: 'var(--text-muted)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                        {rf.errorMessage}
                      </small>
                    </td>
                    <td>第 {rf.authoringAttempt || 1} 次</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {rf.childPseudonym && !rf.childPseudonym.startsWith('Job #') && (
                        <button
                          className="timeline-jump-btn"
                          onClick={() => {
                            // Find child ID or open timeline
                            onDrillDownTimeline(rf.jobId, rf.materialWeek)
                          }}
                        >
                          查看時間軸
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Occurrences Detail Modal */}
      {(selectedQualityRule || selectedErrorCode) && (
        <div
          className="evidence-modal"
          onClick={() => {
            setSelectedQualityRule(null)
            setSelectedErrorCode(null)
          }}
        >
          <section
            className="cockpit-card evidence-dialog"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: '960px', padding: '20px' }}
          >
            <div className="section-title" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <span className="quality-card-badge">
                  {selectedQualityRule ? 'Finisher 品質審核規則' : '工程技術錯誤群組'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <code style={{ fontSize: '15px' }}>
                    {selectedQualityRule ? selectedQualityRule.rule : selectedErrorCode?.errorCode}
                  </code>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    共 {activeOccurrences.length} 筆紀錄 · 影響 {selectedQualityRule?.affectedChildrenCount ?? selectedErrorCode?.affectedChildrenCount ?? 0} 位學員
                  </span>
                </div>
              </div>
              <button
                className="refresh-btn"
                onClick={() => {
                  setSelectedQualityRule(null)
                  setSelectedErrorCode(null)
                }}
              >
                關閉
              </button>
            </div>

            {/* Description / Summary Box */}
            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {selectedQualityRule ? selectedQualityRule.description : selectedErrorCode?.sampleMessage}
            </div>

            {/* Filter Search Bar */}
            <div className="dialog-search-bar">
              <input
                type="text"
                className="dialog-search-input"
                placeholder="搜尋學員名稱、週次 (如 2026-W35) 或錯誤關鍵字..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="refresh-btn" onClick={() => setSearchQuery('')}>
                  清除
                </button>
              )}
            </div>

            {/* Occurrences List */}
            <div style={{ marginTop: '10px' }}>
              {filteredOccurrences.map((item) => (
                <div className="occurrence-card" key={item.id}>
                  <div className="occurrence-header">
                    <div className="occurrence-identity">
                      <span>👤 {item.childPseudonym}</span>
                      <span className="occurrence-tag">📅 {item.materialWeek}</span>
                      <span className="occurrence-tag">🔄 第 {item.attempt || 1} 次嘗試</span>
                      {item.stage && <span className="occurrence-tag">⚙️ {item.stage}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="occurrence-time">⏰ {formatTimestamp(item.timestamp)}</span>
                      {item.childId && (
                        <button
                          className="timeline-jump-btn"
                          onClick={() => {
                            setSelectedQualityRule(null)
                            setSelectedErrorCode(null)
                            onDrillDownTimeline(item.childId!, item.materialWeek)
                          }}
                        >
                          查看時間軸 →
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="occurrence-message-box">
                    <strong>未通過原因 / 診斷訊息：</strong>
                    <div style={{ marginTop: '4px' }}>{item.message}</div>
                  </div>

                  {item.evidence && Object.keys(item.evidence).length > 0 && (
                    <details className="details-evidence" style={{ marginTop: '4px' }}>
                      <summary>檢視詳細診斷證據 (Evidence JSON)</summary>
                      <pre className="code-inspector">{JSON.stringify(item.evidence, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}

              {!filteredOccurrences.length && (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                  {searchQuery ? '無符合搜尋條件的紀錄。' : '此項目暫無明細紀錄。'}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
export default FailureIntelligenceView