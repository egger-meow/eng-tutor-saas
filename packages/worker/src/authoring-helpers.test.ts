import { describe, expect, it, vi } from 'vitest'
import {
  checkActiveLeaseState,
  claimProductionBatch,
  validatePreSubmitPackage,
  submitProductionPackage,
  releaseUnsubmittedClaim,
} from './authoring-helpers.js'
import type { WorkerClient } from './pipeline.js'

function makeMockContext(overrides: Record<string, unknown> = {}) {
  return {
    job: {
      id: '01234567-89ab-cdef-0123-456789abcdef',
      childId: 'fedcba98-7654-3210-fedc-ba9876543210',
      materialWeek: '2026-09-02',
    },
    profile: {
      weekly_minutes: 120,
    },
    inputFingerprint: 'fp-1234567890abcdef',
    ...overrides,
  }
}

describe('checkActiveLeaseState', () => {
  it('detects when no active leases exist', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        if (name === 'worker_get_active_generation_leases') {
          return { data: [], error: null }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    const state = await checkActiveLeaseState(client, 'worker-me')
    expect(state.hasActiveClaim).toBe(false)
    expect(state.canClaim).toBe(true)
    expect(state.claimedBy).toBeNull()
  })

  it('detects when an active lease is held by another worker', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        if (name === 'worker_get_active_generation_leases') {
          return {
            data: [
              {
                id: '01234567-89ab-cdef-0123-456789abcdef',
                claimed_by: 'other-worker',
                lease_expires_at: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
            error: null,
          }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    const state = await checkActiveLeaseState(client, 'worker-me')
    expect(state.hasActiveClaim).toBe(true)
    expect(state.canClaim).toBe(false)
    expect(state.isOwnedByCaller).toBe(false)
    expect(state.claimedBy).toBe('other-worker')
  })

  it('detects when an active lease is owned by the current caller', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        if (name === 'worker_get_active_generation_leases') {
          return {
            data: [
              {
                id: '01234567-89ab-cdef-0123-456789abcdef',
                claimed_by: 'worker-me',
                lease_expires_at: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
            error: null,
          }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    const state = await checkActiveLeaseState(client, 'worker-me')
    expect(state.hasActiveClaim).toBe(true)
    expect(state.canClaim).toBe(false)
    expect(state.isOwnedByCaller).toBe(true)
    expect(state.claimedBy).toBe('worker-me')
  })

  it('fails closed and blocks claim if lease RPC returns an error', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async () => {
        return { data: null, error: { message: 'database connection error' } }
      }),
      storage: { from: vi.fn() as any },
    }

    const state = await checkActiveLeaseState(client, 'worker-me')
    expect(state.hasActiveClaim).toBe(true)
    expect(state.canClaim).toBe(false)
    expect(state.isOwnedByCaller).toBe(false)
    expect(state.message).toContain('fail-closed')
  })
})

describe('claimProductionBatch safety', () => {
  it('refuses to claim if another worker holds an active lease', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        if (name === 'worker_get_active_generation_leases') {
          return {
            data: [
              {
                id: 'job-1',
                claimed_by: 'active-other-worker',
                lease_expires_at: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
            error: null,
          }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    await expect(claimProductionBatch(client, 'worker-me')).rejects.toThrow(
      'ACTIVE_LEASE_EXISTS: Active lease held by active-other-worker',
    )
  })

  it('claims cleanly when no active lease exists', async () => {
    const rpcCalls: string[] = []
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        rpcCalls.push(name)
        if (name === 'worker_get_active_generation_leases') {
          return { data: [], error: null }
        }
        if (name === 'worker_claim_local_authoring_batch') {
          return {
            data: {
              bridgeVersion: '1.4.0',
              claimed: [{ job: { id: 'job-1', childId: 'child-1' }, inputFingerprint: 'fp-1' }],
              claimedCount: 1,
              normalCapacity: 15,
              mandatoryCapacityOverride: false,
              oldestOutstandingDeadline: null,
            },
            error: null,
          }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    const result = await claimProductionBatch(client, 'worker-me')
    expect(result.source).toBe('new_claim')
    expect(result.claimedCount).toBe(1)
    expect(rpcCalls).toEqual(['worker_get_active_generation_leases', 'worker_claim_local_authoring_batch'])
  })
})

import {
  upgradeV20ToV21,
  upgradeV21ToV22,
  upgradeV23ToV24,
  makeGroundedCurriculumPackage,
  capRuntimeMetadata,
  type CurriculumPackageV20,
} from '@paper-english/generator'

function makeValidV24Package(jobId: string, childId: string, fingerprint: string) {
  const paragraphs = [
    'Mina joins a school robotics club because she wants to build a machine that can sort books. The first design moves quickly, but its small camera often mistakes blue covers for green ones during the test.',
    'Her partner Jay suggests changing every part at once. Mina disagrees. She records one problem, changes the light above the camera, and repeats the same test. This time the robot sorts most of the books correctly.',
    'The team still finds two mistakes. Instead of calling the test a failure, they compare both test records. They discover that bright light from the window enters the camera. Their next goal is to design a simple cover for the camera.',
    'Mina learns that careful improvement is not about making quick changes. A useful test keeps most conditions the same, examines clear evidence, and changes one important step. The robot improves because the team learns from each result.',
  ]
  const question = (id: string, itemType = 'short-response') => ({
    id,
    targetIds: ['reading-inference', 'grammar-do-does', 'vocab-experiment'],
    itemType,
    prompt: `請根據文章回答第 ${id} 題。`,
    options: itemType === 'inference' ? ['選項 A', '選項 B', '選項 C', '選項 D'] : undefined,
    writingLines: itemType === 'inference' ? 0 : 2,
    difficulty: 'on-level',
  })
  const practice = [
    { id: 'guided-reading', stage: 'guided', titleZh: '跟著線索讀', instructionsZh: '先圈出文章中的證據。', hintZh: '答案在第二段。', questions: [question('G1'), question('G2'), question('G3')] },
    { id: 'independent-reading', stage: 'independent', titleZh: '自己試試看', instructionsZh: '不看提示完成。', hintZh: null, questions: [question('I1'), question('I2'), question('I3')] },
    { id: 'cap-reading', stage: 'cap-transfer', titleZh: '會考型閱讀', instructionsZh: '比較四個選項。', hintZh: null, questions: [question('C1', 'inference'), question('C2', 'inference'), question('C3', 'inference')] },
    { id: 'production', stage: 'production', titleZh: '寫出你的想法', instructionsZh: '使用本週句型。', hintZh: null, questions: [question('P1', 'sentence-production')] },
    { id: 'retrieval', stage: 'retrieval', titleZh: '延遲提取', instructionsZh: '隔天完成提取練習。', hintZh: null, questions: [question('R1')] },
  ]
  const homeworkQuestions = [question('H1'), question('H2'), question('H3')]
  const allQuestions = [...practice.flatMap((section) => section.questions), ...homeworkQuestions]
  const v20: CurriculumPackageV20 = {
    metadata: { schemaVersion: '2.0.0', jobId, childId, weekNumber: 2, grade: 7, gradeStage: 'grade_7', title: '讓機器人從錯誤中學習', generatedAt: '2026-08-12T00:00:00.000Z', curriculumVersion: 'curriculum/2.0.0', promptVersion: 'prompt/2.0.0', rubricVersion: 'rubric/2.0.0', rendererVersion: 'renderer/2.0.0', model: 'scheduled-worker', inputFingerprint: fingerprint },
    learnerSnapshot: { schoolProgress: '現在進行式', specificInterests: ['機器人'], changedInterests: [], avoid: [], recentDifficulty: 'too-easy', feedbackSummary: '上週太簡單且中文解說不足。', recurringMistakes: ['do / does'], reviewDue: ['present simple questions'] },
    learningPlan: { estimatedMinutes: 120, difficultyBand: '國一適中', targets: [{ id: 'reading-inference', domain: 'reading', description: '根據前後因果推論。', evidence: [{ source: 'feedback', detail: '上週閱讀太簡單。' }], successCriteria: '能指出證據並選出合理推論。' }, { id: 'grammar-do-does', domain: 'grammar', description: '正確使用 do 與 does。', evidence: [{ source: 'grammar', detail: '近期重複答錯。' }], successCriteria: '四題至少答對三題。' }, { id: 'vocab-experiment', domain: 'vocabulary', description: '在語境使用核心單字。', evidence: [{ source: 'curriculum', detail: '銜接學校進度。' }], successCriteria: '能理解並造句。' }], prerequisites: ['一般現在式肯定句'], reviewStrategy: ['do / does 間隔複習'], personalizationStrategy: '以具體機器人實驗承載推論練習，不降低語言難度。', exclusions: [] },
    studentLesson: {
      opening: { goalsZh: ['讀懂實驗改進的因果', '用證據回答推論題'], howToUseZh: '先讀中文任務，再讀英文；不懂的字先看單字區。', warmUp: '如果機器人一直認錯顏色，你會先改哪一件事？' },
      vocabulary: ['robotics', 'partner', 'suggest', 'sort', 'camera', 'repeat', 'result'].map((word, index) => ({ id: `vocab-${index}`, word, partOfSpeech: 'n.', meaningZh: `意思 ${index}`, pronunciationHint: null, exampleEn: `This is example for ${word}.`, exampleZh: `這是例句 ${index}。`, status: index === 0 ? 'repeated-miss' : 'new' })),
      reading: { title: 'One Change at a Time', contextZh: 'Mina 的機器人遇到辨識問題。閱讀時注意每次改變與結果。', paragraphs, wordCount: paragraphs.join(' ').split(/\s+/u).length, readingTipsZh: ['看到 because、this time 時，標出原因與結果。'], sourceNote: null },
      instruction: [{ id: 'instruction-do-does', titleZh: 'do / does 問句', explanationZh: '主詞是 he、she、it 時用 does，後面的動詞回到原形。', patterns: ['Does + he/she/it + 原形動詞?'], workedExamples: [{ example: 'Does Mina record the result?', walkthroughZh: 'Mina 是第三人稱單數，所以用 does；record 不加 s。' }, { example: 'Do the students compare the tests?', walkthroughZh: 'students 是複數，所以用 do。' }], commonMistakes: [{ wrong: 'Does Mina records it?', corrected: 'Does Mina record it?', whyZh: 'does 已經表示第三人稱，動詞用原形。' }] }],
      practice: practice as any,
      selfCheckZh: ['我能為答案圈出文章證據。', '我記得 does 後面用原形動詞。'],
      homework: { purposeZh: '隔一天再提取本週重點。', estimatedMinutes: 20, questions: homeworkQuestions as any },
    },
    answers: allQuestions.map((item) => ({ questionId: item.id, answer: '示範答案', acceptedAnswers: [], explanationZh: '答案必須引用文章中的線索。', likelyMisconceptionZh: null, followUpZh: null })),
    parentSummary: { focusZh: '推論證據與 do / does', observeZh: ['是否能自己指出證據'], completionCheckZh: '確認每一題都有作答即可。' },
    trackingDelta: { introducedVocabularyIds: Array.from({ length: 7 }, (_, index) => `vocab-${index}`), reviewedVocabularyIds: [], grammarTargets: ['grammar-do-does'], readingTargets: ['reading-inference'], hypothesesToVerify: ['提高閱讀難度後仍能在時間內完成'], nextReviewCandidates: ['do / does'] },
    qualityEvidence: { feedbackApplied: ['提升閱讀篇幅與推論深度', '加入完整中文解說'], improvementComparedToPrevious: ['本週加入中文策略示範，並將推論題改為有證據可回查的 CAP 題型。'], criticalChecks: [{ id: 'self-study', passed: true, evidence: '每個新概念均有中文解說與 worked examples。' }], criticFindings: [] },
  }
  const v21 = upgradeV20ToV21(v20 as any)
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  const v23 = makeGroundedCurriculumPackage(v22)
  const v24 = upgradeV23ToV24(v23)
  v24.metadata.jobId = jobId
  v24.metadata.childId = childId
  v24.metadata.inputFingerprint = fingerprint
  v24.metadata.model = 'gpt-5.6-sol'
  v24.metadata.promptVersion = 'prompt/2.11.0'
  v24.metadata.engineVersion = '1.6.0'

  const precedent = 'cap-ea8d068eb1d8'
  ;(v24.qualityEvidence as any).precedentRefs = [precedent]

  v24.qualityEvidence.criticalChecks.push({
    id: 'cap-provenance',
    passed: true,
    evidence: JSON.stringify(capRuntimeMetadata()),
  })
  const allIds = ['G1', 'G2', 'G3', 'I1', 'I2', 'I3', 'P1', 'R1', 'H1', 'H2', 'H3']
  for (const qId of allIds) {
    v24.qualityEvidence.criticalChecks.push({
      id: `evidence-plan:${qId}`,
      passed: true,
      evidence: JSON.stringify({
        evidenceScope: 'primary_reading',
        evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'Mina joins a school robotics club' }],
      }),
    })
  }
  for (const qId of ['C1', 'C2', 'C3']) {
    v24.qualityEvidence.criticalChecks.push({
      id: `cap-plan:${qId}`,
      passed: true,
      evidence: JSON.stringify({
        learningObjective: 'infer from evidence',
        primarySkill: 'purpose_speaker_intent',
        secondarySkills: ['discourse_relationship'],
        genre: 'article_informational',
        targetLanguageDifficulty: 'A2_basic',
        targetCognitiveDepth: 'D2_single_step_inference',
        evidenceMode: 'text_only',
        evidenceSpan: 'cross_sentence_local',
        evidenceScope: 'primary_reading',
        precedentRefs: [precedent],
        precedentMode: 'anchor',
        borrowedDesignPrinciples: ['two clues jointly decide'],
        distractorStrategies: ['unsupported_world_knowledge'],
        evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'Mina joins a school robotics club' }],
        reasoningOperations: ['connect evidence'],
        intentionalRecall: false,
        noPrecedentReason: null,
      }),
    })
  }
  return v24
}

