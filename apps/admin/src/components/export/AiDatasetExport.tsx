import React, { useState } from 'react'
import type { AiExportDataset as AiExportDatasetType } from '../../client/types.js'

interface AiDatasetExportProps {
  data: AiExportDatasetType | null
}

export const AiDatasetExportView: React.FC<AiDatasetExportProps> = ({ data }) => {
  const [copied, setCopied] = useState(false)

  if (!data) return <div>讀取中...</div>

  const jsonString = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('複製失敗，請手動選取複製')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paper-english-ai-dataset-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Introduction Card */}
      <div className="cockpit-card featured" style={{ marginBottom: '20px' }}>
        <div className="section-title">
          <span>🤖 AI 系統改善資料集架構 (AI Agent Observability Dataset)</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="refresh-btn"
              style={{ background: '#065f46', color: '#a7f3d0', borderColor: '#059669', fontWeight: 600 }}
              onClick={handleCopy}
            >
              {copied ? '✓ 已複製 JSON' : '📋 複製結構化 JSON'}
            </button>
            <button
              className="refresh-btn"
              style={{ background: '#1e3a8a', color: '#bfdbfe', borderColor: '#2563eb', fontWeight: 600 }}
              onClick={handleDownload}
            >
              💾 下載 Dataset 檔案
            </button>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
          本功能將生產環境的<strong>生成失敗模式</strong>、<strong>Finisher 品質違規規律</strong>與<strong>家長每週學習反饋聚類</strong>轉換為標準化、去識別化 (PII-Scrubbed) 的結構化觀察資料集。未來可直接提供給 AI Prompt 與 Curriculum 引擎迭代 Agent 進行 Prompt 優化與題型改良，實現：
        </p>

        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#93c5fd' }}>
          Production Data → Sanitized Structured Observations → AI Analysis → Proposed Generator / Prompt Improvements → Human Review
        </div>
      </div>

      {/* Dataset Summary Metrics */}
      <div className="kpi-grid">
        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>生成失敗證據數</span>
            <span className="status-pill failed">Failures</span>
          </div>
          <div className="kpi-value">{data.generationFailureEvidence.length} 件</div>
          <div className="kpi-subtext">主要代碼: {data.provenance.dominantFailureCode || '無'}</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>家長反饋證據筆數</span>
            <span className="status-pill pending">Feedback</span>
          </div>
          <div className="kpi-value">{data.parentFeedbackEvidence.length} 筆</div>
          <div className="kpi-subtext">去識別化 Snippets</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>品質審核防護規則</span>
            <span className="status-pill quality_rejected">Rubrics</span>
          </div>
          <div className="kpi-value">{data.qualityRuleViolationSummary.length} 項</div>
          <div className="kpi-subtext">Deterministic Guardrails</div>
        </div>

        <div className="cockpit-card">
          <div className="card-header-sm">
            <span>總證據項 (Provenance)</span>
            <span className="status-pill active">Evidence</span>
          </div>
          <div className="kpi-value">{data.provenance.totalEvidenceCount}</div>
          <div className="kpi-subtext">Taxonomy: {data.taxonomyVersion} | Rule: {data.ruleVersions?.join(', ') || '2.2.0'}</div>
        </div>
      </div>

      {/* Structured JSON Preview */}
      <div className="cockpit-card">
        <div className="section-title">
          <span>標準 JSON 資料集預覽 (Sanitized AI Dataset Output)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Schema Version: {data.schemaVersion}</span>
        </div>

        <div style={{ marginTop: '12px' }}>
          <pre className="code-inspector" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  )
}
