import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage, validateCurriculumPackage, type CurriculumPackage, type CurriculumQuestion } from './index.js'

function validPackage(): CurriculumPackage {
  const paragraphs = [
    'Mina joins a school robotics club because she wants to build a machine that can sort books. The first design moves quickly, but its small camera often mistakes blue covers for green ones during the test.',
    'Her partner Jay suggests changing every part at once. Mina disagrees. She records one problem, changes the light above the camera, and repeats the same test. This time the robot sorts most of the books correctly.',
    'The team still finds two mistakes. Instead of calling the project a failure, they compare both test records. They discover that shiny covers reflect the classroom light. Their next goal is to design a simple shade for the camera.',
    'Mina learns that careful improvement is not about making random changes. A useful experiment keeps most conditions the same, examines clear evidence, and changes one important factor. The robot improves because the team learns from each result.',
  ]
  const question = (id: string, itemType: CurriculumQuestion['itemType'] = 'short-response'): CurriculumQuestion => ({ id, targetIds: ['reading-inference', 'grammar-do-does', 'vocab-experiment'], itemType, prompt: `請根據文章回答第 ${id} 題。`, options: itemType === 'inference' ? ['選項 A', '選項 B', '選項 C', '選項 D'] : undefined, writingLines: itemType === 'inference' ? 0 : 2, difficulty: 'on-level' })
  const practice: CurriculumPackage['studentLesson']['practice'] = [
    { id: 'guided-reading', stage: 'guided', titleZh: '跟著線索讀', instructionsZh: '先圈出文章中的證據。', hintZh: '答案在第二段。', questions: [question('G1'), question('G2'), question('G3')] },
    { id: 'independent-reading', stage: 'independent', titleZh: '自己試試看', instructionsZh: '不看提示完成。', hintZh: null, questions: [question('I1'), question('I2'), question('I3')] },
    { id: 'cap-reading', stage: 'cap-transfer', titleZh: '會考型閱讀', instructionsZh: '比較四個選項。', hintZh: null, questions: [question('C1', 'inference'), question('C2', 'inference'), question('C3', 'inference')] },
    { id: 'production', stage: 'production', titleZh: '寫出你的想法', instructionsZh: '使用本週句型。', hintZh: null, questions: [question('P1', 'sentence-production')] },
  ]
  const homeworkQuestions = [question('H1'), question('H2'), question('H3')]
  const allQuestions = [...practice.flatMap((section) => section.questions), ...homeworkQuestions]
  return {
    metadata: { schemaVersion: '2.0.0', jobId: 'job-2', childId: 'child-1', weekNumber: 2, grade: 7, gradeStage: 'grade_7', title: '讓機器人從錯誤中學習', generatedAt: '2026-08-12T00:00:00.000Z', curriculumVersion: 'curriculum/2.0.0', promptVersion: 'prompt/2.0.0', rubricVersion: 'rubric/2.0.0', rendererVersion: 'renderer/2.0.0', model: 'scheduled-worker', inputFingerprint: 'sha256:fixture' },
    learnerSnapshot: { schoolProgress: '現在進行式', specificInterests: ['機器人'], changedInterests: [], avoid: [], recentDifficulty: 'too-easy', feedbackSummary: '上週太簡單且中文解說不足。', recurringMistakes: ['do / does'], reviewDue: ['present simple questions'] },
    learningPlan: { estimatedMinutes: 90, difficultyBand: '國一適中', targets: [{ id: 'reading-inference', domain: 'reading', description: '根據前後因果推論。', evidence: [{ source: 'feedback', detail: '上週閱讀太簡單。' }], successCriteria: '能指出證據並選出合理推論。' }, { id: 'grammar-do-does', domain: 'grammar', description: '正確使用 do 與 does。', evidence: [{ source: 'grammar', detail: '近期重複答錯。' }], successCriteria: '四題至少答對三題。' }, { id: 'vocab-experiment', domain: 'vocabulary', description: '在語境使用核心單字。', evidence: [{ source: 'curriculum', detail: '銜接學校進度。' }], successCriteria: '能理解並造句。' }], prerequisites: ['一般現在式肯定句'], reviewStrategy: ['do / does 間隔複習'], personalizationStrategy: '以具體機器人實驗承載推論練習，不降低語言難度。', exclusions: [] },
    studentLesson: {
      opening: { goalsZh: ['讀懂實驗改進的因果', '用證據回答推論題'], howToUseZh: '先讀中文任務，再讀英文；不懂的字先看單字區。', warmUp: '如果機器人一直認錯顏色，你會先改哪一件事？' },
      vocabulary: Array.from({ length: 7 }, (_, index) => ({ id: `vocab-${index}`, word: `word${index}`, partOfSpeech: 'n.', meaningZh: `意思 ${index}`, pronunciationHint: null, exampleEn: `This is example ${index}.`, exampleZh: `這是例句 ${index}。`, status: index === 0 ? 'repeated-miss' : 'new' })),
      reading: { title: 'One Change at a Time', contextZh: 'Mina 的機器人遇到辨識問題。閱讀時注意每次改變與結果。', paragraphs, wordCount: paragraphs.join(' ').split(/\s+/u).length, readingTipsZh: ['看到 because、this time 時，標出原因與結果。'], sourceNote: null },
      instruction: [{ id: 'instruction-do-does', titleZh: 'do / does 問句', explanationZh: '主詞是 he、she、it 時用 does，後面的動詞回到原形。', patterns: ['Does + he/she/it + 原形動詞?'], workedExamples: [{ example: 'Does Mina record the result?', walkthroughZh: 'Mina 是第三人稱單數，所以用 does；record 不加 s。' }, { example: 'Do the students compare the tests?', walkthroughZh: 'students 是複數，所以用 do。' }], commonMistakes: [{ wrong: 'Does Mina records it?', corrected: 'Does Mina record it?', whyZh: 'does 已經表示第三人稱，動詞用原形。' }] }],
      practice,
      selfCheckZh: ['我能為答案圈出文章證據。', '我記得 does 後面用原形動詞。'],
      homework: { purposeZh: '隔一天再提取本週重點。', estimatedMinutes: 20, questions: homeworkQuestions },
    },
    answers: allQuestions.map((item) => ({ questionId: item.id, answer: '示範答案', acceptedAnswers: [], explanationZh: '答案必須引用文章中的線索。', likelyMisconceptionZh: null, followUpZh: null })),
    parentSummary: { focusZh: '推論證據與 do / does', observeZh: ['是否能自己指出證據'], completionCheckZh: '確認每一題都有作答即可。' },
    trackingDelta: { introducedVocabularyIds: Array.from({ length: 7 }, (_, index) => `vocab-${index}`), reviewedVocabularyIds: [], grammarTargets: ['grammar-do-does'], readingTargets: ['reading-inference'], hypothesesToVerify: ['提高閱讀難度後仍能在時間內完成'], nextReviewCandidates: ['do / does'] },
    qualityEvidence: { feedbackApplied: ['提升閱讀篇幅與推論深度', '加入完整中文解說'], improvementComparedToPrevious: ['本週加入中文策略示範，並將推論題改為有證據可回查的 CAP 題型。'], criticalChecks: [{ id: 'self-study', passed: true, evidence: '每個新概念均有中文解說與 worked examples。' }], criticFindings: [] },
  }
}

