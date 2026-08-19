import { describe, it, expect } from 'vitest'
import {
  findForbiddenPersonalizationJargon,
  validateCurriculumPackage,
  auditCurriculumPackage,
  type CurriculumPackage,
} from './index.js'

describe('Parent-Facing Curriculum Copy & Jargon Prohibition', () => {
  const baseValidPackage: CurriculumPackage = {
    metadata: {
      schemaVersion: '2.2.0',
      jobId: 'job-parent-copy-1',
      childId: 'child-kobe-123',
      weekNumber: 4,
      grade: 7,
      gradeStage: 'grade_7',
      title: 'Calibrating the Optical Sensors',
      generatedAt: '2026-08-26T00:00:00Z',
      curriculumVersion: '2.2.0',
      promptVersion: '2.4.0',
      rubricVersion: '2.2.0',
      rendererVersion: '2.2.0',
      model: 'production-matrix',
      inputFingerprint: 'sha256:parent-clean-copy-test',
    },
    learnerSnapshot: {
      schoolProgress: 'Unit 3: Sensor circuits & commands',
      specificInterests: ['機器人', 'robotics'],
      changedInterests: [],
      avoid: [],
      recentDifficulty: 'appropriate',
      feedbackSummary: '前三週進度順利，掌握良好。',
      recurringMistakes: [],
      reviewDue: ['g7-do-does-questions'],
    },
    learningPlan: {
      estimatedMinutes: 90,
      difficultyBand: '國中七年級 / 標準進階',
      targets: [
        {
          id: 'target-new-grammar',
          domain: 'grammar',
          description: '掌握主詞與 be 動詞的搭配原則。',
          evidence: [{ source: 'curriculum', detail: '依照國一進度推進新文法。' }],
          successCriteria: '能正確運用於造句與選擇題中。',
        },
        {
          id: 'target-reading-inference',
          domain: 'reading',
          description: '根據感測器校正數據與上下文線索進行因果推論。',
          evidence: [{ source: 'curriculum', detail: '會考推論題型訓練。' }],
          successCriteria: '圈出證據句並完成推論作答。',
        },
        {
          id: 'target-core-vocabulary',
          domain: 'vocabulary',
          description: '學習光學感測器校正情境的 7 個核心單字。',
          evidence: [{ source: 'curriculum', detail: '本週詞彙。' }],
          successCriteria: '理解語境並正確作答。',
        },
      ],
      prerequisites: ['g7-do-does-questions'],
      reviewStrategy: ['在第 5 階段提取題中融入 do/does 動詞還原'],
      personalizationStrategy: '以 robotics 機器人光學感測器除錯情境承載新文法與推論題目。',
      exclusions: [],
    },
    trackingDelta: {
      introducedVocabularyIds: ['v-sensor', 'v-adjust', 'v-light', 'v-mirror', 'v-measure', 'v-connect', 'v-signal'],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-be-verbs-pronouns'],
      exposedReadingTargetIds: ['target-reading-inference'],
      exposedCommunicationFunctionIds: ['cf-describing-problems-troubleshooting'],
      hypothesesToVerify: ['推進新文法單元後仍維持 85% 以上獨立作答正確率'],
      nextReviewCandidates: ['g7-do-does-questions'],
    },
    studentLesson: {
      opening: {
        goalsZh: ['掌握新文法句型', '透過感測器除錯數據進行推論', '間隔複習疑問句規則'],
        howToUseZh: '先自己讀，圈起生字，獨立作答，最後進行自我檢核。',
        warmUp: '在機器人比賽中，如果感測器受到強烈光線干擾，你會怎麼調整？',
      },
      vocabulary: [
        { id: 'v-sensor', word: 'sensor', partOfSpeech: 'n.', meaningZh: '感測器', pronunciationHint: null, exampleEn: 'The light sensor detects changes in brightness.', exampleZh: '光線感測器能偵測亮度的變化。', status: 'new' },
        { id: 'v-adjust', word: 'adjust', partOfSpeech: 'v.', meaningZh: '調整', pronunciationHint: null, exampleEn: 'We need to adjust the angle of the camera.', exampleZh: '我們需要調整鏡頭的角度。', status: 'new' },
        { id: 'v-light', word: 'light', partOfSpeech: 'n.', meaningZh: '光線', pronunciationHint: null, exampleEn: 'Strong sunlight affects the robot.', exampleZh: '強烈的陽光會影響機器人。', status: 'new' },
        { id: 'v-mirror', word: 'mirror', partOfSpeech: 'n.', meaningZh: '鏡子；反射鏡', pronunciationHint: null, exampleEn: 'Place a small mirror to reflect the signal.', exampleZh: '放置一面小鏡子來反射訊號。', status: 'new' },
        { id: 'v-measure', word: 'measure', partOfSpeech: 'v.', meaningZh: '測量', pronunciationHint: null, exampleEn: 'Measure the distance before cutting the wire.', exampleZh: '剪斷電線前先測量距離。', status: 'new' },
        { id: 'v-connect', word: 'connect', partOfSpeech: 'v.', meaningZh: '連接', pronunciationHint: null, exampleEn: 'Connect the blue wire to the port.', exampleZh: '將藍色電線連接到插孔。', status: 'new' },
        { id: 'v-signal', word: 'signal', partOfSpeech: 'n.', meaningZh: '訊號', pronunciationHint: null, exampleEn: 'The receiver caught the signal.', exampleZh: '接收器接收到了訊號。', status: 'new' },
      ],
      reading: {
        title: 'Calibrating the Optical Sensors',
        contextZh: '機器人社團進行光學感測器靈敏度校正實驗的情境。',
        genre: 'instructions',
        blocks: [
          { type: 'paragraph', text: 'When testing an optical sensor in a bright room, the robot often makes mistakes because sunlight interferes with optical signals. Follow these calibration steps to ensure consistent accuracy throughout all school tournament matches.' },
          { type: 'paragraph', text: 'First, measure the ambient light level near the testing field carefully. If the value exceeds forty lux, adjust the shade hood over the lens before starting the motor. This prevents glare from blinding the camera.' },
          { type: 'paragraph', text: 'Next, place the black test line on a clean white board. Verify that the sensor detects the contrast immediately without delay, ensuring all wire connections remain secure and tightly connected to the power board.' },
          { type: 'paragraph', text: 'Finally, record the output values in your laboratory notebook before starting the automated trial. Careful preparation and accurate records help every student engineer troubleshoot problems successfully during competition.' },
        ],
        wordCount: 155,
        readingTipsZh: ['注意步驟順序副詞 First, Next, Finally', '找出光線過亮時的調整方式'],
        sourceNote: 'Robotics Engineering Lab Manual',
      },
      instruction: [
        {
          id: 'inst-1',
          titleZh: '新文法焦點與判斷規則',
          explanationZh: '說明主詞與 be 動詞的搭配原則。',
          patterns: ['Subject + be-verb + noun/adjective'],
          workedExamples: [
            { example: 'The camera is an essential sensor.', walkthroughZh: '單數主詞搭配 is。' },
            { example: 'These sensors are very accurate.', walkthroughZh: '複數主詞搭配 are。' },
          ],
          commonMistakes: [
            { wrong: 'The sensors is accurate.', corrected: 'The sensors are accurate.', whyZh: '複數主詞不可使用 is。' },
          ],
        },
      ],
      practice: [
        {
          id: 'prac-guided',
          stage: 'guided',
          titleZh: '跟著線索找答案',
          instructionsZh: '根據文章內容回答問題。',
          hintZh: '請參考步驟第二段。',
          questions: [
            { id: 'G1', targetIds: ['target-reading-inference'], itemType: 'inference', prompt: 'What should you do if the ambient light exceeds forty lux?', options: ['Adjust the shade hood over the lens.', 'Turn off all sensors immediately.', 'Replace the white board with a black one.', 'Stop writing in the notebook.'], writingLines: 0, difficulty: 'on-level' },
            { id: 'G2', targetIds: ['target-new-grammar'], itemType: 'inference', prompt: 'Choose the correct sentence:', options: ['The camera is an essential sensor.', 'The camera are an essential sensor.', 'The camera be an essential sensor.', 'The camera am an essential sensor.'], writingLines: 0, difficulty: 'on-level' },
          ],
        },
        {
          id: 'prac-independent',
          stage: 'independent',
          titleZh: '自己試試看',
          instructionsZh: '依據文章判斷邏輯。',
          hintZh: null,
          questions: [
            { id: 'I1', targetIds: ['target-core-vocabulary'], itemType: 'short-response', prompt: 'Why do we need to adjust the shade hood?', options: undefined, writingLines: 2, difficulty: 'on-level' },
            { id: 'I2', targetIds: ['target-new-grammar'], itemType: 'short-response', prompt: 'Complete the sentence: The optical sensors ______ ready for testing.', options: undefined, writingLines: 2, difficulty: 'on-level' },
            { id: 'I3', targetIds: ['target-reading-inference'], itemType: 'short-response', prompt: 'What does the team verify before starting the trial?', options: undefined, writingLines: 2, difficulty: 'on-level' },
          ],
        },
        {
          id: 'prac-cap',
          stage: 'cap-transfer',
          titleZh: '會考型閱讀',
          instructionsZh: '選出最符合文意的推論。',
          hintZh: null,
          questions: [
            { id: 'C1', targetIds: ['target-reading-inference'], itemType: 'inference', prompt: 'What is the main goal of the calibration steps described in the text?', options: ['To ensure consistent sensor accuracy.', 'To buy new optical cameras.', 'To paint the laboratory white.', 'To shorten the competition time.'], writingLines: 0, difficulty: 'on-level' },
            { id: 'C2', targetIds: ['target-reading-inference'], itemType: 'inference', prompt: 'What can we infer about testing in a dark room?', options: ['The shade hood may not need adjustment.', 'The motor will stop immediately.', 'The sensor will definitely fail.', 'The white board cannot be used.'], writingLines: 0, difficulty: 'on-level' },
            { id: 'C3', targetIds: ['target-new-grammar'], itemType: 'inference', prompt: 'Which sentence uses be-verbs correctly?', options: ['These robots are fast and reliable.', 'These robots is fast and reliable.', 'These robots be fast and reliable.', 'These robots am fast and reliable.'], writingLines: 0, difficulty: 'on-level' },
          ],
        },
        {
          id: 'prac-prod',
          stage: 'production',
          titleZh: '寫出你的想法',
          instructionsZh: '造出一個完整的句子。',
          hintZh: null,
          questions: [
            { id: 'P1', targetIds: ['target-new-grammar'], itemType: 'short-response', prompt: 'Write one sentence describing the robot sensor using is or are.', options: undefined, writingLines: 2, difficulty: 'on-level' },
          ],
        },
        {
          id: 'prac-retrieval',
          stage: 'retrieval',
          titleZh: '隔天提取記憶',
          instructionsZh: '間隔複習前週重點。',
          hintZh: null,
          questions: [
            { id: 'R1', targetIds: ['target-new-grammar'], itemType: 'short-response', prompt: 'Write one question starting with Does about the robot camera.', options: undefined, writingLines: 2, difficulty: 'on-level' },
          ],
        },
      ],
      selfCheckZh: ['我能理解光學感測器校正步驟。', '我知道主詞與 be 動詞的搭配。', '我能完成 do/does 間隔複習題。'],
      homework: {
        purposeZh: '隔天提取鞏固記憶',
        estimatedMinutes: 15,
        questions: [
          { id: 'H1', targetIds: ['target-core-vocabulary'], itemType: 'short-response', prompt: 'Use the word measure in a complete sentence.', options: undefined, writingLines: 2, difficulty: 'on-level' },
          { id: 'H2', targetIds: ['target-new-grammar'], itemType: 'short-response', prompt: 'Why do we use does instead of do with a singular subject?', options: undefined, writingLines: 2, difficulty: 'on-level' },
          { id: 'H3', targetIds: ['target-new-grammar'], itemType: 'short-response', prompt: 'Write one sentence with connect.', options: undefined, writingLines: 2, difficulty: 'on-level' },
        ],
      },
    },
    answers: [
      { questionId: 'G1', answer: 'Adjust the shade hood over the lens.', acceptedAnswers: ['A', 'Adjust the shade hood over the lens.'], explanationZh: '根據第二段，光線超過 40 lux 時應調整遮光罩。', likelyMisconceptionZh: '若選 B 則忽略了文中具體的調整指示。', followUpZh: null },
      { questionId: 'G2', answer: 'The camera is an essential sensor.', acceptedAnswers: ['A', 'The camera is an essential sensor.'], explanationZh: '單數主詞 The camera 搭配 is。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I1', answer: 'To protect the sensor from strong ambient light.', acceptedAnswers: ['To protect the sensor from strong ambient light.'], explanationZh: '調整遮光罩是為了避免強光干擾感測器。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I2', answer: 'are', acceptedAnswers: ['are'], explanationZh: '複數主詞 The optical sensors 搭配 are。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I3', answer: 'The contrast of the black line on white board.', acceptedAnswers: ['The contrast of the black line.'], explanationZh: '第三段提到確認黑線在白板上的對比度。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'C1', answer: 'To ensure consistent sensor accuracy.', acceptedAnswers: ['A', 'To ensure consistent sensor accuracy.'], explanationZh: '全文說明透過校正步驟確保感測器準確度。', likelyMisconceptionZh: '若選 D 則誤解了實驗目的。', followUpZh: null },
      { questionId: 'C2', answer: 'The shade hood may not need adjustment.', acceptedAnswers: ['A', 'The shade hood may not need adjustment.'], explanationZh: '文中說明光線超過 40 lux 才需調整遮光罩。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'C3', answer: 'These robots are fast and reliable.', acceptedAnswers: ['A', 'These robots are fast and reliable.'], explanationZh: '複數名詞搭配 are。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'P1', answer: 'The sensor is very sensitive.', acceptedAnswers: ['The sensor is very sensitive.'], explanationZh: '正確使用 is。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'R1', answer: 'Does the sensor detect the black line?', acceptedAnswers: ['Does the sensor detect the black line?'], explanationZh: '第三人稱單數使用 Does 且動詞回到原形 detect。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H1', answer: 'Please measure the length of the table.', acceptedAnswers: ['Please measure the length of the table.'], explanationZh: '正確使用 measure 作為動詞。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H2', answer: 'Because does is used for third-person singular subjects.', acceptedAnswers: ['Because does is used for third-person singular subjects.'], explanationZh: '第三人稱單數主詞使用助動詞 does。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H3', answer: 'Connect the wire carefully.', acceptedAnswers: ['Connect the wire carefully.'], explanationZh: '正確使用 connect。', likelyMisconceptionZh: null, followUpZh: null },
    ],
    parentSummary: {
      focusZh: '感測器除錯推論與新文法句型',
      observeZh: ['孩子是否能自己指出課文證據', '是否能正確使用新文法句型'],
      completionCheckZh: '確認各練習階段與作業均有作答即可。',
      personalizationZh: [
        '延續 Kobe 感興趣的機器人感測器實驗情境，推進國一新文法學習。',
        '前三週閱讀與文法完成度高，本週將先前學過的疑問句轉為間隔複習題，鞏固長期記憶。',
        '加入步驟說明書閱讀題型，訓練國中會考常見的條件與結果推論。',
      ],
    },
    qualityEvidence: {
      feedbackApplied: ['前三週完成度高，本週推進新單元並保留前週間隔複習'],
      improvementComparedToPrevious: ['提升步驟推論與邏輯判斷深度'],
      criticalChecks: [
        { id: 'self-study', passed: true, evidence: '每個概念均有中文解說與完整例句。' },
      ],
      criticFindings: [],
    },
  }

  describe('findForbiddenPersonalizationJargon detection', () => {
    it.each([
      ['新版規則', '根據新版規則，本週推進新單元。'],
      ['舊版規則', '依舊版規則處理。'],
      ['新規則', '新規則要求加入題目。'],
      ['failure evidence', '因為缺乏 failure evidence，所以不重複文法。'],
      ['失敗證據', '未發現失敗證據，推進新單元。'],
      ['評量失敗', '上次評量失敗因此重出。'],
      ['weakRecent', '本週將 weakRecent 轉入複習。'],
      ['dueReview', '本週 dueReview 項目包含疑問句。'],
      ['trackingDelta', '寫入 trackingDelta 欄位。'],
      ['capsule', '依據 context capsule 推薦單元。'],
      ['CAP (raw acronym)', '本週加入 CAP 推論題型。'],
      ['CAP-transfer', '進入 cap-transfer 階段練習。'],
      ['progression mechanics', '依據 progression mechanics 進行排序。'],
      ['推進機制', '因為推進機制設定，推薦此文法。'],
      ['進度機制', '進度機制自動選取單元。'],
      ['observable baseline', '建立 observable baseline。'],
      ['production packet', '產出 production packet。'],
      ['feedbackMissing', '因為 feedbackMissing=true 所以使用預設。'],
      ['ruleVersion', 'ruleVersion=2.4.0 執行。'],
      ['schemaVersion', '符合 schemaVersion 2.2.0。'],
      ['silence is not mastery', '沒有把沉默視為掌握。'],
    ])('flags forbidden term: %s', (_, sentence) => {
      const match = findForbiddenPersonalizationJargon(sentence)
      expect(match).not.toBeNull()
    })

    it.each([
      '延續孩子感興趣的機器人感測器實驗情境，推進國一新文法學習。',
      '前三週閱讀與文法完成度高，本週將先前學過的疑問句轉為間隔複習題，鞏固長期記憶。',
      '加入步驟說明書閱讀題型，訓練國中會考常見的條件與結果推論。',
      '依據您上週提到動詞還原較不熟練的回饋，本週針對 do/does 疑問句進行強化練習。',
      '孩子這週學習狀況良好，因此安排略具挑戰性的文章，培養從上下文推論生字的能力。',
    ])('accepts natural parent-friendly explanation: %s', (sentence) => {
      const match = findForbiddenPersonalizationJargon(sentence)
      expect(match).toBeNull()
    })
  })

  describe('auditCurriculumPackage parent-facing copy enforcement', () => {
    it('passes for clean, natural parent summary copy', () => {
      const report = auditCurriculumPackage(baseValidPackage)
      const parentFindings = report.findings.filter((f) => f.dimension === 'parent-personalization')
      expect(parentFindings).toEqual([])
      expect(report.passed).toBe(true)
    })

    it('rejects internal terms in parentSummary.focusZh', () => {
      const mutated = JSON.parse(JSON.stringify(baseValidPackage)) as CurriculumPackage
      mutated.parentSummary.focusZh = '依新版規則推進 CAP 推論題'

      const report = auditCurriculumPackage(mutated)
      const parentFindings = report.findings.filter((f) => f.dimension === 'parent-personalization')
      expect(parentFindings.length).toBeGreaterThan(0)
      expect(parentFindings[0]!.message).toContain('parentSummary.focusZh')
    })

    it('rejects internal terms in parentSummary.observeZh', () => {
      const mutated = JSON.parse(JSON.stringify(baseValidPackage)) as CurriculumPackage
      mutated.parentSummary.observeZh = ['觀察是否有 failure evidence', '確認作答完整度']

      const report = auditCurriculumPackage(mutated)
      const parentFindings = report.findings.filter((f) => f.dimension === 'parent-personalization')
      expect(parentFindings.length).toBeGreaterThan(0)
      expect(parentFindings[0]!.message).toContain('parentSummary.observeZh')
    })

    it('rejects internal terms in parentSummary.completionCheckZh', () => {
      const mutated = JSON.parse(JSON.stringify(baseValidPackage)) as CurriculumPackage
      mutated.parentSummary.completionCheckZh = '檢查 production packet 是否均有作答。'

      const report = auditCurriculumPackage(mutated)
      const parentFindings = report.findings.filter((f) => f.dimension === 'parent-personalization')
      expect(parentFindings.length).toBeGreaterThan(0)
      expect(parentFindings[0]!.message).toContain('parentSummary.completionCheckZh')
    })

    it('rejects internal terms in parentSummary.personalizationZh', () => {
      const mutated = JSON.parse(JSON.stringify(baseValidPackage)) as CurriculumPackage
      mutated.parentSummary.personalizationZh = [
        '因為沒有 failure evidence，且 weakRecent 為空，依推進機制選取新目標。',
      ]

      const report = auditCurriculumPackage(mutated)
      const parentFindings = report.findings.filter((f) => f.dimension === 'parent-personalization')
      expect(parentFindings.length).toBeGreaterThan(0)
      expect(parentFindings[0]!.message).toContain('parentSummary.personalizationZh')
    })

    it('rejects internal terms in studentLesson.opening.goalsZh', () => {
      const mutated = JSON.parse(JSON.stringify(baseValidPackage)) as CurriculumPackage
      mutated.studentLesson.opening.goalsZh = ['完成 CAP-transfer 題目', '掌握新單字']

      const report = auditCurriculumPackage(mutated)
      const selfStudyFindings = report.findings.filter((f) => f.dimension === 'self-study' && f.message.includes('opening.goalsZh'))
      expect(selfStudyFindings.length).toBeGreaterThan(0)
    })
  })
})
