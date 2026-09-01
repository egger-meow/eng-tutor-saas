import { readFile } from 'node:fs/promises'
import { createWorkerClient } from './client.js'
import { claimJobs, completeCurriculumJob, completeJob, failClaimedJob, loadGenerationContext } from './pipeline.js'
import { buildCurriculumPromptBundle } from './prompt-v2.js'
import { processCurriculumSubmissions } from './submission-processor.js'
import { dispatchMaterialEmails } from './material-email.js'
import { createSmtpEmailProvider } from './transactional-email.js'
import { runLocalCodexAuthoringBatch } from './local-codex-authoring.js'
import {
  checkActiveLeaseState,
  claimProductionBatch,
  getSchedulerMode,
  getSubmissionStatus,
  releaseUnsubmittedClaim,
  setSchedulerMode,
  submitProductionPackage,
  validatePreSubmitPackage,
} from './authoring-helpers.js'

function option(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (required && !value) throw new Error(`--${name} is required`)
  return value
}

async function main(): Promise<void> {
  const command = process.argv[2]
  const client = createWorkerClient()

  if (command === 'production-authoring') {
    const action = process.argv[3]
    if (!action) {
      throw new Error('Action required: status, claim, validate, submit, submission-status, release, mode')
    }

    if (action === 'status') {
      const workerId = option('worker', false)
      const result = await checkActiveLeaseState(client, workerId)
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return
    }

    if (action === 'claim') {
      const workerId = option('worker')!
      const result = await claimProductionBatch(client, workerId)
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return
    }

    if (action === 'validate') {
      const pkgPath = option('package')!
      const ctxPath = option('context')!
      const rawPackage = JSON.parse(await readFile(pkgPath, 'utf8')) as unknown
      const rawContext = JSON.parse(await readFile(ctxPath, 'utf8')) as Record<string, unknown>
      const result = validatePreSubmitPackage(rawPackage, rawContext)
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      if (!result.valid) process.exitCode = 1
      return
    }

    if (action === 'submit') {
      const workerId = option('worker')!
      const jobId = option('job')!
      const pkgPath = option('package')!
      const rawPackage = JSON.parse(await readFile(pkgPath, 'utf8')) as unknown
      const result = await submitProductionPackage(client, workerId, jobId, rawPackage)
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      if (!result.submitted) process.exitCode = 1
      return
    }

    if (action === 'submission-status') {
      const workerId = option('worker')!
      const jobId = option('job')!
      const result = await getSubmissionStatus(client, workerId, jobId)
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return
    }

    if (action === 'release') {
      const workerId = option('worker')!
      const jobId = option('job')!
      const code = option('code')!
      const message = option('message')!
      const result = await releaseUnsubmittedClaim(client, workerId, jobId, code, message)
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      return
    }

    if (action === 'mode') {
      const modeArg = process.argv[4] ?? option('set', false)
      if (modeArg) {
        if (modeArg !== 'local' && modeArg !== 'online') {
          throw new Error('Mode must be "local" or "online"')
        }
        const updated = await setSchedulerMode(client, modeArg)
        process.stdout.write(`${JSON.stringify({ mode: updated }, null, 2)}\n`)
        return
      }
      const current = await getSchedulerMode(client)
      process.stdout.write(`${JSON.stringify({ mode: current }, null, 2)}\n`)
      return
    }

    throw new Error(`Unknown production-authoring action: ${action}`)
  }

  if (command === 'author-local-codex') {
    const result = await runLocalCodexAuthoringBatch(client)
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    if (result.failed > 0) process.exitCode = 1
    return
  }

  if (command === 'dispatch-material-emails') {
    const workerId = option('worker') ?? ''
    const smtpPort = Number(process.env.SMTP_PORT?.trim() || '465')
    const result = await dispatchMaterialEmails(client, workerId, {
      materialLinkSecret: process.env.MATERIAL_LINK_SECRET ?? '',
      siteUrl: process.env.SITE_URL?.trim() || 'https://paperbond.jjmowlab.com',
      emailFrom: process.env.EMAIL_FROM?.trim() || '紙屬英文 <noreply@paperenglish.com>',
    }, createSmtpEmailProvider({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: smtpPort,
      secure: (process.env.SMTP_SECURE?.trim() || String(smtpPort === 465)).toLowerCase() === 'true',
      user: process.env.SMTP_USER?.trim() || '',
      password: process.env.SMTP_PASS ?? '',
    }), Number(option('limit', false) ?? '10'))
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    if (result.failed > 0) process.exitCode = 1
    return
  }

  if (command === 'process-submissions') {
    const processorId = option('processor') ?? ''
    const claimLimit = Number(option('limit', false) ?? '5')
    if (!Number.isInteger(claimLimit) || claimLimit < 1 || claimLimit > 25) {
      throw new Error('--limit must be an integer between 1 and 25')
    }
    const results = await processCurriculumSubmissions(client, processorId, claimLimit)
    process.stdout.write(`${JSON.stringify({ claimed: results.length, results }, null, 2)}\n`)
    if (results.some((result) => result.status !== 'completed')) process.exitCode = 1
    return
  }

  const workerId = option('worker') ?? ''

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
    process.stdout.write(`${JSON.stringify({ jobId, materialId, schema: '2.3.0' })}\n`)
    return
  }

  throw new Error('Usage: worker <author-local-codex|claim|context|prompt-v2|fail|complete|complete-v2|process-submissions|dispatch-material-emails> [options]')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown worker error'
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
