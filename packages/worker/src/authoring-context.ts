import { buildFormatPlanningCapsule } from '@paper-english/generator'

/** Presentation only. Never mutate a claimed snapshot or its input fingerprint. */
export function compactAuthoringContext(context: Record<string, unknown>, hasNewerCandidate = false): Record<string, unknown> {
  const result = { ...context }
  const retry = context.retryContext
  if (retry && typeof retry === 'object' && !Array.isArray(retry)) {
    const compact = { ...retry } as Record<string, unknown>
    if (hasNewerCandidate) delete compact.previousCanonicalPackage
    const evidence = compact.failureEvidence
    if (evidence && typeof evidence === 'object' && !Array.isArray(evidence)) {
      const details = { ...evidence } as Record<string, unknown>
      if (JSON.stringify(details.findings) === JSON.stringify(compact.findings)) delete details.findings
      compact.failureEvidence = details
    }
    result.retryContext = compact
  }

  if (context.diversityCapsule && typeof context.diversityCapsule === 'object' && !Array.isArray(context.diversityCapsule)) {
    const diversity = { ...(context.diversityCapsule as Record<string, unknown>) }
    if (!diversity.formatPlanningCapsule) {
      const memory = (context.recentDeliveryMemory ?? diversity.recentDeliveryMemory ?? []) as any[]
      diversity.formatPlanningCapsule = buildFormatPlanningCapsule(memory, 4)
    }
    result.diversityCapsule = diversity
  }

  return result
}
