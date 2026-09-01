import { spawn } from 'node:child_process'
import { hostname, tmpdir } from 'node:os'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  auditCurriculumPackage,
  validateCurriculumPackage,
  CURRENT_ENGINE_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_SCHEMA_VERSION,
  type CurriculumPackage,
} from '@paper-english/generator'
import type { WorkerClient } from './pipeline.js'

export const LOCAL_CODEX_MODEL = 'gpt-5.6-sol'
export const LOCAL_CODEX_REASONING = 'low'
export const MINIMUM_CODEX_VERSION = '0.144.0'
export const LOCAL_AUTHORING_WORKER_PREFIX = 'local-codex'
const MAX_REPAIR_ROUNDS = 2
const PRIVATE_CODEX_CONFIG = 'web_search="disabled"'
const PUBLIC_RESEARCH_CODEX_CONFIG = 'web_search="live"'

export function defaultRepoRoot(): string {
  return fileURLToPath(new URL('../../../', import.meta.url))
}

export function stableCodexExecutable(environment: NodeJS.ProcessEnv = process.env): string {
  if (process.platform !== 'win32') return 'codex'
  const appData = environment.APPDATA
  if (!appData) throw new Error('STABLE_CODEX_CLI_NOT_FOUND: APPDATA is unavailable')
  return resolve(
    appData,
    'npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe',
  )
}

type ClaimBatch = {
  bridgeVersion: string
  claimed: Array<Record<string, unknown>>
  claimedCount: number
  normalCapacity: number | null
  mandatoryCapacityOverride: boolean
  oldestOutstandingDeadline: string | null
}

type ProcessRunner = (file: string, args: string[], options?: { cwd?: string; input?: string }) => Promise<{ stdout: string; stderr: string }>

const runProcess: ProcessRunner = (file, args, options = {}) => new Promise((resolvePromise, reject) => {
  const child = spawn(file, args, { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => { stdout += chunk })
  child.stderr.on('data', (chunk: string) => { stderr += chunk })
  child.on('error', () => reject(new Error('LOCAL_PROCESS_START_FAILED')))
  child.on('close', (code) => {
    if (code === 0) resolvePromise({ stdout, stderr })
    else reject(new Error(`LOCAL_PROCESS_FAILED:${code ?? 'unknown'}`))
  })
  child.stdin.end(options.input ?? '')
})

export type LocalAuthoringSummary = {
  gitSha: string
  codexVersion: string
  model: typeof LOCAL_CODEX_MODEL
  reasoning: typeof LOCAL_CODEX_REASONING
  claimed: number
  submitted: number
  recovered: number
  failed: number
  mandatoryCapacityOverride: boolean
  oldestOutstandingDeadline: string | null
  jobs: Array<{ jobId: string; status: string; errorCode?: string }>
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
}

function parseVersion(text: string): [number, number, number] {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/u)
  if (!match) throw new Error('CODEX_VERSION_UNRECOGNIZED')
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function versionAtLeast(actual: string, minimum: string): boolean {
  const left = parseVersion(actual)
  const right = parseVersion(minimum)
  return left[0] > right[0] || (left[0] === right[0] && (left[1] > right[1] || (left[1] === right[1] && left[2] >= right[2])))
}

export async function verifyCodexCli(run: ProcessRunner = runProcess): Promise<{ version: string; executable: string }> {
  const executable = stableCodexExecutable()
  const versionResult = await run(executable, ['--version'])
  const version = versionResult.stdout.trim()
  if (!versionAtLeast(version, MINIMUM_CODEX_VERSION)) {
    throw new Error(`CODEX_VERSION_UNSUPPORTED: require >= ${MINIMUM_CODEX_VERSION}, found ${version}`)
  }
  const help = await run(executable, ['exec', '--help'])
  for (const flag of ['--ephemeral', '--model', '--config', '--sandbox', '--ignore-user-config', '--skip-git-repo-check', '--output-last-message']) {
    if (!help.stdout.includes(flag)) throw new Error(`CODEX_EXEC_UNSUPPORTED: missing ${flag}`)
  }
  const auth = await run(executable, ['login', 'status'])
  if (!/Logged in using ChatGPT/iu.test(`${auth.stdout}\n${auth.stderr}`)) {
    throw new Error('CODEX_CHATGPT_AUTH_REQUIRED: run codex login and choose ChatGPT; API-key authentication is not accepted')
  }
  return { version, executable }
}

function contextIdentity(context: Record<string, unknown>): { jobId: string; childId: string; fingerprint: string } {
  const job = context.job as Record<string, unknown> | undefined
  const jobId = typeof job?.id === 'string' ? job.id : ''
  const childId = typeof job?.childId === 'string' ? job.childId : ''
  const fingerprint = typeof context.inputFingerprint === 'string' ? context.inputFingerprint : ''
  if (!jobId || !childId || !fingerprint) throw new Error('CLAIM_CONTEXT_INVALID')
  return { jobId, childId, fingerprint }
}

function parseCodexJson(text: string): unknown {
  const trimmed = text.trim()
  try { return JSON.parse(trimmed) } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/iu)
  if (!fenced) throw new Error('CODEX_OUTPUT_NOT_JSON')
  return JSON.parse(fenced[1])
}

