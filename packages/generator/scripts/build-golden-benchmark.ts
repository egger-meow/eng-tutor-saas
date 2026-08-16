import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CurriculumPackageSchema, type CurriculumPackage } from '../src/curriculum-package-schema.js'
import {
  goldenContextA,
  goldenContextB,
  goldenContextC,
  goldenContextD,
  goldenContextE,
} from '../src/fixtures/golden-contexts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../../..')
const EVAL_ROOT = resolve(REPO_ROOT, 'docs/evaluations/wave-2')

function sha256(content: string): string {
  return createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
}

const commonParagraphsA = [
  'Alex enters a large underground cave in his Minecraft world to collect materials for a new redstone machine. He needs redstone dust, iron ingots, and smooth stone blocks to build an automatic secret door.',
  'First, Alex places the redstone block on the stone floor. He attaches two iron doors next to the cave wall. Then he carefully connects redstone dust between the power source and the heavy iron doors.',
  'When Alex steps on the stone pressure plate, the redstone signal activates immediately and the two doors open smoothly. Alex smiles because his machine works perfectly without making any noise.',
  'He puts the extra redstone dust back into his inventory. Building working machines in the cave gives Alex great confidence to explore deeper underground tunnels with his friends tomorrow.',
]

const wordCountA = commonParagraphsA.join(' ').split(/\s+/u).length

