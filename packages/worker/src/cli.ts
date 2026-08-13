import { readFile } from 'node:fs/promises'
import { createWorkerClient } from './client.js'
import { claimJobs, completeCurriculumJob, completeJob, failClaimedJob, loadGenerationContext } from './pipeline.js'
import { buildCurriculumPromptBundle } from './prompt-v2.js'

function option(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (required && !value) throw new Error(`--${name} is required`)
  return value
}

async function main(): Promise<void> {
  const command = process.argv[2]
  const workerId = option('worker') ?? ''
  const client = createWorkerClient()

  if (command === 'claim') {
    const jobs = await claimJobs(client, workerId)
    const contexts = await Promise.all(jobs.map((job) => loadGenerationContext(client, job.id, workerId)))
    process.stdout.write(`${JSON.stringify(contexts, null, 2)}\n`)
    return
  }

  if (command === 'context') {
    const context = await loadGenerationContext(client, option('job') ?? '', workerId)
    process.stdout.write(`${JSON.stringify(context, null, 2)}\n`)
    return
  }

  if (command === 'prompt-v2') {
    const context = await loadGenerationContext(client, option('job') ?? '', workerId)
    process.stdout.write(`${await buildCurriculumPromptBundle(context)}\n`)
    return
  }

  if (command === 'fail') {
    const jobId = option('job') ?? ''
    const errorCode = option('code') ?? ''
    const errorMessage = option('message') ?? ''
    await failClaimedJob(client, workerId, jobId, errorCode, errorMessage)
    process.stdout.write(`${JSON.stringify({ jobId, status: 'failed', errorCode })}\n`)
    return
  }

  if (command === 'complete') {
    const jobId = option('job') ?? ''
    const context = await loadGenerationContext(client, jobId, workerId)
    const lesson = JSON.parse(await readFile(option('lesson') ?? '', 'utf8')) as unknown
    const materialId = await completeJob({
      client,
      workerId,
      context,
      lesson,
      promptVersion: option('prompt-version') ?? '',
      generatorVersion: option('generator-version') ?? '',
      modelName: option('model') ?? '',
    })
    process.stdout.write(`${JSON.stringify({ jobId, materialId })}\n`)
    return
  }

  if (command === 'complete-v2') {
    const jobId = option('job') ?? ''
    const context = await loadGenerationContext(client, jobId, workerId)
    const curriculumPackage = JSON.parse(await readFile(option('package') ?? '', 'utf8')) as unknown
    const materialId = await completeCurriculumJob({ client, workerId, context, curriculumPackage })
    process.stdout.write(`${JSON.stringify({ jobId, materialId, schema: '2.0.0' })}\n`)
    return
  }

  throw new Error('Usage: worker <claim|context|prompt-v2|fail|complete|complete-v2> --worker <id> [options]')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown worker error'
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
