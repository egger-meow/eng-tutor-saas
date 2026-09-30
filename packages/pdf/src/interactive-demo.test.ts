import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { inspectPdf } from './inspect-pdf.js'
import { parseWeeklyLesson } from '@paper-english/generator'

describe('Synthetic interactive demo print artifact', () => {
  it('matches the shared synthetic lesson and excludes answer output', async () => {
    const repo = resolve(import.meta.dirname, '../../..')
    const source = parseWeeklyLesson(JSON.parse(await readFile(resolve(repo, 'apps/web/src/content/public-demo.json'), 'utf8')))
    const pdf = await inspectPdf(await readFile(resolve(repo, 'apps/web/public/samples/demo-student.pdf')), 'interactive-demo')
    expect(source.metadata.childId).toBe('public-synthetic-demo')
    expect(source.personalization.priorFeedbackSummary).toContain('No real learner data')
    expect(pdf.pageCount).toBe(4)
    expect(pdf.text).toContain(source.reading.title)
    for (const question of [...source.exercises.flatMap((stage) => stage.questions), ...source.homework.tasks]) expect(pdf.text).toContain(question.prompt)
    expect(pdf.title).toMatch(/ - Student Worksheet$/)
    expect(pdf.text).not.toContain('B. To study how sunlight changes plant growth.')
    expect(pdf.text).not.toContain(source.parentGuidance.weeklyFocus)
  })
})
