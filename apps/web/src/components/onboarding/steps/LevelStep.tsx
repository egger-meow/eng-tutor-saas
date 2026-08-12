import type { OnboardingStepProps } from '../step-types'
import { levels } from '../step-types'

function LevelField({ label, value, required, error, onChange }: { label: string; value: string; required?: boolean; error?: string; onChange: (value: string) => void }) {
  return (
    <label className="field-card">
      <span className="field-label-header">
        <span className="field-title">{label}</span>
        {!required && <span className="optional">選填</span>}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)}>
        <option value="">請選擇</option>
        {levels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
      </select>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function LevelStep({ draft, errors, update }: OnboardingStepProps) {
  return (
    <div className="field-grid">
      <LevelField label="整體英文程度" required value={draft.baselineLevel} error={errors.baselineLevel} onChange={(baselineLevel) => update({ baselineLevel })} />
      <LevelField label="閱讀" value={draft.readingLevel} onChange={(readingLevel) => update({ readingLevel })} />
      <LevelField label="單字" value={draft.vocabularyLevel} onChange={(vocabularyLevel) => update({ vocabularyLevel })} />
      <LevelField label="文法" value={draft.grammarLevel} onChange={(grammarLevel) => update({ grammarLevel })} />
    </div>
  )
}