export function validateAuthoredPackage(raw: unknown, context: Record<string, unknown>): CurriculumPackage {
  const parsed = validateCurriculumPackage(raw)
  if (!parsed.success) {
    throw new Error(`LOCAL_VALIDATION_FAILED: ${parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`)
  }
  const pkg = parsed.curriculumPackage
  const identity = contextIdentity(context)
  if (pkg.metadata.jobId !== identity.jobId || pkg.metadata.childId !== identity.childId) throw new Error('LOCAL_METADATA_CONTEXT_MISMATCH')
  if (pkg.metadata.inputFingerprint !== identity.fingerprint) throw new Error('LOCAL_INPUT_FINGERPRINT_MISMATCH')
  if (pkg.metadata.model !== LOCAL_CODEX_MODEL) throw new Error('LOCAL_MODEL_METADATA_MISMATCH')
  if (pkg.metadata.schemaVersion !== CURRENT_SCHEMA_VERSION) throw new Error('LOCAL_SCHEMA_VERSION_MISMATCH')
  if (pkg.metadata.promptVersion !== `prompt/${CURRENT_PROMPT_VERSION}`) throw new Error('LOCAL_PROMPT_VERSION_MISMATCH')
  if (pkg.metadata.engineVersion !== CURRENT_ENGINE_VERSION) throw new Error('LOCAL_ENGINE_VERSION_MISMATCH')
  const audit = auditCurriculumPackage(pkg, {
    targetMinutes: typeof (context.profile as Record<string, unknown> | undefined)?.weekly_minutes === 'number'
      ? (context.profile as Record<string, number>).weekly_minutes
      : undefined,
  })
  const critical = audit.findings.filter((finding) => finding.severity === 'critical')
  if (critical.length > 0) throw new Error(`LOCAL_AUDIT_FAILED: ${critical.map((finding) => finding.message).join('; ')}`)
  return pkg
}

function planningPrompt(capsule: Record<string, unknown>): string {
  return [
    'You are a privacy boundary inside a local curriculum runner. Web access is disabled.',
    `Use this bounded private topic capsule: ${JSON.stringify(capsule)}`,
    'Produce a generalized public-research brief containing only impersonal English-learning topics and factual concepts useful for the material.',
    'Never include or paraphrase names, UUIDs, email addresses, school, age, grade/level, textbook state, feedback, mistakes, learning history, profile prose, private notes, or quotations from the context.',
    'Use no digits. Return only JSON shaped exactly as {"queries":["..."],"topicSummary":"..."}, with 1-4 short queries.',
  ].join('\n')
}

function collectTopicStrings(value: unknown, output: string[], key = ''): void {
  if (output.length >= 20) return
  if (typeof value === 'string' && /(interest|topic|theme|genre|subject|hobby)/iu.test(key)) {
    const normalized = value.trim().replace(/\s+/gu, ' ')
    if (normalized.length >= 3) output.push(normalized.slice(0, 120))
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTopicStrings(item, output, key)
    return
  }
  if (value && typeof value === 'object') {
    for (const [nestedKey, item] of Object.entries(value)) collectTopicStrings(item, output, nestedKey)
  }
}

