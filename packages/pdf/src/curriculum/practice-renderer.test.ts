import { describe, expect, it } from 'vitest'
import { renderPracticeStages, renderSelfCheckSection, renderHomeworkSection } from './practice-renderer.js'
import { renderQuestionCard } from './question-renderer.js'

describe('question-renderer', () => {
  it('renders a multiple-choice question with option markers (A), (B), (C), (D) and no leaked internal difficulty', () => {
    const q = {
      id: 'C1',
      targetIds: ['reading-inference'],
      itemType: 'inference' as const,
      prompt: 'What can we learn about Mina from the story?',
      options: [
        'She changes one thing to understand the result.',
        'She never records any result.',
        'She wants to stop the work.',
        'She changes every part without a plan.',
      ],
      writingLines: 0,
      difficulty: 'on-level' as const,
    }

    const html = renderQuestionCard(q)
    expect(html).toContain('class="question-qid">C1</div>')
    expect(html).not.toContain('· on-level')
    expect(html).not.toContain('on-level')
    expect(html).toContain('What can we learn about Mina from the story?')
    expect(html).toContain('(A)')
    expect(html).toContain('She changes one thing to understand the result.')
    expect(html).toContain('(B)')
    expect(html).toContain('(C)')
    expect(html).toContain('(D)')
    expect(html).not.toContain('class="writing-line"')
  })

  it('renders short-response questions with writing lines', () => {
    const q = {
      id: 'P1',
      targetIds: ['sentence-production'],
      itemType: 'sentence-production' as const,
      prompt: 'Write one sentence explaining a change you would test.',
      writingLines: 3,
      difficulty: 'stretch' as const,
    }

    const html = renderQuestionCard(q)
    expect(html).toContain('class="question-qid">P1</div>')
    expect(html).not.toContain('stretch')
    expect(html).toContain('Write one sentence explaining a change you would test.')
    const lineMatches = html.match(/class="writing-line"/g)
    expect(lineMatches).toHaveLength(3)
  })
})

describe('practice-renderer', () => {
  it('renders practice stages with stage badges and hint boxes when present', () => {
    const stages = [
      {
        id: 'guided',
        stage: 'guided' as const,
        titleZh: '跟著線索讀',
        instructionsZh: '先圈出文章中的證據。',
        hintZh: '先找第二段和第三段。',
        questions: [
          {
            id: 'G1',
            targetIds: ['reading-detail'],
            itemType: 'detail' as const,
            prompt: 'What problem does the camera have?',
            writingLines: 2,
            difficulty: 'supported' as const,
          },
        ],
      },
      {
        id: 'cap',
        stage: 'cap-transfer' as const,
        titleZh: '會考型閱讀轉移',
        instructionsZh: '比較四個選項，找出最完整的證據。',
        hintZh: null,
        questions: [
          {
            id: 'C1',
            targetIds: ['reading-inference'],
            itemType: 'inference' as const,
            prompt: 'What can we learn about Mina?',
            options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
            writingLines: 0,
            difficulty: 'on-level' as const,
          },
        ],
      },
    ]

    const html = renderPracticeStages(stages)
    expect(html).toContain('class="stage-badge guided">跟著示範</span>')
    expect(html).toContain('跟著線索讀')
    expect(html).toContain('先圈出文章中的證據。')
    expect(html).toContain('class="stage-hint-box"')
    expect(html).toContain('<strong>提示：</strong>先找第二段和第三段。')
    expect(html).toContain('class="stage-badge cap-transfer">會考型轉移</span>')
    expect(html).toContain('會考型閱讀轉移')
  })

  it('renders self-check section with checkboxes and reflection space', () => {
    const selfCheck = ['我能為答案圈出文章證據。', '我記得 does 後面用原形動詞。']
    const html = renderSelfCheckSection(selfCheck)
    expect(html).toContain('<h2>自我檢核</h2>')
    expect(html).toContain('我能為答案圈出文章證據。')
    expect(html).toContain('我記得 does 後面用原形動詞。')
    expect(html).toContain('class="selfcheck-box"')
  })

  it('renders homework section with delayed retrieval banner and page break', () => {
    const homework = {
      purposeZh: '隔一天再提取本週重點。',
      estimatedMinutes: 15,
      questions: [
        {
          id: 'H1',
          targetIds: ['vocab-review'],
          itemType: 'sentence-production' as const,
          prompt: 'Use the word camera in a sentence.',
          writingLines: 2,
          difficulty: 'on-level' as const,
        },
      ],
    }

    const html = renderHomeworkSection(homework)
    expect(html).toContain('class="homework-section page-break"')
    expect(html).toContain('帶走一點，隔天再想一次')
    expect(html).toContain('隔一天再提取本週重點。（預計 15 分鐘）')
    expect(html).toContain('Use the word camera in a sentence.')
  })
})
