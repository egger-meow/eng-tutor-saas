import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectedContent } from './ProjectedContent'
import { QuestionRenderer } from './QuestionRenderer'
import { speechChunks } from '../../../hooks/use-speech-synthesis'

describe('reader compatibility', () => {
  it('retains unfamiliar projected prose and a labelled answer field', () => {
    const html = renderToStaticMarkup(<QuestionRenderer index={0} question={{ id: 'stable-q', prompt: 'Explain the diagram.',
      responseLayout: { type: 'custom', title: 'A new organizer', items: ['First observe', 'Then compare'], responseUnitId: 'internal-id' } }}
      draftAnswers={{ 'stable-q': 'My saved answer' }} onAnswerChange={vi.fn()} />)
    expect(html).toContain('A new organizer')
    expect(html).toContain('First observe')
    expect(html).toContain('My saved answer')
    expect(html).toContain('aria-labelledby="prompt-stable-q"')
    expect(html).not.toContain('internal-id')
  })
  it('does not display answers or internal evidence in unfamiliar fields', () => {
    const html = renderToStaticMarkup(<ProjectedContent value={{ text: 'Visible lesson', answerKey: 'Secret', qualityEvidence: { note: 'Private' }, id: 'Internal' }} />)
    expect(html).toContain('Visible lesson')
    expect(html).not.toContain('Secret')
    expect(html).not.toContain('Private')
    expect(html).not.toContain('Internal')
  })
  it('splits long speech without dropping or reordering learner text', () => {
    const text = 'A long passage with useful words. '.repeat(40).trim()
    const chunks = speechChunks(text)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.length <= 220)).toBe(true)
    expect(chunks.join(' ')).toBe(text)
    expect(speechChunks('  ')).toEqual([])
  })
})
