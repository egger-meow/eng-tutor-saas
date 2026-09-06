import { readFile } from 'node:fs/promises'
import type { GenerationContext } from './pipeline.js'
import { compactAuthoringContext } from './authoring-context.js'

/** All production entry points consume the same compiled policy and current schema. */
export async function buildCurriculumPromptBundle(context: GenerationContext): Promise<string> {
  const bundle = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
  return [
    bundle,
    '## Private claimed context',
    JSON.stringify(compactAuthoringContext(context as unknown as Record<string, unknown>)),
    'Complete research, planning, Author/Critic review, targeted repair, and full canonical validation before immutable submission through the reviewed authoring bridge. Follow docs/production-authoring.md for claim/submit/status; this prompt does not authorize legacy complete-v2 publication.',
  ].join('\n\n')
}
