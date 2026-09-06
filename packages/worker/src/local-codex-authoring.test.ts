import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  buildPrivatePlanningCapsule,
  defaultRepoRoot,
  extractTargetIdsForHistory,
  prepareAuthoringBundleWithPrecedents,
  runLocalCodexAuthoringBatch,
  stableCodexExecutable,
  validatePublicResearchBrief,
  verifyCodexCli,
} from './local-codex-authoring.js'
import { adaptAssessmentIntent } from '@paper-english/generator'
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
    const summary = await runLocalCodexAuthoringBatch(client, defaultRepoRoot(), run)
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

  it('allows screened public topics', () => {
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
    expect(source).toContain('researchPrompt(brief, interestPolicy)')
    expect(source).not.toContain('researchPrompt(context')
    expect(source).toContain("LOCAL_CODEX_MODEL = 'gpt-5.6-sol'")
    expect(source).toContain("LOCAL_CODEX_REASONING = 'low'")
    expect(source).toContain("'--skip-git-repo-check'")
  })
})


it('retains public works, artists, and numbered titles without importing retry topics', () => {
  const context = { profile: { preferences: { favoriteMusic: ['keshi', '2NE1', 'IU'], favoriteAnime: ['Your Name'] } }, retryContext: { topics: ['private repair'] } }
  expect(buildPrivatePlanningCapsule(context).topics).toEqual(['keshi', '2NE1', 'IU', 'Your Name'])
  expect(validatePublicResearchBrief({ queries: ['2NE1 debut recording process', 'Your Name animation production'], topicSummary: 'Creative decisions behind public works' }, context)).toContain('2NE1')
})

describe('selective CAP precedent authoring bundle compaction', () => {
  it('replaces 195-card routing index with bounded retrieved cards and verifies context reduction', async () => {
    const rawBundlePath = new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url)
    const rawBundle = await readFile(rawBundlePath, 'utf8')

    const context = {
      profile: { grade_level: 'A2_basic', interests: ['biology', 'science'] },
      primarySkill: 'information_integration',
      cognitiveDepth: 'D3_multi_step_synthesis',
    }

    const { bundle: activeBundle, candidateRefs, expandedCount } = await prepareAuthoringBundleWithPrecedents(
      rawBundle,
      context,
      { repoRoot: defaultRepoRoot() },
    )

    expect(candidateRefs.length).toBeGreaterThanOrEqual(1)
    expect(expandedCount).toBe(candidateRefs.length)
    expect(activeBundle).toContain('## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)')
    expect(activeBundle).not.toContain('## 2B. Compact CAP Precedent Routing Index')
    expect(activeBundle).toContain('## 3. Model Quality Profile Resolution')

    // Verify significant context compaction: total bundle size remains bounded under 110k chars (vs >180k with 195 cards)
    expect(activeBundle.length).toBeLessThan(110_000)
    // Verify that precedent cards were injected into section 2B
    expect(activeBundle).toContain(candidateRefs[0])
  })

  it('avoids silent fallback to discourse_relationship when primarySkill is omitted', async () => {
    const rawBundlePath = new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url)
    const rawBundle = await readFile(rawBundlePath, 'utf8')

    const context = {
      profile: { grade_level: 'A2_basic', interests: ['biology'] },
    }

    const result = await prepareAuthoringBundleWithPrecedents(
      rawBundle,
      context,
      { repoRoot: defaultRepoRoot() },
    )

    expect(result.candidateRefs).toEqual([])
    expect(result.expandedCount).toBe(0)
    expect(result.noPrecedentReason).toBe('missing_primary_skill')
  })

  it('supports post-plan retrieval for assessment items with cross-item deduplication', async () => {
    const rawBundlePath = new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url)
    const rawBundle = await readFile(rawBundlePath, 'utf8')

    const context = {
      profile: { grade_level: 'B1_intermediate' },
    }

    const assessmentPlans = [
      { itemId: 'C1', targetSkill: 'purpose_speaker_intent', cognitiveDepth: 'inferential' as const },
      { itemId: 'C2', targetSkill: 'purpose_speaker_intent', cognitiveDepth: 'inferential' as const },
      { itemId: 'C3', targetSkill: 'evaluative_judgment', cognitiveDepth: 'evaluative' as const },
    ]

    const result = await prepareAuthoringBundleWithPrecedents(
      rawBundle,
      context,
      { repoRoot: defaultRepoRoot(), assessmentPlans },
    )

    expect(result.candidateRefs.length).toBeGreaterThanOrEqual(1)
    expect(result.expandedCount).toBe(result.candidateRefs.length)
    // Cross-item deduplication: candidateRefs contains unique entries
    const uniqueRefs = new Set(result.candidateRefs)
    expect(uniqueRefs.size).toBe(result.candidateRefs.length)
    expect(result.bundle).toContain(result.candidateRefs[0])
    expect(result.itemResults).toBeDefined()
    expect(result.itemResults?.length).toBe(3)
    expect(result.itemResults?.[0].itemId).toBe('C1')
    expect(result.itemResults?.[1].itemId).toBe('C2')
    expect(result.itemResults?.[2].itemId).toBe('C3')
  })

  it('extracts targeted older evidence query IDs deterministically up to limit', () => {
    const context = {
      targetIds: ['direct-1', 'direct-2'],
      lifetimeLearningMemory: {
        vocabulary: {
          dueTargetIds: ['vocab-due-1'],
          verifiedWeakTargetIds: ['vocab-weak-1'],
          regressionTargetIds: ['vocab-reg-1'],
        },
        grammar: {
          dueTargetIds: ['grammar-due-1'],
        },
      },
    }
    const extracted = extractTargetIdsForHistory(context)
    expect(extracted).toEqual([
      'direct-1',
      'direct-2',
      'vocab-due-1',
      'vocab-weak-1',
      'vocab-reg-1',
      'grammar-due-1',
    ])
  })

  it('adapts grade numbers and difficulty strings without defaulting junior high to A1', () => {
    const p9 = adaptAssessmentIntent({ targetSkill: 'detail_extraction' }, 9)
    expect(p9.targetLanguageDifficulty).toBe('B1_intermediate')

    const p8 = adaptAssessmentIntent({ targetSkill: 'detail_extraction' }, { grade: 8 })
    expect(p8.targetLanguageDifficulty).toBe('A2_basic')

    const p7 = adaptAssessmentIntent({ targetSkill: 'detail_extraction' }, { grade_level: 'Grade 7' })
    expect(p7.targetLanguageDifficulty).toBe('A2_basic')

    const p6 = adaptAssessmentIntent({ targetSkill: 'detail_extraction' }, 6)
    expect(p6.targetLanguageDifficulty).toBe('A1_elementary')
  })
})


