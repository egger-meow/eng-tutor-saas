import type { CurriculumPackage } from '@paper-english/generator'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { inspectCurriculumPdfPair } from './inspect-pdf.js'
import { renderPdfBatch } from './render-pdf.js'
import { renderCurriculumParentAnswerHtml, renderCurriculumStudentHtml } from './render-curriculum-package.js'

export type CurriculumPdfPair = { studentPath: string; parentAnswerPath: string }
export type CurriculumPdfBytes = { student: Uint8Array; parentAnswer: Uint8Array }

function filename(pkg: CurriculumPackage, kind: 'student' | 'parent-answer'): string {
  const stem = pkg.metadata.jobId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${stem}-v2-${kind}.pdf`
}

export async function renderCurriculumPackagePair(pkg: CurriculumPackage, outputDir: string): Promise<CurriculumPdfPair> {
  await mkdir(outputDir, { recursive: true })
  const studentPath = join(outputDir, filename(pkg, 'student'))
  const parentAnswerPath = join(outputDir, filename(pkg, 'parent-answer'))
  const staging = await mkdtemp(join(outputDir, '.curriculum-v2-'))
  let publishedStudent = false
  let publishedParent = false
  try {
    const { student, parentAnswer } = await renderCurriculumPackageBytes(pkg)
    const studentTemp = join(staging, 'student.pdf')
    const parentTemp = join(staging, 'parent-answer.pdf')
    await writeFile(studentTemp, student)
    await writeFile(parentTemp, parentAnswer)
    await rename(studentTemp, studentPath)
    publishedStudent = true
    await rename(parentTemp, parentAnswerPath)
    publishedParent = true
    return { studentPath, parentAnswerPath }
  } catch (error) {
    if (publishedStudent) await rm(studentPath, { force: true })
    if (publishedParent) await rm(parentAnswerPath, { force: true })
    throw error
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

export async function renderCurriculumPackageBytes(pkg: CurriculumPackage): Promise<CurriculumPdfBytes> {
  const [student, parentAnswer] = await renderPdfBatch([
    renderCurriculumStudentHtml(pkg),
    renderCurriculumParentAnswerHtml(pkg),
  ])
  if (!student || !parentAnswer) throw new Error('Curriculum renderer did not return both PDF artifacts')
  const pair = { student, parentAnswer }
  await inspectCurriculumPdfPair(pkg, pair)
  return pair
}
