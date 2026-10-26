import { describe, expect, it } from 'vitest'
import { parentLearningCopy } from './parent-learning-copy'

describe('parent-facing learning explanations', () => {
  it('explains known curriculum terms without exposing planning IDs', () => {
    expect(parentLearningCopy('主要文法：g7-time-place-prepositions；imperatives 採 evidence-backed spaced review。'))
      .toBe('主要文法：時間與地點介系詞；祈使句 採 依作答記錄安排間隔複習。')
  })
  it('does not invent a skill label for an unknown curriculum identifier', () => {
    expect(parentLearningCopy('練習 g8-future-unknown-unit。')).toBe('練習 相關練習。')
  })
  it('retains meaningful ordinary English and author observations', () => {
    expect(parentLearningCopy('孩子喜歡 Minecraft，現在式還不熟。')).toBe('孩子喜歡 Minecraft，現在式還不熟。')
  })
})
