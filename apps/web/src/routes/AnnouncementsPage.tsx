import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'
import { handleInternalLink, navigate } from '../app/use-route'
import {
  fetchPublishedAnnouncements,
  getCategoryLabel,
  formatAnnouncementDate,
  getAnnouncementExcerpt,
  type Announcement,
  type PaginatedAnnouncements,
} from '../lib/announcements'

export function AnnouncementsPage({ session }: { session: Session }) {
  const [data, setData] = useState<PaginatedAnnouncements | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getCurrentPage = (): number => {
    if (typeof window === 'undefined') return 1
    const params = new URLSearchParams(window.location.search)
    const p = parseInt(params.get('page') || '1', 10)
    return Number.isFinite(p) && p > 0 ? p : 1
  }

  const [currentPage, setCurrentPage] = useState<number>(getCurrentPage)

  const loadAnnouncements = useCallback(async (page: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPublishedAnnouncements(page)
      setData(res)
    } catch (err: any) {
      setError(err?.message || '載入最新消息失敗，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleUrlChange = () => {
      const page = getCurrentPage()
      setCurrentPage(page)
      void loadAnnouncements(page)
    }

    const initialPage = getCurrentPage()
    setCurrentPage(initialPage)
    void loadAnnouncements(initialPage)

    window.addEventListener('popstate', handleUrlChange)
    window.addEventListener('paper-english:route-change', handleUrlChange)
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      window.removeEventListener('paper-english:route-change', handleUrlChange)
    }
  }, [loadAnnouncements])

  const goToPage = (page: number) => {
    if (page === currentPage) return
    navigate(`/announcements?page=${page}`)
  }

  return (
    <AppShell
      header={
        <ParentNavigation
          email={session.user.email}
          onSignOut={() => void getSupabaseClient().auth.signOut()}
        />
      }
    >
      <PageTransition>
        <section className="announcements-page">
          <header className="announcements-header">
            <p className="overline">最新消息</p>
            <h1>紙屬英文最近在忙什麼 🌱</h1>
            <p className="lede">
              這裡會不定期分享紙屬英文的新功能、教材更新與維護通知。
            </p>
          </header>

          {loading && (
            <div className="announcements-loading" role="status">
              正在載入最新消息…
            </div>
          )}

          {error && (
            <div className="notice notice-error announcements-error" role="alert">
              <p>{error}</p>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void loadAnnouncements(currentPage)}
              >
                重新載入
              </button>
            </div>
          )}

          {!loading && !error && data && data.announcements.length === 0 && (
            <div className="announcements-empty surface-card">
              <p className="empty-icon">🌱</p>
              <h2>目前尚無最新消息</h2>
              <p className="muted">未來的產品改善、教材更新與服務通知都會整理在這裡。</p>
            </div>
          )}

          {!loading && !error && data && data.announcements.length > 0 && (
            <>
              <div className="announcements-list" role="feed" aria-label="最新消息列表">
                {data.announcements.map((item: Announcement) => (
                  <article key={item.id} className="announcement-card surface-card">
                    <div className="announcement-card-meta">
                      <span className={`category-badge category-badge-${item.category}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                      <time
                        className="announcement-date"
                        dateTime={item.published_at || undefined}
                      >
                        {formatAnnouncementDate(item.published_at)}
                      </time>
                    </div>

                    <h2 className="announcement-card-title">
                      <a
                        href={`/announcements/${item.id}`}
                        onClick={handleInternalLink}
                      >
                        {item.title}
                      </a>
                    </h2>

                    <p className="announcement-card-excerpt">
                      {getAnnouncementExcerpt(item.body)}
                    </p>

                    <div className="announcement-card-action">
                      <a
                        href={`/announcements/${item.id}`}
                        className="announcement-read-more"
                        onClick={handleInternalLink}
                      >
                        查看完整內容 →
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              {data.totalPages > 1 && (
                <nav
                  className="announcements-pagination"
                  aria-label="最新消息分頁導覽"
                >
                  <button
                    type="button"
                    className="button button-secondary pagination-btn"
                    disabled={data.currentPage <= 1}
                    onClick={() => goToPage(data.currentPage - 1)}
                    aria-label="前往上一頁"
                  >
                    ← 上一頁
                  </button>

                  <span className="pagination-info" aria-live="polite">
                    第 {data.currentPage} 頁，共 {data.totalPages} 頁
                  </span>

                  <button
                    type="button"
                    className="button button-secondary pagination-btn"
                    disabled={data.currentPage >= data.totalPages}
                    onClick={() => goToPage(data.currentPage + 1)}
                    aria-label="前往下一頁"
                  >
                    下一頁 →
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </PageTransition>
    </AppShell>
  )
}
