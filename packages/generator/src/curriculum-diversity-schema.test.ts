import { describe, expect, it } from 'vitest'
import {
  CurriculumPackageV25Schema, CurriculumPackageV26Schema, InstructionBlockSchema, OpeningActivitySchema,
  upgradeV23ToV24, upgradeV24ToV25,
} from './curriculum-package-schema.js'
import { computeDeterministicPlanMinutes } from './normalize-curriculum-package.js'
import { instructionTexts } from './instruction-content.js'
import { validateCurriculumPackage } from './validate-curriculum-package.js'
import { validateCurriculumPackageForFinisher } from './finisher-validate-curriculum-package.js'
import { validPackage } from './fixtures/canonical-package-fixture.js'
import { makeGroundedCurriculumPackage } from './fixtures/grounded-curriculum-packages.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

const activities = [
  { type: 'question', titleZh: '回想經驗', prompt: '你如何確認改變有效？', writingLines: 2 },
  { type: 'observation', titleZh: '比較看看', examples: ['She tests one change.', 'She tests every change.'], noticeZh: '注意改變的數量。' },
  { type: 'reading-purpose', titleZh: '帶著目標讀', purposeZh: '找出團隊如何排除問題。' },
  { type: 'direct-reading' },
]
const blocks = [
  { type: 'prose', textZh: '先找出主詞，再判斷動詞形式。' },
  { type: 'bullets', itemsZh: ['圈出主詞', '比較例句'] },
  { type: 'comparison', headers: ['主詞', '動詞'], rows: [['She', 'tests'], ['They', 'test']], takeawayZh: '留意單數主詞。' },
  { type: 'steps', itemsZh: ['找主詞', '選形式'] },
  { type: 'worked-example', example: 'She tests the robot.', walkthroughZh: 'She 是單數，因此用 tests。' },
  { type: 'error-analysis', wrong: 'She test the robot.', corrected: 'She tests the robot.', whyZh: '第三人稱單數需加 s。' },
]
function historicalPackage() {
  return upgradeV24ToV25(upgradeV23ToV24(makeGroundedCurriculumPackage(upgradeV21ToV22(upgradeV20ToV21(validPackage())), 'technology')))
}
function diversePackage(activity = activities[3]) {
  const previous = historicalPackage()
  return {
    ...previous,
    metadata: { ...previous.metadata, schemaVersion: '2.6.0' },
    studentLesson: {
      ...previous.studentLesson,
      opening: { goalsZh: previous.studentLesson.opening.goalsZh, howToUseZh: previous.studentLesson.opening.howToUseZh, activity },
      instruction: [{ id: 'instruction-1', titleZh: '看主詞選動詞', blocks: structuredClone(blocks) }],
    },
  }
}

describe('canonical 2.6 purposeful teaching diversity', () => {
  it.each(activities)('accepts $type openings without a redundant warm-up', (activity) => {
    expect(CurriculumPackageV26Schema.safeParse(diversePackage(activity)).success).toBe(true)
  })
  it.each(blocks)('accepts $type teaching blocks independently of legacy components', (block) => {
    const packet = diversePackage()
    packet.studentLesson.instruction[0]!.blocks = [block]
    expect(CurriculumPackageV26Schema.safeParse(packet).success).toBe(true)
  })
  it('preserves historical packages and rejects cross-version shape relabelling', () => {
    const old = historicalPackage()
    expect(CurriculumPackageV25Schema.safeParse(old).success).toBe(true)
    expect(CurriculumPackageV26Schema.safeParse({ ...old, metadata: { ...old.metadata, schemaVersion: '2.6.0' } }).success).toBe(false)
    const current = diversePackage()
    expect(CurriculumPackageV25Schema.safeParse({ ...current, metadata: { ...current.metadata, schemaVersion: '2.5.0' } }).success).toBe(false)
  })
  it('requires real instruction content and rectangular comparison cells', () => {
    const packet = diversePackage()
    packet.studentLesson.instruction[0]!.blocks = []
    expect(CurriculumPackageV26Schema.safeParse(packet).success).toBe(false)
    expect(InstructionBlockSchema.safeParse({ type: 'comparison', headers: ['A', 'B', 'C'], rows: [['one', 'two']] }).success).toBe(false)
    expect(InstructionBlockSchema.safeParse({ type: 'bullets', itemsZh: [' '] }).success).toBe(false)
  })
  it('requires writing space only for reflective question openings', () => {
    expect(OpeningActivitySchema.safeParse({ ...activities[0], writingLines: 0 }).success).toBe(false)
    expect(OpeningActivitySchema.safeParse({ type: 'direct-reading', writingLines: 2 }).success).toBe(false)
    expect(OpeningActivitySchema.safeParse({ ...activities[1], writingLines: 2 }).success).toBe(false)
  })
})

describe('diversity consumer compatibility', () => {
  it.each([validateCurriculumPackage, validateCurriculumPackageForFinisher])('accepts both versions through the real validator', (validate) => {
    expect(validate(historicalPackage()).success).toBe(true)
    const result = validate(diversePackage())
    expect(result.success, JSON.stringify(result)).toBe(true)
  })
  it('keeps answer integrity mandatory for new teaching layouts', () => {
    const packet = diversePackage()
    packet.answers = []
    expect(validateCurriculumPackageForFinisher(packet).success).toBe(false)
  })
  it('rejects a new shape relabelled as the predecessor at both boundaries', () => {
    const packet = diversePackage()
    packet.metadata.schemaVersion = '2.5.0'
    expect(validateCurriculumPackage(packet).success).toBe(false)
    expect(validateCurriculumPackageForFinisher(packet).success).toBe(false)
  })
})


it('counts authored work rather than imposing the old warm-up duration', () => {
  const packet = diversePackage()
  const direct = computeDeterministicPlanMinutes(packet)
  packet.studentLesson.opening.activity = activities[0]
  expect(computeDeterministicPlanMinutes(packet)).toBe(direct + 2)
  const before = computeDeterministicPlanMinutes(packet)
  packet.studentLesson.instruction[0]!.blocks.push(blocks[4]!)
  expect(computeDeterministicPlanMinutes(packet)).toBe(before + 2)
})
it('extracts prose from every teaching block for content audits', () => {
  const texts = instructionTexts({ blocks })
  for (const text of ['先找出主詞，再判斷動詞形式。', '圈出主詞', 'tests', '選形式', 'She tests the robot.', 'She test the robot.']) {
    expect(texts).toContain(text)
  }
  expect(texts).not.toContain('comparison')
})
it('rejects malformed blocks without throwing during normalization', () => {
  const packet = diversePackage()
  ;(packet.studentLesson.instruction[0]!.blocks as unknown[]) = [null]
  expect(() => validateCurriculumPackage(packet)).not.toThrow()
  expect(validateCurriculumPackage(packet).success).toBe(false)
})
