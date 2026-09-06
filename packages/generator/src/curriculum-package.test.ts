import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage, makeGroundedCurriculumPackage, validateCurriculumPackage, type CurriculumPackage, type CurriculumPackageV20, type CurriculumQuestion } from './index.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

import { validPackage } from './fixtures/canonical-package-fixture.js'
export { validPackage }

describe('curriculum package v2', () => {
  it('accepts a self-study package with complete provenance', () => {
    const result = validateCurriculumPackage(validPackage())
    expect(result.success ? [] : result.issues).toEqual([])
  })

  it('accepts all legitimate variants for an open response', () => {
    const value = validPackage()
    value.answers[0]!.acceptedAnswers = Array.from({ length: 12 }, (_, index) => `legitimate variant ${index + 1}`)
    expect(validateCurriculumPackage(value).success).toBe(true)
  })

  it('requires post-guided evidence for major targets', () => {
    const value = validPackage()
    for (const stage of value.studentLesson.practice) {
      for (const question of stage.questions) {
        question.targetIds = stage.stage === 'guided'
          ? ['grammar-do-does', 'reading-inference']
          : ['reading-inference']
      }
    }
    for (const question of value.studentLesson.homework.questions) question.targetIds = ['reading-inference']

    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(false)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'evidence-plan', severity: 'critical', message: expect.stringContaining('grammar-do-does') }),
    ]))
  })

  it('auto-normalizes declared reading word count to actual word count', () => {
    const value = validPackage()
    value.studentLesson.reading.wordCount = 999
    const result = validateCurriculumPackage(value)
    expect(result.success).toBe(true)
    if (result.success) {
      const actualWords = value.studentLesson.reading.paragraphs.join(' ').trim().split(/\s+/u).length
      expect(result.curriculumPackage.studentLesson.reading.wordCount).toBe(actualWords)
    }
  })

  it.each([
    ['a missing gradual-release stage', (value: ReturnType<typeof validPackage>) => { value.studentLesson.practice = value.studentLesson.practice.filter((section) => section.stage !== 'guided') }],
    ['an unresolved critical review finding', (value: ReturnType<typeof validPackage>) => { value.qualityEvidence.criticFindings.push({ dimension: 'self-study', severity: 'critical', finding: 'No usable Chinese explanation.', resolution: null }) }],
    ['an answer gap', (value: ReturnType<typeof validPackage>) => { value.answers.pop() }],
    ['an unknown learning target', (value: ReturnType<typeof validPackage>) => { value.studentLesson.practice[0]!.questions[0]!.targetIds = ['missing-target'] }],
  ])('rejects structural defect: %s', (_, mutate) => {
    const value = validPackage()
    mutate(value)
    expect(validateCurriculumPackage(value).success).toBe(false)
  })

  it.each([
    ['production packet', 'Week 1 無前一份 production packet 可比較；本週建立閱讀取證與因果產出的可觀察基線'],
    ['observable baseline', '本週建立可量測基準：同一目標跨 guided、independent、CAP 留下提示前後證據。'],
    ['silence-mastery trope', '本輪為 Week 1 且 feedbackMissing=true；沒有把沉默視為掌握，採保守校準。'],
  ])('reports forbidden-jargon word-list matches as warning-only telemetry: %s', (_, jargonSentence) => {
    const value = validPackage()
    value.parentSummary.personalizationZh = [jargonSentence]
    const audit = auditCurriculumPackage(value)
    expect(audit.passed).toBe(true)
    const semanticFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'parent-personalization')
    expect(semanticFinding).toBeDefined()
    expect(semanticFinding?.severity).toBe('warning')
  })

  it('accepts clean parent-facing personalizationZh answering parent questions', () => {
    const value = validPackage()
    value.parentSummary.personalizationZh = [
      '上週閱讀偏簡單，本週提高推論深度，並加入中文策略示範引導找證據。',
      '針對容易混淆的 do / does 加入複習題，確認第三人稱單數動詞用法。',
      '結合孩子感興趣的機器人實驗主題，提高閱讀動機。',
    ]
    const result = validateCurriculumPackage(value)
    expect(result.success).toBe(true)
  })

  it('enforces fail-closed canonical grammar IDs: rejects arbitrary grammar ID in trackingDelta', () => {
    const value = validPackage()
    const v21 = upgradeV20ToV21(value as any)
    const v22 = upgradeV21ToV22(v21)
    v22.trackingDelta.exposedGrammarTargetIds = ['g7-fake-unregistered-grammar-id']

    const result = validateCurriculumPackage(v22)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.some((issue) => issue.path.includes('exposedGrammarTargetIds') && issue.message.includes('25 derived grammar'))).toBe(true)
    }
  })

  it('enforces fail-closed canonical communication function IDs: rejects arbitrary communication ID in trackingDelta', () => {
    const value = validPackage()
    const v21 = upgradeV20ToV21(value as any)
    const v22 = upgradeV21ToV22(v21)
    v22.trackingDelta.exposedCommunicationFunctionIds = ['cf-fake-invented-function']

    const result = validateCurriculumPackage(v22)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.some((issue) => issue.path.includes('exposedCommunicationFunctionIds') && issue.message.includes('16 official communication'))).toBe(true)
    }
  })

  it('validates first-class optional adaptiveExtension in Schema 2.2', () => {
    const value = validPackage()
    const v21 = upgradeV20ToV21(value as any)
    const v22 = upgradeV21ToV22(v21)

    // 1. Valid with strategy purpose after reading
    v22.studentLesson.adaptiveExtension = {
      id: 'ext-strategy-1',
      placement: 'after-reading',
      purpose: 'strategy',
      titleZh: '會考長文閱讀策略：條件與轉折線索',
      contentZh: '當你讀到 If... 或 However 時，先停下來圈出因果或轉折關係。',
      taskZh: '在文章中找出含有 If 的句子並用括號標記條件。',
      taskWritingLines: 2,
    }
    const res1 = validateCurriculumPackage(v22)
    expect(res1.success).toBe(true)

    // 2. Valid with reasoning purpose after practice
    v22.studentLesson.adaptiveExtension = {
      id: 'ext-reasoning-1',
      placement: 'after-practice',
      purpose: 'reasoning',
      titleZh: '動詞時態陷阱排查',
      contentZh: '檢查句子時，先抓出主詞是單數還是複數。',
      taskZh: null,
      taskWritingLines: 0,
    }
    const res2 = validateCurriculumPackage(v22)
    expect(res2.success).toBe(true)

    // 3. Rejects invalid placement
    v22.studentLesson.adaptiveExtension = {
      id: 'ext-invalid-1',
      placement: 'before-reading' as any,
      purpose: 'strategy',
      titleZh: '無效位置測試',
      contentZh: '說明內容',
      taskZh: null,
      taskWritingLines: 0,
    }
    const res3 = validateCurriculumPackage(v22)
    expect(res3.success).toBe(false)

    // 4. Rejects invalid purpose
    v22.studentLesson.adaptiveExtension = {
      id: 'ext-invalid-2',
      placement: 'after-reading',
      purpose: 'drill-filler' as any,
      titleZh: '無效目的測試',
      contentZh: '說明內容',
      taskZh: null,
      taskWritingLines: 0,
    }
    const res4 = validateCurriculumPackage(v22)
    expect(res4.success).toBe(false)
  })
})

