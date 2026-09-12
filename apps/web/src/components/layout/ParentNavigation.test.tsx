import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ParentNavigation } from './ParentNavigation'
import * as useRouteModule from '../../app/use-route'

describe('ParentNavigation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all parent navigation items in exact required order', () => {
    vi.spyOn(useRouteModule, 'useRoute').mockReturnValue({
      name: 'dashboard',
      params: {},
      path: '/dashboard',
    })

    const html = renderToStaticMarkup(
      <ParentNavigation
        email="parent@example.com"
        childHref="/children/child-1"
        onSignOut={() => {}}
      />
    )

    expect(html).toContain('本週教材')
    expect(html).toContain('孩子資料')
    expect(html).toContain('程度診斷')
    expect(html).toContain('最新消息')
    expect(html).toContain('使用說明與回饋')
    expect(html).toContain('訂閱')

    // Verify ordering: 本週教材 -> 孩子資料 -> 程度診斷 -> 最新消息 -> 使用說明與回饋 -> 訂閱
    const idxDashboard = html.indexOf('本週教材')
    const idxChild = html.indexOf('孩子資料')
    const idxAssessment = html.indexOf('程度診斷')
    const idxNews = html.indexOf('最新消息')
    const idxGuide = html.indexOf('使用說明與回饋')
    const idxBilling = html.indexOf('訂閱')

    expect(idxDashboard).toBeLessThan(idxChild)
    expect(idxChild).toBeLessThan(idxAssessment)
    expect(idxAssessment).toBeLessThan(idxNews)
    expect(idxNews).toBeLessThan(idxGuide)
    expect(idxGuide).toBeLessThan(idxBilling)

    expect(html).toContain('href="/assessment"')
  })

  it('marks 程度診斷 as active when on /assessment', () => {
    vi.spyOn(useRouteModule, 'useRoute').mockReturnValue({
      name: 'assessment',
      params: {},
      path: '/assessment',
    })

    const html = renderToStaticMarkup(
      <ParentNavigation
        email="parent@example.com"
        childHref="/children/child-1"
        onSignOut={() => {}}
      />
    )

    expect(html).toMatch(/href="\/assessment"[^>]*class="[^"]*active[^"]*"/)
  })

  it('marks 程度診斷 as active when on child assessment route', () => {
    vi.spyOn(useRouteModule, 'useRoute').mockReturnValue({
      name: 'child-assessment',
      params: { id: 'child-1' },
      path: '/children/child-1/assessment',
    })

    const html = renderToStaticMarkup(
      <ParentNavigation
        email="parent@example.com"
        childHref="/children/child-1"
        onSignOut={() => {}}
      />
    )

    expect(html).toMatch(/href="\/assessment"[^>]*class="[^"]*active[^"]*"/)
  })
})

