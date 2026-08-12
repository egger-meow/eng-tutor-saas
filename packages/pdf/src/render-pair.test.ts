import { parseWeeklyLesson } from '@paper-english/generator'
import { access, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderLessonPdfPair } from './render-pair.js'

const directories: string[] = []
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))))

const lesson = parseWeeklyLesson({
  metadata: { jobId: 'pair-test', childId: 'child-1', weekNumber: 1, grade: 7, title: 'Pair Test', generatedAt: '2026-08-12T00:00:00.000Z', ruleVersion: '1.0.0' },
  personalization: { interests: [], focusAreas: ['reading'], priorFeedbackSummary: 'No feedback.', rationale: 'Baseline lesson.' },
  objectives: ['Read closely.'],
  vocabulary: Array.from({ length: 7 }, (_, index) => ({ word: `word${index}`, partOfSpeech: 'noun', definition: `definition ${index}`, example: `Example ${index}.` })),
  reading: { title: 'Reading', passage: 'Passage.' },
  grammar: { topic: 'Grammar', explanation: 'Explanation.', examples: ['Example.'] },
  exercises: [{ title: 'Practice', instructions: 'Answer.', questions: [{ questionId: 'q1', prompt: 'Question?', type: 'short-answer', writingLines: 1 }] }],
  homework: { instructions: 'Review.', tasks: ['Write.'] },
  answers: [{ questionId: 'q1', answer: 'Answer.', explanation: 'Reason.' }],
  parentGuidance: { weeklyFocus: 'Reading', supportTips: ['Ask why.'], completionCheck: 'Check q1.' },
})

const pdfBytes = new TextEncoder().encode('%PDF-test')
async function outputDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'lesson-pair-test-'))
  directories.push(directory)
  return directory
}

describe('renderLessonPdfPair', () => {
  it('publishes both valid artifacts', async () => {
    const directory = await outputDirectory()
    const result = await renderLessonPdfPair(lesson, directory, async () => pdfBytes)
    await expect(access(result.studentPath)).resolves.toBeUndefined()
    await expect(access(result.parentAnswerPath)).resolves.toBeUndefined()
  })

  it('rejects invalid PDF bytes without publishing', async () => {
    const directory = await outputDirectory()
    await expect(renderLessonPdfPair(lesson, directory, async () => new Uint8Array([1, 2, 3]))).rejects.toThrow('valid PDF')
    expect(await readdir(directory)).toEqual([])
  })

  it('leaves no partial artifact when the second render fails', async () => {
    const directory = await outputDirectory()
    let calls = 0
    await expect(renderLessonPdfPair(lesson, directory, async () => {
      calls += 1
      if (calls === 2) throw new Error('second render failed')
      return pdfBytes
    })).rejects.toThrow('second render failed')
    expect(await readdir(directory)).toEqual([])
  })
})
