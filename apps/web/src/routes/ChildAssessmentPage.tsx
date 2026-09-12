import { useEffect, useState, useTransition } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getChildAssessmentOverview,
  startOrResumeAssessmentSession,
  startAssessmentRetake,
  submitAssessmentResponse,
  getAssessmentSessionResult,
  type AssessmentOverview,
  type AssessmentSessionState,
  type AssessmentClientItem,
  type SanitizedAssessmentResult,
  SKILLS_BY_DOMAIN,
  DOMAIN_DISPLAY_LABELS,
  SKILL_DISPLAY_LABELS,
  RESULT_DISPLAY_LABELS,
  LOW_CONFIDENCE_LABEL,
  type AssessmentDomain,
  type AssessmentSkill,
} from '../lib/assessment'
import { useActiveTimer } from '../hooks/use-active-timer'
import { navigate } from '../app/use-route'
import { AssessmentPromptBlock } from '../components/assessment/AssessmentPromptBlock'
import '../styles/assessment.css'

// ============================================================================
// Subcomponents for Intro, Question Shell, and Result Presentation
// ============================================================================

export function AssessmentIntroView({
  onStart,
  onExit,
}: {
  onStart: () => void
  onExit: () => void
}) {
  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div className="assessment-header-title">英文程度診斷</div>
        <button className="assessment-exit-btn" type="button" onClick={onExit}>
          暫停並返回學習頁
        </button>
      </header>

      <div className="assessment-container">
        <article className="assessment-intro-card">
          <h1>更精準了解目前程度</h1>
          <p className="assessment-intro-subtitle">
            這是一段簡短、溫和的英文程度診斷。我們會從單字、文法與閱讀三個方向，找出最適合孩子的起點。
          </p>

          <ul className="assessment-intro-points">
            <li className="assessment-intro-point">
              <span className="assessment-intro-point-icon">✓</span>
              <div>
                <strong>自適應出題：</strong>題數會依作答情況調整，沒有固定分數要追，不需要感到壓力。
              </div>
            </li>
            <li className="assessment-intro-point">
              <span className="assessment-intro-point-icon">✓</span>
              <div>
                <strong>隨時可以跳過：</strong>遇到不確定或沒學過的題目，請放心選擇「我不確定，跳過這題」。
              </div>
            </li>
            <li className="assessment-intro-point">
              <span className="assessment-intro-point-icon">✓</span>
              <div>
                <strong>進度自動保存：</strong>作答過程隨時儲存，即使中途關閉或離開，也可以隨時回來繼續。
              </div>
            </li>
          </ul>

          <div className="assessment-intro-handoff-note">
            💡 <strong>家長叮嚀：</strong>這不是考試，作答不計時，也不會公佈答對與否。準備好後，可以把裝置交給孩子獨立作答。
          </div>

          <button
            className="assessment-submit-btn"
            type="button"
            style={{ width: '100%' }}
            onClick={onStart}
          >
            開始程度診斷
          </button>
        </article>
      </div>
    </main>
  )
}