export function buildPrivatePlanningCapsule(context: Record<string, unknown>): Record<string, unknown> {
  const topics: string[] = []
  collectTopicStrings(context, topics)
  return {
    purpose: 'generalized English-learning public research',
    topics: [...new Set(topics)].slice(0, 20),
    repairMode: context.retryContext !== undefined,
  }
}

function collectPrivateStrings(value: unknown, output: Set<string>, key = ''): void {
  if (typeof value === 'string' && /(id|name|email|school|grade|level|textbook|feedback|mistake|history|note|prose)/iu.test(key)) {
    const normalized = value.trim().toLowerCase()
    if (normalized.length >= 3) output.add(normalized)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPrivateStrings(item, output, key)
    return
  }
  if (value && typeof value === 'object') {
    for (const [nestedKey, item] of Object.entries(value)) collectPrivateStrings(item, output, nestedKey)
  }
}

export function validatePublicResearchBrief(raw: unknown, context: Record<string, unknown>): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('PUBLIC_RESEARCH_BRIEF_INVALID')
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.queries) || record.queries.length < 1 || record.queries.length > 4
    || record.queries.some((query) => typeof query !== 'string' || query.trim().length < 3 || query.length > 160)
    || typeof record.topicSummary !== 'string' || record.topicSummary.trim().length < 3 || record.topicSummary.length > 500) {
    throw new Error('PUBLIC_RESEARCH_BRIEF_INVALID')
  }
  const serialized = JSON.stringify({ queries: record.queries, topicSummary: record.topicSummary })
  const normalized = serialized.toLowerCase()
  if (/\d|[\w.+-]+@[\w.-]+|https?:\/\/|\b(name|school|grade|level|textbook|feedback|mistake|history|profile|child|student|uuid|note)s?\b/iu.test(normalized)) {
    throw new Error('PUBLIC_RESEARCH_BRIEF_PRIVATE_DATA')
  }
  const privateStrings = new Set<string>()
  collectPrivateStrings(context, privateStrings)
  for (const privateString of privateStrings) {
    if (normalized.includes(privateString)) throw new Error('PUBLIC_RESEARCH_BRIEF_PRIVATE_DATA')
  }
  return serialized
}

function researchPrompt(brief: string): string {
  return [
    'Research the following privacy-screened, generalized English-learning brief using first-party live web search.',
    'Do not inspect local files. Do not infer or request learner identity or personal context.',
    `Brief: ${brief}`,
    'Return concise factual grounding with source URLs. Do not write curriculum JSON.',
  ].join('\n')
}

function authoringPrompt(bundle: string, context: Record<string, unknown>, grounding: string, previousOutput?: string, issue?: string): string {
  const retry = previousOutput
    ? `This is a surgical repair round. Repair only the listed failures and dependent answer/tracking fragments while preserving valid content, stable question IDs, mappings, and metadata.inputFingerprint byte-for-byte. Failures: ${issue}\nPREVIOUS PACKAGE:\n${previousOutput}`
    : 'Author the claimed package. If retryContext exists, preserve the previous valid package and surgically repair only its deterministic findings.'
  return [
    'You are the private curriculum author inside a reviewed local runner. Do not access Supabase or mutate repository files.',
    `AUTHORITATIVE PRODUCTION BUNDLE:\n${bundle}`,
    `PRIVATE CLAIMED CONTEXT (never quote or expose):\n${JSON.stringify(context)}`,
    `PUBLIC FACTUAL GROUNDING (web access is disabled in this private stage):\n${grounding}`,
    retry,
    `Set metadata.model exactly to ${LOCAL_CODEX_MODEL}, schemaVersion to ${CURRENT_SCHEMA_VERSION}, promptVersion to prompt/${CURRENT_PROMPT_VERSION}, engineVersion to ${CURRENT_ENGINE_VERSION}, and copy the server inputFingerprint exactly.`,
    'Every translation, sentence-production, or short-response item without options must provide writingLines >= 1 or a valid non-empty responseLayout.',
    'Return only the complete canonical Curriculum Package JSON object. Do not use Markdown fences or commentary.',
  ].join('\n')
}

