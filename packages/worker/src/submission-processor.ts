import { completeCurriculumJob, loadGenerationContext, type WorkerClient } from './pipeline.js'

export type CurriculumSubmission = {
  job_id: string
  generation_worker_id: string
  canonical_source: unknown
}

export type CurriculumSubmissionResult = {
  jobId: string
  status: 'completed' | 'quality_rejected' | 'technical_failed'
  materialId?: string
  errorCode?: string
}

type CompleteSubmission = (submission: CurriculumSubmission) => Promise<string>

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
}

function classifyFailure(error: unknown): Pick<CurriculumSubmissionResult, 'status' | 'errorCode'> {
  const message = error instanceof Error ? error.message : String(error)
  const quality = message.startsWith('Invalid curriculum package:') || message.startsWith('Curriculum quality rejected:')
  return quality
    ? { status: 'quality_rejected', errorCode: 'QUALITY_REJECTED' }
    : { status: 'technical_failed', errorCode: 'CURRICULUM_PIPELINE_FAILED' }
}

export async function processCurriculumSubmissions(
  client: WorkerClient,
  processorId: string,
  claimLimit: number,
  complete?: CompleteSubmission,
): Promise<CurriculumSubmissionResult[]> {
  const submissions = unwrap(await client.rpc('worker_claim_curriculum_submissions', {
    processor_id: processorId,
    claim_limit: claimLimit,
  }), 'claim curriculum submissions') as CurriculumSubmission[]

  const results: CurriculumSubmissionResult[] = []
  for (const submission of submissions) {
    const completeOne = complete ?? (async (item: CurriculumSubmission) => {
      const context = await loadGenerationContext(client, item.job_id, item.generation_worker_id)
      return completeCurriculumJob({
        client,
        workerId: item.generation_worker_id,
        context,
        curriculumPackage: item.canonical_source,
      })
    })

    try {
      const materialId = await completeOne(submission)
      const finished = unwrap(await client.rpc('worker_finish_curriculum_submission', {
        job_id: submission.job_id,
        processor_id: processorId,
        outcome: 'completed',
        error_code: null,
        error_message: null,
      }), 'finish curriculum submission') as boolean
      if (!finished) throw new Error('curriculum submission lease was lost before completion was recorded')
      results.push({ jobId: submission.job_id, status: 'completed', materialId })
    } catch (error) {
      const failure = classifyFailure(error)
      const message = error instanceof Error ? error.message : String(error)
      const finished = unwrap(await client.rpc('worker_finish_curriculum_submission', {
        job_id: submission.job_id,
        processor_id: processorId,
        outcome: failure.status,
        error_code: failure.errorCode,
        error_message: message.slice(0, 2000),
      }), 'record curriculum submission failure') as boolean
      if (!finished) throw new Error(`curriculum submission lease was lost after ${failure.errorCode}`)
      results.push({ jobId: submission.job_id, ...failure })
    }
  }

  return results
}
