import type { VocabularyItem, VocabularyStatus } from '../../../types/student-material'
import { useSpeechSynthesis } from '../../../hooks/use-speech-synthesis'

export interface VocabularyRendererProps {
  vocabulary?: VocabularyItem[]
}

function getStatusBadgeLabel(status?: VocabularyStatus): { label: string; className: string } | null {
  switch (status) {
    case 'new':
      return { label: '本週新單字', className: 'status-new' }
    case 'review':
      return { label: '複習單字', className: 'status-review' }
    case 'repeated-miss':
      return { label: '加強記憶', className: 'status-repeated-miss' }
    case 'extension':
      return { label: '延伸挑戰', className: 'status-extension' }
    default:
      return null
  }
}

export function VocabularyRenderer({ vocabulary }: VocabularyRendererProps) {
  const { isSupported, isSpeaking, currentText, speak, stop } = useSpeechSynthesis()

  if (!vocabulary || vocabulary.length === 0) return null

  return (
    <section id="chapter-vocabulary" className="paper-sheet" aria-labelledby="heading-vocabulary">
      <div className="paper-section-header">
        <span className="paper-section-step">Step 2 · 核心字彙</span>
        <h2 id="heading-vocabulary" className="paper-section-title">
          本週精選單字與例句
        </h2>
        <p className="paper-section-desc">
          點擊發音按鈕聆聽自然真人語音，掌握詞性、精準中文意涵與真實語境用法。
        </p>
      </div>

      <div className="vocab-grid">
        {vocabulary.map((item) => {
          const statusBadge = getStatusBadgeLabel(item.status)
          const meaning = item.meaningZh ?? item.definition ?? ''
          const exampleEn = item.exampleEn ?? item.example ?? ''
          const isItemSpeaking = isSpeaking && currentText === item.word

          return (
            <div key={item.id || item.word} className="vocab-card">
              <div className="vocab-header">
                <div className="vocab-word-row">
                  <span className="vocab-word">{item.word}</span>
                  {item.partOfSpeech && (
                    <span className="vocab-pos">[{item.partOfSpeech}]</span>
                  )}
                  {statusBadge && (
                    <span className={`vocab-status-badge ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  )}
                </div>

                {isSupported && (
                  <button
                    type="button"
                    className={`tts-button ${isItemSpeaking ? 'speaking' : ''}`}
                    title={isItemSpeaking ? '停止播放' : `聆聽 ${item.word} 發音`}
                    aria-label={`聆聽 ${item.word} 發音`}
                    onClick={() => {
                      if (isItemSpeaking) {
                        stop()
                      } else {
                        speak(item.word, 'en-US')
                      }
                    }}
                  >
                    🔊
                  </button>
                )}
              </div>

              {item.pronunciationHint && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                  /{item.pronunciationHint}/
                </div>
              )}

              <div className="vocab-meaning">{meaning}</div>

              {exampleEn && (
                <div className="vocab-example">
                  <div className="vocab-example-en">{exampleEn}</div>
                  {item.exampleZh && (
                    <div className="vocab-example-zh">{item.exampleZh}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
