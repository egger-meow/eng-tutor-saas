import React, { useState } from 'react'
import type { WaitlistData, WaitlistStatus, NotificationStatus } from '../../client/types.js'
import { adminApi } from '../../client/api.js'

interface WaitlistManagementViewProps {
  data: WaitlistData | null
  onRefresh: () => void
}

export const WaitlistManagementView: React.FC<WaitlistManagementViewProps> = ({
  data,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])
  
  // Raise & Release State
  const [targetCapacity, setTargetCapacity] = useState<number>(() => {
    if (!data) return 200
    const minCap = data.activeCount + data.releasedCount + data.waitingCount
    return Math.max(data.capacity + 50, minCap + 50, 200)
  })
  const [isSubmittingRaise, setIsSubmittingRaise] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copyToast, setCopyToast] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  if (!data) {
    return (
      <div className="section-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>👥</div>
        <div>載入等候名單數據中...</div>
      </div>
    )
  }

  const minCapacityRequired = data.activeCount + data.releasedCount + data.waitingCount

  // Handle retry failed notifications
  const handleRetryNotifications = async () => {
    setIsRetrying(true)
    setActionMessage(null)
    try {
      const result = await adminApi.retryFailedNotifications()
      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `重試完成：成功寄出 ${result.emailsDispatched ?? 0} 封通知信${result.notificationsFailed ? `，${result.notificationsFailed} 封仍然失敗` : ''}。`,
        })
        onRefresh()
      } else {
        setActionMessage({
          type: 'error',
          text: result.error || '重試通知信發送失敗',
        })
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || '重試通知信時發生錯誤',
      })
    } finally {
      setIsRetrying(false)
    }
  }

  // Filter entries
  const filteredEntries = data.entries.filter((entry) => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchEmail = entry.email.toLowerCase().includes(q)
      const matchName = entry.childName.toLowerCase().includes(q)
      if (!matchEmail && !matchName) return false
    }
    return true
  })

  // Handle raise capacity and release all
  const handleRaiseAndRelease = async () => {
    if (targetCapacity < minCapacityRequired) {
      setActionMessage({
        type: 'error',
        text: `新容量 (${targetCapacity}) 不得低於目前已佔用與等候總人數 (${minCapacityRequired} 人)`,
      })
      return
    }

    setIsSubmittingRaise(true)
    setActionMessage(null)
    try {
      const result = await adminApi.raiseCapacityAndRelease(targetCapacity, true)
      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `成功將容量上限調升至 ${result.newCapacity} 人，並已釋出 ${result.releasedInThisRun} 位等候名額（自動寄發通知信 ${result.emailsDispatched} 封）。`,
        })
        onRefresh()
      } else {
        setActionMessage({
          type: 'error',
          text: result.error || '調升容量並釋出失敗',
        })
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || '執行調升與釋出操作時發生錯誤',
      })
    } finally {
      setIsSubmittingRaise(false)
    }
  }

  // Handle individual release
  const handleReleaseChild = async (childId: string) => {
    if (data.activeCount + data.releasedCount >= data.capacity) {
      setActionMessage({
        type: 'error',
        text: `目前已達系統上限 (${data.capacity} 人)，無法釋出個別名額。請先調升系統容量。`,
      })
      return
    }

    try {
      const result = await adminApi.releaseWaitlistChildren([childId])
      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `已成功釋出該名額並自動寄發通知信件。`,
        })
        onRefresh()
      } else {
        setActionMessage({
          type: 'error',
          text: result.error || '釋出失敗',
        })
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || '釋出名額時發生錯誤',
      })
    }
  }

  // Handle batch release
  const handleBatchRelease = async () => {
    if (selectedChildIds.length === 0) return
    const availableSlots = data.capacity - (data.activeCount + data.releasedCount)
    if (selectedChildIds.length > availableSlots) {
      setActionMessage({
        type: 'error',
        text: `選取釋出人數 (${selectedChildIds.length}) 超過剩餘可用名額 (${Math.max(0, availableSlots)})。請先調升系統容量。`,
      })
      return
    }

    try {
      const result = await adminApi.releaseWaitlistChildren(selectedChildIds)
      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `已成功釋出 ${result.releasedCount} 位選取名額並寄發通知信。`,
        })
        setSelectedChildIds([])
        onRefresh()
      } else {
        setActionMessage({
          type: 'error',
          text: result.error || '批次釋出失敗',
        })
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || '批次釋出時發生錯誤',
      })
    }
  }

  // Handle copy emails fallback
  const handleCopyEmails = () => {
    const emails = Array.from(new Set(filteredEntries.map((e) => e.email))).join(', ')
    if (!emails) return
    navigator.clipboard.writeText(emails)
    setCopyToast(true)
    setTimeout(() => setCopyToast(false), 3000)
  }

  const renderNotificationBadge = (status: NotificationStatus) => {
    switch (status) {
      case 'sent':
        return <span className="status-badge" style={{ background: '#064e3b', color: '#a7f3d0', border: '1px solid #059669', fontSize: '11px' }}>✅ 已寄出</span>
      case 'pending':
        return <span className="status-badge" style={{ background: '#78350f', color: '#fde68a', border: '1px solid #b45309', fontSize: '11px' }}>⏳ 待寄出</span>
      case 'failed':
        return <span className="status-badge" style={{ background: '#881337', color: '#fda4af', border: '1px solid #e11d48', fontSize: '11px' }}>❌ 寄送失敗</span>
      case 'manual':
        return <span className="status-badge" style={{ background: '#374151', color: '#fbbf24', border: '1px solid #6b7280', fontSize: '11px' }}>📋 需手動</span>
      case 'none':
      default:
        return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
    }
  }

  const renderStatusBadge = (status: WaitlistStatus) => {
    switch (status) {
      case 'waiting':
        return <span className="status-badge" style={{ background: '#78350f', color: '#fde68a', border: '1px solid #b45309' }}>🟡 等候釋出</span>
      case 'released':
        return <span className="status-badge" style={{ background: '#064e3b', color: '#a7f3d0', border: '1px solid #059669' }}>🟢 已開放訂閱</span>
      case 'converted':
        return <span className="status-badge" style={{ background: '#4c1d95', color: '#ddd6fe', border: '1px solid #7c3aed' }}>🟣 已轉換訂閱</span>
      case 'canceled':
        return <span className="status-badge" style={{ background: '#374151', color: '#9ca3af', border: '1px solid #4b5563' }}>⚪ 已取消</span>
      default:
        return <span className="status-badge">{status}</span>
    }
  }

  return (
    <div className="tab-view-container">
      {/* 1. Top KPI Grid */}
      <div className="overview-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">系統容量上限 (Capacity)</div>
          <div className="stat-value highlight">{data.capacity} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>人</span></div>
          <div className="stat-desc">目前整體架構開放承載名額</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">服務中孩子 (Active)</div>
          <div className="stat-value">{data.activeCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>人</span></div>
          <div className="stat-desc">正式/試用/逾期中學生</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">等候名單總人數</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{data.waitingCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>人</span></div>
          <div className="stat-desc">已建立檔案等候開放中</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">已釋出待付款 (Released)</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{data.releasedCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>人</span></div>
          <div className="stat-desc">已開通信箱通知與訂閱權限</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">成功轉換訂閱 (Converted)</div>
          <div className="stat-value" style={{ color: '#a78bfa' }}>{data.convertedCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>人</span></div>
          <div className="stat-desc">由等候名單完成付費轉換</div>
        </div>

        {(data.failedNotificationCount > 0 || data.pendingNotificationCount > 0) && (
          <div className="stat-card" style={{ border: data.failedNotificationCount > 0 ? '1px solid #e11d48' : undefined }}>
            <div className="stat-label">通知信狀態</div>
            <div className="stat-value" style={{ color: data.failedNotificationCount > 0 ? '#fb7185' : '#fbbf24' }}>
              {data.failedNotificationCount > 0
                ? `${data.failedNotificationCount} 封失敗`
                : `${data.pendingNotificationCount} 封待發`}
            </div>
            <div className="stat-desc">
              {data.failedNotificationCount > 0 ? (
                <button
                  onClick={handleRetryNotifications}
                  disabled={isRetrying}
                  style={{
                    background: '#881337',
                    color: '#fda4af',
                    border: '1px solid #e11d48',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isRetrying ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                  }}
                >
                  {isRetrying ? '重試中...' : '🔄 重試失敗通知'}
                </button>
              ) : '等待系統自動發送'}
            </div>
          </div>
        )}
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`anomaly-banner ${actionMessage.type === 'error' ? 'critical' : 'healthy'}`}
          style={{
            marginBottom: '20px',
            background: actionMessage.type === 'success' ? '#064e3b' : '#881337',
            borderColor: actionMessage.type === 'success' ? '#059669' : '#e11d48',
          }}
        >
          <div>
            <div className="anomaly-title">{actionMessage.type === 'success' ? '✅ 操作完成' : '❌ 操作失敗'}</div>
            <p style={{ fontSize: '13px', color: '#f3f4f6', margin: '4px 0 0 0' }}>{actionMessage.text}</p>
          </div>
        </div>
      )}

      {/* 2. Operational Cohort Release Control Card */}
      <div className="section-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid #334155' }}>
        <div className="section-header" style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>🚀 調升容量並全數釋出等候名額</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              容量代表系統承載規模。當運算資源與模型管線擴充完畢時，可一次調升容量上限並將目前所有等候中的孩子（{data.waitingCount} 人）全數釋出，系統將自動寄發通知信並開放標準訂閱。
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>目標容量上限 (Target Capacity)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min={minCapacityRequired}
                step={10}
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(Number(e.target.value))}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #475569',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '15px',
                  fontWeight: 600,
                  width: '140px',
                }}
              />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>人（最低需涵蓋 {minCapacityRequired} 人）</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
            <button
              className="action-btn primary"
              onClick={handleRaiseAndRelease}
              disabled={isSubmittingRaise || data.waitingCount === 0}
              style={{
                background: data.waitingCount > 0 ? '#2563eb' : '#334155',
                color: '#ffffff',
                padding: '10px 20px',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: data.waitingCount > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmittingRaise ? '處理中...' : `調升至 ${targetCapacity} 人並全數釋出 (${data.waitingCount} 人)`}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Waitlist Candidate Table */}
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `全部 (${data.entries.length})` },
              { id: 'waiting', label: `等候中 (${data.waitingCount})` },
              { id: 'released', label: `已釋出 (${data.releasedCount})` },
              { id: 'converted', label: `已轉換 (${data.convertedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: statusFilter === tab.id ? '#3b82f6' : '#334155',
                  background: statusFilter === tab.id ? '#1e3a8a' : '#1e293b',
                  color: statusFilter === tab.id ? '#93c5fd' : '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Fallback Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="搜尋 Email 或孩子姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                width: '200px',
              }}
            />

            {selectedChildIds.length > 0 && (
              <button
                className="action-btn"
                onClick={handleBatchRelease}
                style={{ background: '#059669', color: '#fff', fontSize: '13px', padding: '6px 12px' }}
              >
                釋出選取 ({selectedChildIds.length})
              </button>
            )}

            <button
              className="action-btn"
              onClick={handleCopyEmails}
              style={{ background: '#334155', color: '#cbd5e1', fontSize: '13px', padding: '6px 12px' }}
            >
              📋 {copyToast ? '已複製 Email 清單！' : '複製 Email 清單 (Fallback)'}
            </button>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            查無符合篩選條件的候補學生資料
          </div>
        ) : (
          <div className="table-responsive">
            <table className="cockpit-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredEntries.length > 0 &&
                        filteredEntries.every((e) => selectedChildIds.includes(e.childId))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChildIds(filteredEntries.map((item) => item.childId))
                        } else {
                          setSelectedChildIds([])
                        }
                      }}
                    />
                  </th>
                  <th>登記時間</th>
                  <th>家長信箱 (Email)</th>
                  <th>孩子名稱</th>
                  <th>年級</th>
                  <th>狀態</th>
                  <th>通知信</th>
                  <th>釋出時間</th>
                  <th>轉換時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedChildIds.includes(entry.childId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChildIds([...selectedChildIds, entry.childId])
                          } else {
                            setSelectedChildIds(selectedChildIds.filter((id) => id !== entry.childId))
                          }
                        }}
                      />
                    </td>
                    <td>{new Date(entry.createdAt).toLocaleString('zh-TW', { hour12: false })}</td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{entry.email}</td>
                    <td>{entry.childName}</td>
                    <td>{entry.gradeStage || `Grade ${entry.grade}`}</td>
                    <td>{renderStatusBadge(entry.status)}</td>
                    <td>
                      {renderNotificationBadge(entry.notificationStatus)}
                      {entry.notificationStatus === 'failed' && entry.notificationError && (
                        <div style={{ fontSize: '11px', color: '#fb7185', marginTop: '2px', maxWidth: '200px', wordBreak: 'break-all' }}
                             title={entry.notificationError}>
                          {entry.notificationError.slice(0, 60)}{entry.notificationError.length > 60 ? '…' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ color: entry.releasedAt ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {entry.releasedAt ? new Date(entry.releasedAt).toLocaleString('zh-TW', { hour12: false }) : '—'}
                    </td>
                    <td style={{ color: entry.convertedAt ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {entry.convertedAt ? new Date(entry.convertedAt).toLocaleString('zh-TW', { hour12: false }) : '—'}
                    </td>
                    <td>
                      {entry.status === 'waiting' && (
                        <button
                          className="action-btn"
                          onClick={() => handleReleaseChild(entry.childId)}
                          style={{
                            background: '#047857',
                            color: '#fff',
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '4px',
                          }}
                        >
                          個別釋出
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
