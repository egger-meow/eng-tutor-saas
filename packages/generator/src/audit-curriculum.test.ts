import { describe, expect, it } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import { validPackage } from './curriculum-package.test.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

function canonicalPackage(): any {
  const v20 = validPackage()
  const v21 = upgradeV20ToV21(v20 as any)
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  return v22
}

describe('curriculum audit & lexical contract', () => {
  it('fails closed for an invalid package', () => {
    expect(auditCurriculumPackage({}).passed).toBe(false)
  })

  it('passes for a valid canonical package adhering to lexical anchor, ceiling, and multi-genre blocks', () => {
    const pkg = canonicalPackage()
    const report = auditCurriculumPackage(pkg)
    console.log('Valid canonical test findings:', report.findings)
    expect(report.passed).toBe(true)
    expect(report.findings.filter((f) => f.severity === 'critical')).toEqual([])
  })

  it('allows one meaningful supporting-target observation without filler duplication', () => {
    const pkg = canonicalPackage()
    const questions = [...pkg.studentLesson.practice.flatMap((stage: any) => stage.questions), ...pkg.studentLesson.homework.questions]
    for (const question of questions) question.targetIds = question.targetIds.filter((id: string) => id !== 'vocab-experiment')
    const production = pkg.studentLesson.practice.find((stage: any) => stage.stage === 'production')
    production.questions[0].targetIds.push('vocab-experiment')
    const questionCountBeforeAudit = questions.length

    const report = auditCurriculumPackage(pkg)

    expect(report.passed).toBe(true)
    expect(report.findings).toContainEqual(expect.objectContaining({
      dimension: 'evidence-plan',
      severity: 'warning',
      message: expect.stringContaining('vocab-experiment'),
    }))
    expect(report.summary.questions).toBe(questionCountBeforeAudit)
  })

  it('accepts short clear Traditional Chinese stage instructions', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice.find((stage: any) => stage.stage === 'independent').instructionsZh = '作答'
    pkg.studentLesson.practice.find((stage: any) => stage.stage === 'cap-transfer').instructionsZh = '自己完成'

    const report = auditCurriculumPackage(pkg)

    expect(report.passed).toBe(true)
    expect(report.findings.some((finding) => finding.dimension === 'self-study' && finding.severity === 'critical')).toBe(false)
    expect(report.findings.some((finding) => finding.dimension === 'self-study' && finding.severity === 'warning')).toBe(true)
  })

  it('rejects an empty stage instruction through structural validation', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice.find((stage: any) => stage.stage === 'independent').instructionsZh = ''

    const report = auditCurriculumPackage(pkg)

    expect(report.passed).toBe(false)
    expect(report.findings.some((finding) => finding.tier === 'structural-critical' && finding.severity === 'critical')).toBe(true)
  })

  it('rejects a non-executable stage instruction', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice.find((stage: any) => stage.stage === 'independent').instructionsZh = '加油'

    const report = auditCurriculumPackage(pkg)

    expect(report.passed).toBe(false)
    expect(report.findings.some((finding) => finding.dimension === 'self-study' && finding.severity === 'critical')).toBe(true)
  })

  it('preserves structural rejection for reading below 120 words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.blocks = [{ type: 'paragraph', text: 'This reading is intentionally too short.' }]
    pkg.studentLesson.reading.wordCount = 6

    const report = auditCurriculumPackage(pkg)

    expect(report.passed).toBe(false)
    expect(report.findings).toContainEqual(expect.objectContaining({
      tier: 'structural-critical',
      dimension: 'deterministic-validation',
      severity: 'critical',
      message: expect.stringContaining('studentLesson.reading.wordCount'),
    }))
  })
  it('enforces lexical anchor: rejects package when core vocabulary is absent from reading passage', () => {
    const pkg = canonicalPackage()
    // Inject a core vocabulary word that never appears anywhere in the reading passage
    pkg.studentLesson.vocabulary.push({
      id: 'vocab-unrelated',
      word: 'astronomy',
      partOfSpeech: 'n.',
      meaningZh: '天文學',
      pronunciationHint: null,
      exampleEn: 'Astronomy is the study of stars.',
      exampleZh: '天文學是研究星星的科學。',
      status: 'new',
    })

    const report = auditCurriculumPackage(pkg)
    const anchorFinding = report.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding).toBeDefined()
    expect(anchorFinding?.severity).toBe('warning')
    expect(anchorFinding?.message).toContain('astronomy')
    expect(report.passed).toBe(true)
  })

  it('enforces comprehensive lexical ceiling: detects untaught high-difficulty words across options and practice', () => {
    const pkg = canonicalPackage()
    // Inject multiple obscure words into question prompt and options
    pkg.studentLesson.practice[0].questions[0].prompt = 'Does the ephemeral juxtaposition cause ubiquitous dichotomy in empirical methodology?'
    pkg.studentLesson.practice[0].questions[0].options = [
      'The transcendent epistemology obfuscates the paradigm.',
      'Normal robot operation continues.',
      'None of the above.',
      'All of the above.',
    ]

    const report = auditCurriculumPackage(pkg)
    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeDefined()
    expect(lexicalFinding?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })

  it('flags genre-block mismatch when dialogue genre lacks dialogue blocks', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.genre = 'dialogue'
    pkg.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'This is a normal paragraph without any dialogue block or speaker tags. The students are working together in the robotics workshop to assemble their mechanical chassis before the weekend competition. Each member takes responsibility for checking the motor mounting screws, calibrating the optical sensors, and testing the battery connections.' },
      { type: 'paragraph', text: 'Another long paragraph without dialogue blocks in this reading passage. They carefully measure each aluminum bracket, tighten the motor screws with hex wrenches, and verify that the drive wheels rotate smoothly on the test track. Even though they work late into the evening, nobody complains because they want their autonomous robot to win first place in the upcoming annual tournament against rival schools from neighboring districts and counties.' },
      { type: 'paragraph', text: 'Finally, the team supervisor reviews the complete electrical wiring diagram and gives helpful feedback on wire routing and safety shielding. With all hardware components firmly secured, the club prepares for full autonomous navigation tests tomorrow.' },
    ]

    const report = auditCurriculumPackage(pkg)
    const alignmentFinding = report.findings.find((f) => f.dimension === 'alignment' && f.message.includes('dialogue'))
    expect(alignmentFinding).toBeDefined()
    expect(alignmentFinding?.severity).toBe('critical')
  })

  it('enforces token-boundary morphology: car != carry (does not match substring in carry)', () => {
    const pkg = canonicalPackage()
    // Passage has "carry" / "carrying" / "carries" and is 130+ words, but never contains the word "car"
    pkg.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'Mia and Alex carry the heavy robot parts across the workshop to the main workbench. They are carrying extra batteries and testing instruments carefully before the regional robotics tournament begins tomorrow morning.' },
      { type: 'paragraph', text: 'The entire team works together after school every Tuesday in Taipei to calibrate each optical sensor and inspect the aluminum chassis. When unexpected circuit problems happen during testing, they record the exact error code, discuss possible solutions calmly with their teacher, and test each component step by step. Everyone agrees that careful preparation and good teamwork help them achieve excellent results in the competition. They check every screw and verify all electrical connections to ensure complete safety. By keeping detailed logs and testing repeatedly, the students build strong confidence for the big tournament match.' },
    ]
    pkg.studentLesson.reading.wordCount = 135
    pkg.studentLesson.vocabulary = [
      {
        id: 'v-car',
        word: 'car',
        partOfSpeech: 'n.',
        meaningZh: '車子',
        pronunciationHint: null,
        exampleEn: 'He drives a car.',
        exampleZh: '他開車。',
        status: 'new',
      },
      ...['workshop', 'team', 'sensor', 'error', 'prepare', 'result', 'tournament'].map((word, i) => ({
        id: `v-${word}`,
        word,
        partOfSpeech: 'n.',
        meaningZh: `意思 ${i}`,
        pronunciationHint: null,
        exampleEn: `Example for ${word}.`,
        exampleZh: `例句 ${i}。`,
        status: 'new' as const,
      })),
    ]

    const report = auditCurriculumPackage(pkg)
    const anchorFinding = report.findings.find((f) => f.dimension === 'lexical-anchor' && f.message.includes('car'))
    expect(anchorFinding).toBeDefined()
    expect(anchorFinding?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })

  it('accepts valid morphological variants: carry is anchored by carries or carrying', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'Mia carries the heavy robot parts across the workshop to the main test table. They are carrying extra batteries and instruments to ensure proper sensor calibration before the big robotics match.' },
      { type: 'paragraph', text: 'The entire team works together after school every Tuesday in Taipei to calibrate each optical sensor and inspect the aluminum chassis. When unexpected circuit problems happen during testing, they record the exact error code, discuss possible solutions calmly with their teacher, and test each component step by step. Everyone agrees that careful preparation and good teamwork help them achieve excellent results in the competition. They check every screw and verify all electrical connections to ensure complete safety. By keeping detailed logs and testing repeatedly, the students build strong confidence for the big tournament match.' },
    ]
    pkg.studentLesson.reading.wordCount = 135
    pkg.studentLesson.vocabulary = [
      {
        id: 'v-carry',
        word: 'carry',
        partOfSpeech: 'v.',
        meaningZh: '攜帶；搬運',
        pronunciationHint: null,
        exampleEn: 'She carries a box.',
        exampleZh: '她搬著一個箱子。',
        status: 'new',
      },
      ...['workshop', 'team', 'sensor', 'error', 'prepare', 'result', 'tournament'].map((word, i) => ({
        id: `v-${word}`,
        word,
        partOfSpeech: 'n.',
        meaningZh: `意思 ${i}`,
        pronunciationHint: null,
        exampleEn: `Example for ${word}.`,
        exampleZh: `例句 ${i}。`,
        status: 'new' as const,
      })),
    ]

    const report = auditCurriculumPackage(pkg)
    const anchorFinding = report.findings.find((f) => f.dimension === 'lexical-anchor' && f.message.includes('carry'))
    expect(anchorFinding).toBeUndefined()
  })

  it('treats an anchored phrase as one lexical unit without flagging its component words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.blocks[0].text += ' The students work together after school.'
    pkg.studentLesson.vocabulary[0] = {
      ...pkg.studentLesson.vocabulary[0],
      id: 'v-work-together',
      word: 'work together',
      partOfSpeech: 'phr.',
      meaningZh: '合作',
      exampleEn: 'The students work together after school.',
      exampleZh: '學生們放學後一起合作。',
    }

    const report = auditCurriculumPackage(pkg)
    expect(report.findings.find((f) => f.dimension === 'lexical-anchor' && f.message.includes('work together'))).toBeUndefined()
    expect(report.findings.find((f) => f.dimension === 'lexical-ceiling' && /work|together/u.test(f.message))).toBeUndefined()
  })

  it('rejects more than three phrase or collocation cards', () => {
    const pkg = canonicalPackage()
    const phrases = ['work together', 'after school', 'take notes', 'find out']
    phrases.forEach((word, index) => {
      pkg.studentLesson.vocabulary[index] = { ...pkg.studentLesson.vocabulary[index], word, partOfSpeech: 'phr.' }
    })

    const report = auditCurriculumPackage(pkg)
    const finding = report.findings.find((f) => f.dimension === 'lexical-unit-mix')
    expect(finding?.severity).toBe('critical')
    expect(report.passed).toBe(false)
  })

  it('flags capitalized advanced non-allowlist words as warning telemetry without hard rejection', () => {
    const pkg = canonicalPackage()
    // Inject capitalized obscure words that are not in the approved vocab, not dialogue speakers, and not interests
    pkg.studentLesson.reading.blocks[0] = {
      type: 'paragraph',
      text: 'Sophisticated Quantum Epistemology Obfuscates our daily robot testing procedures in the workshop today.',
    }
    const report = auditCurriculumPackage(pkg)
    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeDefined()
    expect(lexicalFinding?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })

  it('allows dialogue speakers, child interests, and standard educational proper nouns without warning', () => {
    const pkg = canonicalPackage()
    pkg.learnerSnapshot.specificInterests = ['Minecraft', 'Robotics']
    pkg.studentLesson.reading.genre = 'dialogue'
    pkg.studentLesson.reading.blocks = [
      { type: 'dialogue', speaker: 'Alex', text: 'Hello Mia, let us meet on Monday in Taipei for the robotics exhibition.' },
      { type: 'dialogue', speaker: 'Mia', text: 'Sure Alex, I will bring our Minecraft redstone simulation notes tomorrow.' },
      { type: 'paragraph', text: 'Both Alex and Mia work together every Tuesday after school in Taipei to prepare for their robotics presentation.' },
    ]
    const report = auditCurriculumPackage(pkg)
    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeUndefined()
  })

  it('verifies workload calibration against global sanity bounds (55 / 140 minutes)', () => {
    const pkg = canonicalPackage()
    // Make content valid (12 total items) but minimal workload (all MC, 125 words, 7 vocab -> ~42 minutes)
    pkg.studentLesson.reading.blocks = [
      {
        type: 'paragraph',
        text: 'Mina tests a small robot in the school workshop every Tuesday afternoon. Her partner Jay suggests that we sort each camera result carefully before the final match. They repeat the same test multiple times to compare every reading and check each electrical wire connection carefully. When unexpected sensor errors happen during testing, they record the problem calmly and discuss possible solutions with their teacher step by step. Everyone agrees that careful work and good teamwork produce excellent results for the upcoming tournament competition. By keeping detailed test records, the team learns from every single mistake and builds strong confidence for their next big robotics project.',
      },
      {
        type: 'paragraph',
        text: 'The club members clean the workshop table, charge all spare batteries, and prepare new materials for tomorrow.',
      },
    ]
    pkg.studentLesson.vocabulary = pkg.studentLesson.vocabulary.slice(0, 7)

    for (const stage of pkg.studentLesson.practice) {
      for (const q of stage.questions) {
        q.itemType = 'grammar'
        q.options = ['opt A', 'opt B', 'opt C', 'opt D']
        q.writingLines = 0
      }
    }
    for (const q of pkg.studentLesson.homework.questions) {
      q.itemType = 'grammar'
      q.options = ['opt A', 'opt B', 'opt C', 'opt D']
      q.writingLines = 0
    }

    // 1. Lower global sanity bound (< 55 minutes)
    const reportLow = auditCurriculumPackage(pkg)
    const lowFinding = reportLow.findings.find((f) => f.dimension === 'workload-calibration')
    expect(lowFinding).toBeDefined()
    expect(lowFinding?.severity).toBe('warning')
    expect(lowFinding?.message).toContain('最低安全下限 (55 分鐘)')

    // 2. Upper global sanity bound (> 140 minutes)
    const heavyPkg = canonicalPackage()
    heavyPkg.studentLesson.instruction = [
      heavyPkg.studentLesson.instruction[0],
      { ...heavyPkg.studentLesson.instruction[0], id: 'inst-2', titleZh: '進階語法 2' },
      { ...heavyPkg.studentLesson.instruction[0], id: 'inst-3', titleZh: '進階語法 3' },
    ]

    for (const stage of heavyPkg.studentLesson.practice) {
      stage.questions = Array.from({ length: 6 }, (_, i) => {
        const qId = `${stage.stage.slice(0, 2).toUpperCase()}_Q${i + 1}`
        if (stage.stage === 'cap-transfer' && i === 0) {
          return {
            id: qId,
            targetIds: ['grammar-do-does', 'vocab-experiment', 'reading-inference'],
            itemType: 'inference' as const,
            prompt: 'What does Mina do in the garden?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            writingLines: 0,
            difficulty: 'on-level' as const,
          }
        }
        return {
          id: qId,
          targetIds: ['grammar-do-does', 'vocab-experiment', 'reading-inference'],
          itemType: 'sentence-production' as const,
          prompt: 'Write a full sentence about the garden experiment.',
          writingLines: 4,
          difficulty: 'stretch' as const,
        }
      })
    }

    heavyPkg.studentLesson.homework.questions = Array.from({ length: 6 }, (_, i) => {
      const qId = `HW_Q${i + 1}`
      return {
        id: qId,
        targetIds: ['grammar-do-does', 'vocab-experiment', 'reading-inference'],
        itemType: 'sentence-production' as const,
        prompt: 'Write a full sentence about your plan.',
        writingLines: 4,
        difficulty: 'stretch' as const,
      }
    })

    const allQuestions = [
      ...heavyPkg.studentLesson.practice.flatMap((s: { questions: any[] }) => s.questions),
      ...heavyPkg.studentLesson.homework.questions,
    ]
    heavyPkg.answers = allQuestions.map((q: { id: string }) => ({
      questionId: q.id,
      answer: 'The plants grow well in the sun.',
      acceptedAnswers: ['The plants grow well in the sun.'],
      explanationZh: '依據課文第一段明確說明。',
      likelyMisconceptionZh: null,
      followUpZh: null,
    }))

    const reportHigh = auditCurriculumPackage(heavyPkg)
    const highFinding = reportHigh.findings.find((f) => f.dimension === 'workload-calibration')
    expect(highFinding).toBeDefined()
    expect(highFinding?.severity).toBe('warning')
    expect(highFinding?.message).toContain('最高安全上限 (140 分鐘)')
  })

  it('verifies workload calibration against learner declared weekly budget (±20%)', () => {
    const pkg = canonicalPackage()
    // Canonical package has computed minutes = 69 (within global bounds 55-140)

    // 1. Declared budget = 80 min (±20% range is [64, 96]) -> 69 min is matched, no finding
    const reportMatched = auditCurriculumPackage(pkg, 80)
    const matchedFinding = reportMatched.findings.find((f) => f.dimension === 'workload-calibration')
    expect(matchedFinding).toBeUndefined()

    // 2. Declared budget = 100 min (±20% range is [80, 120]) -> 69 min < 80 min (under-budget warning)
    const reportUnder = auditCurriculumPackage(pkg, 100)
    const underFinding = reportUnder.findings.find((f) => f.dimension === 'workload-calibration')
    expect(underFinding).toBeDefined()
    expect(underFinding?.severity).toBe('warning')
    expect(underFinding?.message).toContain('低於孩子每週設定預算 (100 分鐘 -20% = 80 分鐘)')

    // 3. Declared budget = 50 min (±20% range is [40, 60]) -> 69 min > 60 min (over-budget warning)
    const reportOver = auditCurriculumPackage(pkg, { declaredWeeklyMinutes: 50 })
    const overFinding = reportOver.findings.find((f) => f.dimension === 'workload-calibration')
    expect(overFinding).toBeDefined()
    expect(overFinding?.severity).toBe('warning')
    expect(overFinding?.message).toContain('高於孩子每週設定預算 (50 分鐘 +20% = 60 分鐘)')
  })

  it('validates presence of core evidence organizer task in independent practice stage', () => {
    const pkg = canonicalPackage()
    const independent = pkg.studentLesson.practice.find((s: any) => s.stage === 'independent')
    if (independent) {
      independent.questions = [
        {
          id: 'I1',
          targetIds: ['grammar-do-does', 'vocab-experiment'],
          itemType: 'grammar',
          prompt: 'Choose the correct form.',
          options: ['do', 'does', 'did', 'doing'],
          writingLines: 0,
          difficulty: 'on-level',
        },
      ]
    }
    // Keep answers aligned
    pkg.answers = pkg.answers.filter((a: any) => a.questionId !== 'I2' && a.questionId !== 'I3')
    const report = auditCurriculumPackage(pkg)
    const orgFinding = report.findings.find((f) => f.dimension === 'evidence-organizer')
    expect(orgFinding).toBeDefined()
    expect(orgFinding?.severity).toBe('warning')
  })

  it('treats short but non-blank answer explanations as warning-only', () => {
    const pkg = canonicalPackage()
    pkg.answers[0]!.explanationZh = '見首段。'

    const report = auditCurriculumPackage(pkg)
    const finding = report.findings.find((item) => item.dimension === 'answer-explanation-depth')

    expect(finding?.severity).toBe('warning')
    expect(report.findings.some((item) => item.dimension === 'answer-integrity' && item.severity === 'critical')).toBe(false)
  })

  it('still hard-rejects blank answer explanations through structural validation', () => {
    const pkg = canonicalPackage()
    pkg.answers[0]!.explanationZh = '   '

    const report = auditCurriculumPackage(pkg)

    expect(report.passed).toBe(false)
    expect(report.findings.some((item) => item.tier === 'structural-critical' && item.severity === 'critical')).toBe(true)
  })
})
