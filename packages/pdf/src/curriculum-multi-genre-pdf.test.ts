import { describe, expect, it } from 'vitest'
import type { CurriculumPackage } from '@paper-english/generator'
import { renderCurriculumPackageBytes } from './render-curriculum-pair.js'
import { inspectCurriculumPdfPair } from './inspect-pdf.js'

function createBasePackage(jobId: string, title: string): CurriculumPackage {
  return {
    metadata: {
      schemaVersion: '2.2.0',
      jobId,
      childId: 'synthetic-child',
      weekNumber: 3,
      grade: 8,
      gradeStage: 'grade_8',
      title,
      generatedAt: '2026-08-15T00:00:00Z',
      curriculumVersion: 'curriculum/2.2.0',
      promptVersion: 'prompt/2.4.0',
      rubricVersion: 'rubric/2.2.0',
      rendererVersion: 'renderer/2.2.0',
      model: 'synthetic-model',
      inputFingerprint: `sha256:${jobId}`,
    },
    learnerSnapshot: {
      schoolProgress: '過去進行式',
      specificInterests: ['astronomy', 'sports', 'robotics'],
      changedInterests: [],
      avoid: [],
      recentDifficulty: 'appropriate',
      feedbackSummary: '作答認真，對對話與時間表題型反應良好。',
      recurringMistakes: ['past continuous tense'],
      reviewDue: ['past simple vs past continuous'],
    },
    learningPlan: {
      estimatedMinutes: 90,
      difficultyBand: '國二適中',
      targets: [
        {
          id: 'reading-target',
          domain: 'reading',
          description: '理解不同體裁文章的主旨與細節。',
          evidence: [{ source: 'curriculum', detail: '會考常見體裁。' }],
          successCriteria: '能準確提取關鍵訊息。',
        },
        {
          id: 'grammar-target',
          domain: 'grammar',
          description: '正確運用過去進行式。',
          evidence: [{ source: 'grammar', detail: '本週進度。' }],
          successCriteria: '掌握 was/were + V-ing 結構。',
        },
        {
          id: 'vocab-target',
          domain: 'vocabulary',
          description: '核心單字在語境中理解。',
          evidence: [{ source: 'vocabulary', detail: '單字表。' }],
          successCriteria: '能辨認並造句。',
        },
      ],
      prerequisites: ['過去簡單式'],
      reviewStrategy: ['間隔複習過去進行式'],
      personalizationStrategy: '結合學生興趣進行體裁轉移練習。',
      exclusions: [],
    },
    studentLesson: {
      opening: {
        goalsZh: ['掌握文章脈絡與細節', '正確使用過去進行式'],
        howToUseZh: '先閱讀文章與單字，再獨立完成練習，最後進行自我檢核。',
        warmUp: '如果昨天晚上八點停電，你當時正在做什麼？',
      },
      vocabulary: [
        {
          id: 'v1',
          word: 'telescope',
          partOfSpeech: 'n.',
          meaningZh: '望遠鏡',
          pronunciationHint: null,
          exampleEn: 'We looked at the stars through a powerful telescope.',
          exampleZh: '我們透過高倍望遠鏡觀察星星。',
          status: 'new',
        },
        {
          id: 'v2',
          word: 'observe',
          partOfSpeech: 'v.',
          meaningZh: '觀察',
          pronunciationHint: null,
          exampleEn: 'Scientists observe the movement of planets.',
          exampleZh: '科學家觀察行星的運動。',
          status: 'new',
        },
        {
          id: 'v3',
          word: 'suddenly',
          partOfSpeech: 'adv.',
          meaningZh: '突然地',
          pronunciationHint: null,
          exampleEn: 'Suddenly, a bright meteor crossed the sky.',
          exampleZh: '突然間，一顆明亮的流星劃過夜空。',
          status: 'review',
        },
        {
          id: 'v4',
          word: 'record',
          partOfSpeech: 'v.',
          meaningZh: '記錄',
          pronunciationHint: null,
          exampleEn: 'Please record the time when the light appears.',
          exampleZh: '請記錄光線出現的時間。',
          status: 'new',
        },
        {
          id: 'v5',
          word: 'experiment',
          partOfSpeech: 'n.',
          meaningZh: '實驗',
          pronunciationHint: null,
          exampleEn: 'The experiment was a great success.',
          exampleZh: '這場實驗非常成功。',
          status: 'new',
        },
        {
          id: 'v6',
          word: 'schedule',
          partOfSpeech: 'n.',
          meaningZh: '行程表；時程',
          pronunciationHint: null,
          exampleEn: 'Check the schedule before you leave.',
          exampleZh: '出發前請確認行程表。',
          status: 'new',
        },
        {
          id: 'v7',
          word: 'explain',
          partOfSpeech: 'v.',
          meaningZh: '解釋',
          pronunciationHint: null,
          exampleEn: 'Can you explain the main reason to us?',
          exampleZh: '你能為我們解釋主要原因嗎？',
          status: 'new',
        },
      ],
      reading: {
        title: 'Stargazing Night',
        contextZh: '天文社學生在屋頂觀察夜空的情境。',
        genre: 'article',
        blocks: [
          { type: 'paragraph', text: 'Last night, the astronomy club gathered on the school roof. The sky was unusually clear, making it an ideal evening for observing Jupiter and its moons.' },
          { type: 'paragraph', text: 'While Eric was setting up the large telescope, Jenny was recording the temperature and wind speed in her notebook.' },
          { type: 'paragraph', text: 'At eight o’clock, a bright shooting star crossed the northern sky. Everyone cheered as they witnessed the spectacular moment together.' },
        ],
        wordCount: 140,
        readingTipsZh: ['注意過去進行式 while 子句與過去簡單式的搭配', '找出天文社觀察的主要天體'],
        sourceNote: 'School Science Journal',
      },
      instruction: [
        {
          id: 'inst-1',
          titleZh: '過去進行式 (Past Continuous Tense)',
          explanationZh: '用來表示過去某個特定時間點「正在進行」的動作。常與 when 或 while 連用。',
          patterns: [
            '主詞 + was / were + V-ing...',
            'While + 主詞 + was/were + V-ing, 主詞 + 過去式動詞...',
          ],
          workedExamples: [
            {
              example: 'Eric was setting up the telescope when the phone rang.',
              walkthroughZh: '電話響起時，Eric「正在架設」望遠鏡，故使用 was setting up。',
            },
            {
              example: 'While they were watching the sky, a meteor appeared.',
              walkthroughZh: 'While 引導正在進行的動作（were watching），主要子句為瞬間發生的過去動作（appeared）。',
            },
          ],
          commonMistakes: [
            {
              wrong: 'Eric was set up the telescope.',
              corrected: 'Eric was setting up the telescope.',
              whyZh: '進行式必須使用 be 動詞 + V-ing，不能直接加原形動詞。',
            },
            {
              wrong: 'They were watch the meteor last night.',
              corrected: 'They were watching the meteor last night.',
              whyZh: 'were 後面接動詞 ing 形式。',
            },
          ],
        },
      ],
      practice: [
        {
          id: 'guided',
          stage: 'guided',
          titleZh: '跟著線索找答案',
          instructionsZh: '根據文章線索回答問題。',
          hintZh: '注意第一段提到觀察的行星名稱。',
          questions: [
            {
              id: 'G1',
              targetIds: ['reading-target'],
              itemType: 'detail',
              prompt: 'Where did the astronomy club gather last night?',
              writingLines: 2,
              difficulty: 'supported',
            },
            {
              id: 'G2',
              targetIds: ['reading-target'],
              itemType: 'detail',
              prompt: 'What was Jenny doing while Eric was setting up the telescope?',
              writingLines: 2,
              difficulty: 'supported',
            },
          ],
        },
        {
          id: 'independent',
          stage: 'independent',
          titleZh: '獨立練習',
          instructionsZh: '不看提示，完成以下文法與閱讀理解題。',
          hintZh: null,
          questions: [
            {
              id: 'I1',
              targetIds: ['grammar-target'],
              itemType: 'grammar',
              prompt: 'Choose the correct form to complete the sentence: While Mom was cooking, Dad ______ the plants.',
              options: ['waters', 'was watering', 'is watering', 'watered'],
              writingLines: 0,
              difficulty: 'on-level',
            },
          ],
        },
        {
          id: 'cap',
          stage: 'cap-transfer',
          titleZh: '會考轉移練習',
          instructionsZh: '仔細閱讀題目與選項，選出最適當的答案。',
          hintZh: null,
          questions: [
            {
              id: 'C1',
              targetIds: ['reading-target'],
              itemType: 'inference',
              prompt: 'What can we infer from the passage about the night weather?',
              options: [
                'It was cloudy and difficult to see stars.',
                'The conditions were great for stargazing.',
                'A heavy rain started at eight o’clock.',
                'The wind was too strong to stay on the roof.',
              ],
              writingLines: 0,
              difficulty: 'on-level',
            },
          ],
        },
        {
          id: 'production',
          stage: 'production',
          titleZh: '動筆寫寫看',
          instructionsZh: '運用過去進行式寫出一個完整的英文句子。',
          hintZh: null,
          questions: [
            {
              id: 'P1',
              targetIds: ['grammar-target'],
              itemType: 'sentence-production',
              prompt: 'Write one sentence describing what you were doing yesterday at 7:00 PM.',
              writingLines: 3,
              difficulty: 'stretch',
            },
          ],
        },
        {
          id: 'retrieval',
          stage: 'retrieval',
          titleZh: '記憶提取',
          instructionsZh: '不翻閱前頁，寫出過去進行式的基本結構。',
          hintZh: null,
          questions: [
            {
              id: 'R1',
              targetIds: ['grammar-target'],
              itemType: 'short-response',
              prompt: 'Explain the structure of the past continuous tense in your own words.',
              writingLines: 2,
              difficulty: 'on-level',
            },
          ],
        },
      ],
      selfCheckZh: [
        '我能讀懂文章中的細節與事件順序。',
        '我知道 was/were + V-ing 的用法。',
        '我能分辨過去簡單式與過去進行式的差異。',
      ],
      homework: {
        purposeZh: '隔天再次複習過去進行式與核心單字。',
        estimatedMinutes: 15,
        questions: [
          {
            id: 'H1',
            targetIds: ['vocab-target'],
            itemType: 'sentence-production',
            prompt: 'Use the word telescope in a sentence.',
            writingLines: 2,
            difficulty: 'on-level',
          },
          {
            id: 'H2',
            targetIds: ['grammar-target'],
            itemType: 'grammar',
            prompt: 'Fill in the blank: What ______ you ______ when the earthquake occurred?',
            options: ['were; doing', 'did; do', 'are; doing', 'was; doing'],
            writingLines: 0,
            difficulty: 'on-level',
          },
          {
            id: 'H3',
            targetIds: ['grammar-target'],
            itemType: 'sentence-production',
            prompt: 'Write a question using were you doing.',
            writingLines: 2,
            difficulty: 'on-level',
          },
        ],
      },
    },
    answers: [
      { questionId: 'G1', answer: 'On the school roof.', acceptedAnswers: ['On the roof'], explanationZh: '文章第一段明確提到 on the school roof。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'G2', answer: 'She was recording the temperature and wind speed.', acceptedAnswers: [], explanationZh: '文章第二段描述 Jenny 正在記錄溫度與風速。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I1', answer: 'B', acceptedAnswers: ['was watering'], explanationZh: 'While 引導過去進行時態，兩者同時進行時皆用過去進行式。', likelyMisconceptionZh: '誤選 watered 忽略了 while 呈現的持續動作情境。', followUpZh: null },
      { questionId: 'C1', answer: 'B', acceptedAnswers: [], explanationZh: '文中提到 the sky was unusually clear，故可推知天氣條件非常良好。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'P1', answer: 'I was studying English at 7:00 PM yesterday. (依學生個人情境為準)', acceptedAnswers: [], explanationZh: '需包含主詞 + was/were + V-ing + 時間副詞。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'R1', answer: '主詞 + was/were + 動詞 ing (V-ing)', acceptedAnswers: ['was/were + V-ing'], explanationZh: '基本結構為 be 動詞過去式加上現在分詞。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H1', answer: 'I looked at the moon with a telescope. (答案合理即可)', acceptedAnswers: [], explanationZh: '正確使用 telescope 於語境中。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H2', answer: 'A', acceptedAnswers: ['were; doing'], explanationZh: '主詞為 you，過去進行式問句使用 were you doing。', likelyMisconceptionZh: '誤選 was 是因為主詞判斷錯誤。', followUpZh: null },
      { questionId: 'H3', answer: 'What were you doing at 10 PM? (答案合理即可)', acceptedAnswers: [], explanationZh: '正確構成 were you doing 問句。', likelyMisconceptionZh: null, followUpZh: null },
    ],
    parentSummary: {
      focusZh: '過去進行式與故事細節推論',
      observeZh: ['是否能獨立回答理解題', '是否理解 was/were 與主詞的單複數搭配'],
      completionCheckZh: '檢查所有題目與手寫線條是否皆已完成作答。',
      personalizationZh: ['以學生喜愛的天文觀星主題帶入過去進行式練習。'],
    },
    trackingDelta: {
      introducedVocabularyIds: ['v1', 'v2', 'v4', 'v5', 'v6', 'v7'],
      reviewedVocabularyIds: ['v3'],
      exposedGrammarTargetIds: ['past-continuous'],
      exposedReadingTargetIds: ['reading-target'],
      exposedCommunicationFunctionIds: [],
      hypothesesToVerify: ['能否在時間內完成過去進行式練習'],
      nextReviewCandidates: ['past-continuous-questions'],
    },
    qualityEvidence: {
      feedbackApplied: ['加強對話與情境題型設計'],
      improvementComparedToPrevious: ['增加雙欄單字對照與完整示範。'],
      criticalChecks: [{ id: 'self-study', passed: true, evidence: '包含完整中文引導。' }],
      criticFindings: [],
    },
  }
}

describe('Curriculum Multi-Genre PDF Rendering & Inspection', () => {
  it('1. Renders and passes inspection for Narrative / Article package', async () => {
    const pkg = createBasePackage('test-narrative', 'Night Sky Observations')
    const pair = await renderCurriculumPackageBytes(pkg)
    const inspection = await inspectCurriculumPdfPair(pkg, pair)

    expect(inspection.student.pageCount).toBeGreaterThanOrEqual(2)
    expect(inspection.student.pageCount).toBeLessThanOrEqual(6)
    expect(inspection.parentAnswer.pageCount).toBeGreaterThanOrEqual(1)
    expect(inspection.parentAnswer.pageCount).toBeLessThanOrEqual(3)
    expect(inspection.student.text).toContain('Stargazing Night')
    expect(inspection.student.text).toContain('telescope')
  }, 35_000)

  it('2. Renders and passes inspection for Dialogue package', async () => {
    const pkg = createBasePackage('test-dialogue', 'Robot Project Discussion')
    pkg.studentLesson.reading = {
      title: 'Debating the Sensor Issue',
      contextZh: 'Alex 與 Mia 在討論感測器調整方案。',
      genre: 'dialogue',
      blocks: [
        { type: 'dialogue', speaker: 'Alex', text: 'Why is the robot turning left when the light is green?' },
        { type: 'dialogue', speaker: 'Mia', text: 'I checked the sensor yesterday. It was reading shadows as obstacles.' },
        { type: 'dialogue', speaker: 'Alex', text: 'Let us shield the sensor from overhead lights and test again.' },
        { type: 'dialogue', speaker: 'Mia', text: 'Great idea. I will record the outcome on our test sheet.' },
      ],
      wordCount: 130,
      readingTipsZh: ['觀察兩人的解決方案步驟'],
      sourceNote: null,
    }

    const pair = await renderCurriculumPackageBytes(pkg)
    const inspection = await inspectCurriculumPdfPair(pkg, pair)

    expect(inspection.student.text).toContain('Debating the Sensor Issue')
    expect(inspection.student.text).toContain('Alex:')
    expect(inspection.student.text).toContain('Mia:')
  }, 35_000)

  it('3. Renders and passes inspection for Notice & Schedule package', async () => {
    const pkg = createBasePackage('test-notice-schedule', 'Science Camp Bulletin & Schedule')
    pkg.studentLesson.reading = {
      title: 'Youth Astronomy Camp Information',
      contextZh: '青少年天文夏令營的公告與活動日程表。',
      genre: 'schedule',
      blocks: [
        { type: 'notice', heading: 'Important Reminder', text: 'Bring warm clothes and your student ID to the registration desk.' },
        { type: 'schedule-row', timeOrStep: '18:30 - 19:30', event: 'Equipment Setup', detail: 'Calibrate telescopes on the main field' },
        { type: 'schedule-row', timeOrStep: '19:45 - 21:00', event: 'Constellation Tour', detail: 'Guided observation with instructor' },
        { type: 'schedule-row', timeOrStep: '21:15 - 22:00', event: 'Astrophotography Trial', detail: 'Capture lunar craters' },
      ],
      wordCount: 140,
      readingTipsZh: ['對照公告須知與各時段活動內容'],
      sourceNote: 'Camp Operations Office',
    }

    const pair = await renderCurriculumPackageBytes(pkg)
    const inspection = await inspectCurriculumPdfPair(pkg, pair)

    expect(inspection.student.text).toContain('Youth Astronomy Camp Information')
    expect(inspection.student.text).toContain('Equipment Setup')
    expect(inspection.student.text).toContain('Constellation Tour')
  }, 35_000)

  it('4. Renders and passes inspection for Long-Writing package with extended response lines', async () => {
    const pkg = createBasePackage('test-long-writing', 'Writing and Expression Focus')
    pkg.studentLesson.practice = [
      {
        id: 'p-writing',
        stage: 'production',
        titleZh: '深入寫作練習',
        instructionsZh: '請依指示寫出長句與段落。',
        hintZh: '運用過去進行式與連接詞 while。',
        questions: [
          {
            id: 'W1',
            targetIds: ['grammar-target'],
            itemType: 'sentence-production',
            prompt: 'Describe what your family members were doing when the thunderstorm began yesterday.',
            writingLines: 4,
            difficulty: 'stretch',
          },
          {
            id: 'W2',
            targetIds: ['grammar-target'],
            itemType: 'sentence-production',
            prompt: 'Write a short 3-sentence paragraph explaining why careful testing is important.',
            writingLines: 6,
            difficulty: 'stretch',
          },
        ],
      },
    ]

    pkg.answers = [
      { questionId: 'W1', answer: 'My father was reading while my brother was sleeping.', acceptedAnswers: [], explanationZh: '使用過去進行式正確描述家庭成員當時進行的動作。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'W2', answer: 'Careful testing is important because it prevents mistakes and saves time.', acceptedAnswers: [], explanationZh: '寫出三個句子或一段包含理由的短文。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H1', answer: 'I looked at the moon with a telescope.', acceptedAnswers: [], explanationZh: '正確使用單字。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H2', answer: 'A', acceptedAnswers: ['were; doing'], explanationZh: '主詞為 you。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H3', answer: 'What were you doing at 10 PM?', acceptedAnswers: [], explanationZh: '正確構成問句。', likelyMisconceptionZh: null, followUpZh: null },
    ]

    const pair = await renderCurriculumPackageBytes(pkg)
    const inspection = await inspectCurriculumPdfPair(pkg, pair)

    expect(inspection.student.text.replace(/\s+/gu, '')).toContain('深入寫作練習')
    expect(inspection.student.text).toContain('Describe what your family members were doing')
  }, 35_000)

  it('5. Renders and passes inspection for Package with Adaptive Extension module', async () => {
    const pkg = createBasePackage('test-adaptive-ext', 'Adaptive Extension Test Package')
    pkg.studentLesson.adaptiveExtension = {
      id: 'ext-real-world-1',
      placement: 'after-reading',
      purpose: 'real-world-application',
      titleZh: '天文觀測日誌生活應用',
      contentZh: '當你在真實生活中記錄觀測資料時，精確的時間與過去進行式能幫助他人重現你的發現。',
      taskZh: '試著用英文寫下一句你昨晚看見夜空時的真實情境。',
      taskWritingLines: 2,
    }

    const pair = await renderCurriculumPackageBytes(pkg)
    const inspection = await inspectCurriculumPdfPair(pkg, pair)

    const cleanStudentText = inspection.student.text.replace(/\s+/gu, '')
    expect(cleanStudentText).toContain('真實語境應用')
    expect(cleanStudentText).toContain('天文觀測日誌生活應用')
    expect(cleanStudentText).toContain('延伸小任務')
  }, 35_000)
})
