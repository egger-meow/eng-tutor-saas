import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import communicationAppendix4 from './official/communication-appendix-4.json' with { type: 'json' }
import grammarAppendix6 from './official/grammar-appendix-6.json' with { type: 'json' }
import vocabulary2000 from './official/vocabulary-2000.json' with { type: 'json' }
import sourceManifest from './official/source-manifest.json' with { type: 'json' }
import { communicationFamilies, getCommunicationFamily, findFamilyByOfficialFunctionId } from './derived/communication-families.js'
import { grammarProgressionUnits, getGrammarUnit, getUnitsByGradeStage } from './derived/grammar-progression.js'
import { getSuggestedGradeForWord, getThemeForWord } from './derived/vocabulary-annotations.js'

describe('CAP Official & Derived Curriculum Maps', () => {
  describe('Official Reference Data & Provenance', () => {
    it('verifies official source manifest metadata and cryptographic file hashes', () => {
      expect(sourceManifest.curriculumStandard).toContain('108 課綱')
      expect(sourceManifest.provenance.vocabulary.totalWords).toBe(2000)
      expect(sourceManifest.provenance.vocabulary.core1200Count).toBe(1200)
      expect(sourceManifest.provenance.vocabulary.extension800Count).toBe(800)
      expect(sourceManifest.annotationPolicy).toContain('derived/')

      // Verify SHA-256 for all official reference datasets
      for (const [relPath, expectedHash] of Object.entries(sourceManifest.fileChecksumsSha256)) {
        const fullPath = resolve(import.meta.dirname, relPath)
        const fileContent = readFileSync(fullPath)
        const actualHash = createHash('sha256').update(fileContent).digest('hex')
        expect(actualHash).toBe(expectedHash)
      }
    })

    it('validates canonical vocabulary 2000 exact counts and structure (1200 core + 800 extension)', () => {
      expect(vocabulary2000.length).toBe(2000)
      const core1200 = vocabulary2000.filter((item) => item.band === 'core-1200')
      const ext800 = vocabulary2000.filter((item) => item.band === 'ext-800')

      expect(core1200.length).toBe(1200)
      expect(ext800.length).toBe(800)

      const seenIds = new Set<string>()
      const seenWords = new Set<string>()
      for (const item of vocabulary2000) {
        expect(item.id).toMatch(/^v-[a-z0-9-]+$/)
        expect(item.word.length).toBeGreaterThan(0)
        expect(item.partOfSpeech.length).toBeGreaterThan(0)
        expect(['core-1200', 'ext-800']).toContain(item.band)
        expect(seenIds.has(item.id)).toBe(false)
        expect(seenWords.has(item.word.toLowerCase())).toBe(false)
        seenIds.add(item.id)
        seenWords.add(item.word.toLowerCase())
      }
    })

    it('validates official 108 Appendix 4 communication functions', () => {
      expect(communicationAppendix4.length).toBe(16)
      const seenIds = new Set<string>()
      for (const func of communicationAppendix4) {
        expect(func.id).toMatch(/^cf-[a-z0-9-]+$/)
        expect(func.officialCategory.length).toBeGreaterThan(0)
        expect(func.officialLabelZh.length).toBeGreaterThan(0)
        expect(func.typicalExponents.length).toBeGreaterThan(0)
        expect(seenIds.has(func.id)).toBe(false)
        seenIds.add(func.id)
      }
    })

    it('validates official 108 Appendix 6 grammar reference structures', () => {
      expect(grammarAppendix6.length).toBe(22)
      const seenIds = new Set<string>()
      for (const unit of grammarAppendix6) {
        expect(unit.id).toMatch(/^og-[a-z0-9-]+$/)
        expect(unit.officialSection.length).toBeGreaterThan(0)
        expect(unit.topicZh.length).toBeGreaterThan(0)
        expect(unit.exemplarStructures.length).toBeGreaterThan(0)
        expect(seenIds.has(unit.id)).toBe(false)
        seenIds.add(unit.id)
      }
    })
  })

  describe('Derived Pedagogical Annotations', () => {
    it('verifies 12 communication families map to official function IDs', () => {
      expect(communicationFamilies.length).toBe(12)
      for (const family of communicationFamilies) {
        expect(family.familyId.length).toBeGreaterThan(0)
        expect(family.titleZh.length).toBeGreaterThan(0)
        expect(family.officialFunctionIds.length).toBeGreaterThan(0)
        for (const offId of family.officialFunctionIds) {
          const match = communicationAppendix4.find((item) => item.id === offId)
          expect(match).toBeDefined()
        }
      }
    })

    it('retrieves communication family by helper functions', () => {
      const family = getCommunicationFamily('request-permission')
      expect(family).toBeDefined()
      expect(family?.titleZh).toBe('請求協助與徵詢許可')

      const found = findFamilyByOfficialFunctionId('cf-making-requests')
      expect(found).toBeDefined()
      expect(found?.familyId).toBe('request-permission')
    })

    it('verifies 24 grammar progression units across 3 junior high grades', () => {
      expect(grammarProgressionUnits.length).toBe(24)
      const g7 = getUnitsByGradeStage('grade_7')
      const g8 = getUnitsByGradeStage('grade_8')
      const g9 = getUnitsByGradeStage('grade_9')

      expect(g7.length).toBe(8)
      expect(g8.length).toBe(8)
      expect(g9.length).toBe(8)

      for (const unit of grammarProgressionUnits) {
        expect(unit.unitId).toMatch(/^g[789]-[a-z0-9-]+$/)
        expect(unit.officialAppendix6Id).toMatch(/^og-[a-z0-9-]+$/)
        expect(unit.titleZh.length).toBeGreaterThan(0)
        expect(unit.patterns.length).toBeGreaterThan(0)
        expect(unit.taiwaneseStudentTrapsZh.length).toBeGreaterThan(0)
      }
    })

    it('retrieves grammar unit by ID helper', () => {
      const unit = getGrammarUnit('g9-present-perfect-experience')
      expect(unit).toBeDefined()
      expect(unit?.titleZh).toBe('現在完成式：經驗與完成 (have/has + p.p., already/yet/never)')
      expect(unit?.officialAppendix6Id).toBe('og-present-perfect')
    })

    it('provides vocabulary grade and theme annotations', () => {
      expect(getSuggestedGradeForWord('core-1200', 100)).toBe(7)
      expect(getSuggestedGradeForWord('core-1200', 800)).toBe(8)
      expect(getSuggestedGradeForWord('ext-800', 50)).toBe(9)

      expect(getThemeForWord('robot')).toBe('science-tech')
      expect(getThemeForWord('apple')).toBe('food-dining')
      expect(getThemeForWord('soccer')).toBe('sports-athletics')
    })
  })
})
