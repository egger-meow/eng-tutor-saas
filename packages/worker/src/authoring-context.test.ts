import { expect, it } from 'vitest'
import { compactAuthoringContext } from './authoring-context.js'

it('deduplicates findings while preserving the sole candidate and immutable snapshot', () => {
  const context = { inputFingerprint: 'unchanged', retryContext: { previousCanonicalPackage: { article: 'original' }, findings: ['repair'], failureEvidence: { findings: ['repair'], reason: 'validation' } } }
  const before = JSON.stringify(context)
  expect(compactAuthoringContext(context)).toEqual({ ...context, retryContext: { ...context.retryContext, failureEvidence: { reason: 'validation' } } })
  const newer = compactAuthoringContext(context, true)
  expect(newer.retryContext).not.toHaveProperty('previousCanonicalPackage')
  expect(JSON.stringify(context)).toBe(before)
})
it('retains distinct failure evidence', () => {
  const context = { retryContext: { findings: ['a'], failureEvidence: { findings: ['b'] } } }
  expect(compactAuthoringContext(context)).toEqual(context)
})

it('injects formatPlanningCapsule into diversityCapsule when missing', () => {
  const context = {
    diversityCapsule: {
      recentGenres: ['article'],
      recentContextKeys: ['science'],
      recentItemFamilies: ['reading'],
    },
  }
  const result = compactAuthoringContext(context)
  expect((result.diversityCapsule as any)?.formatPlanningCapsule).toBeDefined()
  expect((result.diversityCapsule as any)?.formatPlanningCapsule?.availableButRecentlyUnused?.length).toBeGreaterThan(0)
})

