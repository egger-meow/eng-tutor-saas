import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import { validPackage } from './curriculum-package.test.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

function canonicalPackage(): any {
  const v20 = validPackage()
  const v21 = upgradeV20ToV21(v20 as any)
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  return v22
}

describe('Finisher heuristic gate relaxation', () => {
  it('does not emit or block on fixed-list lexical-ceiling membership even with many repeated off-list words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt += ' guitarist encyclopedia photosynthesis cryptocurrency guitarist encyclopedia photosynthesis cryptocurrency astrophysics microbiome guitarist encyclopedia'

    const audit = auditCurriculumPackage(pkg)
    expect(audit.findings.some((finding) => finding.dimension === 'lexical-ceiling')).toBe(false)
    expect(audit.passed).toBe(true)
  })

  it('keeps heuristic lexical anchor failures warning-only', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.vocabulary.push({
      id: 'v-unanchored-natural-topic-word',
      word: 'guitarist',
      partOfSpeech: 'n.',
      meaningZh: '吉他手',
      pronunciationHint: null,
      exampleEn: 'The guitarist practices every day.',
      exampleZh: '這位吉他手每天練習。',
      status: 'new',
    })

    const audit = auditCurriculumPackage(pkg)
    const finding = audit.findings.find((item) => item.dimension === 'lexical-anchor')
    expect(finding?.severity).toBe('warning')
    expect(audit.passed).toBe(true)
  })
})
