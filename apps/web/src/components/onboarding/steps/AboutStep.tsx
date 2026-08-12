import type { OnboardingStepProps } from '../step-types'

export function AboutStep({ draft, errors, update }: OnboardingStepProps) {
  return <>
    <label>孩子暱稱<input autoFocus maxLength={80} value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} aria-invalid={Boolean(errors.displayName)} />{errors.displayName && <span className="field-error">{errors.displayName}</span>}</label>
    <label>目前年級<select value={draft.grade} onChange={(event) => update({ grade: Number(event.target.value) })}><option value={7}>國中七年級</option><option value={8}>國中八年級</option><option value={9}>國中九年級</option></select></label>
  </>
}

