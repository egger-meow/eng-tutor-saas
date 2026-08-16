import type { CurriculumPackage } from '@paper-english/generator'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderCurriculumPackagePair } from './render-curriculum-pair.js'

const question = (id: string, prompt: string, options?: string[]) => ({
  id,
  targetIds: ['reading-inference', 'grammar-do-does', 'vocab-experiment'],
  itemType: (options ? 'inference' : 'short-response') as 'inference' | 'short-response',
  prompt,
  options,
  writingLines: options ? 0 : 2,
  difficulty: 'on-level' as const,
})
const paragraphs = [
  'Mina joins a school robotics club because she wants to build a machine to help sort books. The first design moves quickly, but its small camera often mistakes blue covers for green ones during the test.',
  'Her partner Jay suggests changing every part at once. Mina disagrees. She records one problem, changes the light above the camera, and repeats the same test. This time the robot sorts most of the books correctly.',
  'The team still finds two mistakes. Instead of calling the test a failure, they compare both test records. They discover that bright light from the window enters the camera. Their next goal is to design a simple cover for the camera.',
  'Mina learns that careful improvement is not about making quick changes. A useful test keeps most conditions the same, examines clear evidence, and changes one important step. The robot improves because the team learns from each result.',
]
const guided = [question('G1', 'What problem does the camera have?'), question('G2', 'What does Mina change first?')]
const independent = [question('I1', 'Why does Mina repeat the same test?'), question('I2', 'What do the two members compare?')]
const cap = [
  question('C1', 'What can we learn about Mina from the story?', [
    'She changes one thing to understand the result.',
    'She never records any result.',
    'She wants to stop the work.',
    'She changes every part without a plan.',
  ]),
  question('C2', 'What is the lesson of the story?', [
    'Careful testing helps improve a machine.',
    'Robots always sort every book well.',
    'Partners should never disagree.',
    'A camera does not work in a classroom.',
  ]),
]
const production = [question('P1', 'Write one sentence explaining a change you would test.', undefined)]
const retrieval = [question('R1', 'Without looking back, explain when to use does.'), question('R2', 'Recall one new word and use it in a sentence.')]
const homework = [
  question('H1', 'Use the word camera in a sentence.'),
  question('H2', 'Explain why Mina keeps most parts the same.'),
  question('H3', 'Write one do or does question about a robot.'),
]
const all = [...guided, ...independent, ...cap, ...production, ...retrieval, ...homework]

