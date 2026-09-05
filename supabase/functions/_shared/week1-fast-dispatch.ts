type RpcResult<T = unknown> = Promise<{ data: T | null; error: { message?: string } | null }>

type RpcClient = {
  rpc: (name: string, params?: Record<string, unknown>) => RpcResult
}

export type Week1GitHubConfig = {
  token: string
  repo: string
  wakePrNumber: string
}

export type DispatchSummary = {
  attempted: number
  sent: number
  failed: number
}

type FetchLike = typeof fetch

function githubHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'content-type': 'application/json',
    'x-github-api-version': '2022-11-28',
  }
}

function safeErrorCode(response: Response): string {
  return `GITHUB_${response.status}`.slice(0, 100)
}

async function claimIds(client: RpcClient, rpcName: string): Promise<string[]> {
  const { data, error } = await client.rpc(rpcName, { p_limit: 10 })
  if (error) throw new Error(`${rpcName} failed`)
  if (!Array.isArray(data)) return []
  return data
    .map((row) => row && typeof row === 'object' && 'id' in row ? String((row as { id: unknown }).id) : '')
    .filter(Boolean)
}

async function finishOutbox(
  client: RpcClient,
  rpcName: string,
  id: string,
  success: boolean,
  errorCode: string | null,
): Promise<void> {
  const { error } = await client.rpc(rpcName, {
    p_id: id,
    p_success: success,
    p_error_code: errorCode,
  })
  if (error) console.error('[week1-fast] could not finalize dispatch outbox state')
}

export async function dispatchWeek1WakeDoorbells(
  client: RpcClient,
  config: Week1GitHubConfig,
  fetchImpl: FetchLike = fetch,
): Promise<DispatchSummary> {
  const ids = await claimIds(client, 'worker_claim_week1_wake_outbox')
  const summary: DispatchSummary = { attempted: ids.length, sent: 0, failed: 0 }

  for (const id of ids) {
    let success = false
    let errorCode: string | null = null
    try {
      const response = await fetchImpl(`https://api.github.com/repos/${config.repo}/issues/${config.wakePrNumber}/comments`, {
        method: 'POST',
        headers: githubHeaders(config.token),
        body: JSON.stringify({ body: `week1-wake:v1:${id}` }),
      })
      success = response.ok
      if (!success) errorCode = safeErrorCode(response)
    } catch {
      errorCode = 'GITHUB_TRANSPORT_FAILED'
    }
    await finishOutbox(client, 'worker_finish_week1_wake_outbox', id, success, errorCode)
    if (success) summary.sent += 1
    else summary.failed += 1
  }

  return summary
}

export async function dispatchWeek1PublishDoorbells(
  client: RpcClient,
  config: Week1GitHubConfig,
  fetchImpl: FetchLike = fetch,
): Promise<DispatchSummary> {
  const ids = await claimIds(client, 'worker_claim_week1_publish_outbox')
  const summary: DispatchSummary = { attempted: ids.length, sent: 0, failed: 0 }

  for (const id of ids) {
    let success = false
    let errorCode: string | null = null
    try {
      const response = await fetchImpl(`https://api.github.com/repos/${config.repo}/dispatches`, {
        method: 'POST',
        headers: githubHeaders(config.token),
        body: JSON.stringify({
          event_type: 'week1-fast-publish',
          client_payload: {},
        }),
      })
      success = response.ok
      if (!success) errorCode = safeErrorCode(response)
    } catch {
      errorCode = 'GITHUB_TRANSPORT_FAILED'
    }
    await finishOutbox(client, 'worker_finish_week1_publish_outbox', id, success, errorCode)
    if (success) summary.sent += 1
    else summary.failed += 1
  }

  return summary
}
