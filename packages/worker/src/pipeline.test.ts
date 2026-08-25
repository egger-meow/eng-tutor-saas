import { describe, expect, it, vi } from 'vitest'
import { syntheticWeekOne, CURRENT_PDF_RENDERER_VERSION, CURRENT_WORKER_VERSION, type CurriculumPackage } from '@paper-english/generator'
import type { CurriculumPdfPairInspection } from '@paper-english/pdf'
import { curriculumSample } from '../../pdf/src/generate-curriculum-sample.js'
import { completeCurriculumJob, completeJob, failClaimedJob, loadGenerationContext, type GenerationContext, type WorkerClient } from './pipeline.js'

function setup() {
  const uploads: string[] = []
  const removals: string[][] = []
  const rpc = vi.fn<WorkerClient['rpc']>(async (name: string) => ({
    data: name === 'worker_complete_generation_job' || name === 'worker_complete_generation_job_with_quality_override'
      ? 'material-1'
      : true,
    error: null,
  }))
  const client: WorkerClient = {
    rpc,
    storage: { from: () => ({
      upload: async (path) => { uploads.push(path); return { data: {}, error: null } },
      download: async () => ({ data: null, error: { message: 'not found' } }),
      remove: async (paths) => { removals.push(paths); return { data: {}, error: null } },
    }) },
  }
  const context: GenerationContext = { job: { id: 'synthetic-week-1', childId: 'synthetic-child', materialWeek: '2026-08-18', ruleVersion: 'weekly-material/1.0.0' } }
  return { client, context, rpc, uploads, removals }
}

describe('completeJob', () => {
  it('uploads both PDFs before completing the database job', async () => {
    const state = setup()
    const materialId = await completeJob({
      client: state.client, workerId: 'worker-1', context: state.context,
      lesson: syntheticWeekOne, promptVersion: 'prompt-v1', generatorVersion: 'generator-v1', modelName: 'model-v1',
      render: async () => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }),
    })
    expect(materialId).toBe('material-1')
    expect(state.uploads).toEqual([
      'synthetic-child/synthetic-week-1/student.pdf',
      'synthetic-child/synthetic-week-1/parent-answer.pdf',
    ])
    expect(state.rpc).toHaveBeenCalledWith('worker_complete_generation_job', expect.objectContaining({ job_id: 'synthetic-week-1' }))
  })

  it('cleans artifacts and marks the job failed when upload fails', async () => {
    const state = setup()
    state.client.storage.from = () => ({
      upload: async () => ({ data: null, error: { message: 'storage unavailable' } }),
      download: async () => ({ data: null, error: { message: 'not found' } }),
      remove: async (paths) => { state.removals.push(paths); return { data: {}, error: null } },
    })
    await expect(completeJob({
      client: state.client, workerId: 'worker-1', context: state.context,
      lesson: syntheticWeekOne, promptVersion: 'prompt-v1', generatorVersion: 'generator-v1', modelName: 'model-v1',
      render: async () => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }),
    })).rejects.toThrow('storage unavailable')
    expect(state.rpc).toHaveBeenCalledWith('worker_fail_generation_job', expect.objectContaining({ job_id: 'synthetic-week-1' }))
    expect(state.removals).toHaveLength(2)
  })

  it('keeps uploaded artifacts when database completion has an ambiguous transport failure', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_complete_generation_job') throw new Error('connection reset')
      return { data: true, error: null }
    })
    await expect(completeJob({
      client: state.client, workerId: 'worker-1', context: state.context,
      lesson: syntheticWeekOne, promptVersion: 'prompt-v1', generatorVersion: 'generator-v1', modelName: 'model-v1',
      render: async () => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }),
    })).rejects.toThrow('connection reset')
    expect(state.removals).toHaveLength(1)
    expect(state.rpc).not.toHaveBeenCalledWith('worker_fail_generation_job', expect.anything())
  })
})

