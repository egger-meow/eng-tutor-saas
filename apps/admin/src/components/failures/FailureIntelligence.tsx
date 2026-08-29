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

interface QualityFindingItem {
  id: string
  rule: string
  category: string
  message: string
  description?: string
  evidence?: Record<string, unknown>
}

interface GroupedQualityJobFailure {
  id: string
  jobId: string
  childId?: string
  childPseudonym: string
  materialWeek: string
  attempt: number
  timestamp: string
  distinctRules: string[]
  findings: QualityFindingItem[]
  evidence: Record<string, unknown>
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

  // Merge multiple findings for the same job attempt into a single chronological event card
  const groupedQualityFailures = useMemo(() => {
    if (!data?.qualityRuleViolations) return []

    const jobMap = new Map<string, GroupedQualityJobFailure>()

    data.qualityRuleViolations.forEach((rule, ruleIdx) => {
      rule.recentExamples.forEach((ex, exIdx) => {
        const groupKey = `${ex.jobId}_${ex.attempt || 1}`
        let group = jobMap.get(groupKey)

        if (!group) {
          group = {
            id: groupKey,
            jobId: ex.jobId,
            childId: ex.childId,
            childPseudonym: ex.childPseudonym,
            materialWeek: ex.materialWeek,
            attempt: ex.attempt || 1,
            timestamp: ex.timestamp || '',
            distinctRules: [],
            findings: [],
            evidence: ex.evidence || {},
          }
          jobMap.set(groupKey, group)
        }

        if (ex.timestamp && ex.timestamp > group.timestamp) {
          group.timestamp = ex.timestamp
        }

        if (!group.evidence || Object.keys(group.evidence).length === 0) {
          group.evidence = ex.evidence || {}
        }

        if (!group.distinctRules.includes(rule.rule)) {
          group.distinctRules.push(rule.rule)
        }

        const isDuplicate = group.findings.some(
          (f) => f.rule === rule.rule && f.message === ex.message
        )
        if (!isDuplicate) {
          group.findings.push({
            id: `${groupKey}_${rule.rule}_${ruleIdx}_${exIdx}`,
            rule: rule.rule,
            category: rule.category,
            message: ex.message,
            description: rule.description,
            evidence: ex.evidence,
          })
        }
      })
    })

    // Sort strictly by happening time descending (newest first)
    return Array.from(jobMap.values()).sort((a, b) =>
      (b.timestamp || '').localeCompare(a.timestamp || '')
    )
  }, [data?.qualityRuleViolations])

