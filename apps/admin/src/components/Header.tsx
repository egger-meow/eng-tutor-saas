import React from 'react'
import type { HealthState, OperationsOverview } from '../client/types.js'

interface HeaderProps {
  health: HealthState | null
  overview: OperationsOverview | null
  isRefreshing: boolean
  lastRefreshedAt: string
  onRefresh: () => void
}

export const Header: React.FC<HeaderProps> = ({
  health,
  overview,
  isRefreshing,
  lastRefreshedAt,
  onRefresh,
}) => {
  const healthStatus = overview?.systemHealth || 'healthy'
  const isConnected = health?.connected ?? false

  const healthLabels: Record<string, string> = {
    healthy: '系統運作正常',
    attention_needed: '需注意異常',
    critical: '警報狀態',
  }

  return (
    <header className="cockpit-header">
      <div className="header-brand">
        <span className="brand-badge">OPS COCKPIT</span>
        <h1 className="brand-title">紙屬英文 | Production Observability & Learning Console</h1>
        <span style={{ fontSize: '11px', padding: '2px 8px', background: isConnected ? '#064e3b' : '#7f1d1d', color: isConnected ? '#6ee7b7' : '#fca5a5', borderRadius: '4px' }}>
          {isConnected ? '🟢 Supabase 生產資料庫連線' : '🔴 資料庫未連線 (請檢查 .env)'}
        </span>
      </div>

      <div className="header-meta">
        <div className={`health-pill ${healthStatus}`}>
          <span className="pulse-dot" />
          <span>{healthLabels[healthStatus] || healthStatus}</span>
        </div>

        {lastRefreshedAt && (
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            更新時間: {lastRefreshedAt}
          </span>
        )}

        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="重新整理當前資料"
        >
          <span>{isRefreshing ? '⏳' : '🔄'}</span>
          <span>{isRefreshing ? '讀取中...' : '重新整理'}</span>
        </button>
      </div>
    </header>
  )
}
