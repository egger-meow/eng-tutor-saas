import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { buildPrivatePlanningCapsule, defaultRepoRoot, runLocalCodexAuthoringBatch, stableCodexExecutable, validatePublicResearchBrief, verifyCodexCli } from './local-codex-authoring.js'
import type { WorkerClient } from './pipeline.js'

describe('local Codex authoring preflight', () => {
  it('requires the intended model-independent ChatGPT-authenticated Codex CLI contract', async () => {
    const calls: Array<{ file: string; args: string[] }> = []
    const run = async (file: string, args: string[]) => {
      calls.push({ file, args })
      if (args[0] === '--version') return { stdout: 'codex-cli 0.149.1\n', stderr: '' }
      if (args[0] === 'exec') return { stdout: '--ephemeral --model --config --sandbox --ignore-user-config --skip-git-repo-check --output-last-message', stderr: '' }
      return { stdout: 'Logged in using ChatGPT\n', stderr: '' }
    }
    await expect(verifyCodexCli(run)).resolves.toEqual({ version: 'codex-cli 0.149.1', executable: stableCodexExecutable() })
    expect(calls).toEqual([
      { file: stableCodexExecutable(), args: ['--version'] },
      { file: stableCodexExecutable(), args: ['exec', '--help'] },
      { file: stableCodexExecutable(), args: ['login', 'status'] },
    ])
    expect(JSON.stringify(calls)).not.toContain('OPENAI_API_KEY')
  })

  it('rejects API-key or missing authentication instead of falling back', async () => {
    const run = async (_file: string, args: string[]) => {
      if (args[0] === '--version') return { stdout: 'codex-cli 0.149.1', stderr: '' }
      if (args[0] === 'exec') return { stdout: '--ephemeral --model --config --sandbox --ignore-user-config --skip-git-repo-check --output-last-message', stderr: '' }
      return { stdout: 'Logged in using an API key', stderr: '' }
    }
    await expect(verifyCodexCli(run)).rejects.toThrow('CODEX_CHATGPT_AUTH_REQUIRED')
  })
})

describe('one invocation owns one authoritative claim', () => {
  it('resolves the repository root independently of pnpm package cwd', () => {
    expect(defaultRepoRoot().replaceAll('\\', '/')).toMatch(/eng-tutor-saas\/$/u)
  })

  it('pins Windows execution to the stable npm Codex binary, not the desktop alpha binary', () => {
    if (process.platform === 'win32') {
      expect(stableCodexExecutable().replaceAll('\\', '/')).toContain('/npm/node_modules/@openai/codex/')
      expect(stableCodexExecutable().replaceAll('\\', '/')).not.toContain('/OpenAI/Codex/bin/')
    }
  })

  it('calls the local authoritative claim bridge exactly once', async () => {
    const rpcCalls: string[] = []
    const client: WorkerClient = {
      rpc: async (name) => {
        rpcCalls.push(name)
        if (name === 'worker_claim_local_authoring_batch') {
          return { data: { bridgeVersion: '1.4.0', claimed: [], claimedCount: 0, normalCapacity: 15, mandatoryCapacityOverride: false, oldestOutstandingDeadline: null }, error: null }
        }
        throw new Error(`unexpected rpc ${name}`)
      },
      storage: { from: () => { throw new Error('storage is not used by the authoring runner') } },
    }
    const run = async (file: string, args: string[]) => {
      if (file === 'git') return { stdout: '0123456789abcdef0123456789abcdef01234567\n', stderr: '' }
      if (args[0] === '--version') return { stdout: 'codex-cli 0.149.1\n', stderr: '' }
      if (args[0] === 'exec') return { stdout: '--ephemeral --model --config --sandbox --ignore-user-config --skip-git-repo-check --output-last-message', stderr: '' }
      return { stdout: 'Logged in using ChatGPT\n', stderr: '' }
    }
    const summary = await runLocalCodexAuthoringBatch(client, process.cwd(), run)
    expect(summary.claimed).toBe(0)
    expect(rpcCalls).toEqual(['worker_claim_local_authoring_batch'])
  })
})

describe('public research privacy boundary', () => {
  const context = {
    job: { id: '01234567-89ab-cdef-0123-456789abcdef', childId: 'fedcba98-7654-3210-fedc-ba9876543210' },
    profile: { name: 'Private Learner', grade_level: 'A2', interests: ['ocean animals'] },
    retryContext: { feedback: 'Needs more writing space' },
    inputFingerprint: 'abcdef0123456789',
  }

  it('bounds private planning input to topic fields without identifiers or feedback', () => {
    const capsule = buildPrivatePlanningCapsule(context)
    expect(capsule).toEqual({
      purpose: 'generalized English-learning public research',
      topics: ['ocean animals'],
      repairMode: true,
    })
    const serialized = JSON.stringify(capsule)
    expect(serialized).not.toContain('Private Learner')
    expect(serialized).not.toContain('01234567-89ab')
    expect(serialized).not.toContain('Needs more writing space')
  })

  it('allows only generalized, digit-free public topics', () => {
    expect(validatePublicResearchBrief({
      queries: ['ocean animal adaptations for young English learners'],
      topicSummary: 'Accessible facts about ocean animal adaptations and habitats',
    }, context)).toContain('ocean animal adaptations')
  })

  it.each([
    { queries: ['Private Learner ocean lesson'], topicSummary: 'general facts' },
    { queries: ['English facts for A2'], topicSummary: 'general facts' },
    { queries: ['writing activities'], topicSummary: 'Needs more writing space' },
    { queries: ['facts from https://example.com'], topicSummary: 'general facts' },
  ])('rejects private or identifying material before live web research', (brief) => {
    expect(() => validatePublicResearchBrief(brief, context)).toThrow('PUBLIC_RESEARCH_BRIEF_PRIVATE_DATA')
  })

  it('keeps private stages offline and gives live search only the screened brief', async () => {
    const source = await readFile(new URL('./local-codex-authoring.ts', import.meta.url), 'utf8')
    expect(source).toContain("const PRIVATE_CODEX_CONFIG = 'web_search=\"disabled\"'")
    expect(source).toContain("const PUBLIC_RESEARCH_CODEX_CONFIG = 'web_search=\"live\"'")
    expect(source).toContain('researchPrompt(brief)')
    expect(source).not.toContain('researchPrompt(context')
    expect(source).toContain("LOCAL_CODEX_MODEL = 'gpt-5.6-sol'")
    expect(source).toContain("LOCAL_CODEX_REASONING = 'low'")
    expect(source).toContain("'--skip-git-repo-check'")
  })
})
