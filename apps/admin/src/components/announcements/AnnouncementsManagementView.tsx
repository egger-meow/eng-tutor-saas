import React, { useState } from 'react'
import type {
  AnnouncementsAdminData,
  AnnouncementItem,
  AnnouncementCategory,
  AnnouncementStatus,
} from '../../client/types.js'
import { adminApi } from '../../client/api.js'
import { MarkdownPreview } from './MarkdownPreview.js'

interface AnnouncementsManagementViewProps {
  data: AnnouncementsAdminData | null
  currentFilter: AnnouncementStatus | 'all'
  onSelectFilter: (filter: AnnouncementStatus | 'all') => void
  onRefresh: () => void
}

const CATEGORY_MAP: Record<AnnouncementCategory, { label: string; bg: string; color: string }> = {
  feature: { label: '新功能', bg: '#e0f2fe', color: '#0369a1' },
  material: { label: '教材更新', bg: '#dcfce7', color: '#15803d' },
  maintenance: { label: '維護通知', bg: '#fef3c7', color: '#b45309' },
  notice: { label: '服務公告', bg: '#f1f5f9', color: '#475569' },
}

const STATUS_MAP: Record<AnnouncementStatus, { label: string; badgeClass: string }> = {
  draft: { label: '草稿', badgeClass: 'tab-badge' },
  published: { label: '已發布', badgeClass: 'tab-badge alert' },
  archived: { label: '已封存', badgeClass: 'tab-badge' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

export const AnnouncementsManagementView: React.FC<AnnouncementsManagementViewProps> = ({
  data,
  currentFilter,
  onSelectFilter,
  onRefresh,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('feature')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [previewTab, setPreviewTab] = useState<'write' | 'preview' | 'email'>('write')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)
  const [confirmSendEmailItem, setConfirmSendEmailItem] = useState<AnnouncementItem | null>(null)

  const openCreateModal = () => {
    setEditingItem(null)
    setTitle('')
    setBody('')
    setCategory('feature')
    setCtaText('')
    setCtaUrl('')
    setSendEmail(false)
    setPreviewTab('write')
    setFeedbackMessage(null)
    setIsEditorOpen(true)
  }

  const openEditModal = (item: AnnouncementItem) => {
    setEditingItem(item)
    setTitle(item.title)
    setBody(item.body)
    setCategory(item.category)
    setCtaText(item.cta_text || '')
    setCtaUrl(item.cta_url || '')
    setSendEmail(false)
    setPreviewTab('write')
    setFeedbackMessage(null)
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    if (isSubmitting) return
    setIsEditorOpen(false)
    setEditingItem(null)
  }

  const handleSave = async (targetStatus?: AnnouncementStatus) => {
    if (isSubmitting) return
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()

    if (!trimmedTitle) {
      setFeedbackMessage({ type: 'error', text: '請填寫公告標題。' })
      return
    }
    if (!trimmedBody) {
      setFeedbackMessage({ type: 'error', text: '請填寫公告內容。' })
      return
    }

    const finalStatus = targetStatus ?? editingItem?.status ?? 'draft'
    const willSendEmail = sendEmail && finalStatus === 'published'

    if (willSendEmail) {
      const confirmSend = window.confirm('確定要發布此公告並同步寄送 Email 通知給所有使用者嗎？')
      if (!confirmSend) return
    }

    setIsSubmitting(true)
    setFeedbackMessage(null)

    try {
      if (editingItem) {
        // Update existing
        const res = await adminApi.updateAnnouncement({
          id: editingItem.id,
          title: trimmedTitle,
          body: trimmedBody,
          category,
          status: targetStatus ?? editingItem.status,
          cta_text: ctaText.trim() || null,
          cta_url: ctaUrl.trim() || null,
          sendEmail: willSendEmail,
        })
        if (!res.success) {
          setFeedbackMessage({ type: 'error', text: res.message || res.error || '更新失敗' })
          setIsSubmitting(false)
          return
        }
      } else {
        // Create new
        const res = await adminApi.createAnnouncement({
          title: trimmedTitle,
          body: trimmedBody,
          category,
          status: targetStatus ?? 'draft',
          cta_text: ctaText.trim() || null,
          cta_url: ctaUrl.trim() || null,
          sendEmail: willSendEmail,
        })
        if (!res.success) {
          setFeedbackMessage({ type: 'error', text: res.message || res.error || '建立失敗' })
          setIsSubmitting(false)
          return
        }
      }

      setIsEditorOpen(false)
      onRefresh()
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || '操作發生錯誤' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendEmail = async (id: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await adminApi.sendAnnouncementEmail(id)
      if (!res.success) {
        alert(res.message || res.error || '寄送 Email 失敗')
        return
      }
      alert(res.message || 'Email 寄送成功')
      setConfirmSendEmailItem(null)
      onRefresh()
    } catch (err: any) {
      alert(err?.message || '寄送 Email 發生異常')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async (id: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await adminApi.archiveAnnouncement(id)
      if (!res.success) {
        alert(res.message || res.error || '封存失敗')
        return
      }
      setConfirmArchiveId(null)
      onRefresh()
    } catch (err: any) {
      alert(err?.message || '封存操作失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  const announcements = data?.announcements || []
  const stats = data?.stats || { total: 0, draft: 0, published: 0, archived: 0 }

  return (
    <div className="cockpit-view-container announcements-view">
      {/* Header Bar */}
      <div className="view-header-bar">
        <div>
          <h2 className="view-page-title">公告管理</h2>
          <p className="view-page-subtitle">
            發布與管理給家長查看的產品改版、教材更新與維護公告。
          </p>
        </div>

        <button
          type="button"
          className="create-btn"
          onClick={openCreateModal}
        >
          ＋ 建立新公告
        </button>
      </div>

      {/* Filter Tabs & Stats Bar */}
      <div className="sub-filter-bar" role="tablist" aria-label="公告狀態篩選">
        <button
          type="button"
          className={`nav-tab-btn ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => onSelectFilter('all')}
        >
          全部 ({stats.total})
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${currentFilter === 'draft' ? 'active' : ''}`}
          onClick={() => onSelectFilter('draft')}
        >
          草稿 ({stats.draft})
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${currentFilter === 'published' ? 'active' : ''}`}
          onClick={() => onSelectFilter('published')}
        >
          已發布 ({stats.published})
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${currentFilter === 'archived' ? 'active' : ''}`}
          onClick={() => onSelectFilter('archived')}
        >
          已封存 ({stats.archived})
        </button>
      </div>

      {/* Announcements Table */}
      <div className="data-table-wrapper">
        {announcements.length === 0 ? (
          <div className="table-empty-notice">
            目前沒有符合條件的公告項目。
          </div>
        ) : (
          <table className="cockpit-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>狀態</th>
                <th style={{ width: '100px' }}>分類</th>
                <th>標題</th>
                <th style={{ width: '130px' }}>Email 通知</th>
                <th style={{ width: '140px' }}>發布時間</th>
                <th style={{ width: '140px' }}>更新時間</th>
                <th style={{ width: '170px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((item) => {
                const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.notice
                const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.draft

                return (
                  <tr key={item.id}>
                    <td>
                      <span className={statusInfo.badgeClass}>{statusInfo.label}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: catInfo.bg,
                          color: catInfo.color,
                        }}
                      >
                        {catInfo.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '400px',
                        }}
                      >
                        {item.body.slice(0, 80)}
                      </div>
                    </td>
                    <td>
                      {item.email_sent_at ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                            }}
                          >
                            ✓ 已寄 {item.email_sent_count ?? 0} 人
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {formatDate(item.email_sent_at)}
                          </div>
                        </div>
                      ) : item.status === 'published' ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>未寄信</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatDate(item.published_at)}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatDate(item.updated_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {item.status === 'published' && (
                          <button
                            type="button"
                            className="action-btn-sm"
                            style={{
                              background: item.email_sent_at ? undefined : '#173f35',
                              color: item.email_sent_at ? undefined : '#fffdf7',
                            }}
                            title={item.email_sent_at ? '重新發送公告 Email' : '立即發送公告 Email 給所有使用者'}
                            onClick={() => setConfirmSendEmailItem(item)}
                          >
                            {item.email_sent_at ? '補發信' : '寄信'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="action-btn-sm"
                          onClick={() => openEditModal(item)}
                        >
                          編輯
                        </button>

                        {item.status !== 'archived' && (
                          <button
                            type="button"
                            className="action-btn-sm danger"
                            onClick={() => setConfirmArchiveId(item.id)}
                          >
                            封存
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal for Archive */}
      {confirmArchiveId && (
        <div className="modal-overlay">
          <div className="cockpit-card modal-dialog-sm">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-main)' }}>確認封存此公告？</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              封存後，此公告將立即從家長端的「最新消息」移除，但仍會保留在後台歷史紀錄中。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="refresh-btn"
                disabled={isSubmitting}
                onClick={() => setConfirmArchiveId(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="action-btn-danger"
                disabled={isSubmitting}
                onClick={() => handleArchive(confirmArchiveId)}
              >
                {isSubmitting ? '封存中…' : '確認封存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Send Email */}
      {confirmSendEmailItem && (
        <div className="modal-overlay">
          <div className="cockpit-card modal-dialog-sm">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-main)' }}>確認寄送公告 Email？</h3>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
              標題：{confirmSendEmailItem.title}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              將透過本地 SMTP 伺服器將此公告寄送給全體註冊會員信箱。
              {confirmSendEmailItem.email_sent_at && (
                <span style={{ display: 'block', color: '#b45309', marginTop: '6px' }}>
                  ⚠️ 注意：此公告已於 {formatDate(confirmSendEmailItem.email_sent_at)} 發送過（{confirmSendEmailItem.email_sent_count ?? 0} 人）。確認要再次補發嗎？
                </span>
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="refresh-btn"
                disabled={isSubmitting}
                onClick={() => setConfirmSendEmailItem(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="create-btn"
                disabled={isSubmitting}
                onClick={() => handleSendEmail(confirmSendEmailItem.id)}
              >
                {isSubmitting ? '寄送中…' : '確認寄送'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="cockpit-card modal-dialog-lg">
            {/* Modal Header */}
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>
                {editingItem ? '編輯公告' : '建立新公告'}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                className="modal-close-btn"
                aria-label="關閉"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {feedbackMessage && (
                <div
                  className={`modal-feedback-alert ${feedbackMessage.type}`}
                >
                  {feedbackMessage.text}
                </div>
              )}

              <div className="form-row-2col">
                <div>
                  <label
                    htmlFor="announcement-title"
                    className="form-label"
                  >
                    公告標題 *
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：每週教材現在更懂孩子的回饋了"
                    className="form-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="announcement-category"
                    className="form-label"
                  >
                    分類 *
                  </label>
                  <select
                    id="announcement-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                    className="form-select"
                  >
                    <option value="feature">新功能</option>
                    <option value="material">教材更新</option>
                    <option value="maintenance">維護通知</option>
                    <option value="notice">服務公告</option>
                  </select>
                </div>
              </div>

              {/* Action Button & Link (CTA) */}
              <div className="form-row-2col" style={{ marginTop: '14px' }}>
                <div>
                  <label
                    htmlFor="announcement-cta-text"
                    className="form-label"
                  >
                    官網連結按鈕文字 (選填)
                  </label>
                  <input
                    id="announcement-cta-text"
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="預設：前往紙屬英文官網（例：立即前往程度診斷）"
                    className="form-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="announcement-cta-url"
                    className="form-label"
                  >
                    按鈕目標網址 / 路徑 (選填)
                  </label>
                  <input
                    id="announcement-cta-url"
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="預設：官網首頁（例：/assessment 或完整網址）"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Markdown Body Tabs */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="announcement-body"
                    className="form-label"
                    style={{ marginBottom: 0 }}
                  >
                    公告內容 (Markdown) *
                  </label>
                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('write')}
                      className={`editor-tab-btn ${previewTab === 'write' ? 'active' : ''}`}
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('preview')}
                      className={`editor-tab-btn ${previewTab === 'preview' ? 'active' : ''}`}
                    >
                      網頁預覽
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('email')}
                      className={`editor-tab-btn ${previewTab === 'email' ? 'active' : ''}`}
                    >
                      Email 預覽
                    </button>
                  </div>
                </div>

                {previewTab === 'write' ? (
                  <textarea
                    id="announcement-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    placeholder="支援段落、粗體 (**text**)、清單 (- 或 1.)、連結 ([text](url)) 等輕量 Markdown。"
                    className="form-textarea"
                  />
                ) : previewTab === 'preview' ? (
                  <div className="markdown-preview-container">
                    <MarkdownPreview content={body} />
                    {ctaUrl.trim() && (
                      <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-light, #e2e8f0)', textAlign: 'center' }}>
                        <a
                          href={ctaUrl.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="create-btn"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                          {ctaText.trim() || '前往查看'} →
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Branded Email Preview */
                  <div
                    style={{
                      background: '#f4f0e6',
                      padding: '24px 16px',
                      borderRadius: '10px',
                      border: '1px solid #ded7c7',
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '560px',
                        margin: '0 auto',
                        background: '#fffdf7',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: '1px solid #ded7c7',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Email Header */}
                      <div
                        style={{
                          background: '#173f35',
                          padding: '16px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Georgia, 'Noto Serif TC', serif",
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#fffdf7',
                          }}
                        >
                          紙屬英文
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.2)',
                            color: '#fffdf7',
                            fontWeight: 600,
                          }}
                        >
                          服務公告
                        </span>
                      </div>

                      {/* Email Content */}
                      <div style={{ padding: '24px 24px 20px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: (CATEGORY_MAP[category] || CATEGORY_MAP.notice).bg,
                              color: (CATEGORY_MAP[category] || CATEGORY_MAP.notice).color,
                            }}
                          >
                            {(CATEGORY_MAP[category] || CATEGORY_MAP.notice).label}
                          </span>
                        </div>

                        <h2
                          style={{
                            margin: '0 0 16px',
                            fontSize: '18px',
                            lineHeight: 1.45,
                            color: '#173f35',
                            fontFamily: "Georgia, 'Noto Serif TC', serif",
                          }}
                        >
                          {title || '（未輸入公告標題）'}
                        </h2>

                        <div style={{ borderTop: '1px solid #eee7db', paddingTop: '16px', marginBottom: '24px' }}>
                          <MarkdownPreview content={body || '（未輸入公告內容）'} />
                        </div>

                        {/* CTA Button in Email */}
                        <div style={{ textAlign: 'center', margin: '28px 0 20px' }}>
                          <div
                            style={{
                              display: 'inline-block',
                              background: '#c96c43',
                              color: '#ffffff',
                              fontSize: '15px',
                              fontWeight: 700,
                              padding: '13px 34px',
                              borderRadius: '999px',
                              boxShadow: '0 3px 10px rgba(201,108,67,0.25)',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {ctaText.trim() || '前往紙屬英文官網'} →
                          </div>
                          <div
                            style={{
                              marginTop: '10px',
                              fontSize: '11px',
                              color: '#85948c',
                              wordBreak: 'break-all',
                            }}
                          >
                            官網連結：
                            <span style={{ color: '#c96c43', textDecoration: 'underline' }}>
                              {ctaUrl.trim()
                                ? ctaUrl.trim().startsWith('/')
                                  ? `https://paperbond.jjmowlab.com${ctaUrl.trim()}`
                                  : ctaUrl.trim()
                                : 'https://paperbond.jjmowlab.com'}
                            </span>
                          </div>
                        </div>

                        {/* Footer Note */}
                        <div
                          style={{
                            marginTop: '20px',
                            paddingTop: '14px',
                            borderTop: '1px solid #eee7db',
                            fontSize: '12px',
                            color: '#617068',
                            lineHeight: 1.6,
                          }}
                        >
                          親愛的家長您好，此信件為紙屬英文最新發布之服務公告通知。<br />
                          您也可以隨時登入紙屬英文後台查看所有歷史公告與教材進度。
                        </div>
                      </div>

                      {/* Email Footer */}
                      <div
                        style={{
                          background: '#f9f6ef',
                          padding: '12px 24px',
                          fontSize: '11px',
                          color: '#85948c',
                          textAlign: 'center',
                          borderTop: '1px solid #ded7c7',
                        }}
                      >
                        紙屬英文團隊 · 專為台灣國中生打造的個人化英文自學教材
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Broadcast Option */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-elevated, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#173f35', cursor: 'pointer' }}
                  />
                  <span>發布時同步發送 Email 通知給所有使用者</span>
                </label>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '24px', lineHeight: 1.4 }}>
                  勾選後，發布時將透過 SMTP 伺服器寄送專屬排版公告信至所有註冊會員信箱。
                  {editingItem?.email_sent_at && (
                    <span style={{ display: 'block', color: '#15803d', marginTop: '4px', fontWeight: 500 }}>
                      ℹ️ 此公告先前已於 {formatDate(editingItem.email_sent_at)} 發送過（{editingItem.email_sent_count ?? 0} 位會員）。再次勾選並發布將重新發送。
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="modal-footer">
              <div>
                {editingItem?.published_at && (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    原始發布：{formatDate(editingItem.published_at)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="refresh-btn"
                  disabled={isSubmitting}
                  onClick={closeEditor}
                >
                  取消
                </button>

                {(!editingItem || editingItem.status === 'draft') && (
                  <button
                    type="button"
                    className="refresh-btn"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-main)' }}
                    disabled={isSubmitting}
                    onClick={() => handleSave('draft')}
                  >
                    {isSubmitting ? '儲存中…' : '存草稿'}
                  </button>
                )}

                <button
                  type="button"
                  className="create-btn"
                  disabled={isSubmitting}
                  onClick={() => handleSave('published')}
                >
                  {isSubmitting
                    ? (sendEmail ? '發布與寄信中…' : '處理中…')
                    : editingItem?.status === 'published'
                    ? (sendEmail ? '更新並寄信' : '更新發布')
                    : (sendEmail ? '發布並寄信' : '立即發布')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
