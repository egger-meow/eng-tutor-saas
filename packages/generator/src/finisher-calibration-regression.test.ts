import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import {
  auditCapPrecedentPackage,
  auditReadingEvidenceBoundary,
  type CapPrecedentRuntimeBundle,
} from './cap-precedent-audit.js'
import { validPackage } from './curriculum-package.test.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

const capCard = {
  ref: 'cap-0123456789ab',
  genre: 'article_informational',
  primarySkill: 'local_inference',
  secondarySkills: ['information_integration'],
  cognitiveDepth: 'D2_single_step_inference',
  languageDifficulty: 'A2_basic',
  evidenceMode: 'text_only',
  evidenceNecessity: 'essential',
  evidenceSpan: 'cross_sentence_local',
  reasoningOperations: ['identify overgeneralization', 'restore omitted variables'],
  questionMechanism: 'reject an overgeneralized claim using passage controls',
  whyTheQuestionWorks: 'the learner must preserve the passage scope',
  correctAnswerConstructionPrinciple: 'the correct answer restores omitted variables',
  distractorStrategies: ['partial_truth'],
  reusableDesignPrinciple: 'test scope preservation with a plausible overclaim',
  difficultyAdjustment: {
    simplificationConstraints: ['keep the control-condition evidence'],
    depthAdjustmentStrategies: ['add another relevant variable'],
  },
  copyGuardHashes: [],
}

const capRuntime: CapPrecedentRuntimeBundle = {
  version: 'test',
  authorityStatus: 'authoritative',
  capKnowledgeVersion: 'k',
  capCorpusHash: 'a'.repeat(64),
  capBundleVersion: 'b',
  plannerVersion: 'p',
  qualityFloorVersion: 'q',
  cards: [capCard],
}

const capProvenance = JSON.stringify({
  capKnowledgeVersion: 'k',
  capCorpusHash: 'a'.repeat(64),
  capBundleVersion: 'b',
  plannerVersion: 'p',
  qualityFloorVersion: 'q',
})

const c3Plan = JSON.stringify({
  learningObjective: 'Reject an overgeneralized tension claim by preserving control conditions.',
  primarySkill: 'local_inference',
  secondarySkills: ['information_integration'],
  genre: 'article_informational',
  targetLanguageDifficulty: 'A2_basic',
  targetCognitiveDepth: 'D2_single_step_inference',
  evidenceMode: 'text_only',
  evidenceSpan: 'cross_sentence_local',
  evidenceScope: 'primary_reading',
  evidenceAnchors: [
    {
      location: 'studentLesson.reading.blocks.0.text',
      anchorText: 'The important idea is not that tight always means high.',
      isExplicit: true,
    },
    {
      location: 'studentLesson.reading.blocks.0.text',
      anchorText: 'Thickness, tension, and length all matter.',
      isExplicit: true,
    },
  ],
  reasoningOperations: ['identify overgeneralization', 'restore omitted variables'],
  distractorStrategies: ['partial_truth'],
  precedentRefs: ['cap-0123456789ab'],
  precedentMode: 'anchor',
  borrowedDesignPrinciples: ['preserve the scope of a locally true relation'],
  intentionalRecall: false,
  noPrecedentReason: null,
})

function constructedClaimPackage() {
  return {
    metadata: { promptVersion: '2.10.0' },
    studentLesson: {
      reading: {
        blocks: [{
          type: 'paragraph',
          text: 'The important idea is not that tight always means high. Thickness, tension, and length all matter.',
        }],
      },
      practice: [{
        stage: 'cap-transfer',
        questions: [{
          id: 'C3',
          itemType: 'inference',
          targetIds: ['t-reading-cause'],
          prompt: 'A student says, "Every tight string must sound higher than every loose string." Why is this claim too strong?',
          options: [
            'A tight string cannot make sound.',
            'Tension never changes pitch.',
            'A loose string is always shorter.',
            'Thickness and length can also affect pitch.',
          ],
          writingLines: 1,
          difficulty: 'stretch',
        }],
      }],
      homework: { questions: [] },
    },
    qualityEvidence: {
      precedentRefs: ['cap-0123456789ab'],
      criticalChecks: [
        { id: 'cap-provenance', passed: true, evidence: capProvenance },
        { id: 'cap-plan:C3', passed: true, evidence: c3Plan },
      ],
    },
  }
}

function canonicalPackage(): any {
  const v20 = validPackage()
  const v21 = upgradeV20ToV21(v20 as any)
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  return v22
}

describe('Finisher false-positive calibration', () => {
  it('allows a constructed student claim in quotation marks when canonical reading anchors support the critique', () => {
    const pkg = constructedClaimPackage()

    const capReport = auditCapPrecedentPackage(pkg as any, capRuntime)
    expect(capReport.findings.join('\n')).not.toContain('CAP_QUOTE_EVIDENCE_MISMATCH:C3')

    const evidenceReport = auditReadingEvidenceBoundary(pkg)
    expect(evidenceReport.findings.join('\n')).not.toContain('EVIDENCE_QUOTE_MISMATCH:C3')
    expect(evidenceReport.passed).toBe(true)
  })

  it('still rejects a quote that the question explicitly attributes to the reading but that is absent from reading prose', () => {
    const pkg = constructedClaimPackage() as any
    pkg.studentLesson.practice[0].questions[0].prompt =
      'According to the reading, the sentence "Every tight string must sound higher than every loose string." appears in paragraph 1. Why is it important?'

    const capReport = auditCapPrecedentPackage(pkg, capRuntime)
    expect(capReport.findings.join('\n')).toContain('CAP_QUOTE_EVIDENCE_MISMATCH:C3')

    const evidenceReport = auditReadingEvidenceBoundary(pkg)
    expect(evidenceReport.findings.join('\n')).toContain('EVIDENCE_QUOTE_MISMATCH:C3')
  })

  it('requires an explicit primary_reading evidenceScope for governed non-recall reading items', () => {
    const pkg = constructedClaimPackage() as any
    const plan = JSON.parse(pkg.qualityEvidence.criticalChecks.find((c: any) => c.id === 'cap-plan:C3').evidence)
    delete plan.evidenceScope
    pkg.qualityEvidence.criticalChecks.find((c: any) => c.id === 'cap-plan:C3').evidence = JSON.stringify(plan)

    const report = auditReadingEvidenceBoundary(pkg)
    expect(report.passed).toBe(false)
    expect(report.findings.join('\n')).toContain('EVIDENCE_SCOPE_MISSING:C3')
  })

  it('accepts doubled-consonant comparative forms of a taught base word', () => {
    const pkg = canonicalPackage()
    const firstTextBlock = pkg.studentLesson.reading.blocks.find((block: any) => typeof block.text === 'string')
    expect(firstTextBlock).toBeDefined()
    firstTextBlock.text += ' The thin string is easy to see.'
    pkg.studentLesson.vocabulary.push({
      id: 'v-thin-regression',
      word: 'thin',
      partOfSpeech: 'adj.',
      meaningZh: '細的',
      pronunciationHint: null,
      exampleEn: 'The thin string is easy to see.',
      exampleZh: '細弦很容易看到。',
      status: 'new',
    })
    pkg.studentLesson.practice[0].questions[0].prompt = 'The thinner string is thinner.'

    const lexicalFindings = auditCurriculumPackage(pkg).findings.filter((finding) => finding.dimension === 'lexical-ceiling')
    expect(lexicalFindings).toEqual([])
  })
})
