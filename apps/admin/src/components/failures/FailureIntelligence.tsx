import React, { useState } from 'react'
import type { FailureIntelligence as FailureIntelligenceType, QualityEra } from '../../client/types.js'

interface FailureIntelligenceProps {
  data: FailureIntelligenceType | null
  currentEra: QualityEra
  onSelectEra: (era: QualityEra) => void
  onDrillDownTimeline: (childId: string, week?: string) => void
}

export const FailureIntelligenceView: React.FC<FailureIntelligenceProps> = ({
  data,
  currentEra,
  onSelectEra,
  onDrillDownTimeline,
}) => {
  const [selectedEvidence, setSelectedEvidence] = useState<{ id: string; evidence: Record<string, unknown> | null; message: string } | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('all')

  if (!data) return <div>讀取中...</div>

  const { totalFailures, failureRatePercent, stageBreakdown, errorCodeClusters, qualityRuleViolations, dailyTrend, recentFailures, eraBreakdown } = data

  const filteredFailures = stageFilter === 'all'
    ? recentFailures
    : recentFailures.filter((f) => f.stage === stageFilter)

  return (
    <div>
      {/* Quality Era Selector */}
      <div className="cockpit-card featured" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc' }}>
                品質世代篩選 (Quality Era Selection)
              </span>
              <span className={`status-pill ${currentEra === 'current' ? 'active' : currentEra === 'historical' ? 'warning' : 'pending'}`}>
                {currentEra === 'current' ? '當前引擎 (Engine v1)' : currentEra === 'historical' ? '歷史封存 (Historical)' : '全部世代 (All Eras)'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
              {currentEra === 'current' ? (
                <span>
                  ⚡ 當前指標僅包含 <strong>Engine v1</strong> 證據（Schema 2.2.0 · Prompt 2.4.0 · Model Quality Profiles），已隔離早期實驗退回雜訊。
                </span>
              ) : currentEra === 'historical' ? (
                <span>
                  📜 歷史封存包含 Schema &lt; 2.2.0、Prompt &lt; 2.4.0 或未具備 Model Quality Profile Provenance 的早期世代紀錄，供比對與根因溯源。
                </span>
              ) : (
                <span>
                  🌐 全部世代全量合併統計當前 Engine v1 與所有歷史世代之異常事件。
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`refresh-btn ${currentEra === 'current' ? 'active' : ''}`}
              style={{
                background: currentEra === 'current' ? '#065f46' : 'rgba(255, 255, 255, 0.05)',
                borderColor: currentEra === 'current' ? '#059669' : 'var(--border-subtle)',
                color: currentEra === 'current' ? '#a7f3d0' : 'var(--text-muted)',
                fontWeight: currentEra === 'current' ? 700 : 500,
                fontSize: '12px',
                padding: '6px 14px',
              }}
              onClick={() => onSelectEra('current')}
            >
              ⚡ Engine v1 (當前版本)
            </button>
            <button
              className={`refresh-btn ${currentEra === 'historical' ? 'active' : ''}`}
              style={{
                background: currentEra === 'historical' ? '#4c1d95' : 'rgba(255, 255, 255, 0.05)',
                borderColor: currentEra === 'historical' ? '#7c3aed' : 'var(--border-subtle)',
                color: currentEra === 'historical' ? '#ddd6fe' : 'var(--text-muted)',
                fontWeight: currentEra === 'historical' ? 700 : 500,
                fontSize: '12px',
                padding: '6px 14px',
              }}
              onClick={() => onSelectEra('historical')}
            >
              📜 歷史版本 ({eraBreakdown?.historicalTotalFailures ?? 0})
            </button>
            <button
              className={`refresh-btn ${currentEra === 'all' ? 'active' : ''}`}
              style={{
                background: currentEra === 'all' ? '#1e3a8a' : 'rgba(255, 255, 255, 0.05)',
                borderColor: currentEra === 'all' ? '#2563eb' : 'var(--border-subtle)',
                color: currentEra === 'all' ? '#bfdbfe' : 'var(--text-muted)',
                fontWeight: currentEra === 'all' ? 700 : 500,
                fontSize: '12px',
                padding: '6px 14px',
              }}
              onClick={() => onSelectEra('all')}
            >
              🌐 全部世代 ({eraBreakdown?.allTotalFailures ?? 0})
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="kpi-grid">
        <div className="cockpit-card featured">
          <div className="card-header-sm">
            <span>異常 / 退回事件 ({currentEra === 'current' ? 'Engine v1' : currentEra === 'historical' ? 'Historical' : 'All Eras'})</span>
            <span className="status-pill failed">Failures</span>
          </div>
          <div className="kpi-value" style={{ color: totalFailures > 0 ? 'var(--status-rose)' : 'var(--text-main)' }}>
            {totalFailures}
          </div>
          <div className="kpi-subtext" style={{ lineHeight: '1.5' }}>
            <div>
              生成失敗率: <strong>{data.generationStats?.failureRatePercent ?? failureRatePercent}%</strong> ({data.generationStats?.failedJobs ?? 0} failed / {data.generationStats?.terminalJobs ?? (data.generationStats?.completedJobs ?? 0)} terminal jobs)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              進行中排程: {data.generationStats?.pendingJobs ?? 0} pending, {data.generationStats?.claimedJobs ?? 0} claimed (總計 {data.generationStats?.totalJobs ?? 0} jobs)
            </div>
            <div>
              Finisher 退回率: <strong>{data.finisherStats?.rejectionRatePercent ?? 0}%</strong> ({data.finisherStats?.qualityRejectedSubmissions ?? 0} rejected / {data.finisherStats?.totalSubmissions ?? 0} subs)
            </div>
          </div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>主要失敗管線階段</span>
            <span className="status-pill attention_needed">Stage</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>
            {stageBreakdown[0]?.label.split(' ')[0] || '無'}
          </div>
          <div className="kpi-subtext">佔比最高: {stageBreakdown[0]?.percentage ?? 0}% ({stageBreakdown[0]?.count ?? 0} 件)</div>
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
                    {d.total} 件
                    {d.qualityRejected > 0 && <span style={{ color: 'var(--status-rose)', marginLeft: '4px' }}>({d.qualityRejected} 退回)</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Error Code Clusters & Suggested Remedies */}
      <div className="cockpit-card" style={{ marginBottom: '24px' }}>
        <div className="section-title">
          <span>錯誤代碼聚類與排除建議 (Error Clusters & Remedies)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>依頻率排序</span>
        </div>

        <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>世代</th>
                <th>錯誤代碼</th>
                <th>階段</th>
                <th>發生次數</th>
                <th>影響孩子數</th>
                <th>最新錯誤範例訊息</th>
                <th>建議排除對策 (Remedy)</th>
              </tr>
            </thead>
            <tbody>
              {errorCodeClusters.map((cluster) => (
                <tr key={cluster.errorCode}>
                  <td>
                    <span className={`status-pill ${cluster.era === 'engine_v1' ? 'active' : 'warning'}`} style={{ fontSize: '10px' }}>
                      {cluster.era === 'engine_v1' ? 'Engine v1' : 'Historical'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--status-amber)' }}>
                    {cluster.errorCode}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cluster.stage}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{cluster.count}</td>
                  <td>{cluster.affectedChildrenCount} 位</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cluster.sampleMessage}>
                    {cluster.sampleMessage}
                  </td>
                  <td style={{ fontSize: '12px', color: '#93c5fd' }}>
                    {cluster.suggestedRemedy}
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
                <th>世代</th>
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
                  <td>
                    <span className={`status-pill ${q.era === 'engine_v1' ? 'active' : 'warning'}`} style={{ fontSize: '10px' }}>
                      {q.era === 'engine_v1' ? 'Engine v1' : 'Historical'}
                    </span>
                  </td>
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
                <th>世代</th>
                <th>版本 Provenance</th>
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
                  <td>
                    <span className={`status-pill ${f.era === 'engine_v1' ? 'active' : 'warning'}`} style={{ fontSize: '10px' }}>
                      {f.era === 'engine_v1' ? 'Engine v1' : 'Historical'}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {f.schemaVersion ? `v${f.schemaVersion}` : '-'}{f.promptVersion ? ` / p${f.promptVersion}` : ''}
                  </td>
                  <td style={{ fontWeight: 600 }}>{f.childPseudonym}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.stage}</span>
                  </td>
                  <td>
                    <span className="status-pill failed">{f.errorCode}</span>
                  </td>
                  <td>第 {f.authoringAttempt} 次</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.errorMessage}>
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
