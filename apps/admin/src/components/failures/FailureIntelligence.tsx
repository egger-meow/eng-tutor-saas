import React, { useState } from 'react'
import type { FailureIntelligence as FailureIntelligenceType } from '../../client/types.js'

interface FailureIntelligenceProps {
  data: FailureIntelligenceType | null
  onDrillDownTimeline: (childId: string, week?: string) => void
}

export const FailureIntelligenceView: React.FC<FailureIntelligenceProps> = ({
  data,
  onDrillDownTimeline,
}) => {
  const [selectedEvidence, setSelectedEvidence] = useState<{ id: string; evidence: Record<string, unknown> | null; message: string } | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('all')

  if (!data) return <div>讀取中...</div>

  const { totalFailures, failureRatePercent, stageBreakdown, errorCodeClusters, qualityRuleViolations, dailyTrend, recentFailures } = data

  const filteredFailures = stageFilter === 'all'
    ? recentFailures
    : recentFailures.filter((f) => f.stage === stageFilter)

  return (
    <div>
      {/* Overview Cards */}
      <div className="kpi-grid">
        <div className="cockpit-card featured">
          <div className="card-header-sm">
            <span>累計失敗 / 退回總數</span>
            <span className="status-pill failed">Failures</span>
          </div>
          <div className="kpi-value" style={{ color: totalFailures > 0 ? 'var(--status-rose)' : 'var(--text-main)' }}>
            {totalFailures}
          </div>
          <div className="kpi-subtext">生成失敗率: {failureRatePercent}% (含品質退回重試)</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>主要失敗管線階段</span>
            <span className="status-pill attention_needed">Stage</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>
            {stageBreakdown[0]?.label.split(' ')[0] || '無'}
          </div>
          <div className="kpi-subtext">佔比最高: {stageBreakdown[0]?.percentage}% ({stageBreakdown[0]?.count} 件)</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>主要錯誤代碼</span>
            <span className="status-pill warning">Code</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '18px' }}>
            {errorCodeClusters[0]?.errorCode || '無'}
          </div>
          <div className="kpi-subtext">影響孩子數: {errorCodeClusters[0]?.affectedChildrenCount || 0} 位</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>品質規則違規項數</span>
            <span className="status-pill quality_rejected">Rubric</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-amber)' }}>
            {qualityRuleViolations.length} 種
          </div>
          <div className="kpi-subtext">累計觸發品質防護: {qualityRuleViolations.reduce((acc, q) => acc + q.count, 0)} 次</div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="dashboard-grid-2">
        {/* Pipeline Stage Breakdown */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>失敗管線階段分佈 (Pipeline Stages)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>點擊可篩選</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            {stageBreakdown.map((item) => (
              <div
                key={item.stage}
                className="dist-bar-row"
                style={{ cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: stageFilter === item.stage ? 'var(--bg-elevated)' : 'transparent' }}
                onClick={() => setStageFilter(stageFilter === item.stage ? 'all' : item.stage)}
              >
                <span className="dist-bar-label" title={item.label}>
                  {item.label}
                </span>
                <div className="dist-bar-track">
                  <div
                    className={`dist-bar-fill ${item.stage === 'finisher_audit' ? 'rose' : item.stage === 'pdf_rendering' ? 'amber' : 'cyan'}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="dist-bar-count">{item.count} ({item.percentage}%)</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              className={`refresh-btn ${stageFilter === 'all' ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setStageFilter('all')}
            >
              全部階段 ({recentFailures.length})
            </button>
            {stageFilter !== 'all' && (
              <span style={{ fontSize: '12px', color: 'var(--status-cyan)', alignSelf: 'center' }}>
                目前篩選: {stageFilter}
              </span>
            )}
          </div>
        </div>

        {/* Daily Failure Trend */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>每日失敗與品質退回趨勢 (Daily Failure Trend)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>最近 14 天</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            {dailyTrend.map((d) => {
              const maxCount = Math.max(...dailyTrend.map((x) => x.total), 5)
              const pct = (d.total / maxCount) * 100
              return (
                <div key={d.date} className="dist-bar-row">
                  <span className="dist-bar-label" style={{ width: '90px', fontFamily: 'monospace' }}>
                    {d.date.slice(5)}
                  </span>
                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill rose"
                      style={{ width: `${pct}%`, minWidth: d.total > 0 ? '6px' : '0' }}
                    />
                  </div>
                  <span className="dist-bar-count">
                    {d.total} <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(審{d.qualityRejected}/技{d.technicalFailed})</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Error Code Clusters & Diagnostic Remediation */}
      <div className="cockpit-card" style={{ marginBottom: '24px' }}>
        <div className="section-title">
          <span>常見錯誤原因聚類與改善指引 (Error Code Intelligence)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>自動聚合診斷</span>
        </div>

        <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>錯誤代碼 (Error Code)</th>
                <th>發生階段</th>
                <th>次數</th>
                <th>影響孩子</th>
                <th>最新錯誤範例</th>
                <th>建議系統修復方向 (Remedy Guidance)</th>
              </tr>
            </thead>
            <tbody>
              {errorCodeClusters.map((cluster) => (
                <tr key={cluster.errorCode}>
                  <td>
                    <span className="status-pill failed">{cluster.errorCode}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cluster.stage}</span>
                  </td>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{cluster.count}</td>
                  <td>{cluster.affectedChildrenCount} 位</td>
                  <td style={{ maxWidth: '280px', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cluster.sampleMessage}>
                    {cluster.sampleMessage}
                  </td>
                  <td style={{ maxWidth: '340px', fontSize: '12px', color: '#93c5fd' }}>
                    💡 {cluster.suggestedRemedy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Rule Deep Dive */}
      <div className="cockpit-card" style={{ marginBottom: '24px' }}>
        <div className="section-title">
          <span>教材品質審核規則違規深度分析 (Quality Rubric Violations)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deterministic Finisher Guardrails</span>
        </div>

        <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>品質規範名稱 (Rule Name)</th>
                <th>違規類別</th>
                <th>違規次數</th>
                <th>規則定義與說明</th>
                <th>代表性違規發現 (Finding Sample)</th>
              </tr>
            </thead>
            <tbody>
              {qualityRuleViolations.map((q) => (
                <tr key={q.rule}>
                  <td style={{ fontWeight: 600 }}>{q.rule}</td>
                  <td>
                    <span className="status-pill warning">{q.category}</span>
                  </td>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--status-rose)' }}>{q.count}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.description}</td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#fca5a5' }}>{q.sampleFinding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Failures List & Evidence Inspector */}
      <div className="cockpit-card">
        <div className="section-title">
          <span>近期失敗與拒絕事件詳細列表 (Recent Failure Events)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>可展開查看 failure_evidence 診斷資料</span>
        </div>

        <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>孩子 / 任務</th>
                <th>管線階段</th>
                <th>錯誤代碼</th>
                <th>Attempt</th>
                <th>錯誤訊息</th>
                <th>證據檢查</th>
                <th>追蹤</th>
              </tr>
            </thead>
            <tbody>
              {filteredFailures.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {new Date(f.timestamp).toLocaleString('zh-TW', { hour12: false })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{f.childPseudonym}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.stage}</span>
                  </td>
                  <td>
                    <span className="status-pill failed">{f.errorCode}</span>
                  </td>
                  <td>第 {f.authoringAttempt} 次</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.errorMessage}>
                    {f.errorMessage}
                  </td>
                  <td>
                    {f.failureEvidence ? (
                      <button
                        className="refresh-btn"
                        style={{ padding: '2px 8px', fontSize: '11px', background: '#3b0764', color: '#e9d5ff', borderColor: '#7e22ce' }}
                        onClick={() => setSelectedEvidence({ id: f.id, evidence: f.failureEvidence, message: f.errorMessage })}
                      >
                        檢視 Evidence
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>無結構證據</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="refresh-btn"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => onDrillDownTimeline(f.jobId, f.materialWeek)}
                    >
                      履歷
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failure Evidence Modal */}
      {selectedEvidence && (
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
          zIndex: 100,
          padding: '24px',
        }}>
          <div className="cockpit-card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#0f172a', border: '1px solid #334155' }}>
            <div className="section-title">
              <span>🔍 結構化品質失敗證據 (Structured Failure Evidence)</span>
              <button className="refresh-btn" onClick={() => setSelectedEvidence(null)}>✕ 關閉</button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--status-rose)', marginBottom: '8px' }}>
              {selectedEvidence.message}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <pre className="code-inspector">
                {JSON.stringify(selectedEvidence.evidence, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
