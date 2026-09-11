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
  const isRetakeEligible = status === 'completed' && Boolean(overview?.retakeEligible)

  let title = '更精準了解目前程度'
  let description =
    '「讓孩子完成一段簡短的英文程度診斷，我們會從單字、文法與閱讀找出更適合的學習起點。」'

  if (status === 'completed') {
    if (isRetakeEligible) {
      title = '建議更新程度診斷'
      description =
        '上次診斷已超過 90 天。若想重新校準系統對孩子目前能力的掌握，可以進行一次簡短的程度診斷；若不重新測驗，系統會持續依據每週學習表現微調材料。'
    } else {
      title = '程度診斷已完成'
      description =
        '目前系統已結合診斷結果與每週學習表現自動調整材料。下次可重新診斷時間為完成後 90 天。'
    }
  }

  const progressHint =
    status === 'in_progress' && overview && overview.itemsCompleted > 0
      ? `（已完成 ${overview.itemsCompleted} 題）`
      : ''

  return (
    <section className="assessment-recommendation-panel" aria-label="程度診斷推薦">
      <div className="assessment-rec-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="assessment-rec-cta">
        {status === 'completed' ? (
          isRetakeEligible ? (
            <div className="assessment-rec-actions">
              <a
                className="button button-primary button-sm"
                href={`/children/${childId}/assessment?action=retake`}
                onClick={handleInternalLink}
                data-assessment-status="retake_eligible"
                aria-busy={loading}
              >
                重新診斷
              </a>
              <a
                className="button button-secondary button-sm"
                href={`/children/${childId}/assessment`}
                onClick={handleInternalLink}
                data-assessment-status="completed"
                aria-busy={loading}
              >
                查看上次結果
              </a>
            </div>
          ) : (
            <a
              className="button button-secondary button-sm"
              href={`/children/${childId}/assessment`}
              onClick={handleInternalLink}
              data-assessment-status="completed"
              aria-busy={loading}
            >
              查看診斷結果
            </a>
          )
        ) : (
          <a
            className="button button-primary button-sm"
            href={`/children/${childId}/assessment`}
            onClick={handleInternalLink}
            data-assessment-status={status}
            aria-busy={loading}
          >
            {status === 'in_progress' ? '繼續程度診斷' : '開始程度診斷'} {progressHint}
          </a>
        )}
      </div>
    </section>
  )
}
