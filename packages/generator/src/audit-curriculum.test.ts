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

  it('passes for a valid canonical package adhering to lexical ceiling and multi-genre blocks', () => {
    const pkg = canonicalPackage()
    const report = auditCurriculumPackage(pkg)
    expect(report.passed).toBe(true)
  })

  it('detects and warns on excessive untaught high-difficulty words above 2000 ceiling', () => {
    const pkg = canonicalPackage()
    // Inject multiple obscure high-school / GRE words not in 2000 vocabulary or taught vocab with >= 120 words
    pkg.studentLesson.reading.blocks = [
      {
        type: 'paragraph',
        text: 'The ubiquitous dichotomy of the esoteric nomenclature presents an insurmountable juxtaposed paradigm across multiple disciplinary domains. The quintessential anomaly and its pedagogical pervasiveness exacerbate bureaucratic obfuscation throughout kaleidoscopic infrastructure. Furthermore, the serendipitous juxtaposition demonstrates an idiosyncratic manifestation of philosophical jurisprudence.',
      },
      {
        type: 'paragraph',
        text: 'The magnanimous protagonist endeavors to elucidate the unprecedented epistemological quandary with profound intellectual veracity. Every subtle nuance of the theoretical apparatus exhibits an enigmatic propensity that completely bewilders conventional analytical methodology. Through comprehensive hermeneutic interrogation, the researchers continuously grapple with the existential ramifications of this transcendental theoretical divergence in academic discourse.',
      },
      {
        type: 'paragraph',
        text: 'In addition to these intricate conceptual dilemmas, the overarching systemic hierarchy continues to perpetuate anomalous incongruities among various pedagogical paradigms. Consequently, the scholars remain deeply divided regarding the ontological validity and hermeneutic significance of these extraordinary empirical discoveries.',
      },
    ]

    const report = auditCurriculumPackage(pkg)
    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeDefined()
    expect(lexicalFinding?.severity).toBe('warning')
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
