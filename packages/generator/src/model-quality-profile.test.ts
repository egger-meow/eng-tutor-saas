import { describe, expect, it } from 'vitest'
import {
  applyModelQualityProfile,
  cleanOptionPrefix,
  computeDeterministicPlanMinutes,
  evaluateWorkloadFit,
  normalizeCurriculumPackage,
  resolveQualityProfile,
  upgradeV20ToV21,
  upgradeV21ToV22,
  type CurriculumPackage,
  type CurriculumPackageV20,
  type CurriculumQuestion,
} from './index.js'

function buildSampleCanonicalPackage(): CurriculumPackage {
  const paragraphs = [
    'Mina joins a school robotics club because she wants to build a machine that can sort books. The first design moves quickly, but its small camera often mistakes blue covers for green ones during the test.',
    'Her partner Jay suggests changing every part at once. Mina disagrees. She records one problem, changes the light above the camera, and repeats the same test. This time the robot sorts most of the books correctly.',
    'The team still finds two mistakes. Instead of calling the test a failure, they compare both test records. They discover that bright light from the window enters the camera. Their next goal is to design a simple cover for the camera.',
    'Mina learns that careful improvement is not about making quick changes. A useful test keeps most conditions the same, examines clear evidence, and changes one important step. The robot improves because the team learns from each result.',
  ]

  const question = (
    id: string,
    itemType: CurriculumQuestion['itemType'] = 'short-response',
    options?: string[],
  ): CurriculumQuestion => ({
    id,
    targetIds: ['reading-inference', 'grammar-do-does', 'vocab-experiment'],
    itemType,
    prompt: `請根據文章回答第 ${id} 題。`,
    options: itemType === 'inference' || options ? (options ?? ['選項 A', '選項 B', '選項 C', '選項 D']) : undefined,
    writingLines: itemType === 'inference' || options ? 0 : 2,
    difficulty: 'on-level',
  })

  const practice: CurriculumPackage['studentLesson']['practice'] = [
    {
      id: 'guided-reading',
      stage: 'guided',
      titleZh: '跟著線索讀',
      instructionsZh: '先圈出文章中的證據。',
      hintZh: '答案在第二段。',
      questions: [question('G1'), question('G2'), question('G3')],
    },
    {
      id: 'independent-reading',
      stage: 'independent',
      titleZh: '自己試試看',
      instructionsZh: '不看提示完成。',
      hintZh: null,
      questions: [question('I1'), question('I2'), question('I3')],
    },
    {
      id: 'cap-reading',
      stage: 'cap-transfer',
      titleZh: '會考型閱讀',
      instructionsZh: '比較四個選項。',
      hintZh: null,
      questions: [question('C1', 'inference'), question('C2', 'inference'), question('C3', 'inference')],
    },
    {
      id: 'production',
      stage: 'production',
      titleZh: '寫出你的想法',
      instructionsZh: '使用本週句型。',
      hintZh: null,
      questions: [question('P1', 'sentence-production')],
    },
    {
      id: 'retrieval',
      stage: 'retrieval',
      titleZh: '延遲提取',
      instructionsZh: '隔天完成提取練習。',
      hintZh: null,
      questions: [question('R1')],
    },
  ]

  const homeworkQuestions = [question('H1'), question('H2'), question('H3')]
  const allQuestions = [...practice.flatMap((section) => section.questions), ...homeworkQuestions]

  const v20: CurriculumPackageV20 = {
    metadata: {
      schemaVersion: '2.0.0',
      jobId: 'job-profile-test',
      childId: 'child-profile-test',
      weekNumber: 2,
      grade: 7,
      gradeStage: 'grade_7',
      title: '讓機器人從錯誤中學習',
      generatedAt: '2026-08-18T00:00:00.000Z',
      curriculumVersion: 'curriculum/2.2.0',
      promptVersion: 'prompt/2.4.0',
      rubricVersion: 'rubric/2.2.0',
      rendererVersion: 'renderer/2.2.0',
      model: 'gemini-3.7-flash',
      inputFingerprint: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    learnerSnapshot: {
      schoolProgress: '現在進行式',
      specificInterests: ['機器人'],
      changedInterests: [],
      avoid: [],
      recentDifficulty: 'appropriate',
      feedbackSummary: '上週進度良好。',
      recurringMistakes: ['do / does'],
      reviewDue: ['present simple questions'],
    },
    learningPlan: {
      estimatedMinutes: 90,
      difficultyBand: '國一適中',
      targets: [
        {
          id: 'reading-inference',
          domain: 'reading',
          description: '根據前後因果推論。',
          evidence: [{ source: 'feedback', detail: '練習推論題。' }],
          successCriteria: '能指出證據並選出合理推論。',
        },
        {
          id: 'grammar-do-does',
          domain: 'grammar',
          description: '正確使用 do 與 does。',
          evidence: [{ source: 'grammar', detail: '近期重複答錯。' }],
          successCriteria: '四題至少答對三題。',
        },
        {
          id: 'vocab-experiment',
          domain: 'vocabulary',
          description: '在語境使用核心單字。',
          evidence: [{ source: 'curriculum', detail: '銜接學校進度。' }],
          successCriteria: '能理解並造句。',
        },
      ],
      prerequisites: ['一般現在式肯定句'],
      reviewStrategy: ['do / does 間隔複習'],
      personalizationStrategy: '以具體機器人實驗承載推論練習，不降低語言難度。',
      exclusions: [],
    },
    studentLesson: {
      opening: {
        goalsZh: ['讀懂實驗改進的因果', '用證據回答推論題'],
        howToUseZh: '先讀中文任務，再讀英文；不懂的字先看單字區。',
        warmUp: '如果機器人一直認錯顏色，你會先改哪一件事？',
      },
      vocabulary: ['robotics', 'partner', 'suggest', 'sort', 'camera', 'repeat', 'result'].map((word, index) => ({
        id: `vocab-${index}`,
        word,
        partOfSpeech: 'n.',
        meaningZh: `意思 ${index}`,
        pronunciationHint: null,
        exampleEn: `This is example for ${word}.`,
        exampleZh: `這是例句 ${index}。`,
        status: index === 0 ? 'repeated-miss' : 'new',
      })),
      reading: {
        title: 'One Change at a Time',
        contextZh: 'Mina 的機器人遇到辨識問題。閱讀時注意每次改變與結果。',
        paragraphs,
        wordCount: paragraphs.join(' ').split(/\s+/u).length,
        readingTipsZh: ['看到 because、this time 時，標出原因與結果。'],
        sourceNote: null,
      },
      instruction: [
        {
          id: 'instruction-do-does',
          titleZh: 'do / does 問句',
          explanationZh: '主詞是 he、she、it 時用 does，後面的動詞回到原形。',
          patterns: ['Does + he/she/it + 原形動詞?'],
          workedExamples: [
            {
              example: 'Does Mina record the result?',
              walkthroughZh: 'Mina 是第三人稱單數，所以用 does；record 不加 s。',
            },
            {
              example: 'Do the students compare the tests?',
              walkthroughZh: 'students 是複數，所以用 do。',
            },
          ],
          commonMistakes: [
            {
              wrong: 'Does Mina records it?',
              corrected: 'Does Mina record it?',
              whyZh: 'does 已經表示第三人稱，動詞用原形。',
            },
          ],
        },
      ],
      practice,
      selfCheckZh: ['我能為答案圈出文章證據。', '我記得 does 後面用原形動詞。'],
      homework: {
        purposeZh: '隔一天再提取本週重點。',
        estimatedMinutes: 20,
        questions: homeworkQuestions,
      },
    },
    answers: allQuestions.map((item) => ({
      questionId: item.id,
      answer: '示範答案',
      acceptedAnswers: [],
      explanationZh: '答案必須引用文章中的線索並有因果說明。',
      likelyMisconceptionZh: null,
      followUpZh: null,
    })),
    parentSummary: {
      focusZh: '推論證據與 do / does',
      observeZh: ['是否能自己指出證據'],
      completionCheckZh: '確認每一題都有作答即可。',
      personalizationZh: ['以孩子感興趣的機器人為主題，結合推論與文法重點練習。'],
    },
    trackingDelta: {
      introducedVocabularyIds: Array.from({ length: 7 }, (_, index) => `vocab-${index}`),
      reviewedVocabularyIds: [],
      grammarTargets: ['grammar-do-does'],
      readingTargets: ['reading-inference'],
      hypothesesToVerify: ['提高閱讀難度後仍能在時間內完成'],
      nextReviewCandidates: ['do / does'],
    },
    qualityEvidence: {
      feedbackApplied: ['提升閱讀篇幅與推論深度', '加入完整中文解說'],
      improvementComparedToPrevious: ['本週加入中文策略示範，並將推論題改為有證據可回查的 CAP 題型。'],
      criticalChecks: [{ id: 'self-study', passed: true, evidence: '每個新概念均有中文解說與 worked examples。' }],
      criticFindings: [],
    },
  }

  const v21 = upgradeV20ToV21(v20)
  return upgradeV21ToV22(v21)
}

describe('Model-Specific Pre-Submit Quality Profiles', () => {
  describe('Profile Resolution & Fallback', () => {
    it('resolves exact model gemini-3.7-flash without fallback', async () => {
      const profile = await resolveQualityProfile('gemini-3.7-flash')
      expect(profile.name).toBe('gemini-3.7-flash')
      expect(profile.version).toBe('1.1.0')
      expect(profile.isFallback).toBe(false)
      expect(profile.activeRules.length).toBe(5)
      expect(profile.activeRules.map((r) => r.id)).toEqual([
        'gemini-nat-01',
        'gemini-gram-02',
        'gemini-zh-03',
        'gemini-exp-04',
        'gemini-entail-05',
      ])
    })

    it('resolves provider-prefixed model identifier "models/gemini-3.7-flash"', async () => {
      const profile = await resolveQualityProfile('models/gemini-3.7-flash')
      expect(profile.name).toBe('gemini-3.7-flash')
      expect(profile.isFallback).toBe(false)
    })

    it('resolves pattern alias "gemini-2.5-flash" to gemini profile', async () => {
      const profile = await resolveQualityProfile('gemini-2.5-flash')
      expect(profile.name).toBe('gemini-3.7-flash')
      expect(profile.isFallback).toBe(false)
    })

    it('gracefully falls back to default.md for unknown model', async () => {
      const profile = await resolveQualityProfile('unknown-future-model-v99')
      expect(profile.name).toBe('default')
      expect(profile.isFallback).toBe(true)
      expect(profile.activeRules.length).toBe(0)
    })

    it('gracefully falls back to default.md when model is undefined', async () => {
      const profile = await resolveQualityProfile(undefined)
      expect(profile.name).toBe('default')
      expect(profile.isFallback).toBe(true)
    })

    it('separates active rules from human-maintained observations in gemini-3.7-flash profile', async () => {
      const profile = await resolveQualityProfile('gemini-3.7-flash')
      expect(profile.activeRules.length).toBe(5)
      expect(profile.observations).toEqual([])
    })
  })

  describe('Pre-Submit Critic & Surgical Repair Layer', () => {
    it('achieves zero behavior change when profile is default (empty active rules)', async () => {
      const canonical = buildSampleCanonicalPackage()
      canonical.metadata.model = 'gpt-4o' // unmapped model -> defaults

      const beforeJson = JSON.stringify(canonical)
      const result = await applyModelQualityProfile(canonical)

      expect(result.success).toBe(true)
      expect(result.provenance?.actualModel).toBe('gpt-4o')
      expect(result.provenance?.resolvedQualityProfile).toBe('default')
      expect(result.provenance?.qualityProfileVersion).toBe('1.0.0')
      expect(result.provenance?.isFallback).toBe(true)
      expect(result.provenance?.activeRulesCount).toBe(0)
      expect(result.provenance?.repairedFields).toEqual([])

      // Verify all pedagogical structures are identical
      const after = result.curriculumPackage!
      expect(after.learningPlan.targets).toEqual(canonical.learningPlan.targets)
      expect(after.studentLesson.reading.blocks).toEqual(canonical.studentLesson.reading.blocks)
      expect(after.studentLesson.vocabulary).toEqual(canonical.studentLesson.vocabulary)
      expect(after.metadata.inputFingerprint).toBe(canonical.metadata.inputFingerprint)
    })

    it('records model quality profile provenance in qualityEvidence.criticalChecks', async () => {
      const canonical = buildSampleCanonicalPackage()
      canonical.metadata.model = 'gemini-3.7-flash'

      const result = await applyModelQualityProfile(canonical)

      expect(result.success).toBe(true)
      expect(result.provenance?.actualModel).toBe('gemini-3.7-flash')
      expect(result.provenance?.resolvedQualityProfile).toBe('gemini-3.7-flash')
      expect(result.provenance?.qualityProfileVersion).toBe('1.1.0')
      expect(result.provenance?.profileName).toBe('gemini-3.7-flash')
      expect(result.provenance?.profileVersion).toBe('1.1.0')
      expect(result.provenance?.isFallback).toBe(false)
      expect(result.provenance?.appliedRules).toEqual([
        'gemini-nat-01',
        'gemini-gram-02',
        'gemini-zh-03',
        'gemini-exp-04',
        'gemini-entail-05',
      ])

      const check = result.curriculumPackage!.qualityEvidence.criticalChecks.find(
        (c) => c.id === 'model-quality-profile',
      )
      expect(check).toBeDefined()
      expect(check?.passed).toBe(true)
      expect(check?.evidence).toContain('actualModel=gemini-3.7-flash')
      expect(check?.evidence).toContain('resolvedQualityProfile=gemini-3.7-flash')
      expect(check?.evidence).toContain('qualityProfileVersion=1.1.0')
    })

    it('surgically repairs Chinese terminology artifacts (初中 -> 國中) while strictly preserving IDs and structure', async () => {
      const canonical = buildSampleCanonicalPackage()
      canonical.studentLesson.opening.howToUseZh = '先讀初中任務說明，再讀英文。'
      canonical.studentLesson.vocabulary[0]!.meaningZh = '初中機器人'
      canonical.studentLesson.instruction[0]!.explanationZh = '這是在初中常見的句型。'

      const originalTargetIds = canonical.learningPlan.targets.map((t) => t.id)
      const originalFingerprint = canonical.metadata.inputFingerprint

      const result = await applyModelQualityProfile(canonical, { modelName: 'gemini-3.7-flash' })

      expect(result.success).toBe(true)
      const repaired = result.curriculumPackage!

      expect(repaired.studentLesson.opening.howToUseZh).toBe('先讀國中任務說明，再讀英文。')
      expect(repaired.studentLesson.vocabulary[0]!.meaningZh).toBe('國中機器人')
      expect(repaired.studentLesson.instruction[0]!.explanationZh).toBe('這是在國中常見的句型。')

      expect(repaired.learningPlan.targets.map((t) => t.id)).toEqual(originalTargetIds)
      expect(repaired.metadata.inputFingerprint).toBe(originalFingerprint)
      expect(result.provenance?.repairedFields).toContain('studentLesson.opening.howToUseZh')
    })

    it('deterministically strips (A) A) option duplicate prefixes during normalization and pre-submit', async () => {
      const canonical = buildSampleCanonicalPackage()
      // Inject duplicate option prefixes
      canonical.studentLesson.practice[2]!.questions[0]!.options = [
        '(A) Option one text',
        'B) Option two text',
        '(C) Option three text',
        'D. Option four text',
      ]

      const normalized = normalizeCurriculumPackage(canonical) as CurriculumPackage
      expect(normalized.studentLesson.practice[2]!.questions[0]!.options).toEqual([
        'Option one text',
        'Option two text',
        'Option three text',
        'Option four text',
      ])

      const result = await applyModelQualityProfile(canonical)
      expect(result.success).toBe(true)
      expect(result.curriculumPackage!.studentLesson.practice[2]!.questions[0]!.options).toEqual([
        'Option one text',
        'Option two text',
        'Option three text',
        'Option four text',
      ])
    })

    it('cleanOptionPrefix helper strips standard option prefixes', () => {
      expect(cleanOptionPrefix('(A) The boy is running')).toBe('The boy is running')
      expect(cleanOptionPrefix('A) The boy is running')).toBe('The boy is running')
      expect(cleanOptionPrefix('A. The boy is running')).toBe('The boy is running')
      expect(cleanOptionPrefix('[B] In the classroom')).toBe('In the classroom')
      expect(cleanOptionPrefix('(d) Final option')).toBe('Final option')
      expect(cleanOptionPrefix('Regular sentence without prefix')).toBe('Regular sentence without prefix')
    })

    it('fails closed when input package fails schema validation', async () => {
      const invalid = { metadata: { schemaVersion: '2.2.0' } }
      const result = await applyModelQualityProfile(invalid)

      expect(result.success).toBe(false)
      expect(result.issues?.length).toBeGreaterThan(0)
    })

    it('fails closed when a surgical repair hook corrupts inputFingerprint', async () => {
      const canonical = buildSampleCanonicalPackage()

      const result = await applyModelQualityProfile(canonical, {
        modelName: 'gemini-3.7-flash',
        surgicalRepairHook: (pkg) => {
          pkg.metadata.inputFingerprint = 'sha256:corrupted_fingerprint'
          return pkg
        },
      })

      expect(result.success).toBe(false)
      expect(result.issues?.[0]?.message).toContain('mutated inputFingerprint')
    })

    it('fails closed when a surgical repair hook alters target IDs', async () => {
      const canonical = buildSampleCanonicalPackage()

      const result = await applyModelQualityProfile(canonical, {
        modelName: 'gemini-3.7-flash',
        surgicalRepairHook: (pkg) => {
          pkg.learningPlan.targets[0]!.id = 'mutated-target-id'
          return pkg
        },
      })

      expect(result.success).toBe(false)
      expect(result.issues?.[0]?.message).toContain('corrupted learning targets')
    })

    it('repairs an underfilled workload surgically while preserving grounding and unaffected content', async () => {
      const canonical = buildSampleCanonicalPackage()
      const originalReading = structuredClone(canonical.studentLesson.reading)
      const originalGrounding = 'grounding' in canonical ? structuredClone(canonical.grounding) : undefined
      const originalQuestion = structuredClone(canonical.studentLesson.practice[1]!.questions[0]!)

      const result = await applyModelQualityProfile(canonical, {
        targetMinutes: 100,
        surgicalRepairHook: (pkg, _profile, findings) => {
          expect(findings.some((finding) => finding.message.includes('BUDGET_UNDERFILLED'))).toBe(true)
          let index = 0
          while (evaluateWorkloadFit(100, computeDeterministicPlanMinutes(pkg)).code === 'BUDGET_UNDERFILLED') {
            const questionId = `budget-extension-${index++}`
            pkg.studentLesson.practice[1]!.questions.push({
              id: questionId,
              targetIds: ['reading-inference', 'vocab-experiment'],
              itemType: 'short-response',
              prompt: 'Use one taught vocabulary word and cite one detail from the reading to explain Mina’s decision.',
              writingLines: 6,
              difficulty: 'on-level',
            })
            pkg.answers.push({
              questionId,
              answer: 'Mina changes one condition because the test evidence shows where the robot makes mistakes.',
              acceptedAnswers: [],
              explanationZh: '答案必須使用本週詞彙，並引用閱讀中的具體證據。',
              likelyMisconceptionZh: null,
              followUpZh: null,
            })
          }
          return pkg
        },
      })

      expect(result.success).toBe(true)
      expect(result.curriculumPackage!.studentLesson.reading).toEqual(originalReading)
      if (originalGrounding && 'grounding' in result.curriculumPackage!) {
        expect(result.curriculumPackage.grounding).toEqual(originalGrounding)
      }
      expect(result.curriculumPackage!.studentLesson.practice[1]!.questions[0]).toEqual(originalQuestion)
      expect(evaluateWorkloadFit(100, result.curriculumPackage!.learningPlan.estimatedMinutes).code).toBe('BUDGET_ALIGNED')
    })

    it('rejects workload repair that deletes an existing required curriculum stage', async () => {
      const canonical = buildSampleCanonicalPackage()
      const result = await applyModelQualityProfile(canonical, {
        targetMinutes: 100,
        surgicalRepairHook: (pkg) => {
          pkg.studentLesson.practice = pkg.studentLesson.practice.filter((section) => section.stage !== 'retrieval')
          return pkg
        },
      })

      expect(result.success).toBe(false)
      expect(result.issues?.[0]?.message).toContain('deleted a required curriculum stage')
    })

    it('trims only low-value redundant work from an overfilled package and preserves required stages', async () => {
      const canonical = buildSampleCanonicalPackage()
      const originalReading = structuredClone(canonical.studentLesson.reading)
      const originalStages = canonical.studentLesson.practice.map((section) => section.stage)
      const section = canonical.studentLesson.practice[1]!
      for (let index = 0; index < 8; index += 1) {
        const questionId = `budget-redundant-${index}`
        section.questions.push({
          id: questionId,
          targetIds: ['reading-inference'],
          itemType: 'short-response',
          prompt: 'Repeat the same evidence sentence.',
          writingLines: 2,
          difficulty: 'on-level',
        })
        canonical.answers.push({
          questionId,
          answer: 'The same evidence sentence.',
          acceptedAnswers: [],
          explanationZh: '這是可刪除的重複練習，不是必要教學階段。',
          likelyMisconceptionZh: null,
          followUpZh: null,
        })
      }
      const beforeMinutes = computeDeterministicPlanMinutes(canonical)

      const result = await applyModelQualityProfile(canonical, {
        targetMinutes: 70,
        surgicalRepairHook: (pkg, _profile, findings) => {
          expect(findings.some((finding) => finding.message.includes('BUDGET_OVERFILLED'))).toBe(true)
          const independent = pkg.studentLesson.practice.find((item) => item.stage === 'independent')!
          while (evaluateWorkloadFit(70, computeDeterministicPlanMinutes(pkg)).code === 'BUDGET_OVERFILLED') {
            const index = independent.questions.findIndex((question) => question.id.startsWith('budget-redundant-'))
            if (index < 0) break
            const [removed] = independent.questions.splice(index, 1)
            pkg.answers = pkg.answers.filter((answer) => answer.questionId !== removed!.id)
          }
          return pkg
        },
      })

      expect(result.success).toBe(true)
      expect(result.curriculumPackage!.learningPlan.estimatedMinutes).toBeLessThan(beforeMinutes)
      expect(result.curriculumPackage!.studentLesson.reading).toEqual(originalReading)
      expect(result.curriculumPackage!.studentLesson.practice.map((item) => item.stage)).toEqual(originalStages)
      expect(evaluateWorkloadFit(70, result.curriculumPackage!.learningPlan.estimatedMinutes).code).toBe('BUDGET_ALIGNED')
    })
  })
})
