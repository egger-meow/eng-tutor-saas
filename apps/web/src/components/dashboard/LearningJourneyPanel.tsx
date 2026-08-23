import { useChildLearningLibrary } from '../../hooks/use-child-learning-library'
import { LearningJourneySummary } from './LearningJourneySummary'
import { LearningJourneyTimeline } from './LearningJourneyTimeline'

export function LearningJourneyPanel({ childId }: { childId: string }) {
  const library = useChildLearningLibrary(childId)
  if (library.loading) return <section className="learning-journey-panel" aria-busy="true"><p>正在整理學習歷程…</p></section>
  if (library.error) return <section className="learning-journey-panel" role="alert"><p>學習歷程目前無法載入。</p><button type="button" className="button-link" onClick={library.reload}>再試一次</button></section>
  if (!library.summary) return null
  return <div className="learning-journey-panel"><LearningJourneySummary summary={library.summary} /><LearningJourneyTimeline items={library.timeline} loadingMore={library.loadingMore} onLoadMore={library.loadMore} /></div>
}
