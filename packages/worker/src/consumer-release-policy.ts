import { desiredAuthoringContract, PREVIOUS_AUTHORING_CONTRACT, claimAuthoringContract } from './authoring-claim-contract.js'

/** Compare immutable authoring metadata; never stamp it with executing consumer versions. */
export function validateConsumerRelease(context: Record<string, unknown>, metadata: Record<string, unknown>): string {
  const bound = context.activeAuthoringContract !== undefined ? claimAuthoringContract(context) : undefined
  const target = context.targetReleaseId ?? bound?.releaseId ?? metadata.releaseId
  const supported = [desiredAuthoringContract, PREVIOUS_AUTHORING_CONTRACT].find(candidate => candidate.releaseId === target)
  if (!supported) throw new Error(`Release mismatch: unsupported consumer target release '${String(target)}'`)
  for (const key of ['releaseId', 'schemaVersion', 'promptVersion', 'engineVersion', 'workerVersion', 'rendererVersion'] as const) {
    if (metadata[key] !== supported[key]) throw new Error(`Release mismatch: immutable metadata ${key} does not match claimed release ${target}`)
  }
  return supported.releaseId
}
