import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CURRENT_ENGINE_MANIFEST, CurriculumPackageV26Schema, upgradeV23ToV24, upgradeV24ToV25, validateCurriculumPackageForFinisher } from '@paper-english/generator'
import { curriculumSample } from './generate-curriculum-sample.js'
import { renderCurriculumPackagePair } from './render-curriculum-pair.js'
import { renderCurriculumStudentHtml } from './render-curriculum-package.js'

const historical = upgradeV24ToV25(upgradeV23ToV24(curriculumSample))
const activities = [
  { type: 'question', titleZh: '回想一次改進', prompt: '你曾經只改一個步驟，就得到不同結果嗎？', writingLines: 2 },
  { type: 'observation', titleZh: '觀察兩種做法', examples: ['Mina changes one part.', 'Jay changes every part.'], noticeZh: '哪一種做法比較容易找出改變的原因？先觀察，讀文章時再確認。' },
  { type: 'reading-purpose', titleZh: '帶著目標讀', purposeZh: '留意 Mina 保留什麼、改變什麼，以及她如何判斷改變有沒有效。' },
  { type: 'direct-reading' },
]
const blocks = [
  { type: 'prose', titleZh: '問行動，也問理由', textZh: '詢問一般現在式的動作時，用 do 或 does 開頭。選哪一個取決於主詞；後面的主要動詞維持原形。' },
  { type: 'comparison', titleZh: '把主詞放在一起比較', headers: ['主詞', '問句'], rows: [['I / you / we / they', 'Do they test the robot?'], ['he / she / it', 'Does she test the robot?']], takeawayZh: 'Does 已經標示第三人稱單數，test 不再加 s。' },
  { type: 'bullets', titleZh: '讀題時留意', itemsZh: ['先確認主詞是誰。', '問題問的是行動，還是行動的原因？'] },
  { type: 'steps', titleZh: '組成一個問句', itemsZh: ['找主詞，選 do 或 does。', '放入原形動詞及其餘訊息。', '回讀確認問句是否符合要問的內容。'] },
  { type: 'worked-example', example: 'Does Mina change the light?', walkthroughZh: 'Mina 是第三人稱單數，因此用 Does；change 保持原形。這句問她是否改變燈光。' },
  { type: 'error-analysis', wrong: 'Does Mina changes the light?', corrected: 'Does Mina change the light?', whyZh: 'Does 與 changes 重複標示單數；留下 Does，將 changes 改成 change。' },
]
const output = resolve('output/pdf/diversity')
await mkdir(output, { recursive: true })
for (const activity of activities) {
  const pkg = CurriculumPackageV26Schema.parse({
    ...historical,
    metadata: { ...historical.metadata, schemaVersion: CURRENT_ENGINE_MANIFEST.schema, releaseId: CURRENT_ENGINE_MANIFEST.releaseId, engineVersion: CURRENT_ENGINE_MANIFEST.engine, promptVersion: CURRENT_ENGINE_MANIFEST.prompt, workerVersion: CURRENT_ENGINE_MANIFEST.worker, rendererVersion: CURRENT_ENGINE_MANIFEST.pdfRenderer, jobId: `diversity-${activity.type}`, childId: 'synthetic-diversity', model: 'synthetic-layout-fixture' },
    studentLesson: { ...historical.studentLesson,
      opening: { goalsZh: historical.studentLesson.opening.goalsZh, howToUseZh: historical.studentLesson.opening.howToUseZh, activity },
      instruction: [{ id: 'do-does', titleZh: '問出機器人實驗的關鍵', blocks }],
    },
  })
  const validation = validateCurriculumPackageForFinisher(pkg)
  if (!validation.success) throw new Error(JSON.stringify(validation.issues))
  const normalized = validation.curriculumPackage
  await writeFile(resolve(output, `${activity.type}.html`), renderCurriculumStudentHtml(normalized))
  await writeFile(resolve(output, `${activity.type}.json`), JSON.stringify(normalized, null, 2))
  console.log(JSON.stringify(await renderCurriculumPackagePair(normalized, output)))
}