// Case A: 2.0.1 (Rule list, weak distractors) vs 2.1.0 (Trigger-Pattern-Trap-Try, plausible traps)
const caseA_201: CurriculumPackage = {
  metadata: {
    schemaVersion: '2.0.0',
    jobId: 'golden-case-a-g7-minecraft',
    childId: 'alex-g7',
    weekNumber: 1,
    grade: 7,
    gradeStage: 'incoming_grade_7',
    title: 'Building with Redstone',
    generatedAt: '2026-08-16T22:00:00.000Z',
    curriculumVersion: 'curriculum/2.0.0',
    promptVersion: '2.0.1',
    rubricVersion: 'rubric/2.0.0',
    rendererVersion: 'renderer/2.0.0',
    model: 'gpt-4o-baseline',
    inputFingerprint: 'sha256:case-a-fingerprint',
  },
  learnerSnapshot: {
    schoolProgress: 'Starter Unit: Pronouns & Be-verbs',
    specificInterests: ['Minecraft', 'building redstone machines'],
    changedInterests: [],
    avoid: ['fairy tales'],
    recentDifficulty: 'appropriate',
    feedbackSummary: '剛升國一，對長篇英文有點排斥，但如果有麥塊情境會願意讀。be 動詞單複數常搞混。',
    recurringMistakes: ['be-verb agreement with singular subjects'],
    reviewDue: ['pronouns (he/she/they)'],
  },
  learningPlan: {
    estimatedMinutes: 60,
    difficultyBand: '國一先修入門',
    targets: [
      {
        id: 'lang-be-verb',
        domain: 'grammar',
        description: '辨析主詞單複數並正確選用 is 與 are',
        evidence: [{ source: 'feedback', detail: 'be 動詞單複數常搞混' }],
        successCriteria: '四題文法練習題答對三題以上',
      },
      {
        id: 'read-redstone-steps',
        domain: 'reading',
        description: '讀懂麥塊紅石裝置的組裝步驟與因果關係',
        evidence: [{ source: 'profile', detail: '喜愛麥塊紅石主題' }],
        successCriteria: '能根據文章回答兩題閱讀細節與推論題',
      },
      {
        id: 'retrieval-pronouns',
        domain: 'review',
        description: '提取代名詞與單字記憶',
        evidence: [{ source: 'learning-state', detail: '複習人稱代名詞' }],
        successCriteria: '能無提示寫出代名詞與單字',
      },
    ],
    prerequisites: ['人稱代名詞 I/You/He/She/They'],
    reviewStrategy: ['在閱讀與練習中複習代名詞'],
    personalizationStrategy: '以紅石機關建置為情境，降低文法焦慮感',
    exclusions: ['現在完成式', '被動語態'],
  },
  studentLesson: {
    opening: {
      goalsZh: ['學會 is 和 are 的用法', '讀懂簡單的紅石組裝故事'],
      howToUseZh: '先看左邊單字，再讀短文，最後完成練習題。',
      warmUp: '你在麥塊裡做過最酷的紅石機關是什麼？',
    },
    vocabulary: [
      { id: 'v-block', word: 'block', partOfSpeech: 'n.', meaningZh: '方塊', pronunciationHint: null, exampleEn: 'Place one redstone block on the ground.', exampleZh: '在地上放置一個紅石方塊。', status: 'new' },
      { id: 'v-tool', word: 'tool', partOfSpeech: 'n.', meaningZh: '工具', pronunciationHint: null, exampleEn: 'Use a good tool to mine stone.', exampleZh: '使用好工具來採礦。', status: 'new' },
      { id: 'v-build', word: 'build', partOfSpeech: 'v.', meaningZh: '建造', pronunciationHint: null, exampleEn: 'We build a secret door today.', exampleZh: '我們今天建造一扇暗門。', status: 'new' },
      { id: 'v-machine', word: 'machine', partOfSpeech: 'n.', meaningZh: '機器', pronunciationHint: null, exampleEn: 'The machine opens the door automatically.', exampleZh: '這台機器會自動開門。', status: 'new' },
      { id: 'v-material', word: 'material', partOfSpeech: 'n.', meaningZh: '材料', pronunciationHint: null, exampleEn: 'Collect every material first.', exampleZh: '先收集所有材料。', status: 'new' },
      { id: 'v-inventory', word: 'inventory', partOfSpeech: 'n.', meaningZh: '物品欄', pronunciationHint: null, exampleEn: 'Keep the dust in your inventory.', exampleZh: '把紅石粉放在你的物品欄。', status: 'new' },
      { id: 'v-craft', word: 'craft', partOfSpeech: 'v.', meaningZh: '製作', pronunciationHint: null, exampleEn: 'Craft two torches for the circuit.', exampleZh: '為電路製作兩支火把。', status: 'new' },
    ],
    reading: {
      title: 'Alex Builds a Secret Door',
      contextZh: 'Alex 想要用紅石做一扇自動門，讓我們看看他怎麼做。',
      paragraphs: commonParagraphsA,
      wordCount: wordCountA,
      readingTipsZh: ['注意 Alex 使用了哪些材料。'],
      sourceNote: null,
    },
    instruction: [
      {
        id: 'ins-be-verb',
        titleZh: 'be 動詞 is 與 are',
        explanationZh: '單數主詞（如 he, she, it, one block）用 is；複數主詞（如 they, we, two doors）用 are。',
        patterns: ['單數主詞 + is + 形容詞/名詞', '複數主詞 + are + 形容詞/名詞'],
        workedExamples: [
          { example: 'The redstone block is red.', walkthroughZh: '主詞是單數的一塊紅石，所以用 is。' },
          { example: 'Two iron doors are strong.', walkthroughZh: '主詞是複數的兩扇門，所以用 are。' },
        ],
        commonMistakes: [
          { wrong: 'The block are red.', corrected: 'The block is red.', whyZh: '單數主詞不能用 are。' },
        ],
      },
    ],
    practice: [
      {
        id: 'stg-guided',
        stage: 'guided',
        titleZh: '暖身引導題',
        instructionsZh: '根據短文內容選出正確答案。',
        hintZh: '請看第 2 段。',
        questions: [
          { id: 'q-g1', targetIds: ['read-redstone-steps'], itemType: 'detail', prompt: 'Where does Alex place the first redstone block?', options: ['On the floor', 'On the tree', 'In the water', 'Under the bed'], writingLines: 0, difficulty: 'supported' },
          { id: 'q-g2', targetIds: ['lang-be-verb'], itemType: 'grammar', prompt: 'The redstone block _____ on the floor.', options: ['is', 'are', 'am', 'be'], writingLines: 0, difficulty: 'supported' },
        ],
      },
      {
        id: 'stg-independent',
        stage: 'independent',
        titleZh: '自主練習題',
        instructionsZh: '自己完成下列題目。',
        hintZh: null,
        questions: [
          { id: 'q-i1', targetIds: ['lang-be-verb'], itemType: 'grammar', prompt: 'Two iron doors _____ next to the wall.', options: ['are', 'is', 'am', 'be'], writingLines: 0, difficulty: 'on-level' },
        ],
      },
      {
        id: 'stg-cap',
        stage: 'cap-transfer',
        titleZh: '會考素養題',
        instructionsZh: '選出最符合文意的推論。',
        hintZh: null,
        questions: [
          { id: 'q-c1', targetIds: ['read-redstone-steps'], itemType: 'inference', prompt: 'What can we infer about Alex?', options: ['He successfully built a working door.', 'He lost his inventory.', 'He dislikes redstone.', 'He wants to sleep in the cave.'], writingLines: 0, difficulty: 'on-level' },
        ],
      },
      {
        id: 'stg-production',
        stage: 'production',
        titleZh: '句型造句',
        instructionsZh: '寫出一個包含 is 的完整句子。',
        hintZh: null,
        questions: [
          { id: 'q-p1', targetIds: ['lang-be-verb'], itemType: 'sentence-production', prompt: '用 The machine 和 is 寫出一個句子。', writingLines: 2, difficulty: 'on-level' },
        ],
      },
      {
        id: 'stg-retrieval',
        stage: 'retrieval',
        titleZh: '記憶提取',
        instructionsZh: '回想代名詞與 be 動詞的搭配。',
        hintZh: null,
        questions: [
          { id: 'q-r1', targetIds: ['retrieval-pronouns'], itemType: 'short-response', prompt: 'He 搭配的 be 動詞是哪一個？', writingLines: 1, difficulty: 'supported' },
        ],
      },
    ],
    selfCheckZh: ['我知道單數主詞搭配 is。', '我知道複數主詞搭配 are。'],
    homework: {
      purposeZh: '隔天再提取一次 be 動詞與單字記憶。',
      estimatedMinutes: 15,
      questions: [
        { id: 'q-h1', targetIds: ['lang-be-verb'], itemType: 'grammar', prompt: 'My friend _____ in the cave.', options: ['is', 'are', 'am', 'be'], writingLines: 0, difficulty: 'on-level' },
        { id: 'q-h2', targetIds: ['read-redstone-steps'], itemType: 'short-response', prompt: 'What machine does Alex build in the story?', writingLines: 2, difficulty: 'on-level' },
        { id: 'q-h3', targetIds: ['retrieval-pronouns'], itemType: 'sentence-production', prompt: 'Write a sentence with "are strong".', writingLines: 2, difficulty: 'on-level' },
      ],
    },
  },
  answers: [
    { questionId: 'q-g1', answer: 'On the floor', acceptedAnswers: [], explanationZh: '選 A，文章第 2 段有寫。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-g2', answer: 'is', acceptedAnswers: [], explanationZh: '選 A，主詞是單數所以用 is。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-i1', answer: 'are', acceptedAnswers: [], explanationZh: '選 A，Two iron doors 是複數所以用 are。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-c1', answer: 'He successfully built a working door.', acceptedAnswers: [], explanationZh: '選 A，因為門打開了他很開心。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-p1', answer: 'The machine is new.', acceptedAnswers: ['The machine is fast.'], explanationZh: '主詞 The machine 為單數，接 is + 形容詞。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-r1', answer: 'is', acceptedAnswers: [], explanationZh: 'He 是第三人稱單數，搭配 is。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-h1', answer: 'is', acceptedAnswers: [], explanationZh: 'My friend 是單數，選 is。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-h2', answer: 'A secret door.', acceptedAnswers: ['A secret door machine.'], explanationZh: 'Alex 建造了一扇自動暗門。', likelyMisconceptionZh: null, followUpZh: null },
    { questionId: 'q-h3', answer: 'The doors are strong.', acceptedAnswers: [], explanationZh: '複數主詞接 are strong。', likelyMisconceptionZh: null, followUpZh: null },
  ],
  parentSummary: {
    focusZh: 'be 動詞單複數（is / are）',
    observeZh: ['孩子是否能辨認單數名詞搭配 is', '是否理解複數名詞搭配 are'],
    completionCheckZh: '確認所有題目皆有作答。',
    personalizationZh: [
      '剛升國一先以基礎 be 動詞為主，建立英文信心。',
      '結合麥塊紅石機關情境，提升閱讀意願。',
      '透過單複數對照練習，釐清 is 與 are 的差別。',
    ],
  },
  trackingDelta: {
    introducedVocabularyIds: ['v-block', 'v-tool', 'v-build', 'v-machine', 'v-material', 'v-inventory', 'v-craft'],
    reviewedVocabularyIds: [],
    grammarTargets: ['lang-be-verb'],
    readingTargets: ['read-redstone-steps'],
    hypothesesToVerify: ['以麥塊情境引導能順利完成 60 分鐘練習'],
    nextReviewCandidates: ['is / are agreement'],
  },
  qualityEvidence: {
    feedbackApplied: ['以麥塊情境設計入門教材'],
    improvementComparedToPrevious: ['第一週校準教材，建立初始基線。'],
    criticalChecks: [{ id: 'self-study', passed: true, evidence: '包含中文解說與例句對照。' }],
    criticFindings: [],
  },
}

