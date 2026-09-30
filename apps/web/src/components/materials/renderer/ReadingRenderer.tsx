import type {
  ReadingSection,
  AdaptiveExtension,
  ReadingGenre,
} from '../../../types/student-material'
import { useSpeechSynthesis } from '../../../hooks/use-speech-synthesis'

export interface ReadingRendererProps {
  reading?: ReadingSection
  adaptiveExtension?: AdaptiveExtension | null
  draftAnswers: Record<string, string>
  onAnswerChange: (key: string, value: string) => void
}

function getGenreLabel(genre?: ReadingGenre): string {
  switch (genre) {
    case 'article':
      return '專題文章'
    case 'narrative':
      return '故事記敘'
    case 'dialogue':
      return '情境對話'
    case 'notice':
      return '公告啟事'
    case 'schedule':
      return '時間行程'
    case 'instructions':
      return '操作指引'
    case 'mini-report':
      return '微型研究報告'
    default:
      return '精選文章'
  }
}

function getAdaptivePurposeLabel(purpose: string): string {
  switch (purpose) {
    case 'strategy':
      return '閱讀策略'
    case 'reasoning':
      return '推論思考'
    case 'pronunciation':
      return '發音探索'
    case 'real-world-application':
      return '生活實務應用'
    case 'creative-depth':
      return '創意延伸'
    default:
      return '深度延伸'
  }
}

export function ReadingRenderer({
  reading,
  adaptiveExtension,
  draftAnswers,
  onAnswerChange,
}: ReadingRendererProps) {
  const readOnly = useAnswerReadOnly()
  const { isSupported, isSpeaking, currentText, speak, stop } = useSpeechSynthesis()

  if (!reading) return null

  const title = reading.title ?? '閱讀精選'
  const genreLabel = getGenreLabel(reading.genre)
  const isExtensionAfterReading = adaptiveExtension && adaptiveExtension.placement === 'after-reading'

  // Extract all english text for speech readout
  const allEnglishText = reading.blocks
    ? reading.blocks
        .map((b) => (b.type === 'paragraph' ? b.text : b.type === 'dialogue' ? `${b.speaker}: ${b.text}` : ''))
        .filter(Boolean)
        .join(' ')
    : reading.passage ?? ''

  const isReadingSpeaking = isSpeaking && currentText === allEnglishText

  return (
    <section id="chapter-reading" className="paper-sheet" aria-labelledby="heading-reading">
      <div className="paper-section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="paper-section-step">Step 3 · 主題閱讀</span>
            <h2 id="heading-reading" className="paper-section-title">
              {title}
            </h2>
          </div>
          {isSupported && allEnglishText && (
            <button
              type="button"
              className={`tts-button ${isReadingSpeaking ? 'speaking' : ''}`}
              title={isReadingSpeaking ? '停止朗讀' : '朗讀整篇文章'}
              aria-label="朗讀整篇文章"
              onClick={() => {
                if (isReadingSpeaking) {
                  stop()
                } else {
                  speak(allEnglishText, 'en-US')
                }
              }}
            >
              🔊
            </button>
          )}
        </div>

        <div className="reading-meta-box">
          <span className="vocab-status-badge status-extension">{genreLabel}</span>
          {reading.wordCount && <span>約 {reading.wordCount} 字</span>}
          {reading.contextZh && <span>· {reading.contextZh}</span>}
        </div>
      </div>

      {reading.readingTipsZh && reading.readingTipsZh.length > 0 && (
        <div className="reading-tips-card">
          <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-action)' }}>
            💡 閱讀策略小提示
          </strong>
          {reading.readingTipsZh.map((tip, idx) => (
            <p key={idx} style={{ margin: '0.2rem 0' }}>
              • {tip}
            </p>
          ))}
        </div>
      )}

      {/* Reading Body */}
      <div className="reading-passage-body">
        {reading.blocks && reading.blocks.length > 0 ? (
          reading.blocks.map((block, index) => {
            if (block.type === 'paragraph') {
              return (
                <p key={index} className="reading-paragraph">
                  {block.text}
                </p>
              )
            }
            if (block.type === 'dialogue') {
              return (
                <div key={index} className="reading-dialogue-row">
                  <span className="reading-speaker-tag">{block.speaker}</span>
                  <div style={{ flex: 1, lineHeight: 1.7 }}>{block.text}</div>
                </div>
              )
            }
            if (block.type === 'notice') {
              return (
                <div key={index} className="reading-notice-box">
                  {block.heading && <h5>📌 {block.heading}</h5>}
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{block.text}</div>
                </div>
              )
            }
            if (block.type === 'schedule-row') {
              return (
                <div key={index} style={{ padding: '0.5rem', background: 'var(--color-paper-deep)', borderRadius: '4px' }}>
                  <strong>{block.timeOrStep}</strong>: {block.event}
                  {block.detail && <span style={{ color: 'var(--color-muted)' }}> ({block.detail})</span>}
                </div>
              )
            }
            return null
          })
        ) : reading.passage ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.85 }}>
            {reading.passage}
          </div>
        ) : null}
      </div>

      {reading.sourceNote && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', fontStyle: 'italic', textAlign: 'right' }}>
          來源與背景：{reading.sourceNote}
        </div>
      )}

      {/* Adaptive Extension (Placement: after-reading) */}
      {isExtensionAfterReading && adaptiveExtension && (
        <div className="adaptive-extension-card">
          <div className="adaptive-extension-header">
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-ink)' }}>
              🌟 {adaptiveExtension.titleZh}
            </h4>
            <span className="adaptive-badge">
              {getAdaptivePurposeLabel(adaptiveExtension.purpose)}
            </span>
          </div>

          <div style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
            {adaptiveExtension.contentZh}
          </div>

          {adaptiveExtension.taskZh && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-action)', marginBottom: 'var(--space-2)' }}>
                ✍️ 延伸思考練習：{adaptiveExtension.taskZh}
              </p>
              <textarea
                readOnly={readOnly}
                className="ruled-textarea"
                placeholder="寫下你的延伸思考…"
                value={draftAnswers[`adaptive-${adaptiveExtension.id}`] ?? ''}
                onChange={(e) => onAnswerChange(`adaptive-${adaptiveExtension.id}`, e.target.value)}
                rows={adaptiveExtension.taskWritingLines || 2}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
import { useAnswerReadOnly } from './AnswerReadOnlyContext'
