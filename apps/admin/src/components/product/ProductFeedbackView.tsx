import React from 'react'
import type { ProductFeedbackIntelligence as ProductFeedbackIntelligenceType } from '../../client/types.js'

interface ProductFeedbackViewProps {
  data: ProductFeedbackIntelligenceType | null
}

export const ProductFeedbackView: React.FC<ProductFeedbackViewProps> = ({ data }) => {
  if (!data) return <div>讀取中...</div>

  const { totalFeedbackCount, categoryBreakdown, subscriptionFriction, instrumentationStatus } = data

  return (
    <div>
      {/* Top Cards */}
      <div className="kpi-grid">
        <div className="cockpit-card featured">
          <div className="card-header-sm">
            <span>產品功能建議 / Bug 回報</span>
            <span className="status-pill pending">Product Feedback</span>
          </div>
          <div className="kpi-value">{totalFeedbackCount} 件</div>
          <div className="kpi-subtext">來自家長端主動回報</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>訂閱運作正常率</span>
            <span className="status-pill healthy">Subscriptions</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-emerald)' }}>
            {subscriptionFriction.totalSubscriptions > 0
              ? Math.round((subscriptionFriction.activeCount / subscriptionFriction.totalSubscriptions) * 100)
              : 100}%
          </div>
          <div className="kpi-subtext">有效扣款中: {subscriptionFriction.activeCount} 戶</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>扣款異常 / 逾期 (Past Due)</span>
            <span className={`status-pill ${subscriptionFriction.pastDueCount > 0 ? 'critical' : 'completed'}`}>
              {subscriptionFriction.pastDueCount > 0 ? 'ATTENTION' : 'ZERO'}
            </span>
          </div>
          <div className="kpi-value" style={{ color: subscriptionFriction.pastDueCount > 0 ? 'var(--status-rose)' : 'var(--text-main)' }}>
            {subscriptionFriction.pastDueCount} 筆
          </div>
          <div className="kpi-subtext">需發送扣款失敗提醒</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>期末取消預約 (Pending Cancel)</span>
            <span className="status-pill warning">Churn Risk</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-amber)' }}>
            {subscriptionFriction.cancelingAtPeriodEndCount} 戶
          </div>
          <div className="kpi-subtext">累計已終止: {subscriptionFriction.canceledCount} 戶</div>
        </div>
      </div>

      {/* Two Column Grid: Categories & Churn Analysis */}
      <div className="dashboard-grid-2">
        {/* Product Feedback Categories */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>產品回饋分類統計 (Product Feedback Breakdown)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>public.product_feedback</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            {categoryBreakdown.map((item) => (
              <div key={item.category} style={{ marginBottom: '16px' }}>
                <div className="dist-bar-row">
                  <span className="dist-bar-label">{item.label}</span>
                  <div className="dist-bar-track">
                    <div
                      className={`dist-bar-fill ${item.category === 'bug' ? 'rose' : item.category === 'flow' ? 'amber' : 'cyan'}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="dist-bar-count">{item.count} ({item.percentage}%)</span>
                </div>

                {item.recentMessages.length > 0 && (
                  <div style={{ paddingLeft: '14px', marginTop: '4px' }}>
                    {item.recentMessages.map((msg, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        • {msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Friction & Cancellation Tracking */}
        <div className="cockpit-card">
          <div className="section-title">
            <span>訂閱流失與摩擦狀態 (Subscription Churn & Friction)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Paddle Webhook Telemetry</span>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div className="dist-bar-row">
              <span className="dist-bar-label">正常付費訂閱 (Active)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill emerald" style={{ width: `${subscriptionFriction.totalSubscriptions > 0 ? (subscriptionFriction.activeCount / subscriptionFriction.totalSubscriptions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{subscriptionFriction.activeCount} 位</span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">體驗期中 (Trialing)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill cyan" style={{ width: `${subscriptionFriction.totalSubscriptions > 0 ? (subscriptionFriction.trialingCount / subscriptionFriction.totalSubscriptions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{subscriptionFriction.trialingCount} 位</span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">扣款失敗 (Past Due)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill rose" style={{ width: `${subscriptionFriction.totalSubscriptions > 0 ? (subscriptionFriction.pastDueCount / subscriptionFriction.totalSubscriptions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count" style={{ color: subscriptionFriction.pastDueCount > 0 ? 'var(--status-rose)' : undefined }}>
                {subscriptionFriction.pastDueCount} 位
              </span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">已取消 (Canceled)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill amber" style={{ width: `${subscriptionFriction.totalSubscriptions > 0 ? (subscriptionFriction.canceledCount / subscriptionFriction.totalSubscriptions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{subscriptionFriction.canceledCount} 位</span>
            </div>

            <div className="dist-bar-row">
              <span className="dist-bar-label">週期結束取消 (Canceling at Period End)</span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill amber" style={{ width: `${subscriptionFriction.totalSubscriptions > 0 ? (subscriptionFriction.cancelingAtPeriodEndCount / subscriptionFriction.totalSubscriptions) * 100 : 0}%` }} />
              </div>
              <span className="dist-bar-count">{subscriptionFriction.cancelingAtPeriodEndCount} 位</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 <strong>流失洞察：</strong>目前生產環境 subscriptions 表尚未包含獨立 cancellation_reason 欄位，已將其納入下方「待埋點指標」清單，避免以假資料誤導營運決策。
          </div>
        </div>
      </div>

      {/* Explicit Data Source Instrumentation Boundary */}
      <div className="cockpit-card">
        <div className="section-title">
          <span>系統資料源與未來埋點指標分界 (Instrumentation Boundaries)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>明確區分現有資料 vs 需額外埋點指標</span>
        </div>

        <div className="dashboard-grid-2" style={{ marginTop: '14px', marginBottom: 0 }}>
          {/* Active Data Sources */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--status-emerald)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✅ 現有權威資料來源 (Currently Available)</span>
            </div>
            {instrumentationStatus.collectedSources.map((src, idx) => (
              <div key={idx} style={{ marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>• {src.name}</div>
                <div style={{ color: 'var(--text-dim)', paddingLeft: '10px' }}>{src.description}</div>
              </div>
            ))}
          </div>

          {/* Future Instrumentation Needed */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--status-amber)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏳ 需未來額外埋點指標 (Future Instrumentation Needed)</span>
            </div>
            {instrumentationStatus.futureInstrumentationNeeded.map((src, idx) => (
              <div key={idx} style={{ marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>• {src.name}</div>
                <div style={{ color: 'var(--text-dim)', paddingLeft: '10px' }}>理由: {src.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