describe('validatePreSubmitPackage', () => {
  const validContext = makeMockContext()

  it('accepts a valid V24 package with matching metadata', () => {
    const pkg = makeValidV24Package(
      validContext.job.id,
      validContext.job.childId,
      validContext.inputFingerprint,
    )
    const result = validatePreSubmitPackage(pkg, validContext)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('fails if written response lacks writingLines', () => {
    const pkg = makeValidV24Package(
      validContext.job.id,
      validContext.job.childId,
      validContext.inputFingerprint,
    )
    // Clear writingLines on a written-response question
    pkg.studentLesson.practice[0].questions[0].writingLines = 0

    const result = validatePreSubmitPackage(pkg, validContext)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.toLowerCase().includes('writing') || i.toLowerCase().includes('lines'))).toBe(true)
  })

  it('fails if inputFingerprint does not match context', () => {
    const pkg = makeValidV24Package(
      validContext.job.id,
      validContext.job.childId,
      'different-fingerprint',
    )
    const result = validatePreSubmitPackage(pkg, validContext)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.includes('FINGERPRINT_MISMATCH'))).toBe(true)
  })
})

describe('submitProductionPackage & release safety', () => {
  it('submits package and recovers status via read-after-write', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        if (name === 'worker_submit_local_curriculum_package') {
          return { data: { success: true }, error: null }
        }
        if (name === 'worker_local_curriculum_submission_status') {
          return { data: { submissionFound: true, status: 'submitted' }, error: null }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    const res = await submitProductionPackage(client, 'job-1', 'worker-me', { dummy: true })
    expect(res.submitted).toBe(true)
    expect(res.status).toBe('SUBMITTED_AWAITING_FINISHER')
  })

  it('refuses to release claim if submission was already recorded', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name) => {
        if (name === 'worker_local_curriculum_submission_status') {
          return { data: { submissionFound: true, status: 'submitted' }, error: null }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    await expect(
      releaseUnsubmittedClaim(client, 'job-1', 'worker-me', 'FAILED', 'error message'),
    ).rejects.toThrow('CANNOT_RELEASE_SUBMITTED_CLAIM')
  })
})
