import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { compileProductionBundle, REPO_ROOT } from '../src/bundle-compiler.js'

const outputPath = resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md')
await mkdir(dirname(outputPath), { recursive: true })
const bundle = await compileProductionBundle(REPO_ROOT)
await writeFile(outputPath, bundle.content, 'utf8')
console.log(`Successfully compiled production bundle to ${outputPath}`)
