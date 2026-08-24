import { CurriculumQualityError, completeCurriculumJob, isSoftQualityOverrideEligible, loadGenerationContext, type CurriculumFailureEvidence, type WorkerClient } from './pipeline.js'

export type CurriculumSubmission = {
  job_id: string
  authoring_attempt: number
  generation_worker_id: string
  canonical_source: unknown
}

export type CurriculumSubmissionResult = {
  jobId: string
  status: 'completed' | 'quality_rejected' | 'technical_failed' | 'delivered_with_quality_override'
  materialId?: string
  errorCode?: string
}

type CompleteSubmission = (submission: CurriculumSubmission) => Promise<string>

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
}

function classifyFailure(error: unknown): Pick<CurriculumSubmissionResult, 'status' | 'errorCode'> & { evidence?: CurriculumFailureEvidence } {
  const message = error instanceof Error ? error.message : String(error)
  return error instanceof CurriculumQualityError
    ? { status: 'quality_rejected', errorCode: 'QUALITY_REJECTED', evidence: error.evidence }
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
        recordJobFailure: false,
      })
    })

    try {
      const materialId = await completeOne(submission)
      const finished = unwrap(await client.rpc('worker_finish_curriculum_submission', {
        job_id: submission.job_id,
        authoring_attempt: submission.authoring_attempt,
        processor_id: processorId,
        outcome: 'completed',
        error_code: null,
        error_message: null,
      }), 'finish curriculum submission') as boolean
      if (!finished) throw new Error('curriculum submission lease was lost before completion was recorded')
      results.push({ jobId: submission.job_id, status: 'completed', materialId })
    } catch (error) {
      let failure = classifyFailure(error)
      let message = error instanceof Error ? error.message : String(error)
      if (submission.authoring_attempt >= 5 && isSoftQualityOverrideEligible(error)) {
        try {
          const context = await loadGenerationContext(client, submission.job_id, submission.generation_worker_id)
          const materialId = await completeCurriculumJob({
            client,
            workerId: submission.generation_worker_id,
            context,
            curriculumPackage: submission.canonical_source,
            recordJobFailure: false,
            allowSoftQualityOverride: true,
          })
          unwrap(await client.rpc('worker_record_quality_override', {
            job_id: submission.job_id,
            authoring_attempt: submission.authoring_attempt,
            material_id: materialId,
            processor_id: processorId,
            override_reason: 'Attempt 5 exhausted; all remaining findings are in the explicit soft pedagogical allowlist.',
            rejection_evidence: error.evidence,
            rejection_message: message.slice(0, 2000),
          }), 'record quality override')
          results.push({ jobId: submission.job_id, status: 'delivered_with_quality_override', materialId })
          continue
        } catch (overrideError) {
          if (!(overrideError instanceof CurriculumQualityError)) {
            const overrideMessage = overrideError instanceof Error ? overrideError.message : String(overrideError)
            console.error('[AUDIT] quality_override_failed', { jobId: submission.job_id, error: overrideMessage })
            failure = classifyFailure(overrideError)
            message = overrideMessage
          }
        }
      }
      const finished = unwrap(await client.rpc('worker_finish_curriculum_submission', {
        job_id: submission.job_id,
        authoring_attempt: submission.authoring_attempt,
        processor_id: processorId,
        outcome: failure.status,
        error_code: failure.errorCode,
        error_message: message.slice(0, 2000),
        failure_evidence: failure.evidence ?? null,
      }), 'record curriculum submission failure') as boolean
      if (!finished) throw new Error(`curriculum submission lease was lost after ${failure.errorCode}`)
      results.push({ jobId: submission.job_id, status: failure.status, errorCode: failure.errorCode })
    }
  }

  return results
}
