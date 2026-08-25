import type { LearningLibrarySummary, LearningStatusCounts } from '../../lib/learning-library'

function StatusCounts({ label, counts }: { label: string; counts: LearningStatusCounts }) {
  return (
    <li className="learning-status-item">
      <strong className="status-label">{label}</strong>
      <div className="status-badge-group">
        <span className="status-badge">接觸 {counts.exposed}</span>
        <span className="status-badge">學習中 {counts.learning}</span>
        <span className="status-badge status-badge-mastered">有證據的掌握 {counts.evidenceMastered}</span>
        {Boolean(counts.reviewing) && <span className="status-badge status-badge-review">需要再複習 {counts.reviewing}</span>}
      </div>
    </li>
  )
}

export function LearningJourneySummary({ summary }: { summary: LearningLibrarySummary }) {
  return (
    <section className="learning-journey-summary" aria-labelledby="learning-journey-title">
      <div className="learning-summary-top">
        <div className="learning-summary-title-group">
          <p className="overline">持續累積的學習歷程</p>
          <h3 id="learning-journey-title" className="learning-journey-heading">
            已完成 <span className="highlight-number">{summary.totalWeeks}</span> 週
          </h3>
        </div>
        <div className="reading-trajectory-box">
          <span className="reading-label">目前閱讀：</span>
          <span className="reading-val">{summary.readingTrajectory?.label ?? '尚待更多觀察'}</span>
        </div>
      </div>

      <ul className="learning-status-counts">
        <StatusCounts label="單字" counts={summary.vocabulary} />
        <StatusCounts label="文法" counts={summary.grammar} />
        <StatusCounts label="溝通功能" counts={summary.communication} />
      </ul>

      <p className="learning-evidence-explanation">
        {summary.masteryEvidenceExplanation}
      </p>
    </section>
  )
}
