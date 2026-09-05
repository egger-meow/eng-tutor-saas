import { createWorkerClient } from './client.js'
import { processWeek1FastSubmissions } from './week1-fast-publisher.js'

function option(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

async function main(): Promise<void> {
  const processorId = option('processor', 'github-actions-week1-fast') ?? ''
  const claimLimit = Number(option('limit', '5'))
  if (!processorId || processorId.length < 3) throw new Error('--processor is required')
  if (!Number.isInteger(claimLimit) || claimLimit < 1 || claimLimit > 25) {
    throw new Error('--limit must be an integer between 1 and 25')
  }

  const results = await processWeek1FastSubmissions(createWorkerClient(), processorId, claimLimit)
  process.stdout.write(`${JSON.stringify({ claimed: results.length, results }, null, 2)}\n`)
  if (results.some((result) => result.status !== 'completed')) process.exitCode = 1
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Week 1 fast publisher error'
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
