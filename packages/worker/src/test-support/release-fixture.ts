import { vi } from 'vitest'
import { capRuntimeMetadata, upgradeV23ToV24, upgradeV24ToV25, type CurriculumPackage } from '@paper-english/generator'
import { curriculumSample } from '../../../pdf/src/generate-curriculum-sample.js'
import type { WorkerClient } from '../pipeline.js'
import { desiredAuthoringContract, LEGACY_AUTHORING_CONTRACT, PREVIOUS_AUTHORING_CONTRACT } from '../authoring-claim-contract.js'

/** Shared release-compatible curriculum fixtures for Finisher and Week 1 publisher tests. */
export function fixture(release: 'current' | 'previous' | 'legacy') {
  const pkg: any = upgradeV24ToV25(upgradeV23ToV24(structuredClone(curriculumSample) as any))
  const precedent = 'cap-ea8d068eb1d8'
  ;(pkg.qualityEvidence as any).precedentRefs = [precedent]

  pkg.qualityEvidence.criticalChecks.push({
    id: 'cap-provenance',
    passed: true,
    evidence: JSON.stringify(capRuntimeMetadata()),
  })
  const allIds = ['G1', 'G2', 'I1', 'I2', 'P1', 'R1', 'R2', 'H1', 'H2', 'H3']
  for (const qId of allIds) {
    pkg.qualityEvidence.criticalChecks.push({
      id: `evidence-plan:${qId}`,
      passed: true,
      evidence: JSON.stringify({
        evidenceScope: 'primary_reading',
        evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: pkg.studentLesson.reading.blocks[0].text.slice(0, 40) }],
      }),
    })
  }
  for (const qId of ['C1', 'C2']) {
    pkg.qualityEvidence.criticalChecks.push({
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
        evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: pkg.studentLesson.reading.blocks[0].text.slice(0, 40) }],
        reasoningOperations: ['connect evidence'],
        intentionalRecall: false,
        noPrecedentReason: null,
      }),
    })
  }
  const contract = release === 'current'
    ? { ...desiredAuthoringContract, bundleSha256: 'a'.repeat(64) }
    : release === 'previous' ? { ...PREVIOUS_AUTHORING_CONTRACT } : { ...LEGACY_AUTHORING_CONTRACT }
  Object.assign(pkg.metadata, contract)
  delete pkg.metadata.bundleSha256
  delete pkg.metadata.bundleVersion
  if (contract.schemaVersion === '2.6.0') {
    const opening = pkg.studentLesson.opening
    pkg.studentLesson.opening = { goalsZh: opening.goalsZh, howToUseZh: opening.howToUseZh, activity: { type: 'direct-reading' } }
    pkg.studentLesson.instruction = [{ id: 'instruction-1', titleZh: '閱讀說明', blocks: [{ type: 'prose', textZh: '閱讀文章並注意例句。' }] }]
  }
  return { pkg, contract }
}
export function harness(pkg: any, contract: any) {
  const context = { job: { id: pkg.metadata.jobId, childId: pkg.metadata.childId, materialWeek: '2026-08-18', ruleVersion: 'weekly-material/2.0.0' }, targetReleaseId: contract.releaseId, activeAuthoringContract: contract }
  const rpc = vi.fn(async (name: string, _args?: Record<string, unknown>) => ({ data: name === 'worker_claim_week1_fast_submissions' ? [{ job_id: pkg.metadata.jobId, authoring_attempt: 1, generation_worker_id: 'worker-test', canonical_source: pkg }] : name === 'worker_generation_context' ? context : name.startsWith('worker_complete_') ? 'material-test' : true, error: null }))
  const upload = vi.fn(async () => ({ data: {}, error: null }))
  const client = { rpc, storage: { from: () => ({ download: async () => ({ data: null, error: { message: 'not found' } }), upload, remove: async () => ({ data: null, error: null }) }) } } as unknown as WorkerClient
  const render = vi.fn(async (_pkg: CurriculumPackage) => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }))
  const inspect = async () => { const item = { pageCount: 1, pageTexts: ['ok'], text: 'ok', title: 'ok', layoutFingerprint: 'ok' }; return { student: item, parentAnswer: item } }
  return { context, client, rpc, upload, render, inspect }
}
