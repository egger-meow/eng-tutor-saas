import { describe, expect, it, vi } from 'vitest'
import { capRuntimeMetadata, upgradeV23ToV24, upgradeV24ToV25, type CurriculumPackage } from '@paper-english/generator'
import { curriculumSample } from '../../pdf/src/generate-curriculum-sample.js'
import { completeCurriculumJob, type WorkerClient } from './pipeline.js'
import { processWeek1FastSubmissions } from './week1-fast-publisher.js'
import { desiredAuthoringContract, PREVIOUS_AUTHORING_CONTRACT } from './authoring-claim-contract.js'

function fixture(current: boolean) {
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
  const contract = current ? { ...desiredAuthoringContract, bundleSha256: 'a'.repeat(64) } : { ...PREVIOUS_AUTHORING_CONTRACT }
  Object.assign(pkg.metadata, contract)
  delete pkg.metadata.bundleSha256
  delete pkg.metadata.bundleVersion
  if (current) {
    const opening = pkg.studentLesson.opening
    pkg.studentLesson.opening = { goalsZh: opening.goalsZh, howToUseZh: opening.howToUseZh, activity: { type: 'direct-reading' } }
    pkg.studentLesson.instruction = [{ id: 'instruction-1', titleZh: '閱讀說明', blocks: [{ type: 'prose', textZh: '閱讀文章並注意例句。' }] }]
  }
  return { pkg, contract }
}
function harness(pkg: any, contract: any) {
  const context = { job: { id: pkg.metadata.jobId, childId: pkg.metadata.childId, materialWeek: '2026-08-18', ruleVersion: 'weekly-material/2.0.0' }, targetReleaseId: contract.releaseId, activeAuthoringContract: contract }
  const rpc = vi.fn(async (name: string, _args?: Record<string, unknown>) => ({ data: name === 'worker_claim_week1_fast_submissions' ? [{ job_id: pkg.metadata.jobId, authoring_attempt: 1, generation_worker_id: 'worker-test', canonical_source: pkg }] : name === 'worker_generation_context' ? context : name.startsWith('worker_complete_') ? 'material-test' : true, error: null }))
  const upload = vi.fn(async () => ({ data: {}, error: null }))
  const client = { rpc, storage: { from: () => ({ download: async () => ({ data: null, error: { message: 'not found' } }), upload, remove: async () => ({ data: null, error: null }) }) } } as unknown as WorkerClient
  const render = vi.fn(async (_pkg: CurriculumPackage) => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }))
  const inspect = async () => { const item = { pageCount: 1, pageTexts: ['ok'], text: 'ok', title: 'ok', layoutFingerprint: 'ok' }; return { student: item, parentAnswer: item } }
  return { context, client, rpc, upload, render, inspect }
}
for (const lane of ['finisher', 'week1'] as const) describe(`${lane} immutable release compatibility`, () => {
  async function run(state: ReturnType<typeof harness>, pkg: any) {
    if (lane === 'finisher') return completeCurriculumJob({ client: state.client, workerId: 'worker-test', context: state.context, curriculumPackage: pkg, render: state.render, inspect: state.inspect })
    const [result] = await processWeek1FastSubmissions(state.client, 'processor-test', 1, state)
    if (result?.status !== 'completed') throw new Error(result?.errorMessage)
    return result.materialId
  }
  it.each([false, true])('accepts supported current=%s without mutating canonical identity', async current => {
    const { pkg, contract } = fixture(current)
    const original = structuredClone(pkg)
    const state = harness(pkg, contract)
    await expect(run(state, pkg)).resolves.toBe('material-test')
    expect(pkg).toEqual(original)
    expect(state.render.mock.calls[0]?.[0].metadata).toMatchObject(original.metadata)
    const call = state.rpc.mock.calls.find(([name]) => name.startsWith('worker_complete_')) as any
    const args = call[1]
    expect(args[lane === 'finisher' ? 'canonical_source' : 'p_canonical_source']).toEqual(original)
    expect(args[lane === 'finisher' ? 'generation_summary' : 'p_generation_summary'].execution).toEqual({ workerVersion: desiredAuthoringContract.workerVersion, rendererVersion: desiredAuthoringContract.rendererVersion })
  })
  it.each(['releaseId', 'schemaVersion', 'promptVersion', 'engineVersion', 'workerVersion', 'rendererVersion'])('rejects forged %s before rendering', async key => {
    const { pkg, contract } = fixture(false)
    pkg.metadata[key] = 'forged'
    const state = harness(pkg, contract)
    await expect(run(state, pkg)).rejects.toThrow('Release mismatch')
    expect(state.render).not.toHaveBeenCalled()
    expect(state.upload).not.toHaveBeenCalled()
    expect(state.rpc.mock.calls.some(([name]) => name.startsWith('worker_complete_'))).toBe(false)
  })
  it.each(['schemaVersion', 'promptVersion', 'engineVersion', 'workerVersion', 'rendererVersion'])('rejects bound contract %s disagreement', async key => {
    const { pkg, contract } = fixture(false)
    const state = harness(pkg, { ...contract, [key]: 'forged' })
    await expect(run(state, pkg)).rejects.toThrow('AUTHORING_CONTRACT')
    expect(state.render).not.toHaveBeenCalled()
    expect(state.upload).not.toHaveBeenCalled()
  })
  it('rejects a target release that disagrees with the immutable contract', async () => {
    const { pkg, contract } = fixture(false)
    const state = harness(pkg, contract)
    state.context.targetReleaseId = desiredAuthoringContract.releaseId
    await expect(run(state, pkg)).rejects.toThrow('AUTHORING_CONTRACT')
    expect(state.render).not.toHaveBeenCalled()
  })
  it('rejects an unsupported bound contract before rendering', async () => {
    const { pkg, contract } = fixture(false)
    const state = harness(pkg, { ...contract, releaseId: 'rel_1.2.0' })
    await expect(run(state, pkg)).rejects.toThrow('AUTHORING_CONTRACT')
    expect(state.render).not.toHaveBeenCalled()
  })
})
