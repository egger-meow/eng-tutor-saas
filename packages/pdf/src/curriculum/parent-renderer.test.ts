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
      practice: [
        {
          id: 'practice-1',
          titleZh: '閱讀理解',
          instructionEn: 'Read and answer.',
          questions: [
            {
              id: 'Q1',
              targetIds: ['target-1'],
              itemType: 'detail',
              prompt: 'What did Mina build for the school library?',
              writingLines: 2,
              difficulty: 'on-level',
            },
          ],
        },
      ],
      selfCheckZh: ['檢查'],
      homework: { purposeZh: '作業', estimatedMinutes: 10, questions: [] },
    },
    grounding: {
      sources: [
        {
          id: 'src-1',
          title: 'Musical Instruments Guide',
          publisher: 'Yamaha Musical Instrument Guide',
          url: 'https://example.com/guitar-strings',
          retrievedAt: '2026-08-20T00:00:00Z',
          reliabilityTier: 'primary_authority',
          summary: 'How strings vibrate',
        },
        {
          id: 'src-2',
          title: 'University Physics',
          publisher: 'OpenStax',
          url: 'https://example.com/physics',
          retrievedAt: '2026-08-20T00:00:00Z',
          reliabilityTier: 'primary_authority',
          summary: 'Sound wave physics',
        },
      ],
      facts: [],
      claims: [],
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
    expect(html).toContain('class="answer-qid">Q1</span>')
    expect(html).toContain('class="answer-question-context">— What did Mina build for the school library?</span>')
    expect(html).toContain('<strong>答案：</strong>A robot.</div>')
    expect(html).toContain('<strong>也可接受：</strong>The robot；A book sorting robot</div>')
    expect(html).toContain('<strong>簡短理由：</strong>文章第一段明確提到')
    expect(html).toContain('<strong>常見誤區：</strong>容易誤選 Jay')
  })

  it('renders clean parent-facing source attribution without leaking internal provenance or URLs', () => {
    const html = renderCurriculumParentAnswerHtml(samplePkg)
    expect(html).toContain('本週內容參考：')
    expect(html).toContain('Yamaha Musical Instrument Guide、OpenStax')
    expect(html).not.toContain('src-1')
    expect(html).not.toContain('src-2')
    expect(html).not.toContain('https://example.com')
    expect(html).not.toContain('primary_authority')
  })

  it('never assigns heavy teacher burden or displays internal student tracking hypotheses', () => {
    const html = renderCurriculumParentAnswerHtml(samplePkg)
    expect(html).not.toContain('能否獨立完成')
    expect(html).not.toContain('這份教材為什麼這樣安排')
  })

  it('renders slot-aligned unit answers when unitAnswers are present without layout', () => {
    const pkgWithUnits = {
      ...samplePkg,
      answers: [
        {
          questionId: 'Q1',
          answer: 'Summary Answer',
          acceptedAnswers: [],
          explanationZh: '完整解說',
          likelyMisconceptionZh: null,
          followUpZh: null,
          unitAnswers: [
            { unitId: 'Q1.slot1', answer: 'First observation', explanationZh: '見第一段' },
            { unitId: 'Q1.slot2', answer: 'Second deduction', explanationZh: '見第二段' },
          ],
        },
      ],
    } as unknown as CurriculumPackage

    const html = renderCurriculumParentAnswerHtml(pkgWithUnits)
    expect(html).toContain('class="unit-answers-card"')
    expect(html).toContain('分格答案：')
    expect(html).toContain('[Q1.slot1]')
    expect(html).toContain('First observation')
    expect(html).toContain('(見第一段)')
    expect(html).toContain('[Q1.slot2]')
    expect(html).toContain('Second deduction')
    expect(html).toContain('(見第二段)')
  })

  it('renders completed table structure with filled slot answers and per-unit accepted variants', () => {
    const pkgWithTable = {
      ...samplePkg,
      studentLesson: {
        ...samplePkg.studentLesson,
        practice: [
          {
            id: 'practice-table',
            titleZh: '變因分析',
            questions: [
              {
                id: 'P2',
                itemType: 'short-response',
                prompt: 'Complete the table below to compare the three guitar string variables.',
                writingLines: 0,
                responseLayout: {
                  type: 'organizer',
                  headers: ['Feature', 'What changes?', 'What stays the same?', 'Pitch result'],
                  rows: [
                    {
                      label: 'String Thickness',
                      cells: [
                        { responseUnitId: 'P2.thickness.changes', placeholder: 'thickness' },
                        { text: 'tension and length' },
                        { responseUnitId: 'P2.thickness.pitch', placeholder: 'pitch' },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
      answers: [
        {
          questionId: 'P2',
          answer: 'Completed table comparing guitar string physics.',
          acceptedAnswers: [],
          explanationZh: '控制變因時僅能改變一項條件。',
          likelyMisconceptionZh: null,
          followUpZh: null,
          unitAnswers: [
            {
              unitId: 'P2.thickness.changes',
              answer: 'thickness increases',
              acceptedAnswers: ['thicker string', 'using a heavy gauge'],
              explanationZh: '弦變粗',
            },
            {
              unitId: 'P2.thickness.pitch',
              answer: 'lower pitch',
              acceptedAnswers: ['pitch decreases', 'frequency drops'],
              explanationZh: '振動頻率降低',
            },
          ],
        },
      ],
    } as unknown as CurriculumPackage

    const html = renderCurriculumParentAnswerHtml(pkgWithTable)
    expect(html).toContain('class="parent-structured-answer-wrapper"')
    expect(html).toContain('完成對照表：')
    expect(html).toContain('class="response-organizer-table"')
    expect(html).toContain('<th>Feature</th>')
    expect(html).toContain('<th>What changes?</th>')
    expect(html).toContain('<th>What stays the same?</th>')
    expect(html).toContain('<th>Pitch result</th>')
    expect(html).toContain('class="organizer-row-label">String Thickness</td>')
    expect(html).toContain('class="organizer-cell organizer-filled-slot"')
    expect(html).toContain('[P2.thickness.changes]')
    expect(html).toContain('thickness increases')
    expect(html).toContain('也可：thicker string / using a heavy gauge')
    expect(html).toContain('弦變粗')
    expect(html).toContain('tension and length')
    expect(html).toContain('[P2.thickness.pitch]')
    expect(html).toContain('lower pitch')
  })

  it('renders completed sequence structure with filled slot answers in Parent view', () => {
    const pkgWithSequence = {
      ...samplePkg,
      studentLesson: {
        ...samplePkg.studentLesson,
        practice: [
          {
            id: 'practice-seq',
            titleZh: '實驗流程',
            questions: [
              {
                id: 'S1',
                itemType: 'sequence',
                prompt: 'Trace the testing sequence.',
                writingLines: 0,
                responseLayout: {
                  type: 'sequence',
                  layoutDirection: 'horizontal',
                  items: [
                    { stepNumber: 1, label: 'Preparation', content: 'Calibrate sensors' },
                    { stepNumber: 2, label: 'Execution', responseUnitId: 'S1.step2', placeholder: 'Run test' },
                  ],
                },
              },
            ],
          },
        ],
      },
      answers: [
        {
          questionId: 'S1',
          answer: 'Run test sequence.',
          acceptedAnswers: [],
          explanationZh: '流程步驟',
          likelyMisconceptionZh: null,
          followUpZh: null,
          unitAnswers: [
            {
              unitId: 'S1.step2',
              answer: 'Measure sorting accuracy under low light',
              acceptedAnswers: ['Record lighting error'],
              explanationZh: '測試記錄步驟',
            },
          ],
        },
      ],
    } as unknown as CurriculumPackage

    const html = renderCurriculumParentAnswerHtml(pkgWithSequence)
    expect(html).toContain('class="parent-structured-answer-wrapper"')
    expect(html).toContain('完成流程：')
    expect(html).toContain('class="response-sequence-container')
    expect(html).toContain('class="sequence-filled-slot"')
    expect(html).toContain('(S1.step2)')
    expect(html).toContain('Measure sorting accuracy under low light')
    expect(html).toContain('也可：Record lighting error')
    expect(html).toContain('測試記錄步驟')
  })
})
