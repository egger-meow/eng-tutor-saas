import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import { compileProductionBundle, REPO_ROOT } from './bundle-compiler.js'
import { validPackage } from './curriculum-package.test.js'
import { resolveQualityProfile } from './quality-profile-loader.js'
import { CURRENT_PROMPT_VERSION } from './engine-version.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

function canonicalPackage(): any {
  const v20 = validPackage()
  const v21 = upgradeV20ToV21(v20 as any)
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  return v22
}

function lexicalFinding(pkg: any) {
  return auditCurriculumPackage(pkg).findings.find((finding) => finding.dimension === 'lexical-ceiling')
}

describe('production failure regressions', () => {
  it('does not emit fixed-list lexical-ceiling findings for repeated off-list words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Meticulous meticulous METICULOUS MeTiCuLoUs'
    expect(lexicalFinding(pkg)).toBeUndefined()
    expect(auditCurriculumPackage(pkg).passed).toBe(true)
  })

  it('accepts comprehensive irregular verb and plural forms without false positives', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'She saw the children, took their books, and went home when they ate lunch.'

    expect(lexicalFinding(pkg)).toBeUndefined()
  })

  it('accepts transparent prefixes and suffixes without false positives', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'It was unclear to rewrite the test when they disagree on the helpful result.'

    expect(lexicalFinding(pkg)).toBeUndefined()
  })

  it('validates hyphen compounds by their component words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Write the four-number code.'

    expect(lexicalFinding(pkg)).toBeUndefined()
  })

  it('does not use fixed-list membership to reject a context-clue target', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].itemType = 'context-clue'
    pkg.studentLesson.practice[0].questions[0].prompt = 'In paragraph 2, what is the meaning of "epistemology"?'
    pkg.studentLesson.practice[0].questions[0].options = ['Theory of knowledge', 'Tool', 'Machine', 'Camera']
    expect(auditCurriculumPackage(pkg).findings.find((f) => f.dimension === 'lexical-ceiling')).toBeUndefined()
  })

  it('treats an unanchored new vocabulary card as warning-only telemetry', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.vocabulary.push({ id: 'v-unanchored-new', word: 'astronomy', partOfSpeech: 'n.', meaningZh: '天文學', pronunciationHint: null, exampleEn: 'He studies astronomy.', exampleZh: '他研究天文學。', status: 'new' })
    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(true)
    expect(audit.findings.find((f) => f.dimension === 'lexical-anchor')?.severity).toBe('warning')
  })

  it('rejects bare CURRENT_PROMPT_VERSION (2.11.0) packages missing mandatory critic dimensions', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks = [
      { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
      { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
      // Omit lexical-integrity, task-topology, level-calibration
    ]

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    const missingChecks = audit.findings.filter((f) => f.dimension === 'critic-coverage')
    expect(missingChecks.length).toBe(3)
  })

  it('passes bare 2.10.0 packages with all 5 substantive and passed critic dimensions', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = '2.10.0'
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
      { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage, and no untaught out-of-ceiling words are directly assessed.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary purposefully across guided, independent, and transfer stages without mechanical template collapse.' },
      { id: 'level-calibration', passed: true, evidence: 'Language complexity and cognitive depth are properly calibrated to the learner profile without downshifting.' },
    )

    const audit = auditCurriculumPackage(pkg)
    const criticFindings = audit.findings.filter((f) => f.dimension === 'critic-coverage' || f.dimension === 'critic-acceptance')
    expect(criticFindings).toEqual([])
  })

  it('rejects packages where a mandatory critic check has passed: false even with substantive evidence', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
      { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage, and no untaught out-of-ceiling words are directly assessed.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary purposefully across guided, independent, and transfer stages without mechanical template collapse.' },
      { id: 'level-calibration', passed: false, evidence: 'Critic detected that language complexity in section 2 was downshifted below Grade 8 baseline.' },
    )

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    const failureFinding = audit.findings.find(
      (f) =>
        f.dimension === 'critic-acceptance' ||
        f.dimension === 'deterministic-validation' ||
        f.message.includes('level-calibration') ||
        f.message.includes('Every critical quality check must pass'),
    )
    expect(failureFinding).toBeDefined()
  })

  it('rejects packages with unresolved critical critic findings', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
      { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage, and no untaught out-of-ceiling words are directly assessed.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary purposefully across guided, independent, and transfer stages without mechanical template collapse.' },
      { id: 'level-calibration', passed: true, evidence: 'Language complexity and cognitive depth are properly calibrated to the learner profile without downshifting.' },
    )
    pkg.qualityEvidence.criticFindings.push({
      dimension: 'task-topology',
      severity: 'critical',
      finding: 'Practice items 1, 2, and 3 all use identical single-clause extraction templates.',
      resolution: null,
    })

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    const failureFinding = audit.findings.find(
      (f) =>
        f.dimension === 'critic-acceptance' ||
        f.dimension === 'deterministic-validation' ||
        f.message.includes('未修復的重大缺失') ||
        f.message.includes('Unresolved critical critic finding'),
    )
    expect(failureFinding).toBeDefined()
  })

  it('accepts packages with resolved historical critical critic findings', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
      { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage, and no untaught out-of-ceiling words are directly assessed.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary purposefully across guided, independent, and transfer stages without mechanical template collapse.' },
      { id: 'level-calibration', passed: true, evidence: 'Language complexity and cognitive depth are properly calibrated to the learner profile without downshifting.' },
    )
    pkg.qualityEvidence.criticFindings.push({
      dimension: 'task-topology',
      severity: 'critical',
      finding: 'Practice items 1, 2, and 3 all use identical single-clause extraction templates.',
      resolution: 'Repair engine restructured item 2 into sequence synthesis and item 3 into contrastive inference.',
    })

    const audit = auditCurriculumPackage(pkg)
    const acceptanceErrors = audit.findings.filter((f) => f.dimension === 'critic-acceptance')
    expect(acceptanceErrors).toEqual([])
  })

  it('rejects non-CAP reading-dependent questions that quote text from instruction boxes instead of reading prose', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.studentLesson.instruction[0]!.patterns = ['You must use may / might / could to express possibility.']

    // Non-CAP guided practice question quoting instruction text not in reading prose
    const leakQuestionId = 'G1'
    const leakQuestion = pkg.studentLesson.practice[0]!.questions.find((q: any) => q.id === leakQuestionId)!
    leakQuestion.prompt = 'According to the reading, what does "may / might / could" express?'
    leakQuestion.options = ['Possibility', 'Certainty', 'Past action', 'Command']
    leakQuestion.itemType = 'detail'

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    const leakageErrors = audit.findings.filter((f) => f.dimension === 'evidence-boundary')
    expect(leakageErrors.some((f) => f.message.includes('may / might / could') && f.message.includes('instruction'))).toBe(true)
  })

  it('preserves valid vocabulary and grammar recall items without requiring CAP precedent machinery or reading anchors', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'All reading questions draw evidence strictly from primary reading blocks without cross-section instruction leakage.' },
      { id: 'answer-entailment', passed: true, evidence: 'Open response and MCQ explanations preserve strict textual entailment and modal conditions without inventing observed facts.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage, and no untaught out-of-ceiling words are directly assessed.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary purposefully across guided, independent, and transfer stages without mechanical template collapse.' },
      { id: 'level-calibration', passed: true, evidence: 'Language complexity and cognitive depth are properly calibrated to the learner profile without downshifting.' },
    )

    // Populate evidence plans for reading-dependent questions in canonical fixture
    const readingQuestionIds = ['G2', 'G3', 'I1', 'I2', 'I3', 'P1', 'R1', 'H2', 'H3']
    for (const qId of readingQuestionIds) {
      pkg.qualityEvidence.criticalChecks.push({
        id: `evidence-plan:${qId}`,
        passed: true,
        evidence: JSON.stringify({
          evidenceScope: 'primary_reading',
          evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'Mina joins a school robotics club' }],
        }),
      })
    }
    for (const qId of ['C1', 'C2', 'C3']) {
      pkg.qualityEvidence.criticalChecks.push({
        id: `cap-plan:${qId}`,
        passed: true,
        evidence: JSON.stringify({
          precedentRef: '113-cap-reading-main-idea-01',
          evidenceScope: 'primary_reading',
          evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'Mina joins a school robotics club' }],
        }),
      })
    }

    // Standard vocabulary recall item in practice (not in cap-transfer, no evidence plan)
    const vocabQuestion = pkg.studentLesson.practice[0]!.questions[0]!
    vocabQuestion.itemType = 'vocabulary'
    vocabQuestion.targetIds = ['vocab-experiment']
    vocabQuestion.prompt = 'Choose the word that best completes the sentence: The scientist planned a new sort.'
    vocabQuestion.options = ['sort', 'water', 'sky', 'lunch']

    // Standard grammar recall item in homework (no evidence plan)
    const grammarQuestion = pkg.studentLesson.homework.questions[0]!
    grammarQuestion.itemType = 'grammar'
    grammarQuestion.targetIds = ['grammar-do-does']
    grammarQuestion.prompt = 'Fill in the blank with do or does: ______ she want to build a machine?'

    const audit = auditCurriculumPackage(pkg)
    const boundaryFindings = audit.findings.filter((f) => f.dimension === 'evidence-boundary')
    expect(boundaryFindings).toEqual([])
  })

  it('bundles model quality profiles, resolution rules, and provenance contract', async () => {
    const bundle = await compileProductionBundle(REPO_ROOT)
    const hashes = Object.keys(bundle.metadata.sourceHashes)

    expect(hashes).toContain('packages/generator/quality-profiles/default.md')
    expect(hashes).toContain('packages/generator/quality-profiles/gemini-3.7-flash.md')
    expect(bundle.content).toContain('Model Quality Profile Resolution & Provenance')
    expect(bundle.content).toContain('actualModel=')
    expect(bundle.content).toContain('resolvedQualityProfile=')
    expect(bundle.content).toContain('qualityProfileVersion=')
    expect(bundle.content).toContain('model-quality-profile')
  })

  it('truthfully resolves the current production model to the bundled fallback profile', async () => {
    const profile = await resolveQualityProfile('GPT-5.6 Sol')
    expect(profile.name).toBe('default')
    expect(profile.isFallback).toBe(true)
  })

  it('rejects materials where decisive control conditions are dropped in answer entailment (Finisher / Audit acceptance of critic verdict)', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'Primary reading contains all evidence anchors.' },
      { id: 'answer-entailment', passed: false, evidence: 'Question C3 and explanation drop the control condition that string length and tension must be held equal, asserting unconditionally that thicker strings always produce lower pitch.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary across guided, independent, and transfer items.' },
      { id: 'level-calibration', passed: true, evidence: 'Linguistic depth and cognitive load match the grade 7 intermediate band.' },
    )
    pkg.qualityEvidence.criticFindings.push({
      dimension: 'answer-entailment',
      severity: 'critical',
      finding: 'Dropped decisive control condition (equal length & tension) in question C3 answer explanation.',
      resolution: null,
    })

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    expect(audit.findings.some((f) => f.message.includes('critical quality check must pass') || f.message.includes('Unresolved critical critic finding'))).toBe(true)
  })

  it('passes materials that preserve decisive control conditions or use valid stylistic paraphrasing (Finisher / Audit acceptance of critic verdict)', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'Primary reading contains all evidence anchors.' },
      { id: 'answer-entailment', passed: true, evidence: 'All comparative claims in C1-C3 preserve required control variables (same length and tension) and stylistic variations accurately match reading scope.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary across guided, independent, and transfer items.' },
      { id: 'level-calibration', passed: true, evidence: 'Linguistic depth and cognitive load match the grade 7 intermediate band.' },
    )

    const audit = auditCurriculumPackage(pkg)
    const entailmentFindings = audit.findings.filter((f) => f.dimension === 'answer-entailment' || f.dimension === 'critic-acceptance')
    expect(entailmentFindings).toEqual([])
  })

  it('rejects materials where model answers violate explicit prompt constraints such as sentence count (Finisher / Audit acceptance of critic verdict)', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = CURRENT_PROMPT_VERSION
    pkg.qualityEvidence.criticalChecks.push(
      { id: 'evidence-boundary', passed: true, evidence: 'Primary reading contains all evidence anchors.' },
      { id: 'answer-entailment', passed: false, evidence: 'Question H3 asks for exactly two sentences ("Write two sentences comparing..."), but the model answer contains four sentences.' },
      { id: 'lexical-integrity', passed: true, evidence: 'All new vocabulary items are anchored in the reading passage.' },
      { id: 'task-topology', passed: true, evidence: 'Reasoning mechanisms vary across guided, independent, and transfer items.' },
      { id: 'level-calibration', passed: true, evidence: 'Linguistic depth and cognitive load match the grade 7 intermediate band.' },
    )
    pkg.qualityEvidence.criticFindings.push({
      dimension: 'answer-entailment',
      severity: 'critical',
      finding: 'Task instruction constraint mismatch in H3: requested 2 sentences, provided 4 sentences.',
      resolution: null,
    })

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    expect(audit.findings.some((f) => f.message.includes('critical quality check must pass') || f.message.includes('Unresolved critical critic finding'))).toBe(true)
  })

  describe('Prompt 2.11.0 generalized behavioral contracts', () => {
    it('author and critic preserve exact attribution and decisive qualifiers without feature fusion', async () => {
      const bundle = await compileProductionBundle()
      expect(bundle.metadata.promptVersion).toBe('2.11.0')
      expect(bundle.metadata.schemaVersion).toBe('2.4.0')

      expect(bundle.content).toContain('exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier')
      expect(bundle.content).toContain("Do not fuse mode A's limit, mode B's workflow, or separately true fragments into one unsupported composite claim")
      expect(bundle.content).toContain('never transfer one mode’s limit to another mode’s workflow')
    })

    it('author, critic, and repair require exact task-constraint compliance in model answers', async () => {
      const bundle = await compileProductionBundle()

      expect(bundle.content).toContain('Model answers and accepted answers must obey every explicit task constraint')
      expect(bundle.content).toContain('if a prompt asks for a sequence, comparison, number of sentences, reasons, or constraints, the model answer must genuinely satisfy all of them')
      expect(bundle.content).toContain('Explicit task constraint failure: make the model answer actually obey requested counts, sentence form, comparison controls, or procedure completeness')
    })

    it('targeted repair preserves unaffected content while restoring exact bindings and required qualifiers', async () => {
      const bundle = await compileProductionBundle()

      expect(bundle.content).toContain('Repair only the rejected content plus fragments that logically depend on it')
      expect(bundle.content).toContain('source/fact -> claim -> exact reading prose -> dependent instruction/question -> dependent answer/rationale')
      expect(bundle.content).toContain('Never fix attribution by deleting a qualifier that the source requires')
    })
  })
})
