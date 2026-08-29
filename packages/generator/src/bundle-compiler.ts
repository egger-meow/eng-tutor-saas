import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CURRENT_ENGINE_VERSION } from './engine-version.js'
import { serializedCapAssessmentPlanContract } from './cap-assessment-plan-contract.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(currentDir, '../../..')
export const GENERATOR_ROOT = resolve(currentDir, '..')

export interface BundleMetadata {
  bundleVersion: string
  schemaVersion: string
  promptVersion: string
  engineVersion: string
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

export const FROZEN_210_FILES = [
  'packages/generator/prompts/2.1.0/01-plan.md',
  'packages/generator/prompts/2.1.0/02-author.md',
  'packages/generator/prompts/2.1.0/03-critic.md',
  'packages/generator/prompts/2.1.0/04-repair.md',
] as const

export const FROZEN_220_FILES = [
  'packages/generator/prompts/2.2.0/01-plan.md',
  'packages/generator/prompts/2.2.0/02-author.md',
  'packages/generator/prompts/2.2.0/03-critic.md',
  'packages/generator/prompts/2.2.0/04-repair.md',
] as const

export const FROZEN_230_FILES = [
  'packages/generator/prompts/2.3.0/01-plan.md',
  'packages/generator/prompts/2.3.0/02-author.md',
  'packages/generator/prompts/2.3.0/03-critic.md',
  'packages/generator/prompts/2.3.0/04-repair.md',
] as const

export const FROZEN_240_FILES = [
  'packages/generator/prompts/2.4.0/01-plan.md',
  'packages/generator/prompts/2.4.0/02-author.md',
  'packages/generator/prompts/2.4.0/03-critic.md',
  'packages/generator/prompts/2.4.0/04-repair.md',
] as const

export const FROZEN_250_FILES = [
  'packages/generator/prompts/2.5.0/01-plan.md',
  'packages/generator/prompts/2.5.0/02-author.md',
  'packages/generator/prompts/2.5.0/03-critic.md',
  'packages/generator/prompts/2.5.0/04-repair.md',
] as const

export const FROZEN_260_FILES = [
  'packages/generator/prompts/2.6.0/01-plan.md',
  'packages/generator/prompts/2.6.0/02-author.md',
  'packages/generator/prompts/2.6.0/03-critic.md',
  'packages/generator/prompts/2.6.0/04-repair.md',
] as const

export const FROZEN_270_FILES = [
  'packages/generator/prompts/2.7.0/01-plan.md',
  'packages/generator/prompts/2.7.0/02-author.md',
  'packages/generator/prompts/2.7.0/03-critic.md',
  'packages/generator/prompts/2.7.0/04-repair.md',
] as const

export const FROZEN_280_FILES = [
  'packages/generator/prompts/2.8.0/01-plan.md',
  'packages/generator/prompts/2.8.0/02-author.md',
  'packages/generator/prompts/2.8.0/03-critic.md',
  'packages/generator/prompts/2.8.0/04-repair.md',
] as const

export const FROZEN_2100_FILES = [
  'packages/generator/prompts/2.10.0/01-plan.md',
  'packages/generator/prompts/2.10.0/02-author.md',
  'packages/generator/prompts/2.10.0/03-critic.md',
  'packages/generator/prompts/2.10.0/04-repair.md',
] as const

export const SOURCE_FILES = [
  'packages/generator/prompts/2.4.0/01-plan.md',
  'packages/generator/prompts/2.4.0/02-author.md',
  'packages/generator/prompts/2.4.0/03-critic.md',
  'packages/generator/prompts/2.4.0/04-repair.md',
  'packages/generator/prompts/2.5.0/01-plan.md',
  'packages/generator/prompts/2.5.0/02-author.md',
  'packages/generator/prompts/2.5.0/03-critic.md',
  'packages/generator/prompts/2.5.0/04-repair.md',
  'packages/generator/prompts/2.6.0/01-plan.md',
  'packages/generator/prompts/2.6.0/02-author.md',
  'packages/generator/prompts/2.6.0/03-critic.md',
  'packages/generator/prompts/2.6.0/04-repair.md',
  'packages/generator/prompts/2.7.0/01-plan.md',
  'packages/generator/prompts/2.7.0/02-author.md',
  'packages/generator/prompts/2.7.0/03-critic.md',
  'packages/generator/prompts/2.7.0/04-repair.md',
  'packages/generator/prompts/2.8.0/01-plan.md',
  'packages/generator/prompts/2.8.0/02-author.md',
  'packages/generator/prompts/2.8.0/03-critic.md',
  'packages/generator/prompts/2.8.0/04-repair.md',
  'packages/generator/prompts/2.10.1/01-plan.md',
  'packages/generator/prompts/2.10.1/02-author.md',
  'packages/generator/prompts/2.10.1/03-critic.md',
  'packages/generator/prompts/2.10.1/04-repair.md',
  'packages/generator/src/curriculum-package-schema.ts',
  'packages/generator/quality-profiles/default.md',
  'packages/generator/quality-profiles/gemini-3.7-flash.md',
  'docs/curriculum-quality-rubric.md',
  'docs/product-rules.md',
  'packages/generator/curriculum/cap-precedent-contract.md',
  'packages/generator/src/cap-assessment-plan-contract.ts',
  'packages/generator/curriculum/cap-precedent-cards.json',
  'packages/generator/curriculum/cap-precedent-routing-index.json',
] as const

function compactQualityProfileForBundle(profile: string): string {
  return profile
    .replace(/\r\n/g, '\n')
    .replace(/\n## Human-Maintained Observations[\s\S]*$/u, '')
    .replace(/<!--[\s\S]*?-->/gu, '')
    .trim()
}

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

export async function computeFrozen210Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_210_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen220Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_220_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen240Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_240_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen250Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_250_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen260Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_260_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen270Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_270_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen280Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_280_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen2100Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_2100_FILES) {
    const fullPath = resolve(repoRoot, relativePath)
    const content = await readFile(fullPath, 'utf8')
    hashes[relativePath] = createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex')
  }
  return hashes
}

