import type { OnboardingStepProps } from '../step-types'

const textbookOptions = ['翰林', '康軒', '南一']

const popularInterestTags = [
  '動漫與漫畫',
  '排球少年 / 芙莉蓮',
  'Minecraft / 遊戲',
  '籃球 / 羽球運動',
  '科學科普 / 宇宙',
  '毛孩與動物',
  '音樂與樂器',
  '生活日常與美食',
]

export function SchoolStep({ draft, update }: OnboardingStepProps) {
  function toggleInterestTag(tag: string) {
    const existing = draft.favoriteStories || ''
    const lines = existing.split('\n').map((s) => s.trim()).filter(Boolean)
    const nextLines = lines.includes(tag) ? lines.filter((l) => l !== tag) : [...lines, tag]
    update({ favoriteStories: nextLines.join('\n') })
  }

  const selectedTags = new Set(
    (draft.favoriteStories || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  )

  return (
    <div className="onboarding-step-content">
      <div className="field-group">
        <span className="field-title">
          學校課本版本 <span className="optional">選填</span>
        </span>
        <div className="pill-selector">
          {textbookOptions.map((opt) => {
            const isSelected = draft.textbookVersion === opt
            return (
              <button
                key={opt}
                type="button"
                className={`pill-option ${isSelected ? 'selected' : ''}`}
                onClick={() => update({ textbookVersion: isSelected ? '' : opt })}
              >
                {opt}
              </button>
            )
          })}
        </div>
        <input
          placeholder="或填寫其他版本（例如：佳音、自編）"
          value={draft.textbookVersion}
          onChange={(event) => update({ textbookVersion: event.target.value })}
        />
      </div>

      <div className="field-group">
        <span className="field-title">
          孩子平常感興趣的主題 <small className="field-hint">（點選或直接輸入，讓教材更貼近孩子）</small>
        </span>
        <div className="tags-container" aria-label="熱門興趣標籤">
          {popularInterestTags.map((tag) => {
            const isSelected = selectedTags.has(tag)
            return (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleInterestTag(tag)}
              >
                {isSelected ? '✓ ' : '+ '}
                {tag}
              </button>
            )
          })}
        </div>
        <textarea
          rows={3}
          maxLength={600}
          placeholder="也可自由補充孩子喜歡的動漫、遊戲、運動或著迷的事物（例如：最近很迷 F1 賽車、正在學爵士鼓）"
          value={draft.favoriteStories}
          onChange={(event) => update({ favoriteStories: event.target.value })}
        />
      </div>

      <label className="field-group">
        <span className="field-title">
          不喜歡或希望避免的內容 <span className="optional">選填</span>
        </span>
        <input
          maxLength={300}
          placeholder="例如：避免恐怖內容、暫時不想讀昆蟲主題"
          value={draft.dislikedTopics}
          onChange={(event) => update({ dislikedTopics: event.target.value })}
        />
      </label>
    </div>
  )
}
