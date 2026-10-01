import { parseWeeklyLesson } from '@paper-english/generator'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { renderStudentHtml } from './render-html.js'
import { renderPdf } from './render-pdf.js'
import { curriculumStyles } from './curriculum/styles.js'
import { inspectPdf } from './inspect-pdf.js'

const repo = resolve(import.meta.dirname, '../../..')
const source = JSON.parse(await readFile(resolve(repo, 'apps/web/src/content/public-demo.json'), 'utf8'))
const lesson = parseWeeklyLesson(source)
if (lesson.metadata.childId !== 'public-synthetic-demo') throw new Error('Only the public synthetic demo is supported.')
// Match the existing production palette without changing historical renderers.
const html = renderStudentHtml(lesson).replace('</style>', `${curriculumStyles}
  header { border-bottom: 2px solid #284f3e; }
  .card { border: 1px solid #d9d0c2; border-left: 3px solid #284f3e; border-radius: 2mm; background: #f6f8f4; padding: 4mm; }
  .word { color: #284f3e; font-size: 12pt; }
  .label { color: #a65532; }
  .question { border-color: #d9d0c2; border-radius: 2mm; }
</style>`).replace(/<span>Lesson ID:.*?<\/span>/, '')
const student = await renderPdf(html)
const inspection = await inspectPdf(student, 'public-interactive-demo')
await mkdir(resolve(repo, 'output/pdf'), { recursive: true })
await writeFile(resolve(repo, 'output/pdf/demo-student.pdf'), student)
// Explicitly publish this synthetic, blank artifact; no learner submissions are used.
await writeFile(resolve(repo, 'apps/web/public/samples/demo-student.pdf'), student)
console.log(JSON.stringify({ pageCount: inspection.pageCount, bytes: student.length, output: 'samples/demo-student.pdf' }))