export async function computeFrozen230Hashes(repoRoot: string = REPO_ROOT): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  for (const relativePath of FROZEN_230_FILES) {
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
  const readPromptStage = async (fileName: string) => {
    const base = (await readFile(resolve(repoRoot, `packages/generator/prompts/2.4.0/${fileName}`), 'utf8'))
      .replaceAll('Curriculum Version 2.2.0, Prompt Version 2.4.0', 'Curriculum Version 2.4.0, Prompt Version 2.10.1')
      .replaceAll('(v2.4.0)', '(v2.10.1)')
      .replaceAll('Schema 2.2.0', 'Schema 2.4.0')
      .replaceAll('schemaVersion: "2.2.0"', 'schemaVersion: "2.4.0"')
      .replaceAll('Curriculum Version 2.2.0', 'Curriculum Version 2.4.0')
      .replaceAll('CurriculumPackageSchema` (2.2.0)', 'CurriculumPackageSchema` (2.4.0)')
    const groundingOverlay = await readFile(resolve(repoRoot, `packages/generator/prompts/2.5.0/${fileName}`), 'utf8')
    const workloadOverlay = await readFile(resolve(repoRoot, `packages/generator/prompts/2.6.0/${fileName}`), 'utf8')
    const mcqOverlay = await readFile(resolve(repoRoot, `packages/generator/prompts/2.7.0/${fileName}`), 'utf8')
    const recencyOverlay = await readFile(resolve(repoRoot, `packages/generator/prompts/2.8.0/${fileName}`), 'utf8')
    const qualityOverlay = await readFile(resolve(repoRoot, `packages/generator/prompts/2.10.1/${fileName}`), 'utf8')
    return `${base.trim()}\n\n---\n\n${groundingOverlay.trim()}\n\n---\n\n${workloadOverlay.trim()}\n\n---\n\n${mcqOverlay.trim()}\n\n---\n\n${recencyOverlay.trim()}\n\n---\n\n${qualityOverlay.trim()}\n`
  }
  const plan = await readPromptStage('01-plan.md')
  const author = await readPromptStage('02-author.md')
  const critic = await readPromptStage('03-critic.md')
  const repair = await readPromptStage('04-repair.md')
  const schema = await readFile(resolve(repoRoot, 'packages/generator/src/curriculum-package-schema.ts'), 'utf8')
  const defaultProfile = compactQualityProfileForBundle(await readFile(resolve(repoRoot, 'packages/generator/quality-profiles/default.md'), 'utf8'))
  const geminiProfile = compactQualityProfileForBundle(await readFile(resolve(repoRoot, 'packages/generator/quality-profiles/gemini-3.7-flash.md'), 'utf8'))
  const rubric = await readFile(resolve(repoRoot, 'docs/curriculum-quality-rubric.md'), 'utf8')
  const rules = await readFile(resolve(repoRoot, 'docs/product-rules.md'), 'utf8')
  const precedentContract = await readFile(resolve(repoRoot, 'packages/generator/curriculum/cap-precedent-contract.md'), 'utf8')
  const precedentRoutingIndex = await readFile(resolve(repoRoot, 'packages/generator/curriculum/cap-precedent-routing-index.json'), 'utf8')

  const generatedAt = fixedDate ?? '2026-08-18T15:45:00.000Z'

  const metadata: BundleMetadata = {
    bundleVersion: '2.10.1-prod',
    schemaVersion: '2.4.0',
    promptVersion: '2.10.1',
    engineVersion: CURRENT_ENGINE_VERSION,
    sourceHashes: hashes,
    generatedAt,
  }

  const frontmatter = [
    '---',
    `bundleVersion: "${metadata.bundleVersion}"`,
    `schemaVersion: "${metadata.schemaVersion}"`,
    `promptVersion: "${metadata.promptVersion}"`,
    `engineVersion: "${metadata.engineVersion}"`,
    `generatedAt: "${metadata.generatedAt}"`,
    'sourceHashes:',
    ...Object.entries(hashes).map(([file, hash]) => `  "${file}": "${hash}"`),
    '---',
  ].join('\n')

  const profileResolutionContract = [
    '## 3. Model Quality Profile Resolution & Provenance',
    '',
    'Before critique or submission, resolve the authoring model quality profile deterministically:',
    '',
    '1. Preserve the exact runtime model identifier as `actualModel`. Never rename the model to a profile name.',
    '2. Normalize only for lookup: trim, lowercase, and remove a leading `models/` prefix.',
    '3. Prefer a matching profile filename/modelId/modelPatterns. If no model-specific profile matches, resolve to `default` and mark it as fallback. Never invent a profile for an unmatched model.',
    '4. Apply the resolved profile before submission, then add or replace exactly one passing `qualityEvidence.criticalChecks` entry with `id: "model-quality-profile"`.',
    '5. Its evidence must truthfully encode: `actualModel=<exact runtime model> | resolvedQualityProfile=<resolved profile name> | qualityProfileVersion=<resolved profile frontmatter version> | engineVersion=<bundle engineVersion>` and append ` (fallback)` when the default fallback was used.',
    '6. Missing, fabricated, or mismatched model/profile provenance is a production quality violation. Do not hide it by relabeling the package as legacy/historical.',
    '',
    '### Bundled fallback profile',
    defaultProfile,
    '',
    '### Bundled Gemini profile',
    geminiProfile,
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
    '## 2A. CAP Precedent-First Contract',
    precedentContract.trim().replace(/\r\n/g, '\n'),
    '',
    '### Canonical CAP Assessment Plan Contract',
    '```json',
    serializedCapAssessmentPlanContract(),
    '```',
    '',
    '## 2B. Compact CAP Precedent Routing Index',
    '```json',
    precedentRoutingIndex.trim(),
    '```',
    '',
    profileResolutionContract,
    '',
    '## 4. Curriculum Package Schema',
    '```typescript',
    schema.trim().replace(/\r\n/g, '\n'),
    '```',
    '',
    '## 5. Prompt 01: Planning Engine',
    plan.trim().replace(/\r\n/g, '\n'),
    '',
    '## 6. Prompt 02: Authoring Engine',
    author.trim().replace(/\r\n/g, '\n'),
    '',
    '## 7. Prompt 03: Critic Engine',
    critic.trim().replace(/\r\n/g, '\n'),
    '',
    '## 8. Prompt 04: Repair Specialist',
    repair.trim().replace(/\r\n/g, '\n'),
    '',
  ].join('\n')

  return {
    metadata,
    content: `${frontmatter}\n\n${body}`,
  }
}

export async function writeProductionBundle(repoRoot: string = REPO_ROOT): Promise<void> {
  const bundle = await compileProductionBundle(repoRoot)
  const outputPath = resolve(repoRoot, 'packages/generator/bundles/production-authoring-bundle.md')
  await writeFile(outputPath, bundle.content, 'utf8')
  console.log(`Compiled production bundle to ${outputPath}`)
}

if (process.argv[1] && process.argv[1].includes('bundle-compiler')) {
  writeProductionBundle().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
