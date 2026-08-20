import React, { useState, useEffect } from 'react'
import type { TabId } from './client/types.js'
import { useAdminData } from './client/use-admin-data.js'
import { Header } from './components/Header.js'
import { Navigation } from './components/Navigation.js'
import { AnomalyBanner } from './components/AnomalyBanner.js'
import { OperationsOverviewView } from './components/overview/OperationsOverview.js'
import { FailureIntelligenceView } from './components/failures/FailureIntelligence.js'
import { ParentFeedbackIntelligenceView } from './components/feedback/ParentFeedbackIntelligence.js'
import { ProductFeedbackView } from './components/product/ProductFeedbackView.js'
import { ChildWeekTimelineView } from './components/timeline/ChildWeekTimeline.js'
import { WaitlistManagementView } from './components/waitlist/WaitlistManagementView.js'
import { AiDatasetExportView } from './components/export/AiDatasetExport.js'

const VALID_TABS: TabId[] = ['overview', 'failures', 'feedback', 'product', 'timeline', 'waitlist', 'export']

function getStoredTab(): TabId {
  if (typeof window === 'undefined') return 'overview'

  // 1. Check URL Hash (e.g. #failures)
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
  if (VALID_TABS.includes(hash as TabId)) {
    return hash as TabId
  }

  // 2. Check localStorage
  try {
    const stored = localStorage.getItem('admin_active_tab')?.trim().toLowerCase()
    if (stored && VALID_TABS.includes(stored as TabId)) {
      return stored as TabId
    }
  } catch {}

  return 'overview'
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>(getStoredTab)

  // Sync activeTab to URL hash and localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
      if (currentHash !== activeTab) {
        window.location.hash = activeTab
      }
      try {
        localStorage.setItem('admin_active_tab', activeTab)
      } catch {}
    }
  }, [activeTab])

  // Listen to browser back/forward navigation and hash changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
      if (VALID_TABS.includes(hash as TabId)) {
        setActiveTab(hash as TabId)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const {
    health,
    overview,
    failures,
    feedback,
    productFeedback,
    timeline,
    waitlist,
    aiExport,
    loading,
    isRefreshing,
    error,
    lastRefreshedAt,
    refreshCurrentTab,
    selectChildTimeline,
    timelineChildId,
    timelineWeek,
    qualityEra,
    setQualityEra,
  } = useAdminData(activeTab, 30)

  const handleDrillDownTimeline = (childId: string, week?: string) => {
    selectChildTimeline(childId, week)
    setActiveTab('timeline')
  }

  const handleTimelineSearch = (childId: string, week: string) => {
    selectChildTimeline(childId, week)
  }

  return (
    <div className="cockpit-layout">
      <Header
        health={health}
        overview={overview}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
        onRefresh={() => refreshCurrentTab(false)}
      />

      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overview={overview}
        failures={failures}
      />

      <main className="cockpit-main">
        {error && (
          <div className="anomaly-banner critical" style={{ marginBottom: '20px' }}>
            <div>
              <div className="anomaly-title">連線或資料讀取異常</div>
              <p style={{ fontSize: '13px', color: '#fecdd3' }}>{error}</p>
            </div>
          </div>
        )}

        {overview?.anomalies && overview.anomalies.length > 0 && activeTab === 'overview' && (
          <AnomalyBanner
            anomalies={overview.anomalies}
            isCritical={overview.systemHealth === 'critical'}
          />
        )}

        {loading && !overview && !failures && !feedback && !productFeedback && !timeline && !waitlist && !aiExport ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div>載入維運數據中...</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OperationsOverviewView
                data={overview}
                onDrillDownTimeline={handleDrillDownTimeline}
              />
            )}

            {activeTab === 'failures' && (
              <FailureIntelligenceView
                data={failures}
                currentEra={qualityEra}
                onSelectEra={setQualityEra}
                onDrillDownTimeline={handleDrillDownTimeline}
              />
            )}

            {activeTab === 'feedback' && (
              <ParentFeedbackIntelligenceView
                data={feedback}
                onDrillDownTimeline={handleDrillDownTimeline}
              />
            )}

            {activeTab === 'product' && (
              <ProductFeedbackView
                data={productFeedback}
              />
            )}

            {activeTab === 'timeline' && (
              <ChildWeekTimelineView
                data={timeline}
                childIdQuery={timelineChildId}
                weekQuery={timelineWeek}
                onSearch={handleTimelineSearch}
              />
            )}

            {activeTab === 'waitlist' && (
              <WaitlistManagementView
                data={waitlist}
                onRefresh={() => refreshCurrentTab(false)}
              />
            )}

            {activeTab === 'export' && (
              <AiDatasetExportView
                data={aiExport}
                currentEra={qualityEra}
                onSelectEra={setQualityEra}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
export default App
