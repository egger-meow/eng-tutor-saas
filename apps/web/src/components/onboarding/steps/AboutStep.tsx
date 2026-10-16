import type { KeyboardEvent } from 'react'
import type { OnboardingStepProps } from '../step-types'
import { levels } from '../step-types'

const gradeStages = [
  { value: 'incoming_grade_7', label: '即將升國一' },
  { value: 'grade_7', label: '國一' },
  { value: 'grade_8', label: '國二' },
  { value: 'grade_9', label: '國三' },
] as const

export const POPULAR_INTEREST_CHIPS = [
  '🏀 籃球與運動',
  '🎮 電玩與遊戲',
  '🎬 動漫與故事',
  '🐾 動物與自然',
  '🚀 太空與科學',
  '🎵 音樂與流行',
  '🍰 美食與生活',
] as const

export function AboutStep({ draft, errors, update, onAutoAdvance, showExpressInterests = false }: OnboardingStepProps) {
  function selectGradeStage(gradeStage: typeof draft.gradeStage) {
    update({
      gradeStage,
      grade: gradeStage === 'incoming_grade_7' ? 7 : Number(gradeStage.slice(-1)),
    })
  }

  function selectBaselineLevel(levelValue: string) {
    update({ baselineLevel: levelValue })
  }

  function selectWithArrow(event: KeyboardEvent<HTMLDivElement>, select: (index: number) => void) {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    if (index < 0) return
    const offset = {ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1}[event.key]
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (offset ?? 0) + buttons.length) % buttons.length
    buttons[next]?.focus()
    select(next)
  }

  function handleNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (draft.displayName.trim().length > 0 && draft.baselineLevel && onAutoAdvance) {
        onAutoAdvance()
      }
    }
  }

  return (
    <div className="onboarding-step-content">
      <label className="field-group">
        <span className="field-title">孩子怎麼稱呼？ <small className="field-hint">小名或英文名就可以</small></span>
        <input
          maxLength={80}
          placeholder="例如：翔翔、Emma"
          value={draft.displayName}
          onChange={(event) => update({ displayName: event.target.value })}
          onKeyDown={handleNameKeyDown}
          aria-invalid={Boolean(errors.displayName)}
        />
        {errors.displayName && <span className="field-error">{errors.displayName}</span>}
      </label>

      <div className="field-group">
        <span className="field-title">目前就學階段</span>
        <div className="pill-selector onboarding-grade-grid" role="radiogroup" aria-label="目前就學階段" onKeyDown={(event) => selectWithArrow(event, index => selectGradeStage(gradeStages[index]!.value))}>
          {gradeStages.map((stage) => {
            const isSelected = draft.gradeStage === stage.value
            return (
              <button
                key={stage.value}
                type="button"
                className={`pill-option ${isSelected ? 'selected' : ''}`}
                onClick={() => selectGradeStage(stage.value)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
              >
                {stage.label}
              </button>
            )
          })}
        </div>
        {errors.grade && <span className="field-error">{errors.grade}</span>}
      </div>

      <div className="field-group">
        <span className="field-title">孩子目前的英文，大概在哪裡？ <small className="field-hint">憑印象選即可，不用先考試</small></span>
        <div className="level-card-grid" role="radiogroup" aria-label="整體英文程度" onKeyDown={(event) => selectWithArrow(event, index => selectBaselineLevel(levels[index]!.value))}>
          {levels.map((lvl) => {
            const isSelected = draft.baselineLevel === lvl.value
            return (
              <button
                key={lvl.value}
                type="button"
                className={`level-card-option ${isSelected ? 'selected' : ''}`}
                onClick={() => selectBaselineLevel(lvl.value)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (!draft.baselineLevel && lvl === levels[0]) ? 0 : -1}
              >
                <strong className="level-label">{lvl.label}</strong>
              </button>
            )
          })}
        </div>
        {errors.baselineLevel && <span className="field-error">{errors.baselineLevel}</span>}
      </div>

      {showExpressInterests && (
        <>
          <div className="field-group express-interest-group" style={{ marginTop: 'var(--space-4)' }}>
            <span className="field-title">
              孩子最近最喜歡什麼？ <small className="field-hint">點選 1~3 項熱門主題，教材將圍繞孩子興趣編寫</small>
            </span>
            <div className="interest-chips-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
              {POPULAR_INTEREST_CHIPS.map((chip) => {
                const isSelected = (draft.interests || []).includes(chip)
                return (
                  <button
                    key={chip}
                    type="button"
                    className={`pill-option ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const current = draft.interests || []
                      const nextInterests = isSelected
                        ? current.filter((item) => item !== chip)
                        : [...current, chip]
                      update({
                        interests: nextInterests,
                        favoriteStories: nextInterests.join('、'),
                      })
                    }}
                    aria-pressed={isSelected}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
            <input
              type="text"
              placeholder="或者補充孩子的具體喜好（例如：NBA 勇士隊、寶可夢、排球少年）"
              value={draft.favoriteStories || ''}
              onChange={(e) => {
                const text = e.target.value
                update({
                  favoriteStories: text,
                  interests: text ? [text] : [],
                })
              }}
              style={{ marginTop: '6px' }}
            />
          </div>

          <details className="landing-express-advanced" style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 500, padding: '4px 0' }}>
              ⚙️ 選填：指定學校課本版本或調整每週時間（預設 90 分鐘）
            </summary>
            <div style={{ padding: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>學校版本（選填）：</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {['康軒', '翰林', '南一'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill-option ${draft.textbookVersion === v ? 'selected' : ''}`}
                      onClick={() => update({ textbookVersion: draft.textbookVersion === v ? '' : v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>每週學習時間：</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {[60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`pill-option ${draft.weeklyMinutes === mins ? 'selected' : ''}`}
                      onClick={() => update({ weeklyMinutes: mins })}
                    >
                      {mins} 分鐘
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
