/** Presentation only. Never mutate a claimed snapshot or its input fingerprint. */
export function compactAuthoringContext(context: Record<string, unknown>, hasNewerCandidate = false): Record<string, unknown> {
  const retry = context.retryContext
  if (!retry || typeof retry !== 'object' || Array.isArray(retry)) return context
  const compact = { ...retry } as Record<string, unknown>
  if (hasNewerCandidate) delete compact.previousCanonicalPackage
  const evidence = compact.failureEvidence
  if (evidence && typeof evidence === 'object' && !Array.isArray(evidence)) {
    const details = { ...evidence } as Record<string, unknown>
    if (JSON.stringify(details.findings) === JSON.stringify(compact.findings)) delete details.findings
    compact.failureEvidence = details
  }
  return { ...context, retryContext: compact }
}
