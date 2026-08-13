import { describe, expect, it } from 'vitest'
import { curriculumSample } from './generate-curriculum-sample.js'
import { inspectPdf } from './inspect-pdf.js'
import { renderCurriculumPackageBytes } from './render-curriculum-pair.js'

describe('PDF artifact inspection', () => {
  it('rejects an implausibly small artifact before parsing', async () => {
    await expect(inspectPdf(new TextEncoder().encode('%PDF'), 'Broken')).rejects.toThrow('implausibly small')
  })

  it('renders and verifies both canonical curriculum projections', async () => {
    const pair = await renderCurriculumPackageBytes(curriculumSample)
    const [student, parent] = await Promise.all([
      inspectPdf(pair.student, 'Student'),
      inspectPdf(pair.parentAnswer, 'Parent answer'),
    ])

    expect(student.pageCount).toBeGreaterThan(0)
    expect(parent.pageCount).toBeGreaterThan(0)
    expect(student.title).toBe('One Change at a Time - Student')
    expect(parent.title).toBe('One Change at a Time - Parent Answers')
  }, 30_000)

  it('rejects a canonical question prompt that is clipped during rendering', async () => {
    const overflowPackage = structuredClone(curriculumSample)
    overflowPackage.studentLesson.practice[0]!.questions[0]!.prompt = 'OVERFLOW'.repeat(300)
    await expect(renderCurriculumPackageBytes(overflowPackage)).rejects.toThrow('missing required content')
  }, 30_000)
})
