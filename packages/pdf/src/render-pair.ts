import type { WeeklyLesson } from '@paper-english/generator'
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { artifactFilename, renderParentAnswerHtml, renderStudentHtml } from './render-html.js'
import { renderPdf } from './render-pdf.js'

export type PdfByteRenderer = (html: string) => Promise<Uint8Array>
export type LessonPdfPair = { studentPath: string; parentAnswerPath: string }
export type LessonPdfBytes = { student: Uint8Array; parentAnswer: Uint8Array }

function assertPdf(bytes: Uint8Array, label: string): void {
  const signature = new TextDecoder().decode(bytes.subarray(0, 4))
  if (bytes.byteLength <= 4 || signature !== '%PDF') throw new Error(`${label} renderer did not return a valid PDF`)
}

async function assertAbsent(path: string): Promise<void> {
  try {
    await stat(path)
    throw new Error(`Refusing to overwrite existing artifact: ${path}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

export async function renderLessonPdfPair(lesson: WeeklyLesson, outputDir: string, renderer: PdfByteRenderer = renderPdf): Promise<LessonPdfPair> {
  await mkdir(outputDir, { recursive: true })
  const studentPath = join(outputDir, artifactFilename(lesson, 'student'))
  const parentAnswerPath = join(outputDir, artifactFilename(lesson, 'parent-answer'))
  await assertAbsent(studentPath)
  await assertAbsent(parentAnswerPath)

  const temporaryDir = await mkdtemp(join(outputDir, '.lesson-pair-'))
  const temporaryStudent = join(temporaryDir, 'student.pdf')
  const temporaryParent = join(temporaryDir, 'parent-answer.pdf')
  let studentPublished = false
  let parentPublished = false
  try {
    const { student: studentBytes, parentAnswer: parentBytes } = await renderLessonPdfBytes(lesson, renderer)
    await writeFile(temporaryStudent, studentBytes)
    await writeFile(temporaryParent, parentBytes)
    await rename(temporaryStudent, studentPath)
    studentPublished = true
    await rename(temporaryParent, parentAnswerPath)
    parentPublished = true
    return { studentPath, parentAnswerPath }
  } catch (error) {
    if (studentPublished) await rm(studentPath, { force: true })
    if (parentPublished) await rm(parentAnswerPath, { force: true })
    throw error
  } finally {
    await rm(temporaryDir, { recursive: true, force: true })
  }
}

export async function renderLessonPdfBytes(lesson: WeeklyLesson, renderer: PdfByteRenderer = renderPdf): Promise<LessonPdfBytes> {
  const student = await renderer(renderStudentHtml(lesson))
  assertPdf(student, 'Student')
  const parentAnswer = await renderer(renderParentAnswerHtml(lesson))
  assertPdf(parentAnswer, 'Parent answer')
  return { student, parentAnswer }
}
