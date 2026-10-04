import { useEffect, useMemo, useRef, useState } from 'react'
import { handleInternalLink } from '../../../app/use-route'
import { getSupabaseClient } from '../../../lib/supabase'
import { StudentLessonRenderer } from './StudentLessonRenderer'
import { LearningStartPanel } from './LearningStartPanel'
import { buildMaterialSessionPlan } from '../../../lib/material-session-plan'
import type { StudentMaterialProjection } from '../../../types/student-material'
import { fetchStudentSubmission, submitStudentMaterial, saveStudentParentFeedback, requestNextAfterSubmission, type SubmissionResult } from '../../../lib/student-material-api'
import { useMaterialDraft } from '../../../hooks/use-material-draft'
import { recordMaterialLearningEvent } from '../../../lib/material-learning-analytics'
import { materialDownloadFilename, openMaterialDownload } from '../../../lib/materials'

export interface PaperReaderProps {
  projection: StudentMaterialProjection
  studentPdfUrl?: string | null
  onSwitchToPdf?: () => void
}

export function PaperReader({
  projection,
  onSwitchToPdf,
}: PaperReaderProps) {
  const {
    answers,
    selfCheck,
    status,
    lastSavedAt,
    hasConflict,
    isInitialLoading,
    version,
    updateAnswer,
    toggleSelfCheck,
    retrySave,
    resolveConflict,
  } = useMaterialDraft({ materialId: projection.material_id })

  const [activeChapter, setActiveChapter] = useState<string>('opening')
  const [submission, setSubmission] = useState<SubmissionResult | null>(null)
  const [submissionLoading, setSubmissionLoading] = useState(true)
  const [submissionFailed, setSubmissionFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [feedbackChoice, setFeedbackChoice] = useState<'ask' | 'form' | 'skip' | 'saved'>('ask')
  const [requestMessage, setRequestMessage] = useState('')
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [weakArea, setWeakArea] = useState('')
  const [comments, setComments] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackReady, setFeedbackReady] = useState(false)
  const [feedbackDetails, setFeedbackDetails] = useState({ mistakesText: '', childComments: '' })
  const startedMaterial = useRef<string | null>(null)

  useEffect(() => {
    void recordMaterialLearningEvent(projection.material_id, 'material_opened')
  }, [projection.material_id])

  useEffect(() => {
    if (status === 'error') void recordMaterialLearningEvent(projection.material_id, 'save_failed')
  }, [projection.material_id, status])

  async function openFeedback() {
    setFeedbackChoice('form')
    setFeedbackLoading(true)
    setFeedbackReady(false)
    setActionError('')
    try {
      const { data, error } = await getSupabaseClient().from('feedback')
        .select('difficulty, weak_area, parent_comments, mistakes_text, child_comments').eq('material_id', projection.material_id).maybeSingle()
      if (error) throw error
      if (data) {
        setDifficulty(data.difficulty ?? 3)
        setWeakArea(data.weak_area ?? '')
        setComments(data.parent_comments ?? '')
        setFeedbackDetails({ mistakesText: data.mistakes_text ?? '', childComments: data.child_comments ?? '' })
      }
      setFeedbackReady(true)
    } catch { setActionError('既有回饋無法載入，請重試後再儲存。') }
    finally { setFeedbackLoading(false) }
  }

  useEffect(() => {
    let active = true
    setSubmissionLoading(true)
    setSubmissionFailed(false)
    void fetchStudentSubmission(projection.material_id).then((result) => {
      if (active) {
        setSubmission(result)
        if (result?.next_requested) {
          setFeedbackChoice('skip')
          setRequestMessage(result.next_request_status === 'failed' || result.next_request_status === 'canceled'
            ? '下一份教材未完成，請聯絡我們協助恢復；已提交的作答仍會保留。'
            : '已收到下一份申請。')
        }
      }
    }).catch(() => { if (active) setSubmissionFailed(true) })
      .finally(() => { if (active) setSubmissionLoading(false) })
    return () => { active = false }
  }, [projection.material_id, loadAttempt])

  const lesson = projection.student_lesson
  const sessionPlan = useMemo(() => buildMaterialSessionPlan(projection.student_lesson), [projection.student_lesson])

  function handlePauseAndLeave() {
    if (status === 'saving') {
      window.alert('草稿正在雲端儲存中，請稍候片刻再離開。')
      return
    }
    if (status === 'unsaved') {
      window.alert('有正在編輯的作答尚未儲存，請稍候幾秒自動儲存後再離開。')
      return
    }
    if (status === 'conflict') {
      window.alert('偵測到版本衝突，請先選擇如何處理衝突後再離開。')
      return
    }
    if (status === 'error') {
      window.alert('草稿儲存失敗，請先點擊工具列上的「重試」以防作答遺失。')
      return
    }
    if (window.confirm('已為您保存草稿，換手機或電腦也能接續。確定要先暫停返回總覽嗎？')) {
      window.location.assign('/dashboard')
    }
  }

  async function submitWholeMaterial() {
    if (actionBusy || submissionFailed || status !== 'saved' || hasConflict || submission) return
    const allQuestions = [
      ...(lesson.practice?.flatMap((stage) => stage.questions) ?? []),
      ...(lesson.homework?.questions ?? []),
    ]
    const totalCount = allQuestions.length
    const answeredCount = allQuestions.filter((q) => {
      const qId = q.id || q.questionId
      return qId && typeof answers[qId] === 'string' && answers[qId].trim().length > 0
    }).length
    const unansweredCount = Math.max(0, totalCount - answeredCount)

    if (!window.confirm(`確認提交這次整份作答？\n\n・已作答：${answeredCount} 題\n・未作答：${unansweredCount} 題（未答不算答錯）\n\n提交後本次作答將正式鎖定，無法再修改作答內容。`)) return
    setActionBusy(true)
    setActionError('')
    try {
      const result = await submitStudentMaterial(projection.material_id, version)
      if ('conflict' in result && result.conflict) {
        setActionError('草稿已在其他裝置更新。請重新載入後確認作答，再提交。')
      } else {
        setSubmission(result as SubmissionResult)
      }
    } catch {
      setActionError('目前無法提交，請稍後重試。')
    } finally { setActionBusy(false) }
  }

  async function saveOptionalFeedback() {
    if (actionBusy || !feedbackReady) return
    setActionBusy(true)
    setActionError('')
    try {
      const answered = submission?.results.filter((result) => result.status !== 'unanswered').length ?? 0
      const total = submission?.results.length ?? 0
      await saveStudentParentFeedback(projection.material_id, {
        difficulty, completionRate: total ? Math.round(answered * 4 / total) * 25 : 0,
        weakArea: weakArea || null, comments, ...feedbackDetails,
      })
      setFeedbackChoice('saved')
    } catch { setActionError('回饋未儲存，請再試一次。') }
    finally { setActionBusy(false) }
  }

  async function requestNext() {
    if (actionBusy) return
    setActionBusy(true)
    setActionError('')
    try {
      const result = await requestNextAfterSubmission(projection.material_id)
      if (result.requested) {
        setSubmission(current => current ? { ...current, next_requested: true } : current)
        setRequestMessage('已收到下一份申請。')
      }
      else if (result.reason === 'MONTHLY_LIMIT') setRequestMessage(`本服務月已使用 ${result.used ?? 4}/${result.limit ?? 4} 份，下個服務月可再申請。`)
      else setRequestMessage('目前無法申請下一份，請稍後再試。')
    } catch { setActionError('下一份申請失敗，請稍後重試。') }
    finally { setActionBusy(false) }
  }

  async function downloadStudent() {
    if (downloadBusy) return
    setDownloadBusy(true)
    setDownloadMessage('')
    try {
      await openMaterialDownload(projection.material_id, 'student', materialDownloadFilename(
        projection.child_name, projection.material_week, 'student', projection.week_number,
      ))
    } catch (error) {
      setDownloadMessage(error instanceof Error && error.message === 'PDF_PENDING'
        ? 'PDF 正在準備，請稍後再按下載。'
        : '目前無法下載，請稍後再按下載重試。')
    } finally { setDownloadBusy(false) }
  }

  const questionDescriptions = new Map([
    ...(lesson.practice?.flatMap((stage) => stage.questions) ?? []),
    ...(lesson.homework?.questions ?? []),
  ].map((question) => [question.id || question.questionId, question.prompt]))

  function jumpToQuestion(questionId: string) {
    const card = document.getElementById(`q-card-${questionId}`)
    if (!card) return
    card.tabIndex = -1
    card.scrollIntoView({ block: 'center' })
    card.focus({ preventScroll: true })
  }

  function handleChapterClick(id: string) {
    setActiveChapter(id)
    const element = document.getElementById(`chapter-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      element.tabIndex = -1
      element.focus({ preventScroll: true })
    }
  }

  const formattedSavedTime = lastSavedAt
    ? new Intl.DateTimeFormat('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(lastSavedAt))
    : null

  return (
    <div className="paper-reader-container" inert={isInitialLoading || submissionLoading} aria-busy={isInitialLoading || submissionLoading}>
      <header className="paper-material-heading">
        <h1>{projection.title || '本週英文教材'}</h1>
      </header>
      {(isInitialLoading || submissionLoading) && <p role="status">正在載入作答與提交狀態…</p>}
      {submissionFailed && <div role="alert"><p>提交狀態暫時無法載入。確認前先保留閱讀，避免重複提交。</p><button type="button" className="button" onClick={() => setLoadAttempt((n) => n + 1)}>重試提交狀態</button></div>}
      {status === 'idle' && !isInitialLoading && !submission && <div role="alert"><p>草稿尚未載入，請重新整理再作答。</p><button className="button" type="button" onClick={() => window.location.reload()}>重新載入草稿</button></div>}
      {/* In-flow toolbar with save status and chapter navigation */}
      <header className="paper-reader-toolbar" role="region" aria-label="教材閱讀工具列">
        <div className="paper-reader-toolbar-left">
          <div className="paper-reader-title-badge">
            <span>{projection.child_name}</span>
            <span style={{ color: 'var(--color-rule-strong)' }}>·</span>
            <span>Week {projection.week_number}</span>
          </div>

          {/* Save Status Badge */}
          <div className={`paper-save-status status-${submission ? 'saved' : status}`} role="status" aria-live="polite">
            {submission && <span>✓ 已提交 · {submission.next_requested || requestMessage === '已收到下一份申請。' ? '已申請下一份' : '作答已鎖定'}</span>}
            {!submission && <>
            {status === 'saving' && <span>⏳ 儲存中…</span>}
            {status === 'saved' && (
              <span>✓ 草稿已保存 {formattedSavedTime ? `(${formattedSavedTime})` : ''}</span>
            )}
            {status === 'unsaved' && <span>✎ 編輯中…</span>}
            {status === 'error' && (
              <span>
                ⚠️ 儲存失敗{' '}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    color: 'inherit',
                    padding: 0,
                    fontWeight: 600,
                  }}
                  onClick={() => void retrySave()}
                >
                  重試
                </button>
              </span>
            )}
            {status === 'conflict' && <span>⚠️ 發現新版本衝突</span>}
            </>}
          </div>
        </div>

        <div className="paper-reader-toolbar-right">
          {onSwitchToPdf && (
            <button
              type="button"
              className="button button-secondary"
              disabled={!submission && status !== 'saved'}
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}
              onClick={onSwitchToPdf}
            >
              📄 檢視學生教材 PDF
            </button>
          )}

          <button
            type="button"
            disabled={downloadBusy}
            aria-busy={downloadBusy}
            onClick={() => void downloadStudent()}
            className="button button-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}
          >
            {downloadBusy ? '準備下載中…' : '⬇ 下載學生教材'}
          </button>
        </div>

        {/* Chapter Jump Navigation */}
        <nav className="paper-chapter-nav" aria-label="章節跳轉">
          {lesson.opening && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'opening' ? 'active' : ''}`}
              onClick={() => handleChapterClick('opening')}
            >
              導讀
            </button>
          )}
          {lesson.vocabulary && lesson.vocabulary.length > 0 && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'vocabulary' ? 'active' : ''}`}
              onClick={() => handleChapterClick('vocabulary')}
            >
              單字
            </button>
          )}
          {lesson.reading && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'reading' ? 'active' : ''}`}
              onClick={() => handleChapterClick('reading')}
            >
              閱讀
            </button>
          )}
          {lesson.instruction && lesson.instruction.length > 0 && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'instruction' ? 'active' : ''}`}
              onClick={() => handleChapterClick('instruction')}
            >
              文法焦點
            </button>
          )}
          {lesson.practice && lesson.practice.length > 0 && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'practice' ? 'active' : ''}`}
              onClick={() => handleChapterClick('practice')}
            >
              課堂練習
            </button>
          )}
          {lesson.selfCheckZh && lesson.selfCheckZh.length > 0 && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'selfcheck' ? 'active' : ''}`}
              onClick={() => handleChapterClick('selfcheck')}
            >
              自我檢核
            </button>
          )}
          {lesson.homework && (
            <button
              type="button"
              className={`paper-chapter-btn ${activeChapter === 'homework' ? 'active' : ''}`}
              onClick={() => handleChapterClick('homework')}
            >
              課後作業
            </button>
          )}
        </nav>
      </header>
      {downloadMessage && <p className="notice" role="status">{downloadMessage}</p>}

      {/* Conflict Resolution Banner */}
      {hasConflict && !submission && (
        <div className="paper-conflict-banner" role="alert">
          <div>
            <strong>⚠️ 偵測到版本衝突</strong>
            <p style={{ margin: '0.25rem 0 0 0' }}>
              這份教材的草稿在其他視窗或裝置上有更新的版本。請選擇如何處理：
            </p>
          </div>
          <div className="paper-conflict-actions">
            <button
              type="button"
              className="button button-primary"
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => void resolveConflict('keep-mine')}
            >
              保留我目前的作答 (覆寫)
            </button>
            <button
              type="button"
              className="button button-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              onClick={() => void resolveConflict('load-server')}
            >
              載入最新伺服器版本
            </button>
          </div>
        </div>
      )}

      <LearningStartPanel
        plan={sessionPlan}
        answers={submission?.answers ?? answers}
        saveStatus={status}
        isReadOnly={Boolean(submission)}
        onJumpToChapter={handleChapterClick}
        onJumpToQuestion={jumpToQuestion}
        onPauseAndLeave={handlePauseAndLeave}
      />

      <StudentLessonRenderer lesson={lesson ?? {}} answers={submission?.answers ?? answers}
        selfCheck={submission?.self_check ?? selfCheck}
        readOnly={Boolean(submission) || actionBusy || submissionFailed || status === 'idle'}
        onAnswerChange={(key, value, immediate) => {
          if (value.trim() && startedMaterial.current !== projection.material_id) {
            startedMaterial.current = projection.material_id
            void recordMaterialLearningEvent(projection.material_id, 'answer_started')
          }
          updateAnswer(key, value, immediate)
        }} onToggleSelfCheck={toggleSelfCheck} />

      <section className="paper-sheet paper-completion" aria-label="完成本週教材">
        <h2 className="paper-section-title">完成本週教材</h2>
        {!submission && (
          <>
            <p>可以只完成一部分。未作答的題目會標為「未作答」，不算答錯；整份提交後才能查看客觀題正解。</p>
            <button className="button button-primary" type="button" onClick={() => void submitWholeMaterial()}
              disabled={actionBusy || isInitialLoading || submissionLoading || submissionFailed || status !== 'saved' || hasConflict}>
              {actionBusy ? '提交中…' : '提交整份教材'}
            </button>
            {status !== 'saved' && <p className="muted">請等待草稿完成儲存後再提交。</p>}
            {['unsaved', 'saving', 'error', 'conflict'].includes(status) && <p role="status">離開教材前，請先完成儲存或處理衝突。</p>}
          </>
        )}
        {submission && (
          <>
            <p role="status">已於 {new Date(submission.submitted_at).toLocaleString('zh-TW')} 提交。本次作答已鎖定。</p>
            <p>未作答不算答錯；開放題尚未評分，可參考答案自行回顧。</p>
            <ul>
              {submission.results.map((result, index) => (
                <li key={result.question_id}>
                  <a href={`#q-card-${result.question_id}`} onClick={(event) => { event.preventDefault(); jumpToQuestion(result.question_id) }}>
                    {questionDescriptions.get(result.question_id) ?? `第 ${index + 1} 題`}
                  </a>：{{ correct: '答對', incorrect: '答錯', unanswered: '未作答', open_review: '開放題待參考' }[result.status]}
                  {result.correct_answer && <> · 正解：{result.correct_answer}</>}
                </li>
              ))}
            </ul>
            {feedbackChoice === 'ask' && <div className="form-actions">
              <p>要補充家長回饋嗎？這是選填。</p>
              <button className="button button-secondary" type="button" onClick={() => void openFeedback()}>填寫回饋</button>
              <button className="button button-secondary" type="button" onClick={() => setFeedbackChoice('skip')}>略過回饋</button>
            </div>}
            {feedbackChoice === 'form' && <div className="feedback-form" aria-busy={feedbackLoading}>
              {feedbackLoading && <p role="status">正在載入家長回饋…</p>}
              {!feedbackReady && !feedbackLoading && <button type="button" className="button" onClick={() => void openFeedback()}>重試載入回饋</button>}
              <fieldset disabled={!feedbackReady || actionBusy} className="paper-feedback-fields">
              <label>整體難度
                <select value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}>
                  <option value={1}>太簡單</option><option value={3}>剛剛好</option><option value={5}>太難</option>
                </select>
              </label>
              <label>最需要加強
                <select value={weakArea} onChange={(event) => setWeakArea(event.target.value)}>
                  <option value="">沒有特別</option><option value="vocabulary">單字</option>
                  <option value="grammar">文法</option><option value="reading">閱讀</option>
                  <option value="writing">寫作</option><option value="mixed">多個部分</option>
                </select>
              </label>
              <details className="paper-feedback-details">
              <summary>補充其他觀察（選填）</summary>
              <label>其他觀察（選填）
                <textarea maxLength={2000} value={comments} onChange={(event) => setComments(event.target.value)} />
              </label>
              </details>
              <button className="button button-secondary" type="button" disabled={actionBusy || !feedbackReady} onClick={() => void saveOptionalFeedback()}>儲存回饋</button>
              </fieldset>
              <button className="button button-link" type="button" disabled={actionBusy} onClick={() => setFeedbackChoice('skip')}>略過</button>
            </div>}
            {(feedbackChoice === 'saved' || feedbackChoice === 'skip') && !submission.next_requested && (
              <div className="form-actions">
                <p>本週教材已結束。準備好時，明確申請下一份。</p>
                <button className="button button-primary" type="button" disabled={actionBusy} onClick={() => void requestNext()}>
                  {actionBusy ? '申請中…' : '申請下一份教材'}
                </button>
              </div>
            )}
            {requestMessage && <p role="status">{requestMessage}</p>}
          </>
        )}
        {actionError && <p className="notice notice-error" role="alert">{actionError}</p>}
      </section>

      {/* Footer Navigation */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        <a className="text-link button-link scoped-material-nav-link" href="/dashboard" onClick={handleInternalLink}>
          ← 查看所有教材與學習紀錄
        </a>
      </div>
    </div>
  )
}
