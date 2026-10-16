import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Session } from '@supabase/supabase-js'

let mockChildren: any[] = []
let mockEnrollment = {
  status: 'open' as const,
  capacity: 100,
  activeCount: 20,
  remaining: 80,
  foundingLimit: 30,
  foundingCount: 17,
  freePilotActive: true,
}

vi.mock('../hooks/use-parent-data', () => ({
  useParentData: () => ({
    children: mockChildren,
    materials: [],
    materialOffsets: {},
    materialHasMore: {},
    releasedMaterialCounts: {},
    loadingMoreMaterials: {},
    loading: false,
    error: '',
    refresh: vi.fn(),
    getMaterialsForChild: vi.fn(() => []),
    loadMoreMaterials: vi.fn(),
  }),
}))

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: { signOut: vi.fn() } }),
}))

vi.mock('../lib/enrollment', () => ({
  useEnrollmentState: () => ({
    state: mockEnrollment,
    error: false,
  }),
}))

import { DashboardPage } from './DashboardPage'
import { saveDraft } from '../lib/profile-form'

const session: Session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'parent-orphan-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-09-01T00:00:00Z',
    email: 'orphan-parent@example.com',
  },
}

const storageStore = new Map<string, string>()

const mockSessionStorage = {
  getItem: (key: string) => storageStore.get(key) ?? null,
  setItem: (key: string, val: string) => storageStore.set(key, String(val)),
  removeItem: (key: string) => { storageStore.delete(key) },
  clear: () => storageStore.clear(),
}

describe('DashboardPage orphan account recovery zero-state', () => {
  beforeEach(() => {
    mockChildren = []
    storageStore.clear()
    ;(globalThis as any).window = {
      sessionStorage: mockSessionStorage,
      location: { origin: 'http://localhost', pathname: '/dashboard' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matchMedia: vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    }
  })

  it('renders encouraging verification badge, trust highlights, and CTA when parent has 0 children', () => {
    const html = renderToStaticMarkup(<DashboardPage session={session} />)

    expect(html).toContain('✅ 家長帳號已認證成功')
    expect(html).toContain('只差最後一步：告訴我們孩子的基本資料')
    expect(html).toContain('100% 量身打造')
    expect(html).toContain('雙面紙本零分心')
    expect(html).toContain('現場 60 秒生成')
    expect(html).toContain('立即為孩子準備專屬教材（目前 NT$0）')
  })

  it('displays draft recovery banner when a landing draft exists in sessionStorage', () => {
    saveDraft('paper-english:landing-profile-draft', {
      displayName: '小安',
      grade: 7,
      gradeStage: 'grade_7',
      baselineLevel: 'approaching_b1',
      interests: ['🏀 籃球'],
    } as any)

    const html = renderToStaticMarkup(<DashboardPage session={session} />)

    expect(html).toContain('✨ 系統已為你暫存之前填寫的孩子資料')
    expect(html).toContain('小安')
    expect(html).toContain('點擊下方按鈕即可直接載入接續完成！')
  })

  it('renders child list when children exist', () => {
    mockChildren = [
      {
        id: 'child-1',
        parent_id: 'parent-orphan-1',
        display_name: 'Leo',
        grade: 7,
        grade_stage: 'grade_7',
        textbook_version: '康軒',
        archived_at: null,
      },
    ]

    const html = renderToStaticMarkup(<DashboardPage session={session} />)

    expect(html).not.toContain('✅ 家長帳號已認證成功')
    expect(html).toContain('每個孩子，都有自己的下一步。')
  })
})
