import { useState, useEffect } from 'react'
import { handleInternalLink } from '../../app/use-route'
import { getSupabaseClient } from '../../lib/supabase'
import type {
  LearningBarrier,
  MaterialLearningCheckin,
} from '../../lib/material-learning-checkin'
import {
  fetchMaterialLearningCheckin,
  saveMaterialLearningCheckin,
  isCheckinDismissed,
} from '../../lib/material-learning-checkin'

export interface LearningBarrierCardProps {
  materialId: string
  childId: string
  releasedAt: string
  hasAnswerStarted?: boolean
  hasSubmission?: boolean
  hasPaperStarted?: boolean
  answerUnlockRequiresSubmission?: boolean
  initialCheckin?: MaterialLearningCheckin | null
  onDismiss?: () => void
  onPaperStarted?: () => void
}

const BARRIER_SOLUTIONS: Record<
  LearningBarrier,
  { label: string; tip: string; actionText?: string; actionHref?: string }
> = {
  no_time: {
    label: '時間不夠',
    tip: '不用一次做完整份。今天先安排約 10 分鐘，讀一段、試兩題即可。',
    actionText: '開始 10 分鐘',
  },
  cannot_print: {
    label: '不方便列印',
    tip: '網頁版支援直接閱讀與作答，也能在手機或平板上開啟，不需要列印。',
    actionText: '線上直接開始',
  },
  too_hard: {
    label: '內容偏難',
    tip: '可以先使用「朗讀」輔助理解；若持續偏難，可在孩子檔案中調降程度。',
    actionText: '調整孩子程度',
  },
  child_not_interested: {
    label: '孩子沒興趣',
    tip: '可在孩子檔案中更新目前熱衷的主題與興趣，下一份會重新搭配。',
    actionText: '更新興趣主題',
  },
  missed_email: {
    label: '沒收到通知信',
    tip: '教材在網站上隨時可用，點擊下方即可直接開啟。',
    actionText: '開啟本週教材',
  },
}

export function LearningBarrierCard({
  materialId,
  childId,
  releasedAt,
  hasAnswerStarted = false,
  hasSubmission = false,
  hasPaperStarted = false,
  answerUnlockRequiresSubmission = true,
  initialCheckin,
  onDismiss,
  onPaperStarted,
}: LearningBarrierCardProps) {
  const [, setCheckin] = useState<MaterialLearningCheckin | null>(
    initialCheckin ?? null
  )
  const [loading, setLoading] = useState(initialCheckin === undefined)
  const [selectedBarrier, setSelectedBarrier] = useState<LearningBarrier | null>(
    initialCheckin?.barrier ?? null
  )
  const [isPaperReported, setIsPaperReported] = useState(
    hasPaperStarted || Boolean(initialCheckin?.paper_started_at)
  )
  const [dismissed, setDismissed] = useState(isCheckinDismissed(initialCheckin ?? null))
  const [saving, setSaving] = useState(false)

  // Released older than 48 hours check
  const isOlderThan48h = (() => {
    try {
      const releaseTime = new Date(releasedAt).getTime()
      if (isNaN(releaseTime)) return false
      return Date.now() - releaseTime >= 48 * 3600 * 1000
    } catch {
      return false
    }
  })()

  useEffect(() => {
    if (initialCheckin !== undefined) {
      setCheckin(initialCheckin)
      setSelectedBarrier(initialCheckin?.barrier ?? null)
      setIsPaperReported(hasPaperStarted || Boolean(initialCheckin?.paper_started_at))
      setDismissed(isCheckinDismissed(initialCheckin))
      setLoading(false)
      return
    }

    let active = true
    const client = getSupabaseClient()
    fetchMaterialLearningCheckin(client, materialId)
      .then((res) => {
        if (!active) return
        setCheckin(res)
        setSelectedBarrier(res?.barrier ?? null)
        setIsPaperReported(hasPaperStarted || Boolean(res?.paper_started_at))
        setDismissed(isCheckinDismissed(res))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [materialId, initialCheckin, hasPaperStarted])

  // Don't show if already submitted, started online, reported paper, dismissed, or < 48 hours
  if (
    loading ||
    hasSubmission ||
    hasAnswerStarted ||
    isPaperReported ||
    dismissed ||
    !isOlderThan48h
  ) {
    return null
  }

  async function handleSelectBarrier(barrier: LearningBarrier) {
    setSelectedBarrier(barrier)
    setSaving(true)
    try {
      const client = getSupabaseClient()
      const updated = await saveMaterialLearningCheckin(client, materialId, 'barrier', barrier)
      if (updated) setCheckin(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handlePaperStarted() {
    setSaving(true)
    try {
      const client = getSupabaseClient()
      const updated = await saveMaterialLearningCheckin(client, materialId, 'paper_started')
      if (updated) {
        setCheckin(updated)
        setIsPaperReported(true)
      }
      onPaperStarted?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleDismiss() {
    setSaving(true)
    try {
      const client = getSupabaseClient()
      const updated = await saveMaterialLearningCheckin(client, materialId, 'dismiss')
      if (updated) {
        setCheckin(updated)
        setDismissed(true)
      }
      onDismiss?.()
    } finally {
      setSaving(false)
    }
  }

  const solution = selectedBarrier ? BARRIER_SOLUTIONS[selectedBarrier] : null
  const actionHref =
    selectedBarrier === 'too_hard' || selectedBarrier === 'child_not_interested'
      ? `/children/${childId}/edit`
      : `/materials/${materialId}`

  return (
    <section className="learning-barrier-card" aria-label="學習啟動協助">
      <div className="barrier-card-header">
        <h4 className="barrier-card-title">這份教材在開始上有遇到困難嗎？</h4>
        <button
          type="button"
          className="button-link text-link barrier-dismiss-btn"
          disabled={saving}
          onClick={() => void handleDismiss()}
        >
          暫時略過（7日內不提醒）
        </button>
      </div>

      <p className="barrier-intro-text muted">
        若還沒開始，請選擇目前遇到的狀況，我們提供最快減輕負擔的建議：
      </p>

      <div className="barrier-chips-group" role="group" aria-label="阻礙原因選擇">
        {(Object.keys(BARRIER_SOLUTIONS) as LearningBarrier[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`barrier-chip ${selectedBarrier === key ? 'is-selected' : ''}`}
            disabled={saving}
            onClick={() => void handleSelectBarrier(key)}
          >
            {BARRIER_SOLUTIONS[key].label}
          </button>
        ))}

        {!answerUnlockRequiresSubmission && (
          <button
            type="button"
            className="barrier-chip chip-paper"
            disabled={saving}
            onClick={() => void handlePaperStarted()}
          >
            ✓ 已用紙筆開始
          </button>
        )}
      </div>

      {solution && (
        <div className="barrier-solution-box" role="status">
          <p className="solution-tip">💡 {solution.tip}</p>
          <div className="solution-action">
            <a
              href={actionHref}
              onClick={handleInternalLink}
              className="button button-primary button-sm"
            >
              {solution.actionText ?? '前往處理'}
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