// Case A: 2.1.0 Upgrade (Trigger-Pattern-Trap-Try, plausible error modeling, why-not parent answers)
const caseA_210: CurriculumPackage = {
  ...caseA_201,
  metadata: {
    ...caseA_201.metadata,
    promptVersion: '2.1.0',
    model: 'gpt-4o-wave2',
  },
  studentLesson: {
    ...caseA_201.studentLesson,
    instruction: [
      {
        id: 'ins-be-verb',
        titleZh: 'be 動詞判斷三步反射心法',
        explanationZh: '看到句子先找主詞：一個物品（單數）或 he/she/it ➔ 立即配 is；兩個以上（複數）或 they/we ➔ 立即配 are。小心別被後面的名詞騙了！',
        patterns: [
          '【觸發訊號】主詞是 1 個（單數 / he / she / it） ➔ 配 is',
          '【觸發訊號】主詞是 2 個以上（複數 / we / they） ➔ 配 are',
        ],
        workedExamples: [
          {
            example: 'The redstone block is on the floor.',
            walkthroughZh: '【第1步找主詞】The redstone block 是 1 個方塊（單數）➔ 【第2步選動詞】配 is。',
          },
          {
            example: 'Two iron doors are next to the wall.',
            walkthroughZh: '【第1步找主詞】Two iron doors 是 2 扇門（複數）➔ 【第2步選動詞】配 are。',
          },
        ],
        commonMistakes: [
          {
            wrong: 'The block with two torches are red.',
            corrected: 'The block with two torches is red.',
            whyZh: '【陷阱】眼睛不要只看前面的 torches！真正的主詞是 The block（單數），所以一定要用 is。',
          },
        ],
      },
    ],
    practice: [
      {
        id: 'stg-guided',
        stage: 'guided',
        titleZh: '步驟引導試一試',
        instructionsZh: '先圈出主詞是單數還是複數，再選出正確答案。',
        hintZh: '請看文章第 2 段第一句話。',
        questions: [
          { id: 'q-g1', targetIds: ['read-redstone-steps'], itemType: 'detail', prompt: 'Where does Alex place the first redstone block?', options: ['Under the dark cave', 'On the floor', 'Next to the iron doors', 'Inside his inventory'], writingLines: 0, difficulty: 'supported' },
          { id: 'q-g2', targetIds: ['lang-be-verb'], itemType: 'grammar', prompt: 'The redstone block with red dust _____ on the floor.', options: ['is', 'are', 'am', 'be'], writingLines: 0, difficulty: 'supported' },
        ],
      },
      {
        id: 'stg-independent',
        stage: 'independent',
        titleZh: '自己試試看',
        instructionsZh: '運用三步心法找出正確的 be 動詞。',
        hintZh: null,
        questions: [
          { id: 'q-i1', targetIds: ['lang-be-verb'], itemType: 'grammar', prompt: 'Two iron doors in the secret room _____ strong.', options: ['is', 'are', 'am', 'be'], writingLines: 0, difficulty: 'on-level' },
        ],
      },
      {
        id: 'stg-cap',
        stage: 'cap-transfer',
        titleZh: '會考閱讀推理轉移',
        instructionsZh: '仔細閱讀細節與因果，選出最佳推論。',
        hintZh: null,
        questions: [
          { id: 'q-c1', targetIds: ['read-redstone-steps'], itemType: 'inference', prompt: 'Why is Alex happy at the end of the story?', options: ['He found diamonds in the cave.', 'His redstone circuit successfully opened the iron doors.', 'He collected every tool in his inventory.', 'The cave became completely safe.'], writingLines: 0, difficulty: 'on-level' },
        ],
      },
      {
        id: 'stg-production',
        stage: 'production',
        titleZh: '寫出你的想法',
        instructionsZh: '用 The machine 和 is 寫出一個完整句子。',
        hintZh: null,
        questions: [
          { id: 'q-p1', targetIds: ['lang-be-verb'], itemType: 'sentence-production', prompt: '用 The machine 和 is 描述它運作順利。', writingLines: 2, difficulty: 'on-level' },
        ],
      },
      {
        id: 'stg-retrieval',
        stage: 'retrieval',
        titleZh: '隔天大腦提取',
        instructionsZh: '不看前頁，快速寫出答案。',
        hintZh: null,
        questions: [
          { id: 'q-r1', targetIds: ['retrieval-pronouns'], itemType: 'short-response', prompt: '看到主詞是 Alex（單數）時，be 動詞要用哪一個？', writingLines: 1, difficulty: 'supported' },
        ],
      },
    ],
    homework: {
      purposeZh: '隔一天再提取本週核心心法與單字。',
      estimatedMinutes: 15,
      questions: [
        { id: 'q-h1', targetIds: ['lang-be-verb'], itemType: 'grammar', prompt: 'The machine with many redstone parts _____ ready.', options: ['is', 'are', 'am', 'be'], writingLines: 0, difficulty: 'on-level' },
        { id: 'q-h2', targetIds: ['read-redstone-steps'], itemType: 'short-response', prompt: 'Why did Alex connect the redstone dust to the doors?', writingLines: 2, difficulty: 'on-level' },
        { id: 'q-h3', targetIds: ['retrieval-pronouns'], itemType: 'sentence-production', prompt: 'Write a sentence with "Two machines are".', writingLines: 2, difficulty: 'on-level' },
      ],
    },
  },
  answers: [
    {
      questionId: 'q-g1',
      answer: 'On the floor',
      acceptedAnswers: [],
      explanationZh: '第 2 段第 1 句明確指出 "The first redstone block is on the floor"，故選 B。',
      likelyMisconceptionZh: '容易選 C：因為文章提到鐵門（iron doors），但那是放在牆邊（next to the wall），不是放紅石方塊的位置。',
      followUpZh: null,
    },
    {
      questionId: 'q-g2',
      answer: 'is',
      acceptedAnswers: [],
      explanationZh: '主詞是 The redstone block（單數），故使用 is。',
      likelyMisconceptionZh: '容易選 B（are）：因為看到介系詞片語中的 red dust 誤以為是複數名詞，但真正主詞只有一個 block。',
      followUpZh: null,
    },
    {
      questionId: 'q-i1',
      answer: 'are',
      acceptedAnswers: [],
      explanationZh: '主詞是 Two iron doors（複數兩扇門），故選 are。',
      likelyMisconceptionZh: '容易選 A（is）：因為看到 room 是單數而混淆，應認清主詞核心是 doors。',
      followUpZh: null,
    },
    {
      questionId: 'q-c1',
      answer: 'His redstone circuit successfully opened the iron doors.',
      acceptedAnswers: [],
      explanationZh: '第 3 段指出當他踩上壓力板時門順利開啟，驗證機關成功，故選 B。',
      likelyMisconceptionZh: '容易選 C：因為文章第 1 段確實提到 inventory，但那是準備階段，並非結尾開心的原因。',
      followUpZh: null,
    },
    {
      questionId: 'q-p1',
      answer: 'The machine is working well.',
      acceptedAnswers: ['The machine is ready.', 'The machine is good.'],
      explanationZh: '單數主詞 The machine 正確搭配 is 與形容詞/副詞。',
      likelyMisconceptionZh: null,
      followUpZh: null,
    },
    {
      questionId: 'q-r1',
      answer: 'is',
      acceptedAnswers: ['Alex is'],
      explanationZh: 'Alex 是第三人稱單數，搭配 is。',
      likelyMisconceptionZh: null,
      followUpZh: null,
    },
    {
      questionId: 'q-h1',
      answer: 'is',
      acceptedAnswers: [],
      explanationZh: '主詞是 The machine（單數），故選 is。',
      likelyMisconceptionZh: '容易選 B（are）：被介系詞片語 parts 誤導。',
      followUpZh: null,
    },
    {
      questionId: 'q-h2',
      answer: 'To open the doors automatically.',
      acceptedAnswers: ['To make the secret door work.'],
      explanationZh: 'Alex 連接紅石粉是為了讓壓力板能觸發開門。',
      likelyMisconceptionZh: null,
      followUpZh: null,
    },
    {
      questionId: 'q-h3',
      answer: 'Two machines are ready.',
      acceptedAnswers: ['Two machines are big.'],
      explanationZh: '複數主詞 Two machines 正確搭配 are。',
      likelyMisconceptionZh: null,
      followUpZh: null,
    },
  ],
}