describe('completeCurriculumJob', () => {
  const curriculumContext: GenerationContext = {
    job: { id: 'kobe-week-2-v2', childId: 'kobe', materialWeek: '2026-08-18', ruleVersion: 'weekly-material/2.0.0' },
  }
  const pdfs = { student: new Uint8Array([1, 2, 3]), parentAnswer: new Uint8Array([4, 5, 6]) }
  const inspect = async (_pkg: CurriculumPackage, pair: { student: Uint8Array; parentAnswer: Uint8Array }): Promise<CurriculumPdfPairInspection> => {
    const result = (bytes: Uint8Array) => ({
      pageCount: 1,
      pageTexts: ['fixture'],
      text: 'fixture',
      title: 'fixture',
      layoutFingerprint: Array.from(bytes).join('-'),
    })
    return { student: result(pair.student), parentAnswer: result(pair.parentAnswer) }
  }

  it('rejects an invalid v2 package before touching storage', async () => {
    const state = setup()
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: state.context, curriculumPackage: {} })).rejects.toThrow('Invalid curriculum package')
    expect(state.uploads).toEqual([])
    expect(state.rpc).toHaveBeenCalledWith('worker_fail_generation_job', expect.objectContaining({ p_error_code: 'QUALITY_REJECTED' }))
  })

  it('enforces the deterministic audit before rendering or storage', async () => {
    const state = setup()
    const rejected = structuredClone(curriculumSample) as CurriculumPackage
    rejected.metadata.inputFingerprint = 'unknown'
    const render = vi.fn(async () => pdfs)
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: rejected, render })).rejects.toThrow('Curriculum quality rejected')
    expect(render).not.toHaveBeenCalled()
    expect(state.uploads).toEqual([])
  })

  it('rejects an underfilled package against profile.weekly_minutes before rendering', async () => {
    const state = setup()
    const render = vi.fn(async () => pdfs)
    const budgetContext: GenerationContext = {
      ...curriculumContext,
      profile: { weekly_minutes: 300 },
    }

    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: budgetContext,
      curriculumPackage: curriculumSample,
      render,
      inspect,
    })).rejects.toThrow('BUDGET_UNDERFILLED')
    expect(render).not.toHaveBeenCalled()
    expect(state.uploads).toEqual([])
  })

  it('rejects Kobe W6→W7 when coach, team, and practice are relabeled new', async () => {
    const state = setup()
    const week7 = structuredClone(curriculumSample) as CurriculumPackage
    const priorWords = [
      { id: 'v-coach', word: 'coach' },
      { id: 'v-team', word: 'team' },
      { id: 'v-practice', word: 'practice' },
    ]
    priorWords.forEach((prior, index) => {
      week7.studentLesson.vocabulary[index]!.id = prior.id
      week7.studentLesson.vocabulary[index]!.word = prior.word
      week7.studentLesson.vocabulary[index]!.status = 'new'
    })
    week7.trackingDelta.introducedVocabularyIds = week7.studentLesson.vocabulary.map((item) => item.id)
    week7.trackingDelta.reviewedVocabularyIds = []
    const week7Context: GenerationContext = {
      ...curriculumContext,
      vocabularyCapsule: {
        dueForReview: [],
        weakRecent: [],
        uncertain: priorWords.map((item) => item.id),
        recentlyMastered: [],
        historicalCount: 3,
      },
    }
    const render = vi.fn(async () => pdfs)

    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: week7Context,
      curriculumPackage: week7,
      render,
      inspect,
    })).rejects.toThrow(/coach|team|practice/u)
    expect(render).not.toHaveBeenCalled()
    expect(state.uploads).toEqual([])
  })

  it('uploads and completes an audited v2 package', async () => {
    const state = setup()
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).resolves.toBe('material-1')
    expect(state.uploads).toEqual(['kobe/kobe-week-2-v2/student.pdf', 'kobe/kobe-week-2-v2/parent-answer.pdf'])
  })

  it('commits an override candidate, immutable rejection, and delivery outcome through one atomic RPC', async () => {
    const state = setup()
    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: curriculumContext,
      curriculumPackage: curriculumSample,
      render: async () => pdfs,
      inspect,
      allowSoftQualityOverride: true,
      qualityOverride: {
        authoringAttempt: 5,
        processorId: 'github-actions-finisher',
        reason: 'Only allowlisted soft pedagogical gates remain.',
        rejectionEvidence: {
          failureType: 'QUALITY_REJECTED',
          findings: [{ source: 'audit', dimension: 'cognitive-load', message: 'Too dense.' }],
        },
        rejectionMessage: 'Curriculum quality rejected: cognitive load',
      },
    })).resolves.toBe('material-1')

    expect(state.rpc).toHaveBeenCalledWith(
      'worker_complete_generation_job_with_quality_override',
      expect.objectContaining({
        job_id: 'kobe-week-2-v2',
        authoring_attempt: 5,
        processor_id: 'github-actions-finisher',
        rejection_evidence: expect.objectContaining({ failureType: 'QUALITY_REJECTED' }),
      }),
    )
    expect(state.rpc).not.toHaveBeenCalledWith('worker_record_quality_override', expect.anything())
  })

  it('processes a grounded 2.3 package through the unchanged render, upload, and completion path', async () => {
    const state = setup()
    const grounded = structuredClone(curriculumSample)
    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: curriculumContext,
      curriculumPackage: grounded,
      render: async () => pdfs,
      inspect,
    })).resolves.toBe('material-1')
    expect(state.uploads).toEqual(['kobe/kobe-week-2-v2/student.pdf', 'kobe/kobe-week-2-v2/parent-answer.pdf'])
  })

  it('overwrites LLM-supplied rendererVersion and persists CURRENT_WORKER_VERSION upon completion', async () => {
    const state = setup()
    const grounded = structuredClone(curriculumSample)
    grounded.metadata.rendererVersion = 'fake-llm-renderer-v99'
    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: curriculumContext,
      curriculumPackage: grounded,
      render: async () => pdfs,
      inspect,
    })).resolves.toBe('material-1')

    expect(state.rpc).toHaveBeenCalledWith('worker_complete_generation_job', expect.objectContaining({
      canonical_source: expect.objectContaining({
        metadata: expect.objectContaining({
          rendererVersion: CURRENT_PDF_RENDERER_VERSION,
          workerVersion: CURRENT_WORKER_VERSION,
        }),
      }),
    }))
  })

  it('rejects broken 2.3 prose grounding before rendering or storage', async () => {
    const state = setup()
    const grounded = structuredClone(curriculumSample)
    grounded.grounding.claims[0]!.text = 'Text that is absent from the authored reading.'
    const render = vi.fn(async () => pdfs)
    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: curriculumContext,
      curriculumPackage: grounded,
      render,
      inspect,
    })).rejects.toThrow('Invalid curriculum package')
    expect(render).not.toHaveBeenCalled()
    expect(state.uploads).toEqual([])
  })

  it('records a technical failure without touching storage when rendering fails', async () => {
    const state = setup()
    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: curriculumContext,
      curriculumPackage: curriculumSample,
      render: async () => { throw new Error('chromium crashed') },
      inspect,
    })).rejects.toThrow('chromium crashed')
    expect(state.uploads).toEqual([])
    expect(state.removals).toEqual([])
    expect(state.rpc).toHaveBeenCalledWith('worker_fail_generation_job', expect.objectContaining({ p_error_code: 'CURRICULUM_PIPELINE_FAILED' }))
  })

  it('does not remove pre-existing evidence after a first-upload failure', async () => {
    const state = setup()
    state.client.storage.from = () => ({
      upload: async (path) => { state.uploads.push(path); return { data: null, error: { message: 'storage unavailable' } } },
      download: async () => ({ data: null, error: { message: 'storage unavailable' } }),
      remove: async (paths) => { state.removals.push(paths); return { data: {}, error: null } },
    })
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).rejects.toThrow('storage unavailable')
    expect(state.removals).toEqual([])
  })

  it('removes only the artifact created by this attempt after a partial upload failure', async () => {
    const state = setup()
    let uploadCount = 0
    state.client.storage.from = () => ({
      upload: async (path) => {
        state.uploads.push(path)
        uploadCount += 1
        return uploadCount === 2 ? { data: null, error: { message: 'parent upload failed' } } : { data: {}, error: null }
      },
      download: async () => ({ data: null, error: { message: 'not found' } }),
      remove: async (paths) => { state.removals.push(paths); return { data: {}, error: null } },
    })
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).rejects.toThrow('parent upload failed')
    expect(state.removals).toEqual([['kobe/kobe-week-2-v2/student.pdf']])
  })

  it('reuses an inspected immutable artifact pair on retry', async () => {
    const state = setup()
    state.client.storage.from = () => ({
      upload: async () => ({ data: null, error: { message: 'already exists' } }),
      download: async (path) => ({ data: new Blob([path.endsWith('student.pdf') ? pdfs.student : pdfs.parentAnswer]), error: null }),
      remove: async (paths) => { state.removals.push(paths); return { data: {}, error: null } },
    })
    const render = vi.fn(async () => pdfs)
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render, inspect })).resolves.toBe('material-1')
    expect(render).toHaveBeenCalledOnce()
    expect(state.removals).toEqual([])
  })

  it('preserves and rejects a conflicting immutable artifact', async () => {
    const state = setup()
    state.client.storage.from = () => ({
      upload: async () => ({ data: null, error: { message: 'already exists' } }),
      download: async () => ({ data: new Blob([new Uint8Array([9])]), error: null }),
      remove: async (paths) => { state.removals.push(paths); return { data: {}, error: null } },
    })
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).rejects.toThrow('does not match the current canonical render')
    expect(state.removals).toEqual([])
  })

  it('keeps uploaded v2 artifacts after an ambiguous completion transport failure', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_complete_generation_job') throw new Error('connection reset')
      return { data: true, error: null }
    })
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).rejects.toThrow('connection reset')
    expect(state.removals).toEqual([])
    expect(state.rpc).not.toHaveBeenCalledWith('worker_fail_generation_job', expect.anything())
  })

  it('recovers when completion committed but the first response was lost', async () => {
    const state = setup()
    const stored = new Map<string, Uint8Array>()
    let completionCalls = 0
    state.client.storage.from = () => ({
      upload: async (path, body) => {
        if (stored.has(path)) return { data: null, error: { message: 'already exists' } }
        stored.set(path, Uint8Array.from(body))
        return { data: {}, error: null }
      },
      download: async (path) => {
        const bytes = stored.get(path)
        return bytes ? { data: new Blob([Uint8Array.from(bytes).buffer]), error: null } : { data: null, error: { message: 'not found' } }
      },
      remove: async (paths) => { for (const path of paths) stored.delete(path); return { data: {}, error: null } },
    })
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_complete_generation_job') {
        completionCalls += 1
        if (completionCalls === 1) throw new Error('connection reset after commit')
        return { data: 'material-1', error: null }
      }
      if (name === 'worker_generation_context') return { data: null, error: { message: 'job is not actively claimed by this worker' } }
      if (name === 'worker_completed_generation_context') return { data: { job: curriculumContext.job, completedMaterialId: 'material-1' }, error: null }
      if (name === 'worker_quality_trends') return { data: [], error: null }
      return { data: true, error: null }
    })

    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).rejects.toThrow('connection reset after commit')
    const recoveryContext = await loadGenerationContext(state.client, curriculumContext.job.id, 'worker-1')
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: recoveryContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).resolves.toBe('material-1')
    expect(stored.size).toBe(2)
    expect(completionCalls).toBe(2)
  })

  it('does not fail completion when observation recording fails', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_complete_generation_job') return { data: 'material-1', error: null }
      if (name === 'worker_record_curriculum_observations') return { data: null, error: { message: 'observation unavailable' } }
      return { data: true, error: null }
    })
    await expect(completeCurriculumJob({ client: state.client, workerId: 'worker-1', context: curriculumContext, curriculumPackage: curriculumSample, render: async () => pdfs, inspect })).resolves.toBe('material-1')
  })
})