describe('curriculum package v2.3 grounding', () => {
  const groundedPackage = (theme: 'basketball' | 'anime' | 'technology' = 'technology') => {
    const v22 = upgradeV21ToV22(upgradeV20ToV21(validPackage()))
    if (v22.metadata.schemaVersion !== '2.2.0') throw new Error('Expected a 2.2 fixture')
    return makeGroundedCurriculumPackage(v22, theme)
  }

  it.each(['basketball', 'anime', 'technology'] as const)('accepts prose-bound %s research', (theme) => {
    expect(validateCurriculumPackage(groundedPackage(theme)).success).toBe(true)
  })

  it('rejects a 2.3 package without real grounding', () => {
    const value = groundedPackage() as unknown as Record<string, unknown>
    delete value.grounding
    expect(validateCurriculumPackage(value).success).toBe(false)
  })

  it.each([
    ['unknown source', (value: ReturnType<typeof groundedPackage>) => { value.grounding.facts[0]!.sourceIds = ['source-missing'] }],
    ['unknown fact', (value: ReturnType<typeof groundedPackage>) => { value.grounding.claims[0]!.factIds = ['fact-missing'] }],
    ['missing location', (value: ReturnType<typeof groundedPackage>) => { value.grounding.claims[0]!.location = 'studentLesson.reading.blocks.99.text' }],
    ['noncanonical location', (value: ReturnType<typeof groundedPackage>) => { value.grounding.claims[0]!.location = 'parentSummary.focusZh' }],
    ['text absent from prose', (value: ReturnType<typeof groundedPackage>) => { value.grounding.claims[0]!.text = 'This sentence was not authored.' }],
    ['trivial claim span', (value: ReturnType<typeof groundedPackage>) => { value.grounding.claims[0]!.text = 'Mina' }],
    ['duplicate source reference', (value: ReturnType<typeof groundedPackage>) => { value.grounding.facts[0]!.sourceIds.push(value.grounding.facts[0]!.sourceIds[0]!) }],
    ['duplicate fact reference', (value: ReturnType<typeof groundedPackage>) => { value.grounding.claims[0]!.factIds.push(value.grounding.claims[0]!.factIds[0]!) }],
    ['duplicate fact proposition', (value: ReturnType<typeof groundedPackage>) => { value.grounding.facts[1]!.text = value.grounding.facts[0]!.text }],
    ['duplicate prose binding', (value: ReturnType<typeof groundedPackage>) => {
      value.grounding.claims[1]!.location = value.grounding.claims[0]!.location
      value.grounding.claims[1]!.text = value.grounding.claims[0]!.text
    }],
  ])('rejects a broken provenance chain: %s', (_, mutate) => {
    const value = groundedPackage()
    mutate(value)
    expect(validateCurriculumPackage(value).success).toBe(false)
  })

  it('requires publication timestamps for every current source', () => {
    const value = groundedPackage()
    value.grounding.temporalMode = 'current'
    expect(validateCurriculumPackage(value).success).toBe(false)
    value.grounding.sources[0]!.publishedAt = '2026-08-23T00:00:00.000Z'
    value.qualityEvidence.criticalChecks.push({ id: 'grounding-freshness', passed: true, evidence: 'Critic checked publication and research dates.' })
    expect(validateCurriculumPackage(value).success).toBe(true)
  })

  it.each([
    ['source access after research', (value: ReturnType<typeof groundedPackage>) => {
      value.grounding.sources[0]!.accessedAt = '2026-08-25T00:00:00.000Z'
    }, 'accessedAt must not be later than researchedAt'],
    ['source publication after access', (value: ReturnType<typeof groundedPackage>) => {
      value.grounding.sources[0]!.publishedAt = '2026-08-25T00:00:00.000Z'
    }, 'publishedAt must not be later than accessedAt'],
    ['source publication after research', (value: ReturnType<typeof groundedPackage>) => {
      value.grounding.sources[0]!.accessedAt = '2026-08-26T00:00:00.000Z'
      value.grounding.sources[0]!.publishedAt = '2026-08-25T00:00:00.000Z'
    }, 'publishedAt must not be later than researchedAt'],
  ])('rejects non-causal grounding timestamps: %s', (_, mutate, expectedMessage) => {
    const value = groundedPackage()
    mutate(value)
    const result = validateCurriculumPackage(value)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining(expectedMessage) }),
      ]))
    }
  })

  it('reports low grounding density as warning-only telemetry', () => {
    const value = groundedPackage('basketball')
    value.grounding.facts = value.grounding.facts.slice(0, 1)
    value.grounding.claims = value.grounding.claims.slice(0, 1)
    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(true)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'grounding-substance', severity: 'warning' }),
      expect.objectContaining({ dimension: 'grounding-coverage', severity: 'warning' }),
    ]))
  })

  it('keeps article density exceptions advisory instead of publication-blocking', () => {
    const value = groundedPackage('anime')
    value.grounding.facts = value.grounding.facts.slice(0, 2)
    value.grounding.claims = value.grounding.claims.slice(0, 2)
    value.qualityEvidence.criticalChecks.push({
      id: 'grounding-density-exception',
      passed: true,
      evidence: 'This explanation records why the author used lower factual density for this article.',
    })
    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(true)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'grounding-substance', severity: 'warning' }),
    ]))
  })

  it('rejects current research that cites a source published after research occurred', () => {
    const value = groundedPackage('technology')
    value.grounding.temporalMode = 'current'
    value.grounding.sources[0]!.publishedAt = '2026-08-25T00:00:00.000Z'
    value.qualityEvidence.criticalChecks.push({ id: 'grounding-freshness', passed: true, evidence: 'Critic checked publication and research dates.' })
    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(false)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dimension: 'deterministic-validation',
        severity: 'critical',
        message: expect.stringContaining('publishedAt must not be later than researchedAt'),
      }),
    ]))
  })
})
