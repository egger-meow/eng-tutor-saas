import type {
  InstructionTopic,
  InstructionBlock,
} from '../../../types/student-material'

export interface InstructionRendererProps {
  instruction?: InstructionTopic[]
}

function renderBlock(block: InstructionBlock, key: number | string) {
  if (block.type === 'prose') {
    return (
      <div key={key} className="instruction-block">
        {block.titleZh && <h4>{block.titleZh}</h4>}
        <div style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
          {block.textZh}
        </div>
      </div>
    )
  }

  if (block.type === 'bullets') {
    return (
      <div key={key} className="instruction-block">
        {block.titleZh && <h4>{block.titleZh}</h4>}
        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {block.itemsZh.map((item, idx) => (
            <li key={idx} style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (block.type === 'comparison') {
    return (
      <div key={key} className="instruction-block">
        {block.titleZh && <h4>{block.titleZh}</h4>}
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                {block.headers.map((h, idx) => (
                  <th key={idx}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {block.takeawayZh && (
          <p style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-action)' }}>
            💡 核心結論：{block.takeawayZh}
          </p>
        )}
      </div>
    )
  }

  if (block.type === 'steps') {
    return (
      <div key={key} className="instruction-block">
        {block.titleZh && <h4>{block.titleZh}</h4>}
        <ol className="steps-list">
          {block.itemsZh.map((step, idx) => (
            <li key={idx} className="step-item">
              <span className="step-circle">{idx + 1}</span>
              <span style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (block.type === 'worked-example') {
    return (
      <div key={key} className="worked-example-card">
        {block.titleZh && <h4 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-ink)' }}>{block.titleZh}</h4>}
        <div style={{ fontWeight: 600, color: 'var(--color-action)', marginBottom: '0.25rem' }}>
          範例：{block.example}
        </div>
        <div style={{ fontSize: '0.9375rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
          解析：{block.walkthroughZh}
        </div>
      </div>
    )
  }

  if (block.type === 'error-analysis') {
    return (
      <div key={key} className="error-analysis-card">
        {block.titleZh && <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-ink)' }}>{block.titleZh}</h4>}
        <div className="error-wrong">
          <span>❌ 常見錯誤：</span>
          <span style={{ textDecoration: 'line-through' }}>{block.wrong}</span>
        </div>
        <div className="error-correct">
          <span>✔️ 正確表達：</span>
          <strong>{block.corrected}</strong>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', paddingLeft: '1.5rem', lineHeight: 1.5 }}>
          原因說明：{block.whyZh}
        </div>
      </div>
    )
  }

  return null
}

export function InstructionRenderer({ instruction }: InstructionRendererProps) {
  if (!instruction || instruction.length === 0) return null

  return (
    <section id="chapter-instruction" className="paper-sheet" aria-labelledby="heading-instruction">
      <div className="paper-section-header">
        <span className="paper-section-step">Step 4 · 文法與句構焦點</span>
        <h2 id="heading-instruction" className="paper-section-title">
          核心語言規則精析
        </h2>
        <p className="paper-section-desc">
          拆解語法規則、常見混淆與句型結構，奠定堅實的英文理解力。
        </p>
      </div>

      <div className="instruction-block-list">
        {instruction.map((topic) => (
          <div key={topic.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
              📌 {topic.titleZh}
            </h3>

            {/* V26 Modern Blocks */}
            {topic.blocks && topic.blocks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {topic.blocks.map((b, idx) => renderBlock(b, idx))}
              </div>
            )}

            {/* Legacy 1.0/2.0 Structure Fallback */}
            {!topic.blocks && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {topic.explanationZh && (
                  <div className="instruction-block">
                    <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--color-text)' }}>
                      {topic.explanationZh}
                    </p>
                  </div>
                )}

                {topic.patterns && topic.patterns.length > 0 && (
                  <div className="instruction-block">
                    <h4 style={{ margin: '0 0 var(--space-2) 0' }}>句型公式</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {topic.patterns.map((p, idx) => (
                        <li key={idx} style={{ fontFamily: 'monospace', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topic.workedExamples && topic.workedExamples.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {topic.workedExamples.map((we, idx) => (
                      <div key={idx} className="worked-example-card">
                        <div style={{ fontWeight: 600, color: 'var(--color-action)' }}>範例：{we.example}</div>
                        <div style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>{we.walkthroughZh}</div>
                      </div>
                    ))}
                  </div>
                )}

                {topic.commonMistakes && topic.commonMistakes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {topic.commonMistakes.map((cm, idx) => (
                      <div key={idx} className="error-analysis-card">
                        <div className="error-wrong">❌ {cm.wrong}</div>
                        <div className="error-correct">✔️ {cm.corrected}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>{cm.whyZh}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
