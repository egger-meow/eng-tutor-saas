import { getSupabaseClient } from './supabase'

export type LearningStatusCounts = { exposed: number; learning: number; evidenceMastered: number; reviewing?: number }
export type LearningLibrarySummary = {
  totalWeeks: number
  vocabulary: LearningStatusCounts
  grammar: LearningStatusCounts
  communication: LearningStatusCounts
  readingTrajectory: { label?: string }
  persistentWeakAreas: Array<{ type: string; targetId: string; reason: string }>
  recentImprovements: string[]
  masteryEvidenceExplanation: string
}
export type LearningTimelineItem = {
  sequenceNumber: number
  recordedAt: string
  readingTrajectory: string
  introducedCount: number
  reviewedCount: number
  introducedLabels: string[]
  reviewedLabels: string[]
  difficulties: unknown[]
  improvements: string[]
  nextReviewReasons: string[]
}

export async function fetchLearningSummary(childId: string): Promise<LearningLibrarySummary> {
  const { data, error } = await getSupabaseClient().rpc('parent_child_learning_summary', { p_child_id: childId })
  if (error) throw error
  return data as LearningLibrarySummary
}

export async function fetchLearningTimeline(childId: string, beforeSequence: number | null = null, limit = 10): Promise<LearningTimelineItem[]> {
  const { data, error } = await getSupabaseClient().rpc('parent_child_learning_timeline', {
    p_child_id: childId,
    p_before_sequence: beforeSequence,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as LearningTimelineItem[]
}
