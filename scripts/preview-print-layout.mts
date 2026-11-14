/**
 * Private print-layout experiment, NOT a production renderer or release.
 * Usage: node node_modules/tsx/dist/cli.mjs scripts/preview-print-layout.mts <canonical.json>
 * Writes only output/pdf/print-ux-preview; never uploads, queues, or edits a packet.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { renderCurriculumStudentHtml, renderCurriculumParentAnswerHtml } from '../packages/pdf/src/render-curriculum-package.js'
import { inspectPdf } from '../packages/pdf/src/inspect-pdf.js'
import type { CurriculumPackage } from '../packages/generator/src/index.js'

const sourcePath = process.argv[2]
if (!sourcePath) throw new Error('A local canonical JSON path is required. No database access is performed.')
const source = await readFile(resolve(sourcePath), 'utf8')
const pkg = JSON.parse(source) as CurriculumPackage
const sourceHash = createHash('sha256').update(source).digest('hex')
const out = resolve('output/pdf/print-ux-preview')
await mkdir(out, { recursive: true })
const labels: Record<string, string> = {}
pkg.studentLesson.practice.flatMap(stage => stage.questions).forEach((question, index) => { labels[question.id] = `練習 Q${index + 1}` })
pkg.studentLesson.homework.questions.forEach((question, index) => { labels[question.id] = `作業 Q${index + 1}` })
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
const evidence: unknown[] = []
try {
  for (const [kind, html] of [['student', renderCurriculumStudentHtml(pkg)], ['parent', renderCurriculumParentAnswerHtml(pkg)]] as const) {
    for (const revised of [false, true]) {
      const name = `${kind}-${revised ? 'candidate' : 'baseline'}`
      const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
      await page.setContent(html)
      await page.evaluate(() => document.fonts.ready)
      await page.emulateMedia({ media: 'print' })
      const originalWritingLines = await page.locator('.writing-line').count()
      const originalPrompts = await page.locator('.question-prompt, .answer-question-context').allTextContents()
      if (revised) {
        await page.evaluate(({ labels }) => {
          for (const element of document.querySelectorAll('.question-qid, .answer-qid')) {
            const id = element.textContent?.trim() ?? ''
            if (labels[id]) element.textContent = labels[id]
          }
          for (const badge of document.querySelectorAll('.unit-badge')) badge.remove()
          for (const card of document.querySelectorAll('.unit-answers-list')) {
            card.querySelectorAll('li > strong').forEach((label, index) => { label.textContent = `填答 ${index + 1}：` })
          }
          const note = document.createElement('p')
          note.className = 'print-preview-note'
          note.textContent = '列印版面測試・未發布｜題目內容不變，僅比較作答空間、題號與分頁'
          document.body.prepend(note)
        }, { labels })
        await page.addStyleTag({ content: `
          .print-preview-note { font-size: 8pt; color: #555; border-bottom: 1px solid #aaa; padding-bottom: 2mm; }
          .response-organizer-table td.organizer-response-slot { height: 26mm; min-height: 26mm; }
          .organizer-response-slot { background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 7.5mm, #ddd 7.5mm, #ddd 7.7mm) !important; }
          .sequence-response-slot { min-height: 24mm; }
          .homework-section.page-break { break-before: auto; page-break-before: auto; }
          .homework-banner, .selfcheck-item, .response-organizer-table tr { break-inside: avoid; }
          .response-organizer-table { table-layout: fixed; overflow-wrap: anywhere; }
          .question-card { margin: 2mm 0; padding: 2.5mm 4mm; }
          .stage-container { margin-top: 4mm; }
          .selfcheck-section { margin: 4mm 0; padding: 3mm 4.5mm; }
          .selfcheck-section h2 { margin-top: 0; }
        ` })
      }
      assert.equal(await page.locator('.writing-line').count(), originalWritingLines, 'preserve all handwriting lines')
      assert.deepEqual(await page.locator('.question-prompt, .answer-question-context').allTextContents(), originalPrompts, 'preserve question content')
      if (revised) assert.equal(await page.locator('.unit-badge').count(), 0, 'internal response IDs stay out of the candidate')
      const geometry = await page.locator('.organizer-response-slot').evaluateAll(elements => elements.map(element => ({ height: element.getBoundingClientRect().height, text: element.textContent })))
      if (revised) for (const cell of geometry) assert.ok(cell.height >= 26 * 96 / 25.4 - 1)
      const bytes = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
      await writeFile(resolve(out, `${name}.pdf`), bytes)
      const inspection = await inspectPdf(bytes, name)
      evidence.push({ name, pages: inspection.pageCount, pageTextLengths: inspection.pageTexts.map(text => text.length), writingLines: originalWritingLines, geometry, sha256: createHash('sha256').update(bytes).digest('hex') })
      await page.close()
    }
  }
  assert.equal(createHash('sha256').update(await readFile(resolve(sourcePath))).digest('hex'), sourceHash, 'source must remain immutable')
  await writeFile(resolve(out, 'evidence.json'), JSON.stringify({ experimentOnly: true, sourceHash, evidence }, null, 2))
  console.log(JSON.stringify({ out, experimentOnly: true, evidence }, null, 2))
} finally { await browser.close() }

