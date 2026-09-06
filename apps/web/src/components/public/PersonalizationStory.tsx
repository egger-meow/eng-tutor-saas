import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { easings } from '../motion/motion-tokens'

interface StageInfo {
  step: string
  title: string
  desc: string
  highlight: 'input' | 'core' | 'reading' | 'delivery'
}

const stages: StageInfo[] = [
  {
    step: '01',
    title: '真實學習訊號',
    desc: '上週閱讀太輕鬆、do/does 再次答錯、開始喜歡籃球與科技。',
    highlight: 'input',
  },
  {
    step: '02',
    title: '鎖定能力缺口',
    desc: '提高閱讀層次、安排間隔複習，緊扣國中進度與會考題型。',
    highlight: 'core',
  },
  {
    step: '03',
    title: '承載真實新知',
    desc: '以孩子感興趣的「遊戲空間音訊」承載真實文章與介系詞練習。',
    highlight: 'reading',
  },
  {
    step: '04',
    title: '雙份紙本交付',
    desc: 'Student PDF 留給孩子思考作答；Parent PDF 備好解答與導讀。',
    highlight: 'delivery',
  },
]

export function PersonalizationStory() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [activeStage, setActiveStage] = useState(0)

  // Track scroll progress within the story track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Smooth transforms based on scroll percentage
  const paperY = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [24, 0, 0, -12])
  const paperRotate = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [-0.8, 0, 0, 0.4])
  const paperShadow = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [
      '0 4px 16px rgba(24, 38, 31, 0.05)',
      '0 12px 36px rgba(24, 38, 31, 0.09)',
      '0 12px 36px rgba(24, 38, 31, 0.09)',
      '0 6px 20px rgba(24, 38, 31, 0.06)',
    ]
  )

  useEffect(() => {
    if (reduceMotion) return
    const unsubscribe = scrollYProgress.on('change', (v) => {
      if (v < 0.25) {
        setActiveStage(0)
      } else if (v < 0.52) {
        setActiveStage(1)
      } else if (v < 0.78) {
        setActiveStage(2)
      } else {
        setActiveStage(3)
      }
    })
    return () => unsubscribe()
  }, [scrollYProgress, reduceMotion])

  return (
    <div ref={containerRef} className="personalization-story-track">
      <div className="personalization-story-sticky">
        <div className="story-layout-grid">
          {/* Left Column: Progress Narrator & Signals */}
          <div className="story-control-column">
            <div className="story-badge-wrap">
              <span className="story-kicker">PERSONALIZATION LIFECYCLE</span>
              <span className="story-live-indicator">
                <span className="pulse-dot" />
                每週動態生成
              </span>
            </div>

            <h3 className="story-headline">
              一個孩子的狀況，
              <br />
              如何變成這一週的紙本教材？
            </h3>
            <p className="story-lede">
              不是在題庫裡隨機抽題。系統將上週的真實回饋，直接編織進這一週的專屬內容。
            </p>

            {/* Interactive Step Navigator */}
            <div className="story-stages-nav" role="tablist" aria-label="個人化生成四個步驟">
              {stages.map((stage, idx) => {
                const isActive = activeStage === idx
                return (
                  <button
                    key={stage.step}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`story-stage-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveStage(idx)}
                  >
                    <div className="stage-step-num">{stage.step}</div>
                    <div className="stage-text-block">
                      <strong className="stage-title">{stage.title}</strong>
                      <span className="stage-desc">{stage.desc}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Paper Artifact */}
          <div className="story-paper-column">
            <motion.div
              className="paper-artifact-sheet"
              style={
                reduceMotion
                  ? undefined
                  : {
                      y: paperY,
                      rotate: paperRotate,
                      boxShadow: paperShadow,
                    }
              }
              transition={{ ease: easings.paperSettle }}
            >
              {/* Top Meta Bar */}
              <div className="paper-sheet-header">
                <div className="paper-identity">
                  <span className="paper-edition-tag">WEEK 03 · INDIVIDUAL EDITION</span>
                  <span className="paper-student-tag">國一 · 94 分鐘</span>
                </div>
                <div className="paper-date-mark">THIS WEEK ONLY</div>
              </div>

              {/* Stage 1 Injected Overlay / Tags */}
              <div className={`paper-signals-panel ${activeStage >= 0 ? 'visible' : ''}`}>
                <span className="signals-label">累積輸入訊號：</span>
                <div className="signals-tags">
                  <span className={`signal-chip ${activeStage === 0 ? 'chip-highlight' : ''}`}>
                    🎧 空間音訊與科技
                  </span>
                  <span className={`signal-chip ${activeStage === 0 ? 'chip-highlight' : ''}`}>
                    🏀 籃球運動
                  </span>
                  <span className={`signal-chip alert-chip ${activeStage === 0 ? 'chip-highlight' : ''}`}>
                    ⚠️ do / does 待間隔複習
                  </span>
                </div>
              </div>

              {/* Learning Plan Target */}
              <div className={`paper-focus-banner ${activeStage >= 1 ? 'focused' : ''}`}>
                <span className="focus-kicker">本週學習核心</span>
                <strong className="focus-title">
                  空間介系詞 at / on / in ＋ 閱讀證據整合
                </strong>
                <span className="focus-sub">長線對齊國中會考題型，以孩子有感的真實題材承載</span>
              </div>

              {/* Reading Passage Preview */}
              <div className={`paper-reading-block ${activeStage >= 2 ? 'active-reading' : ''}`}>
                <div className="reading-title-row">
                  <span className="reading-marker">READING 01</span>
                  <h4 className="reading-heading">How Does a Game Place Sound Around You?</h4>
                </div>
                <p className="reading-snippet">
                  When you play a competitive game, you can tell if footsteps are{' '}
                  <span className="grammar-inline-target">on</span> the roof or{' '}
                  <span className="grammar-inline-target">behind</span> the door. Your ears judge the tiny
                  time delay between the two audio channels...
                </p>
              </div>

              {/* Dual Output Packaging Indicator */}
              <div className={`paper-delivery-footer ${activeStage === 3 ? 'ready-delivery' : ''}`}>
                <div className="dual-delivery-pills">
                  <div className="delivery-pill student">
                    <span className="pill-dot" />
                    <strong>Student PDF</strong>
                    <span>無答案，供孩子獨立動筆</span>
                  </div>
                  <div className="delivery-pill parent">
                    <span className="pill-dot parent-dot" />
                    <strong>Parent Answer PDF</strong>
                    <span>解析＋出題思路＋觀察重點</span>
                  </div>
                </div>
                <div className="paper-seal">
                  <span>PRINT READY</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
