import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(currentDir, '../../..')
export const GENERATOR_ROOT = resolve(currentDir, '..')

export interface BundleMetadata {
  bundleVersion: string
  schemaVersion: string
  promptVersion: string
  sourceHashes: Record<string, string>
  generatedAt: string
}

export interface CompiledBundle {
  metadata: BundleMetadata
  content: string
}

export const FROZEN_201_FILES = [
  'packages/generator/prompts/2.0.1/01-plan.md',
  'packages/generator/prompts/2.0.1/02-author.md',
  'packages/generator/prompts/2.0.1/03-critic.md',
  'packages/generator/prompts/2.0.1/04-repair.md',
] as const

export const SOURCE_FILES = [
  'packages/generator/prompts/2.1.0/01-plan.md',
  'packages/generator/prompts/2.1.0/02-author.md',
  'packages/generator/prompts/2.1.0/03-critic.md',
  'packages/generator/prompts/2.1.0/04-repair.md',
  'packages/generator/src/curriculum-package-schema.ts',
  'docs/curriculum-quality-rubric.md',
  'docs/product-rules.md',
] as const

export async function computeSourceHashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of SOURCE_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen201Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_201_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function compileProductionBundle(
  repoRoot: string = REPO_ROOT,
  fixedDate?: string,
): Promise<CompiledBundle> {
  const hashes = await computeSourceHashes(repoRoot)
  const plan = await readFile(resolve(repoRoot, 'packages/generator/prompts/2.1.0/01-plan.md'), 'utf8')
  const author = await readFile(resolve(repoRoot, 'packages/generator/prompts/2.1.0/02-author.md'), 'utf8')
  const critic = await readFile(resolve(repoRoot, 'packages/generator/prompts/2.1.0/03-critic.md'), 'utf8')
  const repair = await readFile(resolve(repoRoot, 'packages/generator/prompts/2.1.0/04-repair.md'), 'utf8')
  const schema = await readFile(resolve(repoRoot, 'packages/generator/src/curriculum-package-schema.ts'), 'utf8')
  const rubric = await readFile(resolve(repoRoot, 'docs/curriculum-quality-rubric.md'), 'utf8')
  const rules = await readFile(resolve(repoRoot, 'docs/product-rules.md'), 'utf8')

  const generatedAt = fixedDate ?? '2026-08-16T22:35:00.000Z'

  const metadata: BundleMetadata = {
    bundleVersion: '2.1.0-prod',
    schemaVersion: '2.0.0',
    promptVersion: '2.1.0',
    sourceHashes: hashes,
    generatedAt,
  }

  const frontmatter = [
    '---',
    `bundleVersion: "${metadata.bundleVersion}"`,
    `schemaVersion: "${metadata.schemaVersion}"`,
    `promptVersion: "${metadata.promptVersion}"`,
    `generatedAt: "${metadata.generatedAt}"`,
    'sourceHashes:',
    ...Object.entries(hashes).map(([file, hash]) => `  "${file}": "${hash}"`),
    '---',
  ].join('\n')

  const body = [
    '# 紙屬英文 Production Authoring Bundle',
    '',
    '> This is the deterministically compiled production authoring contract for 紙屬英文.',
    '> Do not edit manually. Recompile using `pnpm compile:bundle`.',
    '',
    '## 1. Product Rules & Constraints',
    rules.trim().replace(/\r\n/g, '\n'),
    '',
    '## 2. Curriculum Quality Rubric',
    rubric.trim().replace(/\r\n/g, '\n'),
    '',
    '## 3. Curriculum Package Schema 2.0.0',
    '```typescript',
    schema.trim().replace(/\r\n/g, '\n'),
    '```',
    '',
    '## 4. Phase 1 — Diagnostic Learning Plan',
    plan.trim().replace(/\r\n/g, '\n'),
    '',
    '## 5. Phase 2 — Lesson & Parent Answer Authoring',
    author.trim().replace(/\r\n/g, '\n'),
    '',
    '## 6. Phase 3 — Adversarial Semantic Critic',
    critic.trim().replace(/\r\n/g, '\n'),
    '',
    '## 7. Phase 4 — Targeted Repair Protocol',
    repair.trim().replace(/\r\n/g, '\n'),
  ].join('\n')

  const content = `${frontmatter}\n\n${body}\n`

  return {
    metadata,
    content,
  }
}
