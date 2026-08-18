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
  it('dedupes lexical-ceiling findings case-insensitively', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Meticulous meticulous METICULOUS MeTiCuLoUs'

    const finding = lexicalFinding(pkg)
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe('warning')
    expect(finding?.message.toLowerCase().match(/meticulous/g)).toHaveLength(1)
  })

  it('accepts irregular forms has -> have and was/were -> be', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'She has a plan. It was clear, and they were ready.'

    expect(lexicalFinding(pkg)).toBeUndefined()
  })

  it('validates hyphen compounds by their component words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Write the four-number code.'

    expect(lexicalFinding(pkg)).toBeUndefined()
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
    expect(profile.version).toBe('1.0.0')
    expect(profile.isFallback).toBe(true)
  })
})
