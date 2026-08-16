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

describe('curriculum audit & lexical contract', () => {
  it('fails closed for an invalid package', () => {
    expect(auditCurriculumPackage({}).passed).toBe(false)
  })

  it('passes for a valid canonical package adhering to lexical anchor, ceiling, and multi-genre blocks', () => {
    const pkg = canonicalPackage()
    const report = auditCurriculumPackage(pkg)
    console.log('Valid canonical test findings:', report.findings)
    expect(report.passed).toBe(true)
    expect(report.findings.filter((f) => f.severity === 'critical')).toEqual([])
  })

  it('enforces lexical anchor: rejects package when core vocabulary is absent from reading passage', () => {
    const pkg = canonicalPackage()
    // Inject a core vocabulary word that never appears anywhere in the reading passage
    pkg.studentLesson.vocabulary.push({
      id: 'vocab-unrelated',
      word: 'astronomy',
      partOfSpeech: 'n.',
      meaningZh: '天文學',
      pronunciationHint: null,
      exampleEn: 'Astronomy is the study of stars.',
      exampleZh: '天文學是研究星星的科學。',
      status: 'new',
    })

    const report = auditCurriculumPackage(pkg)
    const anchorFinding = report.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding).toBeDefined()
    expect(anchorFinding?.severity).toBe('critical')
    expect(anchorFinding?.message).toContain('astronomy')
  })

  it('enforces comprehensive lexical ceiling: detects untaught high-difficulty words across options and practice', () => {
    const pkg = canonicalPackage()
    // Inject multiple obscure words into question prompt and options
    pkg.studentLesson.practice[0].questions[0].prompt = 'Does the ephemeral juxtaposition cause ubiquitous dichotomy in empirical methodology?'
    pkg.studentLesson.practice[0].questions[0].options = [
      'The transcendent epistemology obfuscates the paradigm.',
      'Normal robot operation continues.',
      'None of the above.',
      'All of the above.',
    ]

    const report = auditCurriculumPackage(pkg)
    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeDefined()
    expect(lexicalFinding?.severity).toBe('critical')
  })

  it('flags genre-block mismatch when dialogue genre lacks dialogue blocks', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.genre = 'dialogue'
    pkg.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'This is a normal paragraph without any dialogue block or speaker tags. The students are working together in the robotics workshop to assemble their mechanical chassis before the weekend competition. Each member takes responsibility for checking the motor mounting screws, calibrating the optical sensors, and testing the battery connections.' },
      { type: 'paragraph', text: 'Another long paragraph without dialogue blocks in this reading passage. They carefully measure each aluminum bracket, tighten the motor screws with hex wrenches, and verify that the drive wheels rotate smoothly on the test track. Even though they work late into the evening, nobody complains because they want their autonomous robot to win first place in the upcoming annual tournament against rival schools from neighboring districts and counties.' },
      { type: 'paragraph', text: 'Finally, the team supervisor reviews the complete electrical wiring diagram and gives helpful feedback on wire routing and safety shielding. With all hardware components firmly secured, the club prepares for full autonomous navigation tests tomorrow.' },
    ]

    const report = auditCurriculumPackage(pkg)
    const alignmentFinding = report.findings.find((f) => f.dimension === 'alignment' && f.message.includes('dialogue'))
    expect(alignmentFinding).toBeDefined()
    expect(alignmentFinding?.severity).toBe('critical')
  })
})
