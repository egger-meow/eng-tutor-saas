import { validateCurriculumPackage } from '@paper-english/generator'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { renderCurriculumPackageBytes } from './render-curriculum-pair.js'

const repoRoot = resolve(import.meta.dirname, '../../..')
const sourcePath = process.argv[2]
if (!sourcePath) throw new Error('Usage: pnpm generate:public-sample -- <canonical-package.json>')

const source = JSON.parse(await readFile(resolve(repoRoot, sourcePath), 'utf8')) as unknown
const validated = validateCurriculumPackage(source)
if (!validated.success) {
  throw new Error(`Invalid canonical curriculum package:\n${validated.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`)
}

const pkg = validated.curriculumPackage
const pair = await renderCurriculumPackageBytes(pkg)
const outputDir = resolve(repoRoot, 'apps/web/public/samples')
await mkdir(outputDir, { recursive: true })
await Promise.all([
  writeFile(resolve(outputDir, 'sample-student.pdf'), pair.student),
  writeFile(resolve(outputDir, 'sample-parent-answer.pdf'), pair.parentAnswer),
])
console.log(`Rendered public sample from ${sourcePath} with canonical duration ${pkg.learningPlan.estimatedMinutes} minutes.`)