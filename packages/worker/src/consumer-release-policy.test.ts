import { describe, expect, it } from 'vitest'
import { completeCurriculumJob } from './pipeline.js'
import { processWeek1FastSubmissions } from './week1-fast-publisher.js'
import { desiredAuthoringContract } from './authoring-claim-contract.js'
import { fixture, harness } from './test-support/release-fixture.js'

for (const lane of ['finisher', 'week1'] as const) describe(`${lane} immutable release compatibility`, () => {
  async function run(state: ReturnType<typeof harness>, pkg: any) {
    if (lane === 'finisher') return completeCurriculumJob({ client: state.client, workerId: 'worker-test', context: state.context, curriculumPackage: pkg, render: state.render, inspect: state.inspect })
    const [result] = await processWeek1FastSubmissions(state.client, 'processor-test', 1, state)
    if (result?.status !== 'completed') throw new Error(result?.errorMessage)
    return result.materialId
  }
  it.each(['current', 'previous', 'legacy'] as const)('accepts supported %s release without mutating canonical identity', async release => {
    const { pkg, contract } = fixture(release)
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
    const { pkg, contract } = fixture('previous')
    pkg.metadata[key] = 'forged'
    const state = harness(pkg, contract)
    await expect(run(state, pkg)).rejects.toThrow('Release mismatch')
    expect(state.render).not.toHaveBeenCalled()
    expect(state.upload).not.toHaveBeenCalled()
    expect(state.rpc.mock.calls.some(([name]) => name.startsWith('worker_complete_'))).toBe(false)
  })
  it.each(['schemaVersion', 'promptVersion', 'engineVersion', 'workerVersion', 'rendererVersion'])('rejects bound contract %s disagreement', async key => {
    const { pkg, contract } = fixture('previous')
    const state = harness(pkg, { ...contract, [key]: 'forged' })
    await expect(run(state, pkg)).rejects.toThrow('AUTHORING_CONTRACT')
    expect(state.render).not.toHaveBeenCalled()
    expect(state.upload).not.toHaveBeenCalled()
  })
  it('rejects a target release that disagrees with the immutable contract', async () => {
    const { pkg, contract } = fixture('previous')
    const state = harness(pkg, contract)
    state.context.targetReleaseId = desiredAuthoringContract.releaseId
    await expect(run(state, pkg)).rejects.toThrow('AUTHORING_CONTRACT')
    expect(state.render).not.toHaveBeenCalled()
  })
  it('rejects an unsupported bound contract before rendering', async () => {
    const { pkg, contract } = fixture('previous')
    const state = harness(pkg, { ...contract, releaseId: 'rel_1.2.0' })
    await expect(run(state, pkg)).rejects.toThrow('AUTHORING_CONTRACT')
    expect(state.render).not.toHaveBeenCalled()
  })
})
