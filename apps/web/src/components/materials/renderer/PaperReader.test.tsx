import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PaperReader } from './PaperReader'
import type { StudentMaterialProjection } from '../../../types/student-material'

// Mock Supabase client to avoid network in static tests
vi.mock('../../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { answers: {}, self_check: [], version: 0, updated_at: null },
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: { saved: true, version: 1, updated_at: '2026-09-29T10:00:00Z', conflict: false },
        error: null,
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/pdf' }, error: null }),
      }),
    },
  }),
}))

describe('PaperReader Component Suite', () => {
  const sampleProjection: StudentMaterialProjection = {
    id: 'mat-test-1',
    child_id: 'child-test-1',
    child_name: 'Jonathan',
    material_week: '2026-09-28',
    week_number: 4,
    revision: 1,
    title: 'Sound and Vibration in Video Games',
    student_pdf_path: 'materials/test/student.pdf',
    release_at: '2026-09-28T12:00:00Z',
    student_lesson: {
      opening: {
        goalsZh: ['學會辨識聲音與介系詞搭配', '掌握空間介系詞 at / on / in', '閱讀遊戲音效專題文章'],
        howToUseZh: '請先閱讀導讀，聆聽單字發音，再挑戰練習。',
        activity: {
          type: 'observation',
          titleZh: '觀察介系詞的定位方式',
          examples: ['The sound is at your left.', 'Footsteps on the wooden floor.'],
          noticeZh: '注意不同介系詞所代表的空間維度',
        },
      },
      vocabulary: [
        {
          id: 'v1',
          word: 'vibration',
          partOfSpeech: 'n.',
          meaningZh: '振動；震顫',
          pronunciationHint: 'vaɪˈbreɪʃən',
          exampleEn: 'You can feel the vibration of the speaker.',
          exampleZh: '你可以感覺到喇叭的震動。',
          status: 'new',
        },
        {
          id: 'v2',
          word: 'surround',
          partOfSpeech: 'v.',
          meaningZh: '圍繞；包圍',
          pronunciationHint: 'səˈraʊnd',
          exampleEn: 'The trees surround the lake.',
          exampleZh: '樹木環繞著湖泊。',
          status: 'review',
        },
      ],
      reading: {
        title: 'How Games Place Sound in 3D Space',
        genre: 'article',
        wordCount: 320,
        contextZh: '探索電玩開發者如何利用雙耳時間差營造真實定位感',
        readingTipsZh: ['留意各段落的主題句', '找尋介系詞在方向描述中的角色'],
        blocks: [
          { type: 'paragraph', text: 'When you play a modern game with headphones, audio is not just left or right.' },
          { type: 'dialogue', speaker: 'Sound Designer Leo', text: 'We calculate the slight delay between your ears.' },
          { type: 'notice', heading: 'Sound Test Alert', text: 'Please turn on Spatial Audio before this chapter.' },
          { type: 'schedule-row', timeOrStep: 'Step 1', event: 'Frequency test', detail: '20Hz - 20kHz' },
        ],
      },
      adaptiveExtension: {
        id: 'ext-1',
        placement: 'after-reading',
        purpose: 'reasoning',
        titleZh: '物理現象與大腦定位推理',
        contentZh: '大腦是如何透過微秒等級的時間差辨識聲音來源？',
        taskZh: '試著用中文總結大腦判斷聲音前後方向的關鍵線索。',
        taskWritingLines: 3,
      },
      instruction: [
        {
          id: 'topic-prepositions',
          titleZh: '空間介系詞精析 (at, on, in)',
          blocks: [
            { type: 'prose', titleZh: '空間概念總結', textZh: 'at 代表點，on 代表面，in 代表立體空間或範圍。' },
            { type: 'bullets', titleZh: '常見情境', itemsZh: ['at the bus stop', 'on the wall', 'in the room'] },
            {
              type: 'comparison',
              titleZh: '介系詞維度對照表',
              headers: ['介系詞', '維度', '核心意象'],
              rows: [
                ['at', '零維 / 點', '精確位置或地標'],
                ['on', '二維 / 面', '接觸平面或線條'],
                ['in', '三維 / 體', '包含於立體空間內'],
              ],
              takeawayZh: '從點到面再到立體空間，層次分明。',
            },
            { type: 'steps', titleZh: '解題三步驟', itemsZh: ['辨識名詞特質', '判斷點面體', '帶入最貼切介系詞'] },
            { type: 'worked-example', titleZh: '會考經典題型分析', example: 'Meet me ___ the corner.', walkthroughZh: 'corner 是街道上的交叉點，故選 at。' },
            { type: 'error-analysis', titleZh: '易混淆陷阱', wrong: 'I live at Taipei.', corrected: 'I live in Taipei.', whyZh: 'Taipei 是一座城市的大範圍立體地理空間，應使用 in。' },
          ],
        },
      ],
      practice: [
        {
          id: 'stage-guided',
          stage: 'guided',
          titleZh: '引導練習 · 空間介系詞精準選擇',
          instructionsZh: '閱讀題目情境，選出最符合空間維度的介系詞。',
          hintZh: '注意名詞是點、平面還是立體容器。',
          questions: [
            {
              id: 'q-mc-1',
              prompt: 'The cat was sleeping comfortably ___ the soft rug.',
              itemType: 'grammar',
              options: ['at', 'on', 'in', 'to'],
            },
            {
              id: 'q-table-1',
              prompt: '將下列物體依其適用的介系詞填入對應表格：',
              itemType: 'grammar',
              responseLayout: {
                type: 'table',
                headers: ['空間類型', '適用介系詞', '範例填答'],
                rows: [
                  {
                    label: '平面',
                    values: ['on'],
                    cells: [{ responseUnitId: 'u-table-1', placeholder: '例如 the desk...' }],
                  },
                ],
              },
            },
          ],
        },
      ],
      selfCheckZh: [
        '我能正確分辨 at（點）、on（面）、in（體）的空間差異。',
        '我能讀懂雙耳時間差對聲音定位的運作原理。',
        '我已掌握本週 2 個核心字彙的用法與發音。',
      ],
      homework: {
        purposeZh: '隔日記憶提取作業：運用空間介系詞描繪自己房間的擺設。',
        estimatedMinutes: 20,
        questions: [
          {
            id: 'q-hw-1',
            prompt: 'Write three sentences describing your study desk using at, on, and in.',
            itemType: 'sentence-production',
            writingLines: 3,
          },
        ],
      },
    },
  }

  it('1. renders all 7 curriculum chapters with warm paper headers and structure', () => {
    const html = renderToStaticMarkup(
      <PaperReader projection={sampleProjection} studentPdfUrl="https://example.com/student.pdf" />
    )

    // Header info
    expect(html).toContain('Jonathan')
    expect(html).toContain('Week 4')

    // 7 Chapters
    expect(html).toContain('Step 1 · 學習導讀')
    expect(html).toContain('課前引導與學習目標')
    expect(html).toContain('Step 2 · 核心字彙')
    expect(html).toContain('本週精選單字與例句')
    expect(html).toContain('Step 3 · 主題閱讀')
    expect(html).toContain('How Games Place Sound in 3D Space')
    expect(html).toContain('Step 4 · 文法與句構焦點')
    expect(html).toContain('核心語言規則精析')
    expect(html).toContain('Step 5 · 綜合演練')
    expect(html).toContain('課堂實戰與理解檢核')
    expect(html).toContain('Step 6 · 學習檢核')
    expect(html).toContain('自我學習狀態檢核')
    expect(html).toContain('Step 7 · 延遲提取作業')
    expect(html).toContain('課後自主複習與產出作業')
  })

  it('2. strictly enforces student data security: zero answer leakage in DOM', () => {
    const html = renderToStaticMarkup(
      <PaperReader projection={sampleProjection} studentPdfUrl="https://example.com/student.pdf" />
    )

    // Ensure answers, teacher keys, parent answer solutions never leak into student reader
    expect(html).not.toContain('"answers":')
    expect(html).not.toContain('parentSummary')
    expect(html).not.toContain('qualityEvidence')
    expect(html).not.toContain('criticFindings')
    expect(html).not.toContain('likelyMisconceptionZh')
  })

  it('3. renders interactive multiple choice options with A/B/C/D round cards', () => {
    const html = renderToStaticMarkup(
      <PaperReader projection={sampleProjection} studentPdfUrl="https://example.com/student.pdf" />
    )

    expect(html).toContain('The cat was sleeping comfortably ___ the soft rug.')
    expect(html).toContain('option-card')
    expect(html).toContain('option-badge')
    expect(html).toContain('>A<')
    expect(html).toContain('>B<')
    expect(html).toContain('>C<')
    expect(html).toContain('>D<')
    expect(html).toContain('>at<')
    expect(html).toContain('>on<')
    expect(html).toContain('>in<')
    expect(html).toContain('>to<')
  })

  it('4. renders structured response layout (table grid with input)', () => {
    const html = renderToStaticMarkup(
      <PaperReader projection={sampleProjection} studentPdfUrl="https://example.com/student.pdf" />
    )

    expect(html).toContain('response-grid-table')
    expect(html).toContain('例如 the desk...')
    expect(html).toContain('response-grid-input')
  })

  it('5. renders vocabulary pronunciation buttons and POS tags', () => {
    const html = renderToStaticMarkup(
      <PaperReader projection={sampleProjection} studentPdfUrl="https://example.com/student.pdf" />
    )

    expect(html).toContain('vibration')
    expect(html).toContain('[n.]')
    expect(html).toContain('振動；震顫')
    expect(html).toContain('/vaɪˈbreɪʃən/')
    expect(html).toContain('surround')
    expect(html).toContain('[v.]')
  })

  it('6. gracefully handles unknown question types without crashing', () => {
    const projectionWithUnknownQuestion: StudentMaterialProjection = {
      ...sampleProjection,
      student_lesson: {
        ...sampleProjection.student_lesson,
        practice: [
          {
            id: 'stage-unknown',
            titleZh: '新穎實驗題型',
            questions: [
              {
                id: 'q-future-type',
                prompt: 'Future multimodal AI interactive exercise prompt',
                itemType: 'future-multimodal-unknown-type',
                customField: 12345,
              },
            ],
          },
        ],
      },
    }

    const html = renderToStaticMarkup(
      <PaperReader projection={projectionWithUnknownQuestion} studentPdfUrl={null} />
    )

    expect(html).toContain('Future multimodal AI interactive exercise prompt')
    expect(html).toContain('ruled-textarea')
  })

  it('7. preserves printable paper access with switch and download actions', () => {
    const onSwitch = vi.fn()
    const html = renderToStaticMarkup(
      <PaperReader
        projection={sampleProjection}
        studentPdfUrl="https://example.com/student.pdf"
        onSwitchToPdf={onSwitch}
      />
    )

    expect(html).toContain('切換列印版 PDF')
    expect(html).toContain('下載紙本 PDF')
    expect(html).toContain('href="https://example.com/student.pdf"')
  })

  it('8. renders self-check criteria with interactive checklist structure', () => {
    const html = renderToStaticMarkup(
      <PaperReader projection={sampleProjection} studentPdfUrl="https://example.com/student.pdf" />
    )

    expect(html).toContain('我能正確分辨 at（點）、on（面）、in（體）的空間差異。')
    expect(html).toContain('我能讀懂雙耳時間差對聲音定位的運作原理。')
    expect(html).toContain('我已掌握本週 2 個核心字彙的用法與發音。')
    expect(html).toContain('self-check-checkbox')
    expect(html).toContain('進度：0 / 3')
  })
})
