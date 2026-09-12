import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'
import { handleInternalLink } from '../app/use-route'
import { listChildren, type Child } from '../lib/children'
import { gradeStageLabel } from '../lib/grade-stage'
import {
  getChildAssessmentOverview,
  formatAssessmentDate,
  type AssessmentOverview,
} from '../lib/assessment'
import '../styles/assessment.css'

interface ChildAssessmentCardProps {
  child: Child
  overview?: AssessmentOverview | null
}

export function ChildAssessmentCard({ child, overview }: ChildAssessmentCardProps) {
  const status = overview?.status ?? 'not_started'
  const isRetakeEligible = status === 'completed' && Boolean(overview?.retakeEligible)
  const completedDate = formatAssessmentDate(overview?.completedAt)

  return (
    <article className="assessment-child-card surface-card" data-child-id={child.id}>
      <div className="assessment-child-card-header">
        <h2 className="assessment-child-card-name">{child.display_name}</h2>
        <p className="assessment-child-card-grade">{gradeStageLabel(child)}</p>
      </div>

      <div className="assessment-child-card-body">
        {status === 'not_started' && (
          <>
            <p className="assessment-child-status-title assessment-status-not-started">
              尚未完成程度診斷
            </p>
            <p className="assessment-child-status-subtitle">單字・文法・閱讀</p>
          </>
        )}

        {status === 'in_progress' && (
          <>
            <p className="assessment-child-status-title assessment-status-in-progress">
              診斷進行中
            </p>
            <p className="assessment-child-status-subtitle">
              已完成 {overview?.itemsCompleted ?? 0} 題
            </p>
          </>
        )}

        {status === 'completed' && !isRetakeEligible && (
          <>
            <p className="assessment-child-status-title assessment-status-completed">
              程度診斷已完成
            </p>
            <p className="assessment-child-status-subtitle">{completedDate}</p>
          </>
        )}

        {status === 'completed' && isRetakeEligible && (
          <>
            <p className="assessment-child-status-title assessment-status-retake-eligible">
              建議更新程度診斷
            </p>
            <p className="assessment-child-status-subtitle">
              上次完成：{completedDate}
            </p>
          </>
        )}
      </div>

      <div className="assessment-child-card-actions">
        {status === 'not_started' && (
          <a
            className="button button-primary"
            href={`/children/${child.id}/assessment`}
            onClick={handleInternalLink}
            data-assessment-action="start"
          >
            開始程度診斷
          </a>
        )}

        {status === 'in_progress' && (
          <a
            className="button button-primary"
            href={`/children/${child.id}/assessment`}
            onClick={handleInternalLink}
            data-assessment-action="resume"
          >
            繼續診斷
          </a>
        )}

        {status === 'completed' && !isRetakeEligible && (
          <a
            className="button button-secondary"
            href={`/children/${child.id}/assessment`}
            onClick={handleInternalLink}
            data-assessment-action="view-result"
          >
            查看結果
          </a>
        )}

        {status === 'completed' && isRetakeEligible && (
          <>
            <a
              className="button button-primary"
              href={`/children/${child.id}/assessment?action=retake`}
              onClick={handleInternalLink}
              data-assessment-action="retake"
            >
              重新診斷
            </a>
            <a
              className="button button-secondary"
              href={`/children/${child.id}/assessment`}
              onClick={handleInternalLink}
              data-assessment-action="view-last-result"
            >
              查看上次結果
            </a>
          </>
        )}
      </div>
    </article>
  )
}

interface AssessmentHubPageProps {
  session: Session
  initialChildren?: Child[]
  initialOverviews?: Record<string, AssessmentOverview>
}

export function AssessmentHubPage({
  session,
  initialChildren,
  initialOverviews,
}: AssessmentHubPageProps) {
  const [children, setChildren] = useState<Child[]>(initialChildren ?? [])
  const [overviews, setOverviews] = useState<Record<string, AssessmentOverview>>(
    initialOverviews ?? {}
  )
  const [loading, setLoading] = useState(initialChildren === undefined)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const childList = await listChildren()
      setChildren(childList)

      if (childList.length > 0) {
        const results = await Promise.allSettled(
          childList.map((c) => getChildAssessmentOverview(c.id))
        )
        const overviewMap: Record<string, AssessmentOverview> = {}
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            overviewMap[childList[idx].id] = res.value
          }
        })
        setOverviews(overviewMap)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入程度診斷資料失敗，請稍後再試。'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialChildren !== undefined) return
    void loadData()
  }, [initialChildren, loadData])

  const primaryChild = children[0]
  const childHref = primaryChild ? `/children/${primaryChild.id}` : '/children'

  return (
    <AppShell
      header={
        <ParentNavigation
          email={session.user.email}
          childHref={childHref}
          onSignOut={() => void getSupabaseClient().auth.signOut()}
        />
      }
    >
      <PageTransition>
        <section className="assessment-hub-page" aria-label="程度診斷管理">
          <header className="assessment-hub-header">
            <p className="overline">程度診斷</p>
            <h1>程度診斷</h1>
            <p className="assessment-hub-lede">
              讓孩子直接作答，從單字、文法與閱讀了解目前的學習位置。
              <br />
              診斷是選用的，完成後會成為後續教材的個人化依據之一。
            </p>
          </header>

          {loading && (
            <div className="loading-state" role="status">
              <div className="loading-spinner" />
              <p>正在整理孩子的程度診斷狀態…</p>
            </div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <p>{error}</p>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void loadData()}
              >
                重新載入
              </button>
            </div>
          )}

          {!loading && !error && children.length === 0 && (
            <div className="assessment-hub-empty surface-card">
              <h2>尚未建立孩子資料</h2>
              <p className="muted">
                建立孩子資料後，即可為孩子進行程度診斷與個人化教材安排。
              </p>
              <a
                className="button button-primary"
                href="/children/new"
                onClick={handleInternalLink}
              >
                新增孩子
              </a>
            </div>
          )}

          {!loading && !error && children.length > 0 && (
            <div
              className="assessment-hub-list"
              role="list"
              aria-label="孩子的程度診斷列表"
            >
              {children.map((child) => (
                <ChildAssessmentCard
                  key={child.id}
                  child={child}
                  overview={overviews[child.id]}
                />
              ))}
            </div>
          )}
        </section>
      </PageTransition>
    </AppShell>
  )
}
