import { useEffect, useState } from 'react'
import { getChildAssessmentOverview, type AssessmentOverview } from '../../lib/assessment'
import { handleInternalLink } from '../../app/use-route'

interface AssessmentRecommendationProps {
  childId: string
  childName?: string
  initialOverview?: AssessmentOverview | null
}

export function AssessmentRecommendation({
  childId,
  initialOverview = null,
}: AssessmentRecommendationProps) {
  const [overview, setOverview] = useState<AssessmentOverview | null>(initialOverview)
  const [loading, setLoading] = useState<boolean>(!initialOverview)

  useEffect(() => {
    if (initialOverview) {
      setOverview(initialOverview)
      return
    }

    let isMounted = true
    void getChildAssessmentOverview(childId)
      .then((data) => {
        if (isMounted) {
          setOverview(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load child assessment overview', err)
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [childId, initialOverview])

  const status = overview?.status ?? 'not_started'

  const ctaText =
    status === 'completed'
      ? '查看診斷結果'
      : status === 'in_progress'
        ? '繼續程度診斷'
        : '開始程度診斷'

  const progressHint =
    status === 'in_progress' && overview && overview.itemsCompleted > 0
      ? `（已完成 ${overview.itemsCompleted} 題）`
      : ''

  return (
    <section className="assessment-recommendation-panel" aria-label="程度診斷推薦">
      <div className="assessment-rec-content">
        <h3>更精準了解目前程度</h3>
        <p>「讓孩子完成一段簡短的英文程度診斷，我們會從單字、文法與閱讀找出更適合的學習起點。」</p>
      </div>
      <div className="assessment-rec-cta">
        <a
          className={`button ${status === 'completed' ? 'button-secondary' : 'button-primary'} button-sm`}
          href={`/children/${childId}/assessment`}
          onClick={handleInternalLink}
          data-assessment-status={status}
          aria-busy={loading}
        >
          {ctaText} {progressHint}
        </a>
      </div>
    </section>
  )
}
