import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { PipelineJobRow } from '../client/types.js'
export * from '../client/types.js'

export const OPERATIONS_MATERIALS_SELECT = 'id, child_id, material_week, revision, rule_version, prompt_version, generator_version, model_name, student_pdf_path, parent_answer_pdf_path, canonical_source, created_at'

type PipelineInput = {
  jobs: any[]
  submissions: any[]
  overrides: any[]
  childNames: Map<string, string>
  maskName: (name: string | undefined, id: string) => string
  now: string
  feedbackMaterialIds?: Set<string>
  childMaterialCounts?: Map<string, number>
}

export function deriveOperationsPipeline(input: PipelineInput): OperationsOverview['pipeline'] {
  const latestSubmissionByJob = new Map<string, any>()
  for (const submission of input.submissions) {
    const previous = latestSubmissionByJob.get(submission.job_id)
    if (!previous || Number(submission.authoring_attempt) > Number(previous.authoring_attempt)) {
      latestSubmissionByJob.set(submission.job_id, submission)
    }
  }
  const overrideByJob = new Map(input.overrides.map((override: any) => [override.job_id, override]))
  const pipeline: OperationsOverview['pipeline'] = { readyToClaim: [], awaitingFinisher: [], finisherDone: [] }

  for (const job of input.jobs) {
    if (job.status === 'canceled') continue
    const latest = latestSubmissionByJob.get(job.id)
    const current = latest && Number(latest.authoring_attempt) === Number(job.attempt_count) ? latest : null
    const attempt = Number(job.attempt_count) || 0
    const maxAttempts = Number(job.max_attempts) || 5

    // Feedback status computation
    let feedbackStatus: PipelineJobRow['feedbackStatus'] = undefined
    if (job.status === 'pending') {
      const hasFeedback = (job.source_material_id && input.feedbackMaterialIds?.has(job.source_material_id)) || false
      const isWeek1 = !job.source_material_id && (!input.childMaterialCounts?.get(job.child_id) || input.childMaterialCounts.get(job.child_id) === 0)

      if (isWeek1) {
        feedbackStatus = 'onboarding'
      } else if (hasFeedback) {
        feedbackStatus = 'received'
      } else if (job.feedback_missing || (job.feedback_cutoff_at && job.feedback_cutoff_at <= input.now)) {
        feedbackStatus = 'cutoff_passed'
      } else {
        feedbackStatus = 'waiting_feedback'
      }
    }

    // Determine status
    let status = job.status
    if (job.status === 'pending') {
      if (feedbackStatus === 'waiting_feedback') {
        status = 'WAITING FEEDBACK'
      } else {
        status = attempt > 0 ? 'RETRY READY' : 'READY TO CLAIM'
      }
    } else if (job.status === 'claimed' && !current) {
      status = 'AUTHORING CLAIMED — AWAITING SUBMISSION'
    } else if (current?.status === 'technical_failed') {
      status = 'TECHNICAL FAILURE — RETRYABLE'
    } else if (current && ['pending', 'processing'].includes(current.status)) {
      status = current.status === 'processing' ? 'FINISHER PROCESSING' : 'AWAITING FINISHER'
    } else if (overrideByJob.has(job.id)) {
      status = 'DELIVERED WITH QUALITY OVERRIDE'
    } else if (current?.status === 'completed' || job.status === 'completed') {
      status = job.release_at
        ? (job.release_at <= input.now ? 'RELEASED' : 'AWAITING RELEASE')
        : 'COMPLETED'
    } else if (current?.status === 'quality_rejected') {
      status = 'QUALITY REJECTED'
    } else {
      status = job.status === 'failed' ? 'GENERATION FAILED — RETRY REQUIRED' : job.status.replaceAll('_', ' ').toUpperCase()
    }

    // Retry state determination: completed jobs must NEVER be labeled as 'retry_in_progress'
    let retryState: PipelineJobRow['retryState']
    const isCompletedOutcome = ['RELEASED', 'AWAITING RELEASE', 'COMPLETED', 'DELIVERED WITH QUALITY OVERRIDE'].includes(status)

    if (isCompletedOutcome) {
      retryState = attempt > 1 ? 'delivered_after_retry' : 'delivered_first_try'
    } else if (attempt >= maxAttempts) {
      retryState = 'exhausted'
    } else if (job.status === 'pending') {
      retryState = attempt > 0 ? 'retry_waiting' : 'first_attempt'
    } else if (['AWAITING FINISHER', 'FINISHER PROCESSING'].includes(status) || job.status === 'claimed') {
      retryState = attempt > 1 ? 'retry_in_progress' : 'first_attempt'
    } else if (status === 'QUALITY REJECTED' || status === 'TECHNICAL FAILURE — RETRYABLE' || job.status === 'failed') {
      retryState = attempt >= maxAttempts ? 'exhausted' : 'retry_waiting'
    } else {
      retryState = attempt > 1 ? 'retry_in_progress' : 'first_attempt'
    }

    const row: PipelineJobRow = {
      jobId: job.id,
      childId: job.child_id,
      childPseudonym: input.maskName(input.childNames.get(job.child_id), job.child_id),
      materialWeek: job.material_week,
      attemptNumber: current ? Number(current.authoring_attempt) : attempt,
      maxAttempts,
      retryState,
      feedbackStatus,
      feedbackCutoffAt: job.feedback_cutoff_at || null,
      createdAt: job.created_at,
      updatedAt: current?.processed_at || current?.submitted_at || job.completed_at || job.started_at || job.updated_at || job.created_at,
      relevantTimestamp: current?.processed_at || current?.submitted_at || job.generation_due_at || job.scheduled_for || null,
      status,
    }

    if (['WAITING FEEDBACK', 'READY TO CLAIM', 'RETRY READY', 'AUTHORING CLAIMED — AWAITING SUBMISSION', 'GENERATION FAILED — RETRY REQUIRED'].includes(status) || job.status === 'pending') {
      pipeline.readyToClaim.push(row)
    } else if (['AWAITING FINISHER', 'FINISHER PROCESSING', 'TECHNICAL FAILURE — RETRYABLE'].includes(status)) {
      pipeline.awaitingFinisher.push(row)
    } else {
      pipeline.finisherDone.push(row)
    }
  }
  return pipeline
}

export {
  CURRENT_RELEASE_ID,
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ENGINE_MANIFEST,
  formatEngineVersion,
  classifyQualityEra,
}

import {
  CURRENT_RELEASE_ID,
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ENGINE_MANIFEST,
  formatEngineVersion,
  type DataSourceStatus,
  type OperationsOverview,
  type SubscriptionRevenueData,
  type FailureIntelligence,
  type ParentFeedbackIntelligence,
  type ProductFeedbackIntelligence,
  type ChildWeekTimeline,
  type LifecycleEvent,
  type AiExportDataset,
  type GrantRetryResult,
  type GenerationTestModeStatus,
  type SetTestModeResult,
  type AdvanceTestWeekResult,
  type AdminTestFeedbackInput,
  type RecordTestFeedbackResult,
  type ResetTestChildResult,
  type TestPdfSignedUrlResult,
  type WaitlistData,
  type WaitlistEntry,
  type RaiseCapacityAndReleaseResult,
  type ReleaseWaitlistResult,
  type UpdateCapacityResult,
  type RetryNotificationResult,
  type QualityEra,
  type EraTag,
  type AdminConfig,
  type AnnouncementsAdminData,
  type AnnouncementItem,
  type AnnouncementStatus,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
  type AnnouncementActionResult,
  classifyQualityEra,
} from '../client/types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Waitlist release email — HTML generator and transactional email dispatch
// ─────────────────────────────────────────────────────────────────────────────

