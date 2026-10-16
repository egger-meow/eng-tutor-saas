import { useState } from 'react'
import { trackSampleClick } from '../../lib/analytics'
import './InlineSampleChallenge.css'

export const SAMPLE_CHALLENGE = {
  title: '30 秒會考素養實戰挑戰',
  subtitle: '不用註冊、點選即測！體驗紙屬英文如何透過一題診斷孩子的解題盲點與下週學習調整：',
  noticeTag: 'Public Notice · 國中會考閱讀素養題型',
  passage:
    'City Library will host a "Coding & Storytelling" workshop this Saturday. Due to limited seats, only registered students who arrive 10 minutes early can enter the computer lab. Latecomers will not be admitted under any circumstances.',
  question: 'Q: According to the notice, which of the following is true?',
  options: [
    { key: 'A', text: 'Students can attend the workshop without registration.' },
    { key: 'B', text: 'Anyone arriving after the workshop starts cannot enter.' },
    { key: 'C', text: 'The workshop will take place on Sunday afternoon.' },
    { key: 'D', text: 'There are unlimited seats available in the computer lab.' },
  ],
  correctKey: 'B',
  correctFeedback: {
    badge: '🎉 答對了！精準命中會考核心素養',
    explanation:
      '會考關鍵破題點：這題考「同義改寫（Paraphrase）」。題目中的「Latecomers will not be admitted（遲到者概不入場）」同義轉換為選項 (B) 的「arriving after the workshop starts cannot enter」。這是歷屆會考每年必出的經典素養題型！',
  },
  incorrectFeedback: {
    badge: '💡 差一點！落入會考常見干擾選項陷阱',
    explanation:
      '小心陷阱！題目清楚標明「only registered students（必須預先報名）」且「Due to limited seats（名額有限）」，因此 (A) 與 (D) 均不符合。正確答案是 (B)。',
  },
  memoryNote:
    '🧠 在紙屬英文：如果孩子這題選了 (A) 或 (D)，系統會自動在下週第 2 週教材中安排「時間與條件限制」的閱讀微訓練，直到孩子徹底辨識干擾項，不把死角帶上考場！',
}

export function InlineSampleChallenge() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const handleSelect = (key: string) => {
    if (selectedKey !== null) return
    setSelectedKey(key)
    trackSampleClick('inline_challenge')
  }

  const handleReset = () => {
    setSelectedKey(null)
  }

  const isAnswered = selectedKey !== null
  const isCorrect = selectedKey === SAMPLE_CHALLENGE.correctKey
  const feedback = isCorrect ? SAMPLE_CHALLENGE.correctFeedback : SAMPLE_CHALLENGE.incorrectFeedback

  return (
    <article className="inline-challenge-card" aria-label="30秒會考素養實戰挑戰">
      <header className="inline-challenge-header">
        <span className="inline-challenge-badge">⚡ 會考素養現場試做</span>
        <span className="inline-challenge-time">⏱ 約 30 秒完成</span>
      </header>

      <h3 className="inline-challenge-title">{SAMPLE_CHALLENGE.title}</h3>
      <p className="inline-challenge-desc">{SAMPLE_CHALLENGE.subtitle}</p>

      {/* Reading passage */}
      <div className="inline-challenge-reading">
        <span className="inline-challenge-reading-tag">{SAMPLE_CHALLENGE.noticeTag}</span>
        <p className="inline-challenge-passage">{SAMPLE_CHALLENGE.passage}</p>
      </div>

      <p className="inline-challenge-question">{SAMPLE_CHALLENGE.question}</p>

      {/* 4 Options */}
      <div className="inline-challenge-options" role="radiogroup" aria-label="題目選項">
        {SAMPLE_CHALLENGE.options.map((option) => {
          const isSelected = selectedKey === option.key
          const isThisCorrect = option.key === SAMPLE_CHALLENGE.correctKey

          let btnClass = 'inline-challenge-option-btn'
          if (isAnswered) {
            if (isSelected) {
              btnClass += isCorrect ? ' selected-correct' : ' selected-incorrect'
            } else if (isThisCorrect) {
              btnClass += ' reveal-correct'
            }
          }

          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isAnswered}
              className={btnClass}
              onClick={() => handleSelect(option.key)}
            >
              <span className="inline-challenge-option-key">{option.key}</span>
              <span>{option.text}</span>
            </button>
          )
        })}
      </div>

      {/* Immediate feedback & Memory loop */}
      {isAnswered && (
        <div className={`inline-challenge-feedback ${isCorrect ? 'correct' : 'incorrect'}`} role="status">
          <div className="inline-challenge-feedback-badge">{feedback.badge}</div>
          <p className="inline-challenge-feedback-text">{feedback.explanation}</p>

          <div className="inline-challenge-memory-box">
            {SAMPLE_CHALLENGE.memoryNote}
          </div>

          <div className="inline-challenge-actions">
            <a href="#onboarding" className="button">
              立即為孩子免費製作專屬教材（目前 NT$0）→
            </a>
            <button type="button" className="button button-secondary" onClick={handleReset}>
              再挑戰一次 ↺
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
