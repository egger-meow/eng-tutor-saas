import { useState } from 'react'
import './HeroLivePreviewCard.css'

export type StudentPersona = {
  id: string
  tabLabel: string
  childName: string
  gradeStage: string
  interest: string
  levelDescription: string
  themeTitle: string
  excerpt: string
  vocabulary: Array<{ word: string; translation: string }>
  capAlignment: string
  memoryAdjustment: string
}

export const STUDENT_PERSONAS: StudentPersona[] = [
  {
    id: 'basketball',
    tabLabel: '🏀 國一·小宇（籃球）',
    childName: '小宇',
    gradeStage: '國一 基礎銜接',
    interest: 'NBA 與籃球運動',
    levelDescription: '國小到國一銜接，穩固核心動詞與時態',
    themeTitle: 'The Last Shot: Teamwork Under Pressure',
    excerpt:
      "During the final three minutes of the championship game, Leo hesitated before passing the ball to his teammate. His coach shouted from the bench, 'Trust your defense and stay calm!' With two seconds left on the clock, Leo made a decisive shot, leading his team to a thrilling comeback.",
    vocabulary: [
      { word: 'hesitate', translation: '猶豫 / 遲疑' },
      { word: 'decisive', translation: '果斷的 / 關鍵的' },
      { word: 'comeback', translation: '逆轉勝' },
    ],
    capAlignment: '🎯 112 會考題型：角色內心動機與事件因果推論',
    memoryAdjustment: '💡 系統記憶：上週混淆單字 hesitate ➔ 本週自動融入籃球真實情境複習',
  },
  {
    id: 'anime',
    tabLabel: '🎬 國二·晴晴（動漫）',
    childName: '晴晴',
    gradeStage: '國二 核心素養',
    interest: '動漫分鏡與角色冒險',
    levelDescription: '具備基礎單字量，重點在長句拆解與情節轉折',
    themeTitle: 'Beyond the Frame: The Art of Anime Storytelling',
    excerpt:
      "Behind every compelling animated scene lies a meticulous storyboard drawn by passionate artists. When the protagonist faces insurmountable obstacles, the background music shifts abruptly to mirror her inner conflict, turning a simple battle into an emotional journey.",
    vocabulary: [
      { word: 'compelling', translation: '引人入勝的' },
      { word: 'meticulous', translation: '細膩精準的' },
      { word: 'conflict', translation: '內心衝突 / 矛盾' },
    ],
    capAlignment: '🎯 113 會考題型：文章主旨與深層隱喻解析',
    memoryAdjustment: '💡 系統記憶：上週關係代名詞 which/that 易混淆 ➔ 本週文章自然穿插加強',
  },
  {
    id: 'science',
    tabLabel: '🐾 國三·翔翔（科普）',
    childName: '翔翔',
    gradeStage: '國三 會考衝刺',
    interest: '海洋生態與科普探索',
    levelDescription: '會考前衝刺，聚焦跨學科閱讀與論證推理',
    themeTitle: 'Deep Blue Hope: Corals Adapting to Warming Oceans',
    excerpt:
      "Marine biologists recently discovered that certain coral species can adapt to rising ocean temperatures by hosting heat-tolerant algae. Although climate change remains a grave threat to biodiversity, this resilient phenomenon offers valuable insights for conservation efforts worldwide.",
    vocabulary: [
      { word: 'adapt to', translation: '適應環境' },
      { word: 'biodiversity', translation: '生物多樣性' },
      { word: 'resilient', translation: '有韌性的 / 具復原力' },
    ],
    capAlignment: '🎯 111 會考題型：科普素養與科學論證推論',
    memoryAdjustment: '💡 系統記憶：上週錯題「although 讓步子句長句」➔ 本週文章結構刻意錨定',
  },
]

export function HeroLivePreviewCard() {
  const [activePersona, setActivePersona] = useState<StudentPersona>(STUDENT_PERSONAS[0])
  const [isPlaying, setIsPlaying] = useState(false)

  const handleSelectPersona = (persona: StudentPersona) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setActivePersona(persona)
  }

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(activePersona.excerpt)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    setIsPlaying(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="hero-live-preview" aria-label="孩子專屬教材真實預覽">
      <header className="hero-live-header">
        <span className="hero-live-edition">THIS WEEK · FOR ONE CHILD</span>
        <button
          type="button"
          className={`hero-live-tts-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={toggleSpeech}
          aria-label={isPlaying ? '暫停播放英文朗讀' : '播放母語發音試聽'}
        >
          {isPlaying ? '⏸ 暫停' : '🔊 聽朗讀發音'}
        </button>
      </header>

      {/* Switchable Student Tabs */}
      <div className="hero-live-tabs" role="tablist" aria-label="學生畫像切換">
        {STUDENT_PERSONAS.map((persona) => {
          const isActive = persona.id === activePersona.id
          return (
            <button
              key={persona.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`hero-live-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectPersona(persona)}
            >
              {persona.tabLabel}
            </button>
          )
        })}
      </div>

      {/* Persona Metadata */}
      <div className="hero-live-persona-meta">
        <span className="hero-live-badge-grade">{activePersona.gradeStage}</span>
        <span style={{ color: 'var(--color-muted)' }}>·</span>
        <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>喜好：{activePersona.interest}</span>
      </div>

      <h3 className="hero-live-theme-title">{activePersona.themeTitle}</h3>

      {/* Reading Excerpt */}
      <div className="hero-live-excerpt-box">
        <p className="hero-live-excerpt">{activePersona.excerpt}</p>
      </div>

      {/* Key Vocabulary Chips */}
      <div className="hero-live-vocab-row" aria-label="本篇核心單字">
        <span className="hero-live-vocab-label">核心單字：</span>
        {activePersona.vocabulary.map((vocab) => (
          <span key={vocab.word} className="hero-live-vocab-chip">
            <strong>{vocab.word}</strong>
            <span>({vocab.translation})</span>
          </span>
        ))}
      </div>

      {/* Pedagogical & CAP Connection */}
      <div className="hero-live-pedagogy">
        <div className="hero-live-cap">{activePersona.capAlignment}</div>
        <div className="hero-live-memory">{activePersona.memoryAdjustment}</div>
      </div>

      {/* Footer link to start onboarding */}
      <footer className="hero-live-footer">
        <small>雙面紙本列印・網頁互動朗讀</small>
        <a href="#onboarding">為你的孩子量身打造第 1 週 →</a>
      </footer>
    </div>
  )
}
