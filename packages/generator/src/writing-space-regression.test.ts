import { describe, expect, it } from 'vitest'
import { QuestionV24Schema } from './curriculum-package-schema.js'

describe('written response space contract', () => {
  it('rejects open written responses without physical writing space', () => {
    const result = QuestionV24Schema.safeParse({
      id: 'written-1',
      targetIds: ['writing-target'],
      itemType: 'short-response',
      prompt: 'Explain your answer.',
      writingLines: 0,
      difficulty: 'on-level',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Written responses require writing space')
  })

  it('accepts an explicit structured response layout instead of lines', () => {
    const result = QuestionV24Schema.safeParse({
      id: 'written-2',
      targetIds: ['writing-target'],
      itemType: 'short-response',
      prompt: 'Organize the evidence.',
      writingLines: 0,
      difficulty: 'on-level',
      responseLayout: { type: 'organizer', headers: ['Evidence', 'Meaning'], rows: [{ values: ['One', 'Two'] }] },
    })
    expect(result.success).toBe(true)
  })
})
