import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'

describe('curriculum audit', () => {
  it('fails closed for an invalid package', () => expect(auditCurriculumPackage({}).passed).toBe(false))
})
