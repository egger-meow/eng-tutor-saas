import React, { useState } from 'react'
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
import { AiDatasetExportView } from './components/export/AiDatasetExport.js'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const {
    health,
    overview,
    failures,
    feedback,
    productFeedback,
    timeline,
    aiExport,
    loading,
    isRefreshing,
    error,
    lastRefreshedAt,
    refreshCurrentTab,
    timelineChildId,
    setTimelineChildId,
    timelineWeek,
    setTimelineWeek,
  } = useAdminData(activeTab, 30)

  const handleDrillDownTimeline = (childId: string, week?: string) => {
    setTimelineChildId(childId)
    if (week) setTimelineWeek(week)
    setActiveTab('timeline')
  }

  const handleTimelineSearch = (childId: string, week: string) => {
    setTimelineChildId(childId)
    setTimelineWeek(week)
    refreshCurrentTab(false)
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

        {loading && !overview && !failures && !feedback && !productFeedback && !timeline && !aiExport ? (
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

            {activeTab === 'export' && (
              <AiDatasetExportView
                data={aiExport}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
export default App
