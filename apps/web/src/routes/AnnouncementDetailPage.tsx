import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { MarkdownContent } from '../components/announcements/MarkdownContent'
import { getSupabaseClient } from '../lib/supabase'
import { handleInternalLink } from '../app/use-route'
import {
  fetchPublishedAnnouncementById,
  getCategoryLabel,
  formatAnnouncementDate,
  type Announcement,
} from '../lib/announcements'

export function AnnouncementDetailPage({
  session,
  announcementId,
}: {
  session: Session
  announcementId?: string
}) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnnouncement = useCallback(async () => {
    if (!announcementId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const item = await fetchPublishedAnnouncementById(announcementId)
      setAnnouncement(item)
    } catch (err: any) {
      setError(err?.message || '載入公告內容失敗，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [announcementId])

  useEffect(() => {
    void loadAnnouncement()
  }, [loadAnnouncement])

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
        <section className="announcement-detail-page">
          <nav className="announcement-back-nav" aria-label="返回導覽">
            <a
              href="/announcements"
              className="announcement-back-link"
              onClick={handleInternalLink}
            >
              ← 返回最新消息
            </a>
          </nav>

          {loading && (
            <div className="announcements-loading" role="status">
              正在載入公告內容…
            </div>
          )}

          {error && (
            <div className="notice notice-error announcements-error" role="alert">
              <p>{error}</p>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void loadAnnouncement()}
              >
                重新載入
              </button>
            </div>
          )}

          {!loading && !error && !announcement && (
            <div className="announcements-empty surface-card">
              <p className="empty-icon">🍃</p>
              <h2>找不到此公告</h2>
              <p className="muted">此公告可能尚未公開、已被移除，或是網址有誤。</p>
              <div>
                <a
                  href="/announcements"
                  className="button button-secondary"
                  onClick={handleInternalLink}
                >
                  返回最新消息列表
                </a>
              </div>
            </div>
          )}

          {!loading && !error && announcement && (
            <article className="announcement-detail-card surface-card">
              <header className="announcement-detail-header">
                <div className="announcement-card-meta">
                  <span className={`category-badge category-badge-${announcement.category}`}>
                    {getCategoryLabel(announcement.category)}
                  </span>
                  <time
                    className="announcement-date"
                    dateTime={announcement.published_at || undefined}
                  >
                    {formatAnnouncementDate(announcement.published_at)}
                  </time>
                </div>
                <h1 className="announcement-detail-title">{announcement.title}</h1>
              </header>

              <div className="announcement-detail-divider" />

              <div className="announcement-detail-body">
                <MarkdownContent content={announcement.body} />
              </div>

              {announcement.cta_url && (
                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <a
                    href={announcement.cta_url}
                    className="button button-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 600 }}
                    {...(announcement.cta_url.startsWith('/')
                      ? { onClick: handleInternalLink }
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    <span>{announcement.cta_text || '前往查看'}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              )}
            </article>
          )}
        </section>
      </PageTransition>
    </AppShell>
  )
}
