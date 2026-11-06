import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LearningStartPanel } from './LearningStartPanel'
import { buildMaterialSessionPlan } from '../../../lib/material-session-plan'
import type { StudentLesson } from '../../../types/student-material'

describe('LearningStartPanel', () => {
  const mockLesson: StudentLesson = {
    reading: { passage: 'Short passage' },
    instruction: [{ id: 'grammar-1', titleZh: '文法' }],
    practice: [
      {
        id: 'p1',
        titleZh: '練習',
        questions: [
          { id: 'q1', prompt: 'Question 1' },
          { id: 'q2', prompt: 'Question 2' },
          { id: 'q3', prompt: 'Question 3' },
        ],
      },
    ],
  }

  it('renders 10-minute prompt with 3 stage chips and actions', () => {
    const plan = buildMaterialSessionPlan(mockLesson)
    const html = renderToStaticMarkup(
      <LearningStartPanel
        plan={plan}
        answers={{}}
        saveStatus="saved"
        onJumpToChapter={vi.fn()}
        onJumpToQuestion={vi.fn()}
        onPauseAndLeave={vi.fn()}
      />
    )

    expect(html).toContain('今天先安排約 10 分鐘')
    expect(html).toContain('先讀這一段，再試前兩題')
    expect(html).toContain('先讀這一段')
    expect(html).toContain('試試前兩題')
    expect(html).toContain('先停，之後繼續')
    expect(html).toContain('① 先讀先試 (約 10 分鐘)')
    expect(html).toContain('② 理解與練習')
    expect(html).toContain('草稿已同步，可在其他裝置接續')
  })

  it('shows the next stage on return and warns when saving failed', () => {
    const html = renderToStaticMarkup(<LearningStartPanel
      plan={buildMaterialSessionPlan(mockLesson)} answers={{ q1: 'A', q2: 'B' }} saveStatus="error"
      onJumpToChapter={vi.fn()} onJumpToQuestion={vi.fn()} onPauseAndLeave={vi.fn()}
    />)
    expect(html).toContain('接著完成這一段')
    expect(html).toContain('接續 1 題')
    expect(html).toContain('尚未同步的內容可能無法接續')
    expect(html).not.toContain('草稿已同步，可在其他裝置接續')
  })

  it('offers review without auto-submitting when answers are filled', () => {
    const html = renderToStaticMarkup(<LearningStartPanel
      plan={buildMaterialSessionPlan(mockLesson)} answers={{ q1: 'A', q2: 'B', q3: 'C' }} saveStatus="saved"
      onJumpToChapter={vi.fn()} onJumpToQuestion={vi.fn()} onPauseAndLeave={vi.fn()}
    />)
    expect(html).toContain('作答已填寫，可以回顧檢查')
    expect(html).not.toContain('接著作答')
    expect(html).toContain('再自行提交整份教材')
  })

  it('does not render when isReadOnly is true', () => {
    const plan = buildMaterialSessionPlan(mockLesson)
    const html = renderToStaticMarkup(
      <LearningStartPanel
        plan={plan}
        answers={{}}
        saveStatus="saved"
        isReadOnly={true}
        onJumpToChapter={vi.fn()}
        onJumpToQuestion={vi.fn()}
        onPauseAndLeave={vi.fn()}
      />
    )

    expect(html).toBe('')
  })

  it('adjusts text when only one question exists in stage 1', () => {
    const oneQuestionLesson: StudentLesson = {
      reading: { passage: 'Text' },
      practice: [
        {
          id: 'p1',
          titleZh: '練習',
          questions: [{ id: 'single-q', prompt: 'Only one' }],
        },
      ],
    }
    const plan = buildMaterialSessionPlan(oneQuestionLesson)
    const html = renderToStaticMarkup(
      <LearningStartPanel
        plan={plan}
        answers={{}}
        saveStatus="saved"
        onJumpToChapter={vi.fn()}
        onJumpToQuestion={vi.fn()}
        onPauseAndLeave={vi.fn()}
      />
    )

    expect(html).toContain('再試第1題')
    expect(html).toContain('試第 1 題')
  })

  it('omits question action when no questions exist', () => {
    const noQuestionsLesson: StudentLesson = {
      reading: { passage: 'Reading only' },
    }
    const plan = buildMaterialSessionPlan(noQuestionsLesson)
    const html = renderToStaticMarkup(
      <LearningStartPanel
        plan={plan}
        answers={{}}
        saveStatus="saved"
        onJumpToChapter={vi.fn()}
        onJumpToQuestion={vi.fn()}
        onPauseAndLeave={vi.fn()}
      />
    )

    expect(html).toContain('今天先不用做題')
    expect(html).not.toContain('試試前兩題')
    expect(html).not.toContain('試第 1 題')
    expect(html).toContain('先讀這一段')
  })
})
