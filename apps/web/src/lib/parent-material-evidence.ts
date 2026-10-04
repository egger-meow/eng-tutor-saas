import type { SupabaseClient } from '@supabase/supabase-js'

export type TargetState = 'needs_review' | 'observed_correct' | 'ungraded'

export interface LearningTargetEvidence {
  label: string
  state: TargetState
}

export type EvidenceSource = 'student_submission' | 'parent_report' | 'none'

export interface ParentMaterialEvidenceSummary {
  source: EvidenceSource
  submittedAt: string | null
  objectiveCorrect: number
  objectiveIncorrect: number
  unanswered: number
  openReview: number
  reportedCompletionRate: number | null
  adjustmentNotes: string[]
  targets: LearningTargetEvidence[]
}

const VALID_SOURCES = new Set<EvidenceSource>(['student_submission', 'parent_report', 'none'])
const VALID_STATES = new Set<TargetState>(['needs_review', 'observed_correct', 'ungraded'])

export function parseParentMaterialEvidenceSummary(raw: unknown): ParentMaterialEvidenceSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>

  const sourceStr = typeof data.source === 'string' ? data.source : 'none'
  const source: EvidenceSource = VALID_SOURCES.has(sourceStr as EvidenceSource)
    ? (sourceStr as EvidenceSource)
    : 'none'

  const submittedAt = typeof data.submittedAt === 'string' && data.submittedAt.trim()
    ? data.submittedAt.trim()
    : null

  const objectiveCorrect = typeof data.objectiveCorrect === 'number' && Number.isFinite(data.objectiveCorrect) && data.objectiveCorrect >= 0
    ? Math.floor(data.objectiveCorrect)
    : 0

  const objectiveIncorrect = typeof data.objectiveIncorrect === 'number' && Number.isFinite(data.objectiveIncorrect) && data.objectiveIncorrect >= 0
    ? Math.floor(data.objectiveIncorrect)
    : 0

  const unanswered = typeof data.unanswered === 'number' && Number.isFinite(data.unanswered) && data.unanswered >= 0
    ? Math.floor(data.unanswered)
    : 0

  const openReview = typeof data.openReview === 'number' && Number.isFinite(data.openReview) && data.openReview >= 0
    ? Math.floor(data.openReview)
    : 0

  const reportedCompletionRate = typeof data.reportedCompletionRate === 'number' && Number.isFinite(data.reportedCompletionRate)
    ? Math.max(0, Math.min(100, Math.floor(data.reportedCompletionRate)))
    : null

  const adjustmentNotes: string[] = Array.isArray(data.adjustmentNotes)
    ? data.adjustmentNotes
        .filter((note): note is string => typeof note === 'string' && Boolean(note.trim()))
        .map((note) => note.trim())
        .slice(0, 3)
    : []

  const targets: LearningTargetEvidence[] = Array.isArray(data.targets)
    ? data.targets
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .map((t): LearningTargetEvidence | null => {
          const label = typeof t.label === 'string' ? t.label.trim() : ''
          const stateStr = typeof t.state === 'string' ? t.state : ''
          const state: TargetState = VALID_STATES.has(stateStr as TargetState)
            ? (stateStr as TargetState)
            : 'ungraded'
          return label ? { label, state } : null
        })
        .filter((t): t is LearningTargetEvidence => t !== null)
    : []

  return {
    source,
    submittedAt,
    objectiveCorrect,
    objectiveIncorrect,
    unanswered,
    openReview,
    reportedCompletionRate,
    adjustmentNotes,
    targets,
  }
}

export async function fetchParentMaterialEvidenceSummary(
  supabase: SupabaseClient,
  materialId: string
): Promise<ParentMaterialEvidenceSummary | null> {
  if (!materialId) return null
  const { data, error } = await supabase.rpc('get_parent_material_evidence_summary', {
    p_material_id: materialId,
  })
  if (error || !data) return null
  return parseParentMaterialEvidenceSummary(data)
}
