import React from 'react'
import type { HealthState, OperationsOverview } from '../client/types.js'
interface HeaderProps { health: HealthState | null; overview: OperationsOverview | null; isRefreshing: boolean; lastRefreshedAt: string; onRefresh: () => void }
export const Header: React.FC<HeaderProps> = ({ health, overview, isRefreshing, lastRefreshedAt, onRefresh }) => {
  const healthStatus = overview?.systemHealth || 'healthy'
  const labels: Record<string, string> = { healthy: '系統正常', attention_needed: '需要注意', critical: '嚴重異常' }
  const connected = health?.connected ?? false
  return <header className="cockpit-header"><div className="header-brand"><span className="brand-badge">營運後台</span><h1 className="brand-title">Paper English 生產營運台</h1>
    <span className={'connection-state ' + (connected ? 'connected' : 'disconnected')}>{connected ? 'Supabase 已連線' : '資料庫未連線'}</span></div>
    <div className="header-meta"><div className={'health-pill ' + healthStatus}><span className="pulse-dot" /><span>{labels[healthStatus] || healthStatus}</span></div>
      {lastRefreshedAt && <span className="refresh-time">最後更新：{lastRefreshedAt}</span>}
      <button className="refresh-btn" onClick={onRefresh} disabled={isRefreshing} title="重新整理目前資料">{isRefreshing ? '重新整理中…' : '重新整理'}</button>
    </div></header>
}