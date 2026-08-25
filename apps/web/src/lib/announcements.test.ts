import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getCategoryLabel,
  formatAnnouncementDate,
  getAnnouncementExcerpt,
  fetchPublishedAnnouncements,
  fetchPublishedAnnouncementById,
} from './announcements'
import * as supabaseModule from './supabase'

describe('announcements helpers', () => {
  it('maps category codes to Traditional Chinese labels', () => {
    expect(getCategoryLabel('feature')).toBe('新功能')
    expect(getCategoryLabel('material')).toBe('教材更新')
    expect(getCategoryLabel('maintenance')).toBe('維護通知')
    expect(getCategoryLabel('notice')).toBe('服務公告')
    expect(getCategoryLabel('unknown_custom')).toBe('unknown_custom')
  })

  it('formats dates in YYYY.MM.DD format', () => {
    expect(formatAnnouncementDate('2026-08-25T10:30:00Z')).toMatch(/^2026\.08\.2[56]$/)
    expect(formatAnnouncementDate(null)).toBe('')
    expect(formatAnnouncementDate('invalid-date')).toBe('')
  })

  it('extracts excerpt from markdown without syntax artifacts', () => {
    const markdown = `# 大標題\n\n這是一段 **粗體文字** 與 [連結說明](https://example.com)。\n\n- 清單項目一\n- 清單項目二`
    const excerpt = getAnnouncementExcerpt(markdown, 50)
    expect(excerpt).not.toContain('#')
    expect(excerpt).not.toContain('**')
    expect(excerpt).not.toContain('[')
    expect(excerpt).not.toContain('(')
    expect(excerpt).toContain('大標題 這是一段 粗體文字 與 連結說明。 清單項目一 清單項目二')
  })

  it('truncates long content with an ellipsis', () => {
    const longText = '這是一段很長很長的公告內容，用來說明我們本週進行了哪些改善與優化。'.repeat(10)
    const excerpt = getAnnouncementExcerpt(longText, 40)
    expect(excerpt.length).toBe(41) // 40 chars + '…'
    expect(excerpt.endsWith('…')).toBe(true)
  })
})

describe('announcements data fetching', () => {
  const mockSelect = vi.fn()
  const mockOrder = vi.fn()
  const mockRange = vi.fn()
  const mockEq = vi.fn()
  const mockMaybeSingle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockRange.mockResolvedValue({
      data: [
        {
          id: 'ann-1',
          title: '最新功能上線',
          body: '公告內容',
          category: 'feature',
          status: 'published',
          published_at: '2026-08-25T00:00:00Z',
          created_at: '2026-08-25T00:00:00Z',
          updated_at: '2026-08-25T00:00:00Z',
        },
      ],
      count: 25,
      error: null,
    })

    mockOrder.mockReturnValue({
      order: mockOrder,
      range: mockRange,
    })

    mockSelect.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    })

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'ann-1',
        title: '最新功能上線',
        body: '公告內容',
        category: 'feature',
        status: 'published',
        published_at: '2026-08-25T00:00:00Z',
        created_at: '2026-08-25T00:00:00Z',
        updated_at: '2026-08-25T00:00:00Z',
      },
      error: null,
    })

    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    })

    vi.spyOn(supabaseModule, 'getSupabaseClient').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any)
  })

  it('fetches published announcements with pagination range', async () => {
    const result = await fetchPublishedAnnouncements(2, 10)
    expect(result.currentPage).toBe(2)
    expect(result.pageSize).toBe(10)
    expect(result.totalCount).toBe(25)
    expect(result.totalPages).toBe(3)
    expect(result.announcements).toHaveLength(1)
    expect(mockRange).toHaveBeenCalledWith(10, 19)
  })

  it('fetches single published announcement by id', async () => {
    const result = await fetchPublishedAnnouncementById('ann-1')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('ann-1')
    expect(mockEq).toHaveBeenCalledWith('id', 'ann-1')
  })
})
