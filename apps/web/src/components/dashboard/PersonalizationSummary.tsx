import { readGenerationSummary, type Material } from '../../lib/materials'

export function PersonalizationSummary({ material }: { material: Material }) {
  const summary = readGenerationSummary(material.generation_summary)
  return (
    <section className="personalization-summary" aria-labelledby="personalization-title">
      <p className="overline">這週如何客製化</p>
      <h3 id="personalization-title">每一週都接續孩子目前的狀態</h3>
      <p>{summary.learningAdjustmentSummary ?? '這份教材依照孩子目前的年級、學習資料與最近進度安排。回饋會用於下一週，不會改動已完成的教材。'}</p>
    </section>
  )
}

