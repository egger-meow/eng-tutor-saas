import { describe, it, expect } from 'vitest'
import { validateCurriculumPackage } from './validate-curriculum-package.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { CurriculumPackageSchema, CurriculumPackageV20Schema } from './curriculum-package-schema.js'
import { countWords, extractBlockTexts } from './normalize-curriculum-package.js'
import { validPackage } from './curriculum-package.test.js'

function validV21Package(): any {
  const v20 = validPackage()
  return upgradeV20ToV21(v20 as any)
}

describe('Wave 4: Schema 2.1.0 Multi-Genre Reading Blocks & Upgrade Layer', () => {
  it('validates canonical Schema 2.1.0 with multi-genre reading blocks', () => {
    const pkg = validV21Package()
    pkg.studentLesson.reading.genre = 'dialogue'
    pkg.studentLesson.reading.blocks = [
      { type: 'dialogue', speaker: 'Leo', text: 'Check the redstone behind the right door block because the signal might not be reaching the piston properly.' },
      { type: 'dialogue', speaker: 'Mia', text: 'The left door works smoothly, but the right door will not open when we step on the front pressure plate.' },
      { type: 'paragraph', text: 'They both checked the wiring together and found the missing repeater. When a redstone circuit travels more than fifteen blocks, the signal becomes weak and cannot trigger heavy iron doors.' },
      { type: 'notice', heading: 'SERVER TIP', text: 'Always place repeaters facing the correct circuit direction. If a repeater is placed backwards, no electricity or redstone signal will flow through the line.' },
      { type: 'schedule-row', timeOrStep: 'Step 1', event: 'Craft two stone pressure plates and connect them with four pieces of redstone dust', detail: 'Place directly in front of the door' },
      { type: 'schedule-row', timeOrStep: 'Step 2', event: 'Test the left pressure plate by walking over it carefully', detail: 'Verify immediate door opening' },
    ]

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.curriculumPackage.metadata.schemaVersion).toBe('2.2.0')
      expect(result.curriculumPackage.studentLesson.reading.genre).toBe('dialogue')
      expect(result.curriculumPackage.studentLesson.reading.blocks.length).toBe(6)
    }
  })

  it('transparently upgrades legacy Schema 2.0.0 package to 2.2.0', () => {
    const legacyV20 = validPackage() // has schemaVersion: 2.0.0 and paragraphs[]
    expect(legacyV20.metadata.schemaVersion).toBe('2.0.0')
    expect(legacyV20.studentLesson.reading.paragraphs).toBeDefined()

    const result = validateCurriculumPackage(legacyV20)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.curriculumPackage.metadata.schemaVersion).toBe('2.2.0')
      expect(result.curriculumPackage.studentLesson.reading.genre).toBe('article')
      expect(result.curriculumPackage.studentLesson.reading.blocks.length).toBe(legacyV20.studentLesson.reading.paragraphs.length)
      expect(result.curriculumPackage.studentLesson.reading.blocks[0]).toEqual({
        type: 'paragraph',
        text: legacyV20.studentLesson.reading.paragraphs[0],
      })
    }
  })

  it('accurately normalizes word count across mixed reading blocks', () => {
    const pkg = validV21Package()
    pkg.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'Mina joins a school robotics club because she wants to build a machine that can sort library books quickly without human assistance.' },
      { type: 'dialogue', speaker: 'Jay', text: 'Let us replace every single sensor before the final competition tomorrow morning so that we do not encounter unexpected recognition errors.' },
      { type: 'dialogue', speaker: 'Mina', text: 'We should change only one component at a time. If we replace everything simultaneously, we will never know which part caused the failure.' },
      { type: 'notice', heading: 'LAB POLICY', text: 'Always record baseline sensor readings before adjusting external classroom light sources or camera lens shade angles.' },
      { type: 'schedule-row', timeOrStep: '14:00', event: 'Calibrate optical color recognition camera using five matte textbook covers', detail: 'Room 302 Laboratory' },
      { type: 'paragraph', text: 'By following this systematic procedure, both teammates successfully fixed the optical recognition error and prepared the sorting robot for the science competition.' },
    ]
    pkg.studentLesson.reading.wordCount = 999 // intentionally incorrect

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(true)
    if (result.success) {
      const texts = extractBlockTexts(pkg.studentLesson.reading.blocks)
      const expectedWords = countWords(texts)
      expect(result.curriculumPackage.studentLesson.reading.wordCount).toBe(expectedWords)
      expect(expectedWords).toBeGreaterThanOrEqual(120)
    }
  })

  it('rejects invalid reading block types', () => {
    const pkg = validV21Package()
    pkg.studentLesson.reading.blocks = [
      { type: 'invalid-block-type', text: 'hello' } as any,
    ]

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(false)
  })

  it('rejects unknown reading genres', () => {
    const pkg = validV21Package()
    pkg.studentLesson.reading.genre = 'unknown-genre-type' as any

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(false)
  })
})
