import type { LearningLibrarySummary, LearningStatusCounts } from '../../lib/learning-library'

function StatusCounts({ label, counts }: { label: string; counts: LearningStatusCounts }) {
  return <li><strong>{label}</strong><span>接觸 {counts.exposed}</span><span>學習中 {counts.learning}</span><span>有證據的掌握 {counts.evidenceMastered}</span>{Boolean(counts.reviewing) && <span>需要再複習 {counts.reviewing}</span>}</li>
}

export function LearningJourneySummary({ summary }: { summary: LearningLibrarySummary }) {
  return <section className="learning-journey-summary" aria-labelledby="learning-journey-title">
    <p className="overline">持續累積的學習歷程</p>
    <h3 id="learning-journey-title">已完成 {summary.totalWeeks} 週</h3>
    <ul className="learning-status-counts">
      <StatusCounts label="單字" counts={summary.vocabulary} />
      <StatusCounts label="文法" counts={summary.grammar} />
      <StatusCounts label="溝通功能" counts={summary.communication} />
    </ul>
    <p><strong>目前閱讀：</strong>{summary.readingTrajectory.label ?? '尚待更多觀察'}</p>
    <p className="learning-evidence-explanation">{summary.masteryEvidenceExplanation}</p>
  </section>
}
