import React from 'react'
import type { HealthState, OperationsOverview } from '../client/types.js'

interface HeaderProps {
  health: HealthState | null
  overview: OperationsOverview | null
  isRefreshing: boolean
  lastRefreshedAt: string
  onRefresh: () => void
}

export const Header: React.FC<HeaderProps> = ({ health, overview, isRefreshing, lastRefreshedAt, onRefresh }) => {
  const healthStatus = overview?.systemHealth || 'healthy'
  const labels: Record<string, string> = { healthy: '系統正常', attention_needed: '需要注意', critical: '嚴重異常' }
  const connected = health?.connected ?? false

  return (
    <header className="cockpit-header">
      <div className="header-brand">
        <span className="brand-badge">營運後台</span>
        <h1 className="brand-title">
          <span className="brand-title-full">Paper English 生產營運台</span>
          <span className="brand-title-short">營運台</span>
        </h1>
        <span className={'connection-state ' + (connected ? 'connected' : 'disconnected')}>
          {connected ? '已連線' : '未連線'}
        </span>
      </div>
      <div className="header-meta">
        <div className={'health-pill ' + healthStatus}>
          <span className="pulse-dot" />
          <span>{labels[healthStatus] || healthStatus}</span>
        </div>
        {lastRefreshedAt && <span className="refresh-time">更新：{lastRefreshedAt}</span>}
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="重新整理目前資料"
          aria-label="重新整理"
        >
          <span className="refresh-icon">{isRefreshing ? '⏳' : '🔄'}</span>
          <span className="refresh-label">{isRefreshing ? '更新中…' : '重新整理'}</span>
        </button>
      </div>
    </header>
  )
}