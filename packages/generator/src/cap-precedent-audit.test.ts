import { describe, expect, it } from 'vitest'
import { auditCapPrecedentFloor } from './cap-precedent-audit.js'

describe('CAP precedent deterministic quality floor', () => {
  const available = new Set(['cap-0123456789ab'])
  it('blocks CAP transfer authored from a blank page', () => {
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 2, precedentRefs: [], availableRefs: available })).toEqual({
      passed: false,
      findings: [expect.stringContaining('CAP_PRECEDENT_MISSING')],
    })
  })
  it('passes known internal refs and rejects fabricated refs', () => {
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 2, precedentRefs: ['cap-0123456789ab'], availableRefs: available }).passed).toBe(true)
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 2, precedentRefs: ['cap-deadbeefdead'], availableRefs: available }).findings[0]).toContain('CAP_PRECEDENT_UNKNOWN')
  })
})
