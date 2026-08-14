import { describe, expect, it } from 'vitest'
import { validateProductFeedback } from './product-feedback'

describe('product feedback validation', () => {
  it('trims a valid message', () => {
    expect(validateProductFeedback({ category: 'flow', message: '  操作說明很清楚。  ' })).toEqual({ category: 'flow', message: '操作說明很清楚。' })
  })

  it('rejects a blank message', () => {
    expect(() => validateProductFeedback({ category: 'bug', message: '  ' })).toThrow('請填寫回饋內容。')
  })

  it('rejects a message over the storage limit', () => {
    expect(() => validateProductFeedback({ category: 'other', message: 'a'.repeat(4001) })).toThrow('最多 4,000 字')
  })
})
