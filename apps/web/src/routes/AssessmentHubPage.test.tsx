import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Session } from '@supabase/supabase-js'
import { AssessmentHubPage, ChildAssessmentCard } from './AssessmentHubPage'
import type { Child } from '../lib/children'
import { formatAssessmentDate, type AssessmentOverview } from '../lib/assessment'

const mockSession: Session = {
  access_token: 'fake-token',
  refresh_token: 'fake-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'parent-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00Z',
    email: 'parent@example.com',
  },
}

describe('AssessmentHubPage', () => {
  const childPax: Child = {
    id: 'c-pax-111',
    display_name: 'pax',
    grade: 7,
    grade_stage: 'grade_7',
    is_active: true,
    timezone: 'Asia/Taipei',
    delivery_weekday: 1,
    textbook_version: '康軒',
    next_generation_at: null,
    created_at: '2026-08-01T00:00:00Z',
  }

  const childAmy: Child = {
    id: 'c-amy-222',
    display_name: 'Amy',
    grade: 8,
    grade_stage: 'grade_8',
    is_active: true,
    timezone: 'Asia/Taipei',
    delivery_weekday: 1,
    textbook_version: '翰林',
    next_generation_at: null,
    created_at: '2026-08-01T00:00:00Z',
  }

  describe('formatAssessmentDate', () => {
    it('formats ISO timestamps to YYYY/MM/DD', () => {
      expect(formatAssessmentDate('2026-08-20T10:00:00Z')).toMatch(/^2026\/08\/2[01]$/)
      expect(formatAssessmentDate(null)).toBe('')
      expect(formatAssessmentDate(undefined)).toBe('')
    })
  })

  describe('ChildAssessmentCard states', () => {
    it('renders not-started state with calm guidance and start action', () => {
      const overviewNotStarted: AssessmentOverview = {
        childId: childPax.id,
        status: 'not_started',
        sessionId: null,
        itemsCompleted: 0,
        targetItemCount: 18,
        completedAt: null,
        retakeEligible: false,
        daysSinceCompleted: null,
        cooldownDays: 90,
      }

      const html = renderToStaticMarkup(
        <ChildAssessmentCard child={childPax} overview={overviewNotStarted} />
      )

      expect(html).toContain('pax')
      expect(html).toContain('國中 7 年級')
      expect(html).toContain('尚未完成程度診斷')
      expect(html).toContain('單字・文法・閱讀')
      expect(html).toContain('開始程度診斷')
      expect(html).toContain(`href="/children/${childPax.id}/assessment"`)
      expect(html).toContain('data-assessment-action="start"')
    })

    it('renders in-progress state with question count and resume action', () => {
      const overviewInProgress: AssessmentOverview = {
        childId: childPax.id,
        status: 'in_progress',
        sessionId: 'sess-active-1',
        itemsCompleted: 9,
        targetItemCount: 18,
        completedAt: null,
        retakeEligible: false,
        daysSinceCompleted: null,
        cooldownDays: 90,
      }

      const html = renderToStaticMarkup(
        <ChildAssessmentCard child={childPax} overview={overviewInProgress} />
      )

      expect(html).toContain('pax')
      expect(html).toContain('國中 7 年級')
      expect(html).toContain('診斷進行中')
      expect(html).toContain('已完成 9 題')
      expect(html).toContain('繼續診斷')
      expect(html).toContain(`href="/children/${childPax.id}/assessment"`)
      expect(html).toContain('data-assessment-action="resume"')
    })

    it('renders completed state within 90 days with date and view result action', () => {
      const overviewCompleted: AssessmentOverview = {
        childId: childAmy.id,
        status: 'completed',
        sessionId: 'sess-comp-1',
        itemsCompleted: 15,
        targetItemCount: 15,
        completedAt: '2026-08-20T12:00:00Z',
        retakeEligible: false,
        daysSinceCompleted: 23,
        cooldownDays: 90,
      }

      const html = renderToStaticMarkup(
        <ChildAssessmentCard child={childAmy} overview={overviewCompleted} />
      )

      expect(html).toContain('Amy')
      expect(html).toContain('國中 8 年級')
      expect(html).toContain('程度診斷已完成')
      expect(html).toContain(formatAssessmentDate('2026-08-20T12:00:00Z'))
      expect(html).toContain('查看結果')
      expect(html).toContain(`href="/children/${childAmy.id}/assessment"`)
      expect(html).toContain('data-assessment-action="view-result"')
    })

    it('renders retake-eligible state after 90 days with retake and view past result actions', () => {
      const overviewRetakeEligible: AssessmentOverview = {
        childId: childAmy.id,
        status: 'completed',
        sessionId: 'sess-comp-old',
        itemsCompleted: 15,
        targetItemCount: 15,
        completedAt: '2026-05-10T12:00:00Z',
        retakeEligible: true,
        daysSinceCompleted: 95,
        cooldownDays: 90,
      }

      const html = renderToStaticMarkup(
        <ChildAssessmentCard child={childAmy} overview={overviewRetakeEligible} />
      )

      expect(html).toContain('Amy')
      expect(html).toContain('國中 8 年級')
      expect(html).toContain('建議更新程度診斷')
      expect(html).toContain('上次完成：')
      expect(html).toContain(formatAssessmentDate('2026-05-10T12:00:00Z'))
      expect(html).toContain('重新診斷')
      expect(html).toContain(`href="/children/${childAmy.id}/assessment?action=retake"`)
      expect(html).toContain('data-assessment-action="retake"')
      expect(html).toContain('查看上次結果')
      expect(html).toContain(`href="/children/${childAmy.id}/assessment"`)
      expect(html).toContain('data-assessment-action="view-last-result"')
    })
  })

  describe('AssessmentHubPage layout and invariants', () => {
    const overviewPax: AssessmentOverview = {
      childId: childPax.id,
      status: 'not_started',
      sessionId: null,
      itemsCompleted: 0,
      targetItemCount: 18,
      completedAt: null,
      retakeEligible: false,
      daysSinceCompleted: null,
      cooldownDays: 90,
    }

    it('renders top-level heading and educational orientation lede', () => {
      const html = renderToStaticMarkup(
        <AssessmentHubPage
          session={mockSession}
          initialChildren={[childPax]}
          initialOverviews={{ [childPax.id]: overviewPax }}
        />
      )

      expect(html).toContain('<h1>程度診斷</h1>')
      expect(html).toContain('讓孩子直接作答，從單字、文法與閱讀了解目前的學習位置。')
      expect(html).toContain('診斷是選用的，完成後會成為後續教材的個人化依據之一。')
    })

    it('stays on the hub page even when there is only one child', () => {
      const html = renderToStaticMarkup(
        <AssessmentHubPage
          session={mockSession}
          initialChildren={[childPax]}
          initialOverviews={{ [childPax.id]: overviewPax }}
        />
      )

      // The hub page renders pax's card rather than auto-forwarding
      expect(html).toContain('pax')
      expect(html).toContain('國中 7 年級')
      expect(html).toContain('尚未完成程度診斷')
      expect(html).toContain('開始程度診斷')
    })

    it('does not render cards when overview is missing or failed', () => {
      // Missing overview for childPax means it will not be rendered as a card
      const html = renderToStaticMarkup(
        <AssessmentHubPage
          session={mockSession}
          initialChildren={[childPax]}
          initialOverviews={{}}
        />
      )

      expect(html).not.toContain('尚未完成程度診斷')
    })

    it('renders independent cards for multiple children', () => {
      const overviewAmy: AssessmentOverview = {
        childId: childAmy.id,
        status: 'completed',
        sessionId: 'sess-amy-1',
        itemsCompleted: 15,
        targetItemCount: 15,
        completedAt: '2026-08-20T12:00:00Z',
        retakeEligible: false,
        daysSinceCompleted: 23,
        cooldownDays: 90,
      }

      const html = renderToStaticMarkup(
        <AssessmentHubPage
          session={mockSession}
          initialChildren={[childPax, childAmy]}
          initialOverviews={{
            [childPax.id]: overviewPax,
            [childAmy.id]: overviewAmy,
          }}
        />
      )

      expect(html).toContain('pax')
      expect(html).toContain('國中 7 年級')
      expect(html).toContain('尚未完成程度診斷')

      expect(html).toContain('Amy')
      expect(html).toContain('國中 8 年級')
      expect(html).toContain('程度診斷已完成')
    })

    it('renders clean empty state when parent has no children', () => {
      const html = renderToStaticMarkup(
        <AssessmentHubPage
          session={mockSession}
          initialChildren={[]}
          initialOverviews={{}}
        />
      )

      expect(html).toContain('尚未建立孩子資料')
      expect(html).toContain('建立孩子資料後，即可為孩子進行程度診斷與個人化教材安排。')
      expect(html).toContain('新增孩子')
      expect(html).toContain('href="/children/new"')
    })
  })
})
