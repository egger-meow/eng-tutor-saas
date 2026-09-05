import { getSupabaseClient } from './supabase'

export type Week1ProgressStage = 'received' | 'queued' | 'authoring' | 'publishing' | 'ready'

export type Week1Progress = {
  stage: Week1ProgressStage
  stageUpdatedAt: string | null
  ready: boolean
  materialId?: string | null
}

export const WEEK1_PROGRESS_SESSION_KEY = 'paper-english:week1-progress-token'

const STAGES = new Set<Week1ProgressStage>(['received', 'queued', 'authoring', 'publishing', 'ready'])

function normalize(value: unknown): Week1Progress | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.stage !== 'string' || !STAGES.has(row.stage as Week1ProgressStage)) return null
  return {
    stage: row.stage as Week1ProgressStage,
    stageUpdatedAt: typeof row.stageUpdatedAt === 'string'
      ? row.stageUpdatedAt
      : typeof row.stage_updated_at === 'string'
        ? row.stage_updated_at
        : null,
    ready: row.ready === true || row.stage === 'ready',
    materialId: typeof row.materialId === 'string'
      ? row.materialId
      : typeof row.material_id === 'string'
        ? row.material_id
        : null,
  }
}

export function saveWeek1ProgressToken(token: string | undefined): void {
  if (typeof window === 'undefined' || !token) return
  window.sessionStorage.setItem(WEEK1_PROGRESS_SESSION_KEY, token)
}

export function readWeek1ProgressToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = window.sessionStorage.getItem(WEEK1_PROGRESS_SESSION_KEY)
  return token && /^[0-9a-f]{64}$/u.test(token) ? token : null
}

export function clearWeek1ProgressToken(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(WEEK1_PROGRESS_SESSION_KEY)
}

export async function readAnonymousWeek1Progress(token: string): Promise<Week1Progress | null> {
  const { data, error } = await getSupabaseClient().functions.invoke('week1-progress', {
    body: { token },
  })
  if (error) return null
  return normalize(data)
}

export async function readOwnedWeek1Progress(childId: string): Promise<Week1Progress | null> {
  const { data, error } = await getSupabaseClient().rpc('get_owned_week1_progress', {
    p_child_id: childId,
  })
  if (error) return null
  return normalize(data)
}

export function stageIndex(stage: Week1ProgressStage): number {
  return ['received', 'queued', 'authoring', 'publishing', 'ready'].indexOf(stage)
}