function buildReleaseEmailHtml(magicLinkUrl: string): string {
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>紙屬英文 — 學習名額已為您開放</title>
  </head>
  <body style="margin:0;background:#f4f0e6;color:#24382f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">您的紙屬英文學習名額已開放，立即前往啟用訂閱。</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f0e6;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf7;border:1px solid #ded7c7;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#173f35;padding:24px 32px;color:#fffdf7;font-family:Georgia,'Noto Serif TC',serif;font-size:26px;font-weight:700;">紙屬英文</td></tr>
          <tr><td style="padding:36px 32px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.4;">學習名額已為您開放</h1>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">親愛的家長您好：<br>感謝您的耐心等候！我們已開放新一批學習名額，目前已為孩子完成名額保留。您可以立即登入系統確認學習計畫並完成訂閱啟用。</p>
            <p style="margin:28px 0;text-align:center;"><a href="${magicLinkUrl}" style="display:inline-block;background:#c96c43;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 26px;border-radius:999px;">立即前往啟用訂閱</a></p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#617068;">若按鈕無法使用，請複製以下連結到瀏覽器：<br><a href="${magicLinkUrl}" style="color:#246451;word-break:break-all;">${magicLinkUrl}</a></p>
            <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e5dfd2;font-size:14px;line-height:1.7;color:#617068;">如果您目前暫無訂閱需求，可直接忽略這封信件，名額將保留給其他有需要的家長。</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

interface EmailDispatchResult {
  waitlistId: string
  success: boolean
  error?: string
}

async function sendReleaseEmail(
  client: SupabaseClient,
  entry: { waitlistId: string; email: string },
  siteUrl: string,
  resendApiKey: string,
  emailFrom: string,
): Promise<EmailDispatchResult> {
  try {
    // 1. Generate magic-link URL via Supabase Auth admin
    const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
      type: 'magiclink',
      email: entry.email,
      options: { redirectTo: `${siteUrl}/billing` },
    })
    if (linkError || !linkData?.properties?.action_link) {
      return { waitlistId: entry.waitlistId, success: false, error: `generateLink failed: ${linkError?.message || 'no action_link returned'}` }
    }
    const magicLinkUrl = linkData.properties.action_link

    // 2. Send via Resend API
    const html = buildReleaseEmailHtml(magicLinkUrl)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [entry.email],
        subject: '紙屬英文 — 學習名額已為您開放',
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { waitlistId: entry.waitlistId, success: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` }
    }
    return { waitlistId: entry.waitlistId, success: true }
  } catch (err: any) {
    return { waitlistId: entry.waitlistId, success: false, error: err?.message || 'Unknown email dispatch error' }
  }
}

function loadRootEnv() {
  const possiblePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../.env'),
    'C:\\IDEA\\eng-tutor-saas\\.env',
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim()
            const val = trimmed.slice(eqIdx + 1).trim()
            if (!process.env[key]) {
              process.env[key] = val
            }
          }
        }
        break
      } catch {}
    }
  }
}

export class AdminService {
  private client: SupabaseClient | null = null

  constructor(config?: AdminConfig) {
    if (config?.client) {
      this.client = config.client
      return
    }

    loadRootEnv()

    const url = config?.supabaseUrl !== undefined ? config.supabaseUrl : (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    const secretKey = config?.supabaseSecretKey !== undefined ? config.supabaseSecretKey : (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (url && secretKey && !secretKey.startsWith('sb_publishable_')) {
      this.client = createClient(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    }
  }

  public getIsConnected(): boolean {
    return this.client !== null
  }

  public async grantJobRetry(jobId: string): Promise<GrantRetryResult> {
    if (!jobId || typeof jobId !== 'string') {
      return { success: false, error: 'INVALID_JOB_ID', message: 'Job ID is required' }
    }

    const client = this.ensureClient()

    // 1. Try calling the dedicated atomic RPC admin_grant_job_retry
    try {
      const res = await client.rpc('admin_grant_job_retry', { p_job_id: jobId })
      if (!res.error && res.data && typeof res.data === 'object' && 'success' in (res.data as any)) {
        const data = res.data as GrantRetryResult
        if (data.success) {
          console.log('[AUDIT] generation_retry_granted:', {
            jobId: data.jobId || jobId,
            previousMaxAttempts: data.previousMaxAttempts,
            newMaxAttempts: data.newMaxAttempts,
            attemptCount: data.attemptCount,
            timestamp: data.timestamp || new Date().toISOString(),
          })
        }
        return data
      }
    } catch {}

    // 2. Direct client fallback (for mock testing environments without RPC)
    try {
      const { data: job, error: fetchErr } = await client
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()

      if (fetchErr || !job) {
        return { success: false, error: 'JOB_NOT_FOUND', message: 'Generation job not found' }
      }

      if (job.status === 'completed') {
        return { success: false, error: 'JOB_ALREADY_COMPLETED', message: 'Completed job cannot be reopened for retry' }
      }

      const now = new Date().toISOString()
      if (job.status === 'claimed' && job.lease_expires_at && job.lease_expires_at > now) {
        return {
          success: false,
          error: 'ACTIVE_LEASE_IN_PROGRESS',
          message: 'Job currently has an active processing lease in progress. Please wait for lease expiry or worker completion.',
        }
      }

      const previousMaxAttempts = Number(job.max_attempts) || 3
      const newMaxAttempts = previousMaxAttempts + 1

      const { error: updateErr } = await client
        .from('generation_jobs')
        .update({
          max_attempts: newMaxAttempts,
          status: 'pending',
          claimed_by: null,
          lease_expires_at: null,
          error_code: null,
          error_message: null,
          updated_at: now,
        })
        .eq('id', jobId)

      if (updateErr) {
        return { success: false, error: 'DB_UPDATE_FAILED', message: updateErr.message }
      }

      const result: GrantRetryResult = {
        success: true,
        jobId,
        previousMaxAttempts,
        newMaxAttempts,
        attemptCount: job.attempt_count,
        status: 'pending',
        timestamp: now,
      }

      console.log('[AUDIT] generation_retry_granted:', {
        jobId,
        previousMaxAttempts,
        newMaxAttempts,
        attemptCount: job.attempt_count,
        timestamp: now,
      })

      return result
    } catch (err) {
      return {
        success: false,
        error: 'OPERATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  public async requeueCurriculumSubmission(
    jobId: string,
    authoringAttempt?: number
  ): Promise<{
    success: boolean
    jobId: string
    authoringAttempt?: number
    submissionStatus?: string
    jobStatus?: string
    attemptCount?: number
    maxAttempts?: number
    error?: string
    message?: string
    timestamp?: string
  }> {
    if (!jobId || typeof jobId !== 'string') {
      return { success: false, jobId: '', error: 'INVALID_JOB_ID', message: 'Job ID is required' }
    }

    const client = this.ensureClient()
    try {
      const res = await client.rpc('admin_requeue_curriculum_submission', {
        p_job_id: jobId,
        p_authoring_attempt: authoringAttempt ?? null,
      })

      if (!res.error && res.data && typeof res.data === 'object') {
        const data = res.data as any
        if (data.success) {
          console.log('[AUDIT] curriculum_submission_requeued:', {
            jobId,
            authoringAttempt: data.authoringAttempt,
            timestamp: data.timestamp,
          })
        }
        return data
      }
    } catch {}

    // Direct client fallback
    try {
      const now = new Date().toISOString()
      const { data: job } = await client.from('generation_jobs').select('*').eq('id', jobId).single()
      if (!job) return { success: false, jobId, error: 'JOB_NOT_FOUND', message: 'Generation job not found' }
      if (job.status === 'completed') return { success: false, jobId, error: 'JOB_ALREADY_COMPLETED', message: 'Completed job cannot be requeued' }

      await client.from('generation_jobs').update({
        status: 'claimed',
        claimed_by: 'chatgpt-work-daily',
        lease_expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        error_code: null,
        error_message: null,
        updated_at: now,
      }).eq('id', jobId)

      const result = {
        success: true,
        jobId,
        authoringAttempt,
        submissionStatus: 'pending',
        jobStatus: 'claimed',
        attemptCount: job.attempt_count,
        maxAttempts: job.max_attempts,
        timestamp: now,
      }
      console.log('[AUDIT] curriculum_submission_requeued:', { jobId, authoringAttempt, timestamp: now })
      return result
    } catch (err) {
      return {
        success: false,
        jobId,
        error: 'OPERATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  public async getTestModeStatus(childId: string): Promise<GenerationTestModeStatus> {
    if (!childId || typeof childId !== 'string') {
      return {
        success: false,
        childId: '',
        childPseudonym: '',
        isEnabled: false,
        targetWeek: 9,
        completedWeeksCount: 0,
        currentMaterialWeek: null,
        nextJob: null,
        latestMaterial: null,
        latestFeedback: null,
        advanceEligibility: { canAdvance: false, blockingCode: 'INVALID_CHILD_ID', blockingReason: 'Child ID is required' },
        resetEligibility: { canReset: false, blockingCode: 'INVALID_CHILD_ID', blockingReason: 'Child ID is required' },
        error: 'INVALID_CHILD_ID',
        message: 'Child ID is required',
      }
    }

    const client = this.ensureClient()
    try {
      const res = await client.rpc('admin_get_test_mode_status', { p_child_id: childId })
      if (!res.error && res.data && typeof res.data === 'object' && (res.data as any).success) {
        return res.data as GenerationTestModeStatus
      }
    } catch {}

    // Direct client fallback for mock testing environments
    try {
      const { data: child, error: childErr } = await client
        .from('children')
        .select('*')
        .eq('id', childId)
        .maybeSingle()

      if (childErr || !child) {
        return {
          success: false,
          childId,
          childPseudonym: '',
          isEnabled: false,
          targetWeek: 9,
          completedWeeksCount: 0,
          currentMaterialWeek: null,
          nextJob: null,
          latestMaterial: null,
          latestFeedback: null,
          advanceEligibility: { canAdvance: false, blockingCode: 'CHILD_NOT_FOUND', blockingReason: 'Child not found' },
          resetEligibility: { canReset: false, blockingCode: 'CHILD_NOT_FOUND', blockingReason: 'Child not found' },
          error: 'CHILD_NOT_FOUND',
          message: 'Child not found',
        }
      }

      const { data: session } = await client
        .from('generation_test_mode_sessions')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle()

      const isEnabled = Boolean(session?.is_enabled)
      const targetWeek = Number(session?.target_week) || 9

      const { data: materials } = await client
        .from('materials')
        .select('*')
        .eq('child_id', childId)
        .order('material_week', { ascending: false })

      const completedWeeksCount = materials?.length || 0
      const latestMaterial = materials && materials.length > 0 ? materials[0] : null

      const { data: feedback } = latestMaterial
        ? await client.from('feedback').select('*').eq('child_id', childId).eq('material_id', latestMaterial.id).maybeSingle()
        : { data: null }

      const { data: jobs } = await client
        .from('generation_jobs')
        .select('*')
        .eq('child_id', childId)
        .neq('status', 'completed')
        .order('scheduled_for', { ascending: true })

      const nextJob = jobs && jobs.length > 0 ? jobs[0] : null
      const nowMs = Date.now()

      let canAdvance = isEnabled && child.is_active && completedWeeksCount < targetWeek && Boolean(nextJob)
      let advanceCode: string | null = null
      let advanceReason: string | null = null

      if (!isEnabled) {
        canAdvance = false
        advanceCode = 'TEST_MODE_NOT_ENABLED'
        advanceReason = '此學員尚未啟用 Generation Test Mode'
      } else if (!child.is_active) {
        canAdvance = false
        advanceCode = 'CHILD_NOT_FOUND'
        advanceReason = '學員帳號已被停用'
      } else if (completedWeeksCount >= targetWeek) {
        canAdvance = false
        advanceCode = 'TARGET_WEEK_REACHED'
        advanceReason = `已達目標測試週次 (Week ${targetWeek})`
      } else if (latestMaterial && !latestMaterial.observations_recorded_at) {
        canAdvance = false
        advanceCode = 'OBSERVATIONS_NOT_RECORDED'
        advanceReason = '前週教材之學習記憶與觀察數據尚未完成寫入'
      } else if (!nextJob) {
        canAdvance = false
        advanceCode = 'NEXT_JOB_NOT_FOUND'
        advanceReason = '找不到下一週待生成任務'
      }

      const canReset = isEnabled
      const resetCode = isEnabled ? null : 'TEST_MODE_NOT_ENABLED'
      const resetReason = isEnabled ? null : '僅測試模式學員可執行重設'

      return {
        success: true,
        childId,
        childPseudonym: this.maskName(child.display_name, child.id),
        isEnabled,
        targetWeek,
        completedWeeksCount,
        currentMaterialWeek: latestMaterial?.material_week || null,
        nextJob: nextJob ? {
          id: nextJob.id,
          materialWeek: nextJob.material_week,
          status: nextJob.status,
          attemptCount: Number(nextJob.attempt_count) || 0,
          maxAttempts: Number(nextJob.max_attempts) || 3,
          ruleVersion: nextJob.rule_version,
          scheduledFor: nextJob.scheduled_for,
          generationDueAt: nextJob.generation_due_at,
          releaseAt: nextJob.release_at,
          feedbackCutoffAt: nextJob.feedback_cutoff_at,
          feedbackMissing: Boolean(nextJob.feedback_missing),
          isHumanReviewRequired: nextJob.status === 'failed' || nextJob.attempt_count >= nextJob.max_attempts,
          leaseExpiresAt: nextJob.lease_expires_at || null,
          errorCode: nextJob.error_code || null,
          errorMessage: nextJob.error_message || null,
          isAlreadyAdvanced: Boolean(
            nextJob.scheduled_for && new Date(nextJob.scheduled_for).getTime() <= nowMs &&
            nextJob.feedback_cutoff_at && new Date(nextJob.feedback_cutoff_at).getTime() <= nowMs
          ),
        } : null,
        latestMaterial: latestMaterial ? {
          id: latestMaterial.id,
          materialWeek: latestMaterial.material_week,
          revision: Number(latestMaterial.revision) || 1,
          ruleVersion: latestMaterial.rule_version,
          modelName: latestMaterial.model_name || null,
          promptVersion: latestMaterial.prompt_version || null,
          studentPdfPath: latestMaterial.student_pdf_path,
          parentAnswerPdfPath: latestMaterial.parent_answer_pdf_path,
          observationsRecordedAt: latestMaterial.observations_recorded_at || null,
          hasFeedback: Boolean(feedback),
        } : null,
        latestFeedback: feedback ? {
          id: feedback.id,
          difficulty: feedback.difficulty,
          completionRate: feedback.completion_rate,
          weakArea: feedback.weak_area,
          mistakesText: feedback.mistakes_text,
          childComments: this.sanitizePiiText(feedback.child_comments),
          parentComments: this.sanitizePiiText(feedback.parent_comments),
          schoolProgressUpdate: feedback.school_progress_update,
          interestUpdate: feedback.interest_update,
          notes: this.sanitizePiiText(feedback.notes),
          createdAt: feedback.created_at,
        } : null,
        advanceEligibility: {
          canAdvance,
          blockingCode: advanceCode,
          blockingReason: advanceReason,
        },
        resetEligibility: {
          canReset,
          blockingCode: resetCode,
          blockingReason: resetReason,
        },
      }
    } catch (err) {
      return {
        success: false,
        childId,
        childPseudonym: '',
        isEnabled: false,
        targetWeek: 9,
        completedWeeksCount: 0,
        currentMaterialWeek: null,
        nextJob: null,
        latestMaterial: null,
        latestFeedback: null,
        advanceEligibility: { canAdvance: false, blockingCode: 'OPERATION_FAILED', blockingReason: String(err) },
        resetEligibility: { canReset: false, blockingCode: 'OPERATION_FAILED', blockingReason: String(err) },
        error: 'OPERATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  public async setTestMode(
    childId: string,
    isEnabled: boolean,
    targetWeek = 9,
    force = false
  ): Promise<SetTestModeResult> {
    if (!childId || typeof childId !== 'string') {
      return { success: false, childId: '', isEnabled: false, error: 'INVALID_CHILD_ID', message: 'Child ID is required' }
    }

    const client = this.ensureClient()
    try {
      const res = await client.rpc('admin_set_test_mode', {
        p_child_id: childId,
        p_is_enabled: isEnabled,
        p_target_week: targetWeek,
        p_force: force,
      })
      if (!res.error && res.data && typeof res.data === 'object') {
        const data = res.data as SetTestModeResult
        if (data.success) {
          console.log('[AUDIT] test_mode_set:', { childId, isEnabled, targetWeek, force, timestamp: new Date().toISOString() })
        }
        return data
      }
    } catch {}

    // Fallback
    try {
      if (isEnabled) {
        // Enforce single active test child: deactivate other active test sessions
        await client.from('generation_test_mode_sessions').update({
          is_enabled: false,
          updated_at: new Date().toISOString(),
        }).neq('child_id', childId).eq('is_enabled', true)

        await client.from('generation_test_mode_sessions').upsert({
          child_id: childId,
          is_enabled: true,
          target_week: Math.max(1, Math.min(targetWeek, 16)),
          updated_at: new Date().toISOString(),
        })
        console.log('[AUDIT] test_mode_set:', { childId, isEnabled: true, targetWeek, timestamp: new Date().toISOString() })
        return { success: true, childId, isEnabled: true, targetWeek }
      } else {
        const { data: materials } = await client.from('materials').select('id').eq('child_id', childId)
        if (materials && materials.length > 0 && !force) {
          return {
            success: false,
            childId,
            isEnabled: true,
            error: 'RESET_REQUIRED_BEFORE_END_TEST_MODE',
            message: '學員已有測試生成教材紀錄，為確保正式排程時序一致，結束測試模式前請先執行「重設回開通起點 (Reset to Onboarding)」。',
          }
        }
        await client.from('generation_test_mode_sessions').update({
          is_enabled: false,
          updated_at: new Date().toISOString(),
        }).eq('child_id', childId)
        console.log('[AUDIT] test_mode_set:', { childId, isEnabled: false, timestamp: new Date().toISOString() })
        return { success: true, childId, isEnabled: false }
      }
    } catch (err) {
      return { success: false, childId, isEnabled: false, error: 'OPERATION_FAILED', message: err instanceof Error ? err.message : String(err) }
    }
  }

  public async advanceTestWeek(childId: string): Promise<AdvanceTestWeekResult> {
    if (!childId || typeof childId !== 'string') {
      return { success: false, error: 'INVALID_CHILD_ID', message: 'Child ID is required' }
    }

    const client = this.ensureClient()
    try {
      const res = await client.rpc('admin_advance_test_week', { p_child_id: childId })
      if (!res.error && res.data && typeof res.data === 'object') {
        const data = res.data as AdvanceTestWeekResult
        if (data.success) {
          console.log('[AUDIT] test_week_advanced:', {
            childId,
            jobId: data.jobId,
            scheduledFor: data.scheduledFor,
            generationDueAt: data.generationDueAt,
            releaseAt: data.releaseAt,
            timestamp: new Date().toISOString(),
          })
        }
        return data
      }
    } catch {}

    // Fallback logic
    try {
      const { data: session } = await client
        .from('generation_test_mode_sessions')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle()

      if (!session || !session.is_enabled) {
        return { success: false, error: 'TEST_MODE_NOT_ENABLED', message: 'Child is not in active Generation Test Mode' }
      }

      const { data: jobs } = await client
        .from('generation_jobs')
        .select('*')
        .eq('child_id', childId)
        .neq('status', 'completed')

      if (!jobs || jobs.length === 0) {
        return { success: false, error: 'NEXT_JOB_NOT_FOUND', message: 'No pending generation job found for next week' }
      }
      const { data: materials } = await client
        .from('materials')
        .select('id, observations_recorded_at')
        .eq('child_id', childId)

      if (materials && materials.length >= (session.target_week || 9)) {
        return {
          success: false,
          error: 'TARGET_WEEK_REACHED',
          message: `已達目標測試週次 (Week ${session.target_week || 9})`,
        }
      }

      const latestMat = materials && materials.length > 0 ? materials[0] : null
      if (latestMat && !latestMat.observations_recorded_at) {
        return {
          success: false,
          error: 'OBSERVATIONS_NOT_RECORDED',
          message: '前週教材之學習記憶與觀察數據尚未完成寫入',
        }
      }

      const job = jobs[0]

      const now = new Date()
      const nowIso = now.toISOString()
      const dueIso = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
      const releaseIso = new Date(now.getTime() + 48 * 3600 * 1000).toISOString()

      await client.from('generation_jobs').update({
        scheduled_for: nowIso,
        feedback_cutoff_at: nowIso,
        generation_due_at: dueIso,
        release_at: releaseIso,
        updated_at: nowIso,
      }).eq('id', job.id)

      await client.from('children').update({
        next_generation_at: dueIso,
      }).eq('id', childId)

      const result: AdvanceTestWeekResult = {
        success: true,
        childId,
        jobId: job.id,
        materialWeek: job.material_week,
        scheduledFor: nowIso,
        feedbackCutoffAt: nowIso,
        generationDueAt: dueIso,
        releaseAt: releaseIso,
      }

      console.log('[AUDIT] test_week_advanced:', { childId, jobId: job.id, timestamp: nowIso })
      return result
    } catch (err) {
      return { success: false, error: 'OPERATION_FAILED', message: err instanceof Error ? err.message : String(err) }
    }
  }

  public async recordTestFeedback(input: AdminTestFeedbackInput): Promise<RecordTestFeedbackResult> {
    if (!input.childId || !input.materialId) {
      return { success: false, error: 'INVALID_PARAMETERS', message: 'childId and materialId are required' }
    }

    const client = this.ensureClient()
    try {
      const res = await client.rpc('admin_record_test_feedback', {
        p_child_id: input.childId,
        p_material_id: input.materialId,
        p_difficulty: input.difficulty ?? null,
        p_completion_rate: input.completionRate ?? null,
        p_weak_area: input.weakArea ?? null,
        p_mistakes_text: input.mistakesText ?? null,
        p_child_comments: input.childComments ?? null,
        p_parent_comments: input.parentComments ?? null,
        p_school_progress_update: input.schoolProgressUpdate ?? null,
        p_interest_update: input.interestUpdate ?? null,
        p_notes: input.notes ?? null,
        p_minutes_spent: input.minutesSpent ?? null,
      })
      if (!res.error && res.data && typeof res.data === 'object') {
        const raw = res.data as any
        if (raw.success) {
          const feedbackId = raw.feedbackId || raw.feedback_id
          console.log('[AUDIT] test_feedback_recorded:', {
            childId: input.childId,
            materialId: input.materialId,
            feedbackId,
            timestamp: new Date().toISOString(),
          })
          return {
            success: true,
            feedbackId,
            childId: input.childId,
            materialId: input.materialId,
          }
        }
        return {
          success: false,
          error: raw.error || 'RECORD_FEEDBACK_FAILED',
          message: raw.message,
        }
      }
    } catch {}

    // Fallback
    try {
      const { data, error } = await client.from('feedback').upsert({
        child_id: input.childId,
        material_id: input.materialId,
        difficulty: input.difficulty ?? null,
        completion_rate: input.completionRate ?? null,
        weak_area: input.weakArea ?? null,
        mistakes_text: input.mistakesText ?? null,
        child_comments: input.childComments ?? null,
        parent_comments: input.parentComments ?? null,
        school_progress_update: input.schoolProgressUpdate ?? null,
        interest_update: input.interestUpdate ?? null,
        notes: input.notes ?? null,
        minutes_spent: input.minutesSpent ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'child_id,material_id' }).select('id').single()

      if (error) {
        return { success: false, error: 'DB_INSERT_FAILED', message: error.message }
      }

      console.log('[AUDIT] test_feedback_recorded:', { childId: input.childId, materialId: input.materialId, timestamp: new Date().toISOString() })
      return { success: true, feedbackId: data?.id, childId: input.childId, materialId: input.materialId }
    } catch (err) {
      return { success: false, error: 'OPERATION_FAILED', message: err instanceof Error ? err.message : String(err) }
    }
  }

  public async resetTestChildToOnboarding(childId: string): Promise<ResetTestChildResult> {
    if (!childId || typeof childId !== 'string') {
      return { success: false, error: 'INVALID_CHILD_ID', message: 'Child ID is required' }
    }

    const client = this.ensureClient()
    let storagePathsToDelete: string[] = []
    let rpcData: any = null

    // 1. Call atomic database reset RPC
    try {
      const res = await client.rpc('admin_reset_test_child_to_onboarding', { p_child_id: childId })
      if (res.error || !res.data || !(res.data as any).success) {
        const errData = res.data as any
        return {
          success: false,
          error: errData?.error || res.error?.message || 'RESET_FAILED',
          message: errData?.message || res.error?.message || 'Failed to reset test child',
        }
      }
      rpcData = res.data as any
      const rawPaths = rpcData.storage_paths_to_delete || rpcData.storagePathsToDelete || rpcData.pdf_paths_to_delete
      if (Array.isArray(rawPaths)) {
        storagePathsToDelete = rawPaths.filter((p: any): p is string => typeof p === 'string')
      }
    } catch (rpcErr) {
      return {
        success: false,
        error: 'OPERATION_FAILED',
        message: rpcErr instanceof Error ? rpcErr.message : String(rpcErr),
      }
    }

    // 2. Perform Storage cleanup using Supabase Storage API (never raw SQL)
    let storageWarning: string | undefined
    let unremovedPaths: string[] | undefined

    if (storagePathsToDelete.length > 0) {
      try {
        const { error: storageErr } = await client.storage.from('weekly-materials').remove(storagePathsToDelete)
        if (storageErr) {
          console.warn('[STORAGE_WARNING] Supabase storage removal returned error during test child reset:', {
            childId,
            error: storageErr.message,
            pathsCount: storagePathsToDelete.length,
          })
          storageWarning = 'STORAGE_CLEANUP_PARTIAL_FAILURE'
          unremovedPaths = storagePathsToDelete
        } else {
          console.log('[AUDIT] test_materials_storage_cleaned:', {
            childId,
            removedCount: storagePathsToDelete.length,
          })
        }
      } catch (storageException) {
        console.warn('[STORAGE_WARNING] Supabase storage removal threw exception during test child reset:', {
          childId,
          error: String(storageException),
          pathsCount: storagePathsToDelete.length,
        })
        storageWarning = 'STORAGE_CLEANUP_PARTIAL_FAILURE'
        unremovedPaths = storagePathsToDelete
      }
    }

    console.log('[AUDIT] test_child_reset_to_onboarding:', {
      childId,
      storagePathsCleaned: storagePathsToDelete.length,
      storageWarning,
      timestamp: new Date().toISOString(),
    })

    return {
      success: true,
      childId,
      newJobId: rpcData?.new_job_id || rpcData?.newJobId,
      materialWeek: rpcData?.material_week || rpcData?.materialWeek,
      deletedMaterialsCount: rpcData?.deleted_materials_count ?? rpcData?.deletedMaterialsCount,
      deletedJobsCount: rpcData?.deleted_jobs_count ?? rpcData?.deletedJobsCount,
      deletedFeedbackCount: rpcData?.deleted_feedback_count ?? rpcData?.deletedFeedbackCount,
      deletedObservationsCount: rpcData?.deleted_observations_count ?? rpcData?.deletedObservationsCount,
      deletedSubmissionsCount: rpcData?.deleted_submissions_count ?? rpcData?.deletedSubmissionsCount,
      deletedProgressRecordsCount: rpcData?.deleted_progress_records_count ?? rpcData?.deletedProgressRecordsCount,
      storageCleanupWarning: storageWarning ? true : false,
      unremovedPaths,
    }
  }

  public async getPdfSignedUrl(
    childId: string,
    materialId: string,
    pdfType: 'student' | 'parent'
  ): Promise<TestPdfSignedUrlResult> {
    if (!childId || !materialId) {
      return { success: false, error: 'INVALID_PARAMETERS', message: 'childId and materialId are required' }
    }

    const client = this.ensureClient()

    // 1. Validate material belongs to child
    const { data: material, error: matErr } = await client
      .from('materials')
      .select('id, student_pdf_path, parent_answer_pdf_path, material_week')
      .eq('id', materialId)
      .eq('child_id', childId)
      .maybeSingle()

    if (matErr || !material) {
      return {
        success: false,
        error: 'MATERIAL_NOT_FOUND',
        message: 'Material not found for this child',
      }
    }

    const path = pdfType === 'student' ? material.student_pdf_path : material.parent_answer_pdf_path
    if (!path) {
      return {
        success: false,
        error: 'PDF_NOT_FOUND',
        message: `No ${pdfType} PDF path recorded for this material`,
      }
    }

    // 2. Create signed URL via service-role Storage API (valid for 5 minutes)
    try {
      const { data, error: signErr } = await client.storage.from('weekly-materials').createSignedUrl(path, 300)
      if (signErr || !data?.signedUrl) {
        return {
          success: false,
          error: 'STORAGE_SIGN_FAILED',
          message: signErr?.message || 'Failed to create signed URL',
        }
      }

      return {
        success: true,
        childId,
        materialId,
        pdfType,
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
      }
    } catch (err) {
      return {
        success: false,
        error: 'STORAGE_EXCEPTION',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  public async getTestPdfSignedUrl(
    childId: string,
    materialId: string,
    pdfType: 'student' | 'parent'
  ): Promise<TestPdfSignedUrlResult> {
    return this.getPdfSignedUrl(childId, materialId, pdfType)
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase client is not configured. Please ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env'
      )
    }
    return this.client
  }

  private async safeQuery<T = any>(
    source: string,
    queryFn: () => PromiseLike<{ data: T | null; error: any }>,
    statuses: DataSourceStatus[]
  ): Promise<T | null> {
    const start = Date.now()
    try {
      const res = await queryFn()
      const latencyMs = Date.now() - start
      if (res.error) {
        statuses.push({
          source,
          status: 'error',
          rowCount: 0,
          error: res.error.message || JSON.stringify(res.error),
          latencyMs,
        })
        return null
      }
      const count = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0
      statuses.push({
        source,
        status: count === 0 ? 'empty' : 'healthy',
        rowCount: count,
        latencyMs,
      })
      return res.data
    } catch (err) {
      const latencyMs = Date.now() - start
      statuses.push({
        source,
        status: 'error',
        rowCount: 0,
        error: err instanceof Error ? err.message : String(err),
        latencyMs,
      })
      return null
    }
  }

  private async queryCurriculumSubmissions(jobId?: string, limit = 200, statuses?: DataSourceStatus[]): Promise<any[]> {
    const client = this.ensureClient()
    const start = Date.now()

    // Authoritative Access: private_generation.curriculum_submissions is accessible ONLY through admin_get_curriculum_submissions RPC
    try {
      const res = await client.rpc('admin_get_curriculum_submissions', {
        p_job_id: jobId || null,
        p_limit: limit,
      })
      const latencyMs = Date.now() - start

      if (res.error) {
        if (statuses) {
          statuses.push({
            source: 'curriculum_submissions (RPC)',
            status: 'error',
            rowCount: 0,
            error: res.error.message || JSON.stringify(res.error),
            latencyMs,
          })
        }
        return []
      }

      if (res.data) {
        if (statuses) {
          statuses.push({
            source: 'curriculum_submissions (RPC)',
            status: res.data.length === 0 ? 'empty' : 'healthy',
            rowCount: res.data.length,
            latencyMs,
          })
        }
        return res.data
      }

      if (statuses) {
        statuses.push({
          source: 'curriculum_submissions (RPC)',
          status: 'empty',
          rowCount: 0,
          latencyMs,
        })
      }
      return []
    } catch (err) {
      const latencyMs = Date.now() - start
      if (statuses) {
        statuses.push({
          source: 'curriculum_submissions (RPC)',
          status: 'error',
          rowCount: 0,
          error: err instanceof Error ? err.message : String(err),
          latencyMs,
        })
      }
      return []
    }
  }

  public async getOperationsOverview(era: QualityEra = 'current'): Promise<OperationsOverview> {
    const client = this.ensureClient()
    const dataSources: DataSourceStatus[] = []

    const localFeedbackSources: DataSourceStatus[] = []
    const [
      childrenData,
      subsData,
      jobsData,
      materialsData,
      enrollmentData,
      submissionsData,
      feedbackData,
    ] = await Promise.all([
      this.safeQuery<any[]>('children', () => client.from('children').select('id, display_name, is_active, is_internal_test'), dataSources),
      this.safeQuery<any[]>('subscriptions', () => client.from('subscriptions').select('id, child_id, status, plan_code, billing_interval, founding_status'), dataSources),
      this.safeQuery<any[]>('generation_jobs', () => client.from('generation_jobs').select('*').order('created_at', { ascending: false }).limit(200), dataSources),
      this.safeQuery<any[]>('materials', () => client.from('materials').select(OPERATIONS_MATERIALS_SELECT).order('created_at', { ascending: false }).limit(200), dataSources),
      this.safeQuery<any>('enrollment_state', () => client.rpc('get_enrollment_state').then((result: any) => ({
        data: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
        error: result.error,
      })), dataSources),
      this.queryCurriculumSubmissions(undefined, 200, dataSources),
      this.safeQuery<any[]>('feedback', () => client.from('feedback').select('id, child_id, material_id, created_at').order('created_at', { ascending: false }).limit(200), localFeedbackSources),
    ])

    const children = (childrenData as any[]) || []
    const activeChildren = children.filter((c) => c.is_active && !c.is_internal_test)
    const internalTestChildIds = new Set(children.filter((c) => c.is_internal_test).map((c) => c.id))
    const subscriptions = (subsData as any[]) || []

    let paidActiveCount = 0
    let monthlyPaidCount = 0
    let annualPaidCount = 0
    let trialingCount = 0
    let pastDueCount = 0
    let canceledCount = 0
    let foundingRedeemedCount = 0
    let foundingEligibleCount = 0

    for (const sub of subscriptions) {
      if (internalTestChildIds.has(sub.child_id)) continue
      if (sub.status === 'active') {
        paidActiveCount++
        if (sub.billing_interval === 'year' || (sub.plan_code && sub.plan_code.includes('annual'))) {
          annualPaidCount++
        } else {
          monthlyPaidCount++
        }
      } else if (sub.status === 'trialing') {
        trialingCount++
      } else if (sub.status === 'past_due') {
        pastDueCount++
      } else if (sub.status === 'canceled') {
        canceledCount++
      }

      if (sub.founding_status === 'redeemed') {
        foundingRedeemedCount++
      } else if (sub.founding_status === 'eligible') {
        foundingEligibleCount++
      }
    }

    const jobs = (jobsData as any[]) || []
    const materials = (materialsData as any[]) || []
    const submissions = (submissionsData as any[]) || []
    const feedbackList = (feedbackData as any[]) || []
    const feedbackMaterialIds = new Set<string>(feedbackList.map((f: any) => f.material_id).filter(Boolean))
    const childMaterialCounts = new Map<string, number>()
    for (const m of materials) {
      childMaterialCounts.set(m.child_id, (childMaterialCounts.get(m.child_id) || 0) + 1)
    }

    const overrideResult = await client.from('material_quality_overrides').select('*').order('created_at', { ascending: false }).limit(200)
    const overrides = overrideResult.error ? [] : (overrideResult.data ?? [])

    const now = new Date().toISOString()
    const stuckJobs: OperationsOverview['stuckJobs'] = []
    const anomalies: string[] = []

    let pendingJobs = 0
    let claimedJobs = 0
    let completedJobs = 0
    let failedJobs = 0
    let overdueOrStuckCount = 0

    for (const job of jobs) {
      if (job.status === 'pending') pendingJobs++
      else if (job.status === 'claimed') claimedJobs++
      else if (job.status === 'completed') completedJobs++
      else if (job.status === 'failed') failedJobs++

      const isLeaseExpired = job.status === 'claimed' && job.lease_expires_at && job.lease_expires_at < now
      const isPastDue = job.status === 'pending' && job.generation_due_at && job.generation_due_at <= now
      const isExhausted = job.status === 'failed' && job.attempt_count >= (job.max_attempts || 3)

      if (isLeaseExpired || isPastDue || isExhausted) {
        overdueOrStuckCount++
        const child = children.find((c: any) => c.id === job.child_id)
        stuckJobs.push({
          id: job.id,
          childId: job.child_id,
          childPseudonym: this.maskName(child?.display_name, job.child_id),
          materialWeek: job.material_week,
          status: job.status,
          claimedBy: job.claimed_by,
          leaseExpiresAt: job.lease_expires_at,
          generationDueAt: job.generation_due_at,
          attemptCount: job.attempt_count,
          maxAttempts: job.max_attempts || 3,
          stuckReason: isLeaseExpired
            ? 'Claim lease expired without completion'
            : isPastDue
            ? 'Past generation deadline'
            : 'Max attempts exhausted',
        })
      }
    }

    // Finisher Queue stats explicitly separated from generation jobs with Quality Era awareness
    const computeSubsStats = (subsList: any[]) => {
      let pending = 0
      let processing = 0
      let completed = 0
      let qualityRejected = 0
      let technicalFailed = 0
      for (const sub of subsList) {
        if (sub.status === 'pending') pending++
        else if (sub.status === 'processing') processing++
        else if (sub.status === 'completed') completed++
        else if (sub.status === 'quality_rejected') qualityRejected++
        else if (sub.status === 'technical_failed') technicalFailed++
      }
      const evaluated = completed + qualityRejected + technicalFailed
      const rejectionRatePercent = evaluated > 0 ? Number((((qualityRejected + technicalFailed) / evaluated) * 100).toFixed(1)) : 0
      return { total: evaluated, pending, processing, completed, qualityRejected, technicalFailed, rejectionRatePercent }
    }

    const engineV1Subs = submissions.filter((s) => classifyQualityEra({
      schemaVersion: s.schema_version,
      promptVersion: s.prompt_version,
      ruleVersion: s.rule_version,
      qualityProfile: s.quality_profile || s.qualityProfile,
      failureEvidence: s.failure_evidence,
      canonicalSource: s.canonical_source,
    }) === 'engine_v1')

    const historicalSubs = submissions.filter((s) => classifyQualityEra({
      schemaVersion: s.schema_version,
      promptVersion: s.prompt_version,
      ruleVersion: s.rule_version,
      qualityProfile: s.quality_profile || s.qualityProfile,
      failureEvidence: s.failure_evidence,
      canonicalSource: s.canonical_source,
    }) === 'historical')

    const engineV1FinisherStats = computeSubsStats(engineV1Subs)
    const historicalFinisherStats = computeSubsStats(historicalSubs)
    const allFinisherStats = computeSubsStats(submissions)

    const activeFinisherStats = era === 'historical' ? historicalFinisherStats : (era === 'all' ? allFinisherStats : engineV1FinisherStats)

    if (stuckJobs.length > 0) {
      anomalies.push(`檢測到 ${stuckJobs.length} 個逾期或租約逾時的生成任務需排查。`)
    }
    if (activeFinisherStats.qualityRejected > 0) {
      anomalies.push(`近期有 ${activeFinisherStats.qualityRejected} 次 Finisher 品質審核退回 (QUALITY_REJECTED)。`)
    }
    if (failedJobs > 0) {
      anomalies.push(`生成佇列中存在 ${failedJobs} 筆失敗任務。`)
    }

    const hasSourceError = dataSources.some((ds) => ds.status === 'error')
    const systemHealth: OperationsOverview['systemHealth'] = hasSourceError
      ? 'degraded'
      : anomalies.length >= 2 || failedJobs > 5
      ? 'critical'
      : anomalies.length > 0
      ? 'attention_needed'
      : 'healthy'

    const childMap = new Map(children.map((c: any) => [c.id, c.display_name]))
    const recentDeliveries = materials.map((m: any) => ({
      id: m.id,
      childId: m.child_id,
      childPseudonym: this.maskName(childMap.get(m.child_id), m.child_id),
      materialWeek: m.material_week,
      revision: m.revision,
      ruleVersion: m.rule_version,
      modelName: m.model_name,
      createdAt: m.created_at,
      hasStudentPdf: Boolean(m.student_pdf_path),
      hasParentPdf: Boolean(m.parent_answer_pdf_path),
    }))

    const enrollment = enrollmentData as any
    const maxCapacity = enrollment?.capacity ?? enrollment?.max_capacity ?? 100
    const foundingLimit = enrollment?.founding_limit ?? 30
    const capacityStatus = enrollment?.status ?? enrollment?.capacity_status ?? (activeChildren.length >= maxCapacity ? 'closed' : 'open')

    const capacity: OperationsOverview['capacity'] = {
      activeCount: enrollment?.active_count ?? activeChildren.length,
      maxCapacity,
      status: capacityStatus as any,
      foundingCount: foundingRedeemedCount,
      foundingLimit,
      waitingCount: enrollment?.waiting_count ?? 0,
      releasedCount: enrollment?.released_count ?? 0,
      totalDemand: enrollment?.total_demand
        ?? ((enrollment?.active_count ?? activeChildren.length) + (enrollment?.waiting_count ?? 0) + (enrollment?.released_count ?? 0)),
    }

    const latestSubmissionByJob = new Map<string, any>()
    for (const submission of submissions) {
      const previous = latestSubmissionByJob.get(submission.job_id)
      if (!previous || Number(submission.authoring_attempt) > Number(previous.authoring_attempt)) {
        latestSubmissionByJob.set(submission.job_id, submission)
      }
    }
    const pipeline = deriveOperationsPipeline({
      jobs,
      submissions,
      overrides,
      childNames: childMap,
      maskName: (name, id) => this.maskName(name, id),
      now,
      feedbackMaterialIds,
      childMaterialCounts,
    })
    const expected = { ...CURRENT_ENGINE_MANIFEST } as Record<string, string>
    const drift: OperationsOverview['engineInspector']['drift'] = []
    const alignmentStatus = 'aligned'

    return {
      systemHealth,
      selectedEra: era,
      dataSources,
      activeChildrenCount: activeChildren.length,
      totalChildrenCount: children.length,
      activeSubscriptionsCount: paidActiveCount,
      subscriptionBreakdown: {
        paidActiveCount,
        monthlyPaidCount,
        annualPaidCount,
        trialingCount,
        pastDueCount,
        canceledCount,
        foundingRedeemedCount,
        foundingEligibleCount,
      },
      capacity,
      queueStats: {
        pending: pendingJobs,
        claimed: claimedJobs,
        completed: completedJobs,
        failed: failedJobs,
        overdueOrStuck: overdueOrStuckCount,
      },
      finisherStats: {
        pending: activeFinisherStats.pending,
        processing: activeFinisherStats.processing,
        completed: activeFinisherStats.completed,
        qualityRejected: activeFinisherStats.qualityRejected,
        technicalFailed: activeFinisherStats.technicalFailed,
        totalSubmissions: activeFinisherStats.total,
        rejectionRatePercent: activeFinisherStats.rejectionRatePercent,
        eraBreakdown: {
          engineV1: {
            total: engineV1FinisherStats.total,
            completed: engineV1FinisherStats.completed,
            qualityRejected: engineV1FinisherStats.qualityRejected,
            technicalFailed: engineV1FinisherStats.technicalFailed,
            rejectionRatePercent: engineV1FinisherStats.rejectionRatePercent,
          },
          historical: {
            total: historicalFinisherStats.total,
            completed: historicalFinisherStats.completed,
            qualityRejected: historicalFinisherStats.qualityRejected,
            technicalFailed: historicalFinisherStats.technicalFailed,
            rejectionRatePercent: historicalFinisherStats.rejectionRatePercent,
          },
        },
      },
      recentDeliveries,
      stuckJobs: stuckJobs.slice(0, 10),
      anomalies,
      pipeline,
      engineInspector: { expected, aligned: alignmentStatus === 'aligned', alignmentStatus, drift },
    }
  }

  public async getSubscriptionRevenueData(rangeDays = 90): Promise<SubscriptionRevenueData> {
    const client = this.ensureClient()
    const days = [7, 14, 30, 90, 180, 365].includes(rangeDays) ? rangeDays : (rangeDays > 0 ? rangeDays : 90)
    const dataSources: DataSourceStatus[] = []
    const [childrenData, subscriptionsData, eventsData] = await Promise.all([
      this.safeQuery<any[]>('subscription_children', () => client.from('children').select('id, display_name, is_internal_test'), dataSources),
      this.safeQuery<any[]>('subscriptions', () => client.from('subscriptions').select('id, child_id, provider, status, plan_code, billing_interval, price_twd, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at'), dataSources),
      this.safeQuery<any[]>('subscription_lifecycle_events', () => client.from('subscription_lifecycle_events').select('id, subscription_id, child_id, event_type, source, source_event_id, effective_at, observed_status').order('effective_at', { ascending: true }).limit(5000), dataSources),
    ])
    const children = (childrenData as any[]) || []
    const internalIds = new Set(children.filter((child) => child.is_internal_test).map((child) => child.id))
    const childNames = new Map(children.map((child) => [child.id, child.display_name]))
    const subscriptions = ((subscriptionsData as any[]) || []).filter((subscription) => !internalIds.has(subscription.child_id))
    const events = ((eventsData as any[]) || []).filter((event) => !internalIds.has(event.child_id))
    const current = { trialing: 0, activePaid: 0, cancelScheduled: 0, pastDue: 0, paused: 0, canceled: 0 }
    for (const subscription of subscriptions) {
      if (subscription.cancel_at_period_end && subscription.status !== 'canceled') current.cancelScheduled++
      else if (subscription.status === 'trialing') current.trialing++
      else if (subscription.status === 'active') current.activePaid++
      else if (subscription.status === 'past_due') current.pastDue++
      else if (subscription.status === 'paused') current.paused++
      else if (subscription.status === 'canceled') current.canceled++
    }

    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - days + 1)
    const states = new Map<string, 'trial' | 'paid' | 'inactive'>()
    const trialChildren = new Set<string>()
    const activatedAfterTrial = new Set<string>()
    const buckets = new Map<string, { trials: number; newPaid: number; cancellations: number }>()
    const applyEvent = (event: any) => {
      if (event.event_type === 'trial_started') {
        states.set(event.child_id, 'trial')
        trialChildren.add(event.child_id)
      } else if (event.event_type === 'activated' || event.event_type === 'resumed') {
        if (trialChildren.has(event.child_id) && event.event_type === 'activated') activatedAfterTrial.add(event.child_id)
        states.set(event.child_id, 'paid')
      } else if (['canceled', 'expired', 'paused', 'past_due'].includes(event.event_type)) {
        states.set(event.child_id, 'inactive')
      }
    }
    for (const event of events.filter((item) => new Date(item.effective_at) < start)) applyEvent(event)
    for (const event of events.filter((item) => new Date(item.effective_at) >= start)) {
      const date = String(event.effective_at).slice(0, 10)
      const bucket = buckets.get(date) || { trials: 0, newPaid: 0, cancellations: 0 }
      if (event.event_type === 'trial_started') bucket.trials++
      if (event.event_type === 'activated') bucket.newPaid++
      if (event.event_type === 'canceled' || event.event_type === 'expired') bucket.cancellations++
      buckets.set(date, bucket)
    }
    const series: SubscriptionRevenueData['series'] = []
    let totalTrials = trialChildren.size
    let totalConversions = activatedAfterTrial.size
    for (let offset = 0; offset < days; offset++) {
      const date = new Date(start)
      date.setUTCDate(start.getUTCDate() + offset)
      const key = date.toISOString().slice(0, 10)
      const bucket = buckets.get(key) || { trials: 0, newPaid: 0, cancellations: 0 }
      for (const event of events.filter((item) => String(item.effective_at).slice(0, 10) === key)) {
        const wasTrial = trialChildren.has(event.child_id)
        applyEvent(event)
        if (event.event_type === 'trial_started') totalTrials++
        if (event.event_type === 'activated' && wasTrial) totalConversions++
      }
      series.push({
        date: key,
        activePaid: Array.from(states.values()).filter((state) => state === 'paid').length,
        trials: bucket.trials,
        newPaid: bucket.newPaid,
        cancellations: bucket.cancellations,
        netGrowth: bucket.newPaid - bucket.cancellations,
        conversionPercent: totalTrials > 0 ? Number(((totalConversions / totalTrials) * 100).toFixed(1)) : 0,
      })
    }
    const bySubscription = new Map<string, any[]>()
    for (const event of events) bySubscription.set(event.subscription_id, [...(bySubscription.get(event.subscription_id) || []), event])
    const cancelScheduled = new Set(events.filter((event) => event.event_type === 'cancel_scheduled').map((event) => event.child_id))
    const canceled = new Set(events.filter((event) => ['canceled', 'expired'].includes(event.event_type)).map((event) => event.child_id))
    return {
      rangeDays: days,
      instrumentationStartedAt: events[0]?.effective_at ?? null,
      current,
      series,
      funnels: {
        subscription: { observable: events.length > 0, trialStarted: trialChildren.size, activatedAfterTrial: activatedAfterTrial.size },
        cancellation: { observable: events.length > 0, cancelScheduled: cancelScheduled.size, canceled: canceled.size },
      },
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        childId: subscription.child_id,
        childPseudonym: this.maskName(childNames.get(subscription.child_id), subscription.child_id),
        status: subscription.cancel_at_period_end && subscription.status !== 'canceled' ? 'cancel_scheduled' : subscription.status,
        planCode: subscription.plan_code,
        billingInterval: subscription.billing_interval,
        priceTwd: subscription.price_twd,
        startDate: subscription.current_period_start || subscription.created_at,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        events: (bySubscription.get(subscription.id) || []).slice().reverse().map((event) => ({
          id: event.id, eventType: event.event_type, source: event.source,
          sourceEventId: event.source_event_id, effectiveAt: event.effective_at, observedStatus: event.observed_status,
        })),
      })).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    }
  }
  public async getFailureIntelligence(era: QualityEra = 'current'): Promise<FailureIntelligence> {
    const client = this.ensureClient()
    const dataSources: DataSourceStatus[] = []

    const [allJobsData, submissionsData, childrenData] = await Promise.all([
      this.safeQuery<any[]>('generation_jobs', () => client.from('generation_jobs').select('*').order('created_at', { ascending: false }).limit(200), dataSources),
      this.queryCurriculumSubmissions(undefined, 200, dataSources),
      this.safeQuery<any[]>('children', () => client.from('children').select('id, display_name'), dataSources),
    ])

    const allJobs = (allJobsData as any[]) || []
    const failedJobs = allJobs.filter((j) => j.status === 'failed' || j.error_code != null)
    const submissions = (submissionsData as any[]) || []
    const failedSubmissions = submissions.filter((s) => s.status === 'quality_rejected' || s.status === 'technical_failed')
    const childMap = new Map(((childrenData as any[]) || []).map((c: any) => [c.id, c.display_name]))

    return this.aggregateFailures(allJobs, failedJobs, submissions, failedSubmissions, childMap, dataSources, era)
  }

  public async getFeedbackIntelligence(): Promise<ParentFeedbackIntelligence> {
    const client = this.ensureClient()
    const dataSources: DataSourceStatus[] = []

    const [feedbackData, childrenData, materialsData] = await Promise.all([
      this.safeQuery<any[]>('feedback', () => client.from('feedback').select('*').order('created_at', { ascending: false }).limit(200), dataSources),
      this.safeQuery<any[]>('children', () => client.from('children').select('id, display_name'), dataSources),
      this.safeQuery<any[]>('materials', () => client.from('materials').select('id, material_week'), dataSources),
    ])

    const feedbackList = (feedbackData as any[]) || []
    const childMap = new Map(((childrenData as any[]) || []).map((c: any) => [c.id, c.display_name]))
    const materialMap = new Map(((materialsData as any[]) || []).map((m: any) => [m.id, m.material_week]))
    const knownNames = Array.from(childMap.values()).filter(Boolean) as string[]

    return this.aggregateFeedback(feedbackList, childMap, materialMap, knownNames, dataSources)
  }

  public async getProductFeedbackIntelligence(): Promise<ProductFeedbackIntelligence> {
    const client = this.ensureClient()
    const dataSources: DataSourceStatus[] = []

    const [productFeedbackData, subsData, childrenData] = await Promise.all([
      this.safeQuery<any[]>('product_feedback', () => client.from('product_feedback').select('*').order('created_at', { ascending: false }).limit(200), dataSources),
      this.safeQuery<any[]>('subscriptions', () => client.from('subscriptions').select('id, status, cancel_at_period_end'), dataSources),
      this.safeQuery<any[]>('children', () => client.from('children').select('display_name'), dataSources),
    ])

    const feedbackItems = (productFeedbackData as any[]) || []
    const subscriptions = (subsData as any[]) || []
    const knownNames = ((childrenData as any[]) || []).map((c: any) => c.display_name).filter(Boolean)

    const totalFeedbackCount = feedbackItems.length
    const categoryCounts: Record<string, { count: number; messages: string[] }> = {
      bug: { count: 0, messages: [] },
      flow: { count: 0, messages: [] },
      materials: { count: 0, messages: [] },
      other: { count: 0, messages: [] },
    }

    for (const item of feedbackItems) {
      const cat = item.category in categoryCounts ? item.category : 'other'
      categoryCounts[cat].count++
      if (categoryCounts[cat].messages.length < 5) {
        categoryCounts[cat].messages.push(this.sanitizePiiText(item.message, knownNames))
      }
    }

    const categoryLabels: Record<string, string> = {
      bug: '程式異常 / Bug',
      flow: '使用流程困惑',
      materials: '教材內容反饋',
      other: '其他建議',
    }

    const categoryBreakdown: ProductFeedbackIntelligence['categoryBreakdown'] = (['bug', 'flow', 'materials', 'other'] as const).map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      count: categoryCounts[cat].count,
      percentage: totalFeedbackCount > 0 ? Math.round((categoryCounts[cat].count / totalFeedbackCount) * 100) : 0,
      recentMessages: categoryCounts[cat].messages,
    }))

    let activeCount = 0
    let trialingCount = 0
    let pastDueCount = 0
    let canceledCount = 0
    let cancelingAtPeriodEndCount = 0

    for (const sub of subscriptions) {
      if (sub.status === 'active') activeCount++
      else if (sub.status === 'trialing') trialingCount++
      else if (sub.status === 'past_due') pastDueCount++
      else if (sub.status === 'canceled') canceledCount++

      if (sub.cancel_at_period_end) cancelingAtPeriodEndCount++
    }

    return {
      dataSources,
      totalFeedbackCount,
      categoryBreakdown,
      subscriptionFriction: {
        totalSubscriptions: subscriptions.length,
        activeCount,
        trialingCount,
        pastDueCount,
        canceledCount,
        cancelingAtPeriodEndCount,
      },
      instrumentationStatus: {
        collectedSources: [
          { name: 'Product Feedback Table', status: 'active', description: 'Parent bug/flow/materials direct submissions' },
          { name: 'Subscription State & Interval', status: 'active', description: 'Paddle subscription status, interval, and period ends' },
          { name: 'Weekly Lesson Feedback', status: 'active', description: 'Structured difficulty, weak areas, and freeform child voice' },
          { name: 'Generation & Finisher Error Diagnostics', status: 'active', description: 'Deterministic audit findings and failure evidence' },
        ],
        futureInstrumentationNeeded: [
          { name: 'Landing Page & Funnel Telemetry', status: 'pending', reason: 'PostHog / Umami integration pending for public traffic conversion' },
          { name: 'PDF Signed URL Download Events', status: 'pending', reason: 'Track whether parents actually opened/printed the PDF' },
          { name: 'Onboarding Multi-Child Step Dropoff', status: 'pending', reason: 'Granular step-by-step form abandonment logging' },
          { name: 'Cancellation Survey Reason Field', status: 'pending', reason: 'Detailed cancellation survey table pending database migration' },
        ],
      },
      messages: feedbackItems.map((item) => ({
        id: item.id,
        category: item.category in categoryCounts ? item.category : 'other',
        message: this.sanitizePiiText(item.message, knownNames),
        createdAt: item.created_at,
      })),
    }
  }

  private availableChildrenCache: {
    data: ChildWeekTimeline['availableChildren']
    expiresAt: number
  } | null = null

  public invalidateAvailableChildrenCache() {
    this.availableChildrenCache = null
  }

  private async fetchAvailableChildren(client: any, dataSources: DataSourceStatus[]): Promise<ChildWeekTimeline['availableChildren']> {
    const now = Date.now()
    if (this.availableChildrenCache && this.availableChildrenCache.expiresAt > now) {
      return this.availableChildrenCache.data
    }

    const [allChildrenData, allSubsData] = await Promise.all([
      this.safeQuery<any[]>('children', () => client.from('children').select('id, display_name, grade, is_active').order('created_at', { ascending: false }), dataSources),
      this.safeQuery<any[]>('subscriptions', () => client.from('subscriptions').select('child_id, status'), dataSources),
    ])

    const allChildrenList = (allChildrenData as any[]) || []
    const subStatusMap = new Map(((allSubsData as any[]) || []).map((s: any) => [s.child_id, s.status]))

    const availableChildren = allChildrenList.map((c: any) => ({
      id: c.id,
      displayPseudonym: this.maskName(c.display_name, c.id),
      grade: c.grade,
      subscriptionStatus: subStatusMap.get(c.id) || 'none',
    }))

    this.availableChildrenCache = {
      data: availableChildren,
      expiresAt: now + 30000,
    }
    return availableChildren
  }

  public async getChildWeekTimeline(childId?: string, targetWeek?: string): Promise<ChildWeekTimeline> {
    const client = this.ensureClient()
    const dataSources: DataSourceStatus[] = []

    const availableChildren = await this.fetchAvailableChildren(client, dataSources)

    let effectiveChildId: string = childId || ''
    if (!effectiveChildId) {
      // 1. Check for active test mode session
      const activeSessionData = await this.safeQuery<any>(
        'active_test_session',
        () => client.from('generation_test_mode_sessions').select('child_id').eq('is_enabled', true).maybeSingle(),
        dataSources
      )
      const activeChildId = activeSessionData?.data?.child_id || activeSessionData?.child_id
      if (activeChildId && availableChildren.some((c) => c.id === activeChildId)) {
        effectiveChildId = activeChildId
      } else {
        // 2. Default to Pax if available (case-insensitive name check on raw children)
        const paxChildData = await this.safeQuery<any>(
          'pax_child',
          () => client.from('children').select('id').ilike('display_name', '%pax%').eq('is_active', true).maybeSingle(),
          dataSources
        )
        const paxId = paxChildData?.data?.id || paxChildData?.id
        if (paxId && availableChildren.some((c) => c.id === paxId)) {
          effectiveChildId = paxId
        } else if (availableChildren.length > 0) {
          effectiveChildId = availableChildren[0].id
        } else {
          return this.buildEmptyTimeline(targetWeek || new Date().toISOString().slice(0, 10), 'none', availableChildren, dataSources)
        }
      }
    }

    if (!effectiveChildId) {
      return this.buildEmptyTimeline(targetWeek || new Date().toISOString().slice(0, 10), 'none', availableChildren, dataSources)
    }

    const [childData, subData, jobsData, learningData, testModeStatus] = await Promise.all([
      this.safeQuery<any>('child_single', () => client.from('children').select('*').eq('id', effectiveChildId).maybeSingle(), dataSources),
      this.safeQuery<any>('subscription_single', () => client.from('subscriptions').select('*').eq('child_id', effectiveChildId).maybeSingle(), dataSources),
      this.safeQuery<any[]>('child_jobs', () => client.from('generation_jobs').select('*').eq('child_id', effectiveChildId).order('created_at', { ascending: false }).limit(10), dataSources),
      this.safeQuery<any>('learning_state', () => client.from('child_learning_state').select('*').eq('child_id', effectiveChildId).maybeSingle(), dataSources),
      this.getTestModeStatus(effectiveChildId).catch(() => null),
    ])

    const child = childData as any
    if (!child) {
      return this.buildEmptyTimeline(targetWeek || new Date().toISOString().slice(0, 10), effectiveChildId, availableChildren, dataSources)
    }

    const jobs = (jobsData as any[]) || []
    const selectedJob = (targetWeek ? jobs.find((j: any) => j.material_week === targetWeek) : jobs[0]) || jobs[0]
    const actualWeek = selectedJob?.material_week || targetWeek || new Date().toISOString().slice(0, 10)

    let submissions: any[] = []
    let material: any = null
    let feedback: any = null

    if (selectedJob) {
      const [submissionsRes, matData, fbData] = await Promise.all([
        this.queryCurriculumSubmissions(selectedJob.id, 20, dataSources),
        selectedJob.material_id
          ? this.safeQuery<any>('material_single', () => client.from('materials').select('*').eq('id', selectedJob.material_id).maybeSingle(), dataSources)
          : this.safeQuery<any>('material_by_week', () => client.from('materials').select('*').eq('child_id', effectiveChildId).eq('material_week', actualWeek).maybeSingle(), dataSources),
        selectedJob.material_id
          ? this.safeQuery<any>('feedback_single', () => client.from('feedback').select('*').eq('child_id', effectiveChildId).eq('material_id', selectedJob.material_id).maybeSingle(), dataSources)
          : Promise.resolve(null),
      ])
      submissions = submissionsRes || []
      material = matData
      feedback = fbData
    } else {
      material = await this.safeQuery<any>('material_by_week', () => client.from('materials').select('*').eq('child_id', effectiveChildId).eq('material_week', actualWeek).maybeSingle(), dataSources)
    }

    return this.buildLifecycleTimeline({
      child,
      subscription: subData,
      job: selectedJob,
      submissions,
      material,
      feedback,
      learningState: learningData,
      targetWeek: actualWeek,
      availableChildren,
      testModeStatus,
      dataSources,
    })
  }

  public async getAiExportDataset(era: QualityEra = 'current'): Promise<AiExportDataset> {
    const client = this.ensureClient()
    const dataSources: DataSourceStatus[] = []

    const [overview, failures, feedback, materialsData, childrenData] = await Promise.all([
      this.getOperationsOverview(era),
      this.getFailureIntelligence(era),
      this.getFeedbackIntelligence(),
      this.safeQuery<any[]>('materials', () => client.from('materials').select('rule_version, model_name, generator_version, prompt_version'), dataSources),
      this.safeQuery<any[]>('children', () => client.from('children').select('display_name'), dataSources),
    ])

    const materials = (materialsData as any[]) || []
    const ruleVersions = Array.from(new Set(materials.map((m: any) => m.rule_version).filter(Boolean)))
    const generatorVersions = Array.from(new Set(materials.map((m: any) => m.generator_version).filter(Boolean)))
    const modelNames = Array.from(new Set(materials.map((m: any) => m.model_name).filter(Boolean)))
    const knownNames = ((childrenData as any[]) || []).map((c: any) => c.display_name).filter(Boolean)

    const dominantFailure = failures.errorCodeClusters[0]?.errorCode || null

    const dates = failures.dailyTrend.map((d) => d.date)
    const startDate = dates.length > 0 ? dates[0] : null
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null

    const generationFailureEvidence = failures.recentFailures.map((rf) => {
      const evidence = rf.failureEvidence as any
      const findings = evidence?.findings || evidence?.auditFindings || []
      return {
        jobId: rf.jobId,
        attempt: rf.authoringAttempt,
        stage: rf.stage,
        errorCode: rf.errorCode,
        errorMessage: this.sanitizePiiText(rf.errorMessage, knownNames),
        findings: findings.map((f: any) => ({
          rule: f.rule || f.code,
          message: this.sanitizePiiText(f.message || f.description || '', knownNames),
          description: this.sanitizePiiText(f.description || '', knownNames),
        })),
        timestamp: rf.timestamp,
        era: rf.era,
        schemaVersion: rf.schemaVersion,
        promptVersion: rf.promptVersion,
        modelName: rf.modelName,
      }
    })

    const parentFeedbackEvidence = feedback.recentFeedbackList.map((fb) => {
      const fullText = [fb.childComments, fb.parentComments, fb.mistakesText].filter(Boolean).join(' | ')
      return {
        week: fb.materialWeek,
        grade: null,
        difficulty: fb.difficulty,
        completionRate: fb.completionRate,
        weakArea: fb.weakArea,
        sanitizedFeedbackSnippet: this.sanitizePiiText(fullText, knownNames),
        topicThemes: feedback.topicClusters.filter((t) => t.sampleQuotes.some((sq) => fullText.includes(sq))).map((t) => t.topic),
      }
    })

    const qualityRuleViolationSummary = failures.qualityRuleViolations.map((rule) => ({
      ruleName: rule.rule,
      category: rule.category,
      violationCount: rule.count,
      sampleFinding: this.sanitizePiiText(rule.sampleFinding, knownNames),
      era: rule.era,
    }))

    const totalEvidenceCount = generationFailureEvidence.length + parentFeedbackEvidence.length

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      taxonomyVersion: 'cap-2.2.0',
      ruleVersions: ruleVersions.length > 0 ? ruleVersions : ['curriculum-rules/1.0.0'],
      generatorVersions: generatorVersions.length > 0 ? generatorVersions : ['curriculum/2.0.0'],
      modelNames: modelNames.length > 0 ? modelNames : ['gpt-5.6-sol'],
      exportedAt: new Date().toISOString(),
      timeWindow: {
        start: startDate,
        end: endDate,
      },
      provenance: {
        environment: 'production_database',
        era,
        currentEraName: formatEngineVersion(CURRENT_ENGINE_VERSION),
        currentEngineVersion: CURRENT_ENGINE_VERSION,
        currentSchemaVersion: CURRENT_SCHEMA_VERSION,
        currentPromptVersion: CURRENT_PROMPT_VERSION,
        totalEvidenceCount,
        currentEvidenceCount: failures.eraBreakdown.currentTotalFailures,
        historicalEvidenceCount: failures.eraBreakdown.historicalTotalFailures,
        activeChildren: overview.activeChildrenCount,
        paidSubscriptions: overview.subscriptionBreakdown.paidActiveCount,
        trialingSubscriptions: overview.subscriptionBreakdown.trialingCount,
        totalFailures: failures.totalFailures,
        dominantFailureCode: dominantFailure,
      },
      generationFailureEvidence,
      parentFeedbackEvidence,
      qualityRuleViolationSummary,
    }
  }

  // ==========================================
  // Deterministic Best-Effort PII Sanitizer & Aggregations
  // ==========================================

  public sanitizePiiText(text?: string | null, knownNames: string[] = []): string {
    if (!text) return ''
    let cleaned = text
    // 1. Phone numbers (Taiwan mobile & landline)
    cleaned = cleaned.replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, '[PHONE_REDACTED]')
    cleaned = cleaned.replace(/0\d{1,2}[-\s]?\d{6,8}/g, '[PHONE_REDACTED]')
    // 2. Email addresses
    cleaned = cleaned.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]')
    // 3. School names (e.g. 光武國中, 介壽國小)
    cleaned = cleaned.replace(/[\u4e00-\u9fa5]{2,6}(?:國中|高中|小學|國小|中學|實驗高級中學)/g, '[SCHOOL_REDACTED]')
    // 4. Personal teacher names (e.g. Teacher Amy, 王老師)
    cleaned = cleaned.replace(/[\u4e00-\u9fa5]{1,2}(?:老師|主任|校長|教練)/g, '[TEACHER_REDACTED]')
    cleaned = cleaned.replace(/\b(?:Teacher\s+[A-Za-z]+)\b/gi, '[TEACHER_REDACTED]')
    // 5. Dynamic known student/child names
    for (const name of knownNames) {
      if (name && name.trim().length >= 2) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '[NAME_REDACTED]')
      }
    }
    return cleaned
  }

  private maskName(name?: string | null, id?: string): string {
    if (!name || name.trim().length === 0) {
      return `Child #${(id || '0000').slice(0, 4)}`
    }
    const trimmed = name.trim()
    if (trimmed.length <= 1) return `${trimmed}*`
    return `${trimmed[0]}*${trimmed.slice(2)}`
  }

  private aggregateFailures(
    allJobs: any[],
    failedJobs: any[],
    allSubmissions: any[],
    failedSubmissions: any[],
    childMap: Map<string, string>,
    dataSources: DataSourceStatus[],
    era: QualityEra = 'current'
  ): FailureIntelligence {
    const getJobEra = (job: any): EraTag => {
      return classifyQualityEra({
        ruleVersion: job.rule_version,
        schemaVersion: job.schema_version,
        promptVersion: job.prompt_version,
        qualityProfile: job.quality_profile || job.model_quality_profile,
        failureEvidence: job.failure_evidence,
      })
    }

    const getSubEra = (sub: any): EraTag => {
      return classifyQualityEra({
        schemaVersion: sub.schema_version,
        promptVersion: sub.prompt_version,
        ruleVersion: sub.rule_version,
        qualityProfile: sub.quality_profile || sub.model_quality_profile,
        failureEvidence: sub.failure_evidence,
        canonicalSource: sub.canonical_source,
      })
    }

    // 1. Partition ALL jobs & submissions into Current (Engine v1) vs Historical
    const currentJobs = allJobs.filter((j) => getJobEra(j) === 'engine_v1')
    const historicalJobs = allJobs.filter((j) => getJobEra(j) === 'historical')
    const currentFailedJobs = failedJobs.filter((j) => getJobEra(j) === 'engine_v1')
    const historicalFailedJobs = failedJobs.filter((j) => getJobEra(j) === 'historical')

    const currentSubs = allSubmissions.filter((s) => getSubEra(s) === 'engine_v1')
    const historicalSubs = allSubmissions.filter((s) => getSubEra(s) === 'historical')
    const currentFailedSubs = failedSubmissions.filter((s) => getSubEra(s) === 'engine_v1')
    const historicalFailedSubs = failedSubmissions.filter((s) => getSubEra(s) === 'historical')

    const currentTotalFailures = currentFailedJobs.length + currentFailedSubs.length
    const historicalTotalFailures = historicalFailedJobs.length + historicalFailedSubs.length
    const allTotalFailures = currentTotalFailures + historicalTotalFailures

    // 2. Select active dataset according to chosen era
    const activeJobs = era === 'historical' ? historicalJobs : (era === 'all' ? allJobs : currentJobs)
    const activeFailedJobs = era === 'historical' ? historicalFailedJobs : (era === 'all' ? failedJobs : currentFailedJobs)
    const activeSubmissions = era === 'historical' ? historicalSubs : (era === 'all' ? allSubmissions : currentSubs)
    const activeFailedSubmissions = era === 'historical' ? historicalFailedSubs : (era === 'all' ? failedSubmissions : currentFailedSubs)

    const stageCounts: Record<string, number> = {
      worker_claim: 0,
      chatgpt_authoring: 0,
      finisher_audit: 0,
      pdf_rendering: 0,
      storage_upload: 0,
      unknown: 0,
    }

    const errorClusters: Record<string, {
      stage: string
      count: number
      affectedChildren: Set<string>
      firstSeen: string
      lastSeen: string
      sampleMessage: string
      suggestedRemedy: string
      era: EraTag
      engineVersion?: string | null
      occurrences: Array<{
        id: string
        jobId: string
        childId?: string
        childPseudonym: string
        materialWeek: string
        attempt: number
        timestamp: string
        message: string
        stage: string
        failureEvidence?: Record<string, unknown> | null
      }>
    }> = {}

    const qualityRules: Record<string, {
      count: number; category: string; description: string; sampleFinding: string; era: EraTag; engineVersion?: string | null
      children: Set<string>; attempts: Set<number>; recentExamples: FailureIntelligence['qualityRuleViolations'][number]['recentExamples']
    }> = {}
    const dailyCounts: Record<string, { total: number; qualityRejected: number; technicalFailed: number; currentCount: number; historicalCount: number }> = {}
    const recentFailuresList: FailureIntelligence['recentFailures'] = []

    for (const job of activeFailedJobs) {
      const code = job.error_code || 'JOB_FAILED'
      const msg = job.error_message || 'Unknown generation job failure'
      const stage = this.classifyStage(code, msg)
      const jobEra = getJobEra(job)
      stageCounts[stage]++

      const dateStr = (job.created_at || new Date().toISOString()).slice(0, 10)
      if (!dailyCounts[dateStr]) dailyCounts[dateStr] = { total: 0, qualityRejected: 0, technicalFailed: 0, currentCount: 0, historicalCount: 0 }
      dailyCounts[dateStr].total++
      if (jobEra === 'engine_v1') {
        dailyCounts[dateStr].currentCount++
      } else {
        dailyCounts[dateStr].historicalCount++
      }

      if (code === 'QUALITY_REJECTED' || stage === 'finisher_audit') {
        dailyCounts[dateStr].qualityRejected++
      } else {
        dailyCounts[dateStr].technicalFailed++
      }

      if (!errorClusters[code]) {
        errorClusters[code] = {
          stage,
          count: 0,
          affectedChildren: new Set(),
          firstSeen: job.created_at,
          lastSeen: job.created_at,
          sampleMessage: msg,
          suggestedRemedy: this.suggestRemedy(code),
          era: jobEra,
          engineVersion: job.engine_version || null,
          occurrences: [],
        }
      }
      errorClusters[code].count++
      if (job.child_id) {
        errorClusters[code].affectedChildren.add(job.child_id)
      }

      if (job.created_at > errorClusters[code].lastSeen) {
        errorClusters[code].lastSeen = job.created_at
        errorClusters[code].sampleMessage = msg
      }

      const jobChildDisplayName = job.child_id ? childMap.get(job.child_id) : null
      const jobPseudonym = job.child_id ? this.maskName(jobChildDisplayName, job.child_id) : `Job #${job.id.slice(0, 6)}`
      const jobTimestamp = job.updated_at || job.created_at || new Date().toISOString()
      const jobAttempt = Number(job.attempt_count) || 1

      errorClusters[code].occurrences.push({
        id: job.id,
        jobId: job.id,
        childId: job.child_id || undefined,
        childPseudonym: jobPseudonym,
        materialWeek: job.material_week || 'Week Cycle',
        attempt: jobAttempt,
        timestamp: jobTimestamp,
        message: msg,
        stage,
        failureEvidence: job.failure_evidence || null,
      })

      if (code === 'QUALITY_REJECTED' || msg.includes('Quality rubric') || msg.includes('Ceiling') || msg.includes('Jargon') || msg.includes('Guard')) {
        const ruleName = msg.includes(':') ? msg.split(':')[1].trim() : (code === 'QUALITY_REJECTED' ? 'Quality Rubric Rule' : code)
        if (!qualityRules[ruleName]) {
          qualityRules[ruleName] = {
            count: 0,
            category: this.classifyQualityCategory(ruleName),
            description: msg,
            sampleFinding: msg,
            era: jobEra,
            engineVersion: job.engine_version || null,
            children: new Set(), attempts: new Set(), recentExamples: [],
          }
        }
        qualityRules[ruleName].count++
        if (job.child_id) qualityRules[ruleName].children.add(job.child_id)
        qualityRules[ruleName].attempts.add(jobAttempt)
        qualityRules[ruleName].recentExamples.push({
          jobId: job.id,
          childId: job.child_id || undefined,
          childPseudonym: jobPseudonym,
          materialWeek: job.material_week || 'Week Cycle',
          attempt: jobAttempt,
          timestamp: jobTimestamp,
          message: msg,
          evidence: job.failure_evidence || {},
        })
      }

      recentFailuresList.push({
        id: job.id,
        jobId: job.id,
        childPseudonym: jobPseudonym,
        materialWeek: job.material_week || 'Week Cycle',
        stage,
        errorCode: code,
        errorMessage: msg,
        authoringAttempt: job.attempt_count,
        timestamp: job.created_at,
        failureEvidence: null,
        era: jobEra,
        engineVersion: job.engine_version || null,
        schemaVersion: job.schema_version || null,
        promptVersion: job.prompt_version || null,
        modelName: job.model_name || null,
      })
    }

    const jobMap = new Map(allJobs.map((j) => [j.id, j]))

    for (const sub of activeFailedSubmissions) {
      const parentJob = jobMap.get(sub.job_id)
      const effectiveChildId = sub.child_id || parentJob?.child_id || undefined
      const effectiveMaterialWeek = sub.material_week || parentJob?.material_week || 'Week Cycle'
      const code = sub.error_code || (sub.status === 'quality_rejected' ? 'QUALITY_REJECTED' : 'CURRICULUM_PIPELINE_FAILED')
      const msg = sub.error_message || (sub.status === 'quality_rejected' ? 'Curriculum quality verification rejected by Finisher' : 'Finisher processing failure')
      const stage = sub.status === 'quality_rejected' ? 'finisher_audit' : 'chatgpt_authoring'
      const subEra = getSubEra(sub)
      stageCounts[stage]++

      const dateStr = (sub.submitted_at || new Date().toISOString()).slice(0, 10)
      if (!dailyCounts[dateStr]) dailyCounts[dateStr] = { total: 0, qualityRejected: 0, technicalFailed: 0, currentCount: 0, historicalCount: 0 }
      dailyCounts[dateStr].total++
      if (subEra === 'engine_v1') {
        dailyCounts[dateStr].currentCount++
      } else {
        dailyCounts[dateStr].historicalCount++
      }

      if (sub.status === 'quality_rejected') {
        dailyCounts[dateStr].qualityRejected++
      } else {
        dailyCounts[dateStr].technicalFailed++
      }

      if (!errorClusters[code]) {
        errorClusters[code] = {
          stage,
          count: 0,
          affectedChildren: new Set(),
          firstSeen: sub.submitted_at,
          lastSeen: sub.submitted_at,
          sampleMessage: msg,
          suggestedRemedy: this.suggestRemedy(code),
          era: subEra,
          engineVersion: sub.engine_version || null,
          occurrences: [],
        }
      }
      errorClusters[code].count++
      if (effectiveChildId) {
        errorClusters[code].affectedChildren.add(effectiveChildId)
      } else {
        errorClusters[code].affectedChildren.add(sub.job_id)
      }

      const childDisplayName = effectiveChildId ? childMap.get(effectiveChildId) : null
      const pseudonym = effectiveChildId ? this.maskName(childDisplayName, effectiveChildId) : `Job #${sub.job_id.slice(0, 6)}`
      const subTimestamp = sub.processed_at || sub.submitted_at || new Date().toISOString()
      const subAttempt = Number(sub.authoring_attempt) || 1

      errorClusters[code].occurrences.push({
        id: `${sub.job_id}_${sub.authoring_attempt}`,
        jobId: sub.job_id,
        childId: effectiveChildId,
        childPseudonym: pseudonym,
        materialWeek: effectiveMaterialWeek,
        attempt: subAttempt,
        timestamp: subTimestamp,
        message: msg,
        stage,
        failureEvidence: sub.failure_evidence || null,
      })

      if (sub.failure_evidence && typeof sub.failure_evidence === 'object') {
        const evidence = sub.failure_evidence as any
        const findings = evidence.findings || evidence.auditFindings || []
        for (const finding of findings) {
          const ruleName = finding.rule || finding.code || finding.dimension || 'Pedagogical Rubric'
          if (!qualityRules[ruleName]) {
            qualityRules[ruleName] = {
              count: 0,
              category: this.classifyQualityCategory(ruleName),
              description: finding.description || finding.message || ruleName,
              sampleFinding: finding.message || JSON.stringify(finding),
              era: subEra,
              engineVersion: sub.engine_version || null,
              children: new Set(), attempts: new Set(), recentExamples: [],
            }
          }
          qualityRules[ruleName].count++
          qualityRules[ruleName].children.add(effectiveChildId || sub.job_id)
          qualityRules[ruleName].attempts.add(subAttempt)
          qualityRules[ruleName].recentExamples.push({
            jobId: sub.job_id,
            childId: effectiveChildId,
            childPseudonym: pseudonym,
            materialWeek: effectiveMaterialWeek,
            attempt: subAttempt,
            timestamp: subTimestamp,
            message: finding.message || finding.description || ruleName,
            evidence: sub.failure_evidence,
          })
        }
      }

      recentFailuresList.push({
        id: `${sub.job_id}_${sub.authoring_attempt}`,
        jobId: sub.job_id,
        childPseudonym: pseudonym,
        materialWeek: effectiveMaterialWeek,
        stage,
        errorCode: code,
        errorMessage: msg,
        authoringAttempt: sub.authoring_attempt,
        timestamp: sub.submitted_at,
        failureEvidence: sub.failure_evidence,
        era: subEra,
        engineVersion: sub.engine_version || (sub.canonical_source?.metadata?.engineVersion ?? sub.failure_evidence?.engineVersion ?? null),
        schemaVersion: sub.schema_version || (sub.failure_evidence?.schemaVersion ?? null),
        promptVersion: sub.prompt_version || (sub.failure_evidence?.promptVersion ?? null),
        modelName: sub.model_name || null,
      })
    }

    // 1. Generation stats (from activeJobs)
    const completedJobsCount = activeJobs.filter((j) => j.status === 'completed').length
    const failedJobsCount = activeFailedJobs.length
    const pendingJobsCount = activeJobs.filter((j) => j.status === 'pending').length
    const claimedJobsCount = activeJobs.filter((j) => j.status === 'claimed').length
    const terminalJobsEvaluated = completedJobsCount + failedJobsCount
    const generationFailureRatePercent = terminalJobsEvaluated > 0 ? Number(((failedJobsCount / terminalJobsEvaluated) * 100).toFixed(1)) : 0

    // 2. Finisher stats (from activeSubmissions)
    const completedSubsCount = activeSubmissions.filter((s) => s.status === 'completed').length
    const qualityRejectedCount = activeSubmissions.filter((s) => s.status === 'quality_rejected').length
    const technicalFailedCount = activeSubmissions.filter((s) => s.status === 'technical_failed').length
    const totalSubsEvaluated = completedSubsCount + qualityRejectedCount + technicalFailedCount
    const finisherRejectionRatePercent = totalSubsEvaluated > 0 ? Number((((qualityRejectedCount + technicalFailedCount) / totalSubsEvaluated) * 100).toFixed(1)) : 0

    const totalFailures = failedJobsCount + qualityRejectedCount + technicalFailedCount

    const stageBreakdown: FailureIntelligence['stageBreakdown'] = [
      { stage: 'finisher_audit', label: 'Finisher 審核與品質驗證', count: stageCounts.finisher_audit, percentage: totalFailures > 0 ? Math.round((stageCounts.finisher_audit / totalFailures) * 100) : 0 },
      { stage: 'chatgpt_authoring', label: 'ChatGPT 教材生成結構', count: stageCounts.chatgpt_authoring, percentage: totalFailures > 0 ? Math.round((stageCounts.chatgpt_authoring / totalFailures) * 100) : 0 },
      { stage: 'pdf_rendering', label: 'PDF 排版與渲染', count: stageCounts.pdf_rendering, percentage: totalFailures > 0 ? Math.round((stageCounts.pdf_rendering / totalFailures) * 100) : 0 },
      { stage: 'worker_claim', label: '工作排程與租約鎖定', count: stageCounts.worker_claim, percentage: totalFailures > 0 ? Math.round((stageCounts.worker_claim / totalFailures) * 100) : 0 },
      { stage: 'storage_upload', label: '檔案儲存與私有 Bucket', count: stageCounts.storage_upload, percentage: totalFailures > 0 ? Math.round((stageCounts.storage_upload / totalFailures) * 100) : 0 },
    ]

    const errorCodeClusters: FailureIntelligence['errorCodeClusters'] = Object.entries(errorClusters).map(([code, data]) => ({
      errorCode: code,
      stage: data.stage,
      count: data.count,
      affectedChildrenCount: data.affectedChildren.size,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      sampleMessage: data.sampleMessage,
      suggestedRemedy: data.suggestedRemedy,
      era: data.era,
      engineVersion: data.engineVersion,
      occurrences: data.occurrences.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    })).sort((a, b) => b.count - a.count)

    const qualityRuleViolations: FailureIntelligence['qualityRuleViolations'] = Object.entries(qualityRules).map(([rule, data]) => ({
      rule,
      category: data.category as any,
      count: data.count,
      description: data.description,
      sampleFinding: data.sampleFinding,
      era: data.era,
      engineVersion: data.engineVersion,
      affectedChildrenCount: data.children.size,
      attempts: [...data.attempts].sort((a, b) => a - b),
      recentExamples: data.recentExamples.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    })).sort((a, b) => b.count - a.count)

    const dailyTrend: FailureIntelligence['dailyTrend'] = Object.entries(dailyCounts)
      .map(([date, d]) => ({
        date,
        total: d.total,
        qualityRejected: d.qualityRejected,
        technicalFailed: d.technicalFailed,
        currentCount: d.currentCount,
        historicalCount: d.historicalCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    return {
      dataSources,
      selectedEra: era,
      eraBreakdown: {
        currentEraName: formatEngineVersion(CURRENT_ENGINE_VERSION),
        currentEngineVersion: CURRENT_ENGINE_VERSION,
        currentSchemaVersion: CURRENT_SCHEMA_VERSION,
        currentPromptVersion: CURRENT_PROMPT_VERSION,
        currentTotalFailures,
        historicalTotalFailures,
        allTotalFailures,
        currentJobsEvaluated: currentJobs.length,
        historicalJobsEvaluated: historicalJobs.length,
        currentSubmissionsEvaluated: currentSubs.length,
        historicalSubmissionsEvaluated: historicalSubs.length,
      },
      totalFailures,
      failureRatePercent: generationFailureRatePercent, // Default backward compatible field
      generationStats: {
        totalJobs: activeJobs.length,
        terminalJobs: terminalJobsEvaluated,
        completedJobs: completedJobsCount,
        failedJobs: failedJobsCount,
        pendingJobs: pendingJobsCount,
        claimedJobs: claimedJobsCount,
        failureRatePercent: generationFailureRatePercent,
      },
      finisherStats: {
        totalSubmissions: totalSubsEvaluated,
        completedSubmissions: completedSubsCount,
        qualityRejectedSubmissions: qualityRejectedCount,
        technicalFailedSubmissions: technicalFailedCount,
        rejectionRatePercent: finisherRejectionRatePercent,
      },
      stageBreakdown,
      errorCodeClusters,
      qualityRuleViolations,
      dailyTrend,
      recentFailures: recentFailuresList.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20),
    }
  }

  private aggregateFeedback(
    feedbackList: any[],
    childMap: Map<string, string>,
    materialMap: Map<string, string>,
    knownNames: string[],
    dataSources: DataSourceStatus[]
  ): ParentFeedbackIntelligence {
    let easyCount = 0
    let goodCount = 0
    let hardCount = 0

    let r0 = 0
    let r25 = 0
    let r50 = 0
    let r75 = 0
    let r100 = 0

    const weakCounts: Record<string, number> = {
      vocabulary: 0,
      grammar: 0,
      reading: 0,
      writing: 0,
      mixed: 0,
      none: 0,
    }

    const keywordBuckets: Record<string, { category: string; count: number; sentiment: 'positive' | 'neutral' | 'friction'; quotes: string[] }> = {
      '太長 / 篇幅偏多': { category: 'difficulty', count: 0, sentiment: 'friction', quotes: [] },
      '教材品質不滿 / 亂做 / 缺中文': { category: 'quality_friction', count: 0, sentiment: 'friction', quotes: [] },
      '單字難度過高': { category: 'vocabulary', count: 0, sentiment: 'friction', quotes: [] },
      '文法觀念混淆': { category: 'grammar', count: 0, sentiment: 'friction', quotes: [] },
      '閱讀很有趣 / 喜歡主題': { category: 'positive', count: 0, sentiment: 'positive', quotes: [] },
      '學校段考準備需求': { category: 'school_exam', count: 0, sentiment: 'neutral', quotes: [] },
      '主動完成 / 難度剛好': { category: 'positive', count: 0, sentiment: 'positive', quotes: [] },
      '科技 / 動漫興趣': { category: 'interests', count: 0, sentiment: 'neutral', quotes: [] },
    }

    const childVoiceQuotesList: ParentFeedbackIntelligence['childVoiceQuotes'] = []
    const recentList: ParentFeedbackIntelligence['recentFeedbackList'] = []

    for (const fb of feedbackList) {
      if (fb.difficulty === 1 || fb.difficulty === 2) easyCount++
      else if (fb.difficulty === 3) goodCount++
      else if (fb.difficulty === 4 || fb.difficulty === 5) hardCount++

      if (fb.completion_rate === 0) r0++
      else if (fb.completion_rate === 25) r25++
      else if (fb.completion_rate === 50) r50++
      else if (fb.completion_rate === 75) r75++
      else if (fb.completion_rate === 100) r100++

      if (fb.weak_area && fb.weak_area in weakCounts) {
        weakCounts[fb.weak_area]++
      } else {
        weakCounts.none++
      }

      const allText = [fb.child_comments, fb.parent_comments, fb.mistakes_text, fb.notes, fb.school_progress_update, fb.interest_update]
        .filter(Boolean)
        .join(' ')

      if (/太長|寫不完|耗時|篇幅/i.test(allText)) {
        keywordBuckets['太長 / 篇幅偏多'].count++
        if (keywordBuckets['太長 / 篇幅偏多'].quotes.length < 3 && fb.child_comments) {
          keywordBuckets['太長 / 篇幅偏多'].quotes.push(this.sanitizePiiText(fb.child_comments, knownNames))
        }
      }
      if (/亂做|超爛|中文|沒中文|法克|三小|很爛|糟糕/i.test(allText)) {
        keywordBuckets['教材品質不滿 / 亂做 / 缺中文'].count++
        if (keywordBuckets['教材品質不滿 / 亂做 / 缺中文'].quotes.length < 3 && fb.parent_comments) {
          keywordBuckets['教材品質不滿 / 亂做 / 缺中文'].quotes.push(this.sanitizePiiText(fb.parent_comments, knownNames))
        }
      }
      if (/單字|生字|背不起來|太難|看不太懂/i.test(allText)) {
        keywordBuckets['單字難度過高'].count++
        if (keywordBuckets['單字難度過高'].quotes.length < 3 && fb.parent_comments) {
          keywordBuckets['單字難度過高'].quotes.push(this.sanitizePiiText(fb.parent_comments, knownNames))
        }
      }
      if (/文法|時態|句型|被動|關係詞/i.test(allText)) {
        keywordBuckets['文法觀念混淆'].count++
        if (keywordBuckets['文法觀念混淆'].quotes.length < 3 && fb.mistakes_text) {
          keywordBuckets['文法觀念混淆'].quotes.push(this.sanitizePiiText(fb.mistakes_text, knownNames))
        }
      }
      if (/有趣|喜歡|好讀|精彩|進步/i.test(allText)) {
        keywordBuckets['閱讀很有趣 / 喜歡主題'].count++
        if (keywordBuckets['閱讀很有趣 / 喜歡主題'].quotes.length < 3 && fb.child_comments) {
          keywordBuckets['閱讀很有趣 / 喜歡主題'].quotes.push(this.sanitizePiiText(fb.child_comments, knownNames))
        }
      }
      if (/段考|月考|會考|模擬考|學校進度/i.test(allText)) {
        keywordBuckets['學校段考準備需求'].count++
        if (keywordBuckets['學校段考準備需求'].quotes.length < 3 && fb.school_progress_update) {
          keywordBuckets['學校段考準備需求'].quotes.push(this.sanitizePiiText(fb.school_progress_update, knownNames))
        }
      }
      if (/主動|自己寫完|剛剛好|順暢/i.test(allText)) {
        keywordBuckets['主動完成 / 難度剛好'].count++
        if (keywordBuckets['主動完成 / 難度剛好'].quotes.length < 3 && fb.parent_comments) {
          keywordBuckets['主動完成 / 難度剛好'].quotes.push(this.sanitizePiiText(fb.parent_comments, knownNames))
        }
      }
      if (/恐龍|籃球|動漫|AI|太空|電玩|遊戲/i.test(allText)) {
        keywordBuckets['科技 / 動漫興趣'].count++
        if (keywordBuckets['科技 / 動漫興趣'].quotes.length < 3 && fb.interest_update) {
          keywordBuckets['科技 / 動漫興趣'].quotes.push(this.sanitizePiiText(fb.interest_update, knownNames))
        }
      }

      const pseudonym = this.maskName(childMap.get(fb.child_id), fb.child_id)
      const week = materialMap.get(fb.material_id) || fb.created_at?.slice(0, 10) || '2026-08-17'

      if (fb.child_comments) {
        childVoiceQuotesList.push({
          quote: this.sanitizePiiText(fb.child_comments, knownNames),
          materialWeek: week,
          childPseudonym: pseudonym,
          difficulty: fb.difficulty,
          weakArea: fb.weak_area,
          createdAt: fb.created_at,
        })
      }

      recentList.push({
        id: fb.id,
        childPseudonym: pseudonym,
        materialWeek: week,
        difficulty: fb.difficulty === 1 || fb.difficulty === 2 ? 'too_easy' : fb.difficulty === 3 ? 'good' : 'too_hard',
        completionRate: fb.completion_rate,
        weakArea: fb.weak_area,
        mistakesText: this.sanitizePiiText(fb.mistakes_text, knownNames),
        childComments: this.sanitizePiiText(fb.child_comments, knownNames),
        parentComments: this.sanitizePiiText(fb.parent_comments, knownNames),
        schoolProgressUpdate: this.sanitizePiiText(fb.school_progress_update, knownNames),
        interestUpdate: this.sanitizePiiText(fb.interest_update, knownNames),
        createdAt: fb.created_at,
      })
    }

    const total = feedbackList.length
    const topicClusters: ParentFeedbackIntelligence['topicClusters'] = Object.entries(keywordBuckets).map(([topic, data]) => ({
      topic,
      category: data.category as any,
      frequency: data.count,
      sentiment: data.sentiment,
      sampleQuotes: data.quotes,
    })).filter((t) => t.frequency > 0).sort((a, b) => b.frequency - a.frequency)

    const weakLabels: Record<string, string> = {
      vocabulary: '單字理解與拼字',
      grammar: '文法與句型運用',
      reading: '篇章長文閱讀理解',
      writing: '手寫造句與表達',
      mixed: '綜合弱項',
      none: '無明顯卡點',
    }

    return {
      dataSources,
      totalSubmissions: total,
      difficultyDistribution: {
        tooEasy: { count: easyCount, percentage: total > 0 ? Math.round((easyCount / total) * 100) : 0 },
        good: { count: goodCount, percentage: total > 0 ? Math.round((goodCount / total) * 100) : 0 },
        tooHard: { count: hardCount, percentage: total > 0 ? Math.round((hardCount / total) * 100) : 0 },
      },
      completionRateDistribution: {
        rate0: r0,
        rate25: r25,
        rate5: r50,
        rate75: r75,
        rate100: r100,
      },
      weakAreaDistribution: (['vocabulary', 'grammar', 'reading', 'writing', 'mixed', 'none'] as const).map((area) => ({
        area,
        label: weakLabels[area],
        count: weakCounts[area],
        percentage: total > 0 ? Math.round((weakCounts[area] / total) * 100) : 0,
      })),
      topicClusters,
      childVoiceQuotes: childVoiceQuotesList.slice(0, 15),
      recentFeedbackList: recentList.slice(0, 20),
    }
  }

  private buildEmptyTimeline(targetWeek: string, childId = 'none', availableChildren: ChildWeekTimeline['availableChildren'] = [], dataSources: DataSourceStatus[] = []): ChildWeekTimeline {
    return {
      dataSources,
      childId,
      childPseudonym: '尚未選擇孩子',
      grade: 7,
      textbookVersion: null,
      isActive: false,
      targetWeek,
      subscriptionStatus: 'none',
      planCode: null,
      currentLearningSummary: {
        comprehensionAccuracy: null,
        difficultyTrend: null,
        recurringMistakesCount: 0,
      },
      events: [],
      availableChildren,
      testModeStatus: null,
      rawMetadata: {
        job: null,
        submissions: [],
        material: null,
        feedback: null,
        testModeStatus: null,
      },
    }
  }

  private buildLifecycleTimeline(data: {
    child: any
    subscription: any
    job: any
    submissions: any[]
    material: any
    feedback: any
    learningState: any
    targetWeek: string
    availableChildren: ChildWeekTimeline['availableChildren']
    testModeStatus?: GenerationTestModeStatus | null
    dataSources: DataSourceStatus[]
  }): ChildWeekTimeline {
    const { child, subscription, job, submissions, material, feedback, learningState, targetWeek, availableChildren, testModeStatus, dataSources } = data

    const now = new Date().toISOString()
    const releaseAt = job?.release_at || null
    const isReleasedToParent = Boolean(material) && Boolean(releaseAt) && now >= releaseAt

    // Canonical Sort: always order submissions ascending by authoring_attempt (1 -> 2 -> 3)
    const sortedSubmissions = [...submissions].sort((a, b) => (Number(a.authoring_attempt) || 0) - (Number(b.authoring_attempt) || 0))
    const firstSubmission = sortedSubmissions[0]
    const latestSubmission = sortedSubmissions[sortedSubmissions.length - 1]

    const isHumanReviewRequired = Boolean(
      job &&
      job.status !== 'completed' &&
      ((Number(job.attempt_count) || 0) >= (Number(job.max_attempts) || 3) || job.error_code === 'HUMAN_REVIEW_REQUIRED' || job.status === 'failed')
    )

    // Multi-attempt breakdown in ascending sequence covering all recorded attempt numbers
    const totalAttemptCount = Math.max(Number(job?.attempt_count) || 0, sortedSubmissions.length)
    const submissionMap = new Map(sortedSubmissions.map((s) => [Number(s.authoring_attempt) || 1, s]))

    const attemptBreakdown = Array.from({ length: totalAttemptCount }, (_, idx) => {
      const attemptNum = idx + 1
      const sub = submissionMap.get(attemptNum)
      if (sub) {
        const subEra = classifyQualityEra({
          schemaVersion: sub.schema_version,
          promptVersion: sub.prompt_version,
          ruleVersion: sub.rule_version,
          qualityProfile: sub.quality_profile || sub.model_quality_profile,
          failureEvidence: sub.failure_evidence,
          canonicalSource: sub.canonical_source,
        })
        return {
          attempt: attemptNum,
          status: sub.status,
          hasSubmission: true,
          submittedAt: sub.submitted_at,
          processorId: sub.processor_id,
          processedAt: sub.processed_at,
          errorCode: sub.error_code,
          errorMessage: sub.error_message,
          findings: (sub.failure_evidence?.findings || sub.failure_evidence?.auditFindings || []) as any[],
          era: subEra,
          engineVersion: sub.engine_version || (sub.canonical_source?.metadata?.engineVersion ?? sub.failure_evidence?.engineVersion ?? null),
          schemaVersion: sub.schema_version || (sub.failure_evidence?.schemaVersion ?? null),
          promptVersion: sub.prompt_version || (sub.failure_evidence?.promptVersion ?? null),
          modelName: sub.model_name || null,
        }
      }
      return {
        attempt: attemptNum,
        status: 'no_submission',
        hasSubmission: false,
        submittedAt: null,
        processorId: null,
        processedAt: null,
        errorCode: 'NO_SUBMISSION_PACKET',
        errorMessage: 'Claimed but no curriculum submission (認領逾時 / 未提交封包)',
        findings: [],
        era: 'engine_v1' as const,
        engineVersion: null,
        schemaVersion: null,
        promptVersion: null,
        modelName: null,
      }
    })

    const events: LifecycleEvent[] = [
      {
        step: 'SCHEDULED',
        label: '每週發行排程確立',
        status: job ? 'completed' : 'pending',
        timestamp: job?.created_at || child.created_at,
        details: {
          deliveryWeekday: child.delivery_weekday,
          scheduledFor: job?.scheduled_for,
          generationDueAt: job?.generation_due_at,
          releaseAt: job?.release_at,
          timezone: child.timezone,
        },
      },
      {
        step: 'FEEDBACK_CUTOFF',
        label: '家長反饋收件截止 (發行前 48h)',
        status: job?.feedback_missing === false || job?.status === 'completed' ? 'completed' : job?.feedback_cutoff_at ? 'warning' : 'pending',
        timestamp: job?.feedback_cutoff_at,
        details: {
          feedbackCutoffAt: job?.feedback_cutoff_at,
          feedbackMissing: job?.feedback_missing,
          sourceMaterialId: job?.source_material_id,
        },
      },
      {
        step: 'JOB_CLAIMED',
        label: 'ChatGPT Worker 認領任務',
        status: job?.status === 'claimed' || job?.status === 'completed' ? 'completed' : job?.status === 'failed' ? 'failed' : 'pending',
        timestamp: job?.updated_at,
        details: {
          claimedBy: job?.claimed_by,
          leaseExpiresAt: job?.lease_expires_at,
          attemptCount: job?.attempt_count,
          maxAttempts: job?.max_attempts,
          idempotencyKey: job?.idempotency_key,
        },
      },
      {
        step: 'SUBMISSION_AUTHORING',
        label: `ChatGPT 生成 Canonical 封包 (${attemptBreakdown.length || (job ? 1 : 0)} Attempts)`,
        status: sortedSubmissions.length > 0 || job?.status === 'completed' ? 'completed' : 'pending',
        timestamp: firstSubmission?.submitted_at || job?.updated_at,
        details: {
          totalAuthoringAttempts: attemptBreakdown.length,
          attempts: attemptBreakdown,
        },
      },
      {
        step: 'FINISHER_AUDIT',
        label: isHumanReviewRequired ? 'GitHub Actions Finisher 審核 (需人工審閱)' : 'GitHub Actions Finisher 審核與驗證',
        status: material ? 'completed' : isHumanReviewRequired ? 'failed' : latestSubmission?.status === 'quality_rejected' || latestSubmission?.status === 'technical_failed' ? 'failed' : latestSubmission?.status === 'completed' ? 'completed' : 'pending',
        timestamp: latestSubmission?.processed_at || material?.created_at,
        details: {
          lastOutcome: latestSubmission?.status || (material ? 'completed' : isHumanReviewRequired ? 'human_review_required' : 'pending'),
          rejectionCount: sortedSubmissions.filter((s) => s.status === 'quality_rejected').length,
          lastFailureEvidence: latestSubmission?.failure_evidence || null,
          attemptsHistory: attemptBreakdown,
          isHumanReviewRequired,
        },
        error: isHumanReviewRequired
          ? `已達嘗試次數上限 (${job.attempt_count}/${job.max_attempts})，需管理員審閱。`
          : latestSubmission?.status === 'quality_rejected' || latestSubmission?.status === 'technical_failed'
          ? latestSubmission?.error_message
          : undefined,
      },
      {
        step: 'MATERIAL_STORED',
        label: 'PDF 渲染完成並寫入私有儲存',
        status: material ? 'completed' : 'pending',
        timestamp: material?.created_at,
        details: {
          materialId: material?.id,
          revision: material?.revision,
          studentPdfPath: material?.student_pdf_path,
          parentAnswerPdfPath: material?.parent_answer_pdf_path,
          ruleVersion: material?.rule_version,
          modelName: material?.model_name,
        },
      },
      {
        step: 'DELIVERY_RELEASED',
        label: isReleasedToParent ? '家長端正式發行上線' : '等待發行排程時間',
        status: isReleasedToParent ? 'completed' : material ? 'pending' : 'pending',
        timestamp: isReleasedToParent ? releaseAt : null,
        details: {
          materialWeek: targetWeek,
          accessibleToParent: isReleasedToParent,
          readyInStorage: Boolean(material),
          releaseAt: releaseAt,
        },
      },
      {
        step: 'FEEDBACK_RECORDED',
        label: '家長每週學習反饋與記憶更新',
        status: feedback ? 'completed' : 'pending',
        timestamp: feedback?.created_at,
        details: {
          difficulty: feedback?.difficulty,
          completionRate: feedback?.completion_rate,
          weakArea: feedback?.weak_area,
          childVoice: this.sanitizePiiText(feedback?.child_comments),
          parentVoice: this.sanitizePiiText(feedback?.parent_comments),
          learningStateUpdated: Boolean(learningState),
        },
      },
    ]

    const jobSummary = job ? {
      id: job.id,
      status: job.status,
      attemptCount: Number(job.attempt_count) || 0,
      maxAttempts: Number(job.max_attempts) || 3,
      isHumanReviewRequired,
      claimedBy: job.claimed_by || null,
      leaseExpiresAt: job.lease_expires_at || null,
      errorCode: job.error_code || null,
      errorMessage: job.error_message || null,
    } : null

    return {
      dataSources,
      childId: child.id,
      childPseudonym: this.maskName(child.display_name, child.id),
      grade: child.grade,
      textbookVersion: child.textbook_version,
      isActive: child.is_active,
      targetWeek,
      subscriptionStatus: subscription?.status || 'none',
      planCode: subscription?.plan_code || (subscription?.status === 'active' ? 'standard_monthly' : null),
      currentLearningSummary: {
        comprehensionAccuracy: learningState?.comprehension_accuracy ?? null,
        difficultyTrend: learningState?.difficulty_trend ?? null,
        recurringMistakesCount: Array.isArray(learningState?.recurring_mistakes) ? learningState.recurring_mistakes.length : 0,
      },
      jobSummary,
      events,
      availableChildren,
      testModeStatus: testModeStatus || null,
      rawMetadata: {
        job: job || null,
        submissions: sortedSubmissions,
        material: material || null,
        feedback: feedback || null,
        testModeStatus: testModeStatus || null,
      },
    }
  }

  private classifyStage(code: string, msg: string): FailureIntelligence['stageBreakdown'][number]['stage'] {
    const upperCode = (code || '').toUpperCase()
    const upperMsg = (msg || '').toUpperCase()

    if (upperCode.includes('CLAIM') || upperCode.includes('LEASE') || upperCode.includes('LOCK')) return 'worker_claim'
    if (upperCode.includes('QUALITY') || upperCode.includes('AUDIT') || upperCode.includes('RUBRIC') || upperCode.includes('CEILING') || upperCode.includes('JARGON')) return 'finisher_audit'
    if (upperCode.includes('RENDER') || upperCode.includes('PDF') || upperCode.includes('PLAYWRIGHT') || upperCode.includes('CLIPPED')) return 'pdf_rendering'
    if (upperCode.includes('STORAGE') || upperCode.includes('UPLOAD') || upperCode.includes('BUCKET')) return 'storage_upload'
    if (upperCode.includes('SCHEMA') || upperCode.includes('JSON') || upperCode.includes('AUTHORING') || upperCode.includes('PROMPT')) return 'chatgpt_authoring'

    if (upperMsg.includes('PDF') || upperMsg.includes('RENDER')) return 'pdf_rendering'
    if (upperMsg.includes('SCHEMA') || upperMsg.includes('PARSE')) return 'chatgpt_authoring'
    if (upperMsg.includes('QUALITY') || upperMsg.includes('VOCABULARY')) return 'finisher_audit'

    return 'finisher_audit'
  }

  private suggestRemedy(code: string): string {
    switch (code) {
      case 'QUALITY_REJECTED':
        return '檢查 ChatGPT Prompt 中單字難度天花板與句型複雜度設定，確保符合該年級 CAP 範圍。'
      case 'CANONICAL_PROMPT_CLIPPED':
        return '題目題幹字數過長導致 PDF 區塊溢位截斷，調整題幹排版長度限制或行高。'
      case 'VOCABULARY_CEILING_EXCEEDED':
        return '生成的文章中出現超出國中 1200/2000 常用字庫之生僻單字，需加強 Lexical Ceiling 提示詞。'
      case 'FORBIDDEN_JARGON':
        return '生成的解說文字包含受限詞彙或成人術語，需更新過濾字庫清單。'
      case 'STORAGE_UPLOAD_FAILED':
        return 'Supabase Storage 網路逾時或權限不足，檢查 Service Role Key 與 Bucket 設定。'
      default:
        return '手動重啟 Worker: `pnpm worker` 進行修復或檢查詳細日誌。'
    }
  }

  async getWaitlistData(): Promise<WaitlistData> {
    const client = this.ensureClient()
    const [enrollmentRes, waitlistRes, activeSubsRes] = await Promise.all([
      client.from('enrollment_settings').select('*').limit(1).maybeSingle(),
      client.rpc('admin_get_waitlist'),
      client
        .from('subscriptions')
        .select('child_id, status, children!inner(is_active)')
        .in('status', ['trialing', 'active', 'past_due'])
        .eq('children.is_active', true),
    ])

    const enrollment = enrollmentRes.data as any
    const capacity = enrollment?.capacity ?? 100
    const activeCount = activeSubsRes.data?.length ?? 0

    const rawEntries = (waitlistRes.data || []) as any[]
    const entries: WaitlistEntry[] = rawEntries.map((row: any) => ({
      id: row.id,
      parentId: row.parent_id,
      childId: row.child_id,
      email: row.email,
      childName: row.child_name,
      grade: row.grade,
      gradeStage: row.grade_stage,
      status: row.status,
      createdAt: row.created_at,
      releasedAt: row.released_at,
      convertedAt: row.converted_at,
      notes: row.notes,
      notificationStatus: row.notification_status ?? 'none',
      notificationError: row.notification_error ?? null,
      notificationAttempts: row.notification_attempts ?? 0,
      notifiedAt: row.notified_at ?? null,
    }))

    const releasedCount = entries.filter((e) => e.status === 'released').length
    const waitingCount = entries.filter((e) => e.status === 'waiting').length
    const convertedCount = entries.filter((e) => e.status === 'converted').length
    const pendingNotificationCount = entries.filter((e) => e.notificationStatus === 'pending').length
    const failedNotificationCount = entries.filter((e) => e.notificationStatus === 'failed').length

    return {
      capacity,
      activeCount,
      releasedCount,
      waitingCount,
      convertedCount,
      pendingNotificationCount,
      failedNotificationCount,
      entries,
    }
  }

  /**
   * Dispatch release notification emails for waitlist entries with notification_status = 'pending'.
   * Uses Supabase Auth generateLink() for magic-link URLs + Resend API for transactional email.
   * If RESEND_API_KEY is not configured, sets all pending entries to 'manual' status honestly.
   */
  async dispatchPendingReleaseNotifications(): Promise<{ sent: number; failed: number; manual: number }> {
    const client = this.ensureClient()
    const resendApiKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.EMAIL_FROM || '紙屬英文 <noreply@paperenglish.com>'
    const siteUrl = process.env.SITE_URL || 'https://paperbond.jjmowlab.com'

    // Query only entries with notification_status = 'pending'
    const { data: pendingRows, error: pendingError } = await client
      .from('waitlist')
      .select('id, email, notification_attempts')
      .eq('notification_status', 'pending')

    if (pendingError) {
      throw new Error(`Failed to load pending waitlist notifications: ${pendingError.message}`)
    }

    const pending = (pendingRows || []) as { id: string; email: string; notification_attempts: number | null }[]
    if (pending.length === 0) return { sent: 0, failed: 0, manual: 0 }

    // If no provider configured, fail honestly into manual state
    if (!resendApiKey) {
      console.log('[AUDIT] waitlist_notification_manual: no RESEND_API_KEY configured, marking', pending.length, 'entries as manual')
      const { error: manualUpdateError } = await client
        .from('waitlist')
        .update({ notification_status: 'manual', notification_error: 'No email provider configured (RESEND_API_KEY missing)' })
        .eq('notification_status', 'pending')
      if (manualUpdateError) {
        throw new Error(`Failed to mark waitlist notifications for manual delivery: ${manualUpdateError.message}`)
      }
      return { sent: 0, failed: 0, manual: pending.length }
    }

    let sent = 0
    let failed = 0

    for (const row of pending) {
      const result = await sendReleaseEmail(
        client,
        { waitlistId: row.id, email: row.email },
        siteUrl,
        resendApiKey,
        emailFrom,
      )

      if (result.success) {
        const { error: updateError } = await client
          .from('waitlist')
          .update({
            notification_status: 'sent',
            notification_error: null,
            notified_at: new Date().toISOString(),
            notification_attempts: (row.notification_attempts ?? 0) + 1,
          })
          .eq('id', row.id)
        if (updateError) {
          console.error('[AUDIT] waitlist_notification_tracking_failed:', { waitlistId: row.id, error: updateError.message })
          failed++
        } else {
          sent++
        }
      } else {
        const { error: updateError } = await client
          .from('waitlist')
          .update({
            notification_status: 'failed',
            notification_error: result.error || 'Unknown error',
            notification_attempts: (row.notification_attempts ?? 0) + 1,
          })
          .eq('id', row.id)
        if (updateError) {
          console.error('[AUDIT] waitlist_notification_tracking_failed:', { waitlistId: row.id, error: updateError.message })
        }
        failed++
      }
    }

    console.log('[AUDIT] waitlist_notifications_dispatched:', { sent, failed, timestamp: new Date().toISOString() })
    return { sent, failed, manual: 0 }
  }

  /**
   * Retry sending release notifications for entries with notification_status = 'failed'.
   * Resets them to 'pending' and re-dispatches.
   */
  async retryFailedNotifications(): Promise<RetryNotificationResult> {
    try {
      const client = this.ensureClient()

      // Reset failed entries back to pending for re-dispatch
      const { data: failedRows, error: resetError } = await client
        .from('waitlist')
        .update({ notification_status: 'pending', notification_error: null })
        .eq('notification_status', 'failed')
        .select('id')

      if (resetError) {
        throw new Error(`Failed to reset waitlist notifications for retry: ${resetError.message}`)
      }

      if (!failedRows || failedRows.length === 0) {
        return { success: true, emailsDispatched: 0, notificationsFailed: 0, message: 'No failed notifications to retry' }
      }

      console.log('[AUDIT] waitlist_notification_retry:', { count: failedRows.length, timestamp: new Date().toISOString() })

      const result = await this.dispatchPendingReleaseNotifications()
      return {
        success: true,
        emailsDispatched: result.sent,
        notificationsFailed: result.failed,
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to retry notifications' }
    }
  }

  async raiseCapacityAndRelease(
    newCapacity: number,
    releaseAll: boolean
  ): Promise<RaiseCapacityAndReleaseResult> {
    try {
      const client = this.ensureClient()
      const { data, error } = await client.rpc('admin_raise_capacity_and_release', {
        p_new_capacity: newCapacity,
        p_release_all: releaseAll,
      })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      const res = Array.isArray(data) ? data[0] : (data as any)
      const releasedNow = res?.released_in_this_run ?? 0

      let emailsDispatched = 0
      let notificationsFailed = 0
      if (releasedNow > 0) {
        // Dispatch emails only for newly released entries (notification_status = 'pending')
        const emailResult = await this.dispatchPendingReleaseNotifications()
        emailsDispatched = emailResult.sent
        notificationsFailed = emailResult.failed + emailResult.manual
        console.log('[AUDIT] waitlist_cohort_released:', {
          newCapacity,
          releasedCount: releasedNow,
          emailsDispatched,
          notificationsFailed,
          timestamp: new Date().toISOString(),
        })
      } else {
        console.log('[AUDIT] capacity_updated:', {
          newCapacity,
          timestamp: new Date().toISOString(),
        })
      }

      return {
        success: true,
        newCapacity: res?.new_capacity ?? newCapacity,
        activeCount: res?.active_count ?? 0,
        releasedCount: res?.released_count ?? 0,
        waitingCount: res?.waiting_count ?? 0,
        releasedInThisRun: releasedNow,
        emailsDispatched,
        notificationsFailed,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to raise capacity and release waitlist',
      }
    }
  }

  async releaseWaitlistChildren(childIds: string[]): Promise<ReleaseWaitlistResult> {
    try {
      const client = this.ensureClient()
      const { data, error } = await client.rpc('admin_release_waitlist_children', {
        p_child_ids: childIds,
      })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      const res = Array.isArray(data) ? data[0] : (data as any)
      const releasedCount = res?.released_count ?? 0

      // Dispatch emails only for newly released entries (notification_status = 'pending')
      let emailsDispatched = 0
      let notificationsFailed = 0
      if (releasedCount > 0) {
        const emailResult = await this.dispatchPendingReleaseNotifications()
        emailsDispatched = emailResult.sent
        notificationsFailed = emailResult.failed + emailResult.manual
      }

      console.log('[AUDIT] waitlist_children_released:', {
        childIds,
        releasedCount,
        emailsDispatched,
        notificationsFailed,
        timestamp: new Date().toISOString(),
      })

      return {
        success: true,
        releasedCount,
        emailsDispatched,
        notificationsFailed,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to release selected waitlist children',
      }
    }
  }

  async updateCapacity(capacity: number): Promise<UpdateCapacityResult> {
    const res = await this.raiseCapacityAndRelease(capacity, false)
    if (!res.success) {
      return {
        success: false,
        error: res.error,
      }
    }
    return {
      success: true,
      capacity: res.newCapacity,
    }
  }

  async getAnnouncementsData(filterStatus?: AnnouncementStatus | 'all'): Promise<AnnouncementsAdminData> {
    const client = this.ensureClient()
    const statuses: DataSourceStatus[] = []

    const rows = await this.safeQuery<AnnouncementItem[]>(
      'announcements',
      async () => {
        let query = client
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
        if (filterStatus && filterStatus !== 'all') {
          query = query.eq('status', filterStatus)
        }
        return query
      },
      statuses,
    )

    const allRows = await this.safeQuery<Array<{ status: AnnouncementStatus }>>(
      'announcements_counts',
      async () => client.from('announcements').select('status'),
      statuses,
    )

    const stats = {
      total: 0,
      draft: 0,
      published: 0,
      archived: 0,
    }

    if (allRows) {
      stats.total = allRows.length
      for (const row of allRows) {
        if (row.status === 'draft') stats.draft++
        else if (row.status === 'published') stats.published++
        else if (row.status === 'archived') stats.archived++
      }
    }

    return {
      dataSources: statuses,
      announcements: rows || [],
      stats,
    }
  }

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementActionResult> {
    try {
      const client = this.ensureClient()
      const title = (input?.title || '').trim()
      const body = (input?.body || '').trim()
      const category = input?.category
      const status = input?.status || 'draft'

      if (!title) {
        return { success: false, error: 'TITLE_REQUIRED', message: '標題為必填項目。' }
      }
      if (title.length > 200) {
        return { success: false, error: 'TITLE_TOO_LONG', message: '標題長度不可超過 200 字。' }
      }
      if (!body) {
        return { success: false, error: 'BODY_REQUIRED', message: '公告內容為必填項目。' }
      }
      if (!['feature', 'material', 'maintenance', 'notice'].includes(category)) {
        return { success: false, error: 'INVALID_CATEGORY', message: '無效的公告分類。' }
      }
      if (!['draft', 'published', 'archived'].includes(status)) {
        return { success: false, error: 'INVALID_STATUS', message: '無效的公告狀態。' }
      }

      const publishedAt = status === 'published' ? new Date().toISOString() : null

      const { data, error } = await client
        .from('announcements')
        .insert({
          title,
          body,
          category,
          status,
          published_at: publishedAt,
        })
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.code || 'DB_ERROR', message: error.message }
      }

      console.log('[AUDIT] announcement_created:', {
        id: data.id,
        title: data.title,
        category: data.category,
        status: data.status,
        publishedAt: data.published_at,
        timestamp: new Date().toISOString(),
      })

      return {
        success: true,
        announcement: data,
        message: status === 'published' ? '公告已成功建立並發布。' : '公告草稿已成功儲存。',
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'UNEXPECTED_ERROR',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async updateAnnouncement(input: UpdateAnnouncementInput): Promise<AnnouncementActionResult> {
    try {
      const client = this.ensureClient()
      const id = input?.id
      if (!id || typeof id !== 'string') {
        return { success: false, error: 'ID_REQUIRED', message: '公告 ID 為必填。' }
      }

      const { data: existing, error: fetchError } = await client
        .from('announcements')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (fetchError || !existing) {
        return { success: false, error: 'NOT_FOUND', message: '找不到指定的公告。' }
      }

      const updates: Record<string, any> = {}

      if (input.title !== undefined) {
        const title = input.title.trim()
        if (!title) return { success: false, error: 'TITLE_REQUIRED', message: '標題不可為空白。' }
        if (title.length > 200) return { success: false, error: 'TITLE_TOO_LONG', message: '標題長度不可超過 200 字。' }
        updates.title = title
      }

      if (input.body !== undefined) {
        const body = input.body.trim()
        if (!body) return { success: false, error: 'BODY_REQUIRED', message: '公告內容不可為空白。' }
        updates.body = body
      }

      if (input.category !== undefined) {
        if (!['feature', 'material', 'maintenance', 'notice'].includes(input.category)) {
          return { success: false, error: 'INVALID_CATEGORY', message: '無效的公告分類。' }
        }
        updates.category = input.category
      }

      if (input.status !== undefined) {
        if (!['draft', 'published', 'archived'].includes(input.status)) {
          return { success: false, error: 'INVALID_STATUS', message: '無效的公告狀態。' }
        }
        updates.status = input.status

        if (input.status === 'published') {
          if (!existing.published_at) {
            updates.published_at = new Date().toISOString()
          }
        }
      }

      const { data: updated, error: updateError } = await client
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()

      if (updateError) {
        return { success: false, error: updateError.code || 'DB_ERROR', message: updateError.message }
      }

      console.log('[AUDIT] announcement_updated:', {
        id: updated.id,
        status: updated.status,
        publishedAt: updated.published_at,
        timestamp: new Date().toISOString(),
      })

      return {
        success: true,
        announcement: updated,
        message: '公告已成功更新。',
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'UNEXPECTED_ERROR',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async archiveAnnouncement(id: string): Promise<AnnouncementActionResult> {
    return this.updateAnnouncement({ id, status: 'archived' })
  }

  private classifyQualityCategory(rule: string): 'lexical_ceiling' | 'forbidden_jargon' | 'prompt_clipped' | 'cap_deficit' | 'schema_mismatch' | 'other' {
    const r = (rule || '').toLowerCase()
    if (r.includes('ceiling') || r.includes('vocab')) return 'lexical_ceiling'
    if (r.includes('jargon') || r.includes('forbidden')) return 'forbidden_jargon'
    if (r.includes('clip') || r.includes('overflow')) return 'prompt_clipped'
    if (r.includes('cap') || r.includes('coverage')) return 'cap_deficit'
    if (r.includes('schema') || r.includes('version')) return 'schema_mismatch'
    return 'other'
  }
}
