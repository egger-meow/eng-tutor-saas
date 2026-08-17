import React from 'react'
import type { OperationsOverview as OperationsOverviewType } from '../../client/types.js'

interface OperationsOverviewProps {
  data: OperationsOverviewType | null
  onDrillDownTimeline: (childId: string, week?: string) => void
}

export const OperationsOverviewView: React.FC<OperationsOverviewProps> = ({
  data,
  onDrillDownTimeline,
}) => {
  if (!data) return <div>讀取中...</div>

  const { capacity, queueStats, finisherStats, recentDeliveries, stuckJobs } = data

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="cockpit-card featured">
          <div className="card-header-sm">
            <span>在學孩子數 / 總數</span>
            <span className="status-pill active">Active</span>
          </div>
          <div className="kpi-value">{data.activeChildrenCount} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {data.totalChildrenCount}</span></div>
          <div className="kpi-subtext" style={{ lineHeight: '1.4' }}>
            <span>付費訂閱: <strong>{data.subscriptionBreakdown?.paidActiveCount ?? data.activeSubscriptionsCount}</strong> 位 (月繳 {data.subscriptionBreakdown?.monthlyPaidCount ?? 0} / 年繳 {data.subscriptionBreakdown?.annualPaidCount ?? 0})</span>
            <br />
            <span>體驗期: <strong>{data.subscriptionBreakdown?.trialingCount ?? 0}</strong> 位</span>
          </div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>100 人容量上限控管</span>
            <span className={`status-pill ${capacity.status}`}>{capacity.status.toUpperCase()}</span>
          </div>
          <div className="kpi-value">{capacity.activeCount} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {capacity.maxCapacity}</span></div>
          <div className="kpi-subtext">
            創始早鳥已兌換: <strong>{capacity.foundingCount}</strong> / {capacity.foundingLimit} 名
            {data.subscriptionBreakdown?.foundingEligibleCount ? ` (保留 ${data.subscriptionBreakdown.foundingEligibleCount} 名)` : ''}
          </div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>生成排程佇列</span>
            <span className="status-pill pending">Jobs</span>
          </div>
          <div className="kpi-value">{queueStats.pending + queueStats.claimed}</div>
          <div className="kpi-subtext">
            待處理: {queueStats.pending} 筆 | 認領中: {queueStats.claimed} 筆
          </div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>異常或逾期任務</span>
            <span className={`status-pill ${queueStats.overdueOrStuck > 0 ? 'critical' : 'completed'}`}>
              {queueStats.overdueOrStuck > 0 ? 'ALERT' : 'CLEAR'}
            </span>
          </div>
          <div className="kpi-value" style={{ color: queueStats.overdueOrStuck > 0 ? 'var(--status-rose)' : 'var(--text-main)' }}>
            {queueStats.overdueOrStuck}
          </div>
          <div className="kpi-subtext">累計失敗: {queueStats.failed} 筆 | 成功交付: {queueStats.completed} 筆</div>
        </div>
      </div>

      {/* Data Source Truth & Health Inspector */}
      {data.dataSources && data.dataSources.length > 0 && (
        <div className="cockpit-card" style={{ marginBottom: '20px', borderLeft: data.systemHealth === 'degraded' ? '4px solid var(--status-rose)' : '4px solid var(--status-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>📡 權威資料源狀態 (Data Source Telemetry)</span>
              <span className={`status-pill ${data.systemHealth === 'degraded' ? 'critical' : data.systemHealth === 'attention_needed' ? 'warning' : 'active'}`}>
                SYSTEM: {data.systemHealth.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {data.dataSources.filter((d) => d.status === 'healthy').length} / {data.dataSources.length} 正常連線
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {data.dataSources.map((ds) => (
              <div
                key={ds.source}
                style={{
                  background: 'var(--bg-elevated)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: ds.status === 'error' ? '1px solid var(--status-rose)' : '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: ds.status === 'error' ? 'var(--status-rose)' : '#e2e8f0' }}>{ds.source}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: ds.status === 'healthy' ? '#064e3b' : ds.status === 'empty' ? '#1e293b' : '#881337',
                      color: ds.status === 'healthy' ? '#34d399' : ds.status === 'empty' ? '#94a3b8' : '#fda4af',
                      fontWeight: 600,
                    }}
                  >
                    {ds.status === 'healthy' ? `✓ ${ds.rowCount} rows` : ds.status === 'empty' ? '0 rows' : 'ERROR'}
                  </span>
                </div>
                {ds.error ? (
                  <div style={{ fontSize: '11px', color: '#fca5a5', wordBreak: 'break-word', marginTop: '4px' }}>
                    ⚠️ {ds.error}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    延遲: {ds.latencyMs}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Section */}
      <div className="dashboard-grid-2">
        {/* Finisher Pipeline Activity */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>Finisher 審核管線狀態</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GitHub Actions Finisher</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div className="dist-bar-row">
              <span className="dist-bar-label">審核通過 (Completed)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill emerald" style={{ width: `${finisherStats.completed > 0 ? Math.min(100, finisherStats.completed) : 0}%` }} />
              </div>
              <span className="dist-bar-count">{finisherStats.completed}</span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">品質審核拒絕 (Rejected)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill rose" style={{ width: `${finisherStats.qualityRejected > 0 ? Math.min(100, finisherStats.qualityRejected * 10) : 0}%` }} />
              </div>
              <span className="dist-bar-count" style={{ color: finisherStats.qualityRejected > 0 ? 'var(--status-rose)' : undefined }}>
                {finisherStats.qualityRejected}
              </span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">技術異常 (Tech Failed)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill amber" style={{ width: `${finisherStats.technicalFailed > 0 ? Math.min(100, finisherStats.technicalFailed * 10) : 0}%` }} />
              </div>
              <span className="dist-bar-count">{finisherStats.technicalFailed}</span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">佇列待處理 (Pending)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill cyan" style={{ width: `${finisherStats.pending > 0 ? Math.min(100, finisherStats.pending * 10) : 0}%` }} />
              </div>
              <span className="dist-bar-count">{finisherStats.pending}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 <strong>維運說明：</strong>當 ChatGPT Scheduled Work 生成 canonical 封包後，GitHub Actions Finisher 負責 Deterministic 審核與 PDF 渲染。若出現品質退回，系統將紀錄 failure_evidence 並於下次 attempt 修復。
          </div>
        </div>

        {/* Stuck & Overdue Jobs */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>異常/卡住任務即時清單 ({stuckJobs.length})</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>需人工關注</span>
          </div>

          {stuckJobs.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--status-emerald)' }}>
              ✓ 目前無任何卡住或逾期任務，排程運作良好。
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
              <table className="cockpit-table">
                <thead>
                  <tr>
                    <th>孩子 / 週次</th>
                    <th>狀態</th>
                    <th>重試次數</th>
                    <th>卡住原因</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stuckJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{job.childPseudonym}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{job.materialWeek}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${job.status}`}>{job.status}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{job.attemptCount} / {job.maxAttempts || 3}</span>
                        {job.attemptCount >= (job.maxAttempts || 3) && (
                          <div style={{ fontSize: '10px', color: 'var(--status-rose)', marginTop: '2px' }}>需人工審核</div>
                        )}
                      </td>
                      <td style={{ color: 'var(--status-amber)' }}>{job.stuckReason}</td>
                      <td>
                        <button
                          className="refresh-btn"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => onDrillDownTimeline(job.childId, job.materialWeek)}
                        >
                          追蹤生命週期
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deliveries Table */}
      <div className="cockpit-card">
        <div className="section-title">
          <span>最近生成與交付紀錄 (Recent Deliveries)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>即時產生私有 PDF 封包</span>
        </div>

        <div className="data-table-wrapper" style={{ marginTop: '12px' }}>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>孩子名稱</th>
                <th>教材週次</th>
                <th>版本號 (Revision)</th>
                <th>規則引擎 (Rule Version)</th>
                <th>生成模型</th>
                <th>產生物件 (Artifacts)</th>
                <th>完成時間</th>
                <th>生命週期</th>
              </tr>
            </thead>
            <tbody>
              {recentDeliveries.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.childPseudonym}</td>
                  <td>{m.materialWeek}</td>
                  <td>Rev {m.revision}</td>
                  <td><code>{m.ruleVersion}</code></td>
                  <td><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.modelName || 'chatgpt-work'}</span></td>
                  <td>
                    <span style={{ color: m.hasStudentPdf ? 'var(--status-emerald)' : 'var(--text-dim)', marginRight: '8px' }}>
                      {m.hasStudentPdf ? '✓ 學生本 PDF' : '✗ 缺學生本'}
                    </span>
                    <span style={{ color: m.hasParentPdf ? 'var(--status-emerald)' : 'var(--text-dim)' }}>
                      {m.hasParentPdf ? '✓ 解答篇 PDF' : '✗ 缺解答篇'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    {new Date(m.createdAt).toLocaleString('zh-TW', { hour12: false })}
                  </td>
                  <td>
                    <button
                      className="refresh-btn"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => onDrillDownTimeline(m.childId, m.materialWeek)}
                    >
                      查看履歷
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Recovery Guide Box */}
      <div className="ops-guide-box">
        <div className="ops-guide-title">
          <span>🛠️ 手動排程與即時修復指令 (Manual Recovery Actions)</span>
        </div>
        <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
          若發現任務卡住或需要立即觸發本地 Finisher 處理待審封包，請於專案目錄執行：
        </p>
        <div>
          <div style={{ fontSize: '12px', color: '#93c5fd', marginTop: '6px' }}>1. 執行 Finisher 與待審佇列：</div>
          <code className="code-cmd">pnpm worker</code>
          <div style={{ fontSize: '12px', color: '#93c5fd', marginTop: '6px' }}>2. 執行 Synthetic 端到端驗證與 PDF 輸出測試：</div>
          <code className="code-cmd">pnpm generate:synthetic</code>
        </div>
      </div>
    </div>
  )
}
