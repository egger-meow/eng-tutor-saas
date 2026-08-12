import { describe, expect, it } from 'vitest'
import { artifactFilename } from './index.js'

describe('artifactFilename', () => {
  it('uses stable private artifact names', () => {
    expect(artifactFilename('student')).toBe('student.pdf')
    expect(artifactFilename('parent-answer')).toBe('parent-answer.pdf')
  })
})
