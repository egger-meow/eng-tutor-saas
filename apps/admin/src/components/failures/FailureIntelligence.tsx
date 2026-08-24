import React, { useState } from 'react'
import type { FailureIntelligence, QualityEra } from '../../client/types.js'

interface Props { data: FailureIntelligence | null; currentEra: QualityEra; onSelectEra: (era: QualityEra) => void; onDrillDownTimeline: (childId: string, week?: string) => void }

export const FailureIntelligenceView: React.FC<Props> = ({ data, currentEra, onSelectEra }) => {
  const [selected, setSelected] = useState<FailureIntelligence['qualityRuleViolations'][number] | null>(null)
  if (!data) return <div>Loading failures…</div>
  return <div>
    <div className="section-title"><span>Finisher quality rejections</span><select value={currentEra} onChange={(event) => onSelectEra(event.target.value as QualityEra)}><option value="current">Current engine</option><option value="historical">Historical</option><option value="all">All</option></select></div>
    <div className="quality-rule-grid">
      {data.qualityRuleViolations.map((rule) => <button className="cockpit-card quality-rule-card" key={rule.rule} onClick={() => setSelected(rule)}>
        <div className="card-header-sm"><strong>{rule.rule}</strong><span className="status-pill quality_rejected">{rule.count}</span></div>
        <p>{rule.description}</p>
        <div className="pipeline-job-meta"><span>{rule.affectedChildrenCount} children</span><span>Attempts {rule.attempts.join(', ') || '—'}</span></div>
        <small>{rule.sampleFinding}</small>
      </button>)}
      {!data.qualityRuleViolations.length && <div className="cockpit-card">No quality rejections in this window.</div>}
    </div>
    <details className="cockpit-card technical-failures"><summary>Engineering failures ({data.errorCodeClusters.length})</summary>
      {data.errorCodeClusters.map((item) => <div className="technical-row" key={item.errorCode}><strong>{item.errorCode}</strong><span>{item.count} · {item.stage}</span><small>{item.sampleMessage}</small></div>)}
    </details>
    {selected && <div className="evidence-modal" onClick={() => setSelected(null)}><div className="cockpit-card evidence-dialog" onClick={(event) => event.stopPropagation()}>
      <div className="section-title"><span>{selected.rule}</span><button className="refresh-btn" onClick={() => setSelected(null)}>Close</button></div>
      {selected.recentExamples.map((example) => <div className="evidence-example" key={`${example.jobId}-${example.attempt}`}><strong>{example.childPseudonym} · {example.materialWeek} · attempt {example.attempt}</strong><p>{example.message}</p><pre className="code-inspector">{JSON.stringify(example.evidence, null, 2)}</pre></div>)}
    </div></div>}
  </div>
}
