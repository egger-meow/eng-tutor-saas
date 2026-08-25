import { getSupabaseClient } from './supabase'

export const announcementCategories = ['feature', 'material', 'maintenance', 'notice'] as const
export type AnnouncementCategory = (typeof announcementCategories)[number]

export const announcementStatuses = ['draft', 'published', 'archived'] as const
export type AnnouncementStatus = (typeof announcementStatuses)[number]

export type Announcement = {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  status: AnnouncementStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export const categoryLabels: Record<AnnouncementCategory, string> = {
  feature: '新功能',
  material: '教材更新',
  maintenance: '維護通知',
  notice: '服務公告',
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category as AnnouncementCategory] || category
}

export function formatAnnouncementDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function getAnnouncementExcerpt(body: string, maxLength = 120): string {
  if (!body) return ''
  // Clean markdown tokens for excerpt preview
  const cleaned = body
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()

  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength) + '…'
}

export type PaginatedAnnouncements = {
  announcements: Announcement[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export const ANNOUNCEMENT_PAGE_SIZE = 10

export async function fetchPublishedAnnouncements(
  page = 1,
  pageSize = ANNOUNCEMENT_PAGE_SIZE,
): Promise<PaginatedAnnouncements> {
  const safePage = Math.max(1, Math.floor(page) || 1)
  const client = getSupabaseClient()
  const from = (safePage - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await client
    .from('announcements')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)

  if (error) {
    throw error
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return {
    announcements: (data as Announcement[]) || [],
    totalCount,
    totalPages,
    currentPage: safePage,
    pageSize,
  }
}

export async function fetchPublishedAnnouncementById(id: string): Promise<Announcement | null> {
  if (!id || typeof id !== 'string') return null
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('announcements')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as Announcement) || null
}
