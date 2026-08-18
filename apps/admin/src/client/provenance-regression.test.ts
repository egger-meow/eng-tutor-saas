import { describe, expect, it } from 'vitest'
import { classifyQualityEra, hasModelQualityProfileProvenance } from './types.js'

describe('current production provenance classification', () => {
  it('keeps current schema/prompt submissions in Engine v1 even when provenance is missing', () => {
    const currentWithoutProfile = {
      schemaVersion: '2.2.0',
      promptVersion: '2.4.0',
      engineVersion: '1.0.1',
    }

    expect(hasModelQualityProfileProvenance(currentWithoutProfile)).toBe(false)
    expect(classifyQualityEra(currentWithoutProfile)).toBe('engine_v1')
  })

  it('still classifies genuinely legacy schema/prompt evidence as historical', () => {
    expect(classifyQualityEra({ schemaVersion: '2.1.0', promptVersion: '2.3.0' })).toBe('historical')
  })
})
