import type { OnboardingStepProps } from '../step-types'

export function AboutStep({ draft, errors, update }: OnboardingStepProps) {
  function selectGradeStage(gradeStage: typeof draft.gradeStage) {
    update({ gradeStage, grade: gradeStage === 'incoming_grade_7' ? 7 : Number(gradeStage.slice(-1)) })
  }
  return <>
    <label>孩子暱稱<input autoFocus maxLength={80} value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} aria-invalid={Boolean(errors.displayName)} />{errors.displayName && <span className="field-error">{errors.displayName}</span>}</label>
    <label>目前就學階段<select value={draft.gradeStage} onChange={(event) => selectGradeStage(event.target.value as typeof draft.gradeStage)}><option value="incoming_grade_7">即將升國一</option><option value="grade_7">國中七年級</option><option value="grade_8">國中八年級</option><option value="grade_9">國中九年級</option></select>{errors.grade && <span className="field-error">{errors.grade}</span>}</label>
  </>
}
