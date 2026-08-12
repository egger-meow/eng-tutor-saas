import type { OnboardingStepProps } from '../step-types'

export function SchoolStep({ draft, update }: OnboardingStepProps) {
  return <>
    <label>課本版本 <span className="optional">選填</span><input value={draft.textbookVersion} onChange={(event) => update({ textbookVersion: event.target.value })} placeholder="例如：翰林" /></label>
    <label>目前單元或進度 <span className="optional">選填</span><input value={draft.currentChapter} onChange={(event) => update({ currentChapter: event.target.value })} placeholder="例如：Lesson 3" /></label>
    <label>近期考試 <span className="optional">選填</span><input value={draft.upcomingTest} onChange={(event) => update({ upcomingTest: event.target.value })} placeholder="例如：9/15 第一次段考" /></label>
  </>
}

