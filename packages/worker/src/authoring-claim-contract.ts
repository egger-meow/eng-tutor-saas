import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CURRENT_ENGINE_MANIFEST } from '@paper-english/generator'

export const PREVIOUS_AUTHORING_CONTRACT = {
  releaseId: 'rel_1.8.2', schemaVersion: '2.5.0', promptVersion: '2.13.2', engineVersion: '1.8.2',
  workerVersion: '1.7.2', rendererVersion: '1.5.0', bundleVersion: '2.13.2-prod',
  bundleSha256: '227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340',
} as const
export const desiredAuthoringContract = {
  releaseId: CURRENT_ENGINE_MANIFEST.releaseId, schemaVersion: CURRENT_ENGINE_MANIFEST.schema,
  promptVersion: CURRENT_ENGINE_MANIFEST.prompt, engineVersion: CURRENT_ENGINE_MANIFEST.engine,
  workerVersion: CURRENT_ENGINE_MANIFEST.worker, rendererVersion: CURRENT_ENGINE_MANIFEST.pdfRenderer,
  bundleVersion: `${CURRENT_ENGINE_MANIFEST.prompt}-prod`,
}
export function claimAuthoringContract(context: Record<string, unknown>) {
  const bound = context.activeAuthoringContract
  if (bound === undefined) return desiredAuthoringContract
  if (!bound || typeof bound !== 'object' || Array.isArray(bound)) throw new Error('AUTHORING_CONTRACT_INVALID')
  const contract = bound as Record<string, unknown>
  const supported = [desiredAuthoringContract, PREVIOUS_AUTHORING_CONTRACT].find(candidate =>
    Object.entries(desiredAuthoringContract).every(([key]) => contract[key] === candidate[key as keyof typeof desiredAuthoringContract]))
  if (!supported || context.targetReleaseId !== contract.releaseId ||
    typeof contract.bundleSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(contract.bundleSha256)) {
    throw new Error('AUTHORING_CONTRACT_UNSUPPORTED_OR_MISMATCHED')
  }
  return { ...supported, bundleSha256: contract.bundleSha256 }
}
export async function readClaimAuthoringBundle(repoRoot: string, context: Record<string, unknown>): Promise<string> {
  const contract = claimAuthoringContract(context)
  const path = contract.releaseId === PREVIOUS_AUTHORING_CONTRACT.releaseId
    ? 'packages/generator/bundles/2.13.2-production-authoring-bundle.md'
    : 'packages/generator/bundles/production-authoring-bundle.md'
  const bytes = await readFile(resolve(repoRoot, path))
  const digest = createHash('sha256').update(bytes).digest('hex')
  if ('bundleSha256' in contract && digest !== contract.bundleSha256) throw new Error('AUTHORING_BUNDLE_HASH_MISMATCH')
  return bytes.toString('utf8')
}
