import React, { useState } from 'react'
import { formatEngineVersion, CURRENT_ENGINE_VERSION, type AiExportDataset as AiExportDatasetType, type QualityEra } from '../../client/types.js'

interface AiDatasetExportProps {
  data: AiExportDatasetType | null
  currentEra?: QualityEra
  onSelectEra?: (era: QualityEra) => void
}

export const AiDatasetExportView: React.FC<AiDatasetExportProps> = ({
  data,
  currentEra = 'current',
  onSelectEra,
}) => {
  const [copied, setCopied] = useState(false)

  if (!data) return <div>讀取中...</div>

  const currentEngineLabel = data.provenance?.currentEraName || formatEngineVersion(CURRENT_ENGINE_VERSION)
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
    a.download = `paper-english-ai-dataset-${currentEra}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Quality Era Selector for Export */}
      {onSelectEra && (
        <div className="cockpit-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                  匯出資料集品質版本範圍
                </span>
                <span className={`status-pill ${currentEra === 'current' ? 'active' : currentEra === 'historical' ? 'warning' : 'pending'}`}>
                  {currentEra === 'current' ? currentEngineLabel : currentEra === 'historical' ? '歷史版本' : '全部版本'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {currentEra === 'current' ? (
                  <span>⚡ 匯出 <strong>{currentEngineLabel}</strong> 證據（Schema 2.2.0 · Prompt 2.4.0 · Model Quality Profiles）</span>
                ) : currentEra === 'historical' ? (
                  <span>📜 匯出歷史封存版本證據</span>
                ) : (
                  <span>🌐 匯出全世代合併證據資料集</span>
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
                  padding: '5px 12px',
                }}
                onClick={() => onSelectEra('current')}
              >
                ⚡ {currentEngineLabel}
              </button>
              <button
                className={`refresh-btn ${currentEra === 'historical' ? 'active' : ''}`}
                style={{
                  background: currentEra === 'historical' ? '#4c1d95' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: currentEra === 'historical' ? '#7c3aed' : 'var(--border-subtle)',
                  color: currentEra === 'historical' ? '#ddd6fe' : 'var(--text-muted)',
                  fontWeight: currentEra === 'historical' ? 700 : 500,
                  fontSize: '12px',
                  padding: '5px 12px',
                }}
                onClick={() => onSelectEra('historical')}
              >
                📜 歷史版本
              </button>
              <button
                className={`refresh-btn ${currentEra === 'all' ? 'active' : ''}`}
                style={{
                  background: currentEra === 'all' ? '#1e3a8a' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: currentEra === 'all' ? '#2563eb' : 'var(--border-subtle)',
                  color: currentEra === 'all' ? '#bfdbfe' : 'var(--text-muted)',
                  fontWeight: currentEra === 'all' ? 700 : 500,
                  fontSize: '12px',
                  padding: '5px 12px',
                }}
                onClick={() => onSelectEra('all')}
              >
                🌐 全部世代
              </button>
            </div>
          </div>
        </div>
      )}

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
          生產資料 → 去識別化結構觀察 → AI 分析 → 生成器／提示詞改善建議 → 人工審查
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
            <span className="status-pill pending">回饋</span>
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
          <div className="kpi-subtext" style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <span>Era: <strong>{currentEngineLabel}</strong> (e{data.provenance.currentEngineVersion || CURRENT_ENGINE_VERSION} / v{data.provenance.currentSchemaVersion} / p{data.provenance.currentPromptVersion})</span>
            <br />
            <span>{currentEngineLabel}: <strong>{data.provenance.currentEvidenceCount}</strong> | 歷史: <strong>{data.provenance.historicalEvidenceCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Structured JSON Preview */}
      <div className="cockpit-card">
        <div className="section-title">
          <span>標準 JSON 資料集預覽 (Sanitized AI Dataset Output)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Schema Version: {data.schemaVersion} · Era: {data.provenance.era || 'current'}</span>
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
