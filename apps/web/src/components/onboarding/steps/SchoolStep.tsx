import { useRef } from 'react'
import type { OnboardingStepProps } from '../step-types'

const textbookOptions = ['翰林', '康軒', '南一']

const interestCategories = [
  '動漫與漫畫',
  '遊戲',
  '運動',
  '科學與科技',
  '動物與自然',
  '音樂與影視',
  '生活／美食／旅行',
] as const

export function SchoolStep({ draft, update }: OnboardingStepProps) {
  const interestTextareaRef = useRef<HTMLTextAreaElement>(null)
  const interestLines = (draft.favoriteStories || '').split('\n').map((line) => line.trim()).filter(Boolean)

  function addInterestCategory(category: string) {
    const prefix = `${category}：`
    const alreadyPrefixed = interestLines.some((line) => line.startsWith(prefix))
    let nextLines = interestLines

    if (!alreadyPrefixed) {
      const exactIndex = interestLines.findIndex((line) => line === category)
      nextLines = exactIndex >= 0
        ? interestLines.map((line, index) => index === exactIndex ? prefix : line)
        : [...interestLines, prefix]
    }

    update({
      interests: Array.from(new Set([...(draft.interests || []), category])),
      favoriteStories: nextLines.join('\n'),
    })
    interestTextareaRef.current?.focus()
  }

  const otherTextbookVersion = textbookOptions.includes(draft.textbookVersion) ? '' : draft.textbookVersion

  return (
    <div className="onboarding-step-content">
      <div className="field-group interest-field-group">
        <span className="field-title">孩子最近真的喜歡什麼？</span>
        <p className="field-support-copy">
          先選大類，再補上孩子真正喜歡的作品、遊戲、球隊或事物。分類只是幫你起頭，不會替孩子猜答案。
        </p>
        <div className="interest-category-grid" aria-label="興趣大類">
          {interestCategories.map((category) => {
            const prefix = `${category}：`
            const isSelected = (draft.interests || []).includes(category)
              || interestLines.some((line) => line === category || line.startsWith(prefix))
            return (
              <button
                key={category}
                type="button"
                className={`interest-category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => addInterestCategory(category)}
                aria-pressed={isSelected}
              >
                <span>{isSelected ? '✓' : '+'}</span>
                {category}
              </button>
            )
          })}
        </div>
        <small className="interest-category-hint">先選大類，點一下會在下方加上分類開頭，再直接補具體內容。</small>
        <textarea
          ref={interestTextareaRef}
          rows={5}
          maxLength={600}
          placeholder={'例如：\n動漫與漫畫：葬送的芙莉蓮、排球少年\n遊戲：Minecraft\n運動：F1、NBA'}
          value={draft.favoriteStories}
          onChange={(event) => update({ favoriteStories: event.target.value })}
        />
      </div>

      <details className="onboarding-optional-details" open={Boolean(otherTextbookVersion)}>
        <summary>學校課本版本 <span>選填</span></summary>
        <div className="optional-details-body">
          <p>知道版本就點一下，不確定也可以跳過。</p>
          <div className="pill-selector onboarding-textbook-grid">
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
            placeholder="其他版本（例如：佳音、自編）"
            value={otherTextbookVersion}
            onChange={(event) => update({ textbookVersion: event.target.value })}
          />
        </div>
      </details>

      <details className="onboarding-optional-details" open={Boolean(draft.dislikedTopics)}>
        <summary>有想避開的內容再填 <span>選填</span></summary>
        <div className="optional-details-body">
          <input
            maxLength={300}
            placeholder="例如：避免恐怖內容、暫時不想讀昆蟲主題"
            value={draft.dislikedTopics}
            onChange={(event) => update({ dislikedTopics: event.target.value })}
          />
        </div>
      </details>
    </div>
  )
}
