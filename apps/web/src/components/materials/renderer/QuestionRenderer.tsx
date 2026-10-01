import type { Question } from '../../../types/student-material'
import { ProjectedContent } from './ProjectedContent'
import { useAnswerReadOnly } from './AnswerReadOnlyContext'

export interface QuestionRendererProps {
  question: Question
  index: number
  draftAnswers: Record<string, string>
  onAnswerChange: (key: string, value: string, immediate?: boolean) => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function QuestionRenderer({
  question,
  index,
  draftAnswers,
  onAnswerChange,
}: QuestionRendererProps) {
  const readOnly = useAnswerReadOnly()
  const qId = question.id || question.questionId || `q-${index}`
  const selectedAnswer = draftAnswers[qId] ?? ''

  const hasOptions = Array.isArray(question.options) && question.options.length > 0
  const layout = question.responseLayout
  const needsLegacyResponse = !hasOptions && layout && (
    ((layout.type === 'table' || layout.type === 'organizer') && !layout.rows?.some(row => row.cells?.some(cell => cell.responseUnitId)))
    || (layout.type === 'sequence' && !layout.items?.some(item => item.responseUnitId))
  )

  return (
    <div className="question-card" id={`q-card-${qId}`}>
      <div className="question-heading">
        <span className="question-number">Q{index + 1}.</span>
        <p id={`prompt-${qId}`} className="question-prompt">{question.prompt}</p>
      </div>

      {/* 1. Multiple Choice Questions */}
      {hasOptions && (
        <div className="options-grid">
          {question.options!.map((opt, optIdx) => {
            const letter = OPTION_LETTERS[optIdx] ?? String(optIdx + 1)
            // Support matching either the letter 'A' or the full text
            const isSelected = selectedAnswer === letter || selectedAnswer === opt

            return (
              <div
                key={optIdx}
                className={`option-card ${isSelected ? 'selected' : ''}`}
                role="button"
                tabIndex={readOnly ? -1 : 0}
                aria-disabled={readOnly}
                aria-pressed={isSelected}
                onClick={() => { if (!readOnly) onAnswerChange(qId, letter, true) }}
                onKeyDown={(e) => {
                  if (!readOnly && (e.key === ' ' || e.key === 'Enter')) {
                    e.preventDefault()
                    onAnswerChange(qId, letter, true)
                  }
                }}
              >
                <div className="option-badge">{letter}</div>
                <div className="option-text">{opt}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* 2. Structured Layouts (Table / Organizer / Sequence / Lines) */}
      {!hasOptions && layout && (
        <div>
          {/* Table or Organizer */}
          {(layout.type === 'table' || layout.type === 'organizer') && (
            <div style={{ overflowX: 'auto' }}>
              <table className="response-grid-table">
                {layout.headers && (
                  <thead>
                    <tr>
                      {layout.headers.map((h: string, hIdx: number) => (
                        <th key={hIdx}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {layout.rows?.map((row, rIdx: number) => (
                    <tr key={rIdx}>
                      {row.label && <td><strong>{row.label}</strong></td>}
                      {row.values?.map((v: string, vIdx: number) => (
                        <td key={vIdx}>{v}</td>
                      ))}
                      {row.cells?.map((cell, cIdx: number) => {
                        const cellKey = cell.responseUnitId ?? `${qId}-cell-${rIdx}-${cIdx}`
                        return (
                          <td key={cIdx}>
                            {cell.responseUnitId ? (
                              <input
                                aria-label={`${question.prompt} · ${row.label ?? `第 ${rIdx + 1} 列`} · ${layout.headers?.[cIdx] ?? `欄 ${cIdx + 1}`}`}
                                readOnly={readOnly}
                                type="text"
                                className="response-grid-input"
                                placeholder={cell.placeholder ?? '填寫作答…'}
                                value={draftAnswers[cellKey] ?? ''}
                                onChange={(e) => onAnswerChange(cellKey, e.target.value)}
                              />
                            ) : (
                              <span>{cell.text ?? ''}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sequence */}
          {layout.type === 'sequence' && (
            <div className="sequence-container">
              {layout.items?.map((item, sIdx: number) => {
                const itemKey = item.responseUnitId ?? `${qId}-seq-${sIdx}`
                return (
                  <div key={sIdx} className="sequence-item-card">
                    <span className="sequence-step-num">{item.stepNumber ?? sIdx + 1}</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {item.label && <strong>{item.label}</strong>}
                      {item.content && <span style={{ color: 'var(--color-text)' }}>{item.content}</span>}
                      {item.responseUnitId && (
                        <input
                          aria-label={`${question.prompt} · ${item.label ?? `步驟 ${sIdx + 1}`}`}
                          readOnly={readOnly}
                          type="text"
                          className="response-grid-input"
                          placeholder={item.placeholder ?? '請輸入該步驟的作答…'}
                          value={draftAnswers[itemKey] ?? ''}
                          onChange={(e) => onAnswerChange(itemKey, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!['table', 'organizer', 'sequence', 'lines'].includes(layout.type) && <ProjectedContent value={layout} />}
          {/* Lines */}
          {layout.type === 'lines' && (
            <textarea
              aria-labelledby={`prompt-${qId}`}
              readOnly={readOnly}
              className="ruled-textarea"
              placeholder="在此輸入你的答案…"
              value={selectedAnswer}
              onChange={(e) => onAnswerChange(qId, e.target.value)}
              rows={layout.lineCount ?? 2}
            />
          )}
        </div>
      )}

      {/* 3. Written Response Default / Fallback */}
      {needsLegacyResponse && <p className="muted">參照上方表格或步驟，在下方依序寫下各部分的答案。</p>}
      {!hasOptions && (!layout || needsLegacyResponse || !['table', 'organizer', 'sequence', 'lines'].includes(layout.type)) && (
        <textarea
          aria-labelledby={`prompt-${qId}`}
          readOnly={readOnly}
          className="ruled-textarea"
          placeholder="在此輸入你的答案…"
          value={selectedAnswer}
          onChange={(e) => onAnswerChange(qId, e.target.value)}
          rows={question.writingLines && question.writingLines > 0 ? question.writingLines : 2}
        />
      )}
    </div>
  )
}
