import { describe, it, expect } from 'vitest'
import { assembleSelectiveAuthoringBundle } from './selective-bundle-assembler.js'
import type { CapDesignAnchor } from './cap-precedent-audit.js'

describe('selective-bundle-assembler', () => {
  const sampleCard: CapDesignAnchor = {
    ref: 'cap-sample-01',
    genre: 'article',
    primarySkill: 'local_inference',
    secondarySkills: ['detail'],
    cognitiveDepth: 'D2_single_step_inference',
    languageDifficulty: 'A2_basic',
    evidenceMode: 'text_only',
    evidenceNecessity: 'mandatory',
    evidenceSpan: 'cross_sentence_local',
    reasoningOperations: ['connect_clues'],
    questionMechanism: 'infer_from_evidence',
    whyTheQuestionWorks: 'requires dual evidence lookup',
    correctAnswerConstructionPrinciple: 'direct synthesis of clues',
    distractorStrategies: ['partial_detail'],
    reusableDesignPrinciple: 'Connect clue A and clue B',
    difficultyAdjustment: {
      simplificationConstraints: [],
      depthAdjustmentStrategies: [],
    },
    copyGuardHashes: [],
  }

  it('replaces compact routing index marker when present', () => {
    const rawBundle = [
      '# Bundle',
      '## 2A. CAP Precedent-First Contract',
      'Rules...',
      '## 2B. Compact CAP Precedent Routing Index',
      'large table 195 cards...',
      '## 3. Model Quality Profile Resolution',
      'profile...',
    ].join('\n')

    const assembled = assembleSelectiveAuthoringBundle(rawBundle, [sampleCard])
    expect(assembled).toContain('## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)')
    expect(assembled).not.toContain('## 2B. Compact CAP Precedent Routing Index')
    expect(assembled).not.toContain('large table 195 cards...')
    expect(assembled).toContain('cap-sample-01')
    expect(assembled).toContain('## 3. Model Quality Profile Resolution')
  })

  it('replaces existing selective section cleanly on re-assembly', () => {
    const rawBundle = [
      '# Bundle',
      '## 2A. CAP Precedent-First Contract',
      '## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)',
      'old cards...',
      '## 3. Model Quality Profile Resolution',
    ].join('\n')

    const assembled = assembleSelectiveAuthoringBundle(rawBundle, [sampleCard])
    expect(assembled).toContain('## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)')
    expect(assembled).not.toContain('old cards...')
    expect(assembled).toContain('cap-sample-01')
  })

  it('inserts before section 3 if no 2B section exists', () => {
    const rawBundle = [
      '# Bundle',
      '## 2A. CAP Precedent-First Contract',
      '## 3. Model Quality Profile Resolution',
    ].join('\n')

    const assembled = assembleSelectiveAuthoringBundle(rawBundle, [sampleCard])
    expect(assembled).toContain('## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)')
    expect(assembled).toContain('cap-sample-01')
    const pos2B = assembled.indexOf('## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)')
    const pos3 = assembled.indexOf('## 3. Model Quality Profile Resolution')
    expect(pos2B).toBeLessThan(pos3)
  })
})
