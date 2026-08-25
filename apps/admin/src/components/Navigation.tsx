import React from 'react'
import type { TabId, OperationsOverview, FailureIntelligence } from '../client/types.js'

interface NavigationProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  overview: OperationsOverview | null
  failures: FailureIntelligence | null
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, overview, failures }) => {
  const stuckCount = overview?.queueStats.overdueOrStuck || 0
  const failureCount = failures?.totalFailures || overview?.queueStats.failed || 0
  const tabs: Array<{ id: TabId; label: string; badge?: number; isAlert?: boolean }> = [
    { id: 'overview', label: '營運總覽', badge: stuckCount || undefined, isAlert: stuckCount > 0 },
    { id: 'announcements', label: '公告管理' },
    { id: 'timeline', label: '學員管理 / 生成測試' },
    { id: 'subscriptions', label: '訂閱與營收' },
    { id: 'failures', label: '失敗情報', badge: failureCount || undefined, isAlert: failureCount > 0 },
    { id: 'feedback', label: '家長回饋' },
    { id: 'product', label: '產品回饋' },
    { id: 'waitlist', label: '等候名單', badge: overview?.capacity?.waitingCount || undefined },
    { id: 'export', label: 'AI 資料匯出' },
  ]
  return <nav className="cockpit-nav" aria-label="管理功能">
    {tabs.map((tab) => <button key={tab.id} className={'nav-tab-btn ' + (activeTab === tab.id ? 'active' : '')} onClick={() => setActiveTab(tab.id)}>
      <span>{tab.label}</span>{tab.badge !== undefined && <span className={'tab-badge ' + (tab.isAlert ? 'alert' : '')}>{tab.badge}</span>}
    </button>)}
  </nav>
}