export function AssessmentQuestionView({
  sessionState,
  currentItem,
  rawAnswer,
  isSubmitting,
  errorMessage,
  onAnswerChange,
  onSubmit,
  onSkip,
  onExit,
  onRetry,
}: {
  sessionState: AssessmentSessionState
  currentItem: AssessmentClientItem
  rawAnswer: string
  isSubmitting: boolean
  errorMessage: string | null
  onAnswerChange: (val: string) => void
  onSubmit: () => void
  onSkip: () => void
  onExit: () => void
  onRetry: () => void
}) {
  const completedCount = sessionState.itemsCompleted
  const targetCount = Math.max(sessionState.targetItemCount, completedCount + 1)
  const progressPercent = Math.min(100, Math.round((completedCount / targetCount) * 100))

  const isAnswerEmpty =
    currentItem.responseType === 'single_choice'
      ? !rawAnswer
      : rawAnswer.trim().length === 0

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div className="assessment-header-title">英文程度診斷</div>
        <button
          className="assessment-exit-btn"
          type="button"
          disabled={isSubmitting}
          onClick={onExit}
        >
          暫停並返回學習頁
        </button>
      </header>

      <div className="assessment-container">
        {/* Progress Header */}
        <div className="assessment-progress-bar">
          <div className="assessment-progress-info">
            <span className="assessment-progress-completed">
              已完成 {completedCount} 題
            </span>
            <span className="assessment-progress-adaptive-hint">
              題數會依作答情況調整
            </span>
          </div>
          <div
            className="assessment-progress-track"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="assessment-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Network Retry Error Banner */}
        {errorMessage && (
          <div className="assessment-error-banner" role="alert">
            <span>{errorMessage}</span>
            <button className="assessment-retry-btn" type="button" onClick={onRetry}>
              點擊重試送出
            </button>
          </div>
        )}

        {/* Question Card */}
        <article className="assessment-question-card">
          {/* Reading Passage (if present) */}
          {currentItem.passage && (
            <section className="assessment-passage-section" aria-label="閱讀篇章">
              <h2 className="assessment-passage-title">{currentItem.passage.title}</h2>
              <div className="assessment-passage-body">{currentItem.passage.content}</div>
            </section>
          )}

          {/* Prompt */}
          <AssessmentPromptBlock prompt={currentItem.prompt} />

          {/* Answer Input */}
          {currentItem.responseType === 'single_choice' ? (
            <div className="assessment-choices-list" role="radiogroup" aria-label="選項">
              {currentItem.choices?.map((choice) => {
                const isSelected = rawAnswer === choice.id
                return (
                  <button
                    key={choice.id}
                    className={`assessment-choice-btn ${isSelected ? 'is-selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isSubmitting}
                    onClick={() => onAnswerChange(choice.id)}
                  >
                    <div className="assessment-choice-radio" aria-hidden="true">
                      {isSelected && <div className="assessment-choice-radio-dot" />}
                    </div>
                    <span className="assessment-choice-text">{choice.text}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="assessment-short-answer">
              <input
                className="assessment-text-input"
                type="text"
                placeholder="請在此輸入英文答案…"
                value={rawAnswer}
                disabled={isSubmitting}
                autoFocus
                onChange={(e) => onAnswerChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAnswerEmpty && !isSubmitting) {
                    e.preventDefault()
                    onSubmit()
                  }
                }}
              />
              <p className="assessment-short-hint">
                輸入完成後可按 Enter 或點擊下方確認送出
              </p>
            </div>
          )}

          {/* Submission Actions */}
          <div className="assessment-actions">
            <button
              className="assessment-submit-btn"
              type="button"
              disabled={isAnswerEmpty || isSubmitting}
              onClick={onSubmit}
            >
              {isSubmitting ? '送出中…' : '確認送出'}
            </button>

            <button
              className="assessment-skip-btn"
              type="button"
              disabled={isSubmitting}
              onClick={onSkip}
            >
              我不確定，跳過這題
            </button>
          </div>
        </article>
      </div>
    </main>
  )
}

export function AssessmentResultView({
  result,
  overview,
  cooldownNotice,
  onExit,
  onRetake,
}: {
  result: SanitizedAssessmentResult
  overview?: AssessmentOverview | null
  cooldownNotice?: string | null
  onExit: () => void
  onRetake?: () => void
}) {
  const domains: AssessmentDomain[] = ['vocabulary', 'grammar', 'reading']
  const isRetakeEligible = overview?.status === 'completed' && Boolean(overview?.retakeEligible)

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div className="assessment-header-title">英文程度診斷結果</div>
        <button className="assessment-exit-btn" type="button" onClick={onExit}>
          回到孩子學習頁
        </button>
      </header>

      <div className="assessment-container">
        <div className="assessment-result-view">
          {/* Header Summary Card */}
          <section className="assessment-result-header">
            <h1>診斷結果已完成</h1>
            <div className="assessment-result-meta">
              共完成 {result.totalItems} 題 · 評估完成時間：
              {new Date(result.completedAt).toLocaleDateString('zh-TW')}
            </div>
            <div className="assessment-narrative-box">{result.overallNarrativeZh}</div>
            <div className="assessment-latest-snapshot-notice">
              這次結果已更新孩子目前的程度診斷。系統後續將以最新的能力輪廓與每週學習表現共同規劃合適材料。
            </div>
            {cooldownNotice && (
              <div className="assessment-cooldown-notice" role="status">
                {cooldownNotice}
              </div>
            )}
          </section>

          {/* Three Domain Cards */}
          <section className="assessment-domains-grid" aria-label="三大領域表現">
            {domains.map((domain) => {
              const summary = result.domainSummaries[domain]
              if (!summary) return null
              const domainLabel = DOMAIN_DISPLAY_LABELS[domain]
              const resultLabel = RESULT_DISPLAY_LABELS[summary.result]

              return (
                <div key={domain} className="assessment-domain-card">
                  <div className="assessment-domain-top">
                    <span className="assessment-domain-name">{domainLabel}</span>
                    <span className={`assessment-badge ${summary.result}`}>
                      {resultLabel}
                    </span>
                  </div>
                  <p className="assessment-domain-summary">{summary.summaryZh}</p>
                </div>
              )
            })}
          </section>

          {/* 13 Skills Detailed Breakdown */}
          <section className="assessment-skills-section" aria-label="詳細指標能力">
            <h2 className="assessment-skills-heading">各項指標能力診斷</h2>

            {domains.map((domain) => {
              const domainSkills = SKILLS_BY_DOMAIN[domain]
              const domainLabel = DOMAIN_DISPLAY_LABELS[domain]

              return (
                <div key={domain} className="assessment-skills-domain-group">
                  <div className="assessment-skills-domain-title">{domainLabel}指標</div>
                  <div className="assessment-skills-list">
                    {domainSkills.map((skillKey: AssessmentSkill) => {
                      const evalData = result.skillEvaluations[skillKey]
                      const skillLabel = SKILL_DISPLAY_LABELS[skillKey]
                      const resultLabel = evalData
                        ? RESULT_DISPLAY_LABELS[evalData.result]
                        : '正在建立'
                      const isLowConfidence = evalData?.confidence === 'low'

                      return (
                        <div key={skillKey} className="assessment-skill-row">
                          <div className="assessment-skill-left">
                            <span className="assessment-skill-title">{skillLabel}</span>
                          </div>
                          <div className="assessment-skill-right">
                            {isLowConfidence && (
                              <span className="assessment-confidence-tag">
                                {LOW_CONFIDENCE_LABEL}
                              </span>
                            )}
                            <span className={`assessment-badge ${evalData?.result ?? 'developing'}`}>
                              {resultLabel}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>

          {/* Completion Next Steps */}
          <footer className="assessment-completion-footer">
            <p className="assessment-completion-note">
              {isRetakeEligible
                ? '上次診斷已超過 90 天，若需要可進行重新診斷；若未重測，系統將持續以每週最新作答表現為優先調整材料。'
                : '診斷結果已完成。後續個人化整合將由系統的學習檔案處理。下次可重新診斷時間為完成後 90 天。'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isRetakeEligible && onRetake && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={onRetake}
                >
                  重新診斷
                </button>
              )}
              <button
                className={`button ${isRetakeEligible ? 'button-secondary' : 'button-primary'}`}
                type="button"
                onClick={onExit}
              >
                回到孩子學習頁
              </button>
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}

// ============================================================================
// Main Page Orchestrator
// ============================================================================

interface ChildAssessmentPageProps {
  session: Session
  childId: string
}

type AssessmentPageState =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'intro'; overview: AssessmentOverview }
  | {
      type: 'in_progress'
      sessionState: AssessmentSessionState
      currentItem: AssessmentClientItem
      rawAnswer: string
      isSubmitting: boolean
      errorMessage: string | null
    }
  | {
      type: 'completed'
      result: SanitizedAssessmentResult
      overview?: AssessmentOverview | null
      cooldownNotice?: string | null
    }

export function ChildAssessmentPage({ session: _session, childId }: ChildAssessmentPageProps) {
  const [state, setState] = useState<AssessmentPageState>({ type: 'loading' })
  const [, startTransition] = useTransition()

  // Active Response Timer: bound to current item ID and ready state
  const currentItemId = state.type === 'in_progress' ? state.currentItem.id : null
  const { getActiveMs, resetTimer } = useActiveTimer(currentItemId, state.type === 'in_progress')

  // Initial Load: Check overview and determine whether to show intro, resume question, or show result
  useEffect(() => {
    let active = true

    async function initialize() {
      try {
        const overview = await getChildAssessmentOverview(childId)
        if (!active) return

        const url = new URL(window.location.href)
        const isRetakeRequested = url.searchParams.get('action') === 'retake'

        if (isRetakeRequested) {
          if (overview.status === 'in_progress' && overview.sessionId) {
            const sessionState = await startOrResumeAssessmentSession(childId)
            if (!active) return
            if (sessionState.status === 'completed') {
              const result = await getAssessmentSessionResult(sessionState.sessionId)
              if (!active) return
              setState({ type: 'completed', result, overview })
            } else if (sessionState.currentItem) {
              setState({
                type: 'in_progress',
                sessionState,
                currentItem: sessionState.currentItem,
                rawAnswer: '',
                isSubmitting: false,
                errorMessage: null,
              })
            } else {
              setState({ type: 'error', message: '目前無法載入題目，請稍後再試。' })
            }
            return
          }

          if (overview.retakeEligible) {
            const sessionState = await startAssessmentRetake(childId)
            if (!active) return
            if (sessionState.currentItem) {
              resetTimer()
              setState({
                type: 'in_progress',
                sessionState,
                currentItem: sessionState.currentItem,
                rawAnswer: '',
                isSubmitting: false,
                errorMessage: null,
              })
              return
            } else {
              setState({ type: 'error', message: '目前無法載入重新診斷題目，請稍後再試。' })
              return
            }
          }

          if (overview.status === 'completed') {
            const result = await getAssessmentSessionResult(overview.sessionId!)
            if (!active) return
            setState({
              type: 'completed',
              result,
              overview,
              cooldownNotice:
                '距離上次診斷尚未滿 90 天，目前暫不開放重新診斷。系統會持續依據每週學習表現動態微調。',
            })
            return
          }
        }

        if (overview.status === 'completed' && overview.sessionId) {
          // Load completed session result
          const result = await getAssessmentSessionResult(overview.sessionId)
          if (!active) return
          setState({ type: 'completed', result, overview })
        } else if (overview.status === 'in_progress' && overview.sessionId) {
          // Resume in-progress session
          const sessionState = await startOrResumeAssessmentSession(childId)
          if (!active) return
          if (sessionState.status === 'completed') {
            const result = await getAssessmentSessionResult(sessionState.sessionId)
            if (!active) return
            setState({ type: 'completed', result, overview })
          } else if (sessionState.currentItem) {
            setState({
              type: 'in_progress',
              sessionState,
              currentItem: sessionState.currentItem,
              rawAnswer: '',
              isSubmitting: false,
              errorMessage: null,
            })
          } else {
            setState({ type: 'error', message: '目前無法載入題目，請稍後再試。' })
          }
        } else {
          // Not started: present intro state
          setState({ type: 'intro', overview })
        }
      } catch (err: unknown) {
        if (!active) return
        const msg = err instanceof Error ? err.message : '載入評估資料時發生錯誤'
        setState({ type: 'error', message: msg })
      }
    }

    void initialize()

    return () => {
      active = false
    }
  }, [childId, resetTimer])

  // Start Assessment from Intro
  async function handleStartAssessment() {
    setState({ type: 'loading' })
    try {
      const sessionState = await startOrResumeAssessmentSession(childId)
      if (sessionState.status === 'completed') {
        const result = await getAssessmentSessionResult(sessionState.sessionId)
        setState({ type: 'completed', result })
      } else if (sessionState.currentItem) {
        resetTimer()
        setState({
          type: 'in_progress',
          sessionState,
          currentItem: sessionState.currentItem,
          rawAnswer: '',
          isSubmitting: false,
          errorMessage: null,
        })
      } else {
        setState({ type: 'error', message: '目前無法載入題目，請稍後再試。' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '開始評估時發生錯誤'
      setState({ type: 'error', message: msg })
    }
  }

  // Start Assessment Retake
  async function handleStartRetake() {
    setState({ type: 'loading' })
    try {
      const sessionState = await startAssessmentRetake(childId)
      if (sessionState.currentItem) {
        resetTimer()
        setState({
          type: 'in_progress',
          sessionState,
          currentItem: sessionState.currentItem,
          rawAnswer: '',
          isSubmitting: false,
          errorMessage: null,
        })
      } else {
        setState({ type: 'error', message: '目前無法載入重新診斷題目，請稍後再試。' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '開始重新診斷時發生錯誤'
      setState({ type: 'error', message: msg })
    }
  }

  // Submit Answer or Skip
  async function handleSubmitResponse(isSkip: boolean = false) {
    if (state.type !== 'in_progress' || state.isSubmitting) return

    const { sessionState, currentItem, rawAnswer } = state
    const activeMs = getActiveMs()

    // Lock UI
    setState((prev) =>
      prev.type === 'in_progress'
        ? { ...prev, isSubmitting: true, errorMessage: null }
        : prev
    )

    try {
      const updatedState = await submitAssessmentResponse(
        sessionState.sessionId,
        currentItem.id,
        {
          rawAnswer: isSkip ? null : rawAnswer.trim(),
          isSkip,
          activeResponseMs: activeMs,
        }
      )

      if (updatedState.status === 'completed') {
        const result = await getAssessmentSessionResult(updatedState.sessionId)
        startTransition(() => {
          setState({ type: 'completed', result })
        })
      } else if (updatedState.currentItem) {
        startTransition(() => {
          resetTimer()
          setState({
            type: 'in_progress',
            sessionState: updatedState,
            currentItem: updatedState.currentItem!,
            rawAnswer: '',
            isSubmitting: false,
            errorMessage: null,
          })
        })
      } else {
        // Safe completion fallback if currentItem is null
        const result = await getAssessmentSessionResult(updatedState.sessionId)
        startTransition(() => {
          setState({ type: 'completed', result })
        })
      }
    } catch (err: unknown) {
      // Failure: Preserve learner answer locally and show retry banner
      const errorMsg =
        err instanceof Error ? err.message : '作答送出失敗，請檢查網路連線後點擊重試。'
      setState((prev) =>
        prev.type === 'in_progress'
          ? { ...prev, isSubmitting: false, errorMessage: errorMsg }
          : prev
      )
    }
  }

  // 1. Loading View
  if (state.type === 'loading') {
    return (
      <main className="assessment-page">
        <div
          className="assessment-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <div className="loading-state" role="status">
            <div className="loading-spinner" aria-hidden="true" />
            <p>正在載入評估進度…</p>
          </div>
        </div>
      </main>
    )
  }

  // 2. Error View
  if (state.type === 'error') {
    return (
      <main className="assessment-page">
        <header className="assessment-header">
          <div className="assessment-header-title">英文程度診斷</div>
          <button className="assessment-exit-btn" type="button" onClick={() => navigate('/')}>
            返回學習頁
          </button>
        </header>
        <div className="assessment-container">
          <section className="assessment-intro-card" role="alert">
            <h1>無法載入診斷</h1>
            <p className="assessment-intro-subtitle">{state.message}</p>
            <button className="button button-primary" type="button" onClick={() => navigate('/')}>
              回到學習頁
            </button>
          </section>
        </div>
      </main>
    )
  }

  // 3. Intro View
  if (state.type === 'intro') {
    return (
      <AssessmentIntroView
        onStart={() => void handleStartAssessment()}
        onExit={() => navigate('/')}
      />
    )
  }

  // 4. In-Progress Question Shell View
  if (state.type === 'in_progress') {
    return (
      <AssessmentQuestionView
        sessionState={state.sessionState}
        currentItem={state.currentItem}
        rawAnswer={state.rawAnswer}
        isSubmitting={state.isSubmitting}
        errorMessage={state.errorMessage}
        onAnswerChange={(val) => {
          setState((prev) => (prev.type === 'in_progress' ? { ...prev, rawAnswer: val } : prev))
        }}
        onSubmit={() => void handleSubmitResponse(false)}
        onSkip={() => void handleSubmitResponse(true)}
        onExit={() => navigate('/')}
        onRetry={() => void handleSubmitResponse(false)}
      />
    )
  }

  // 5. Result View
  return (
    <AssessmentResultView
      result={state.result}
      overview={state.overview}
      cooldownNotice={state.cooldownNotice}
      onExit={() => navigate('/')}
      onRetake={() => void handleStartRetake()}
    />
  )
}
