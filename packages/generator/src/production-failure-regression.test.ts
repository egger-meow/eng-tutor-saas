import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import { compileProductionBundle, REPO_ROOT } from './bundle-compiler.js'
import { validPackage } from './curriculum-package.test.js'
import { resolveQualityProfile } from './quality-profile-loader.js'
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
  it('dedupes lexical-ceiling findings case-insensitively and flags repeated unapproved words critically', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Meticulous meticulous METICULOUS MeTiCuLoUs'

    const finding = lexicalFinding(pkg)
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe('critical')
    expect(finding?.message.toLowerCase().match(/meticulous/g)).toHaveLength(1)
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

  it('rejects untaught above-ceiling word when used as direct context-clue target', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].itemType = 'context-clue'
    pkg.studentLesson.practice[0].questions[0].prompt = 'In paragraph 2, what is the meaning of "epistemology"?'
    pkg.studentLesson.practice[0].questions[0].options = ['Theory of knowledge', 'Tool', 'Machine', 'Camera']

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    const finding = audit.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(finding?.severity).toBe('critical')
    expect(finding?.message).toContain('epistemology')
  })

  it('rejects unanchored new vocabulary card critically', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.vocabulary.push({
      id: 'v-unanchored-new',
      word: 'astronomy',
      partOfSpeech: 'n.',
      meaningZh: '天文學',
      pronunciationHint: null,
      exampleEn: 'He studies astronomy.',
      exampleZh: '他研究天文學。',
      status: 'new',
    })

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(false)
    const anchorFinding = audit.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding?.severity).toBe('critical')
  })

  it('enforces mandatory critic dimension coverage on prompt 2.10+ packages', () => {
    const pkg = canonicalPackage()
    pkg.metadata.promptVersion = 'prompt/2.10.0'
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
})