describe('failClaimedJob', () => {
  it('records a sanitized pre-completion quality rejection', async () => {
    const state = setup()
    await failClaimedJob(state.client, 'worker-1', 'synthetic-week-1', 'QUALITY_REJECTED', 'Unresolved answer ambiguity')
    expect(state.rpc).toHaveBeenCalledWith('worker_fail_generation_job', {
      job_id: 'synthetic-week-1',
      worker_id: 'worker-1',
      p_error_code: 'QUALITY_REJECTED',
      p_error_message: 'Unresolved answer ambiguity',
    })
  })

  it('fails loudly when the worker no longer owns the claim', async () => {
    const state = setup()
    state.rpc.mockResolvedValueOnce({ data: false, error: null })
    await expect(failClaimedJob(state.client, 'worker-1', 'synthetic-week-1', 'QUALITY_REJECTED', 'Rejected')).rejects.toThrow(
      'generation job was not actively claimed by this worker',
    )
  })
})

describe('loadGenerationContext', () => {
  it('falls back to a completed-job recovery context after an ambiguous completion', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_generation_context') return { data: null, error: { message: 'job is not actively claimed by this worker' } }
      if (name === 'worker_completed_generation_context') return { data: { job: { id: 'synthetic-week-1', childId: 'synthetic-child', materialWeek: '2026-08-18', ruleVersion: 'weekly-material/1.0.0', recoveryCompleted: true } }, error: null }
      if (name === 'worker_quality_trends') return { data: [], error: null }
      return { data: null, error: { message: 'unexpected RPC' } }
    })

    await expect(loadGenerationContext(state.client, 'synthetic-week-1', 'worker-1')).resolves.toEqual(expect.objectContaining({
      job: expect.objectContaining({ recoveryCompleted: true }),
    }))
    expect(state.rpc).toHaveBeenCalledWith('worker_completed_generation_context', { job_id: 'synthetic-week-1', worker_id: 'worker-1' })
  })

  it('hydrates diversityCapsule from recentHistory in generation context', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_generation_context') {
        return {
          data: {
            job: { id: 'synthetic-week-1', childId: 'child-101', materialWeek: '2026-W34', ruleVersion: 'weekly-material/2.0.0' },
            child: { grade: 7, gradeStage: 'grade_7' },
            recentHistory: [
              { materialWeek: '2026-W32', genre: 'article', contextKey: 'marine-life', itemFamilies: ['f-nature-animals'] },
              { materialWeek: '2026-W33', genre: 'dialogue', contextKey: 'space-travel', itemFamilies: ['f-tech-science'] },
            ],
          },
          error: null,
        }
      }
      if (name === 'worker_quality_trends') return { data: [], error: null }
      return { data: null, error: { message: 'unexpected RPC' } }
    })

    const context = await loadGenerationContext(state.client, 'synthetic-week-1', 'worker-1')
    expect(context.diversityCapsule).toBeDefined()
    expect(context.diversityCapsule?.recentGenres).toEqual(['article', 'dialogue'])
    expect(context.diversityCapsule?.recentContextKeys).toEqual(['marine-life', 'space-travel'])
    expect(context.diversityCapsule?.recentItemFamilies).toEqual(['f-nature-animals', 'f-tech-science'])
  })

  it('guarantees capCoverageCapsule provides recommendedVocabulary, recommendedGrammar, and recommendedCommunicationFunctions', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_generation_context') {
        return {
          data: {
            job: { id: 'synthetic-week-1', childId: 'child-101', materialWeek: '2026-W34', ruleVersion: 'weekly-material/2.0.0' },
            child: { grade: 7, gradeStage: 'grade_7' },
            vocabularyCapsule: {
              dueForReview: ['v-borrow'],
              weakRecent: [],
              uncertain: [],
              recentlyMastered: ['v-through'],
              historicalCount: 2,
            },
            grammarCapsule: {
              dueForReview: ['g7-do-does-questions'],
              weakRecent: [],
              uncertain: [],
              recentlyMastered: [],
              historicalCount: 1,
            },
            communicationCapsule: {
              dueForReview: ['cf-making-requests'],
              weakRecent: [],
              recentlyMastered: [],
              historicalCount: 1,
            },
          },
          error: null,
        }
      }
      if (name === 'worker_quality_trends') return { data: [], error: null }
      return { data: null, error: { message: 'unexpected RPC' } }
    })

    const context = await loadGenerationContext(state.client, 'synthetic-week-1', 'worker-1')
    expect(context.capCoverageCapsule).toBeDefined()
    const cap = context.capCoverageCapsule as any
    expect(cap.recommendedVocabulary).toBeDefined()
    expect(cap.recommendedVocabulary.length).toBeGreaterThan(0)
    expect(cap.recommendedGrammar).toBeDefined()
    expect(cap.recommendedGrammar.length).toBeGreaterThan(0)
    expect(cap.recommendedCommunicationFunctions).toBeDefined()
    expect(cap.recommendedCommunicationFunctions.length).toBeGreaterThan(0)
  })
})
