import { syntheticWeekOne } from '@paper-english/generator'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { artifactFilename } from './render-html.js'
import { renderLessonPdfPair } from './render-pair.js'

async function main(): Promise<void> {
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const outputDir = resolve(repositoryRoot, 'apps/web/public/samples')
  await mkdir(outputDir, { recursive: true })
  const pair = await renderLessonPdfPair(syntheticWeekOne, outputDir)
  const targets = [
    [pair.studentPath, 'sample-week-1-student.pdf'],
    [pair.parentAnswerPath, 'sample-week-1-parent-answer.pdf'],
  ] as const
  for (const [source, filename] of targets) {
    const target = resolve(outputDir, filename)
    await rm(target, { force: true })
    await rename(source, target)
    const details = await stat(target)
    console.log(JSON.stringify({ filename, bytes: details.size }))
  }
  await Promise.all([
    rm(resolve(outputDir, artifactFilename(syntheticWeekOne, 'student')), { force: true }),
    rm(resolve(outputDir, artifactFilename(syntheticWeekOne, 'parent-answer')), { force: true }),
  ])
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
  process.exitCode = 1
})
