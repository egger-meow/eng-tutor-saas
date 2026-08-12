import type { OnboardingStepProps } from '../step-types'

const suggestions = ['動物', '運動', '遊戲', '科技', '音樂', '故事', '旅行', '自然']

export function InterestsStep({ draft, update }: OnboardingStepProps) {
  function toggle(interest: string) {
    update({ interests: draft.interests.includes(interest) ? draft.interests.filter((item) => item !== interest) : [...draft.interests, interest] })
  }
  return <>
    <fieldset><legend>孩子有興趣的主題 <span className="optional">選填，可複選</span></legend><div className="chip-group">{suggestions.map((interest) => <button key={interest} className={`choice-chip ${draft.interests.includes(interest) ? 'selected' : ''}`} type="button" aria-pressed={draft.interests.includes(interest)} onClick={() => toggle(interest)}>{interest}</button>)}</div></fieldset>
    <label>不喜歡或希望避免的主題 <span className="optional">選填</span><textarea value={draft.dislikedTopics} onChange={(event) => update({ dislikedTopics: event.target.value })} /></label>
  </>
}

