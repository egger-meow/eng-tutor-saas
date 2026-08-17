import { mkdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { curriculumSample } from './generate-curriculum-sample.js'
import { renderCurriculumPackagePair } from './render-curriculum-pair.js'
import { inspectCurriculumPdfPair } from './inspect-pdf.js'
import type { CurriculumPackage } from '@paper-english/generator'

async function generateAllSamples(): Promise<void> {
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const outputDir = resolve(repositoryRoot, 'output/pdf/curriculum-samples')
  await mkdir(outputDir, { recursive: true })

  // 1. Article / Narrative Sample
  const narrativePkg: CurriculumPackage = structuredClone(curriculumSample)
  narrativePkg.metadata.jobId = 'sample-1-narrative'
  narrativePkg.metadata.title = 'One Change at a Time'

  // 2. Dialogue Sample
  const dialoguePkg: CurriculumPackage = structuredClone(curriculumSample)
  dialoguePkg.metadata.jobId = 'sample-2-dialogue'
  dialoguePkg.metadata.title = 'Debating the Sensor Issue'
  dialoguePkg.studentLesson.reading = {
    title: 'Debating the Sensor Issue',
    contextZh: 'Mina 與 Jay 在討論感測器調整方案。',
    genre: 'dialogue',
    blocks: [
      { type: 'dialogue', speaker: 'Mina', text: 'Why did the camera mistake the blue cover for green during the trial?' },
      { type: 'dialogue', speaker: 'Jay', text: 'I checked the test records. The direct sunlight above the table was too bright.' },
      { type: 'dialogue', speaker: 'Mina', text: 'Let us build a simple cardboard cover for the lens and test it again.' },
      { type: 'dialogue', speaker: 'Jay', text: 'Good idea. I will record the sorting accuracy on our worksheet.' },
    ],
    wordCount: 130,
    readingTipsZh: ['觀察兩人的不同觀點與解決方案'],
    sourceNote: null,
  }

  // 3. Notice & Schedule Sample
  const noticeSchedulePkg: CurriculumPackage = structuredClone(curriculumSample)
  noticeSchedulePkg.metadata.jobId = 'sample-3-notice-schedule'
  noticeSchedulePkg.metadata.title = 'Robotics Workshop Bulletin & Schedule'
  noticeSchedulePkg.studentLesson.reading = {
    title: 'Robotics Workshop Daily Schedule',
    contextZh: '青少年機器人工作坊的公告與日程安排。',
    genre: 'schedule',
    blocks: [
      { type: 'notice', heading: 'Workshop Guidelines', text: 'All participants must wear safety goggles and sign in at Room 204 before 9:00 AM.' },
      { type: 'schedule-row', timeOrStep: '09:00 - 10:30', event: 'Sensor Calibration', detail: 'Calibrate camera sensors under room lighting' },
      { type: 'schedule-row', timeOrStep: '10:45 - 12:00', event: 'Book Sorting Trial', detail: 'Run test with 50 colored book covers' },
      { type: 'schedule-row', timeOrStep: '13:30 - 15:00', event: 'Error Log Analysis', detail: 'Compare logs and design lens cover' },
    ],
    wordCount: 140,
    readingTipsZh: ['檢索特定時段的活動內容與注意事項'],
    sourceNote: 'Robotics Club Notice Board',
  }

  // 4. Long-Writing Sample
  const writingPkg: CurriculumPackage = structuredClone(curriculumSample)
  writingPkg.metadata.jobId = 'sample-4-writing'
  writingPkg.metadata.title = 'Engineering and Expression'
  writingPkg.studentLesson.practice = [
    {
      id: 'writing-guided',
      stage: 'guided',
      titleZh: '引導句型練習',
      instructionsZh: '根據例句完成問句。',
      hintZh: '注意第三人稱單數主詞搭配 does。',
      questions: [
        {
          id: 'G1',
          targetIds: ['grammar-do-does'],
          itemType: 'short-response',
          prompt: 'How does Mina test the robot camera?',
          writingLines: 2,
          difficulty: 'supported',
        },
      ],
    },
    {
      id: 'writing-prod',
      stage: 'production',
      titleZh: '深入表達寫作',
      instructionsZh: '運用本週單字與文法寫出完整段落。',
      hintZh: '包含至少兩個本週核心單字。',
      questions: [
        {
          id: 'P1',
          targetIds: ['grammar-do-does'],
          itemType: 'sentence-production',
          prompt: 'Write two sentences explaining how you solve a difficult problem when an experiment fails.',
          writingLines: 4,
          difficulty: 'stretch',
        },
        {
          id: 'P2',
          targetIds: ['vocab-experiment'],
          itemType: 'sentence-production',
          prompt: 'Describe your own science project and explain why careful testing matters.',
          writingLines: 6,
          difficulty: 'stretch',
        },
      ],
    },
    {
      id: 'writing-retrieval',
      stage: 'retrieval',
      titleZh: '記憶提取',
      instructionsZh: '不翻閱前頁，寫下本週學到的兩個核心概念。',
      hintZh: null,
      questions: [
        {
          id: 'R1',
          targetIds: ['grammar-do-does'],
          itemType: 'short-response',
          prompt: 'When should we use does instead of do?',
          writingLines: 2,
          difficulty: 'on-level',
        },
      ],
    },
  ]
  writingPkg.answers = [
    { questionId: 'G1', answer: 'She keeps most conditions the same and changes the light above the camera.', acceptedAnswers: [], explanationZh: '文章第二段說明。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'P1', answer: 'When an experiment fails, I check my records carefully. Then I change one step to find the problem.', acceptedAnswers: [], explanationZh: '完整使用文法與單字。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'P2', answer: 'In my robotics project, I test the sensors under different lights. Careful testing helps improve the machine.', acceptedAnswers: [], explanationZh: '清楚表達觀點。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'R1', answer: 'Use does when the subject is third-person singular (he, she, it).', acceptedAnswers: ['When subject is he/she/it'], explanationZh: '第三人稱單數問句與肯定句規則。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'H1', answer: 'The camera takes clear photos.', acceptedAnswers: [], explanationZh: '單字造句。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'H2', answer: 'To understand which change affects the result.', acceptedAnswers: [], explanationZh: '科學實驗控制變因概念。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'H3', answer: 'Does the robot sort books well?', acceptedAnswers: [], explanationZh: '正確構成 does 問句。', likelyMisconceptionZh: null, followUpZh: null },
  ]

  const packages = [
    { name: '1-narrative', pkg: narrativePkg },
    { name: '2-dialogue', pkg: dialoguePkg },
    { name: '3-notice-schedule', pkg: noticeSchedulePkg },
    { name: '4-writing', pkg: writingPkg },
  ]

  const results = []
  for (const { name, pkg } of packages) {
    const pair = await renderCurriculumPackagePair(pkg, outputDir)
    const studentStat = await stat(pair.studentPath)
    const parentStat = await stat(pair.parentAnswerPath)
    const { student, parentAnswer } = await inspectCurriculumPdfPair(pkg, {
      student: new Uint8Array(await readFile(pair.studentPath)),
      parentAnswer: new Uint8Array(await readFile(pair.parentAnswerPath)),
    })
    results.push({
      genre: name,
      studentPdf: { path: pair.studentPath, bytes: studentStat.size, pages: student.pageCount },
      parentAnswerPdf: { path: pair.parentAnswerPath, bytes: parentStat.size, pages: parentAnswer.pageCount },
    })
  }

  console.log(JSON.stringify(results, null, 2))
}

generateAllSamples().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
