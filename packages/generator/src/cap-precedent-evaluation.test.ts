import { describe, expect, it } from 'vitest'
import { auditCapPrecedentFloor } from './cap-precedent-audit.js'

describe('CAP quality-floor evaluation harness', () => {
  it('turns precedent coverage into a measurable floor instead of an inspirational hint', () => {
    const available = new Set(['cap-0123456789ab'])
    const baseline = auditCapPrecedentFloor({ capTransferQuestionCount: 3, precedentRefs: [], availableRefs: available })
    const grounded = auditCapPrecedentFloor({ capTransferQuestionCount: 3, precedentRefs: ['cap-0123456789ab'], availableRefs: available })
    expect(baseline.passed).toBe(false)
    expect(grounded.passed).toBe(true)
    expect(baseline.findings[0]).toContain('CAP_PRECEDENT_MISSING')
  })
})