export const curriculumSample: CurriculumPackage = {
  metadata: {
    schemaVersion: '2.2.0',
    jobId: 'kobe-week-2-v2',
    childId: 'kobe',
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
    inputFingerprint: 'sha256:kobe-sample',
  },
  learnerSnapshot: {
    schoolProgress: '現在進行式',
    specificInterests: ['robotics', '機器人與實驗'],
    changedInterests: [],
    avoid: [],
    recentDifficulty: 'too-easy',
    feedbackSummary: '上週太簡單且中文解說不足。',
    recurringMistakes: ['do / does'],
    reviewDue: ['present simple questions'],
  },
  learningPlan: {
    estimatedMinutes: 90,
    difficultyBand: '國一適中',
    targets: [
      {
        id: 'reading-inference',
        domain: 'reading',
        description: '根據因果線索推論。',
        evidence: [{ source: 'feedback', detail: '上週閱讀太簡單。' }],
        successCriteria: '能指出證據。',
      },
      {
        id: 'grammar-do-does',
        domain: 'grammar',
        description: '正確使用 do / does。',
        evidence: [{ source: 'grammar', detail: '反覆答錯。' }],
        successCriteria: '四題答對三題。',
      },
      {
        id: 'vocab-experiment',
        domain: 'vocabulary',
        description: '在語境使用單字。',
        evidence: [{ source: 'curriculum', detail: '本週課程。' }],
        successCriteria: '能理解並造句。',
      },
    ],
    prerequisites: ['一般現在式'],
    reviewStrategy: ['do / does 間隔複習'],
    personalizationStrategy: '以機器人實驗承載推論與證據練習，沒有降低語言難度。',
    exclusions: [],
  },
  studentLesson: {
    opening: {
      goalsZh: ['讀懂實驗中的因果', '用文章證據回答推論題'],
      howToUseZh: '先讀中文任務，再讀英文；不懂的字先看單字區。',
      warmUp: '如果機器人一直認錯顏色，你會先改哪一件事？',
    },
    vocabulary: Array.from({ length: 7 }, (_, index) => ({
      id: `vocab-${index}`,
      word: ['partner', 'suggest', 'sort', 'camera', 'repeat', 'result', 'mistake'][index]!,
      partOfSpeech: 'n.',
      meaningZh: ['夥伴', '建議', '分類', '相機', '重複', '結果', '錯誤'][index]!,
      pronunciationHint: null,
      exampleEn: `The team works with ${['a partner', 'a suggestion', 'a machine to sort', 'a camera', 'a plan to repeat', 'a clear result', 'a mistake'][index]}.`,
      exampleZh: '這是放進語境的例句。',
      status: index === 1 ? 'repeated-miss' : 'new',
    })),
    reading: {
      title: 'One Change at a Time',
      contextZh: 'Mina 的機器人遇到辨識問題；閱讀時注意每次改變與結果。',
      genre: 'article',
      blocks: paragraphs.map((text) => ({ type: 'paragraph' as const, text })),
      wordCount: paragraphs.join(' ').split(/\s+/u).length,
      readingTipsZh: ['看到 because、this time 時，標出原因與結果。'],
      sourceNote: null,
    },
    instruction: [
      {
        id: 'do-does',
        titleZh: 'do / does 問句',
        explanationZh: '主詞是 he、she、it 時用 does，後面的動詞回到原形。',
        patterns: ['Does + he/she/it + 原形動詞?'],
        workedExamples: [
          { example: 'Does Mina record the result?', walkthroughZh: 'Mina 是第三人稱單數，所以用 does；record 不加 s。' },
          { example: 'Do the students compare the tests?', walkthroughZh: 'students 是複數，所以用 do。' },
        ],
        commonMistakes: [
          {
            wrong: 'Does Mina records it?',
            corrected: 'Does Mina record it?',
            whyZh: 'does 已經表示第三人稱，動詞用原形。',
          },
        ],
      },
    ],
    practice: [
      { id: 'guided', stage: 'guided', titleZh: '跟著線索讀', instructionsZh: '先圈出文章中的證據。', hintZh: '先找第二段和第三段。', questions: guided },
      { id: 'independent', stage: 'independent', titleZh: '自己試試看', instructionsZh: '不看提示完成。', hintZh: null, questions: independent },
      { id: 'cap', stage: 'cap-transfer', titleZh: '會考型閱讀轉移', instructionsZh: '比較四個選項，找出最完整的證據。', hintZh: null, questions: cap },
      { id: 'production', stage: 'production', titleZh: '寫出你的想法', instructionsZh: '使用本週單字完成一個句子。', hintZh: null, questions: production },
      { id: 'retrieval', stage: 'retrieval', titleZh: '隔天再想一次', instructionsZh: '先不翻前頁，從記憶中提取。', hintZh: null, questions: retrieval },
    ],
    selfCheckZh: ['我能為答案圈出文章證據。', '我記得 does 後面用原形動詞。'],
    homework: {
      purposeZh: '隔一天再提取本週重點。',
      estimatedMinutes: 20,
      questions: homework,
    },
  },
  answers: all.map((item) => ({
    questionId: item.id,
    answer: '示範答案',
    acceptedAnswers: [],
    explanationZh: '答案要能回到文章證據或文法規則。',
    likelyMisconceptionZh: null,
    followUpZh: '請孩子指出文章中的線索。',
  })),
  parentSummary: {
    focusZh: '推論證據與 do / does',
    observeZh: ['是否能自己指出證據', '是否理解 does 後面用原形'],
    completionCheckZh: '確認每一題都有作答即可，不需要家長先講解。',
    personalizationZh: [
      '上週回饋閱讀偏簡單，本週提高推論深度，並加入中文策略示範引導找證據。',
      '針對容易混淆的 do / does 加入複習題，確認第三人稱單數動詞用法。',
      '結合孩子感興趣的機器人實驗主題，提高閱讀動機。',
    ],
  },
  trackingDelta: {
    introducedVocabularyIds: Array.from({ length: 7 }, (_, index) => `vocab-${index}`),
    reviewedVocabularyIds: [],
    exposedGrammarTargetIds: ['g7-do-does-questions'],
    exposedReadingTargetIds: ['reading-inference'],
    exposedCommunicationFunctionIds: [],
    hypothesesToVerify: ['提高閱讀難度後仍能在時間內完成'],
    nextReviewCandidates: ['do / does'],
  },
  qualityEvidence: {
    feedbackApplied: ['提升閱讀篇幅與推論深度', '加入完整中文解說'],
    improvementComparedToPrevious: ['本週加入中文策略示範，並將推論題改為有證據可回查的題型。'],
    criticalChecks: [{ id: 'self-study', passed: true, evidence: '每個新概念都有中文解說與 worked examples。' }],
    criticFindings: [],
  },
}

if (process.argv[1]?.endsWith('generate-curriculum-sample.ts')) {
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const outputDir = resolve(repositoryRoot, 'output/pdf/curriculum-v2-sample')
  await mkdir(outputDir, { recursive: true })
  const result = await renderCurriculumPackagePair(curriculumSample, outputDir)
  console.log(JSON.stringify(result, null, 2))
}