describe('curriculum package v2', () => {
  it('accepts a self-study package with complete provenance', () => {
    const result = validateCurriculumPackage(validPackage())
    expect(result.success ? [] : result.issues).toEqual([])
  })

  it('accepts all legitimate variants for an open response', () => {
    const value = validPackage()
    value.answers[0]!.acceptedAnswers = Array.from({ length: 12 }, (_, index) => `legitimate variant ${index + 1}`)
    expect(validateCurriculumPackage(value).success).toBe(true)
  })

  it('requires evidence for every target across more than one learning stage', () => {
    const value = validPackage()
    for (const stage of value.studentLesson.practice) {
      for (const question of stage.questions) question.targetIds = ['reading-inference']
    }
    for (const question of value.studentLesson.homework.questions) question.targetIds = ['reading-inference']

    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(false)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'evidence-plan', severity: 'critical' }),
    ]))
  })

  it.each([
    ['a missing gradual-release stage', (value: ReturnType<typeof validPackage>) => { value.studentLesson.practice = value.studentLesson.practice.filter((section) => section.stage !== 'guided') }],
    ['an unresolved critical review finding', (value: ReturnType<typeof validPackage>) => { value.qualityEvidence.criticFindings.push({ dimension: 'self-study', severity: 'critical', finding: 'No usable Chinese explanation.', resolution: null }) }],
    ['a dishonest reading word count', (value: ReturnType<typeof validPackage>) => { value.studentLesson.reading.wordCount += 50 }],
    ['an answer gap', (value: ReturnType<typeof validPackage>) => { value.answers.pop() }],
    ['an unknown learning target', (value: ReturnType<typeof validPackage>) => { value.studentLesson.practice[0]!.questions[0]!.targetIds = ['missing-target'] }],
    ['forbidden engine terminology in parentSummary.personalizationZh (production packet)', (value: ReturnType<typeof validPackage>) => {
      value.parentSummary.personalizationZh = ['Week 1 無前一份 production packet 可比較；本週建立閱讀取證、字彙提取與因果產出的可觀察基線']
    }],
    ['forbidden debug/measurement jargon in parentSummary.personalizationZh (observable baseline)', (value: ReturnType<typeof validPackage>) => {
      value.parentSummary.personalizationZh = ['本週建立可量測基準：同一目標跨 guided、independent、CAP、production、retrieval 與 homework 留下提示前後證據。']
    }],
    ['forbidden silence-mastery trope in parentSummary.personalizationZh', (value: ReturnType<typeof validPackage>) => {
      value.parentSummary.personalizationZh = ['本輪為 Week 1 且 feedbackMissing=true；沒有把沉默視為掌握，採保守校準。']
    }],
  ])('rejects %s', (_, mutate) => {
    const value = validPackage()
    mutate(value)
    expect(validateCurriculumPackage(value).success).toBe(false)
  })

  it('accepts clean parent-facing personalizationZh answering parent questions', () => {
    const value = validPackage()
    value.parentSummary.personalizationZh = [
      '上週閱讀偏簡單，本週提高推論深度，並加入中文策略示範引導找證據。',
      '針對容易混淆的 do / does 加入複習題，確認第三人稱單數動詞用法。',
      '結合孩子感興趣的機器人實驗主題，提高閱讀動機。',
    ]
    const result = validateCurriculumPackage(value)
    expect(result.success).toBe(true)
  })
})
