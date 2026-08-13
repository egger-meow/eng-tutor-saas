import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChildWithProfile } from '../../hooks/use-parent-data'
import type { Material } from '../../lib/materials'
import { handleInternalLink } from '../../app/use-route'
import { gradeStageLabel } from '../../lib/grade-stage'
import { getDeliveryViewModel } from '../../lib/delivery'
import { WeeklyLearningPanel } from './WeeklyLearningPanel'
import { PersonalizationSummary } from './PersonalizationSummary'
import { DeliveryStatus } from './DeliveryStatus'
import { MaterialHistory } from '../materials/MaterialHistory'

interface ChildCardProps {
  child: ChildWithProfile
  materials: Material[]
  onRefresh: () => void
  defaultExpanded?: boolean
}

export function ChildCard({ child, materials, onRefresh, defaultExpanded = false }: ChildCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [historyOpen, setHistoryOpen] = useState(false)
  const latestMaterial = materials[0] ?? null
  const pastMaterials = materials.slice(1)
  const delivery = getDeliveryViewModel(child, latestMaterial)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="child-dashboard-card"
    >
      <header className="child-card-header">
        <div className="child-card-identity">
          <span className="child-badge">{gradeStageLabel(child)}</span>
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
          
          <div className="dashboard-support">
            <PersonalizationSummary material={latestMaterial} />
            <DeliveryStatus delivery={delivery} />
          </div>

          {pastMaterials.length > 0 && (
            <div className="history-toggle-section">
              <button
                className="button-link text-link history-toggle-btn"
                type="button"
                onClick={() => setHistoryOpen((prev) => !prev)}
              >
                <span>{historyOpen ? '收起過去教材' : `檢視過去教材 (${pastMaterials.length} 份)`}</span>
                <span className={`toggle-arrow ${historyOpen ? 'expanded' : ''}`}>▼</span>
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
                    <MaterialHistory materials={pastMaterials} childName={child.display_name} onFeedbackSaved={onRefresh} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
            <section className="empty-state">
              <h2>第一份教材準備中</h2>
              <p>完成學習資料後，每週教材會在此自動產出並提供下載。</p>
            </section>
            <DeliveryStatus delivery={delivery} />
          </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.article>
  )
}
