import { useState } from 'react'
import type { StudentMaterialProjection } from '../../../types/student-material'
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
    updateAnswer,
    toggleSelfCheck,
    retrySave,
    resolveConflict,
  } = useMaterialDraft({ materialId: projection.id })

  const [activeChapter, setActiveChapter] = useState<string>('opening')

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
    <div className="paper-reader-container">
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

      {/* Chapter 1: Opening */}
      <OpeningRenderer
        opening={lesson.opening}
        draftAnswers={answers}
        onAnswerChange={updateAnswer}
      />

      {/* Chapter 2: Vocabulary */}
      <VocabularyRenderer vocabulary={lesson.vocabulary} />

      {/* Chapter 3: Reading */}
      <ReadingRenderer
        reading={lesson.reading}
        adaptiveExtension={lesson.adaptiveExtension}
        draftAnswers={answers}
        onAnswerChange={updateAnswer}
      />

      {/* Chapter 4: Instruction / Grammar */}
      <InstructionRenderer instruction={lesson.instruction} />

      {/* Chapter 5: Practice */}
      <PracticeRenderer
        practice={lesson.practice}
        adaptiveExtension={lesson.adaptiveExtension}
        draftAnswers={answers}
        onAnswerChange={updateAnswer}
      />

      {/* Chapter 6: Self-Check */}
      <SelfCheckRenderer
        selfCheckZh={lesson.selfCheckZh}
        draftSelfCheck={selfCheck}
        onToggleSelfCheck={toggleSelfCheck}
      />

      {/* Chapter 7: Homework */}
      <HomeworkRenderer
        homework={lesson.homework}
        draftAnswers={answers}
        onAnswerChange={updateAnswer}
      />

      {/* Footer Navigation */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        <a className="text-link button-link scoped-material-nav-link" href="/dashboard">
          ← 查看所有教材與學習紀錄
        </a>
      </div>
    </div>
  )
}
