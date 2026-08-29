import React, { useState, useMemo, useRef } from 'react'
import type { SubscriptionRevenueData } from '../../client/types.js'

interface Props {
  data: SubscriptionRevenueData | null
  rangeDays: number
  onRangeChange: (days: number) => void
}

type Granularity = 'day' | 'week' | 'month'

const STATUS_LABELS: Record<string, string> = {
  trialing: '體驗中',
  active: '付費訂閱中',
  cancel_scheduled: '已排定取消',
  past_due: '扣款異常',
  paused: '暫停',
  canceled: '已退訂',
}

const EVENT_LABELS: Record<string, string> = {
  trial_started: '開始體驗',
  activated: '轉為付費',
  renewed: '續訂',
  cancel_scheduled: '排定取消',
  resumed: '恢復訂閱',
  past_due: '扣款異常',
  paused: '暫停',
  canceled: '取消',
  expired: '到期',
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '—')
const money = (value: number | null) => (value == null ? '—' : 'NT$' + value.toLocaleString('zh-TW'))

interface AggregatedPoint {
  xLabel: string
  fullDateLabel: string
  rawDate: string
  activePaid: number
  trials: number
  newPaid: number
  cancellations: number
  netGrowth: number
  conversionPercent: number
}

function aggregateSeries(rawSeries: SubscriptionRevenueData['series'], granularity: Granularity): AggregatedPoint[] {
  if (!rawSeries || rawSeries.length === 0) return []

  if (granularity === 'day') {
    return rawSeries.map((point) => {
      const parts = point.date.split('-')
      const m = parseInt(parts[1] ?? '1', 10)
      const d = parseInt(parts[2] ?? '1', 10)
      const dateObj = new Date(point.date + 'T00:00:00Z')
      const weekDayStr = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getUTCDay()] ?? ''
      return {
        xLabel: `${m}/${d}`,
        fullDateLabel: `${point.date} (週${weekDayStr})`,
        rawDate: point.date,
        activePaid: point.activePaid,
        trials: point.trials,
        newPaid: point.newPaid,
        cancellations: point.cancellations,
        netGrowth: point.netGrowth,
        conversionPercent: point.conversionPercent,
      }
    })
  }

  if (granularity === 'week') {
    const points: AggregatedPoint[] = []
    const chunkSize = 7
    for (let i = 0; i < rawSeries.length; i += chunkSize) {
      const chunk = rawSeries.slice(i, i + chunkSize)
      if (chunk.length === 0) continue
      const first = chunk[0]!
      const last = chunk[chunk.length - 1]!
      const firstParts = first.date.split('-')
      const lastParts = last.date.split('-')
      const startM = parseInt(firstParts[1] ?? '1', 10)
      const startD = parseInt(firstParts[2] ?? '1', 10)
      const endM = parseInt(lastParts[1] ?? '1', 10)
      const endD = parseInt(lastParts[2] ?? '1', 10)

      const trialsSum = chunk.reduce((sum, item) => sum + item.trials, 0)
      const newPaidSum = chunk.reduce((sum, item) => sum + item.newPaid, 0)
      const cancellationsSum = chunk.reduce((sum, item) => sum + item.cancellations, 0)
      const netGrowthSum = chunk.reduce((sum, item) => sum + item.netGrowth, 0)

      points.push({
        xLabel: `${startM}/${startD}`,
        fullDateLabel: `${first.date} ~ ${last.date} (${startM}/${startD} - ${endM}/${endD})`,
        rawDate: first.date,
        activePaid: last.activePaid,
        trials: trialsSum,
        newPaid: newPaidSum,
        cancellations: cancellationsSum,
        netGrowth: netGrowthSum,
        conversionPercent: last.conversionPercent,
      })
    }
    return points
  }

  // granularity === 'month'
  const monthGroups = new Map<string, typeof rawSeries>()
  for (const item of rawSeries) {
    const monthKey = item.date.slice(0, 7)
    const existing = monthGroups.get(monthKey) || []
    existing.push(item)
    monthGroups.set(monthKey, existing)
  }

  const points: AggregatedPoint[] = []
  for (const [monthKey, chunk] of monthGroups.entries()) {
    const parts = monthKey.split('-')
    const year = parts[0]
    const m = parseInt(parts[1] ?? '1', 10)
    const last = chunk[chunk.length - 1]!

    const trialsSum = chunk.reduce((sum, item) => sum + item.trials, 0)
    const newPaidSum = chunk.reduce((sum, item) => sum + item.newPaid, 0)
    const cancellationsSum = chunk.reduce((sum, item) => sum + item.cancellations, 0)
    const netGrowthSum = chunk.reduce((sum, item) => sum + item.netGrowth, 0)

    points.push({
      xLabel: `${m}月`,
      fullDateLabel: `${year} 年 ${m} 月 (${chunk[0]?.date} ~ ${last.date})`,
      rawDate: monthKey,
      activePaid: last.activePaid,
      trials: trialsSum,
      newPaid: newPaidSum,
      cancellations: cancellationsSum,
      netGrowth: netGrowthSum,
      conversionPercent: last.conversionPercent,
    })
  }
  return points
}