async function cleanupRuntime(runtimeRoot: string): Promise<void> {
  await mkdir(runtimeRoot, { recursive: true })
  const root = resolve(runtimeRoot)
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = resolve(root, entry.name)
    if (!path.startsWith(root + '\\') && !path.startsWith(root + '/')) continue
    const info = await stat(path)
    if (Date.now() - info.mtimeMs > 24 * 60 * 60 * 1000) await rm(path, { recursive: true, force: true })
  }
}

async function authorOne(repoRoot: string, context: Record<string, unknown>, codexExecutable: string, run: ProcessRunner): Promise<CurriculumPackage> {
  const { jobId } = contextIdentity(context)
  const jobDir = resolve(repoRoot, '.runtime/private-generation', jobId)
  await mkdir(jobDir, { recursive: true })
  const contextPath = resolve(jobDir, 'context.json')
  await writeFile(contextPath, JSON.stringify(context), { encoding: 'utf8', mode: 0o600 })
  const planningDir = await mkdtemp(resolve(tmpdir(), 'paper-english-private-plan-'))
  let brief: string
  try {
    const briefPath = resolve(planningDir, 'research-brief.json')
    await run(codexExecutable, [
      'exec', '--ephemeral', '--model', LOCAL_CODEX_MODEL,
      '--config', `model_reasoning_effort="${LOCAL_CODEX_REASONING}"`,
      '--config', PRIVATE_CODEX_CONFIG,
      '--sandbox', 'read-only', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--color', 'never',
      '--output-last-message', briefPath,
      '-',
    ], { cwd: planningDir, input: planningPrompt(buildPrivatePlanningCapsule(context)) })
    brief = validatePublicResearchBrief(parseCodexJson(await readFile(briefPath, 'utf8')), context)
  } finally {
    await rm(planningDir, { recursive: true, force: true })
  }
  const publicDir = await mkdtemp(resolve(tmpdir(), 'paper-english-public-research-'))
  const groundingPath = resolve(jobDir, 'grounding.md')
  const publicGroundingPath = resolve(publicDir, 'grounding.md')
  try {
    await run(codexExecutable, [
      'exec', '--ephemeral', '--model', LOCAL_CODEX_MODEL,
      '--config', `model_reasoning_effort="${LOCAL_CODEX_REASONING}"`,
      '--config', PUBLIC_RESEARCH_CODEX_CONFIG,
      '--sandbox', 'read-only', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--color', 'never',
      '--output-last-message', publicGroundingPath,
      '-',
    ], { cwd: publicDir, input: researchPrompt(brief) })
    await writeFile(groundingPath, await readFile(publicGroundingPath, 'utf8'), { encoding: 'utf8', mode: 0o600 })
  } finally {
    await rm(publicDir, { recursive: true, force: true })
  }
  let previousPath: string | undefined
  let issue: string | undefined
  const bundle = await readFile(resolve(repoRoot, 'packages/generator/bundles/production-authoring-bundle.md'), 'utf8')
  const grounding = await readFile(groundingPath, 'utf8')
  for (let round = 0; round <= MAX_REPAIR_ROUNDS; round += 1) {
    const outputPath = resolve(jobDir, `package-${round}.json`)
    await run(codexExecutable, [
      'exec', '--ephemeral', '--model', LOCAL_CODEX_MODEL,
      '--config', `model_reasoning_effort="${LOCAL_CODEX_REASONING}"`,
      '--config', PRIVATE_CODEX_CONFIG,
      '--sandbox', 'read-only', '--ignore-user-config', '--ignore-rules', '--color', 'never',
      '--output-last-message', outputPath,
      '-',
    ], {
      cwd: repoRoot,
      input: authoringPrompt(bundle, context, grounding, previousPath ? await readFile(previousPath, 'utf8') : undefined, issue),
    })
    const raw = parseCodexJson(await readFile(outputPath, 'utf8'))
    try {
      return validateAuthoredPackage(raw, context)
    } catch (error) {
      issue = error instanceof Error ? error.message.slice(0, 6000) : 'LOCAL_VALIDATION_FAILED'
      previousPath = outputPath
      if (round === MAX_REPAIR_ROUNDS) throw error
    }
  }
  throw new Error('LOCAL_REPAIR_EXHAUSTED')
}

