import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { highlightVocabulary } from './ReadingRenderer'

it('emphasizes exact vocabulary and phrases without changing passage text or matching substrings', () => {
  const vocabulary = ['source', 'spatial audio', 'C++'].map(word => ({ id: word, word, partOfSpeech: 'n.' }))
  const text = 'Source resources: spatial audio, C++ and source.'
  const html = renderToStaticMarkup(<p>{highlightVocabulary(text, vocabulary)}</p>)
  expect(html.match(/<strong /g)).toHaveLength(4)
  expect(html).toContain('resources:')
  expect(html.replace(/<[^>]*>/g, '')).toBe(text)
})
