import { describe, expect, it } from 'vitest'
import { renderReadingSection } from './reading-renderer.js'

describe('reading-renderer', () => {
  it('renders standard article / narrative paragraphs with serif styling and reading tips', () => {
    const reading = {
      title: 'Journey to the Mountain',
      contextZh: '這是一篇關於登山的冒險故事。',
      genre: 'narrative' as const,
      blocks: [
        { type: 'paragraph' as const, text: 'Leo packed his backpack at dawn.' },
        { type: 'paragraph' as const, text: 'The trail was steep, but the air was fresh.' },
      ],
      wordCount: 150,
      readingTipsZh: ['注意轉折詞 but 的用法', '圈出描寫天氣的字詞'],
      sourceNote: 'Youth Adventure Magazine',
    }

    const html = renderReadingSection(reading)
    expect(html).toContain('閱讀：Journey to the Mountain')
    expect(html).toContain('這是一篇關於登山的冒險故事。')
    expect(html).toContain('<strong>讀法提示：</strong>注意轉折詞 but 的用法；圈出描寫天氣的字詞')
    expect(html).toContain('Leo packed his backpack at dawn.')
    expect(html).toContain('class="reading-paragraph"')
    expect(html).toContain('資料來源：Youth Adventure Magazine')
  })

  it('renders dialogue blocks with conversational speaker labels and proper alignment', () => {
    const reading = {
      title: 'Planning the Robot Experiment',
      contextZh: 'Mina 和 Jay 在討論實驗步驟。',
      genre: 'dialogue' as const,
      blocks: [
        { type: 'dialogue' as const, speaker: 'Mina', text: 'Why did the robot miss the blue book?' },
        { type: 'dialogue' as const, speaker: 'Jay', text: 'Maybe the light above the camera is too bright.' },
      ],
      wordCount: 120,
      readingTipsZh: ['觀察兩人的不同觀點'],
    }

    const html = renderReadingSection(reading)
    expect(html).toContain('class="dialogue-container"')
    expect(html).toContain('class="dialogue-speaker">Mina:</div>')
    expect(html).toContain('class="dialogue-text">Why did the robot miss the blue book?</div>')
    expect(html).toContain('class="dialogue-speaker">Jay:</div>')
  })

  it('renders notice blocks with authentic bulletin structure', () => {
    const reading = {
      title: 'School Science Fair Notice',
      contextZh: '學校科學展覽的報名須知。',
      genre: 'notice' as const,
      blocks: [
        { type: 'notice' as const, heading: 'Important Deadline', text: 'All project proposals must be submitted before Friday 5 PM.' },
        { type: 'notice' as const, heading: 'Location & Time', text: 'Room 302, Activity Center, from 9:00 AM to 4:00 PM.' },
      ],
      wordCount: 130,
      readingTipsZh: ['注意截止日期與繳交地點'],
    }

    const html = renderReadingSection(reading)
    expect(html).toContain('class="notice-card"')
    expect(html).toContain('class="notice-heading">Important Deadline</div>')
    expect(html).toContain('All project proposals must be submitted before Friday 5 PM.')
  })

  it('renders schedule rows as a clean, structured table', () => {
    const reading = {
      title: 'Robotics Workshop Schedule',
      contextZh: '一日機器人工作坊日程表。',
      genre: 'schedule' as const,
      blocks: [
        { type: 'schedule-row' as const, timeOrStep: '09:00 - 10:30', event: 'Sensor Calibration', detail: 'Calibrate camera sensors under room lighting' },
        { type: 'schedule-row' as const, timeOrStep: '10:45 - 12:00', event: 'Color Sorting Test', detail: 'Run trial with 50 book covers' },
      ],
      wordCount: 140,
      readingTipsZh: ['快速檢索特定時段的活動內容'],
    }

    const html = renderReadingSection(reading)
    expect(html).toContain('class="schedule-table"')
    expect(html).toContain('09:00 - 10:30')
    expect(html).toContain('Sensor Calibration')
    expect(html).toContain('Calibrate camera sensors under room lighting')
  })

  it('handles legacy paragraphs array gracefully', () => {
    const reading = {
      title: 'Legacy Passage',
      contextZh: '相容舊版段落陣列。',
      paragraphs: ['First paragraph of legacy text.', 'Second paragraph of legacy text.'],
      wordCount: 100,
      readingTipsZh: ['注意主旨'],
    }

    const html = renderReadingSection(reading)
    expect(html).toContain('First paragraph of legacy text.')
    expect(html).toContain('Second paragraph of legacy text.')
  })

  it('deterministically highlights target vocabulary and its inflections without LLM markup', () => {
    const reading = {
      title: 'The Robotics Trial',
      contextZh: '機器人測試。',
      blocks: [
        { type: 'paragraph' as const, text: 'Mina tests the robot. Jay suggests changing the camera, and she recorded all results.' },
      ],
      wordCount: 15,
      readingTipsZh: ['注意動詞變化'],
    }

    const targetVocab = [
      { word: 'test' },
      { word: 'suggest' },
      { word: 'record' },
    ]

    const html = renderReadingSection(reading, targetVocab)
    expect(html).toContain('<span class="target-vocab">tests</span>')
    expect(html).toContain('<span class="target-vocab">suggests</span>')
    expect(html).toContain('<span class="target-vocab">recorded</span>')
    expect(html).not.toContain('<b>')
  })

  it('deterministically highlights validated concrete grammar patterns alongside vocabulary', () => {
    const reading = {
      title: 'The Robotics Trial',
      contextZh: '機器人測試。',
      blocks: [
        { type: 'paragraph' as const, text: 'Does the machine work? It does not fail when Mina changes the light.' },
      ],
      wordCount: 15,
      readingTipsZh: ['注意 do/does 助動詞句型'],
    }

    const targetVocab = [{ word: 'machine' }, { word: 'change' }]
    const targetPatterns = ['does not', 'Does the machine']

    const html = renderReadingSection(reading, targetVocab, targetPatterns)
    expect(html).toContain('<span class="target-vocab">changes</span>')
    expect(html).toContain('<span class="target-grammar">does not</span>')
  })
})
