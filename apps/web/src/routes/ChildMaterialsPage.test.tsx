import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Session } from '@supabase/supabase-js'
import { ChildMaterialsPage } from './ChildMaterialsPage'
import { DashboardPage } from './DashboardPage'

const { snapshot } = vi.hoisted(() => ({ snapshot: { current: {} as Record<string, unknown> } }))
vi.mock('../hooks/use-parent-data', () => ({ useParentData: () => snapshot.current }))
vi.mock('../lib/enrollment', () => ({ useEnrollmentState: () => ({ state: null }) }))
vi.mock('../components/dashboard/ChildCard', () => ({ ChildCard: () => <div>已載入的孩子教材</div> }))
vi.mock('../components/materials/MaterialHistory', () => ({ MaterialHistory: ({ materials, childName, hasMore }: { materials: Array<{ id: string }>; childName: string; hasMore: boolean }) => <div>{childName}: {materials.map(item => item.id).join(',')}{hasMore && <button>載入更早教材</button>}</div> }))

const session = { user: { id: 'parent', email: 'synthetic@example.invalid' } } as Session
describe('child material history route', () => {
  beforeEach(() => {
    snapshot.current = {
      loading: false, error: '', children: [{ id: 'child-a', display_name: '合成孩子 A' }],
      getMaterialsForChild: (childId: string) => childId === 'child-a' ? [
        { id: 'released', release_at: '2020-01-01', material_week: '2020-01-01' },
        { id: 'future-private', release_at: '2099-01-01', material_week: '2099-01-01' },
      ] : [],
      materialHasMore: { 'child-a': true }, loadingMoreMaterials: {}, refresh: vi.fn(), loadMoreMaterials: vi.fn(),
    }
  })
  it('shows the requested child released history and pagination instead of profile editing', () => {
    const html = renderToStaticMarkup(<ChildMaterialsPage session={session} childId="child-a" />)
    expect(html).toContain('合成孩子 A 的所有教材')
    expect(html).toContain('released')
    expect(html).toContain('載入更早教材')
    expect(html).not.toContain('future-private')
    expect(html).not.toContain('移除孩子')
  })
  it('does not silently select another child when the requested child is unavailable', () => {
    const html = renderToStaticMarkup(<ChildMaterialsPage session={session} childId="not-owned" />)
    expect(html).toContain('找不到可查看的孩子資料')
    expect(html).not.toContain('released')
    expect(html).not.toContain('合成孩子 A')
  })
  it('keeps loaded history usable and offers retry on a failed refresh', () => {
    snapshot.current.error = '更早的教材暫時無法載入'
    const html = renderToStaticMarkup(<ChildMaterialsPage session={session} childId="child-a" />)
    expect(html).toContain('重試載入')
    expect(html).toContain('released')
  })
  it('announces initial loading without presenting stale history', () => {
    snapshot.current.loading = true
    const html = renderToStaticMarkup(<ChildMaterialsPage session={session} childId="child-a" />)
    expect(html).toContain('正在載入教材')
    expect(html).not.toContain('released')
  })
  it('keeps the dashboard usable when pagination or a background refresh fails', () => {
    snapshot.current.error = '更早的教材暫時無法載入'
    snapshot.current.releasedMaterialCounts = {}
    const html = renderToStaticMarkup(<DashboardPage session={session} />)
    expect(html).toContain('已載入的孩子教材')
    expect(html).toContain('重試更新')
    expect(html).not.toContain('<h1>目前無法載入</h1>')
  })
  it('shows full-page retry when the dashboard has no usable snapshot', () => {
    snapshot.current.error = '讀取失敗'
    snapshot.current.children = []
    const html = renderToStaticMarkup(<DashboardPage session={session} />)
    expect(html).toContain('<h1>目前無法載入</h1>')
    expect(html).toContain('再試一次')
    expect(html).not.toContain('已載入的孩子教材')
  })
})
