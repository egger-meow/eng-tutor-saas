import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { InlineSampleChallenge, SAMPLE_CHALLENGE } from './InlineSampleChallenge'

describe('InlineSampleChallenge', () => {
  it('renders authentic reading notice, question, and 4 options in static markup', () => {
    const html = renderToStaticMarkup(<InlineSampleChallenge />)

    expect(html).toContain('30 秒會考素養實戰挑戰')
    expect(html).toContain('City Library will host')
    expect(html).toContain('Latecomers will not be admitted')
    expect(html).toContain('According to the notice, which of the following is true?')
    expect(html).toContain('Students can attend the workshop without registration')
    expect(html).toContain('Anyone arriving after the workshop starts cannot enter')
    expect(html).toContain('The workshop will take place on Sunday afternoon')
    expect(html).toContain('There are unlimited seats available in the computer lab')
  })

  it('contains authentic CAP-aligned answer and pedagogical learning memory logic', () => {
    expect(SAMPLE_CHALLENGE.correctKey).toBe('B')
    expect(SAMPLE_CHALLENGE.options).toHaveLength(4)

    // Paraphrase alignment explanation
    expect(SAMPLE_CHALLENGE.correctFeedback.explanation).toContain('同義改寫（Paraphrase）')
    expect(SAMPLE_CHALLENGE.correctFeedback.explanation).toContain('Latecomers will not be admitted')

    // PaperBond learning loop explanation
    expect(SAMPLE_CHALLENGE.memoryNote).toContain('在紙屬英文')
    expect(SAMPLE_CHALLENGE.memoryNote).toContain('下週第 2 週教材')
    expect(SAMPLE_CHALLENGE.memoryNote).toContain('時間與條件限制')
  })
})