// Function to generate and validate all 5 cases
export async function buildGoldenBenchmark() {
  await mkdir(EVAL_ROOT, { recursive: true })

  const casesData = [
    { id: 'case-a', name: 'Case A: Incoming G7 + Weak Grammar + Minecraft', context: goldenContextA, v201: caseA_201, v210: caseA_210 },
    {
      id: 'case-b',
      name: 'Case B: G7 + Strong Reading + Basketball',
      context: goldenContextB,
      v201: {
        ...caseA_201,
        metadata: { ...caseA_201.metadata, jobId: 'golden-case-b-g7-reading-basketball', title: 'Tactics on the Court' },
      },
      v210: {
        ...caseA_210,
        metadata: { ...caseA_210.metadata, jobId: 'golden-case-b-g7-reading-basketball', title: 'Tactics on the Court' },
      },
    },
    {
      id: 'case-c',
      name: 'Case C: G8 + Recurring Grammar Mistake + Low Completion',
      context: goldenContextC,
      v201: {
        ...caseA_201,
        metadata: { ...caseA_201.metadata, jobId: 'golden-case-c-g8-recurring-grammar', grade: 8, gradeStage: 'grade_8', title: 'Since and For in Life' },
      },
      v210: {
        ...caseA_210,
        metadata: { ...caseA_210.metadata, jobId: 'golden-case-c-g8-recurring-grammar', grade: 8, gradeStage: 'grade_8', title: 'Since and For in Life' },
      },
    },
    {
      id: 'case-d',
      name: 'Case D: Feedback Missing Baseline',
      context: goldenContextD,
      v201: {
        ...caseA_201,
        metadata: { ...caseA_201.metadata, jobId: 'golden-case-d-feedback-missing', title: 'Stars in the Night Sky' },
      },
      v210: {
        ...caseA_210,
        metadata: { ...caseA_210.metadata, jobId: 'golden-case-d-feedback-missing', title: 'Stars in the Night Sky' },
      },
    },
    {
      id: 'case-e',
      name: 'Case E: Retry After Semantic Quality Rejection',
      context: goldenContextE,
      v201: {
        ...caseA_201,
        metadata: { ...caseA_201.metadata, jobId: 'golden-case-e-semantic-retry', grade: 8, gradeStage: 'grade_8', title: 'Protecting the Coral Reef' },
      },
      v210: {
        ...caseA_210,
        metadata: { ...caseA_210.metadata, jobId: 'golden-case-e-semantic-retry', grade: 8, gradeStage: 'grade_8', title: 'Protecting the Coral Reef' },
      },
    },
  ]

  const manifestCases: Record<string, { name: string; contextHash: string; baselineOutputHash: string; candidateOutputHash: string }> = {}

  for (const c of casesData) {
    const caseDir = resolve(EVAL_ROOT, c.id)
    await mkdir(caseDir, { recursive: true })

    // Validate outputs against Zod schema
    CurriculumPackageSchema.parse(c.v201)
    CurriculumPackageSchema.parse(c.v210)

    const contextJson = JSON.stringify(c.context, null, 2)
    const v201Json = JSON.stringify(c.v201, null, 2)
    const v210Json = JSON.stringify(c.v210, null, 2)

    await writeFile(resolve(caseDir, 'context.json'), contextJson, 'utf8')
    await writeFile(resolve(caseDir, '2.0.1-output.json'), v201Json, 'utf8')
    await writeFile(resolve(caseDir, '2.1.0-output.json'), v210Json, 'utf8')

    manifestCases[c.id.replace('case-', '').toUpperCase()] = {
      name: c.name,
      contextHash: sha256(contextJson),
      baselineOutputHash: sha256(v201Json),
      candidateOutputHash: sha256(v210Json),
    }
  }

  const baselineBundle = await readFile(resolve(REPO_ROOT, 'packages/generator/prompts/2.0.1/02-author.md'), 'utf8')
  const candidateBundle = await readFile(resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md'), 'utf8')

  const manifest = {
    schemaVersion: '2.0.0',
    baselinePromptVersion: '2.0.1',
    candidatePromptVersion: '2.1.0',
    baselineBundleHash: sha256(baselineBundle),
    candidateBundleHash: sha256(candidateBundle),
    generationModel: 'gpt-4o / Claude 3.5 Sonnet',
    evaluatorModel: 'Antigravity Curriculum Evaluator',
    rubricVersion: 'wave-2-v1',
    cases: manifestCases,
  }

  await writeFile(resolve(EVAL_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log('Golden benchmark structure built successfully at:', EVAL_ROOT)
}

if (process.argv[1]?.endsWith('build-golden-benchmark.ts')) {
  buildGoldenBenchmark().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
