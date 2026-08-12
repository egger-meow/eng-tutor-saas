import { describe, expect, it } from 'vitest'
import { parseWeeklyLesson, validateWeeklyLesson } from './index.js'

const validLesson = () => ({
  metadata: { jobId: 'job-1', childId: 'child-1', weekNumber: 1, grade: 7, title: 'City Gardens', generatedAt: '2026-08-12T00:00:00.000Z', ruleVersion: '1.0.0' },
  personalization: { interests: ['nature'], focusAreas: ['reading'], priorFeedbackSummary: 'Needs more inference practice.', rationale: 'A garden theme supports the learner interest.' },
  objectives: ['Identify a main idea.'],
  vocabulary: Array.from({ length: 7 }, (_, index) => ({ word: `word${index}`, partOfSpeech: 'noun', definition: `definition ${index}`, example: `Example ${index}.` })),
  reading: { title: 'A Small Garden', passage: 'A community builds a garden.' },
  grammar: { topic: 'Present simple', explanation: 'Use it for routines.', examples: ['They water plants.'] },
  exercises: [{ title: 'Reading', instructions: 'Answer each question.', questions: [{ questionId: 'q1', prompt: 'What did they build?', type: 'short-answer', writingLines: 2 }] }],
  homework: { instructions: 'Review today’s lesson.', tasks: [{ questionId: 'h1', prompt: 'Write one sentence.', writingLines: 2 }] },
  answers: [{ questionId: 'q1', answer: 'A garden.', explanation: 'The passage states this directly.' }, { questionId: 'h1', answer: 'Answers vary.', explanation: 'Check for a complete sentence.' }],
  parentGuidance: { weeklyFocus: 'Main ideas', supportTips: ['Ask for evidence.'], completionCheck: 'Check every answer.' },
})

describe('weekly lesson contract', () => {
  it('parses a valid lesson', () => expect(parseWeeklyLesson(validLesson()).metadata.jobId).toBe('job-1'))

  it('rejects unknown keys', () => {
    const lesson = { ...validLesson(), unexpected: true }
    expect(validateWeeklyLesson(lesson)).toMatchObject({ success: false, issues: [{ path: '', message: expect.stringContaining('Unrecognized key') }] })
  })

  it('enforces vocabulary bounds', () => {
    const lesson = validLesson()
    lesson.vocabulary = lesson.vocabulary.slice(0, 6)
    expect(validateWeeklyLesson(lesson)).toMatchObject({ success: false, issues: [{ path: 'vocabulary' }] })
  })

  it.each([
    ['duplicate question IDs', (lesson: ReturnType<typeof validLesson>) => lesson.exercises[0]!.questions.push({ ...lesson.exercises[0]!.questions[0]! })],
    ['missing answers', (lesson: ReturnType<typeof validLesson>) => { lesson.answers = [] }],
    ['extra answers', (lesson: ReturnType<typeof validLesson>) => lesson.answers.push({ questionId: 'q2', answer: 'Extra', explanation: 'Extra' })],
  ])('rejects %s', (_, mutate) => {
    const lesson = validLesson()
    mutate(lesson)
    expect(validateWeeklyLesson(lesson).success).toBe(false)
  })
})
