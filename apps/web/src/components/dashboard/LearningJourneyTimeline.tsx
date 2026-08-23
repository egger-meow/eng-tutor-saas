import type { LearningTimelineItem } from '../../lib/learning-library'

export function LearningJourneyTimeline({ items, loadingMore, onLoadMore }: { items: LearningTimelineItem[]; loadingMore: boolean; onLoadMore: () => void }) {
  if (items.length === 0) return <p>完成第一份教材後，這裡會開始累積學習歷程。</p>
  return <section className="learning-journey-timeline" aria-labelledby="learning-timeline-title">
    <h3 id="learning-timeline-title">每週學習紀錄</h3>
    <ol>{items.map((item) => <li key={item.sequenceNumber}>
      <h4>Week {item.sequenceNumber}</h4>
      <p><time dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleDateString('zh-TW')}</time> · 閱讀：{item.readingTrajectory}</p>
      <p>新接觸 {item.introducedCount} 個單字，複習 {item.reviewedCount} 個。</p>
      {item.improvements.length > 0 && <p><strong>看見進步：</strong>{item.improvements.join('、')}</p>}
      {item.nextReviewReasons.length > 0 && <p><strong>接下來再練：</strong>{item.nextReviewReasons.join('、')}</p>}
    </li>)}</ol>
    {items.length >= 10 && <button type="button" className="button button-quiet button-sm" disabled={loadingMore} onClick={onLoadMore} aria-label="載入更早的學習紀錄">{loadingMore ? '載入中…' : '看更早的紀錄'}</button>}
  </section>
}
