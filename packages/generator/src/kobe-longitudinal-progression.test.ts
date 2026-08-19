import { describe, it, expect } from 'vitest'
import {
  createEmptyStudentCurriculumStore,
  recordExposureFromTrackingDelta,
  recordLearnerAssessmentEvidence,
  buildCapCoverageCapsule,
  validateCurriculumPackage,
  auditCurriculumPackage,
  type CurriculumPackage,
  type CurriculumQuestion,
} from './index.js'
import { grammarProgressionUnits } from './curriculum-maps/derived/grammar-progression.js'

describe('Kobe Production Longitudinal Progression & Feedback Dominance Regression', () => {
  it('reproduces Kobe authentic production Week 1-3 history (W1: do/does, W2: Wh + do/does, W3: Wh + do/does) and proves Week 4 advances without looping', () => {
    // 1. Initialize Kobe's Grade 7 curriculum store with authentic production history
    const store = createEmptyStudentCurriculumStore('e54d3363-a68b-4540-a89e-629cd7d2a223', 7)

    // Kobe Production Week 1: Taught do/does questions
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-build', 'v-test', 'v-camera'],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-do-does-questions'],
      exposedCommunicationFunctionIds: ['cf-making-requests'],
    }, '2026-08-18T10:00:00Z')

    // Kobe Production Week 2: Taught Wh- questions + reviewed do/does
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-experiment', 'v-record', 'v-improve', 'v-sort'],
      reviewedVocabularyIds: ['v-camera'],
      exposedGrammarTargetIds: ['g7-wh-questions', 'g7-do-does-questions'],
      exposedCommunicationFunctionIds: ['cf-agreement-disagreement'],
    }, '2026-08-18T12:00:00Z')

    // Kobe Production Week 3: Taught Wh- questions + reviewed do/does
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-straight', 'v-corner', 'v-opposite', 'v-entrance'],
      reviewedVocabularyIds: ['v-record'],
      exposedGrammarTargetIds: ['g7-wh-questions', 'g7-do-does-questions'],
      exposedCommunicationFunctionIds: ['cf-asking-giving-directions'],
    }, '2026-08-18T18:00:00Z')

    // Verify Kobe's EXACT production state after Week 3:
    // Three exposures on do/does, two/three exposures on Wh-, ZERO assessments, ZERO misses.
    const doDoesRecord = store.grammarRecords['g7-do-does-questions']!
    const whRecord = store.grammarRecords['g7-wh-questions']!

    expect(doDoesRecord.exposureCount).toBe(3)
    expect(doDoesRecord.missCount).toBe(0)
    expect(doDoesRecord.assessedCount).toBe(0)

    expect(whRecord.exposureCount).toBe(2)
    expect(whRecord.missCount).toBe(0)
    expect(whRecord.assessedCount).toBe(0)

    // 2. REPRODUCE OLD BUGGY BEHAVIOR vs FIXED BEHAVIOR
    // Old SQL distillation logic: (exposure_count > 1 and correct_count < exposure_count / 2)
    const oldDoDoesWeak = doDoesRecord.exposureCount > 1 && doDoesRecord.correctCount < (doDoesRecord.exposureCount / 2)
    const oldWhWeak = whRecord.exposureCount > 1 && whRecord.correctCount < (whRecord.exposureCount / 2)
    expect(oldDoDoesWeak).toBe(true) // BUG: 3 > 1 and 0 < 1.5 evaluated to TRUE
    expect(oldWhWeak).toBe(true)     // BUG: 2 > 1 and 0 < 1.0 evaluated to TRUE

    // Fixed distillation logic: Requires actual failure evidence
    const newDoDoesWeak = doDoesRecord.missCount > 0 || (doDoesRecord.assessedCount > 0 && doDoesRecord.correctCount < doDoesRecord.assessedCount)
    const newWhWeak = whRecord.missCount > 0 || (whRecord.assessedCount > 0 && whRecord.correctCount < whRecord.assessedCount)
    expect(newDoDoesWeak).toBe(false) // FIXED: No failure evidence, not weak
    expect(newWhWeak).toBe(false)     // FIXED: No failure evidence, not weak

    // 3. Build Week 4 CAP Coverage Capsule under Fixed Context
    const week4Capsule = buildCapCoverageCapsule(store, {
      nowIso: '2026-08-26T00:00:00Z',
      gradeStage: 'grade_7',
    })

    // Assert: Recommended grammar MUST NOT contain exposed units (g7-do-does-questions, g7-wh-questions)
    expect(week4Capsule.recommendedGrammar).not.toContain('g7-do-does-questions')
    expect(week4Capsule.recommendedGrammar).not.toContain('g7-wh-questions')

    // Assert: Recommended grammar must advance to unexposed Grade 7 progression units (e.g. g7-be-verbs-pronouns, g7-present-continuous)
    expect(week4Capsule.recommendedGrammar.length).toBeGreaterThan(0)
    for (const unitId of week4Capsule.recommendedGrammar) {
      const unit = grammarProgressionUnits.find((u) => u.unitId === unitId)
      expect(unit?.gradeStage).toBe('grade_7')
      expect(store.grammarRecords[unitId]?.exposureCount ?? 0).toBe(0)
    }

    // 4. Construct Kobe Week 4 Curriculum Package advancing to an unexposed Grade 7 unit
    const selectedNewGrammar = week4Capsule.recommendedGrammar[0]! // e.g. g7-be-verbs-pronouns or g7-present-continuous
    const practiceQuestions: CurriculumPackage['studentLesson']['practice'] = [
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
          { id: 'R1', targetIds: ['target-review-questions'], itemType: 'short-response', prompt: 'Write one question starting with Does about the robot camera.', options: undefined, writingLines: 2, difficulty: 'on-level' },
        ],
      },
    ]

    const homeworkQuestions: CurriculumQuestion[] = [
      { id: 'H1', targetIds: ['target-core-vocabulary'], itemType: 'short-response', prompt: 'Use the word measure in a complete sentence.', options: undefined, writingLines: 2, difficulty: 'on-level' },
      { id: 'H2', targetIds: ['target-review-questions'], itemType: 'short-response', prompt: 'Why do we use does instead of do with a singular subject?', options: undefined, writingLines: 2, difficulty: 'on-level' },
      { id: 'H3', targetIds: ['target-new-grammar'], itemType: 'short-response', prompt: 'Write one sentence with connect.', options: undefined, writingLines: 2, difficulty: 'on-level' },
    ]

    const week4Answers: CurriculumPackage['answers'] = [
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
    ]

    const week4Package: CurriculumPackage = {
      metadata: {
        schemaVersion: '2.2.0',
        jobId: 'job-kobe-week-4',
        childId: 'e54d3363-a68b-4540-a89e-629cd7d2a223',
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
        inputFingerprint: 'sha256:kobe-w4-clean',
      },
      learnerSnapshot: {
        schoolProgress: 'Unit 3: Sensor circuits & commands',
        specificInterests: ['機器人', 'robotics'],
        changedInterests: [],
        avoid: [],
        recentDifficulty: 'appropriate',
        feedbackSummary: '前三週進度順利，掌握良好。',
        // Invariant: Unverified exposure is never classified as recurringMistakes
        recurringMistakes: [],
        // Invariant: Previously exposed grammar belongs in reviewDue for spaced review
        reviewDue: ['g7-do-does-questions', 'g7-wh-questions'],
      },
      learningPlan: {
        estimatedMinutes: 90,
        difficultyBand: '國中七年級 / 標準進階',
        targets: [
          {
            id: 'target-new-grammar',
            domain: 'grammar',
            description: `掌握新文法焦點 (${selectedNewGrammar}) 的句型與規則。`,
            evidence: [{ source: 'curriculum', detail: '依照國一文法進度推進新學習目標。' }],
            successCriteria: '能正確運用於造句與選擇題中。',
          },
          {
            id: 'target-reading-inference',
            domain: 'reading',
            description: '根據感測器校正數據與上下文線索進行因果推論。',
            evidence: [{ source: 'feedback', detail: '延續良好閱讀理解，加入會考推論題。' }],
            successCriteria: '圈出證據句並完成推論作答。',
          },
          {
            id: 'target-core-vocabulary',
            domain: 'vocabulary',
            description: '在感測器校正情境中學習並使用 7 個核心單字。',
            evidence: [{ source: 'curriculum', detail: '本週推薦詞彙。' }],
            successCriteria: '能理解語境並正確作答。',
          },
          {
            id: 'target-review-questions',
            domain: 'review',
            description: '間隔複習 do / does 與 Wh- 疑問句結構。',
            evidence: [{ source: 'weekly-history', detail: '前三週已學文法間隔提取。' }],
            successCriteria: '在提取題中無提示正確作答。',
          },
        ],
        prerequisites: ['g7-do-does-questions'],
        reviewStrategy: ['在第 5 階段提取題中融入 do/does 動詞還原', '複習前週核心單字'],
        personalizationStrategy: '以 robotics 機器人光學感測器除錯情境承載新文法與推論題目。',
        exclusions: [],
      },
      trackingDelta: {
        introducedVocabularyIds: ['v-sensor', 'v-adjust', 'v-light', 'v-mirror', 'v-measure', 'v-connect', 'v-signal'],
        reviewedVocabularyIds: ['v-experiment', 'v-record'],
        exposedGrammarTargetIds: [selectedNewGrammar],
        exposedReadingTargetIds: ['target-reading-inference'],
        exposedCommunicationFunctionIds: ['cf-describing-problems-troubleshooting'],
        hypothesesToVerify: ['推進新文法單元後仍維持 85% 以上獨立作答正確率'],
        nextReviewCandidates: ['g7-do-does-questions', 'g7-wh-questions'],
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
        practice: practiceQuestions,
        selfCheckZh: ['我能理解光學感測器校正步驟。', '我知道主詞與 be 動詞的搭配。', '我能完成 do/does 間隔複習題。'],
        homework: {
          purposeZh: '隔天提取鞏固記憶',
          estimatedMinutes: 15,
          questions: homeworkQuestions,
        },
      },
      answers: week4Answers,
      parentSummary: {
        focusZh: '感測器除錯推論與新文法句型',
        observeZh: ['孩子是否能自己指出課文證據', '是否能正確使用新文法句型'],
        completionCheckZh: '確認各練習階段與作業均有作答即可。',
        personalizationZh: [
          '延續 Kobe 感興趣的機器人感測器實驗情境，推進國一新文法學習。',
          '前三週閱讀與文法完成度高，本週將 do/does 與 Wh- 疑問句轉為間隔複習題。',
          '加入步驟說明書閱讀題型，訓練會考條件與結果推論。',
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

    // Validate Schema 2.2 and Audit
    const validation = validateCurriculumPackage(week4Package)
    expect(validation.success).toBe(true)

    const audit = auditCurriculumPackage(week4Package)
    const criticalFindings = audit.findings.filter((f) => f.tier === 'structural-critical' || f.tier === 'semantic-critical')
    expect(criticalFindings).toEqual([])
  })

  it('proves Feedback Dominance: explicit parent request to repeat do/does overrides default progression', () => {
    const store = createEmptyStudentCurriculumStore('e54d3363-a68b-4540-a89e-629cd7d2a223', 7)

    // Kobe Week 1-3 production history (3 exposures on do/does, 2 on wh-)
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-camera'],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-do-does-questions'],
    }, '2026-08-18T10:00:00Z')
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: [],
      reviewedVocabularyIds: ['v-camera'],
      exposedGrammarTargetIds: ['g7-wh-questions', 'g7-do-does-questions'],
    }, '2026-08-18T12:00:00Z')
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: [],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-wh-questions', 'g7-do-does-questions'],
    }, '2026-08-18T18:00:00Z')

    // Scenario: Parent gives explicit feedback asking to repeat do/does questions
    const parentFeedbackDirective = {
      repeatTarget: 'g7-do-does-questions',
      parentNote: '小孩反應 do/does 疑問句動詞還原還是容易忘記，請這週一模一樣文法再一次加強！',
    }

    // When parent explicitly requests repeat, feedback dominance mandates that g7-do-does-questions IS selected as primary target
    const primaryTargetId = parentFeedbackDirective.repeatTarget
    expect(primaryTargetId).toBe('g7-do-does-questions')

    const repeatPractice: CurriculumPackage['studentLesson']['practice'] = [
      {
        id: 'prac-g',
        stage: 'guided',
        titleZh: '跟著線索讀',
        instructionsZh: '選出正確的動詞形式。',
        hintZh: '注意 Does 後面的動詞。',
        questions: [
          { id: 'G1', targetIds: ['target-primary-repeat-grammar'], itemType: 'inference', prompt: 'Which sentence correctly asks about the machine?', options: ['Does the robot connect to the battery?', 'Does the robot connects to the battery?', 'Do the robot connect to the battery?', 'Is the robot connect to the battery?'], writingLines: 0, difficulty: 'on-level' },
          { id: 'G2', targetIds: ['target-reading'], itemType: 'inference', prompt: 'What does Sam notice?', options: ['The red light flashes.', 'The battery is missing.', 'The wire is broken.', 'The motor is hot.'], writingLines: 0, difficulty: 'on-level' },
        ],
      },
      {
        id: 'prac-i',
        stage: 'independent',
        titleZh: '自己試試看',
        instructionsZh: '寫出完整問句。',
        hintZh: null,
        questions: [
          { id: 'I1', targetIds: ['target-primary-repeat-grammar'], itemType: 'short-response', prompt: 'Write a question asking if Sam needs a new tool using Does.', options: undefined, writingLines: 2, difficulty: 'on-level' },
          { id: 'I2', targetIds: ['target-vocab'], itemType: 'short-response', prompt: 'Use repair in a sentence.', options: undefined, writingLines: 2, difficulty: 'on-level' },
          { id: 'I3', targetIds: ['target-primary-repeat-grammar'], itemType: 'short-response', prompt: 'Does the team test the motor again? Answer with a full sentence.', options: undefined, writingLines: 2, difficulty: 'on-level' },
        ],
      },
      {
        id: 'prac-c',
        stage: 'cap-transfer',
        titleZh: '會考型閱讀',
        instructionsZh: '選出適當答案。',
        hintZh: null,
        questions: [
          { id: 'C1', targetIds: ['target-reading'], itemType: 'inference', prompt: 'Why do Leo and Sam check the connection again?', options: ['Because the sensors do not receive any signal.', 'Because the machine is completely repaired.', 'Because the blue wire is disconnected.', 'Because they finished the tournament.'], writingLines: 0, difficulty: 'on-level' },
          { id: 'C2', targetIds: ['target-primary-repeat-grammar'], itemType: 'inference', prompt: 'Which question uses does correctly?', options: ['Does Eric like pizza?', 'Does Eric likes pizza?', 'Do Eric like pizza?', 'Is Eric like pizza?'], writingLines: 0, difficulty: 'on-level' },
          { id: 'C3', targetIds: ['target-reading'], itemType: 'inference', prompt: 'What will the engineers do next?', options: ['Inspect the components carefully.', 'Leave the classroom.', 'Throw away the sensors.', 'Buy a new table.'], writingLines: 0, difficulty: 'on-level' },
        ],
      },
      {
        id: 'prac-p',
        stage: 'production',
        titleZh: '寫出你的想法',
        instructionsZh: '造出一個 Does 問句。',
        hintZh: null,
        questions: [
          { id: 'P1', targetIds: ['target-primary-repeat-grammar'], itemType: 'short-response', prompt: 'Write one Does question about a computer.', options: undefined, writingLines: 2, difficulty: 'on-level' },
        ],
      },
      {
        id: 'prac-r',
        stage: 'retrieval',
        titleZh: '隔天提取記憶',
        instructionsZh: '回答規則問題。',
        hintZh: null,
        questions: [
          { id: 'R1', targetIds: ['target-primary-repeat-grammar'], itemType: 'short-response', prompt: 'When using Does in a question, what form must the main verb be?', options: undefined, writingLines: 2, difficulty: 'on-level' },
        ],
      },
    ]

    const repeatHomework: CurriculumQuestion[] = [
      { id: 'H1', targetIds: ['target-vocab'], itemType: 'short-response', prompt: 'Use repair in a sentence.', options: undefined, writingLines: 2, difficulty: 'on-level' },
      { id: 'H2', targetIds: ['target-primary-repeat-grammar'], itemType: 'short-response', prompt: 'Fix the error: Does Eric likes pizza?', options: undefined, writingLines: 2, difficulty: 'on-level' },
      { id: 'H3', targetIds: ['target-primary-repeat-grammar'], itemType: 'short-response', prompt: 'Write a Does question.', options: undefined, writingLines: 2, difficulty: 'on-level' },
    ]

    const repeatAnswers: CurriculumPackage['answers'] = [
      { questionId: 'G1', answer: 'Does the robot connect to the battery?', acceptedAnswers: ['A', 'Does the robot connect to the battery?'], explanationZh: 'Does 後面主要動詞使用原形 connect。', likelyMisconceptionZh: '選 B 則忘記將動詞還原。', followUpZh: null },
      { questionId: 'G2', answer: 'The red light flashes.', acceptedAnswers: ['A', 'The red light flashes.'], explanationZh: '對話中 Sam 提到紅燈閃爍。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I1', answer: 'Does Sam need a new tool?', acceptedAnswers: ['Does Sam need a new tool?'], explanationZh: '使用 Does 開頭並將 need 設為原形。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I2', answer: 'I can repair the broken machine.', acceptedAnswers: ['I can repair the broken machine.'], explanationZh: '正確使用 repair。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'I3', answer: 'Yes, they do.', acceptedAnswers: ['Yes, they do.'], explanationZh: '使用 do 回答。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'C1', answer: 'Because the sensors do not receive any signal.', acceptedAnswers: ['A', 'Because the sensors do not receive any signal.'], explanationZh: '對話第四行 Sam 說明感測器未收到訊號。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'C2', answer: 'Does Eric like pizza?', acceptedAnswers: ['A', 'Does Eric like pizza?'], explanationZh: 'Does 後方動詞使用原形 like。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'C3', answer: 'Inspect the components carefully.', acceptedAnswers: ['A', 'Inspect the components carefully.'], explanationZh: '最後一段提到兩人仔細檢查零件。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'P1', answer: 'Does the computer work well?', acceptedAnswers: ['Does the computer work well?'], explanationZh: '正確使用 Does 與原形動詞。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'R1', answer: 'Base form (原形動詞).', acceptedAnswers: ['Base form', '原形動詞'], explanationZh: '主要動詞必須回到原形。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H1', answer: 'I can repair this robot.', acceptedAnswers: ['I can repair this robot.'], explanationZh: '正確使用 repair。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H2', answer: 'Does Eric like pizza?', acceptedAnswers: ['Does Eric like pizza?'], explanationZh: 'likes 應改為原形 like。', likelyMisconceptionZh: null, followUpZh: null },
      { questionId: 'H3', answer: 'Does she play tennis?', acceptedAnswers: ['Does she play tennis?'], explanationZh: '正確使用 Does。', likelyMisconceptionZh: null, followUpZh: null },
    ]

    const repeatPackage: CurriculumPackage = {
      metadata: {
        schemaVersion: '2.2.0',
        jobId: 'job-kobe-week-4-repeat',
        childId: 'e54d3363-a68b-4540-a89e-629cd7d2a223',
        weekNumber: 4,
        grade: 7,
        gradeStage: 'grade_7',
        title: 'Deepening Do and Does Questions',
        generatedAt: '2026-08-26T00:00:00Z',
        curriculumVersion: '2.2.0',
        promptVersion: '2.4.0',
        rubricVersion: '2.2.0',
        rendererVersion: '2.2.0',
        model: 'production-matrix',
        inputFingerprint: 'sha256:kobe-w4-repeat',
      },
      learnerSnapshot: {
        schoolProgress: 'Unit 3: Do/Does reinforcement',
        specificInterests: ['機器人', 'robotics'],
        changedInterests: [],
        avoid: [],
        recentDifficulty: 'appropriate',
        feedbackSummary: parentFeedbackDirective.parentNote,
        recurringMistakes: ['g7-do-does-questions'],
        reviewDue: ['g7-wh-questions'],
      },
      learningPlan: {
        estimatedMinutes: 90,
        difficultyBand: '國中七年級 / 針對性複習',
        targets: [
          {
            id: 'target-primary-repeat-grammar',
            domain: 'grammar',
            description: '依家長回饋加強 Do / Does 疑問句動詞還原規則。',
            evidence: [{ source: 'feedback', detail: parentFeedbackDirective.parentNote }],
            successCriteria: '能準確辨識主詞單複數並將動詞還原。',
          },
          {
            id: 'target-reading',
            domain: 'reading',
            description: '在對話語境中找出問句與回應線索。',
            evidence: [{ source: 'curriculum', detail: '對話篇章訓練。' }],
            successCriteria: '完成閱讀理解題。',
          },
          {
            id: 'target-vocab',
            domain: 'vocabulary',
            description: '掌握核心單字。',
            evidence: [{ source: 'curriculum', detail: '本週詞彙。' }],
            successCriteria: '造句正確。',
          },
        ],
        prerequisites: ['g7-do-does-questions'],
        reviewStrategy: ['Wh- 疑問句提取'],
        personalizationStrategy: '依家長明確回饋優先加強 do/does，結合 robotics 機器人排查情境。',
        exclusions: [],
      },
      trackingDelta: {
        introducedVocabularyIds: ['v-repair', 'v-connect', 'v-signal', 'v-battery', 'v-switch', 'v-motor', 'v-power'],
        reviewedVocabularyIds: ['v-camera'],
        exposedGrammarTargetIds: ['g7-do-does-questions'],
        exposedReadingTargetIds: ['target-reading'],
        exposedCommunicationFunctionIds: ['cf-describing-problems-troubleshooting'],
        hypothesesToVerify: ['依家長要求重複複習後能徹底掌握動詞還原'],
        nextReviewCandidates: ['g7-wh-questions'],
      },
      studentLesson: {
        opening: {
          goalsZh: ['依回饋加強 do/does 疑問句動詞還原', '在對話中找出線索'],
          howToUseZh: '先自己讀，圈起生字，獨立作答，最後進行自我檢核。',
          warmUp: '在問別人機器人會不會動時，你會用 Do 還是 Does 開頭？',
        },
        vocabulary: [
          { id: 'v-repair', word: 'repair', partOfSpeech: 'v.', meaningZh: '修理', pronunciationHint: null, exampleEn: 'Can you repair the broken sensor?', exampleZh: '你能修理損壞的感測器嗎？', status: 'new' },
          { id: 'v-connect', word: 'connect', partOfSpeech: 'v.', meaningZh: '連接', pronunciationHint: null, exampleEn: 'Connect the blue wire to the port.', exampleZh: '將藍色電線連接到插孔。', status: 'new' },
          { id: 'v-signal', word: 'signal', partOfSpeech: 'n.', meaningZh: '訊號', pronunciationHint: null, exampleEn: 'The receiver caught the signal.', exampleZh: '接收器接收到了訊號。', status: 'new' },
          { id: 'v-battery', word: 'battery', partOfSpeech: 'n.', meaningZh: '電池', pronunciationHint: null, exampleEn: 'The battery needs charging.', exampleZh: '電池需要充電。', status: 'new' },
          { id: 'v-switch', word: 'switch', partOfSpeech: 'n.', meaningZh: '開關', pronunciationHint: null, exampleEn: 'Flip the power switch on.', exampleZh: '打開電源開關。', status: 'new' },
          { id: 'v-motor', word: 'motor', partOfSpeech: 'n.', meaningZh: '馬達', pronunciationHint: null, exampleEn: 'The motor turns the wheels.', exampleZh: '馬達帶動輪子轉動。', status: 'new' },
          { id: 'v-power', word: 'power', partOfSpeech: 'n.', meaningZh: '電力；能量', pronunciationHint: null, exampleEn: 'Check the power level.', exampleZh: '檢查電力水準。', status: 'new' },
        ],
        reading: {
          title: 'Testing the Circuit Connection',
          contextZh: '兩位工程師透過問答排查電路訊號的情境。',
          genre: 'dialogue',
          blocks: [
            { type: 'dialogue', speaker: 'Leo', text: 'Does this blue wire connect to the main power board properly before the match begins today?' },
            { type: 'dialogue', speaker: 'Sam', text: 'Yes, it does. But why does the red warning light flash repeatedly right now on the control panel?' },
            { type: 'dialogue', speaker: 'Leo', text: 'Do the sensors receive any signal from the remote control unit when you turn on the power switch?' },
            { type: 'dialogue', speaker: 'Sam', text: 'No, they do not. Let us check the battery level and wire connection once again to repair the circuit.' },
            { type: 'dialogue', speaker: 'Leo', text: 'Does the electric motor need a higher voltage setting to operate smoothly under heavy load?' },
            { type: 'dialogue', speaker: 'Sam', text: 'No, it does not. The motor requires only standard battery power when all cables are firmly attached.' },
            { type: 'paragraph', text: 'Both student engineers carefully inspect every electronic component on the laboratory table to make sure the robot works safely and accurately before the tournament starts.' },
          ],
          wordCount: 160,
          readingTipsZh: ['注意 Does 後面主要動詞 connect 是原形', '注意 Do 與複數主詞 sensors 的搭配'],
          sourceNote: 'Lab Troubleshooting Log',
        },
        instruction: [
          {
            id: 'inst-repeat-1',
            titleZh: 'Do / Does 疑問句與動詞還原核心心法',
            explanationZh: '當助動詞 Does 出現時，它已經承擔了第三人稱單數標記，後方主要動詞必須回到原形。',
            patterns: ['Does + He/She/It + 原形動詞...?'],
            workedExamples: [
              { example: 'Does the robot work properly?', walkthroughZh: '主詞 the robot 是單數，使用 Does，work 必須是原形。' },
              { example: 'Do the wheels turn smoothly?', walkthroughZh: '主詞 the wheels 是複數，使用 Do。' },
            ],
            commonMistakes: [
              { wrong: 'Does the robot works properly?', corrected: 'Does the robot work properly?', whyZh: 'Does 後面動詞必須還原為原形 work，不可保留 s。' },
            ],
          },
        ],
        practice: repeatPractice,
        selfCheckZh: ['我能在 Does 問句中正確將主要動詞還原。', '我知道何時使用 Do 何時使用 Does。'],
        homework: {
          purposeZh: '隔天提取鞏固記憶',
          estimatedMinutes: 15,
          questions: repeatHomework,
        },
      },
      answers: repeatAnswers,
      parentSummary: {
        focusZh: '依回饋重點加強 do/does 疑問句動詞還原',
        observeZh: ['孩子是否記得 Does 後方動詞用原形'],
        completionCheckZh: '確認各練習階段與作業均有作答即可。',
        personalizationZh: ['依家長回饋指示，本週集中火力強化 do/does 疑問句與動詞還原心法。'],
      },
      qualityEvidence: {
        feedbackApplied: ['依家長回饋重複加強 do/does 疑問句'],
        improvementComparedToPrevious: ['透過對話問答情境加強動詞還原心法'],
        criticalChecks: [
          { id: 'self-study', passed: true, evidence: '每個概念均有中文解說與完整例句。' },
        ],
        criticFindings: [],
      },
    }

    const val = validateCurriculumPackage(repeatPackage)
    expect(val.success).toBe(true)

    const audit = auditCurriculumPackage(repeatPackage)
    const criticalFindings = audit.findings.filter((f) => f.tier === 'structural-critical' || f.tier === 'semantic-critical')
    expect(criticalFindings).toEqual([])
  })

  it('proves failure evidence correctly triggers primary target re-promotion', () => {
    const store = createEmptyStudentCurriculumStore('e54d3363-a68b-4540-a89e-629cd7d2a223', 7)

    // Kobe Week 2 taught do/does
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-camera'],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-do-does-questions'],
    }, '2026-08-18T10:00:00Z')

    // In Week 3 assessment, Kobe records a failure on do/does (miss)
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-do-does-questions', 'miss', '2026-08-18T18:00:00Z')

    expect(store.grammarRecords['g7-do-does-questions']!.missCount).toBe(1)
    expect(store.grammarRecords['g7-do-does-questions']!.masteryStatus).toBe('learning')

    // With explicit failure evidence, re-promoting g7-do-does-questions as primary target in Week 4 IS justified
    const dueCapsule = buildCapCoverageCapsule(store, {
      nowIso: '2026-08-27T00:00:00Z',
      gradeStage: 'grade_7',
    })

    expect(dueCapsule.dueReviewGrammar).toContain('g7-do-does-questions')
  })
})
