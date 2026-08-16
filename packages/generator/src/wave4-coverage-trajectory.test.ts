import { describe, it, expect } from 'vitest'
import {
  createEmptyStudentCurriculumStore,
  recordExposureFromTrackingDelta,
  recordLearnerAssessmentEvidence,
  buildCapCoverageCapsule,
  validateCurriculumPackage,
  auditCurriculumPackage,
  type CurriculumPackage,
} from './index.js'

describe('Wave 4.1: CAP Curriculum Foundation & Long-Term Coverage Trajectory (12 Weeks)', () => {
  it('simulates 12-week coverage progression with diverse communication functions and strict exposure-mastery separation', () => {
    const store = createEmptyStudentCurriculumStore('child-kobe', 7)
    const exercisedCommunicationFunctions = new Set<string>()
    const exercisedGrammarUnits = new Set<string>()
    const exercisedGenres = new Set<string>()

    const sharedLongPassage =
      'The robotics club members meet every Tuesday after school to design, test, and calibrate their autonomous navigation systems. Each student takes responsibility for a specific subsystem, ensuring that all sensors provide accurate distance feedback during the obstacle avoidance challenge. Through consistent trial, data logging, and systematic troubleshooting, the entire team learns to cooperate efficiently under tight project deadlines and achieve outstanding engineering outcomes. When unexpected technical obstacles arise, the teammates discuss alternative solutions patiently, document baseline measurements carefully, and verify each hypothesis before modifying sensitive hardware components or control algorithms. By reflecting on their experimental notes, comparing performance logs, and adjusting their design step by step, they build confidence in their independent scientific reasoning and practical engineering skills.'

    // Weekly simulation parameters
    const weeklyConfigs = [
      { week: 1, commFunc: 'cf-making-requests', grammar: 'g7-be-verbs-pronouns', genre: 'dialogue' as const, result: 'correct' as const },
      { week: 2, commFunc: 'cf-apologizing', grammar: 'g7-present-simple-verbs', genre: 'notice' as const, result: 'correct' as const },
      { week: 3, commFunc: 'cf-asking-giving-directions', grammar: 'g7-do-does-questions', genre: 'instructions' as const, result: 'miss' as const },
      { week: 4, commFunc: 'cf-agreement-disagreement', grammar: 'g7-do-does-questions', genre: 'dialogue' as const, result: 'correct' as const }, // due review priority
      { week: 5, commFunc: 'cf-telephoning', grammar: 'g7-present-continuous', genre: 'dialogue' as const, result: 'correct' as const },
      { week: 6, commFunc: 'cf-invitations', grammar: 'g7-imperatives', genre: 'notice' as const, result: 'correct' as const },
      { week: 7, commFunc: 'cf-suggestions-advice', grammar: 'g7-there-is-are', genre: 'schedule' as const, result: 'correct' as const },
      { week: 8, commFunc: 'cf-shopping-ordering-paying', grammar: 'g7-time-place-prepositions', genre: 'dialogue' as const, result: 'correct' as const },
      { week: 9, commFunc: 'cf-expressing-feelings-opinions', grammar: 'g7-wh-questions', genre: 'mini-report' as const, result: 'correct' as const },
      { week: 10, commFunc: 'cf-describing-problems-troubleshooting', grammar: 'g8-past-simple-verbs', genre: 'dialogue' as const, result: 'correct' as const },
      { week: 11, commFunc: 'cf-checking-understanding-clarification', grammar: 'g8-future-tense', genre: 'dialogue' as const, result: 'correct' as const },
      { week: 12, commFunc: 'cf-talking-about-plans-intentions', grammar: 'g8-modals-obligation-advice', genre: 'schedule' as const, result: 'correct' as const },
    ]

    for (const cfg of weeklyConfigs) {
      const timestamp = new Date(Date.UTC(2026, 7, cfg.week * 7)).toISOString()

      // 1. Build coverage capsule for the current week
      const capsule = buildCapCoverageCapsule(store, { nowIso: timestamp, gradeStage: cfg.week > 9 ? 'grade_8' : 'grade_7' })
      expect(capsule.coverage.vocabulary.exposurePct).toBeGreaterThanOrEqual(0)
      expect(capsule.coverage.grammar.exposurePct).toBeGreaterThanOrEqual(0)

      let blocks: any[]
      if (cfg.genre === 'dialogue') {
        blocks = [
          { type: 'dialogue', speaker: 'Alex', text: 'Could you please check the sensor reading before we proceed with the next experimental trial?' },
          { type: 'dialogue', speaker: 'Mia', text: 'Sure, let me examine the electrical connection right now so that we avoid short circuits.' },
          { type: 'paragraph', text: sharedLongPassage },
        ]
      } else if (cfg.genre === 'notice') {
        blocks = [
          { type: 'notice', heading: 'IMPORTANT ANNOUNCEMENT', text: 'Please ensure all robotic equipment, safety glasses, and battery packs are returned by 5 PM.' },
          { type: 'paragraph', text: sharedLongPassage },
        ]
      } else if (cfg.genre === 'schedule') {
        blocks = [
          { type: 'schedule-row', timeOrStep: 'Step 1', event: 'Calibrate the compass sensor', detail: 'Wait for green status indicator' },
          { type: 'schedule-row', timeOrStep: 'Step 2', event: 'Deploy obstacle detection loop', detail: 'Verify ultrasonic sonar response' },
          { type: 'paragraph', text: sharedLongPassage },
        ]
      } else {
        blocks = [
          { type: 'paragraph', text: 'Here is the comprehensive summary report regarding our weekly engineering deliverables.' },
          { type: 'paragraph', text: sharedLongPassage },
        ]
      }

      // 2. Synthesize weekly package conforming to Schema 2.2.0
      const pkg: CurriculumPackage = {
        metadata: {
          schemaVersion: '2.2.0',
          jobId: `job-kobe-w${cfg.week}`,
          childId: 'child-kobe',
          weekNumber: cfg.week,
          grade: 7,
          gradeStage: cfg.week > 9 ? 'grade_8' : 'grade_7',
          title: `Week ${cfg.week} Autonomous Study: Mission Alpha`,
          generatedAt: timestamp,
          curriculumVersion: '2.2.0',
          promptVersion: '2.4.0',
          rubricVersion: '2.2.0',
          rendererVersion: '2.2.0',
          model: 'production-matrix',
          inputFingerprint: `sha256:kobe-w${cfg.week}`,
        },
        learnerSnapshot: {
          schoolProgress: `Unit ${Math.ceil(cfg.week / 2)}`,
          specificInterests: ['robotics', 'minecraft'],
          changedInterests: [],
          avoid: [],
          recentDifficulty: 'appropriate',
          feedbackSummary: 'Completed smoothly with good focus.',
          recurringMistakes: cfg.week === 4 ? ['g7-do-does-questions'] : [],
          reviewDue: capsule.dueReviewGrammar,
        },
        learningPlan: {
          estimatedMinutes: 90,
          difficultyBand: '國中適中',
          targets: [
            {
              id: `target-grammar-${cfg.grammar}`,
              domain: 'grammar',
              description: `Master target grammar ${cfg.grammar}`,
              evidence: [{ source: 'curriculum', detail: 'Curriculum syllabus pacing.' }],
              successCriteria: 'Correctly inflect in 3 of 4 exercises.',
            },
            {
              id: `target-comm-${cfg.commFunc}`,
              domain: 'communication',
              description: `Practice communicative function ${cfg.commFunc}`,
              evidence: [{ source: 'curriculum', detail: 'CAP 108 curriculum coverage progression.' }],
              successCriteria: 'Recognize and employ standard exponent.',
            },
            {
              id: 'target-reading-skill',
              domain: 'reading',
              description: 'Extract practical evidence from text.',
              evidence: [{ source: 'profile', detail: 'Reading level on-level.' }],
              successCriteria: 'Answer multiple-choice transfer item.',
            },
          ],
          prerequisites: ['Foundational vocab'],
          reviewStrategy: ['Retrieval practice stage next day.'],
          personalizationStrategy: 'Embedded in robotics team collaboration context.',
          exclusions: [],
        },
        studentLesson: {
          opening: {
            goalsZh: ['掌握本週目標文法', '學會實用溝通句型'],
            howToUseZh: '先讀中文任務說明，再循序作答。',
            warmUp: '如果遇到團隊任務，你會如何與夥伴溝通？',
          },
          vocabulary: Array.from({ length: 8 }, (_, i) => ({
            id: `v-w${cfg.week}-${i}`,
            word: `vocabword${cfg.week}${i}`,
            partOfSpeech: 'n.',
            meaningZh: `單字解釋${i}`,
            pronunciationHint: null,
            exampleEn: `This is an example sentence for vocabword${cfg.week}${i}.`,
            exampleZh: `這是例句中文翻譯${i}。`,
            status: 'new' as const,
          })),
          reading: {
            title: `Team Project Brief ${cfg.week}`,
            contextZh: '團隊成員正在討論本週的任務進度與分工。',
            genre: cfg.genre,
            blocks,
            wordCount: 150,
            readingTipsZh: ['注意標記關鍵時間與提示詞。'],
            sourceNote: null,
          },
          instruction: [
            {
              id: `inst-${cfg.grammar}`,
              titleZh: `文法焦點：${cfg.grammar}`,
              explanationZh: '仔細觀察例句中的結構與動詞變化規則。',
              patterns: ['Subject + Verb + Object'],
              workedExamples: [
                { example: 'She works hard every day.', walkthroughZh: '第三人稱單數動詞加 s。' },
                { example: 'Do they like basketball?', walkthroughZh: '疑問句以 Do 開頭。' },
              ],
              commonMistakes: [
                { wrong: 'She work hard.', corrected: 'She works hard.', whyZh: '主詞是單數時動詞要變化。' },
              ],
            },
          ],
          practice: [
            {
              id: 'guided',
              stage: 'guided',
              titleZh: '引導練習',
              instructionsZh: '依照範例完成填空。',
              hintZh: '先看主詞是誰。',
              questions: [
                { id: `q-g1-${cfg.week}`, targetIds: [`target-grammar-${cfg.grammar}`], itemType: 'cloze', prompt: 'Choose correct form.', options: ['A', 'B', 'C', 'D'], writingLines: 0, difficulty: 'supported' },
                { id: `q-g2-${cfg.week}`, targetIds: [`target-comm-${cfg.commFunc}`], itemType: 'short-response', prompt: 'Write one question.', writingLines: 2, difficulty: 'supported' },
              ],
            },
            {
              id: 'independent',
              stage: 'independent',
              titleZh: '獨立練習',
              instructionsZh: '不看提示自主作答。',
              hintZh: null,
              questions: [
                { id: `q-i1-${cfg.week}`, targetIds: [`target-grammar-${cfg.grammar}`], itemType: 'short-response', prompt: 'Complete sentence.', writingLines: 2, difficulty: 'on-level' },
                { id: `q-i2-${cfg.week}`, targetIds: [`target-reading-skill`], itemType: 'short-response', prompt: 'Explain the reason.', writingLines: 2, difficulty: 'on-level' },
              ],
            },
            {
              id: 'cap',
              stage: 'cap-transfer',
              titleZh: '會考轉移',
              instructionsZh: '選出最符合文章推論的選項。',
              hintZh: null,
              questions: [
                { id: `q-c1-${cfg.week}`, targetIds: [`target-reading-skill`], itemType: 'inference', prompt: 'What can be inferred from the text?', options: ['Option A', 'Option B', 'Option C', 'Option D'], writingLines: 0, difficulty: 'stretch' },
                { id: `q-c2-${cfg.week}`, targetIds: [`target-grammar-${cfg.grammar}`], itemType: 'cloze', prompt: 'Choose best grammar option.', options: ['Opt 1', 'Opt 2', 'Opt 3', 'Opt 4'], writingLines: 0, difficulty: 'stretch' },
              ],
            },
            {
              id: 'production',
              stage: 'production',
              titleZh: '情境表達',
              instructionsZh: '運用本週句型寫出完整句子。',
              hintZh: null,
              questions: [
                { id: `q-p1-${cfg.week}`, targetIds: [`target-comm-${cfg.commFunc}`], itemType: 'sentence-production', prompt: 'Write a polite request.', writingLines: 3, difficulty: 'on-level' },
              ],
            },
            {
              id: 'retrieval',
              stage: 'retrieval',
              titleZh: '延遲提取',
              instructionsZh: '隔天完成，回想本週重點。',
              hintZh: null,
              questions: [
                { id: `q-r1-${cfg.week}`, targetIds: [`target-grammar-${cfg.grammar}`], itemType: 'short-response', prompt: 'Recall rule.', writingLines: 2, difficulty: 'on-level' },
                { id: `q-r2-${cfg.week}`, targetIds: [`target-comm-${cfg.commFunc}`], itemType: 'short-response', prompt: 'Recall phrase.', writingLines: 2, difficulty: 'on-level' },
              ],
            },
          ],
          selfCheckZh: ['我能正確運用本週文法。', '我能在對話中禮貌表達。'],
          homework: {
            purposeZh: '鞏固長效記憶。',
            estimatedMinutes: 20,
            questions: [
              { id: `q-h1-${cfg.week}`, targetIds: [`target-grammar-${cfg.grammar}`], itemType: 'short-response', prompt: 'Homework practice 1.', writingLines: 2, difficulty: 'on-level' },
              { id: `q-h2-${cfg.week}`, targetIds: [`target-comm-${cfg.commFunc}`], itemType: 'short-response', prompt: 'Homework practice 2.', writingLines: 2, difficulty: 'on-level' },
              { id: `q-h3-${cfg.week}`, targetIds: [`target-reading-skill`], itemType: 'short-response', prompt: 'Homework practice 3.', writingLines: 2, difficulty: 'on-level' },
            ],
          },
        },
        answers: [
          { questionId: `q-g1-${cfg.week}`, answer: 'A', acceptedAnswers: [], explanationZh: '依據主詞變化。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-g2-${cfg.week}`, answer: 'Could you help?', acceptedAnswers: [], explanationZh: '禮貌請求句型。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-i1-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '根據規則完成。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-i2-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '文本證據。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-c1-${cfg.week}`, answer: 'Option A', acceptedAnswers: [], explanationZh: '因果推論。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-c2-${cfg.week}`, answer: 'Opt 1', acceptedAnswers: [], explanationZh: '時態一致。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-p1-${cfg.week}`, answer: 'Could you please check this?', acceptedAnswers: [], explanationZh: '運用情境句型。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-r1-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '回想規則。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-r2-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '回想句型。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-h1-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '作業核對。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-h2-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '作業核對。', likelyMisconceptionZh: null, followUpZh: null },
          { questionId: `q-h3-${cfg.week}`, answer: 'Sample', acceptedAnswers: [], explanationZh: '作業核對。', likelyMisconceptionZh: null, followUpZh: null },
        ],
        parentSummary: {
          focusZh: `${cfg.grammar} 與 ${cfg.commFunc}`,
          observeZh: ['觀察作答時是否能主動思考。', '確認答案是否回到文本。'],
          completionCheckZh: '確認作答完整即可。',
          personalizationZh: ['依據進度與課綱缺口規劃，結合機器人專案情境。'],
        },
        trackingDelta: {
          introducedVocabularyIds: Array.from({ length: 8 }, (_, i) => `v-w${cfg.week}-${i}`),
          reviewedVocabularyIds: [],
          exposedGrammarTargetIds: [cfg.grammar],
          exposedReadingTargetIds: ['target-reading-skill'],
          exposedCommunicationFunctionIds: [cfg.commFunc],
          hypothesesToVerify: ['學生能正確掌握時態與溝通句型。'],
          nextReviewCandidates: [cfg.grammar, cfg.commFunc],
        },
        qualityEvidence: {
          feedbackApplied: ['持續深化推論題型與情境多樣性。'],
          improvementComparedToPrevious: ['本週教材自然融入溝通功能與結構化閱讀區塊。'],
          criticalChecks: [{ id: 'self-study', passed: true, evidence: '包含完整中文說明與 worked examples。' }],
          criticFindings: [],
        },
      }

      // 3. Validate package
      const valResult = validateCurriculumPackage(pkg)
      if (!valResult.success) {
        console.error('Validation failure issues:', JSON.stringify(valResult.issues, null, 2))
      }
      expect(valResult.success).toBe(true)

      const auditResult = auditCurriculumPackage(pkg)
      expect(auditResult.passed).toBe(true)

      // 4. Update long-term store (Exposure from trackingDelta)
      recordExposureFromTrackingDelta(store, pkg.trackingDelta, timestamp)

      // 5. Update mastery evidence only from learner assessment results
      recordLearnerAssessmentEvidence(store, 'grammar', cfg.grammar, cfg.result, timestamp)
      recordLearnerAssessmentEvidence(store, 'communication', cfg.commFunc, cfg.result, timestamp)

      // Provide second assessment for previous functions to test graduation to 'mastered'
      if (cfg.week >= 7) {
        const earlierFunc = weeklyConfigs[cfg.week - 7]?.commFunc
        if (earlierFunc) {
          recordLearnerAssessmentEvidence(store, 'communication', earlierFunc, 'correct', timestamp)
        }
      }

      // Track exercised signals
      exercisedCommunicationFunctions.add(cfg.commFunc)
      exercisedGrammarUnits.add(cfg.grammar)
      exercisedGenres.add(cfg.genre)
    }

    // Trajectory Invariants Verification over 12 Weeks:
    // 1. Diverse communication functions exercised
    expect(exercisedCommunicationFunctions.size).toBe(12)
    // 2. Multi-genre reading coverage (dialogue, notice, instructions, schedule, mini-report)
    expect(exercisedGenres.size).toBeGreaterThanOrEqual(4)
    // 3. Grammar progression across G7 & G8
    expect(exercisedGrammarUnits.size).toBeGreaterThanOrEqual(10)

    // 4. Dual-metric coverage check after 12 weeks: exposure vs mastery evidence
    const finalCapsule = buildCapCoverageCapsule(store, { nowIso: '2026-11-01T00:00:00.000Z' })
    expect(finalCapsule.coverage.communication.exposurePct).toBeGreaterThanOrEqual(70)
    expect(finalCapsule.coverage.grammar.exposurePct).toBeGreaterThanOrEqual(40)
    expect(finalCapsule.coverage.communication.masteryEvidencePct).toBeGreaterThanOrEqual(30)
    // Confirm exposure is strictly higher than verified mastery
    expect(finalCapsule.coverage.communication.exposurePct).toBeGreaterThan(finalCapsule.coverage.communication.masteryEvidencePct)
  })
})
