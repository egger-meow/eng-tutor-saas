import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_STORAGE_KEY, emptyDemoState, readDemoState, saveDemoState } from './public-demo-state'

afterEach(() => vi.unstubAllGlobals())
describe('Isolated public demo persistence', () => {
  it('preserves the submitted snapshot across reloads in its own key', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) } })
    const state = { answers: { R1: 'B', R2: 'Same water.' }, selfCheck: [], submitted: true }
    expect(saveDemoState(state)).toBe(true)
    expect([...values.keys()]).toEqual([DEMO_STORAGE_KEY])
    expect(readDemoState()).toEqual(state)
  })
  it('ignores malformed storage and limits restored answers to known demo questions', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => '{broken' } })
    expect(readDemoState()).toEqual(emptyDemoState())
    vi.stubGlobal('window', { localStorage: { getItem: () => JSON.stringify({ answers: { R1: 'B', foreign: 'private', R2: 123 }, submitted: 'yes' }) } })
    expect(readDemoState()).toEqual({ answers: { R1: 'B' }, selfCheck: [], submitted: false })
  })
  it('reports unavailable browser storage without throwing away in-memory work', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } } })
    expect(readDemoState()).toEqual(emptyDemoState())
    expect(saveDemoState({ answers: { R2: 'My sentence.' }, selfCheck: [], submitted: false })).toBe(false)
  })
})
