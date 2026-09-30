import { parseWeeklyLesson } from '@paper-english/generator'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { renderLessonPdfBytes } from './render-pair.js'
import { inspectPdf } from './inspect-pdf.js'

const repo = resolve(import.meta.dirname, '../../..')
const source = JSON.parse(await readFile(resolve(repo, 'apps/web/src/content/public-demo.json'), 'utf8'))
const lesson = parseWeeklyLesson(source)
if (lesson.metadata.childId !== 'public-synthetic-demo') throw new Error('Only the public synthetic demo is supported.')
const { student } = await renderLessonPdfBytes(lesson)
const inspection = await inspectPdf(student, 'public-interactive-demo')
await mkdir(resolve(repo, 'output/pdf'), { recursive: true })
await writeFile(resolve(repo, 'output/pdf/demo-student.pdf'), student)
// Explicitly publish this synthetic, blank artifact; no learner submissions are used.
await writeFile(resolve(repo, 'apps/web/public/samples/demo-student.pdf'), student)
console.log(JSON.stringify({ pageCount: inspection.pageCount, bytes: student.length, output: 'samples/demo-student.pdf' }))
