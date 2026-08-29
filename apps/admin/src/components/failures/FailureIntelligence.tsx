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
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<string>('all')
  const [selectedQualityRuleModal, setSelectedQualityRuleModal] = useState<FailureIntelligence['qualityRuleViolations'][number] | null>(null)
  const [selectedErrorCodeModal, setSelectedErrorCodeModal] = useState<FailureIntelligence['errorCodeClusters'][number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Flatten all quality failure occurrences across rules into a single chronological list
  const allQualityFailures = useMemo(() => {
    if (!data?.qualityRuleViolations) return []
    const list: Array<{
      id: string
      jobId: string
      childId?: string
      childPseudonym: string
      materialWeek: string
      attempt: number
      timestamp: string
      rule: string
      category: string
      message: string
      evidence: Record<string, unknown>
    }> = []

    data.qualityRuleViolations.forEach((rule, ruleIdx) => {
      rule.recentExamples.forEach((ex, exIdx) => {
        list.push({
          id: `${ex.jobId}_${ex.attempt}_${rule.rule}_${ruleIdx}_${exIdx}`,
          jobId: ex.jobId,
          childId: ex.childId,
          childPseudonym: ex.childPseudonym,
          materialWeek: ex.materialWeek,
          attempt: ex.attempt,
          timestamp: ex.timestamp || '',
          rule: rule.rule,
          category: rule.category,
          message: ex.message,
          evidence: ex.evidence,
        })
      })
    })

    // Sort strictly by happening time descending (newest first)
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
  }, [data?.qualityRuleViolations])

  // Filtered by selected rule filter and search query
  const filteredQualityFailures = useMemo(() => {
    let result = allQualityFailures
    if (selectedRuleFilter !== 'all') {
      result = result.filter((item) => item.rule === selectedRuleFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.rule.toLowerCase().includes(q) ||
          item.childPseudonym.toLowerCase().includes(q) ||
          item.materialWeek.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          (item.childId && item.childId.toLowerCase().includes(q)) ||
          item.jobId.toLowerCase().includes(q)
      )
    }
    return result
  }, [allQualityFailures, selectedRuleFilter, searchQuery])

  const activeModalOccurrences = useMemo(() => {
    if (selectedQualityRuleModal) {
      return selectedQualityRuleModal.recentExamples.map((ex) => ({
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
    if (selectedErrorCodeModal) {
      return (selectedErrorCodeModal.occurrences || []).map((occ) => ({
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
  }, [selectedQualityRuleModal, selectedErrorCodeModal])

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

      {/* Main Section: Chronological Finisher Quality Failures List */}
      <div className="section-title" style={{ marginTop: '24px' }}>
        <div>
          <span>Finisher 品質審核未通過即時紀錄 (Recent Quality Audit Failures)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '12px' }}>
            依發生時間降冪排序（最新在前），即時掌握退回原因以快速修正 Prompt 或結構
          </span>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          共 {allQualityFailures.length} 筆品質違規
        </span>
      </div>

      {/* Filter Chips Bar */}
      {data.qualityRuleViolations.length > 0 && (
        <div className="quality-filter-bar">
          <button
            className={`quality-filter-chip ${selectedRuleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedRuleFilter('all')}
          >
            全部規則
            <span className="quality-filter-chip-count">{allQualityFailures.length}</span>
          </button>
          {data.qualityRuleViolations.map((r) => (
            <button
              key={r.rule}
              className={`quality-filter-chip ${selectedRuleFilter === r.rule ? 'active' : ''}`}
              onClick={() => setSelectedRuleFilter(selectedRuleFilter === r.rule ? 'all' : r.rule)}
            >
              <code>{r.rule}</code>
              <span className="quality-filter-chip-count">{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search & Action Bar */}
      <div className="dialog-search-bar" style={{ margin: '10px 0 14px 0' }}>
        <input
          type="text"
          className="dialog-search-input"
          placeholder="搜尋學員名稱、週次 (如 2026-W35)、規則或錯誤關鍵字..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {(searchQuery || selectedRuleFilter !== 'all') && (
          <button
            className="refresh-btn"
            onClick={() => {
              setSearchQuery('')
              setSelectedRuleFilter('all')
            }}
          >
            重設篩選
          </button>
        )}
      </div>

      {/* Chronological Quality Failures Feed */}
      <div className="quality-failure-feed">
        {filteredQualityFailures.map((item) => (
          <div className="quality-failure-card" key={item.id}>
            <div className="quality-failure-header">
              <div className="quality-failure-identity">
                <span className="quality-rule-tag">🛡️ {item.rule}</span>
                <span className="occurrence-tag">👤 {item.childPseudonym}</span>
                <span className="occurrence-tag">📅 {item.materialWeek}</span>
                <span className="occurrence-tag">🔄 第 {item.attempt || 1} 次嘗試</span>
                <span className="occurrence-tag">⚙️ finisher_audit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="occurrence-time">⏰ {formatTimestamp(item.timestamp)}</span>
                {item.childId && (
                  <button
                    className="timeline-jump-btn"
                    onClick={() => onDrillDownTimeline(item.childId!, item.materialWeek)}
                    title="前往此學員生成時間軸"
                  >
                    查看時間軸 →
                  </button>
                )}
              </div>
            </div>

            <div className="quality-failure-message">
              <strong style={{ color: '#fda4af', display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                未通過原因 / 診斷訊息：
              </strong>
              <div>{item.message}</div>
            </div>

            {item.evidence && Object.keys(item.evidence).length > 0 && (
              <details className="details-evidence">
                <summary>檢視詳細診斷證據 (Evidence JSON)</summary>
                <pre className="code-inspector">{JSON.stringify(item.evidence, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}

        {!filteredQualityFailures.length && (
          <div className="cockpit-card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            {searchQuery || selectedRuleFilter !== 'all'
              ? '無符合篩選條件的品質審核紀錄。'
              : '✨ 此範圍暫無品質未通過紀錄，所有生成皆符合品質規範。'}
          </div>
        )}
      </div>

      {/* Technical Failures Collapsible Section */}
      <div style={{ marginTop: '28px' }}>
        <details className="cockpit-card technical-failures">
          <summary style={{ paddingBottom: '10px' }}>
            工程技術失敗（次要） · {data.errorCodeClusters.length} 個錯誤群組
          </summary>
          {data.errorCodeClusters.map((item) => (
            <div
              className="technical-row clickable"
              key={item.errorCode}
              onClick={() => {
                setSelectedQualityRuleModal(null)
                setSelectedErrorCodeModal(item)
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

      {/* Occurrences Detail Modal (For Technical Error Drilldown or Deep Dives) */}
      {(selectedQualityRuleModal || selectedErrorCodeModal) && (
        <div
          className="evidence-modal"
          onClick={() => {
            setSelectedQualityRuleModal(null)
            setSelectedErrorCodeModal(null)
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
                  {selectedQualityRuleModal ? 'Finisher 品質審核規則' : '工程技術錯誤群組'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <code style={{ fontSize: '15px' }}>
                    {selectedQualityRuleModal ? selectedQualityRuleModal.rule : selectedErrorCodeModal?.errorCode}
                  </code>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    共 {activeModalOccurrences.length} 筆紀錄 · 影響 {selectedQualityRuleModal?.affectedChildrenCount ?? selectedErrorCodeModal?.affectedChildrenCount ?? 0} 位學員
                  </span>
                </div>
              </div>
              <button
                className="refresh-btn"
                onClick={() => {
                  setSelectedQualityRuleModal(null)
                  setSelectedErrorCodeModal(null)
                }}
              >
                關閉
              </button>
            </div>

            {/* Description / Summary Box */}
            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {selectedQualityRuleModal ? selectedQualityRuleModal.description : selectedErrorCodeModal?.sampleMessage}
            </div>

            {/* Occurrences List */}
            <div style={{ marginTop: '10px' }}>
              {activeModalOccurrences.map((item) => (
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
                            setSelectedQualityRuleModal(null)
                            setSelectedErrorCodeModal(null)
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

              {!activeModalOccurrences.length && (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                  此項目暫無明細紀錄。
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