import { useId } from 'react'
import { readGenerationSummary, type Material } from '../../lib/materials'

export function PersonalizationSummary({ material }: { material: Material }) {
  const titleId = useId()
  const summary = readGenerationSummary(material.generation_summary, material.week_number)
  const reasons = summary.personalizationReasons && summary.personalizationReasons.length > 0
    ? summary.personalizationReasons
    : summary.learningAdjustmentSummary
      ? [summary.learningAdjustmentSummary]
      : []

  const defaultSingleMessage = material.week_number === 1
    ? '第一週為校準教材：先以基礎句型與核心單字建立學習基準，並透過文章主題觀察孩子的閱讀理解與文法掌握程度。'
    : '本週教材依照孩子目前的學習資料、文法複習重點與閱讀進度調整。'

  return (
    <section className="personalization-summary" aria-labelledby={titleId}>
      <p className="overline">這週如何客製化</p>
      <h3 id={titleId}>本週個人化調整重點</h3>
      {reasons.length > 1 ? (
        <ul className="personalization-reasons-list">
          {reasons.slice(0, 3).map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p>{reasons[0] ?? defaultSingleMessage}</p>
      )}
      {reasons.length > 3 && <details className="personalization-more">
        <summary>查看其他調整重點</summary>
        <ul>{reasons.slice(3).map(reason => <li key={reason}>{reason}</li>)}</ul>
      </details>}
    </section>
  )
}
