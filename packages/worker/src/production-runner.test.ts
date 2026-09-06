import { describe, expect, it, vi } from 'vitest'
import { writeFile } from 'node:fs/promises'
import {
  runLocalCodexAuthoringBatch,
  defaultRepoRoot,
  LOCAL_CODEX_MODEL,
} from './local-codex-authoring.js'
import {
  CURRENT_ENGINE_VERSION,
  CURRENT_PROMPT_VERSION,
} from '@paper-english/generator'
import { makeValidV24Package } from './authoring-helpers.test.js'
import type { WorkerClient } from './pipeline.js'

describe('Production Runner Orchestration (End-to-End)', () => {
  it('starts from an ordinary claim lacking assessmentPlans, fetches targeted history, performs post-plan CAP retrieval, and submits', async () => {
    const jobId = '01234567-89ab-cdef-0123-456789abcdef'
    const childId = 'fedcba98-7654-3210-fedc-ba9876543210'
    const fingerprint = 'abcdef0123456789abcdef0123456789'
    const cutoffTimestamp = '2026-09-06T12:00:00.000Z'

    // 1. Ordinary claimed context lacking assessmentPlans
    const claimedContext = {
      job: { id: jobId, childId },
      profile: {
        id: childId,
        name: 'Learner One',
        grade: 'A2_basic',
        grade_level: 'A2_basic',
        interests: ['keshi', 'acoustic songwriting'],
        weekly_minutes: 45,
      },
      preferences: {
        topics: ['keshi', 'music production'],
      },
      targetIds: ['g_past_continuous', 'v_arrangement'],
      lifetimeLearningMemory: {
        vocabulary: {
          total: 8,
          dueTargetIds: ['v_arrangement'],
          verifiedWeakTargetIds: [],
          uncertainTargetIds: [],
          masteredTargetIds: [],
          regressionTargetIds: [],
        },
        grammar: {
          total: 4,
          dueTargetIds: ['g_past_continuous'],
          verifiedWeakTargetIds: [],
          uncertainTargetIds: [],
          masteredTargetIds: [],
          regressionTargetIds: [],
        },
      },
      diversityCapsule: {
        deliveryMemory: [
          {
            materialWeek: 1,
            responseLayouts: ['lines'],
            primarySkill: 'detail_extraction',
          },
        ],
      },
      cutoffTimestamp,
      claimSnapshotId: jobId,
      inputFingerprint: fingerprint,
      targetReleaseId: 'rel_1.8.1',
    }

    const rpcCalls: Array<{ name: string; params: any }> = []
    let targetedHistoryCalled = false
    let submittedPackage: any = null

    const client: WorkerClient = {
      rpc: vi.fn(async (name: string, params: any) => {
        rpcCalls.push({ name, params })
        if (name === 'worker_claim_local_authoring_batch') {
          return {
            data: {
              bridgeVersion: '1.4.0',
              claimed: [claimedContext],
              claimedCount: 1,
              normalCapacity: 15,
              mandatoryCapacityOverride: false,
              oldestOutstandingDeadline: null,
            },
            error: null,
          }
        }
        if (name === 'worker_fetch_targeted_student_history') {
          targetedHistoryCalled = true
          expect(params.job_id).toBe(jobId)
          expect(params.target_ids).toEqual(expect.arrayContaining(['g_past_continuous', 'v_arrangement']))
          expect(params.cutoff_timestamp).toBe(cutoffTimestamp)
          return {
            data: {
              jobId,
              childId,
              cutoffTimestamp,
              targetIds: params.target_ids,
              evidence: [
                {
                  targetType: 'grammar',
                  targetId: 'g_past_continuous',
                  result: 'partial',
                  observedAt: '2026-09-05T10:00:00.000Z',
                },
              ],
              evidenceCount: 1,
              manifestHash: 'sha256:abcd1234ef567890',
            },
            error: null,
          }
        }
        if (name === 'worker_submit_local_curriculum_package') {
          expect(params.p_job_id).toBe(jobId)
          submittedPackage = JSON.parse(params.p_payload_text)
          return { data: { success: true }, error: null }
        }
        throw new Error(`Unexpected RPC: ${name}`)
      }),
      storage: { from: () => ({ upload: vi.fn() } as any) },
    }

    let observedAuthoringPrompt = ''

    // Simulated Codex runner
    const run = vi.fn(async (executable: string, args: string[], options?: any) => {
      if (executable === 'git') {
        return { stdout: '0123456789abcdef0123456789abcdef01234567\n', stderr: '' }
      }
      if (args[0] === '--version') {
        return { stdout: 'codex-cli 0.149.1\n', stderr: '' }
      }
      if (args[0] === 'exec' && args[1] === '--help') {
        return { stdout: '--ephemeral --model --config --sandbox --ignore-user-config --skip-git-repo-check --output-last-message', stderr: '' }
      }
      if (args[0] === 'login') {
        return { stdout: 'Logged in using ChatGPT\n', stderr: '' }
      }

      const outIndex = args.indexOf('--output-last-message')
      const outputPath = outIndex !== -1 ? args[outIndex + 1] : undefined

      // Stage 1: Private Topic Planning
      if (options?.input && options.input.includes('bounded private topic capsule')) {
        expect(outputPath).toBeDefined()
        const brief = {
          queries: ['keshi acoustic songwriting techniques', 'home studio recording arrangements'],
          topicSummary: 'Detailed overview of keshi lo-fi acoustic guitar arrangements and vocal layering.',
        }
        await writeFile(outputPath!, JSON.stringify(brief), 'utf8')
        return { stdout: '', stderr: '' }
      }

      // Stage 3: Public Research Grounding
      if (options?.input && options.input.includes('privacy-screened public-interest research brief')) {
        expect(outputPath).toBeDefined()
        const grounding = [
          '# Grounding: keshi Home Studio Acoustic Production',
          'keshi produced several breakthrough EPs independently in his bedroom studio.',
          'He combined fingerstyle acoustic guitar chords with modern lo-fi drum textures.',
        ].join('\n')
        await writeFile(outputPath!, grounding, 'utf8')
        return { stdout: '', stderr: '' }
      }

      // Stage 4: Private Packet Planning
      if (options?.input && options.input.includes('Private Packet Planner')) {
        expect(outputPath).toBeDefined()
        const packetPlan = {
          selectedAngle: 'Acoustic production choices and emotional resonance in home recording',
          evidenceRationale: 'Grounded in authentic bedroom production techniques and intentional arrangement choices',
          selectedLearningTargets: {
            vocabulary: ['v_arrangement'],
            grammar: ['g_past_continuous'],
          },
          assessmentPlans: [
            {
              itemId: 'q1',
              targetSkill: 'detail_extraction',
              primarySkill: 'detail_extraction',
              targetLanguageDifficulty: 'A2_basic',
              targetCognitiveDepth: 'D2_single_step_inference',
              learningFunction: 'infer artist intent from musical decisions',
              reasoningOperation: 'identify deliberate choice of minimal instrumentation',
              responseFormat: 'lines',
              formatRationale: 'Allows student to state and explain the creative choice',
              scaffoldLevel: 'supported',
            },
          ],
        }
        await writeFile(outputPath!, JSON.stringify(packetPlan), 'utf8')
        return { stdout: '', stderr: '' }
      }

      // Stage 5: Private Authoring
      if (options?.input && options.input.includes('You are the private curriculum author')) {
        expect(outputPath).toBeDefined()
        observedAuthoringPrompt = options.input

        const validPkg = makeValidV24Package(jobId, childId, fingerprint)
        await writeFile(outputPath!, JSON.stringify(validPkg), 'utf8')
        return { stdout: '', stderr: '' }
      }

      return { stdout: '', stderr: '' }
    })

    const summary = await runLocalCodexAuthoringBatch(client, defaultRepoRoot(), run as any)
    expect(summary.claimed).toBe(1)
    expect(summary.submitted).toBe(1)
    expect(summary.failed).toBe(0)
    expect(summary.jobs[0]?.status).toBe('SUBMITTED_AWAITING_FINISHER')

    // 3. Verify Stage 2 Targeted History RPC call
    expect(targetedHistoryCalled).toBe(true)

    // 4. Verify Authoring Prompt received injected CAP precedents and formatPlanningCapsule
    expect(observedAuthoringPrompt).toContain('## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)')
    expect(observedAuthoringPrompt).toContain('formatPlanningCapsule')
    expect(observedAuthoringPrompt).toContain('targetedOlderEvidence')
    expect(observedAuthoringPrompt).toContain('targetedHistoryManifestHash')

    // 5. Verify submitted package conforms strictly to production invariants
    expect(submittedPackage).toBeDefined()
    expect(submittedPackage.metadata.schemaVersion).toBe('2.5.0')
    expect(submittedPackage.metadata.promptVersion).toBe(`prompt/${CURRENT_PROMPT_VERSION}`)
    expect(submittedPackage.metadata.engineVersion).toBe(CURRENT_ENGINE_VERSION)
    expect(submittedPackage.metadata.jobId).toBe(jobId)
  })

  it('retries packet planning with repair diagnostic when round 0 fails and succeeds on round 1', async () => {
    const jobId = '01234567-89ab-cdef-0123-456789abcdef'
    const childId = 'fedcba98-7654-3210-fedc-ba9876543210'
    const fingerprint = 'abcdef0123456789abcdef0123456789'
    const cutoffTimestamp = '2026-09-06T12:00:00.000Z'

    const claimedContext = {
      job: { id: jobId, childId },
      profile: { id: childId, name: 'Learner Two', grade: 'A2_basic', grade_level: 'A2_basic', interests: ['biology'] },
      preferences: { topics: ['marine biology'] },
      targetIds: ['v_habitat'],
      cutoffTimestamp,
      claimSnapshotId: jobId,
      inputFingerprint: fingerprint,
    }

    let submitted = false
    const client: WorkerClient = {
      rpc: vi.fn(async (name: string) => {
        if (name === 'worker_claim_local_authoring_batch') {
          return { data: { bridgeVersion: '1.4.0', claimed: [claimedContext], claimedCount: 1, normalCapacity: 15, mandatoryCapacityOverride: false, oldestOutstandingDeadline: null }, error: null }
        }
        if (name === 'worker_fetch_targeted_student_history') {
          return { data: { jobId, childId, cutoffTimestamp, targetIds: ['v_habitat'], evidence: [], evidenceCount: 0, manifestHash: 'sha256:1234' }, error: null }
        }
        if (name === 'worker_submit_local_curriculum_package') {
          submitted = true
          return { data: { success: true }, error: null }
        }
        throw new Error(`Unexpected RPC: ${name}`)
      }),
      storage: { from: () => ({ upload: vi.fn() } as any) },
    }

    let packetPlanRounds = 0
    let repairPromptObserved = false

    const run = vi.fn(async (executable: string, args: string[], options?: any) => {
      if (executable === 'git') return { stdout: '0123456789abcdef0123456789abcdef01234567\n', stderr: '' }
      if (args[0] === '--version') return { stdout: 'codex-cli 0.149.1\n', stderr: '' }
      if (args[0] === 'exec' && args[1] === '--help') return { stdout: '--ephemeral --model --config --sandbox --ignore-user-config --skip-git-repo-check --output-last-message', stderr: '' }
      if (args[0] === 'login') return { stdout: 'Logged in using ChatGPT\n', stderr: '' }

      const outIndex = args.indexOf('--output-last-message')
      const outputPath = outIndex !== -1 ? args[outIndex + 1] : undefined

      // Stage 1
      if (options?.input && options.input.includes('bounded private topic capsule')) {
        await writeFile(outputPath!, JSON.stringify({ queries: ['ocean biology'], topicSummary: 'Summary' }), 'utf8')
        return { stdout: '', stderr: '' }
      }
      // Stage 3
      if (options?.input && options.input.includes('privacy-screened public-interest research brief')) {
        await writeFile(outputPath!, '# Grounding', 'utf8')
        return { stdout: '', stderr: '' }
      }
      // Stage 4: Packet Planning
      if (options?.input && options.input.includes('Private Packet Planner')) {
        packetPlanRounds += 1
        if (packetPlanRounds === 1) {
          // First attempt: invalid output (missing assessmentPlans)
          await writeFile(outputPath!, JSON.stringify({ selectedAngle: 'Test', evidenceRationale: 'Rationale', assessmentPlans: [] }), 'utf8')
          return { stdout: '', stderr: '' }
        } else {
          // Second attempt: repair prompt should be present
          if (options.input.includes('Plan Repair Required')) {
            repairPromptObserved = true
          }
          const validPlan = {
            selectedAngle: 'Marine Adaptations',
            evidenceRationale: 'Grounded in tidal zone research',
            selectedLearningTargets: { vocabulary: ['v_habitat'], grammar: [] },
            assessmentPlans: [
              {
                itemId: 'q1',
                targetSkill: 'detail_extraction',
                primarySkill: 'detail_extraction',
                targetLanguageDifficulty: 'A2_basic',
                targetCognitiveDepth: 'D2_single_step_inference',
                learningFunction: 'evidence',
                reasoningOperation: 'inference',
                responseFormat: 'lines',
                formatRationale: 'lines',
                scaffoldLevel: 'on-level',
              },
            ],
          }
          await writeFile(outputPath!, JSON.stringify(validPlan), 'utf8')
          return { stdout: '', stderr: '' }
        }
      }
      // Stage 5
      if (options?.input && options.input.includes('You are the private curriculum author')) {
        const validPkg = makeValidV24Package(jobId, childId, fingerprint)
        await writeFile(outputPath!, JSON.stringify(validPkg), 'utf8')
        return { stdout: '', stderr: '' }
      }
      return { stdout: '', stderr: '' }
    })

    const summary = await runLocalCodexAuthoringBatch(client, defaultRepoRoot(), run as any)
    expect(summary.claimed).toBe(1)
    expect(summary.submitted).toBe(1)
    expect(packetPlanRounds).toBe(2)
    expect(repairPromptObserved).toBe(true)
    expect(submitted).toBe(true)
  })

  it('fails closed with PACKET_PLANNING_FAILED when packet planning exhausts attempts without falling back to generic targets', async () => {
    const jobId = '01234567-89ab-cdef-0123-456789abcdef'
    const childId = 'fedcba98-7654-3210-fedc-ba9876543210'
    const fingerprint = 'abcdef0123456789abcdef0123456789'

    const claimedContext = {
      job: { id: jobId, childId },
      profile: { id: childId, name: 'Learner Three', grade: 'A2_basic', grade_level: 'A2_basic', interests: ['space'] },
      preferences: { topics: ['astronomy'] },
      claimSnapshotId: jobId,
      inputFingerprint: fingerprint,
    }

    let releasedErrorCode: string | undefined
    const client: WorkerClient = {
      rpc: vi.fn(async (name: string, params: any) => {
        if (name === 'worker_claim_local_authoring_batch') {
          return { data: { bridgeVersion: '1.4.0', claimed: [claimedContext], claimedCount: 1, normalCapacity: 15, mandatoryCapacityOverride: false, oldestOutstandingDeadline: null }, error: null }
        }
        if (name === 'worker_fetch_targeted_student_history') {
          return { data: { jobId, childId, cutoffTimestamp: '2026-09-06T12:00:00.000Z', targetIds: [], evidence: [], evidenceCount: 0, manifestHash: 'sha256:1234' }, error: null }
        }
        if (name === 'worker_release_local_unsubmitted_claim') {
          releasedErrorCode = params.error_code
          return { data: { success: true }, error: null }
        }
        if (name === 'worker_local_curriculum_submission_status') {
          return { data: { submissionFound: false }, error: null }
        }
        throw new Error(`Unexpected RPC: ${name}`)
      }),
      storage: { from: () => ({ upload: vi.fn() } as any) },
    }

    const run = vi.fn(async (executable: string, args: string[], options?: any) => {
      if (executable === 'git') return { stdout: '0123456789abcdef0123456789abcdef01234567\n', stderr: '' }
      if (args[0] === '--version') return { stdout: 'codex-cli 0.149.1\n', stderr: '' }
      if (args[0] === 'exec' && args[1] === '--help') return { stdout: '--ephemeral --model --config --sandbox --ignore-user-config --skip-git-repo-check --output-last-message', stderr: '' }
      if (args[0] === 'login') return { stdout: 'Logged in using ChatGPT\n', stderr: '' }

      const outIndex = args.indexOf('--output-last-message')
      const outputPath = outIndex !== -1 ? args[outIndex + 1] : undefined

      // Stage 1
      if (options?.input && options.input.includes('bounded private topic capsule')) {
        await writeFile(outputPath!, JSON.stringify({ queries: ['space telescopes'], topicSummary: 'Summary' }), 'utf8')
        return { stdout: '', stderr: '' }
      }
      // Stage 3
      if (options?.input && options.input.includes('privacy-screened public-interest research brief')) {
        await writeFile(outputPath!, '# Grounding', 'utf8')
        return { stdout: '', stderr: '' }
      }
      // Stage 4: Always fails validation
      if (options?.input && options.input.includes('Private Packet Planner')) {
        await writeFile(outputPath!, 'INVALID_JSON_CONTENT', 'utf8')
        return { stdout: '', stderr: '' }
      }
      return { stdout: '', stderr: '' }
    })

    const summary = await runLocalCodexAuthoringBatch(client, defaultRepoRoot(), run as any)
    expect(summary.claimed).toBe(1)
    expect(summary.submitted).toBe(0)
    expect(summary.failed).toBe(1)
    expect(summary.jobs[0]?.errorCode).toBe('PACKET_PLANNING_FAILED')
    expect(releasedErrorCode).toBe('PACKET_PLANNING_FAILED')
  })
})
