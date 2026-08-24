import React, { useState } from 'react'
import type { ProductFeedbackIntelligence } from '../../client/types.js'
export const ProductFeedbackView: React.FC<{ data: ProductFeedbackIntelligence | null }> = ({ data }) => {
  const [category, setCategory] = useState('all')
  const [days, setDays] = useState(30)
  if (!data) return <div>載入產品回饋中…</div>
  const cutoff = Date.now() - days * 86400000
  const messages = data.messages.filter((item) => (category === 'all' || item.category === category) && new Date(item.createdAt).getTime() >= cutoff)
  return <div><div className="section-title"><span>產品回饋分類分析</span></div>
    <div className="quality-rule-grid">{data.categoryBreakdown.map((item) => <div className="cockpit-card" key={item.category}><strong>{item.label}</strong><div className="kpi-value">{item.count}</div></div>)}</div>
    <div className="section-title"><span>去識別化回饋原文</span><div className="feedback-filters"><select value={category} onChange={(event) => setCategory(event.target.value)}>
      <option value="all">全部分類</option>{data.categoryBreakdown.map((item) => <option key={item.category} value={item.category}>{item.label}</option>)}</select>
      <select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>最近 7 天</option><option value={30}>最近 30 天</option><option value={90}>最近 90 天</option><option value={3650}>全部期間</option></select></div></div>
    <div className="feedback-message-list">{messages.map((item) => <article key={item.id}><div><span className="status-pill pending">{item.category}</span><time>{new Date(item.createdAt).toLocaleString('zh-TW', { hour12: false })}</time></div><p>{item.message}</p></article>)}
      {!messages.length && <p className="pipeline-empty">沒有符合篩選條件的回饋。</p>}</div></div>
}