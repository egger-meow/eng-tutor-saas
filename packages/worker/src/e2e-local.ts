import { createClient } from '@supabase/supabase-js'
import { syntheticWeekOne } from '@paper-english/generator'
import { claimJobs, completeJob, loadGenerationContext, type WorkerClient } from './pipeline.js'

const url = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!url || !secretKey || !publishableKey) throw new Error('Local Supabase E2E configuration is missing')
if (!url.includes('127.0.0.1') && !url.includes('localhost')) throw new Error('E2E runner refuses to target a non-local Supabase project')

const service = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const browser = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
const email = `generation-e2e-${crypto.randomUUID()}@example.test`
const password = `Local-${crypto.randomUUID()}-9!`
let userId: string | undefined
const artifactPaths: string[] = []

function value<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error) throw new Error(`${label}: ${error.message}`)
  if (data === null) throw new Error(`${label}: empty response`)
  return data
}

try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true })
  userId = value(created.data.user, created.error, 'create user').id
  const insertedChild = await service.from('children').insert({ parent_id: userId, display_name: 'Synthetic E2E Learner', grade: 7 }).select('id').single()
  const childId = value(insertedChild.data, insertedChild.error, 'create child').id as string
  const materialWeek = new Date().toISOString().slice(0, 10)
  const releaseAt = new Date(Date.now() - 60_000)
  const feedbackCutoffAt = new Date(releaseAt.getTime() - 48 * 3600_000)
  const generationDueAt = new Date(releaseAt.getTime() - 24 * 3600_000)
  const scheduledFor = new Date(releaseAt.getTime() - 72 * 3600_000)

  const insertedJob = await service.from('generation_jobs').insert({
    child_id: childId, material_week: materialWeek, rule_version: 'weekly-material/1.0.0',
    idempotency_key: `${childId}:${materialWeek}:e2e`, scheduled_for: scheduledFor.toISOString(),
    feedback_cutoff_at: feedbackCutoffAt.toISOString(),
    generation_due_at: generationDueAt.toISOString(),
    release_at: releaseAt.toISOString(),
  }).select('id').single()
  const jobId = value(insertedJob.data, insertedJob.error, 'create Week 1 job').id as string

  const workerClient = service as unknown as WorkerClient
  const claimed = await claimJobs(workerClient, 'local-e2e-week-1')
  if (!claimed.some((job) => job.id === jobId)) throw new Error('Week 1 job was not claimed')
  const context = await loadGenerationContext(workerClient, jobId, 'local-e2e-week-1')
  const lesson = structuredClone(syntheticWeekOne)
  Object.assign(lesson.metadata, { jobId, childId, weekNumber: 1, generatedAt: new Date().toISOString(), ruleVersion: context.job.ruleVersion })
  const materialId = await completeJob({
    client: workerClient, workerId: 'local-e2e-week-1', context, lesson,
    promptVersion: 'e2e-prompt/1.0.0', generatorVersion: 'e2e-generator/1.0.0', modelName: 'synthetic-fixture',
  })
  artifactPaths.push(`${childId}/${jobId}/student.pdf`, `${childId}/${jobId}/parent-answer.pdf`)

  const signedIn = await browser.auth.signInWithPassword({ email, password })
  value(signedIn.data.session, signedIn.error, 'sign in parent')
  const listed = await browser.from('materials').select('id, student_pdf_path').eq('id', materialId).single()
  const ownedMaterial = value(listed.data, listed.error, 'list owned material')
  const signed = await browser.storage.from('weekly-materials').createSignedUrl(ownedMaterial.student_pdf_path, 60)
  const signedUrl = value(signed.data, signed.error, 'create signed download').signedUrl
  const downloaded = await fetch(signedUrl)
  if (!downloaded.ok || (await downloaded.arrayBuffer()).byteLength < 100) throw new Error('signed Student PDF download failed')

  const savedFeedback = await browser.from('feedback').insert({
    child_id: childId, material_id: materialId, difficulty: 4, completion_rate: 75, weak_area: 'grammar',
    mistakes_text: 'Synthetic learner needs more practice with do and does.', child_comments: 'The garden story was interesting.',
  })
  if (savedFeedback.error) throw new Error(`save feedback: ${savedFeedback.error.message}`)

  const weekTwo = await claimJobs(workerClient, 'local-e2e-week-2')
  const nextJob = weekTwo.find((job) => job.child_id === childId)
  if (!nextJob) throw new Error('Week 2 job was not unlocked by feedback')
  const nextContext = await loadGenerationContext(workerClient, nextJob.id, 'local-e2e-week-2')
  const feedback = nextContext.feedback as { completion_rate?: number; weak_area?: string } | null
  if (feedback?.completion_rate !== 75 || feedback.weak_area !== 'grammar') throw new Error('Week 2 context did not include Week 1 feedback')
  process.stdout.write(`${JSON.stringify({ materialId, weekOneDownloaded: true, weekTwoFeedbackApplied: true })}\n`)
} finally {
  if (artifactPaths.length) await service.storage.from('weekly-materials').remove(artifactPaths)
  if (userId) await service.auth.admin.deleteUser(userId)
}