  // Filtered by selected rule filter and search query
  const filteredQualityFailures = useMemo(() => {
    let result = groupedQualityFailures
    if (selectedRuleFilter !== 'all') {
      result = result.filter((item) => item.distinctRules.includes(selectedRuleFilter))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.childPseudonym.toLowerCase().includes(q) ||
          item.materialWeek.toLowerCase().includes(q) ||
          item.jobId.toLowerCase().includes(q) ||
          (item.childId && item.childId.toLowerCase().includes(q)) ||
          item.distinctRules.some((r) => r.toLowerCase().includes(q)) ||
          item.findings.some((f) => f.message.toLowerCase().includes(q))
      )
    }
    return result
  }, [groupedQualityFailures, selectedRuleFilter, searchQuery])

  const totalFindingsCount = useMemo(() => {
    return groupedQualityFailures.reduce((sum, g) => sum + g.findings.length, 0)
  }, [groupedQualityFailures])

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

      {/* Quality Rule Distribution & Statistics Section */}
      <div className="section-title" style={{ marginTop: '24px' }}>
        <div>
          <span>Finisher 品質違規類型統計與分佈 (Quality Rule Distribution & Breakdown)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '12px' }}>
            統計各品質規則違規佔比與影響範圍（點擊規則卡片可直接篩選下方最新紀錄）
          </span>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          共 {totalQualityViolations} 次違規 · {data.qualityRuleViolations.length} 條規則
        </span>
      </div>

      {data.qualityRuleViolations.length > 0 && (
        <div className="quality-rule-grid">
          {data.qualityRuleViolations.map((rule) => {
            const isSelected = selectedRuleFilter === rule.rule
            const percentage = totalQualityViolations > 0 ? Math.round((rule.count / totalQualityViolations) * 100) : 0

            return (
              <button
                key={rule.rule}
                className={`cockpit-card quality-rule-card ${isSelected ? 'active-filter' : ''}`}
                onClick={() => setSelectedRuleFilter(isSelected ? 'all' : rule.rule)}
                title={`點擊${isSelected ? '取消篩選' : '篩選'}此規則紀錄`}
              >
                <div className="pipeline-title" style={{ padding: '0 0 8px 0', borderBottom: 'none' }}>
                  <strong><code>{rule.rule}</code></strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{percentage}%</span>
                    <b style={{ color: 'var(--status-rose)', fontSize: '18px' }}>{rule.count} 次</b>
                  </div>
                </div>

                {/* Distribution Progress Bar */}
                <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 8px 0' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #f43f5e, #fb7185)', borderRadius: '2px' }} />
                </div>

                <p style={{ fontSize: '12px', margin: '4px 0 8px 0', lineHeight: 1.4, color: 'var(--text-muted)' }}>
                  {rule.description}
                </p>

                <div className="pipeline-job-meta" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  <span>影響 {rule.affectedChildrenCount} 位學員</span>
                  <span>常見嘗試：{rule.attempts.join('、') || '1'}</span>
                </div>

                <div className="quality-card-action">
                  <span style={{ color: isSelected ? '#93c5fd' : '#60a5fa', fontWeight: isSelected ? 600 : 400 }}>
                    {isSelected ? '✓ 已套用篩選（再次點擊取消）' : '點擊篩選下方紀錄 →'}
                  </span>
                  <span>{isSelected ? '✕' : '↓'}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Main Section: Chronological Finisher Quality Failures List */}
      <div className="section-title" style={{ marginTop: '28px' }}>
        <div>
          <span>Finisher 品質審核未通過即時紀錄流 (Recent Quality Audit Failures Stream)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '12px' }}>
            依發生時間降冪排序（最新在前），同次生成的違規項目已合併為單一紀錄清單
          </span>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          共 {groupedQualityFailures.length} 次退回審核（{totalFindingsCount} 項違規發現）
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
            <span className="quality-filter-chip-count">{totalFindingsCount}</span>
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
        {filteredQualityFailures.map((group) => (
          <div className="quality-failure-card" key={group.id}>
            <div className="quality-failure-header">
              <div className="quality-failure-identity">
                {group.distinctRules.map((ruleName) => (
                  <span className="quality-rule-tag" key={ruleName}>
                    🛡️ {ruleName}
                  </span>
                ))}
                <span className="occurrence-tag">👤 {group.childPseudonym}</span>
                <span className="occurrence-tag">📅 {group.materialWeek}</span>
                <span className="occurrence-tag">🔄 第 {group.attempt || 1} 次嘗試</span>
                <span className="occurrence-tag">⚙️ finisher_audit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="occurrence-time">⏰ {formatTimestamp(group.timestamp)}</span>
                {group.childId && (
                  <button
                    className="timeline-jump-btn"
                    onClick={() => onDrillDownTimeline(group.childId!, group.materialWeek)}
                    title="前往此學員生成時間軸"
                  >
                    查看時間軸 →
                  </button>
                )}
              </div>
            </div>

            {/* Merged Findings / Evidence List */}
            <div className="quality-findings-list">
              <div style={{ fontSize: '12px', color: '#fda4af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 2px 0' }}>
                <span>未通過原因與診斷清單</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 'normal' }}>
                  ({group.findings.length} 項發現 / Findings)
                </span>
              </div>

              {group.findings.map((f, idx) => (
                <div className="quality-finding-item" key={f.id || idx}>
                  <div className="quality-finding-header">
                    <span className="quality-rule-tag" style={{ fontSize: '11px', padding: '1px 6px' }}>
                      {f.rule}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="quality-finding-text">{f.message}</div>
                </div>
              ))}
            </div>

            {group.evidence && Object.keys(group.evidence).length > 0 && (
              <details className="details-evidence" style={{ marginTop: '4px' }}>
                <summary>檢視完整診斷證據 (Evidence JSON)</summary>
                <pre className="code-inspector">{JSON.stringify(group.evidence, null, 2)}</pre>
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