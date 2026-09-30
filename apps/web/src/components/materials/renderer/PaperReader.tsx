import { useEffect, useState } from 'react'
import { AnswerReadOnlyContext } from './AnswerReadOnlyContext'
import type { StudentMaterialProjection } from '../../../types/student-material'
import { fetchStudentSubmission, submitStudentMaterial, saveStudentParentFeedback, requestNextAfterSubmission, type SubmissionResult } from '../../../lib/student-material-api'
import { useMaterialDraft } from '../../../hooks/use-material-draft'
import { OpeningRenderer } from './OpeningRenderer'
import { VocabularyRenderer } from './VocabularyRenderer'
import { ReadingRenderer } from './ReadingRenderer'
import { InstructionRenderer } from './InstructionRenderer'
import { PracticeRenderer } from './PracticeRenderer'
import { SelfCheckRenderer } from './SelfCheckRenderer'
import { HomeworkRenderer } from './HomeworkRenderer'

export interface PaperReaderProps {
  projection: StudentMaterialProjection
  studentPdfUrl?: string | null
  onSwitchToPdf?: () => void
}

export function PaperReader({
  projection,
  studentPdfUrl,
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
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [feedbackChoice, setFeedbackChoice] = useState<'ask' | 'form' | 'skip' | 'saved'>('ask')
  const [requestMessage, setRequestMessage] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [weakArea, setWeakArea] = useState('')
  const [comments, setComments] = useState('')

  useEffect(() => {
    let active = true
    setSubmissionLoading(true)
    void fetchStudentSubmission(projection.material_id).then((result) => {
      if (active) {
        setSubmission(result)
        if (result?.next_requested) {
          setFeedbackChoice('skip')
          setRequestMessage('已收到下一份申請。')
        }
      }
    }).catch(() => { if (active) setActionError('提交狀態暫時無法載入，請重新整理。') })
      .finally(() => { if (active) setSubmissionLoading(false) })
    return () => { active = false }
  }, [projection.material_id])

  async function submitWholeMaterial() {
    if (actionBusy || status !== 'saved' || hasConflict || submission) return
    if (!window.confirm('可提交部分完成的教材。提交後無法修改作答，現在要送出嗎？')) return
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
    setActionBusy(true)
    setActionError('')
    try {
      const answered = submission?.results.filter((result) => result.status !== 'unanswered').length ?? 0
      const total = submission?.results.length ?? 0
      await saveStudentParentFeedback(projection.material_id, {
        difficulty, completionRate: total ? Math.round(answered * 4 / total) * 25 : 0,
        weakArea: weakArea || null, comments,
      })
      setFeedbackChoice('saved')
    } catch { setActionError('回饋未儲存，請再試一次。') }
    finally { setActionBusy(false) }
  }

  async function requestNext() {
    setActionBusy(true)
    setActionError('')
    try {
      const result = await requestNextAfterSubmission(projection.material_id)
      if (result.requested) setRequestMessage('已收到下一份申請。')
      else if (result.reason === 'MONTHLY_LIMIT') setRequestMessage(`本服務月已使用 ${result.used ?? 4}/${result.limit ?? 4} 份，下個服務月可再申請。`)
      else setRequestMessage('目前無法申請下一份，請稍後再試。')
    } catch { setActionError('下一份申請失敗，請稍後重試。') }
    finally { setActionBusy(false) }
  }

  const lesson = projection.student_lesson ?? {}

  function handleChapterClick(id: string) {
    setActiveChapter(id)
    const element = document.getElementById(`chapter-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      {isInitialLoading && <p role="status">正在載入作答草稿…</p>}
      {/* Sticky Top Toolbar with Save Status & Quick Navigation */}
      <header className="paper-reader-toolbar" role="region" aria-label="教材閱讀工具列">
        <div className="paper-reader-toolbar-left">
          <div className="paper-reader-title-badge">
            <span>{projection.child_name}</span>
            <span style={{ color: 'var(--color-rule-strong)' }}>·</span>
            <span>Week {projection.week_number}</span>
          </div>

          {/* Save Status Badge */}
          <div className={`paper-save-status status-${status}`} role="status">
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
          </div>
        </div>

        <div className="paper-reader-toolbar-right">
          {onSwitchToPdf && (
            <button
              type="button"
              className="button button-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}
              onClick={onSwitchToPdf}
            >
              📄 切換列印版 PDF
            </button>
          )}

          {studentPdfUrl && (
            <a
              href={studentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}
            >
              ⬇ 下載紙本 PDF
            </a>
          )}
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

      {/* Conflict Resolution Banner */}
      {hasConflict && (
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

      <AnswerReadOnlyContext.Provider value={Boolean(submission) || actionBusy}>
      {/* Chapter 1: Opening */}
      <OpeningRenderer
        opening={lesson.opening}
        draftAnswers={submission?.answers ?? answers}
        onAnswerChange={updateAnswer}
      />

      {/* Chapter 2: Vocabulary */}
      <VocabularyRenderer vocabulary={lesson.vocabulary} />

      {/* Chapter 3: Reading */}
      <ReadingRenderer
        reading={lesson.reading}
        adaptiveExtension={lesson.adaptiveExtension}
        draftAnswers={submission?.answers ?? answers}
        onAnswerChange={updateAnswer}
      />

      {/* Chapter 4: Instruction / Grammar */}
      <InstructionRenderer instruction={lesson.instruction} />

      {/* Chapter 5: Practice */}
      <PracticeRenderer
        practice={lesson.practice}
        adaptiveExtension={lesson.adaptiveExtension}
        draftAnswers={submission?.answers ?? answers}
        onAnswerChange={updateAnswer}
      />

      {/* Chapter 6: Self-Check */}
      <SelfCheckRenderer
        selfCheckZh={lesson.selfCheckZh}
        draftSelfCheck={submission?.self_check ?? selfCheck}
        onToggleSelfCheck={toggleSelfCheck}
      />

      {/* Chapter 7: Homework */}
      <HomeworkRenderer
        homework={lesson.homework}
        draftAnswers={submission?.answers ?? answers}
        onAnswerChange={updateAnswer}
      />
      </AnswerReadOnlyContext.Provider>

      <section className="paper-sheet paper-completion" aria-label="完成本週教材">
        <h2 className="paper-section-title">完成本週教材</h2>
        {!submission && (
          <>
            <p>可以只完成一部分。未作答的題目會標為「未作答」，不算答錯；整份提交後才能查看客觀題正解。</p>
            <button className="button button-primary" type="button" onClick={() => void submitWholeMaterial()}
              disabled={actionBusy || isInitialLoading || submissionLoading || status !== 'saved' || hasConflict}>
              {actionBusy ? '提交中…' : '提交整份教材'}
            </button>
            {status !== 'saved' && <p className="muted">請等待草稿完成儲存後再提交。</p>}
          </>
        )}
        {submission && (
          <>
            <p role="status">已於 {new Date(submission.submitted_at).toLocaleString('zh-TW')} 提交。本次作答已鎖定。</p>
            <ul>
              {submission.results.map((result) => (
                <li key={result.question_id}>
                  {result.question_id}：{{ correct: '答對', incorrect: '答錯', unanswered: '未作答', open_review: '開放題待參考' }[result.status]}
                  {result.correct_answer && <> · 正解：{result.correct_answer}</>}
                </li>
              ))}
            </ul>
            {feedbackChoice === 'ask' && <div className="form-actions">
              <p>要補充家長回饋嗎？這是選填。</p>
              <button className="button button-secondary" type="button" onClick={() => setFeedbackChoice('form')}>填寫回饋</button>
              <button className="button button-secondary" type="button" onClick={() => setFeedbackChoice('skip')}>略過回饋</button>
            </div>}
            {feedbackChoice === 'form' && <div className="feedback-form">
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
              <label>其他觀察（選填）
                <textarea maxLength={2000} value={comments} onChange={(event) => setComments(event.target.value)} />
              </label>
              <button className="button button-secondary" type="button" disabled={actionBusy} onClick={() => void saveOptionalFeedback()}>儲存回饋</button>
              <button className="button button-link" type="button" onClick={() => setFeedbackChoice('skip')}>略過</button>
            </div>}
            {(feedbackChoice === 'saved' || feedbackChoice === 'skip') && !requestMessage && (
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
        <a className="text-link button-link scoped-material-nav-link" href="/dashboard">
          ← 查看所有教材與學習紀錄
        </a>
      </div>
    </div>
  )
}
