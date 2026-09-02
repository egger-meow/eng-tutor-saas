import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(import.meta.dirname, '../../App.tsx'), 'utf8')

describe('returning-parent onboarding confirmation UI contract', () => {
  it('requires an explicit choice before the pending landing draft can become another child', () => {
    expect(appSource).toContain('AdditionalChildConfirmation')
    expect(appSource).toContain('additional_child_confirmation_required')
    expect(appSource).toContain('confirmAdditionalChildOnboarding')
    expect(appSource).toContain('discardPendingOnboarding')
    expect(appSource).toContain('existingChildName')
  })
})
