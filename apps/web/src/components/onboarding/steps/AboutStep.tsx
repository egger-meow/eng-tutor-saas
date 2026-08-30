import type { OnboardingStepProps } from '../step-types'
import { levels } from '../step-types'

const gradeStages = [
  { value: 'incoming_grade_7', label: '即將升國一' },
  { value: 'grade_7', label: '國中七年級' },
  { value: 'grade_8', label: '國中八年級' },
  { value: 'grade_9', label: '國中九年級' },
] as const

export function AboutStep({ draft, errors, update }: OnboardingStepProps) {
  function selectGradeStage(gradeStage: typeof draft.gradeStage) {
    update({
      gradeStage,
      grade: gradeStage === 'incoming_grade_7' ? 7 : Number(gradeStage.slice(-1)),
    })
  }

  return (
    <div className="onboarding-step-content">
      <label className="field-group">
        <span className="field-title">孩子暱稱 <small className="field-hint">（小名或英文名）</small></span>
        <input
          autoFocus
          maxLength={80}
          placeholder="例如：Jonathan、翔翔、Emma"
          value={draft.displayName}
          onChange={(event) => update({ displayName: event.target.value })}
          aria-invalid={Boolean(errors.displayName)}
        />
        {errors.displayName && <span className="field-error">{errors.displayName}</span>}
      </label>

      <div className="field-group">
        <span className="field-title">目前就學階段</span>
        <div className="pill-selector" role="radiogroup" aria-label="目前就學階段">
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
              >
                {stage.label}
              </button>
            )
          })}
        </div>
        {errors.grade && <span className="field-error">{errors.grade}</span>}
      </div>

      <div className="field-group">
        <span className="field-title">整體英文程度概況 <small className="field-hint">（大概即可，不需要先考試）</small></span>
        <div className="level-card-grid" role="radiogroup" aria-label="整體英文程度">
          {levels.map((lvl) => {
            const isSelected = draft.baselineLevel === lvl.value
            return (
              <button
                key={lvl.value}
                type="button"
                className={`level-card-option ${isSelected ? 'selected' : ''}`}
                onClick={() => update({ baselineLevel: lvl.value })}
                role="radio"
                aria-checked={isSelected}
              >
                <strong className="level-label">{lvl.label}</strong>
              </button>
            )
          })}
        </div>
        {errors.baselineLevel && <span className="field-error">{errors.baselineLevel}</span>}
      </div>
    </div>
  )
}
