import { useState, useMemo, useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import type { LearningTimelineItem } from '../../lib/learning-library'

interface LearningJourneyTimelineProps {
  items: LearningTimelineItem[]
  loadingMore: boolean
  onLoadMore: () => void
  initialSelectedSequenceNumber?: number
}

const STEP_WIDTH = 76
const PADDING_X = 48
const BASE_Y = 56
const Y_OFFSETS = [0, -14, 8, -6, 12, -8, 6, -10]

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
  } catch {
    return isoString
  }
}

export function LearningJourneyTimeline({
  items,
  loadingMore,
  onLoadMore,
  initialSelectedSequenceNumber,
}: LearningJourneyTimelineProps) {
  // Sort items chronologically (oldest to newest: Week 1 -> Week N)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  }, [items])

  // Default to the latest week or specified initial sequence number
  const [selectedSeq, setSelectedSeq] = useState<number | null>(() => {
    if (initialSelectedSequenceNumber !== undefined) {
      return initialSelectedSequenceNumber
    }
    return sortedItems.length > 0 ? sortedItems[sortedItems.length - 1].sequenceNumber : null
  })

  // Synchronize if items change or initialSelectedSequenceNumber changes
  useEffect(() => {
    if (initialSelectedSequenceNumber !== undefined) {
      setSelectedSeq(initialSelectedSequenceNumber)
    } else if (sortedItems.length > 0 && (selectedSeq === null || !sortedItems.some((it) => it.sequenceNumber === selectedSeq))) {
      setSelectedSeq(sortedItems[sortedItems.length - 1].sequenceNumber)
    }
  }, [sortedItems, initialSelectedSequenceNumber, selectedSeq])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // Center selected node in scroll view
  useEffect(() => {
    if (selectedSeq !== null && scrollContainerRef.current) {
      const nodeEl = nodeRefs.current.get(selectedSeq)
      if (nodeEl) {
        const container = scrollContainerRef.current
        const nodeLeft = nodeEl.offsetLeft
        const nodeWidth = nodeEl.offsetWidth
        const containerWidth = container.clientWidth
        container.scrollTo({
          left: nodeLeft - containerWidth / 2 + nodeWidth / 2,
          behavior: 'smooth',
        })
      }
    }
  }, [selectedSeq])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = Math.min(sortedItems.length - 1, currentIndex + 1)
        const nextItem = sortedItems[nextIndex]
        if (nextItem) {
          setSelectedSeq(nextItem.sequenceNumber)
          nodeRefs.current.get(nextItem.sequenceNumber)?.focus()
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = Math.max(0, currentIndex - 1)
        const prevItem = sortedItems[prevIndex]
        if (prevItem) {
          setSelectedSeq(prevItem.sequenceNumber)
          nodeRefs.current.get(prevItem.sequenceNumber)?.focus()
        }
      }
    },
    [sortedItems]
  )

  if (sortedItems.length === 0) {
    return (
      <section className="learning-journey-timeline empty" aria-labelledby="learning-timeline-title">
        <div className="timeline-header">
          <h3 id="learning-timeline-title">學習軌跡</h3>
        </div>
        <div className="constellation-empty">
          <p>完成第一份教材後，這裡會開始累積學習歷程。</p>
        </div>
      </section>
    )
  }

  const selectedItem =
    sortedItems.find((it) => it.sequenceNumber === selectedSeq) ??
    sortedItems[sortedItems.length - 1]

  // Calculate layout coordinates
  const points = sortedItems.map((item, index) => {
    const x = PADDING_X + index * STEP_WIDTH
    const y = sortedItems.length === 1 ? BASE_Y : BASE_Y + Y_OFFSETS[index % Y_OFFSETS.length]
    return { item, x, y }
  })

  const totalWidth = Math.max(
    PADDING_X * 2 + (sortedItems.length - 1) * STEP_WIDTH,
    280
  )

  // Construct path string for constellation line
  const pathD =
    points.length > 1
      ? points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
      : ''

  return (
    <section className="learning-journey-timeline" aria-labelledby="learning-timeline-title">
      <div className="timeline-header-row">
        <div>
          <h3 id="learning-timeline-title">學習軌跡</h3>
          <p className="timeline-hint">點選節點查看該週的學習紀錄與掌握進度</p>
        </div>
        {items.length >= 10 && (
          <button
            type="button"
            className="button button-quiet button-sm load-more-history-btn"
            disabled={loadingMore}
            onClick={onLoadMore}
            aria-label="載入更早的學習紀錄"
          >
            {loadingMore ? '載入中…' : '看更早的紀錄'}
          </button>
        )}
      </div>

      {/* Constellation Chart Area */}
      <div className="constellation-scroll-wrapper" ref={scrollContainerRef}>
        <div
          className="constellation-canvas-container"
          style={{ width: `${totalWidth}px`, minWidth: '100%', height: '116px' }}
        >
          {/* Background SVG connecting line */}
          <svg
            className="constellation-svg"
            width={totalWidth}
            height={116}
            viewBox={`0 0 ${totalWidth} 116`}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="constellationLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-rule-strong)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-action)" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {pathD && (
              <>
                <path
                  d={pathD}
                  className="constellation-line-glow"
                  fill="none"
                  stroke="var(--color-action)"
                  strokeWidth="4"
                  strokeOpacity="0.15"
                />
                <path
                  d={pathD}
                  className="constellation-line"
                  fill="none"
                  stroke="url(#constellationLineGradient)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </>
            )}
          </svg>

          {/* Interactive Star / Week Nodes */}
          <div
            className="constellation-nodes-track"
            role="tablist"
            aria-label="每週學習節點"
            aria-orientation="horizontal"
          >
            {points.map(({ item, x, y }, index) => {
              const isSelected = item.sequenceNumber === selectedItem.sequenceNumber
              const isLatest = index === points.length - 1
              return (
                <button
                  key={item.sequenceNumber}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(item.sequenceNumber, el)
                    else nodeRefs.current.delete(item.sequenceNumber)
                  }}
                  type="button"
                  role="tab"
                  id={`constellation-tab-week-${item.sequenceNumber}`}
                  aria-selected={isSelected}
                  aria-controls="constellation-detail-panel"
                  tabIndex={isSelected ? 0 : -1}
                  aria-label={`Week ${item.sequenceNumber}，${formatDate(item.recordedAt)}`}
                  className={`constellation-node ${isSelected ? 'is-selected' : ''} ${isLatest ? 'is-latest' : ''}`}
                  style={{ left: `${x}px`, top: `${y}px` }}
                  onClick={() => setSelectedSeq(item.sequenceNumber)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  <span className="constellation-star-outer" aria-hidden="true">
                    <span className="constellation-star-inner" />
                  </span>
                  <span className="constellation-label">W{item.sequenceNumber}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected Week Detail Card */}
      {selectedItem && (
        <div
          id="constellation-detail-panel"
          role="tabpanel"
          aria-labelledby={`constellation-tab-week-${selectedItem.sequenceNumber}`}
          className="constellation-detail-card"
        >
          <div className="detail-card-header">
            <div className="detail-header-left">
              <span className="detail-week-pill">Week {selectedItem.sequenceNumber}</span>
              <time className="detail-date" dateTime={selectedItem.recordedAt}>
                {formatDate(selectedItem.recordedAt)}
              </time>
            </div>
            <div className="detail-reading-status">
              <span className="detail-reading-label">閱讀狀態</span>
              <span className="detail-reading-badge">
                {selectedItem.readingTrajectory || '尚待觀察'}
              </span>
            </div>
          </div>

          <div className="detail-card-body">
            <div className="detail-vocab-summary">
              <span className="detail-vocab-icon" aria-hidden="true">📖</span>
              <span>
                新接觸 <strong>{selectedItem.introducedCount}</strong> 個單字，複習{' '}
                <strong>{selectedItem.reviewedCount}</strong> 個單字
              </span>
            </div>

            {selectedItem.improvements && selectedItem.improvements.length > 0 && (
              <div className="detail-section detail-improvements">
                <div className="detail-section-title">
                  <span className="detail-section-icon" aria-hidden="true">🌱</span>
                  <strong>看見進步：</strong>
                </div>
                <p className="detail-section-content">{selectedItem.improvements.join('、')}</p>
              </div>
            )}

            {selectedItem.nextReviewReasons && selectedItem.nextReviewReasons.length > 0 && (
              <div className="detail-section detail-next-review">
                <div className="detail-section-title">
                  <span className="detail-section-icon" aria-hidden="true">🎯</span>
                  <strong>接下來再練：</strong>
                </div>
                <p className="detail-section-content">{selectedItem.nextReviewReasons.join('、')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
