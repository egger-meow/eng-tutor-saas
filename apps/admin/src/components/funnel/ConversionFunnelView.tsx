import React from 'react'
import type { ConversionFunnelData } from '../../client/types.js'

interface Props {
  data: ConversionFunnelData | null
  rangeDays: number
  onRangeChange: (days: number) => void
}

export const ConversionFunnelView: React.FC<Props> = ({ data, rangeDays, onRangeChange }) => {
  if (!data) {
    return (
      <div className="cockpit-loading-placeholder">
        <p>載入轉換漏斗數據中…</p>
      </div>
    )
  }

  const {
    steps,
    uniqueLandingVisitors,
    overallConversionPercent,
    biggestDropOff,
    channels,
    devices,
    trends,
    internalTestEventsFiltered,
    totalEvents,
  } = data

  const maxStepVisitors = Math.max(...steps.map((s) => s.uniqueVisitors), 1)

  return (
    <div className="funnel-container">
      {/* Top Filter & Meta Bar */}
      <div className="funnel-header-bar">
        <div>
          <h2 className="funnel-title">轉換漏斗分析 (Conversion Funnel)</h2>
          <p className="funnel-subtitle">
            第一方即時轉換漏斗：追蹤訪客由首頁瀏覽、教材範例、安全登入至完成 6 步驟孩子學習檔案的端到端轉換。
          </p>
        </div>
        <div className="funnel-controls">
          <div className="range-button-group" role="group" aria-label="時間範圍選擇">
            {[
              { days: 1, label: '24 小時' },
              { days: 7, label: '7 天' },
              { days: 30, label: '30 天' },
              { days: 90, label: '90 天' },
            ].map((btn) => (
              <button
                key={btn.days}
                type="button"
                className={'range-btn ' + (rangeDays === btn.days ? 'active' : '')}
                onClick={() => onRangeChange(btn.days)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {internalTestEventsFiltered > 0 && (
        <div className="funnel-filter-notice">
          🛡️ 已自動過濾 <strong>{internalTestEventsFiltered}</strong> 筆內部測試學員與測試模式事件，確保數據反映真實訪客行為。
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="funnel-kpi-grid">
        <div className="funnel-kpi-card">
          <div className="kpi-label">首頁獨立訪客 (Landing)</div>
          <div className="kpi-value">{uniqueLandingVisitors.toLocaleString()}</div>
          <div className="kpi-desc">期間內進入首頁的獨立訪客數</div>
        </div>

        <div className="funnel-kpi-card">
          <div className="kpi-label">送出 Email 驗證</div>
          <div className="kpi-value">
            {steps.find((s) => s.name === 'email_submit')?.uniqueVisitors.toLocaleString() || 0}
          </div>
          <div className="kpi-desc">
            送出率 {steps.find((s) => s.name === 'email_submit')?.conversionFromLandingPercent || 0}%
          </div>
        </div>

        <div className="funnel-kpi-card">
          <div className="kpi-label">登入成功 (Auth Complete)</div>
          <div className="kpi-value">
            {steps.find((s) => s.name === 'auth_complete')?.uniqueVisitors.toLocaleString() || 0}
          </div>
          <div className="kpi-desc">
            驗證轉換 {steps.find((s) => s.name === 'auth_complete')?.conversionFromPrevPercent || 0}%
          </div>
        </div>

        <div className="funnel-kpi-card">
          <div className="kpi-label">完成孩子檔案 (Onboarded)</div>
          <div className="kpi-value highlight-emerald">
            {steps.find((s) => s.name === 'onboarding_complete')?.uniqueVisitors.toLocaleString() || 0}
          </div>
          <div className="kpi-desc">
            整體轉換率 <strong>{overallConversionPercent}%</strong>
          </div>
        </div>

        <div className="funnel-kpi-card drop-alert-card">
          <div className="kpi-label">最大流失環節 (Largest Drop-off)</div>
          {biggestDropOff ? (
            <>
              <div className="kpi-value highlight-rose">
                -{biggestDropOff.dropCount} 人 ({biggestDropOff.dropPercent}%)
              </div>
              <div className="kpi-desc">
                {biggestDropOff.fromLabel.split(' ')[0]} ➔ {biggestDropOff.toLabel.split(' ')[0]}
              </div>
            </>
          ) : (
            <div className="kpi-desc">目前無顯著流失數據</div>
          )}
        </div>
      </div>

      {/* Main Funnel Step Breakdown */}
      <div className="funnel-card">
        <h3 className="card-heading">8 階段轉換漏斗進程 (Step-by-Step Funnel)</h3>
        <p className="card-subheading">
          精確掌握從公開流量到登入、建檔、完成設定的各階段流失與轉換率。
        </p>

        <div className="funnel-steps-table-wrapper">
          <table className="funnel-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ width: '220px' }}>漏斗階段</th>
                <th style={{ width: '100px' }}>獨立人數</th>
                <th style={{ width: '100px' }}>總觸發次數</th>
                <th>轉換進度與分佈</th>
                <th style={{ width: '110px' }}>前一階段轉化</th>
                <th style={{ width: '110px' }}>首頁總轉化</th>
                <th style={{ width: '110px' }}>流失人數</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, idx) => {
                const barWidth = maxStepVisitors > 0 ? (step.uniqueVisitors / maxStepVisitors) * 100 : 0
                const isFinal = idx === steps.length - 1
                const isDropHeavy = step.dropOffPercent >= 50 && idx > 0

                return (
                  <tr key={step.name} className={isFinal ? 'final-step-row' : ''}>
                    <td className="step-num">{idx + 1}</td>
                    <td>
                      <div className="step-label-cell">
                        <strong className="step-name">{step.label}</strong>
                        <span className="step-desc">{step.description}</span>
                      </div>
                    </td>
                    <td>
                      <span className="step-unique-badge">{step.uniqueVisitors.toLocaleString()} 人</span>
                    </td>
                    <td className="text-muted">{step.count.toLocaleString()} 次</td>
                    <td>
                      <div className="funnel-bar-wrapper">
                        <div
                          className={'funnel-bar-fill ' + (isFinal ? 'fill-emerald' : 'fill-blue')}
                          style={{ width: `${Math.max(barWidth, 2)}%` }}
                        />
                        <span className="bar-percent-label">{step.conversionFromLandingPercent}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={'conversion-pill ' + (idx === 0 ? 'pill-neutral' : isDropHeavy ? 'pill-rose' : 'pill-green')}>
                        {idx === 0 ? '基準 (100%)' : `${step.conversionFromPrevPercent}%`}
                      </span>
                    </td>
                    <td>
                      <strong className={isFinal ? 'text-emerald' : ''}>{step.conversionFromLandingPercent}%</strong>
                    </td>
                    <td>
                      {idx === 0 ? (
                        <span className="text-dim">—</span>
                      ) : step.dropOffCount > 0 ? (
                        <span className={'drop-pill ' + (isDropHeavy ? 'drop-heavy' : '')}>
                          -{step.dropOffCount} ({step.dropOffPercent}%)
                        </span>
                      ) : (
                        <span className="text-dim">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Section: Channel Breakdown & Device Distribution */}
      <div className="funnel-two-col-grid">
        {/* Channel / Referrer Breakdown */}
        <div className="funnel-card">
          <h3 className="card-heading">流量來源與成效分析 (Traffic Attribution)</h3>
          <p className="card-subheading">區分 Meta / Facebook 廣告、Google 搜尋與直接流量的最終轉換表現。</p>

          <table className="funnel-table">
            <thead>
              <tr>
                <th>流量來源</th>
                <th style={{ width: '80px' }}>首頁訪客</th>
                <th style={{ width: '80px' }}>登入成功</th>
                <th style={{ width: '80px' }}>建立孩子</th>
                <th style={{ width: '80px' }}>完成設定</th>
                <th style={{ width: '90px' }}>最終轉化率</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.channel}>
                  <td>
                    <strong>{ch.label}</strong>
                  </td>
                  <td>{ch.landingViews.toLocaleString()}</td>
                  <td>{ch.authCompleted.toLocaleString()}</td>
                  <td>{ch.childrenCreated.toLocaleString()}</td>
                  <td>
                    <strong className="text-emerald">{ch.onboarded.toLocaleString()}</strong>
                  </td>
                  <td>
                    <span className="conversion-pill pill-green">{ch.conversionPercent}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Device Class Breakdown */}
        <div className="funnel-card">
          <h3 className="card-heading">裝置分佈 (Device Distribution)</h3>
          <p className="card-subheading">訪客使用的裝置類型統計（行動裝置 vs 桌上型電腦 vs 平板）。</p>

          <div className="device-metric-list">
            {devices.map((dev) => (
              <div key={dev.device} className="device-item">
                <div className="device-info">
                  <span className="device-label">{dev.label}</span>
                  <span className="device-count">
                    <strong>{dev.count.toLocaleString()}</strong> 次 ({dev.percent}%)
                  </span>
                </div>
                <div className="device-bar-bg">
                  <div className="device-bar-fill" style={{ width: `${dev.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="device-footer-stat">
            期間總計觸發事件數：<strong>{totalEvents.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Trend Series Table */}
      {trends.length > 0 && (
        <div className="funnel-card">
          <h3 className="card-heading">轉換漏斗時間趨勢 ({rangeDays === 1 ? '每小時' : '每日'}紀錄)</h3>
          <div className="funnel-steps-table-wrapper">
            <table className="funnel-table">
              <thead>
                <tr>
                  <th>時間 ({rangeDays === 1 ? '時' : '日'})</th>
                  <th>首頁瀏覽</th>
                  <th>範例點擊</th>
                  <th>點擊體驗</th>
                  <th>送出 Email</th>
                  <th>登入成功</th>
                  <th>開始填表</th>
                  <th>建立孩子</th>
                  <th>完成設定</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice().reverse().map((t) => (
                  <tr key={t.date}>
                    <td>
                      <code>{t.date}</code>
                    </td>
                    <td>{t.landing_view}</td>
                    <td>{t.sample_click}</td>
                    <td>{t.free_trial_click}</td>
                    <td>{t.email_submit}</td>
                    <td>{t.auth_complete}</td>
                    <td>{t.child_form_start}</td>
                    <td>{t.child_created}</td>
                    <td>
                      <strong className="text-emerald">{t.onboarding_complete}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
