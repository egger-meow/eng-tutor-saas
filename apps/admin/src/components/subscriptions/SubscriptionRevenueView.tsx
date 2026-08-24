import React, { useState } from 'react'
import type { SubscriptionRevenueData } from '../../client/types.js'

interface Props { data: SubscriptionRevenueData | null; rangeDays: number; onRangeChange: (days: number) => void }
const STATUS_LABELS: Record<string, string> = { trialing: '體驗中', active: '付費訂閱中', cancel_scheduled: '已排定取消', past_due: '扣款異常', paused: '暫停', canceled: '已退訂' }
const EVENT_LABELS: Record<string, string> = { trial_started: '開始體驗', activated: '轉為付費', renewed: '續訂', cancel_scheduled: '排定取消', resumed: '恢復訂閱', past_due: '扣款異常', paused: '暫停', canceled: '取消', expired: '到期' }
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '—'
const money = (value: number | null) => value == null ? '—' : 'NT$' + value.toLocaleString('zh-TW')

function MiniChart({ title, data, field }: { title: string; data: SubscriptionRevenueData['series']; field: keyof SubscriptionRevenueData['series'][number] }) {
  const values = data.map((point) => Number(point[field]) || 0)
  const max = Math.max(1, ...values)
  const points = values.map((value, index) => String((index / Math.max(values.length - 1, 1)) * 100) + ',' + String(38 - (value / max) * 34)).join(' ')
  return <article className="cockpit-card metric-chart"><span>{title}</span><strong>{values.at(-1) ?? 0}{field === 'conversionPercent' ? '%' : ''}</strong>
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-label={title + '趨勢'}><polyline points={points} /></svg></article>
}

export const SubscriptionRevenueView: React.FC<Props> = ({ data, rangeDays, onRangeChange }) => {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (!data) return <div className="pipeline-empty">載入訂閱資料中…</div>
  const cards: Array<[string, number]> = [
    ['體驗中', data.current.trialing], ['付費訂閱中', data.current.activePaid], ['已排定取消', data.current.cancelScheduled],
    ['扣款異常', data.current.pastDue], ['暫停', data.current.paused], ['已退訂', data.current.canceled],
  ]
  return <div className="subscription-page">
    <header className="section-heading"><div><h2>訂閱與營收</h2><p>目前狀態取自 subscriptions；歷史趨勢只使用已記錄的生命週期事件。</p></div>
      <label>時間範圍 <select value={rangeDays} onChange={(event) => onRangeChange(Number(event.target.value))}>
        {[30, 90, 180, 365].map((days) => <option key={days} value={days}>最近 {days} 天</option>)}
      </select></label></header>
    <section className="subscription-state-grid">{cards.map(([label, value]) => <div className="cockpit-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    {!data.instrumentationStartedAt && <div className="neutral-notice">尚無生命週期事件資料；不會以目前 subscription status 推測過去曲線。</div>}
    {data.instrumentationStartedAt && <p className="instrumentation-note">可觀測歷史起點：{formatDate(data.instrumentationStartedAt)}</p>}
    <section className="chart-grid">
      <MiniChart title="付費訂閱數" data={data.series} field="activePaid" /><MiniChart title="體驗開始" data={data.series} field="trials" />
      <MiniChart title="新增付費" data={data.series} field="newPaid" /><MiniChart title="取消／流失" data={data.series} field="cancellations" />
      <MiniChart title="訂閱淨成長" data={data.series} field="netGrowth" /><MiniChart title="體驗轉付費" data={data.series} field="conversionPercent" />
    </section>
    <section className="funnel-grid">
      <div className="cockpit-card"><h3>訂閱漏斗</h3>{data.funnels.subscription.observable ? <p>開始體驗 <b>{data.funnels.subscription.trialStarted}</b> → 轉為付費 <b>{data.funnels.subscription.activatedAfterTrial}</b></p> : <p>尚無可用的 authoritative 事件。</p>}</div>
      <div className="cockpit-card"><h3>取消漏斗</h3>{data.funnels.cancellation.observable ? <p>排定取消 <b>{data.funnels.cancellation.cancelScheduled}</b> → 已取消／到期 <b>{data.funnels.cancellation.canceled}</b></p> : <p>尚無可用的 authoritative 事件。</p>}</div>
    </section>
    <section><h3 className="section-title">目前訂閱</h3><div className="data-table-wrapper"><table className="cockpit-table"><thead><tr>
      <th>孩子</th><th>狀態</th><th>方案</th><th>價格</th><th>開始日期</th><th>續訂／本期結束</th><th>取消狀態</th>
    </tr></thead><tbody>{data.subscriptions.map((subscription) => <React.Fragment key={subscription.id}>
      <tr className="clickable-row" onClick={() => setExpanded(expanded === subscription.id ? null : subscription.id)}>
        <td>{subscription.childPseudonym}</td><td><span className={'status-pill ' + subscription.status}>{STATUS_LABELS[subscription.status] ?? subscription.status}</span></td>
        <td><code>{subscription.planCode ?? '—'}</code>{subscription.billingInterval ? ' / ' + subscription.billingInterval : ''}</td>
        <td>{money(subscription.priceTwd)}</td><td>{formatDate(subscription.startDate)}</td><td>{formatDate(subscription.currentPeriodEnd)}</td>
        <td>{subscription.cancelAtPeriodEnd ? '本期結束後取消' : '未排定取消'}</td>
      </tr>
      {expanded === subscription.id && <tr><td colSpan={7}><div className="subscription-timeline">
        {subscription.events.length ? subscription.events.map((event) => <div key={event.id}><time>{formatDate(event.effectiveAt)}</time><strong>{EVENT_LABELS[event.eventType] ?? event.eventType}</strong><code>{event.sourceEventId ?? event.source}</code></div>) : <p>尚無可觀測的生命週期事件。</p>}
      </div></td></tr>}
    </React.Fragment>)}</tbody></table></div></section>
  </div>
}