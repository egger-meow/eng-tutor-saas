import { MAX_WEEKLY_MINUTES, MIN_WEEKLY_MINUTES } from '../../../lib/profile-form'
import type { OnboardingStepProps } from '../step-types'

export function RoutineStep({ draft, errors, update }: OnboardingStepProps) {
  return <>
    <label>每週可安排多少分鐘<input type="number" min={MIN_WEEKLY_MINUTES} max={MAX_WEEKLY_MINUTES} value={draft.weeklyMinutes} onChange={(event) => update({ weeklyMinutes: Number(event.target.value) })} aria-invalid={Boolean(errors.weeklyMinutes)} />{errors.weeklyMinutes && <span className="field-error">{errors.weeklyMinutes}</span>}</label>
    <label>比較實際的練習方式 <span className="optional">選填</span><select value={draft.sessionPreference} onChange={(event) => update({ sessionPreference: event.target.value })}><option value="">還不確定</option><option value="short-daily">每天 15–20 分鐘</option><option value="three-sessions">每週三次</option><option value="weekend">週末集中完成</option><option value="flexible">彈性安排</option></select></label>
  </>
}

