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
  const [previewTab, setPreviewTab] = useState<'write' | 'preview'>('write')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)

  const openCreateModal = () => {
    setEditingItem(null)
    setTitle('')
    setBody('')
    setCategory('feature')
    setPreviewTab('write')
    setFeedbackMessage(null)
    setIsEditorOpen(true)
  }

  const openEditModal = (item: AnnouncementItem) => {
    setEditingItem(item)
    setTitle(item.title)
    setBody(item.body)
    setCategory(item.category)
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
    <div className="cockpit-view-container">
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
            公告管理
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            發布與管理給家長查看的產品改版、教材更新與維護公告。
          </p>
        </div>

        <button
          type="button"
          className="button button-action"
          style={{
            padding: '8px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
          onClick={openCreateModal}
        >
          ＋ 建立新公告
        </button>
      </div>

      {/* Filter Tabs & Stats Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
      <div className="cockpit-card" style={{ padding: '0', overflow: 'hidden' }}>
        {announcements.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            目前沒有符合條件的公告項目。
          </div>
        ) : (
          <table className="cockpit-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', width: '90px' }}>狀態</th>
                <th style={{ padding: '12px 16px', width: '100px' }}>分類</th>
                <th style={{ padding: '12px 16px' }}>標題</th>
                <th style={{ padding: '12px 16px', width: '160px' }}>發布時間</th>
                <th style={{ padding: '12px 16px', width: '160px' }}>更新時間</th>
                <th style={{ padding: '12px 16px', width: '140px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((item) => {
                const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.notice
                const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.draft

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={statusInfo.badgeClass}>{statusInfo.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: catInfo.bg,
                          color: catInfo.color,
                        }}
                      >
                        {catInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
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
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formatDate(item.published_at)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formatDate(item.updated_at)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => openEditModal(item)}
                        >
                          編輯
                        </button>

                        {item.status !== 'archived' && (
                          <button
                            type="button"
                            className="button button-quiet"
                            style={{ padding: '4px 8px', fontSize: '12px', color: '#b91c1c' }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="cockpit-card"
            style={{
              width: '420px',
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1e293b' }}>確認封存此公告？</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              封存後，此公告將立即從家長端的「最新消息」移除，但仍會保留在後台歷史紀錄中。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="button button-quiet"
                disabled={isSubmitting}
                onClick={() => setConfirmArchiveId(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="button"
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}
                disabled={isSubmitting}
                onClick={() => handleArchive(confirmArchiveId)}
              >
                {isSubmitting ? '封存中…' : '確認封存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="cockpit-card"
            style={{
              width: 'min(780px, 100%)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                {editingItem ? '編輯公告' : '建立新公告'}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {feedbackMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    backgroundColor: feedbackMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
                    color: feedbackMessage.type === 'error' ? '#991b1b' : '#166534',
                  }}
                >
                  {feedbackMessage.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label
                    htmlFor="announcement-title"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    公告標題 *
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：每週教材現在更懂孩子的回饋了"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="announcement-category"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    分類 *
                  </label>
                  <select
                    id="announcement-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="feature">新功能</option>
                    <option value="material">教材更新</option>
                    <option value="maintenance">維護通知</option>
                    <option value="notice">服務公告</option>
                  </select>
                </div>
              </div>

              {/* Markdown Body Tabs */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="announcement-body"
                    style={{ fontSize: '13px', fontWeight: 600 }}
                  >
                    公告內容 (Markdown) *
                  </label>
                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('write')}
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: previewTab === 'write' ? '#0f172a' : '#f8fafc',
                        color: previewTab === 'write' ? 'white' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('preview')}
                      style={{
                        padding: '3px 10px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: previewTab === 'preview' ? '#0f172a' : '#f8fafc',
                        color: previewTab === 'preview' ? 'white' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      即時預覽
                    </button>
                  </div>
                </div>

                {previewTab === 'write' ? (
                  <textarea
                    id="announcement-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={12}
                    placeholder="支援段落、粗體 (**text**)、清單 (- 或 1.)、連結 ([text](url)) 等輕量 Markdown。"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      lineHeight: 1.5,
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: '260px',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '14px',
                    }}
                  >
                    <MarkdownPreview content={body} />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                {editingItem?.published_at && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    原始發布時間：{formatDate(editingItem.published_at)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={isSubmitting}
                  onClick={closeEditor}
                >
                  取消
                </button>

                {(!editingItem || editingItem.status === 'draft') && (
                  <button
                    type="button"
                    className="button"
                    style={{ backgroundColor: '#475569', color: 'white', border: 'none' }}
                    disabled={isSubmitting}
                    onClick={() => handleSave('draft')}
                  >
                    {isSubmitting ? '儲存中…' : '儲存為草稿'}
                  </button>
                )}

                <button
                  type="button"
                  className="button"
                  style={{ backgroundColor: '#059669', color: 'white', border: 'none' }}
                  disabled={isSubmitting}
                  onClick={() => handleSave('published')}
                >
                  {isSubmitting
                    ? '處理中…'
                    : editingItem?.status === 'published'
                    ? '更新發布內容'
                    : '立即發布'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
