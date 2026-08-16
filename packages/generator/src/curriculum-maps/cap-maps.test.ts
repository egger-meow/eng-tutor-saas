import { describe, it, expect } from 'vitest'
import communicationAppendix4 from './official/communication-appendix-4.json' with { type: 'json' }
import grammarAppendix6 from './official/grammar-appendix-6.json' with { type: 'json' }
import vocabulary2000 from './official/vocabulary-2000.json' with { type: 'json' }
import sourceManifest from './official/source-manifest.json' with { type: 'json' }
import { communicationFamilies, getCommunicationFamily, findFamilyByOfficialFunctionId } from './derived/communication-families.js'
import { grammarProgressionUnits, getGrammarUnit, getUnitsByGradeStage } from './derived/grammar-progression.js'
import { getSuggestedGradeForWord, getThemeForWord } from './derived/vocabulary-annotations.js'

describe('CAP Official & Derived Curriculum Maps', () => {
  describe('Official Reference Data', () => {
    it('verifies official source manifest metadata', () => {
      expect(sourceManifest.curriculumStandard).toContain('108 課綱')
      expect(sourceManifest.provenance.vocabulary.core1200Count).toBe(1200)
      expect(sourceManifest.provenance.vocabulary.extension800Count).toBe(800)
      expect(sourceManifest.annotationPolicy).toContain('derived/')
    })

    it('validates canonical vocabulary 2000 integrity', () => {
      expect(vocabulary2000.length).toBeGreaterThanOrEqual(2000)
      const seenIds = new Set<string>()
      for (const item of vocabulary2000) {
        expect(item.id).toMatch(/^v-[a-z0-9-]+$/)
        expect(item.word.length).toBeGreaterThan(0)
        expect(item.partOfSpeech.length).toBeGreaterThan(0)
        expect(['core-1200', 'ext-800']).toContain(item.band)
        expect(seenIds.has(item.id)).toBe(false)
        seenIds.add(item.id)
      }
    })

    it('validates official 108 Appendix 4 communication functions', () => {
      expect(communicationAppendix4.length).toBeGreaterThanOrEqual(12)
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
      expect(grammarAppendix6.length).toBeGreaterThanOrEqual(20)
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
      const officialIds = new Set(communicationAppendix4.map((f) => f.id))
      for (const family of communicationFamilies) {
        expect(family.annotationSource).toBe('paper-english-derived')
        expect(family.titleZh.length).toBeGreaterThan(0)
        expect(family.keyTargetPhrases.length).toBeGreaterThan(0)
        expect(family.dialogueScaffold.exampleTurn.length).toBeGreaterThan(0)
        for (const officialId of family.officialFunctionIds) {
          expect(officialIds.has(officialId)).toBe(true)
        }
      }
    })

    it('looks up communication families bidirectionally', () => {
      const family = getCommunicationFamily('request-permission')
      expect(family?.titleZh).toBe('請求協助與徵詢許可')

      const found = findFamilyByOfficialFunctionId('cf-making-requests')
      expect(found?.familyId).toBe('request-permission')
    })

    it('verifies 24 grammar units progression with valid prerequisites', () => {
      expect(grammarProgressionUnits.length).toBe(24)
      const unitIds = new Set(grammarProgressionUnits.map((u) => u.unitId))
      const officialGrammarIds = new Set(grammarAppendix6.map((g) => g.id))

      for (const unit of grammarProgressionUnits) {
        expect(unit.annotationSource).toBe('paper-english-derived')
        expect(['grade_7', 'grade_8', 'grade_9']).toContain(unit.gradeStage)
        expect(officialGrammarIds.has(unit.officialAppendix6Id)).toBe(true)
        expect(unit.patterns.length).toBeGreaterThan(0)
        expect(unit.taiwaneseStudentTrapsZh.length).toBeGreaterThan(0)
        for (const prereq of unit.prerequisites) {
          expect(unitIds.has(prereq)).toBe(true)
        }
      }
    })

    it('queries grammar units by grade stage', () => {
      const g7Units = getUnitsByGradeStage('grade_7')
      const g8Units = getUnitsByGradeStage('grade_8')
      const g9Units = getUnitsByGradeStage('grade_9')

      expect(g7Units.length).toBe(8)
      expect(g8Units.length).toBe(8)
      expect(g9Units.length).toBe(8)
      expect(getGrammarUnit('g9-passive-voice')?.titleZh).toBe('被動語態 (be + p.p.)')
    })

    it('annotates vocabulary with suggested grade and semantic themes', () => {
      expect(getSuggestedGradeForWord('core-1200', 100)).toBe(7)
      expect(getSuggestedGradeForWord('core-1200', 800)).toBe(8)
      expect(getSuggestedGradeForWord('ext-800', 100)).toBe(9)

      expect(getThemeForWord('robot')).toBe('science-tech')
      expect(getThemeForWord('homework')).toBe('school-life')
      expect(getThemeForWord('restaurant')).toBe('food-dining')
      expect(getThemeForWord('shelter')).toBe('animals-nature')
      expect(getThemeForWord('basketball')).toBe('sports-athletics')
      expect(getThemeForWord('ticket')).toBe('travel-places')
      expect(getThemeForWord('curtain')).toBe('daily-life')
    })
  })
})
