import { describe, expect, it } from 'vitest'
import type { CurriculumPackage } from '@paper-english/generator'
import { renderCurriculumParentAnswerHtml } from './parent-renderer.js'

describe('parent-renderer', () => {
  const samplePkg = {
    metadata: {
      schemaVersion: '2.2.0',
      jobId: 'kobe-week-2',
      childId: 'child-1',
      weekNumber: 2,
      grade: 7,
      gradeStage: 'grade_7',
      title: 'One Change at a Time',
      generatedAt: '2026-08-12T00:00:00Z',
      curriculumVersion: 'curriculum/2.2.0',
      promptVersion: 'prompt/2.4.0',
      rubricVersion: 'rubric/2.2.0',
      rendererVersion: 'renderer/2.2.0',
      model: 'sample',
      inputFingerprint: 'sha256:sample',
    },
    learningPlan: {
      estimatedMinutes: 90,
      difficultyBand: '國一適中',
      targets: [],
      prerequisites: [],
      reviewStrategy: [],
      personalizationStrategy: 'Robotics inference.',
      exclusions: [],
    },
    studentLesson: {
      opening: { goalsZh: ['目標'], howToUseZh: '用法', warmUp: '想一想' },
      vocabulary: [],
      reading: { title: 'One Change at a Time', contextZh: '情境', paragraphs: ['Text'], wordCount: 4, readingTipsZh: ['提示'], sourceNote: null },
      instruction: [],
      practice: [],
      selfCheckZh: ['檢查'],
      homework: { purposeZh: '作業', estimatedMinutes: 10, questions: [] },
    },
    parentSummary: {
      focusZh: '推論證據與 do / does',
      observeZh: ['是否能自己指出證據', '是否理解 does 後面用原形'],
      completionCheckZh: '確認每一題都有作答即可。',
      personalizationZh: ['上週回饋閱讀偏簡單，本週提高推論深度。'],
    },
    answers: [
      {
        questionId: 'Q1',
        answer: 'A robot.',
        acceptedAnswers: ['The robot', 'A book sorting robot'],
        explanationZh: '文章第一段明確提到 Mina 製作機器人協助書籍分類。',
        likelyMisconceptionZh: '容易誤選 Jay，因為 Jay 是她的夥伴。',
        followUpZh: '請孩子指出文章第一段第一句。',
      },
    ],
  } as unknown as CurriculumPackage

  it('renders answer-first layout with high visibility answers, explanations, and misconception notes', () => {
    const html = renderCurriculumParentAnswerHtml(samplePkg)
    expect(html).toContain('紙屬英文')
    expect(html).toContain('家長答案')
    expect(html).toContain('您不需要講課，也不需要逐題追問')
    expect(html).toContain('推論證據與 do / does')
    expect(html).toContain('是否能自己指出證據')
    expect(html).toContain('確認每一題都有作答即可')
    expect(html).toContain('class="answer-card"')
    expect(html).toContain('class="answer-qid">Q1</div>')
    expect(html).toContain('<strong>答案：</strong>A robot.</div>')
    expect(html).toContain('<strong>也可接受：</strong>The robot；A book sorting robot</div>')
    expect(html).toContain('<strong>簡短理由：</strong>文章第一段明確提到')
    expect(html).toContain('<strong>常見誤區：</strong>容易誤選 Jay')
  })

  it('never assigns heavy teacher burden or displays internal student tracking hypotheses', () => {
    const html = renderCurriculumParentAnswerHtml(samplePkg)
    expect(html).not.toContain('能否獨立完成')
    expect(html).not.toContain('這份教材為什麼這樣安排')
  })
})