async function recoverSubmission(client: WorkerClient, jobId: string, workerId: string): Promise<boolean> {
  const status = unwrap(await client.rpc('worker_local_curriculum_submission_status', { job_id: jobId, worker_id: workerId }), 'read submission status') as Record<string, unknown>
  return status.submissionFound === true
}

async function releaseConfirmedUnsubmitted(client: WorkerClient, jobId: string, workerId: string, code: string): Promise<void> {
  if (await recoverSubmission(client, jobId, workerId)) return
  unwrap(await client.rpc('worker_release_local_unsubmitted_claim', {
    job_id: jobId,
    worker_id: workerId,
    error_code: code,
    error_message: 'Local authoring ended before an immutable submission was confirmed.',
  }), 'release unsubmitted claim')
}

export async function runLocalCodexAuthoringBatch(
  client: WorkerClient,
  repoRoot = defaultRepoRoot(),
  run: ProcessRunner = runProcess,
): Promise<LocalAuthoringSummary> {
  const preflight = await verifyCodexCli(run)
  const git = await run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot })
  const gitSha = git.stdout.trim()
  if (!/^[a-f0-9]{40}$/u.test(gitSha)) throw new Error('GIT_SHA_UNAVAILABLE')
  await stat(resolve(repoRoot, 'packages/generator/bundles/production-authoring-bundle.md'))
  const runtimeRoot = resolve(repoRoot, '.runtime/private-generation')
  await cleanupRuntime(runtimeRoot)
  const workerId = `${LOCAL_AUTHORING_WORKER_PREFIX}-${hostname().toLowerCase().replace(/[^a-z0-9-]/gu, '-')}`
  const claim = unwrap(await client.rpc('worker_claim_local_authoring_batch', { worker_id: workerId }), 'claim local authoring batch') as ClaimBatch
  const summary: LocalAuthoringSummary = {
    gitSha, codexVersion: preflight.version, model: LOCAL_CODEX_MODEL, reasoning: LOCAL_CODEX_REASONING,
    claimed: claim.claimed.length, submitted: 0, recovered: 0, failed: 0,
    mandatoryCapacityOverride: claim.mandatoryCapacityOverride,
    oldestOutstandingDeadline: claim.oldestOutstandingDeadline,
    jobs: [],
  }
  for (const context of claim.claimed) {
    const { jobId } = contextIdentity(context)
    const jobDir = resolve(runtimeRoot, jobId)
    try {
      const pkg = await authorOne(repoRoot, context, preflight.executable, run)
      const payload = JSON.stringify(pkg)
      const submitted = await client.rpc('worker_submit_local_curriculum_package', {
        p_job_id: jobId, p_generation_worker_id: workerId, p_payload_text: payload,
      })
      if (submitted.error) {
        if (await recoverSubmission(client, jobId, workerId)) {
          summary.recovered += 1
          summary.jobs.push({ jobId, status: 'SUBMITTED_RECOVERED' })
        } else {
          await releaseConfirmedUnsubmitted(client, jobId, workerId, 'SUBMIT_TRANSPORT_FAILED')
          throw new Error('SUBMIT_TRANSPORT_FAILED')
        }
      } else {
        summary.submitted += 1
        summary.jobs.push({ jobId, status: 'SUBMITTED_AWAITING_FINISHER' })
      }
      await rm(jobDir, { recursive: true, force: true })
    } catch (error) {
      const code = error instanceof Error && /^[A-Z][A-Z0-9_]+/u.test(error.message)
        ? error.message.match(/^[A-Z][A-Z0-9_]+/u)?.[0] ?? 'LOCAL_AUTHORING_FAILED'
        : 'LOCAL_AUTHORING_FAILED'
      try { await releaseConfirmedUnsubmitted(client, jobId, workerId, code) } catch {}
      summary.failed += 1
      summary.jobs.push({ jobId, status: 'FAILED_RELEASED', errorCode: code })
      await rm(jobDir, { recursive: true, force: true })
    }
  }
  return summary
}
