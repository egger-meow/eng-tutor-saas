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
    desc: '上週閱讀回報偏易、do/does 再次答錯、最近喜歡籃球與遊戲音訊。',
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
    desc: 'Student PDF 留給孩子思考動筆；Parent PDF 備好完整解答與導讀。',
    highlight: 'delivery',
  },
]

export function PersonalizationStory() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [activeStage, setActiveStage] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => {
      if (typeof window !== 'undefined') {
        setIsDesktop(window.innerWidth >= 960)
      }
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Track scroll progress within the story track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Continuous paper transforms (for desktop scroll track)
  const paperY = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [24, 0, 0, -8])
  const paperRotate = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [-0.8, 0, 0, 0.4])
  const paperShadow = useTransform(
    scrollYProgress,
    [0, 0.15, 0.75, 1],
    [
      '0 4px 16px rgba(24, 38, 31, 0.05)',
      '0 12px 32px rgba(24, 38, 31, 0.08)',
      '0 12px 32px rgba(24, 38, 31, 0.08)',
      '0 8px 24px rgba(24, 38, 31, 0.06)',
    ]
  )

  // Continuous stage property scrubbing
  const signalsOpacity = useTransform(scrollYProgress, [0.02, 0.14, 0.30, 0.44], [0.3, 1, 1, 0.45])
  const signalsTranslateY = useTransform(scrollYProgress, [0.02, 0.14], [8, 0])
  const focusOpacity = useTransform(scrollYProgress, [0.22, 0.34, 0.65, 0.74], [0.45, 1, 1, 0.65])
  const focusScale = useTransform(scrollYProgress, [0.22, 0.35, 0.68, 0.74], [0.98, 1.01, 1.01, 0.99])
  const readingOpacity = useTransform(scrollYProgress, [0.44, 0.56, 0.82, 0.92], [0.5, 1, 1, 0.85])
  const readingScale = useTransform(scrollYProgress, [0.44, 0.58, 0.82, 0.92], [0.98, 1.01, 1.01, 0.99])

  // Stage 4 Unbundling (Parent sheet sliding out from underneath)
  const parentX = useTransform(scrollYProgress, [0.72, 0.90], [0, 36])
  const parentY = useTransform(scrollYProgress, [0.72, 0.90], [0, 20])
  const parentRotate = useTransform(scrollYProgress, [0.72, 0.90], [0, 2.4])
  const parentOpacity = useTransform(scrollYProgress, [0.70, 0.82], [0, 1])

  useEffect(() => {
    if (reduceMotion || !isDesktop) return
    const unsubscribe = scrollYProgress.on('change', (v) => {
      if (v < 0.24) {
        setActiveStage(0)
      } else if (v < 0.50) {
        setActiveStage(1)
      } else if (v < 0.74) {
        setActiveStage(2)
      } else {
        setActiveStage(3)
      }
    })
    return () => unsubscribe()
  }, [scrollYProgress, reduceMotion, isDesktop])

  const handleStageClick = (idx: number) => {
    setActiveStage(idx)
    if (typeof window !== 'undefined' && containerRef.current) {
      if (window.innerWidth >= 960) {
        const rect = containerRef.current.getBoundingClientRect()
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const targetFractions = [0.08, 0.35, 0.62, 0.88]
        const scrollDistance = rect.height - window.innerHeight
        if (scrollDistance > 0) {
          const targetY = scrollTop + rect.top + targetFractions[idx] * scrollDistance
          window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
        }
      }
    }
  }

  const useScrollMotion = isDesktop && !reduceMotion

  return (
    <div ref={containerRef} className="personalization-story-track">
      <div className="personalization-story-sticky">
        <div className="story-layout-grid">
          {/* Left Column: Progress Narrator & Semantic Step Navigation */}
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

            {/* Semantic Step Navigation */}
            <nav className="story-stages-nav" aria-label="個人化教材生成四個步驟">
              <ol className="story-stages-list">
                {stages.map((stage, idx) => {
                  const isActive = activeStage === idx
                  return (
                    <li key={stage.step} className="story-stage-item">
                      <button
                        type="button"
                        className={`story-stage-btn ${isActive ? 'is-active' : ''}`}
                        aria-current={isActive ? 'step' : undefined}
                        onClick={() => handleStageClick(idx)}
                      >
                        <span className="stage-step-num">{stage.step}</span>
                        <div className="stage-text-block">
                          <strong className="stage-title">{stage.title}</strong>
                          <span className="stage-desc">{stage.desc}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </div>

          {/* Right Column: Physical Paper Stack with Unbundling */}
          <div className="story-paper-column">
            <div className="paper-stack-container">
              {/* Secondary Sheet (Parent Answer PDF) — Slides out underneath at Stage 4 */}
              <motion.div
                className={`paper-artifact-sheet parent-sheet ${activeStage === 3 ? 'is-unbundled' : ''}`}
                style={
                  !useScrollMotion
                    ? undefined
                    : {
                        x: parentX,
                        y: parentY,
                        rotate: parentRotate,
                        opacity: parentOpacity,
                      }
                }
                aria-hidden={activeStage < 3}
              >
                <div className="paper-sheet-header">
                  <div className="paper-identity">
                    <span className="paper-edition-tag parent-tag">PARENT ANSWER PDF</span>
                    <span className="paper-student-tag">家長專用 · 完整解答</span>
                  </div>
                  <div className="paper-date-mark">WEEK 03 GUIDE</div>
                </div>

                <div className="parent-guide-body">
                  <div className="parent-guide-callout">
                    <span className="guide-kicker">出題依據與觀察重點</span>
                    <h5 className="guide-title">空間介系詞 at / on / in 判斷指引</h5>
                    <p className="guide-text">
                      孩子常以中文直譯「在...」導致 at/on/in 混淆。本週文章特意在遊戲方位情境中對比：
                      <em>on the roof</em>（接觸表面）與 <em>behind the door</em>（障礙物後方）。
                    </p>
                  </div>
                  <div className="parent-answer-key">
                    <span className="key-label">本週閱讀理解解答與解析</span>
                    <div className="key-item">
                      <strong>Q1: [C]</strong> 依據第 2 段，耳道接收時間差（time delay）用於判斷聲音距離。
                    </div>
                  </div>
                </div>

                <div className="paper-delivery-footer parent-footer">
                  <span className="parent-seal-tag">家長免備課 · 隨開即印</span>
                </div>
              </motion.div>

              {/* Primary Sheet (Student PDF) — Main Worksheet on top */}
              <motion.div
                className="paper-artifact-sheet student-sheet"
                style={
                  !useScrollMotion
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
                  <div className="paper-date-mark">STUDENT WORKSHEET</div>
                </div>

                {/* Stage 1 Injected Signals */}
                <motion.div
                  className={`paper-signals-panel ${activeStage >= 0 ? 'visible' : ''}`}
                  style={!useScrollMotion ? undefined : { opacity: signalsOpacity, y: signalsTranslateY }}
                >
                  <span className="signals-label">本週彙整的學習訊號：</span>
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
                    <span className={`signal-chip ${activeStage === 0 ? 'chip-highlight' : ''}`}>
                      📘 學校進行式銜接
                    </span>
                  </div>
                </motion.div>

                {/* Stage 2 Learning Plan Target */}
                <motion.div
                  className={`paper-focus-banner ${activeStage >= 1 ? 'focused' : ''}`}
                  style={!useScrollMotion ? undefined : { opacity: focusOpacity, scale: focusScale }}
                >
                  <span className="focus-kicker">本週學習核心目標</span>
                  <strong className="focus-title">
                    空間介系詞 at / on / in ＋ 閱讀證據整合
                  </strong>
                  <span className="focus-sub">長線對齊國中會考題型，以孩子有感的真實題材承載</span>
                </motion.div>

                {/* Stage 3 Reading Passage Preview */}
                <motion.div
                  className={`paper-reading-block ${activeStage >= 2 ? 'active-reading' : ''}`}
                  style={!useScrollMotion ? undefined : { opacity: readingOpacity, scale: readingScale }}
                >
                  <div className="reading-title-row">
                    <span className="reading-marker">READING 01</span>
                    <h4 className="reading-heading">How Does a Game Place Sound Around You?</h4>
                  </div>
                  <p className="reading-snippet">
                    When you play a competitive game, you can tell if footsteps are{' '}
                    <span className="grammar-inline-target">on</span> the roof or{' '}
                    <span className="grammar-inline-target">behind</span> the door. Your ears judge the tiny
                    time delay <span className="grammar-inline-target">between</span> the two audio channels...
                  </p>
                </motion.div>

                {/* Stage 4 Student Footer & Dual Delivery Stamp */}
                <div className={`paper-delivery-footer ${activeStage === 3 ? 'ready-delivery' : ''}`}>
                  <div className="dual-delivery-pills">
                    <div className="delivery-pill student">
                      <span className="pill-dot" />
                      <strong>Student PDF</strong>
                      <span>答案留空，保留獨立動筆思考</span>
                    </div>
                  </div>
                  <div className="paper-seal">
                    <span>雙份紙本 · 週五出刊</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
