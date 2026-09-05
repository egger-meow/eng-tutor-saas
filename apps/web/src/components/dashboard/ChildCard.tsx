import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChildWithProfile } from '../../hooks/use-parent-data'
import { buildMaterialHistoryView, type Material } from '../../lib/materials'
import { handleInternalLink } from '../../app/use-route'
import { gradeStageLabel } from '../../lib/grade-stage'
import { getDeliveryViewModel } from '../../lib/delivery'
import { WeeklyLearningPanel } from './WeeklyLearningPanel'
import { PersonalizationSummary } from './PersonalizationSummary'
import { DeliveryStatus } from './DeliveryStatus'
import { MaterialHistory } from '../materials/MaterialHistory'
import { OwnedWeek1FastProgress } from '../materials/OwnedWeek1FastProgress'
import { LearningJourneyPanel } from './LearningJourneyPanel'
import { useEnrollmentState } from '../../lib/enrollment'

interface ChildCardProps {
  child: ChildWithProfile
  materials: Material[]
  onRefresh: () => void
  onLoadMoreMaterials: () => void
  hasMoreMaterials: boolean
  releasedMaterialCount: number
  loadingMoreMaterials: boolean
  defaultExpanded?: boolean
}

export function ChildCard({ child, materials, onRefresh, onLoadMoreMaterials, hasMoreMaterials, releasedMaterialCount, loadingMoreMaterials, defaultExpanded = false }: ChildCardProps) {
  const { state: enrollment } = useEnrollmentState()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { latestMaterial, pastMaterials, futureMaterials, historyCount } = buildMaterialHistoryView(materials, releasedMaterialCount)
  const nextPreparedMaterial = futureMaterials[futureMaterials.length - 1] ?? null
  const delivery = getDeliveryViewModel(
    child,
    latestMaterial,
    nextPreparedMaterial,
    child.next_job_release_at,
    undefined,
    child.has_past_due_job,
    child.has_active_generation_failure,
  )

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="child-dashboard-card"
    >
      <header className="child-card-header">
        <div className="child-card-identity">
          <div className="child-badge-group" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="child-badge">{gradeStageLabel(child)}</span>
            {child.waitlist?.status === 'waiting' && (
              <span className="status-label status-waitlist" style={{ background: '#78350f', color: '#fde68a' }}>等候名單中</span>
            )}
            {child.waitlist?.status === 'released' && (
              <span className="status-label status-released" style={{ background: '#064e3b', color: '#a7f3d0' }}>名額已開放</span>
            )}
            {child.subscription?.foundingStatus === 'redeemed' && (
              <span className="status-label status-founder">創始 30</span>
            )}
            {child.subscription?.status === 'trialing' && (
              <span
                className="status-label status-trialing"
                style={
                  !child.subscription.currentPeriodEnd
                    ? enrollment?.freePilotActive
                      ? { background: '#dcfce7', color: '#15803d' }
                      : { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                    : undefined
                }
              >
                {!child.subscription.currentPeriodEnd
                  ? enrollment?.freePilotActive
                    ? 'Beta 免費中'
                    : '免費階段已結束'
                  : '體驗期'}
              </span>
            )}
            {child.subscription?.status === 'canceled' && (
              <span className="status-label status-canceled">已到期</span>
            )}
            {child.subscription?.status === 'active' && child.subscription.cancelAtPeriodEnd && (
              <span className="status-label status-paused">已取消續訂</span>
            )}
            {child.subscription?.status === 'active' && !child.subscription.cancelAtPeriodEnd && (
              <span className="status-label status-active">訂閱中</span>
            )}
          </div>
          <h2>{child.display_name} 的英文學習</h2>
          <p className="child-subtitle">
            {child.textbook_version ? `課本：${child.textbook_version}` : '自訂課本版本'}
          </p>
        </div>
        <div className="child-card-actions">
          <button
            className="child-card-toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls={`child-card-content-${child.id}`}
            onClick={() => setExpanded((open) => !open)}
          >
            <span>{expanded ? '收起' : '展開本週內容'}</span>
            <span className={`toggle-arrow ${expanded ? 'expanded' : ''}`} aria-hidden="true">⌄</span>
          </button>
          <a className="button button-secondary button-sm" href={`/children/${child.id}`} onClick={handleInternalLink}>
            學習資料
          </a>
          <a className="button button-quiet button-sm" href={`/children/${child.id}/edit`} onClick={handleInternalLink}>
            編輯資料
          </a>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {expanded && (latestMaterial ? (
          <motion.div
            id={`child-card-content-${child.id}`}
            className="child-card-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          <WeeklyLearningPanel material={latestMaterial} childName={child.display_name} onFeedbackSaved={onRefresh} />
          <p className="muted">每週新教材完成後，會同步更新在這裡，並寄送通知至你的登入 Email。</p>
          
          <div className="dashboard-support">
            <PersonalizationSummary material={latestMaterial} />
            <DeliveryStatus delivery={delivery} />
          </div>

          <LearningJourneyPanel childId={child.id} />

          <div className="history-toggle-section">
            <button
              className="button-link text-link history-toggle-btn"
              type="button"
              disabled={historyCount === 0}
              aria-expanded={historyOpen}
              aria-label={historyCount === 0 ? '目前沒有過往教材' : historyOpen ? '收起過往教材' : `查看過往教材，共 ${historyCount} 筆`}
              data-history-label={historyCount === 0 ? '過往教材：目前還沒有' : historyOpen ? '收起過往教材' : `查看過往教材（${historyCount} 筆）`}
              onClick={() => setHistoryOpen((prev) => !prev)}
            >
              <span>{historyOpen ? '收起過去教材' : `檢視過去教材 (${historyCount} 份)`}</span>
              {historyCount > 0 && <span className={`toggle-arrow ${historyOpen ? 'expanded' : ''}`}>▼</span>}
            </button>

            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="history-content-wrapper"
                >
                  <MaterialHistory materials={pastMaterials} childName={child.display_name} onFeedbackSaved={onRefresh} hasMore={hasMoreMaterials} loadingMore={loadingMoreMaterials} onLoadMore={onLoadMoreMaterials} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </motion.div>
        ) : (
          <motion.div
            id={`child-card-content-${child.id}`}
            className="child-card-body empty-child-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          <div className="dashboard-support">
            {child.waitlist?.status === 'waiting' ? (
              <section className="empty-state">
                <h2>學習檔案已建立（等候開放中）</h2>
                <p>目前系統名額等候中，我們不會收取任何費用。當名額開放時，系統會立即以 Email 通知您，屆時再決定是否啟用訂閱。</p>
              </section>
            ) : child.waitlist?.status === 'released' ? (
              <section className="empty-state" style={{ borderColor: '#059669', background: '#064e3b15' }}>
                <h2 style={{ color: '#047857' }}>🎉 學習名額已為孩子開放！</h2>
                <p>系統已為 {child.display_name} 保留專屬名額，請前往訂閱頁面完成方案選擇與啟用。</p>
                <div style={{ marginTop: '12px' }}>
                  <a className="button button-primary button-sm" href={`/billing?childId=${child.id}`} onClick={handleInternalLink}>
                    立即前往啟用訂閱
                  </a>
                </div>
              </section>
            ) : nextPreparedMaterial ? (
              <section className="empty-state generation-progress generation-progress-ready">
                <div className="generation-progress-heading">
                  <span className="progress-check progress-check-large">✓</span>
                  <div>
                    <h2>第一份教材已準備完成</h2>
                    <p>第一份教材已完成，正在同步到孩子的教材區。</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="empty-state generation-progress">
                <OwnedWeek1FastProgress childId={child.id} onReady={onRefresh} />
                <p className="muted">可以留在這裡看進度，也可以先去做別的事；完成後會同步更新教材區並寄送通知。</p>
              </section>
            )}
            {!child.waitlist || child.waitlist.status === 'converted' ? (
              <DeliveryStatus delivery={delivery} />
            ) : null}
          </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.article>
  )
}