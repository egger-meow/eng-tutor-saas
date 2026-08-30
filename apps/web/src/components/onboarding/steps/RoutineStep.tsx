import { MAX_WEEKLY_MINUTES, MIN_WEEKLY_MINUTES } from '../../../lib/profile-form'
import type { OnboardingStepProps } from '../step-types'

const minutePresets = [
  { value: 60, label: '60 分鐘', hint: '輕量養成習慣' },
  { value: 90, label: '90 分鐘', hint: '推薦標準節奏' },
  { value: 120, label: '120 分鐘', hint: '充分深化練習' },
]

const goalPresets = [
  '建立自主閱讀習慣',
  '穩固國中核心單字與文法',
  '跟上學校進度與段考',
  '提升長文閱讀理解力',
]

export function RoutineStep({ draft, errors, update }: OnboardingStepProps) {
  function toggleGoal(goal: string) {
    const existing = draft.learningGoals || ''
    if (existing.includes(goal)) {
      const filtered = existing
        .split('、')
        .map((s) => s.trim())
        .filter((s) => s && s !== goal)
        .join('、')
      update({ learningGoals: filtered })
    } else {
      const parts = existing
        .split('、')
        .map((s) => s.trim())
        .filter(Boolean)
      update({ learningGoals: [...parts, goal].join('、') })
    }
  }

  const selectedGoals = new Set(
    (draft.learningGoals || '')
      .split('、')
      .map((s) => s.trim())
      .filter(Boolean)
  )

  return (
    <div className="onboarding-step-content">
      <div className="field-group">
        <span className="field-title">每週可安排的學習時間</span>
        <div className="minute-preset-grid">
          {minutePresets.map((preset) => {
            const isSelected = draft.weeklyMinutes === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                className={`minute-card ${isSelected ? 'selected' : ''}`}
                onClick={() => update({ weeklyMinutes: preset.value })}
              >
                <strong>{preset.label}</strong>
                <small>{preset.hint}</small>
              </button>
            )
          })}
        </div>
        <div className="minute-custom-row">
          <span>或自訂分鐘數：</span>
          <input
            type="number"
            min={MIN_WEEKLY_MINUTES}
            max={MAX_WEEKLY_MINUTES}
            value={draft.weeklyMinutes}
            onChange={(event) => update({ weeklyMinutes: Number(event.target.value) })}
            aria-invalid={Boolean(errors.weeklyMinutes)}
            style={{ width: '6rem' }}
          />
          <span>分鐘 / 週</span>
        </div>
        {errors.weeklyMinutes && <span className="field-error">{errors.weeklyMinutes}</span>}
      </div>

      <div className="field-group">
        <span className="field-title">
          這段時間最希望協助孩子改善什麼？ <small className="field-hint">（可點選或自訂）</small>
        </span>
        <div className="tags-container" aria-label="學習目標標籤">
          {goalPresets.map((goal) => {
            const isSelected = selectedGoals.has(goal)
            return (
              <button
                key={goal}
                type="button"
                className={`tag-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleGoal(goal)}
              >
                {isSelected ? '✓ ' : '+ '}
                {goal}
              </button>
            )
          })}
        </div>
        <textarea
          rows={3}
          maxLength={400}
          placeholder="例如：希望孩子能不怕長篇閱讀、多累積生活單字。如留白將自動採用標準學習推薦目標。"
          value={draft.learningGoals}
          onChange={(event) => update({ learningGoals: event.target.value })}
        />
      </div>

      <div className="onboarding-reassurance-card">
        <div className="reassurance-icon">✨</div>
        <div>
          <strong>建立完成後即可取得第一週免費教材</strong>
          <p>我們將根據您填寫的程度與興趣，為孩子專屬生成學習包。所有資料日後隨時可在後台調整更新。</p>
        </div>
      </div>
    </div>
  )
}
