import React, { useMemo, useState } from 'react'
import type { ProductFeedbackIntelligence } from '../../client/types.js'

export const ProductFeedbackView: React.FC<{ data: ProductFeedbackIntelligence | null }> = ({ data }) => {
  const [category, setCategory] = useState('all')
  const [days, setDays] = useState(30)
  const messages = useMemo(() => data?.messages.filter((item) => (category === 'all' || item.category === category) && Date.parse(item.createdAt) >= Date.now() - days * 86400000) || [], [data, category, days])
  if (!data) return <div>Loading product feedback…</div>
  return <div>
    <div className="kpi-grid">{data.categoryBreakdown.map((item) => <div className="cockpit-card" key={item.category}><div className="card-header-sm"><span>{item.label}</span><strong>{item.count}</strong></div><div className="kpi-subtext">{item.percentage}% of feedback</div></div>)}</div>
    <section className="cockpit-card">
      <div className="section-title"><span>Sanitized feedback messages</span><div className="feedback-filters"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{data.categoryBreakdown.map((item) => <option key={item.category} value={item.category}>{item.label}</option>)}</select><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={3650}>All time</option></select></div></div>
      <div className="feedback-message-list">{messages.map((item) => <article key={item.id}><div><span className="status-pill pending">{item.category}</span><time>{new Date(item.createdAt).toLocaleString('zh-TW', { hour12: false })}</time></div><p>{item.message}</p></article>)}{!messages.length && <p className="pipeline-empty">No messages match these filters.</p>}</div>
    </section>
  </div>
}
