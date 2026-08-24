import React, { useState } from 'react'
import type { FailureIntelligence, QualityEra } from '../../client/types.js'
interface Props { data: FailureIntelligence | null; currentEra: QualityEra; onSelectEra: (era: QualityEra) => void; onDrillDownTimeline: (childId: string, week?: string) => void }
export const FailureIntelligenceView: React.FC<Props> = ({ data, currentEra, onSelectEra }) => {
  const [selected, setSelected] = useState<FailureIntelligence['qualityRuleViolations'][number] | null>(null)
  if (!data) return <div>載入失敗情報中…</div>
  return <div><div className="section-title"><span>Finisher 品質未通過原因</span><select value={currentEra} onChange={(event) => onSelectEra(event.target.value as QualityEra)}>
    <option value="current">目前引擎</option><option value="historical">歷史版本</option><option value="all">全部版本</option></select></div>
    <div className="quality-rule-grid">{data.qualityRuleViolations.map((rule) => <button className="cockpit-card quality-rule-card" key={rule.rule} onClick={() => setSelected(rule)}>
      <div className="pipeline-title"><strong><code>{rule.rule}</code></strong><b>{rule.count}</b></div><p>{rule.description}</p>
      <div className="pipeline-job-meta"><span>影響 {rule.affectedChildrenCount} 位孩子</span><span>嘗試次數：{rule.attempts.join('、') || '—'}</span></div>
    </button>)}</div>
    {!data.qualityRuleViolations.length && <div className="cockpit-card">此範圍沒有品質未通過紀錄。</div>}
    <details className="cockpit-card technical-failures"><summary>工程技術失敗（次要） · {data.errorCodeClusters.length}</summary>
      {data.errorCodeClusters.map((item) => <div className="technical-row" key={item.errorCode}><code>{item.errorCode}</code><b>{item.count}</b><small>{item.sampleMessage}</small></div>)}</details>
    {selected && <div className="evidence-modal" onClick={() => setSelected(null)}><section className="cockpit-card evidence-dialog" onClick={(event) => event.stopPropagation()}>
      <div className="section-title"><span><code>{selected.rule}</code></span><button className="refresh-btn" onClick={() => setSelected(null)}>關閉</button></div>
      {selected.recentExamples.map((example) => <div className="evidence-example" key={example.jobId + '-' + example.attempt}><strong>{example.childPseudonym} · {example.materialWeek} · 第 {example.attempt} 次嘗試</strong><p>{example.message}</p><pre className="code-inspector">{JSON.stringify(example.evidence, null, 2)}</pre></div>)}
    </section></div>}
  </div>
}