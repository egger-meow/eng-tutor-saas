import { parseWeeklyLesson } from '@paper-english/generator'
import { describe, expect, it } from 'vitest'
import { artifactFilename, renderParentAnswerHtml, renderStudentHtml } from './index.js'

const lesson = parseWeeklyLesson({
  metadata: { jobId: 'synthetic-week-1', childId: 'child-1', weekNumber: 1, grade: 7, title: 'A <Safe> Lesson', generatedAt: '2026-08-12T00:00:00.000Z', ruleVersion: '1.0.0' },
  personalization: { interests: ['nature'], focusAreas: ['reading'], priorFeedbackSummary: 'Needs inference.', rationale: 'Uses <gardens> safely.' },
  objectives: ['Read closely.'],
  vocabulary: Array.from({ length: 7 }, (_, index) => ({ word: `word${index}`, partOfSpeech: 'noun', definition: `definition ${index}`, example: `Example ${index}.` })),
  reading: { title: 'Garden', passage: 'A short passage.' },
  grammar: { topic: 'Present simple', explanation: 'Use it for routines.', examples: ['They grow plants.'] },
  exercises: [{ title: 'Practice', instructions: 'Answer.', questions: [{ questionId: 'q1', prompt: 'What grows?', type: 'short-answer', writingLines: 2 }] }],
  homework: { instructions: 'Review.', tasks: ['Write a sentence.'] },
  answers: [{ questionId: 'q1', answer: 'Plants grow.', explanation: 'The passage says so.' }],
  parentGuidance: { weeklyFocus: 'Evidence', supportTips: ['Ask why.'], completionCheck: 'Check q1.' },
})

describe('lesson HTML projections', () => {
  it('uses deterministic filenames', () => {
    expect(artifactFilename(lesson, 'student')).toBe('synthetic-week-1-student.pdf')
    expect(artifactFilename(lesson, 'parent-answer')).toBe('synthetic-week-1-parent-answer.pdf')
  })

  it('renders and escapes required student content without answers', () => {
    const html = renderStudentHtml(lesson)
    expect(html).toContain('Student Worksheet')
    expect(html).toContain('data-question-id="q1"')
    expect(html).toContain('A &lt;Safe&gt; Lesson')
    expect(html).not.toContain('Plants grow.')
    expect(html).not.toContain('Parent Guidance')
    expect(html).not.toContain('Uses &lt;gardens&gt; safely.')
  })

  it('renders every answer and parent guidance safely', () => {
    const html = renderParentAnswerHtml(lesson)
    expect(html).toContain('Parent Answer Guide')
    expect(html).toContain('data-question-id="q1"')
    expect(html).toContain('Plants grow.')
    expect(html).toContain('Uses &lt;gardens&gt; safely.')
    expect(html).toContain('Parent Guidance')
  })
})
