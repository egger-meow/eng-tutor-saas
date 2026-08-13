import type { CurriculumPackage } from '@paper-english/generator'
import { createHash } from 'node:crypto'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const MIN_PDF_BYTES = 1_000
const MIN_PAGE_TEXT = 8
const MAX_PAGES = 30

export type PdfInspection = {
  pageCount: number
  pageTexts: string[]
  text: string
  title: string | null
  layoutFingerprint: string
}

export type CurriculumPdfPairInspection = { student: PdfInspection; parentAnswer: PdfInspection }

function normalized(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

export async function inspectPdf(bytes: Uint8Array, label: string): Promise<PdfInspection> {
  if (bytes.byteLength < MIN_PDF_BYTES) throw new Error(`${label} PDF is implausibly small (${bytes.byteLength} bytes)`)
  // Playwright returns a Node Buffer (a Uint8Array subclass); PDF.js rejects
  // Buffer instances, so copy into a plain Uint8Array before parsing.
  const task = getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true })
  try {
    const document = await task.promise
    if (document.numPages < 1 || document.numPages > MAX_PAGES) {
      throw new Error(`${label} PDF page count ${document.numPages} is outside 1-${MAX_PAGES}`)
    }
    const metadata = await document.getMetadata()
    const rawTitle = (metadata.info as { Title?: unknown }).Title
    const title = typeof rawTitle === 'string' ? rawTitle : null
    const pageTexts: string[] = []
    const layout: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const viewport = page.getViewport({ scale: 1 })
      const textItems = content.items.filter((item) => 'str' in item)
      const outside = textItems.filter((item) => {
        const x = item.transform[4] ?? 0
        const y = item.transform[5] ?? 0
        const right = x + Math.abs(item.width)
        const top = y + Math.abs(item.height)
        return x < -10 || y < -10 || right > viewport.width + 10 || top > viewport.height + 10
      })
      if (outside.length > 0) throw new Error(`${label} PDF page ${pageNumber} contains text outside the page bounds`)
      const text = normalized(textItems.map((item) => item.str).join(' '))
      if (text.length < MIN_PAGE_TEXT) throw new Error(`${label} PDF page ${pageNumber} is blank or nearly blank`)
      pageTexts.push(text)
      layout.push(`${viewport.width.toFixed(2)}x${viewport.height.toFixed(2)}`)
      layout.push(...textItems.map((item) => [
        normalized(item.str),
        item.transform[4]?.toFixed(2),
        item.transform[5]?.toFixed(2),
        item.width.toFixed(2),
        item.height.toFixed(2),
      ].join('|')))
      page.cleanup()
    }
    const layoutFingerprint = createHash('sha256')
      .update(JSON.stringify({ title, pageCount: document.numPages, layout }))
      .digest('hex')
    return { pageCount: document.numPages, pageTexts, text: normalized(pageTexts.join(' ')), title, layoutFingerprint }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${label} PDF integrity check failed: ${message}`)
  } finally {
    await task.destroy()
  }
}

function allQuestionIds(pkg: CurriculumPackage): string[] {
  return [
    ...pkg.studentLesson.practice.flatMap((stage) => stage.questions.map((question) => question.id)),
    ...pkg.studentLesson.homework.questions.map((question) => question.id),
  ]
}

function allQuestions(pkg: CurriculumPackage) {
  return [
    ...pkg.studentLesson.practice.flatMap((stage) => stage.questions),
    ...pkg.studentLesson.homework.questions,
  ]
}

function requireText(haystack: string, needles: readonly string[], label: string): void {
  const compactHaystack = haystack.replace(/\s+/gu, '')
  const missing = [...new Set(needles.filter((needle) => !compactHaystack.includes(needle.replace(/\s+/gu, ''))))]
  if (missing.length > 0) throw new Error(`${label} PDF is missing required content: ${missing.join(', ')}`)
}

export async function inspectCurriculumPdfPair(
  pkg: CurriculumPackage,
  pair: { student: Uint8Array; parentAnswer: Uint8Array },
): Promise<CurriculumPdfPairInspection> {
  const [student, parentAnswer] = await Promise.all([
    inspectPdf(pair.student, 'Student'),
    inspectPdf(pair.parentAnswer, 'Parent answer'),
  ])
  const questions = allQuestions(pkg)
  const questionIds = allQuestionIds(pkg)
  const questionContent = questions.flatMap((question) => [question.prompt, ...(question.options ?? [])])
  requireText(student.text, [pkg.metadata.title, pkg.studentLesson.reading.title, ...questionIds, ...questionContent], 'Student')
  requireText(parentAnswer.text, [
    pkg.metadata.title,
    '答案與簡短說明',
    ...questionIds,
    ...questions.map((question) => question.prompt),
  ], 'Parent answer')

  if (student.text.replace(/\s+/gu, '').includes('答案與簡短說明')) throw new Error('Student PDF leaks the Parent answer section')
  if (!student.title?.endsWith(' - Student')) throw new Error('Student PDF metadata does not identify the Student projection')
  if (!parentAnswer.title?.endsWith(' - Parent Answers')) throw new Error('Parent answer PDF metadata does not identify the Parent projection')
  return { student, parentAnswer }
}
