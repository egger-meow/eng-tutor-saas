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

const goalPresetSet = new Set(goalPresets)

export function RoutineStep({ draft, errors, update }: OnboardingStepProps) {
  const goalParts = (draft.learningGoals || '')
    .split('、')
    .map((part) => part.trim())
    .filter(Boolean)
  const selectedGoals = goalPresets.filter((goal) => goalParts.includes(goal))
  const customGoals = goalParts.filter((part) => !goalPresetSet.has(part)).join('、')
  const usesCustomMinutes = !minutePresets.some((preset) => preset.value === draft.weeklyMinutes)

  function writeGoals(nextSelectedGoals: string[], nextCustomGoals = customGoals) {
    update({
      learningGoals: [...nextSelectedGoals, nextCustomGoals.trim()].filter(Boolean).join('、'),
    })
  }

  function toggleGoal(goal: string) {
    writeGoals(
      selectedGoals.includes(goal)
        ? selectedGoals.filter((item) => item !== goal)
        : [...selectedGoals, goal],
    )
  }

  return (
    <div className="onboarding-step-content">
      <div className="field-group">
        <span className="field-title">每週大概能安排多少英文時間？</span>
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
        <details className="onboarding-optional-details compact" open={usesCustomMinutes}>
          <summary>想自訂其他分鐘數 <span>選填</span></summary>
          <div className="optional-details-body minute-custom-row">
            <input
              type="number"
              min={MIN_WEEKLY_MINUTES}
              max={MAX_WEEKLY_MINUTES}
              value={draft.weeklyMinutes}
              onChange={(event) => update({ weeklyMinutes: Number(event.target.value) })}
              aria-invalid={Boolean(errors.weeklyMinutes)}
            />
            <span>分鐘 / 週</span>
          </div>
        </details>
        {errors.weeklyMinutes && <span className="field-error">{errors.weeklyMinutes}</span>}
      </div>

      <div className="field-group">
        <span className="field-title">這段時間最希望孩子進步什麼？</span>
        <p className="field-support-copy">選 1–2 個就好。不確定也可以留白，我們會先採用標準學習目標。</p>
        <div className="goal-card-grid" aria-label="學習目標">
          {goalPresets.map((goal) => {
            const isSelected = selectedGoals.includes(goal)
            return (
              <button
                key={goal}
                type="button"
                className={`goal-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleGoal(goal)}
                aria-pressed={isSelected}
              >
                <span>{isSelected ? '✓' : '+'}</span>
                {goal}
              </button>
            )
          })}
        </div>
        <details className="onboarding-optional-details" open={Boolean(customGoals)}>
          <summary>還有其他希望，也可以補充 <span>選填</span></summary>
          <div className="optional-details-body">
            <textarea
              rows={3}
              maxLength={400}
              placeholder="例如：希望孩子比較不怕長篇閱讀，或多累積生活單字"
              value={customGoals}
              onChange={(event) => writeGoals(selectedGoals, event.target.value)}
            />
          </div>
        </details>
      </div>

      <p className="onboarding-finish-note">這只是第一週的起點，之後會依每週回饋繼續調整。</p>
    </div>
  )
}
