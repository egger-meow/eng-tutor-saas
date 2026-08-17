import React from 'react'
import type { TabId, OperationsOverview, FailureIntelligence } from '../client/types.js'

interface NavigationProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  overview: OperationsOverview | null
  failures: FailureIntelligence | null
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  overview,
  failures,
}) => {
  const stuckCount = overview?.queueStats.overdueOrStuck || 0
  const failureCount = failures?.totalFailures || overview?.queueStats.failed || 0

  const tabs: Array<{ id: TabId; label: string; icon: string; badge?: number; isAlert?: boolean }> = [
    {
      id: 'overview',
      label: '即時維運總覽 (Operations)',
      icon: '📊',
      badge: stuckCount > 0 ? stuckCount : undefined,
      isAlert: stuckCount > 0,
    },
    {
      id: 'failures',
      label: '生成與 Finisher 失敗情報 (Failures)',
      icon: '🚨',
      badge: failureCount > 0 ? failureCount : undefined,
      isAlert: failureCount > 0,
    },
    {
      id: 'feedback',
      label: '家長每週反饋情報 (Parent Feedback)',
      icon: '💬',
    },
    {
      id: 'product',
      label: '產品與使用反饋 (Product & Friction)',
      icon: '🧭',
    },
    {
      id: 'timeline',
      label: '孩子/週次 生命週期追蹤 (Timeline)',
      icon: '🔍',
    },
    {
      id: 'export',
      label: 'AI 系統改善資料集匯出 (AI Dataset)',
      icon: '🤖',
    },
  ]

  return (
    <nav className="cockpit-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className={`tab-badge ${tab.isAlert ? 'alert' : ''}`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