interface ChartConfig {
  title: string
  field: keyof AggregatedPoint
  unit: string
  color: string
  gradientId: string
  isPercentage?: boolean
  summaryType: 'latest' | 'sum' | 'delta'
  description: string
}

function InteractiveMetricChart({
  config,
  data,
  granularity,
}: {
  config: ChartConfig
  data: AggregatedPoint[]
  granularity: Granularity
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const { title, field, unit, color, gradientId, isPercentage, summaryType, description } = config

  const values = useMemo(() => data.map((d) => Number(d[field]) || 0), [data, field])

  // Coordinate System
  const svgWidth = 440
  const svgHeight = 200
  const padLeft = 46
  const padRight = 20
  const padTop = 22
  const padBottom = 42
  const plotW = svgWidth - padLeft - padRight
  const plotH = svgHeight - padTop - padBottom

  const count = data.length

  const { minY, maxY, yTicks } = useMemo(() => {
    if (values.length === 0) return { minY: 0, maxY: 1, yTicks: [0, 1] }

    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)

    if (isPercentage) {
      const top = Math.max(100, Math.ceil((rawMax || 10) / 10) * 10)
      return {
        minY: 0,
        maxY: top,
        yTicks: [0, Math.round(top / 2), top],
      }
    }

    let low = Math.min(0, Math.floor(rawMin))
    let high = Math.max(1, Math.ceil(rawMax * 1.15))
    if (low === high) high = low + 1

    const mid = Math.round((low + high) / 2)
    return {
      minY: low,
      maxY: high,
      yTicks: [low, mid, high],
    }
  }, [values, isPercentage])

  const getCoordinates = (index: number, val: number) => {
    const x = count <= 1 ? padLeft + plotW / 2 : padLeft + (index / (count - 1)) * plotW
    const ySpan = maxY - minY || 1
    const y = padTop + (1 - (val - minY) / ySpan) * plotH
    return { x, y }
  }

  const { linePath, areaPath, coords } = useMemo(() => {
    if (count === 0) return { linePath: '', areaPath: '', coords: [] }

    const computedCoords = data.map((d, i) => getCoordinates(i, Number(d[field]) || 0))

    if (count === 1) {
      const p = computedCoords[0]!
      const lPath = `M ${padLeft},${p.y} L ${padLeft + plotW},${p.y}`
      const aPath = `M ${padLeft},${padTop + plotH} L ${padLeft},${p.y} L ${padLeft + plotW},${p.y} L ${padLeft + plotW},${padTop + plotH} Z`
      return { linePath: lPath, areaPath: aPath, coords: computedCoords }
    }

    const dLine = computedCoords.map((c, idx) => (idx === 0 ? `M ${c.x.toFixed(1)},${c.y.toFixed(1)}` : `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`)).join(' ')
    const firstC = computedCoords[0]!
    const lastC = computedCoords[computedCoords.length - 1]!
    const baselineY = (padTop + plotH).toFixed(1)
    const dArea = `M ${firstC.x.toFixed(1)},${baselineY} L ${dLine.slice(2)} L ${lastC.x.toFixed(1)},${baselineY} Z`

    return { linePath: dLine, areaPath: dArea, coords: computedCoords }
  }, [data, count, field, minY, maxY])

  // X Ticks (Select 4 to 6 evenly spaced points)
  const xTickIndices = useMemo(() => {
    if (count <= 6) return Array.from({ length: count }, (_, i) => i)
    return [0, Math.floor(count * 0.25), Math.floor(count * 0.5), Math.floor(count * 0.75), count - 1]
  }, [count])

  // Current / Summary value calculations
  const latestValue = values.at(-1) ?? 0
  const sumValue = useMemo(() => values.reduce((acc, v) => acc + v, 0), [values])
  const activeHoverPoint = hoverIndex != null && data[hoverIndex] ? data[hoverIndex] : null
  const displayValue = activeHoverPoint ? Number(activeHoverPoint[field]) || 0 : latestValue

  // Summary badge text
  let summaryBadgeText = ''
  if (summaryType === 'sum') {
    summaryBadgeText = `區間累計: ${sumValue.toLocaleString('zh-TW')}${unit}`
  } else if (summaryType === 'delta') {
    const delta = latestValue - (values[0] ?? 0)
    summaryBadgeText = `區間變動: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('zh-TW')}${unit}`
  } else if (isPercentage) {
    summaryBadgeText = `當前轉換率: ${latestValue}%`
  } else {
    summaryBadgeText = `當前數值: ${latestValue.toLocaleString('zh-TW')}${unit}`
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || count === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const svgX = (clientX / rect.width) * svgWidth

    const relativeX = Math.max(0, Math.min(plotW, svgX - padLeft))
    const index = Math.round((relativeX / plotW) * (count - 1))
    setHoverIndex(Math.max(0, Math.min(count - 1, index)))
  }

  const handlePointerLeave = () => {
    setHoverIndex(null)
  }

  const activeCoord = hoverIndex != null && coords[hoverIndex] ? coords[hoverIndex] : null

  return (
    <article className="cockpit-card metric-chart-interactive">
      <header className="metric-chart-card-header">
        <div className="metric-header-left">
          <span className="metric-title">
            <i className="metric-color-dot" style={{ backgroundColor: color }} />
            {title}
            <span className="metric-granularity-tag">
              {granularity === 'day' ? '日趨勢' : granularity === 'week' ? '週彙整' : '月彙整'}
            </span>
          </span>
          <small className="metric-desc">{description}</small>
        </div>
        <div className="metric-header-right">
          <strong className="metric-value" style={{ color: color }}>
            {displayValue.toLocaleString('zh-TW')}
            <span className="metric-unit">{unit}</span>
          </strong>
          <span className="metric-badge">{activeHoverPoint ? activeHoverPoint.fullDateLabel : summaryBadgeText}</span>
        </div>
      </header>

      <div className="metric-chart-svg-wrapper">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="metric-chart-svg"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          role="img"
          aria-label={`${title} 趨勢圖表`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
            <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Horizontal Y-Grid lines and Y-axis tick labels */}
          {yTicks.map((tickVal, idx) => {
            const ySpan = maxY - minY || 1
            const yPos = padTop + (1 - (tickVal - minY) / ySpan) * plotH
            return (
              <g key={`ytick-${idx}`}>
                <line
                  x1={padLeft}
                  x2={padLeft + plotW}
                  y1={yPos}
                  y2={yPos}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="3,3"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                >
                  {tickVal}
                  {isPercentage ? '%' : ''}
                </text>
              </g>
            )
          })}

          {/* Bottom X-axis baseline */}
          <line
            x1={padLeft}
            x2={padLeft + plotW}
            y1={padTop + plotH}
            y2={padTop + plotH}
            stroke="rgba(255, 255, 255, 0.16)"
          />

          {/* X-axis tick marks and labels */}
          {xTickIndices.map((i) => {
            const point = data[i]
            if (!point) return null
            const xPos = count <= 1 ? padLeft + plotW / 2 : padLeft + (i / (count - 1)) * plotW
            return (
              <g key={`xtick-${i}`}>
                <line
                  x1={xPos}
                  x2={xPos}
                  y1={padTop + plotH}
                  y2={padTop + plotH + 4}
                  stroke="rgba(255, 255, 255, 0.28)"
                />
                <text
                  x={xPos}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  fill="var(--text-dim)"
                  fontSize="10"
                  fontFamily="system-ui, sans-serif"
                >
                  {point.xLabel}
                </text>
              </g>
            )
          })}

          {/* Area gradient and Metric line */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${gradientId})`}
            />
          )}

          {/* Points for smaller series */}
          {count <= 24 &&
            coords.map((c, i) => (
              <circle
                key={`dot-${i}`}
                cx={c.x}
                cy={c.y}
                r="3"
                fill={color}
                opacity={hoverIndex === i ? 1 : 0.75}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            ))}

          {/* Hover Crosshair & Indicator */}
          {activeCoord && activeHoverPoint && (
            <g className="chart-hover-layer">
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={padTop}
                y2={padTop + plotH}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeDasharray="3,3"
              />
              <circle cx={activeCoord.x} cy={activeCoord.y} r="8" fill={color} opacity="0.25" />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="4.5"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Floating Tooltip Overlay */}
        {activeCoord && activeHoverPoint && (() => {
          const xPct = (activeCoord.x / svgWidth) * 100
          const yPct = (activeCoord.y / svgHeight) * 100
          const isNearTop = yPct < 30
          const isNearLeft = xPct < 20
          const isNearRight = xPct > 80

          let transformX = '-50%'
          if (isNearLeft) transformX = '0%'
          else if (isNearRight) transformX = '-100%'

          const transformY = isNearTop ? '12px' : 'calc(-100% - 10px)'

          return (
            <div
              className="chart-floating-tooltip"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                transform: `translate(${transformX}, ${transformY})`,
              }}
            >
              <span className="tooltip-date">{activeHoverPoint.fullDateLabel}</span>
              <div className="tooltip-val">
                <span className="tooltip-dot" style={{ backgroundColor: color }} />
                <strong>{title}:</strong>
                <span style={{ color: color, fontWeight: 700 }}>
                  {Number(activeHoverPoint[field]).toLocaleString('zh-TW')}
                  {unit}
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </article>
  )
}

export const SubscriptionRevenueView: React.FC<Props> = ({ data, rangeDays, onRangeChange }) => {
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const aggregatedSeries = useMemo(() => {
    if (!data?.series) return []
    return aggregateSeries(data.series, granularity)
  }, [data?.series, granularity])

  if (!data) return <div className="pipeline-empty">載入訂閱與營運資料中…</div>

  const cards: Array<[string, number, string]> = [
    ['體驗中', data.current.trialing, 'trialing'],
    ['付費訂閱中', data.current.activePaid, 'active'],
    ['已排定取消', data.current.cancelScheduled, 'cancel_scheduled'],
    ['扣款異常', data.current.pastDue, 'past_due'],
    ['暫停', data.current.paused, 'paused'],
    ['已退訂', data.current.canceled, 'canceled'],
  ]

  const chartConfigs: ChartConfig[] = [
    {
      title: '付費訂閱數',
      field: 'activePaid',
      unit: '人',
      color: '#10b981',
      gradientId: 'grad-active-paid',
      summaryType: 'latest',
      description: '當前有效付費之學生訂閱人數',
    },
    {
      title: '體驗開始',
      field: 'trials',
      unit: '次',
      color: '#06b6d4',
      gradientId: 'grad-trials',
      summaryType: 'sum',
      description: '新家長註冊並開通首週體驗次數',
    },
    {
      title: '新增付費',
      field: 'newPaid',
      unit: '次',
      color: '#6366f1',
      gradientId: 'grad-new-paid',
      summaryType: 'sum',
      description: '體驗轉正或直接訂閱成功次數',
    },
    {
      title: '取消／流失',
      field: 'cancellations',
      unit: '次',
      color: '#f43f5e',
      gradientId: 'grad-cancellations',
      summaryType: 'sum',
      description: '取消排定或到期終止次數',
    },
    {
      title: '訂閱淨成長',
      field: 'netGrowth',
      unit: '人',
      color: '#14b8a6',
      gradientId: 'grad-net-growth',
      summaryType: 'sum',
      description: '新增付費扣除流失之淨變動',
    },
    {
      title: '體驗轉付費',
      field: 'conversionPercent',
      unit: '%',
      color: '#a855f7',
      gradientId: 'grad-conversion',
      isPercentage: true,
      summaryType: 'latest',
      description: '整體體驗家長轉換為付費之累積比率',
    },
  ]

  // Filtered subscriptions
  const filteredSubscriptions = data.subscriptions.filter((sub) => {
    if (statusFilter && sub.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = (sub.childPseudonym || '').toLowerCase().includes(q)
      const matchPlan = (sub.planCode || '').toLowerCase().includes(q)
      const matchStatus = (STATUS_LABELS[sub.status] || sub.status).toLowerCase().includes(q)
      if (!matchName && !matchPlan && !matchStatus) return false
    }
    return true
  })

  // Funnel calculations
  const subFunnelTrials = data.funnels.subscription.trialStarted || 0
  const subFunnelPaid = data.funnels.subscription.activatedAfterTrial || 0
  const subConversionRate = subFunnelTrials > 0 ? ((subFunnelPaid / subFunnelTrials) * 100).toFixed(1) : '0.0'

  const cancelFunnelScheduled = data.funnels.cancellation.cancelScheduled || 0
  const cancelFunnelCanceled = data.funnels.cancellation.canceled || 0
  const cancelFinalRate = cancelFunnelScheduled > 0 ? ((cancelFunnelCanceled / cancelFunnelScheduled) * 100).toFixed(1) : '0.0'

  return (
    <div className="subscription-page">
      <header className="section-heading">
        <div>
          <h2>訂閱與營收儀表板</h2>
          <p>即時狀態取自 subscriptions 資料庫；趨勢統計依生命週期事件精準彙整。</p>
        </div>

        <div className="subscription-controls-bar">
          {/* Period / Granularity Selector */}
          <div className="granularity-toggle-group" aria-label="時間彙整週期">
            <span className="control-label">彙整週期:</span>
            <div className="granularity-buttons">
              <button
                type="button"
                className={`granularity-btn ${granularity === 'day' ? 'active' : ''}`}
                onClick={() => setGranularity('day')}
              >
                日 (Day)
              </button>
              <button
                type="button"
                className={`granularity-btn ${granularity === 'week' ? 'active' : ''}`}
                onClick={() => setGranularity('week')}
              >
                週 (Week)
              </button>
              <button
                type="button"
                className={`granularity-btn ${granularity === 'month' ? 'active' : ''}`}
                onClick={() => setGranularity('month')}
              >
                月 (Month)
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="time-range-group">
            <span className="control-label">時間範圍:</span>
            <select
              value={rangeDays}
              onChange={(e) => onRangeChange(Number(e.target.value))}
              className="range-select"
              aria-label="選擇時間範圍"
            >
              <option value={7}>最近 7 天 (1 週)</option>
              <option value={14}>最近 14 天 (2 週)</option>
              <option value={30}>最近 30 天 (1 個月)</option>
              <option value={90}>最近 90 天 (1 季)</option>
              <option value={180}>最近 180 天 (半年)</option>
              <option value={365}>最近 365 天 (1 年)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Top 6 State Cards with Click-to-Filter */}
      <section className="subscription-state-grid" aria-label="訂閱狀態概覽">
        {cards.map(([label, value, statusCode]) => {
          const isSelected = statusFilter === statusCode
          return (
            <button
              type="button"
              className={`cockpit-card subscription-state-card ${isSelected ? 'active-filter' : ''}`}
              key={label}
              onClick={() => setStatusFilter(isSelected ? null : statusCode)}
              title={`點擊篩選 ${label} 名單`}
            >
              <div className="state-card-header">
                <span>{label}</span>
                {isSelected && <small className="filter-badge">已篩選</small>}
              </div>
              <strong>{value.toLocaleString('zh-TW')}</strong>
            </button>
          )
        })}
      </section>

      {!data.instrumentationStartedAt && (
        <div className="neutral-notice">尚無生命週期事件資料；系統不會以當前狀態虛構歷史事件曲線。</div>
      )}

      {data.instrumentationStartedAt && (
        <div className="instrumentation-bar">
          <span className="instrumentation-note">可觀測歷史起點：{formatDate(data.instrumentationStartedAt)}</span>
          <span className="granularity-indicator">
            當前視圖：以 <strong>{granularity === 'day' ? '日' : granularity === 'week' ? '週 (7 天)' : '月'}</strong> 為單位彙整
            （共 {aggregatedSeries.length} 個週期節點）
          </span>
        </div>
      )}

      {/* 6 Interactive Metric Charts Grid */}
      <section className="chart-grid" aria-label="關鍵指標趨勢圖表">
        {chartConfigs.map((cfg) => (
          <InteractiveMetricChart
            key={cfg.field}
            config={cfg}
            data={aggregatedSeries}
            granularity={granularity}
          />
        ))}
      </section>

      {/* Funnel Section with Enhanced Progress Bars */}
      <section className="funnel-grid">
        <div className="cockpit-card funnel-card">
          <div className="funnel-card-head">
            <h3>訂閱轉換漏斗 (Trial → Paid)</h3>
            <span className="funnel-rate-badge">{subConversionRate}% 轉換率</span>
          </div>
          {data.funnels.subscription.observable ? (
            <div className="funnel-body">
              <div className="funnel-steps">
                <div className="funnel-step">
                  <span>開始體驗</span>
                  <strong>{subFunnelTrials} 人</strong>
                </div>
                <div className="funnel-arrow">➔</div>
                <div className="funnel-step highlight">
                  <span>轉為付費訂閱</span>
                  <strong>{subFunnelPaid} 人</strong>
                </div>
              </div>
              <div className="funnel-progress-track">
                <div
                  className="funnel-progress-fill sub-fill"
                  style={{ width: `${Math.min(100, Math.max(subFunnelTrials > 0 ? (subFunnelPaid / subFunnelTrials) * 100 : 0, 4))}%` }}
                />
              </div>
              <p className="funnel-hint">
                由試用期結束後實際扣款成功之事件計算，排除測試帳號。
              </p>
            </div>
          ) : (
            <p className="funnel-empty">尚無可用的生命週期轉換事件。</p>
          )}
        </div>

        <div className="cockpit-card funnel-card">
          <div className="funnel-card-head">
            <h3>取消流失漏斗 (Cancel Scheduled → Final)</h3>
            <span className="funnel-rate-badge rose">{cancelFinalRate}% 流失率</span>
          </div>
          {data.funnels.cancellation.observable ? (
            <div className="funnel-body">
              <div className="funnel-steps">
                <div className="funnel-step">
                  <span>排定取消</span>
                  <strong>{cancelFunnelScheduled} 人</strong>
                </div>
                <div className="funnel-arrow">➔</div>
                <div className="funnel-step danger">
                  <span>已取消／到期</span>
                  <strong>{cancelFunnelCanceled} 人</strong>
                </div>
              </div>
              <div className="funnel-progress-track">
                <div
                  className="funnel-progress-fill cancel-fill"
                  style={{ width: `${Math.min(100, Math.max(cancelFunnelScheduled > 0 ? (cancelFunnelCanceled / cancelFunnelScheduled) * 100 : 0, 4))}%` }}
                />
              </div>
              <p className="funnel-hint">
                追蹤家長設定本期結束後取消至最終到期狀態之生命週期流向。
              </p>
            </div>
          ) : (
            <p className="funnel-empty">尚無可用的取消事件。</p>
          )}
        </div>
      </section>

      {/* Subscriptions Table with Filter & Search */}
      <section className="subscription-table-section">
        <div className="table-header-controls">
          <div className="table-header-left">
            <h3 className="section-title">目前訂閱名單</h3>
            <span className="table-count-badge">
              顯示 {filteredSubscriptions.length} / {data.subscriptions.length} 筆
            </span>
          </div>

          <div className="table-filter-group">
            {statusFilter && (
              <button
                type="button"
                className="clear-filter-btn"
                onClick={() => setStatusFilter(null)}
              >
                清除狀態篩選 ({STATUS_LABELS[statusFilter] ?? statusFilter}) ✕
              </button>
            )}
            <input
              type="text"
              placeholder="搜尋孩子代號 / 方案 / 狀態…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="table-search-input"
            />
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>孩子</th>
                <th>狀態</th>
                <th>方案</th>
                <th>價格</th>
                <th>開始日期</th>
                <th>續訂／本期結束</th>
                <th>取消狀態</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty-td">
                    {data.subscriptions.length === 0 ? '目前無任何訂閱紀錄' : '無符合篩選條件的訂閱項目'}
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <React.Fragment key={subscription.id}>
                    <tr
                      className="clickable-row"
                      onClick={() => setExpanded(expanded === subscription.id ? null : subscription.id)}
                      title="點擊展開/收合生命週期事件歷程"
                    >
                      <td>
                        <strong>{subscription.childPseudonym}</strong>
                      </td>
                      <td>
                        <span className={'status-pill ' + subscription.status}>
                          {STATUS_LABELS[subscription.status] ?? subscription.status}
                        </span>
                      </td>
                      <td>
                        <code>{subscription.planCode ?? '—'}</code>
                        {subscription.billingInterval ? ' / ' + subscription.billingInterval : ''}
                      </td>
                      <td>{money(subscription.priceTwd)}</td>
                      <td>{formatDate(subscription.startDate)}</td>
                      <td>{formatDate(subscription.currentPeriodEnd)}</td>
                      <td>
                        {subscription.cancelAtPeriodEnd ? (
                          <span className="cancel-pill">本期結束後取消</span>
                        ) : (
                          <span className="active-pill">正常續訂中</span>
                        )}
                      </td>
                    </tr>
                    {expanded === subscription.id && (
                      <tr className="expanded-row">
                        <td colSpan={7}>
                          <div className="subscription-timeline">
                            <h4 className="timeline-title">📜 生命週期事件軌跡 (最舊 ➔ 最新)</h4>
                            {subscription.events.length ? (
                              subscription.events.map((event) => (
                                <div key={event.id} className="timeline-event-row">
                                  <time>{formatDate(event.effectiveAt)}</time>
                                  <strong>{EVENT_LABELS[event.eventType] ?? event.eventType}</strong>
                                  <span className="event-source">來源: {event.source}</span>
                                  <code>{event.sourceEventId ?? '—'}</code>
                                </div>
                              ))
                            ) : (
                              <p className="timeline-empty">尚無記錄的生命週期事件。</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}