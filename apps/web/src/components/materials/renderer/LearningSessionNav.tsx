import type { MaterialNavigationPosition } from '../../../lib/material-learning-navigation'

export interface LearningSessionNavProps {
  savedPosition: MaterialNavigationPosition | null
  hasConflict?: boolean
  saveError?: boolean
  onResume: (chapterId: string, questionId?: string | null) => void
  onDismiss: () => void
}

const CHAPTER_LABELS: Record<string, string> = {
  opening: '學習導讀',
  vocabulary: '核心字彙',
  reading: '主題閱讀',
  instruction: '文法焦點',
  practice: '課堂練習',
  selfcheck: '自我檢核',
  homework: '課後作業',
}

export function LearningSessionNav({
  savedPosition,
  hasConflict,
  saveError,
  onResume,
  onDismiss,
}: LearningSessionNavProps) {
  if (!savedPosition && !hasConflict && !saveError) return null

  const chapterLabel = savedPosition?.chapter_id
    ? CHAPTER_LABELS[savedPosition.chapter_id] ?? savedPosition.chapter_id
    : '上次位置'

  return (
    <div className="paper-session-nav-banner" role="region" aria-label="接續進度提示">
      {savedPosition && !hasConflict && (
        <div className="session-nav-content">
          <span className="session-nav-icon" aria-hidden="true">📍</span>
          <span className="session-nav-text">
            上次停在「<strong>{chapterLabel}</strong>」
            {savedPosition.question_id ? ` (題目 ${savedPosition.question_id})` : ''}
          </span>
          <div className="session-nav-actions">
            <button
              type="button"
              className="button button-primary"
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}
              onClick={() => onResume(savedPosition.chapter_id, savedPosition.question_id)}
            >
              接續上次位置
            </button>
            <button
              type="button"
              className="button button-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.5rem' }}
              onClick={onDismiss}
              aria-label="關閉提示"
            >
              略過
            </button>
          </div>
        </div>
      )}

      {hasConflict && (
        <div className="session-nav-conflict" role="status">
          <span>⚠️ 偵測到其他裝置上的新學習位置，已為您同步最新錨點。</span>
        </div>
      )}

      {saveError && (
        <div className="session-nav-error" role="status">
          <span>⚠️ 接續位置暫時未能同步至雲端，但不影響作答草稿。</span>
        </div>
      )}
    </div>
  )
}
