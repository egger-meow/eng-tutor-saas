import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'
import { CurriculumPackageV20Schema } from './curriculum-package-schema.js'
import { validateCurriculumPackage } from './validate-curriculum-package.js'

function sha256(content: string): string {
  return createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
}

describe('Wave 2 Golden Benchmark Harness', () => {
  const evalDir = resolve(REPO_ROOT, 'docs/evaluations/wave-2')

  it('validates manifest.json structure and cryptographic hashes', async () => {
    const manifestRaw = await readFile(resolve(evalDir, 'manifest.json'), 'utf8')
    const manifest = JSON.parse(manifestRaw)

    expect(manifest.schemaVersion).toBe('2.0.0')
    expect(manifest.baselinePromptVersion).toBe('2.0.1')
    expect(manifest.candidatePromptVersion).toBe('2.1.0')
    expect(manifest.rubricVersion).toBe('wave-2-v1')

    const cases = ['a', 'b', 'c', 'd', 'e']
    for (const c of cases) {
      const caseKey = c.toUpperCase()
      const caseInfo = manifest.cases[caseKey]
      expect(caseInfo).toBeDefined()

      const contextRaw = await readFile(resolve(evalDir, `case-${c}/context.json`), 'utf8')
      const v201Raw = await readFile(resolve(evalDir, `case-${c}/2.0.1-output.json`), 'utf8')
      const v210Raw = await readFile(resolve(evalDir, `case-${c}/2.1.0-output.json`), 'utf8')

      expect(sha256(contextRaw)).toBe(caseInfo.contextHash)
      expect(sha256(v201Raw)).toBe(caseInfo.baselineOutputHash)
      expect(sha256(v210Raw)).toBe(caseInfo.candidateOutputHash)
    }
  })

  it('validates that all golden output packages strictly parse against CurriculumPackageV20Schema and validateCurriculumPackage', async () => {
    const cases = ['a', 'b', 'c', 'd', 'e']
    for (const c of cases) {
      const v201Raw = await readFile(resolve(evalDir, `case-${c}/2.0.1-output.json`), 'utf8')
      const v210Raw = await readFile(resolve(evalDir, `case-${c}/2.1.0-output.json`), 'utf8')

      const v201Json = JSON.parse(v201Raw)
      const v210Json = JSON.parse(v210Raw)

      expect(() => CurriculumPackageV20Schema.parse(v201Json)).not.toThrow()
      expect(() => CurriculumPackageV20Schema.parse(v210Json)).not.toThrow()

      expect(validateCurriculumPackage(v201Json).success).toBe(true)
      expect(validateCurriculumPackage(v210Json).success).toBe(true)
    }
  })
})
